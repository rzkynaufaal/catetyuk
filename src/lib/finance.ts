/** SATU-SATUNYA tempat rumus keuangan. Dipakai Dashboard, Anggaran, Tabungan, Intelligence, Perbandingan. */
export type Tx = { id: string; name: string; amount: number; type: "income" | "expense"; category_id: string | null; tx_date: string; payment_method: string; notes: string | null; proof_url: string | null };
export type Budget = { id: string; name: string; year: number; month: number; category_id: string | null; amount: number };
export type Goal = { id: string; name: string; target_amount: number; initial_amount: number; target_date: string | null; cancelled: boolean };
export type Contribution = { amount: number; contributed_on: string };
export type Range = { from: string; to: string }; // 'YYYY-MM-DD' (WIB)

export const TZ = "Asia/Jakarta";
const pad = (n: number) => String(n).padStart(2, "0");
export const rupiah = (n: number) => (n < 0 ? "-" : "") + "Rp" + Math.abs(n).toLocaleString("id-ID");
export const todayWIB = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
export const monthRange = (y: number, m: number): Range => ({ from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}` });
export const inRange = (d: string, r: Range) => d >= r.from && d <= r.to;
const days = (r: Range) => Math.round((Date.parse(r.to) - Date.parse(r.from)) / 864e5) + 1;
const total = (a: Tx[], t: Tx["type"]) => a.filter((x) => x.type === t).reduce((s, x) => s + x.amount, 0);

/** Saldo akumulasi s.d. tanggal tertentu. Kontribusi tabungan bukan transaksi, jadi tidak ikut dihitung sebagai pemasukan/pengeluaran. */
export const balance = (tx: Tx[], asOf = todayWIB()) => {
  const a = tx.filter((x) => x.tx_date <= asOf);
  return total(a, "income") - total(a, "expense");
};
/** Saldo bebas = saldo dikurangi dana yang dialokasikan ke target (tanpa hitung ganda). */
export const available = (tx: Tx[], contribs: Contribution[]) => balance(tx) - contribs.reduce((s, c) => s + c.amount, 0);

export function summarize(tx: Tx[], r: Range) {
  const p = tx.filter((x) => inRange(x.tx_date, r));
  const income = total(p, "income"), expense = total(p, "expense");
  const end = r.to < todayWIB() ? r.to : todayWIB();
  const elapsed = Math.max(1, days({ from: r.from, to: end < r.from ? r.from : end }));
  return { income, expense, net: income - expense, avgDaily: Math.round(expense / elapsed), count: p.length, byCategory: categoryTotals(p) };
}
export function categoryTotals(tx: Tx[]) {
  const m: Record<string, number> = {};
  tx.filter((x) => x.type === "expense").forEach((x) => { const k = x.category_id ?? "none"; m[k] = (m[k] ?? 0) + x.amount; });
  return m;
}
/** null jika pembanding 0 -> tampilkan "Belum ada data pembanding". Tidak pernah Infinity/NaN. */
export const pctChange = (prev: number, cur: number): number | null => (prev === 0 ? null : ((cur - prev) / prev) * 100);

export type BudgetStatus = "terkendali" | "mendekati" | "hampir_habis" | "terlampaui";
export const budgetStatus = (pct: number): BudgetStatus => (pct < 70 ? "terkendali" : pct < 90 ? "mendekati" : pct < 100 ? "hampir_habis" : "terlampaui");
export function budgetUsage(b: Budget, tx: Tx[]) {
  const r = monthRange(b.year, b.month);
  const used = tx.filter((x) => x.type === "expense" && inRange(x.tx_date, r) && (b.category_id === null || x.category_id === b.category_id));
  const spent = used.reduce((s, x) => s + x.amount, 0);
  const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
  return { spent, remaining: b.amount - spent, pct, count: used.length, status: budgetStatus(pct) };
}

export type GoalStatus = "belum_dimulai" | "berjalan" | "hampir_tercapai" | "tercapai" | "terlambat" | "dibatalkan";
export function goalProgress(g: Goal, cs: Contribution[]) {
  const saved = g.initial_amount + cs.reduce((s, c) => s + c.amount, 0);
  const pct = (saved / g.target_amount) * 100, remaining = Math.max(0, g.target_amount - saved);
  const status: GoalStatus = g.cancelled ? "dibatalkan" : saved >= g.target_amount ? "tercapai" : g.target_date && todayWIB() > g.target_date ? "terlambat" : saved === 0 ? "belum_dimulai" : pct >= 90 ? "hampir_tercapai" : "berjalan";
  // Estimasi hanya jika pola cukup: minimal 3 kontribusi dan rentang minimal 14 hari
  let etaDays: number | null = null;
  if (cs.length >= 3 && remaining > 0) {
    const d = cs.map((c) => c.contributed_on).sort();
    const span = Math.round((Date.parse(d[d.length - 1]) - Date.parse(d[0])) / 864e5);
    const rate = cs.reduce((s, c) => s + c.amount, 0) / Math.max(span, 1);
    if (span >= 14 && rate > 0) etaDays = Math.ceil(remaining / rate);
  }
  return { saved, pct, remaining, status, etaDays };
}

export function compare(tx: Tx[], a: Range, b: Range) {
  const A = summarize(tx, a), B = summarize(tx, b);
  const ids = new Set([...Object.keys(A.byCategory), ...Object.keys(B.byCategory)]);
  const categories = [...ids].map((id) => ({ id, a: A.byCategory[id] ?? 0, b: B.byCategory[id] ?? 0, change: pctChange(A.byCategory[id] ?? 0, B.byCategory[id] ?? 0) }));
  return { A, B, incomeChange: pctChange(A.income, B.income), expenseChange: pctChange(A.expense, B.expense), categories };
}
