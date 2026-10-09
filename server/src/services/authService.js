const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepo = require('../repositories/userRepository');
const { ApiError } = require('../utils/errors');

const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName, role: u.role });

async function login(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
    throw ApiError.badRequest('Username and password are required');
  }
  const user = await userRepo.findByUsername(username.trim());
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw ApiError.unauthorized('Invalid username or password');

  const token = jwt.sign({ sub: user.id, username: user.username, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  return { token, user: publicUser(user) };
}

async function changePassword(userId, currentPassword, newPassword) {
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    throw ApiError.badRequest('New password must be at least 6 characters');
  }
  const user = await userRepo.findById(userId);
  if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  await userRepo.updatePassword(userId, await bcrypt.hash(newPassword, 10));
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    throw ApiError.unauthorized('Your session has expired, please log in again');
  }
}

module.exports = { login, changePassword, verifyToken, publicUser };
