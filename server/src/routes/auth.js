const express = require('express');
const { asyncHandler, ApiError } = require('../utils/errors');
const authService = require('../services/authService');
const userRepo = require('../repositories/userRepository');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    res.json(await authService.login(username, password));
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await userRepo.findById(req.user.id);
    if (!user || !user.isActive) throw ApiError.unauthorized();
    res.json({ user: authService.publicUser(user) });
  })
);

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password updated' });
  })
);

module.exports = router;
