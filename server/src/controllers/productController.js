import * as productService from '../services/productService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const products = await productService.listProducts();
  // harga modal hanya untuk admin
  res.json(req.user.role === 'admin' ? products : products.map(({ costPrice, ...rest }) => rest));
});

export const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json(product);
});

export const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(Number(req.params.id), req.body);
  res.json(product);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(Number(req.params.id));
  res.json(result);
});
