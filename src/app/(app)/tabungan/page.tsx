import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { balance, goalProgress, type Goal, type Tx } from "@/lib/finance";
import GoalsClient, { type GoalItem } from "@/components/GoalsClient";

type C = { id: string; goal_id: string; amount: number; contributed_on: string; notes: string | null };
type G = Goal & { kind: string | null; priority: string | null; notes: string | null };

export default async function TabunganPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: gd }, { data: cd }, { data: td }] = await Promise.all([
    sb.from("savings_goals").select("*").order("created_at", { ascending: false }),
    sb.from("goal_contributions").select("*").order("contributed_on", { ascending: false }),
    sb.from("transactions").select("tx_date,type,amount"),
  ]);
  const goals = (gd ?? []) as G[], contribs = (cd ?? []) as C[];
  const items: GoalItem[] = goals.map((g) => {
    const cs = contribs.filter((c) => c.goal_id === g.id);
    return { ...g, ...goalProgress(g, cs), contribs: cs };
  });
  const bal = balance((td ?? []) as Tx[]);
  // Hanya target aktif yang mengalokasikan dana. Target dibatalkan melepas dananya.
  const allocated = items.filter((i) => !i.cancelled).reduce((s, i) => s + i.contribs.reduce((t, c) => t + c.amount, 0), 0);
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <div><h1 className="text-2xl font-extrabold">Target Tabungan</h1><p className="text-sm text-mut">Tetapkan tujuan finansial dan pantau perkembangannya.</p></div>
      <GoalsClient goals={items} balance={bal} allocated={allocated} />
    </main>
  );
}