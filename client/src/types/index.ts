export type Role = 'admin' | 'staff';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export type ProductStatus = 'aktif' | 'nonaktif';
export type ProductUnit = 'botol' | 'ml';

export interface CatalogItem {
  id: number;
  name: string;
  category: string;
  size: string;
  unit: ProductUnit;
  price: number;
  costPrice: number;
  linkedCount: number;
}

export interface Product {
  id: number;
  catalogId: number | null;
  name: string;
  category: string;
  size: string;
  unit: ProductUnit;
  price: number;
  costPrice?: number; // hanya dikirim untuk admin
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementType = 'masuk' | 'penjualan' | 'penyesuaian';

export interface StockMovement {
  id: number;
  productId: number;
  productName: string;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  note: string | null;
  userName: string;
  createdAt: string;
}

export type PaymentMethod = 'tunai' | 'qris' | 'transfer';

export interface SaleItem {
  id: number;
  productId: number;
  productName: string;
  productUnit: ProductUnit;
  productSize: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  transactionNumber: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  customerNote: string | null;
  amountPaid: number | null;
  change: number | null;
  status: 'selesai' | 'batal';
  cancelReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  costTotal?: number | null; // hanya admin
  profit?: number | null; // null = modal belum lengkap
  userName: string;
  createdAt: string;
}

export interface StoreInfo {
  storeName: string;
  address: string;
  phone: string;
}

export interface DailyClosingItem {
  id: number;
  productId: number;
  productName: string;
  openingStock: number;
  stockAdded: number;
  quantitySold: number;
  systemStock: number;
  actualStock: number;
  difference: number;
  note: string | null;
}

export type ClosingStatus = 'terbuka' | 'ditutup';

export interface DailyClosing {
  id: number;
  closingDate: string;
  totalTransactions: number;
  totalItemsSold: number;
  totalRevenue: number;
  totalCash: number;
  totalQris: number;
  totalTransfer: number;
  openingCash: number;
  cashExpected: number;
  cashActual: number | null;
  cashDifference: number | null;
  status: ClosingStatus;
  note: string | null;
  closedBy: string | null;
  createdAt: string;
  items: DailyClosingItem[];
}

export interface Settings {
  storeName: string;
  ownerName: string;
  address: string;
  phone: string;
  currency: string;
  defaultLowStockThreshold: number;
}

export interface DashboardSummary {
  salesToday: number;
  revenueToday: number;
  itemsSoldToday: number;
  profitToday: number | null; // null untuk staff
  salesWithoutCostToday: number | null;
  lowStockCount: number;
  salesTrend: { date: string; revenue: number }[];
  bestSellers: { productName: string; unit: ProductUnit; quantity: number }[];
  recentSales: Sale[];
  lowStockProducts: Product[];
}

export interface ReportSummary {
  totalTransactions: number;
  totalRevenue: number;
  totalItemsSold: number;
  grossProfit: number;
  salesWithoutCost: number;
  bestSellers: { productName: string; unit: ProductUnit; quantity: number; revenue: number }[];
  salesTrend: { date: string; revenue: number }[];
  sales: Sale[];
}

export interface ApiError {
  message: string;
}
