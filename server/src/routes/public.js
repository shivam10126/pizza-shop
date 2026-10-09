const express = require('express');
const db = require('../db/knex');
const { asyncHandler } = require('../utils/errors');
const { getShopSettings } = require('../services/pricing');
const menuService = require('../services/menuService');
const orderService = require('../services/orderService');

const router = express.Router();

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    let connected = true;
    try {
      await db.raw('select 1');
    } catch {
      connected = false;
    }
    res.status(connected ? 200 : 503).json({
      status: connected ? 'ok' : 'degraded',
      database: { client: db.clientName, connected },
      uptimeSeconds: Math.round(process.uptime()),
    });
  })
);

router.get('/settings', (req, res) => {
  res.json(getShopSettings());
});

router.get(
  '/menu',
  asyncHandler(async (req, res) => {
    res.json(await menuService.getPublicMenu());
  })
);

router.post(
  '/orders',
  asyncHandler(async (req, res) => {
    const order = await orderService.createOrder(req.body);
    res.status(201).json({ order });
  })
);

// POST (not GET) so the phone number is not written into URLs or access logs.
router.post(
  '/orders/track',
  asyncHandler(async (req, res) => {
    const { orderNumber, phone } = req.body || {};
    const order = await orderService.trackOrder(String(orderNumber || ''), String(phone || ''));
    res.json({ order });
  })
);

module.exports = router;
