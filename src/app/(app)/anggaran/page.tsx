import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { budgetUsage, todayWIB, type Budget, type Tx } from "@/lib/finance";
import BudgetClient, { type Item } from "@/components/BudgetClient";
import BudgetAlerts from "@/components/BudgetAlerts";

type B = Budget & { notes: string | null };

export default async function AnggaranPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const nowM = todayWIB().slice(0, 7);
  const raw = (await searchParams).m ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : nowM;
  const [y, m] = month.split("-").map(Number);

  const [{ data: bd }, { data: td }, { data: cd }] = await Promise.all([
    sb.from("budgets").select("*"),
    sb.from("transactions").select("*").eq("type", "expense"),
    sb.from("categories").select("id,name,type"),
  ]);
  const budgets = (bd ?? []) as B[], tx = (td ?? []) as Tx[], cats = cd ?? [];
  const cn: Record<string, string> = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  const items: Item[] = budgets.filter((b) => b.year === y && b.month === m).map((b) => ({ ...b, ...budgetUsage(b, tx) }))
    .sort((a, c) => (a.category_id === null ? -1 : c.category_id === null ? 1 : c.pct - a.pct));

  // Riwayat per bulan: jika ada anggaran keseluruhan pakai itu, jika tidak jumlahkan anggaran kategori
  const groups = new Map<string, B[]>();
  budgets.forEach((b) => { const k = `${b.year}-${String(b.month).padStart(2, "0")}`; groups.set(k, [...(groups.get(k) ?? []), b]); });
  const history = [...groups].map(([key, bs]) => {
    const overall = bs.find((b) => b.category_id === null);
    return {
      key,
      budget: overall ? overall.amount : bs.reduce((s, b) => s + b.amount, 0),
      spent: overall ? budgetUsage(overall, tx).spent : bs.reduce((s, b) => s + budgetUsage(b, tx).spent, 0),
    };
  }).sort((a, c) => c.key.localeCompare(a.key));

  const ex: Record<string, number> = {};
  budgets.forEach((b) => { if (b.category_id && budgetUsage(b, tx).pct >= 100) { const n = cn[b.category_id] ?? b.name; ex[n] = (ex[n] ?? 0) + 1; } });

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <div><h1 className="text-2xl font-extrabold">Anggaran Bulanan</h1><p className="text-sm text-mut">Batasi pengeluaran dan pantau penggunaannya.</p></div>
      {month === nowM && <BudgetAlerts tx={tx} cn={cn} />}
      <BudgetClient month={month} items={items} cats={cats.filter((c) => c.type === "expense")} cn={cn} history={history} exceeded={Object.entries(ex).sort((a, c) => c[1] - a[1])} />
    </main>
  );
}