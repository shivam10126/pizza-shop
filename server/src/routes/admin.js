const express = require('express');
const { asyncHandler, ApiError } = require('../utils/errors');
const { requireAuth, requireRole } = require('../middleware/auth');
const menuService = require('../services/menuService');
const orderService = require('../services/orderService');
const { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS, ORDER_TYPES } = require('../constants');

const router = express.Router();

// Every /api/admin route needs a logged-in user (ADMIN or STAFF).
router.use(requireAuth);
const adminOnly = requireRole('ADMIN');

function parseId(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('Invalid id');
  return id;
}

// ---- reference data -------------------------------------------------
router.get('/meta', (req, res) => {
  res.json({
    orderStatuses: ORDER_STATUSES,
    paymentStatuses: PAYMENT_STATUSES,
    paymentMethods: PAYMENT_METHODS,
    orderTypes: ORDER_TYPES,
  });
});

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json(await orderService.getStats());
  })
);

// ---- orders ---------------------------------------------------------
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { status, page, pageSize } = req.query;
    res.json(await orderService.listOrders({ status: status || undefined, page, pageSize }));
  })
);

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    res.json({ order: await orderService.getOrder(parseId(req)) });
  })
);

router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const { status, note } = req.body || {};
    res.json({ order: await orderService.updateStatus(parseId(req), status, note) });
  })
);

router.patch(
  '/orders/:id/payment',
  asyncHandler(async (req, res) => {
    const { paymentStatus } = req.body || {};
    res.json({ order: await orderService.updatePaymentStatus(parseId(req), paymentStatus) });
  })
);

// ---- menu management (ADMIN only) -----------------------------------
router.get(
  '/menu',
  asyncHandler(async (req, res) => {
    res.json(await menuService.getAdminMenu());
  })
);

router.post(
  '/pizzas',
  adminOnly,
  asyncHandler(async (req, res) => {
    res.status(201).json({ pizza: await menuService.createPizza(req.body) });
  })
);

router.put(
  '/pizzas/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ pizza: await menuService.updatePizza(parseId(req), req.body) });
  })
);

router.delete(
  '/pizzas/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    await menuService.deletePizza(parseId(req));
    res.json({ message: 'Pizza deleted' });
  })
);

router.post(
  '/toppings',
  adminOnly,
  asyncHandler(async (req, res) => {
    res.status(201).json({ topping: await menuService.createTopping(req.body) });
  })
);

router.put(
  '/toppings/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ topping: await menuService.updateTopping(parseId(req), req.body) });
  })
);

router.delete(
  '/toppings/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    await menuService.deleteTopping(parseId(req));
    res.json({ message: 'Topping deleted' });
  })
);

module.exports = router;
