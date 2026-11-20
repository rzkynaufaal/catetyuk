import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Budget, Goal, Range, Tx } from "@/lib/finance";

export type Contrib = { goal_id: string; amount: number; contributed_on: string };
export type Cat = { id: string; name: string; type: "income" | "expense"; icon: string | null };

/** Satu pintu pengambilan data untuk semua halaman analisis, supaya angkanya selalu konsisten. */
export async function loadAll() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const [t, c, b, g, k] = await Promise.all([
    sb.from("transactions").select("*"),
    sb.from("categories").select("id,name,type,icon").order("name"),
    sb.from("budgets").select("*"),
    sb.from("savings_goals").select("*"),
    sb.from("goal_contributions").select("goal_id,amount,contributed_on"),
  ]);
  const goals = (g.data ?? []) as Goal[];
  const active = new Set(goals.filter((x) => !x.cancelled).map((x) => x.id));
  const cats = (c.data ?? []) as Cat[];
  const cn: Record<string, string> = Object.fromEntries(cats.map((x) => [x.id, x.name]));
  cn.none = "Tanpa kategori";
  return {
    user, cats, cn,
    tx: (t.data ?? []) as Tx[],
    budgets: (b.data ?? []) as Budget[],
    contribs: ((k.data ?? []) as Contrib[]).filter((x) => active.has(x.goal_id)),
  };
}

/** Total alokasi tabungan pada periode (hanya target aktif). */
export const savedIn = (cs: Contrib[], r: Range) =>
  cs.filter((c) => c.contributed_on >= r.from && c.contributed_on <= r.to).reduce((s, c) => s + c.amount, 0);