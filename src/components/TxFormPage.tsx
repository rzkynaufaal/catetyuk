import { createClient } from "@/lib/supabase/server";
import TransactionForm from "./TransactionForm";

export default async function TxFormPage({ type, id }: { type: "income" | "expense"; id?: string }) {
  const sb = await createClient();
  const { data: cats } = await sb.from("categories").select("id,name").eq("type", type).order("name");
  let tx = null;
  if (id) { const { data } = await sb.from("transactions").select("*").eq("id", id).maybeSingle(); tx = data; }
  const o = type === "expense";
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-extrabold">{tx ? "Ubah" : "Catat"} {o ? "Pengeluaran" : "Pemasukan"}</h1>
        <p className="text-sm text-mut">{o ? "Catat setiap rupiah yang keluar." : "Catat uang yang masuk."}</p>
      </div>
      <TransactionForm type={type} categories={cats ?? []} tx={tx} />
    </main>
  );
}