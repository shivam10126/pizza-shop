const path = require('path');
const dotenv = require('dotenv');

// Load server/.env (values already present in process.env are never overridden)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const env = process.env;

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  env: env.NODE_ENV || 'development',
  port: num(env.PORT, 5000),
  jwtSecret: env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '12h',
  corsOrigin: env.CORS_ORIGIN || '*',
  shop: {
    name: env.SHOP_NAME || 'Slice of Heaven',
    currencySymbol: env.CURRENCY_SYMBOL || '₹',
    taxRate: num(env.TAX_RATE, 0.05),
    deliveryFee: num(env.DELIVERY_FEE, 40),
    freeDeliveryOver: num(env.FREE_DELIVERY_OVER, 500),
  },
};

config.isProduction = config.env === 'production';
config.isTest = config.env === 'test';

if (config.isProduction && config.jwtSecret === 'dev-secret-change-me') {
  console.warn('WARNING: JWT_SECRET is not set. Set a long random value in server/.env before going live.');
}

module.exports = config;
