import { monthRange, todayWIB, type Range } from "./finance";

export const PERIODS = [
  ["hari", "Hari Ini"], ["minggu", "Minggu Ini"], ["bulan", "Bulan Ini"],
  ["lalu", "Bulan Lalu"], ["tahun", "Tahun Ini"], ["semua", "Semua"],
] as const;

const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const prevMonth = (y: number, m: number): [number, number] => (m === 1 ? [y - 1, 12] : [y, m - 1]);

/** Mengembalikan periode terpilih dan periode pembanding (null jika tidak ada), semuanya dalam WIB. */
export function periodRange(key: string): { range: Range; prev: Range | null } {
  const today = todayWIB();
  const [y, m] = today.split("-").map(Number);
  switch (key) {
    case "hari": return { range: { from: today, to: today }, prev: { from: addDays(today, -1), to: addDays(today, -1) } };
    case "minggu": {
      const dow = new Date(today + "T00:00:00Z").getUTCDay();
      const from = addDays(today, -((dow + 6) % 7));
      return { range: { from, to: today }, prev: { from: addDays(from, -7), to: addDays(from, -1) } };
    }
    case "lalu": { const [py, pm] = prevMonth(y, m); const [qy, qm] = prevMonth(py, pm); return { range: monthRange(py, pm), prev: monthRange(qy, qm) }; }
    case "tahun": return { range: { from: `${y}-01-01`, to: `${y}-12-31` }, prev: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` } };
    case "semua": return { range: { from: "0000-01-01", to: "9999-12-31" }, prev: null };
    default: { const [py, pm] = prevMonth(y, m); return { range: monthRange(y, m), prev: monthRange(py, pm) }; }
  }
}