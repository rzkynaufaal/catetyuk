import { createClient } from "@/lib/supabase/server";
import { budgetUsage, todayWIB, type Budget, type Tx } from "@/lib/finance";

/** Satu peringatan per anggaran (hanya ambang tertinggi yang tercapai), jadi tidak berulang. */
export default async function BudgetAlerts({ tx, cn }: { tx: Tx[]; cn: Record<string, string> }) {
  const [y, m] = todayWIB().split("-").map(Number);
  const sb = await createClient();
  const { data } = await sb.from("budgets").select("*").eq("year", y).eq("month", m);
  const list = ((data ?? []) as Budget[])
    .map((b) => ({ b, u: budgetUsage(b, tx) }))
    .filter((x) => x.u.pct >= 70)
    .sort((a, c) => c.u.pct - a.u.pct);
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      {list.map(({ b, u }) => {
        const l = b.category_id ? `kategori ${cn[b.category_id] ?? b.name}` : "keseluruhan";
        const [text, cls] =
          u.pct >= 100 ? [`Pengeluaran ${l} telah melebihi anggaran bulanan.`, "border-red-400 bg-red-400/10"]
          : u.pct >= 90 ? [`Perhatian! Anggaran ${l} hampir habis.`, "border-orange-400 bg-orange-400/10"]
          : [`Pengeluaran ${l} sudah mencapai ${Math.floor(u.pct)}% dari anggaran.`, "border-amber-400 bg-amber-400/10"];
        return <div key={b.id} className={`rounded-lg border-l-[3px] px-3 py-2.5 text-sm ${cls}`}>{text}</div>;
      })}
    </div>
  );
}