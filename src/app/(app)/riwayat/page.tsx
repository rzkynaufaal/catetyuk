import { createClient } from "@/lib/supabase/server";
import HistoryClient from "@/components/HistoryClient";
import type { Tx } from "@/lib/finance";

export default async function RiwayatPage() {
  const sb = await createClient();
  const [{ data: tx }, { data: cats }] = await Promise.all([
    sb.from("transactions").select("*").order("tx_date", { ascending: false }),
    sb.from("categories").select("id,name,type"),
  ]);
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div><h1 className="text-2xl font-extrabold">Riwayat Transaksi</h1><p className="text-sm text-mut">Telusuri semua catatanmu.</p></div>
      <HistoryClient tx={(tx ?? []) as Tx[]} cats={cats ?? []} />
    </main>
  );
}