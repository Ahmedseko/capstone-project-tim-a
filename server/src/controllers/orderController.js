import * as orderService from '../services/orderService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await orderService.listOrders({ status: req.query.status, q: req.query.q }));
});

export const summary = asyncHandler(async (req, res) => {
  res.json(await orderService.orderSummary());
});

export const get = asyncHandler(async (req, res) => {
  res.json(await orderService.getOrder(Number(req.params.id)));
});

export const confirm = asyncHandler(async (req, res) => {
  res.json(await orderService.confirmOrder({ id: Number(req.params.id), paymentMethod: req.body.paymentMethod, userId: req.user.id }));
});

export const setStatus = asyncHandler(async (req, res) => {
  res.json(await orderService.advanceOrder({ id: Number(req.params.id), status: req.body.status }));
});

export const cancel = asyncHandler(async (req, res) => {
  res.json(await orderService.cancelOrder({ id: Number(req.params.id), reason: req.body.reason, userId: req.user.id }));
});
