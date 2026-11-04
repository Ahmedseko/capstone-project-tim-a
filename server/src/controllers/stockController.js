import * as stockService from '../services/stockService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(await stockService.listStockMovements());
});

export const add = asyncHandler(async (req, res) => {
  const movement = await stockService.addStock({ ...req.body, userId: req.user.id });
  res.status(201).json(movement);
});

export const adjust = asyncHandler(async (req, res) => {
  const movement = await stockService.adjustStock({ ...req.body, userId: req.user.id });
  res.status(201).json(movement);
});
