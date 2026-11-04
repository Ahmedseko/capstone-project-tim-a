import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

const DEFAULT_SECRET = 'dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET ?? DEFAULT_SECRET;

// Secret bawaan hanya untuk pengembangan lokal; di produksi server menolak berjalan dengannya.
if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEFAULT_SECRET) {
  throw new Error('JWT_SECRET wajib diisi (bukan nilai bawaan) saat NODE_ENV=production.');
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('Anda harus masuk untuk mengakses data ini.', 401));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    next(new AppError('Sesi tidak valid atau telah berakhir. Silakan masuk kembali.', 401));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Anda tidak memiliki akses untuk melakukan aksi ini.', 403));
    }
    next();
  };
}

export function signToken(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: '12h',
  });
}
