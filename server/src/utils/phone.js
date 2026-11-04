// Nomor seluler Indonesia -> format internasional tanpa plus (628xxxxxxxxxx), atau null kalau tidak valid.
// Menerima 0812-3456-7890, +62 812 3456 7890, 62812..., 812...
export function normalizePhone(raw) {
  let digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  return /^628\d{8,12}$/.test(digits) ? digits : null;
}

if (process.argv[1]?.endsWith('phone.js')) {
  const eq = (a, b) => { if (a !== b) throw new Error(`${a} !== ${b}`); };
  eq(normalizePhone('0812-3456-7890'), '6281234567890');
  eq(normalizePhone('+62 812 3456 7890'), '6281234567890');
  eq(normalizePhone('6281234567890'), '6281234567890');
  eq(normalizePhone('81234567890'), '6281234567890');
  eq(normalizePhone('082328329333'), '6282328329333');
  eq(normalizePhone('12345'), null);
  eq(normalizePhone('0211234567'), null); // telepon rumah bukan seluler
  eq(normalizePhone(''), null);
  eq(normalizePhone(null), null);
  console.log('phone ok');
}
