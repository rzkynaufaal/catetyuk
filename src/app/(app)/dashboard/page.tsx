import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { balance, monthRange, pctChange, rupiah, summarize, todayWIB, type Tx } from "@/lib/finance";
import { PERIODS, periodRange } from "@/lib/periods";
import LiveGreeting from "@/components/LiveGreeting";
import CountUp from "@/components/CountUp";
import BudgetAlerts from "@/components/BudgetAlerts";
import { Donut, MonthlyBars } from "@/components/DashboardCharts";

const COLORS = ["#00CC99", "#006A4E", "#f5b942", "#8b7cf6", "#2bb3c0", "#e879a9", "#8FB3A4"];
const fd = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
const pct = (n: number) => n.toFixed(1).replace(".", ",");

function Delta({ cur, prev, goodUp }: { cur: number; prev?: number; goodUp: boolean }) {
  if (prev === undefined) return null;
  const c = pctChange(prev, cur);
  if (c === null) return <div className="mt-1 text-xs text-mut">Belum ada data pembanding</div>;
  const up = c >= 0, flat = Math.abs(c) < 0.05;
  return <div className={`mt-1 text-xs font-semibold ${flat ? "text-mut" : up === goodUp ? "text-cg" : "text-red-400"}`}>{up ? "▲" : "▼"} {pct(Math.abs(c))}% dibanding periode sebelumnya</div>;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: txData }, { data: cats }] = await Promise.all([
    sb.from("transactions").select("*").order("tx_date", { ascending: false }),
    sb.from("categories").select("id,name"),
  ]);
  const tx = (txData ?? []) as Tx[];
  const cn: Record<string, string> = Object.fromEntries((cats ?? []).map((c) => [c.id, c.name]));
  cn.none = "Tanpa kategori";
  const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "Teman";

  const sp = (await searchParams).p ?? "bulan";
  const key = PERIODS.some(([k]) => k === sp) ? sp : "bulan";
  const { range, prev } = periodRange(key);
  const s = summarize(tx, range), ps = prev ? summarize(tx, prev) : null;

  const [y, m] = todayWIB().split("-").map(Number);
  const months = Array.from({ length: 6 }, (_, k) => {
    let yy = y, mm = m - (5 - k);
    while (mm < 1) { mm += 12; yy--; }
    const r = summarize(tx, monthRange(yy, mm));
    return { label: new Date(yy, mm - 1, 1).toLocaleDateString("id-ID", { month: "short" }), income: r.income, expense: r.expense };
  });

  const sorted = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  const slices = sorted.slice(0, 6).map(([id, v], i) => ({ label: cn[id] ?? "Lainnya", value: v, color: COLORS[i] }));
  const rest = sorted.slice(6).reduce((t, [, v]) => t + v, 0);
  if (rest > 0) slices.push({ label: "Kategori lain", value: rest, color: COLORS[6] });

  // Wawasan: murni dari data bulan ini vs bulan lalu
  const thisM = summarize(tx, monthRange(y, m));
  const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
  const lastM = summarize(tx, monthRange(py, pm));
  const top = Object.entries(thisM.byCategory).sort((a, b) => b[1] - a[1])[0];
  const insights: string[] = [];
  if (top) insights.push(`Pengeluaran terbesar bulan ini berasal dari kategori ${cn[top[0]] ?? "Lainnya"} (${rupiah(top[1])}, ${Math.round((top[1] / thisM.expense) * 100)}% dari total pengeluaran).`);
  if (thisM.expense > 0 && lastM.expense > 0) {
    const d = thisM.expense - lastM.expense;
    insights.push(d > 0 ? `Pengeluaran bulan ini ${rupiah(d)} lebih tinggi dibandingkan bulan lalu.` : d < 0 ? `Pengeluaran bulan ini ${rupiah(-d)} lebih rendah dibandingkan bulan lalu.` : "Pengeluaran bulan ini sama dengan bulan lalu.");
  }
  if (thisM.income > 0 || thisM.expense > 0) insights.push(thisM.income >= thisM.expense ? "Pemasukan bulan ini lebih besar daripada pengeluaran." : "Pengeluaran bulan ini melebihi pemasukan.");
  if (thisM.expense > 0) insights.push(`Rata-rata pengeluaran harian bulan ini ${rupiah(thisM.avgDaily)}.`);

  const box = "rounded-2xl border border-line bg-panel p-5";
  const lbl = "text-xs font-semibold uppercase tracking-wider text-mut";
  const ico = "grid h-9 w-9 shrink-0 place-items-center rounded-xl";
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <LiveGreeting name={name} />
      {tx.length === 0 ? (
        <div className={`${box} p-10 text-center`}>
          <p className="text-mut">Belum ada transaksi. Mulai catat pemasukan atau pengeluaran pertamamu.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/pemasukan" className="rounded-lg bg-bd px-4 py-2 text-sm font-semibold text-white">Catat Pemasukan</Link>
            <Link href="/pengeluaran" className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">Catat Pengeluaran</Link>
          </div>
        </div>
      ) : (<>
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(([k, l]) => (
            <Link key={k} href={`/dashboard?p=${k}`} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${k === key ? "border-bd bg-bd text-white" : "border-line text-mut hover:border-cg hover:text-white"}`}>{l}</Link>
          ))}
        </div>
        <BudgetAlerts tx={tx} cn={cn} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="hero rounded-2xl border border-cg/40 bg-gradient-to-br from-bd to-dgreen p-5">
            <div className="flex items-start justify-between gap-2">
              <div className={lbl + " !text-white/70"}>Total Saldo</div>
              <div className={`${ico} bg-white/15 text-white`}><Wallet size={18} /></div>
            </div>
            <div className="mt-2 text-2xl font-extrabold"><CountUp value={balance(tx)} /></div>
            <div className="mt-1 text-xs text-white/70">Akumulasi s.d. hari ini (tidak terpengaruh filter)</div>
          </div>
          <div className={box}>
            <div className="flex items-start justify-between gap-2"><div className={lbl}>Total Pemasukan</div><div className={`${ico} bg-cg/15 text-cg`}><ArrowUpCircle size={18} /></div></div>
            <div className="mt-2 text-2xl font-extrabold text-cg"><CountUp value={s.income} /></div>
            <Delta cur={s.income} prev={ps?.income} goodUp />
          </div>
          <div className={box}>
            <div className="flex items-start justify-between gap-2"><div className={lbl}>Total Pengeluaran</div><div className={`${ico} bg-red-400/15 text-red-400`}><ArrowDownCircle size={18} /></div></div>
            <div className="mt-2 text-2xl font-extrabold text-red-400"><CountUp value={s.expense} /></div>
            <Delta cur={s.expense} prev={ps?.expense} goodUp={false} />
          </div>
          <div className={box}>
            <div className="flex items-start justify-between gap-2"><div className={lbl}>Arus Kas Bersih</div><div className={`${ico} ${s.net >= 0 ? "bg-cg/15 text-cg" : "bg-red-400/15 text-red-400"}`}><Activity size={18} /></div></div>
            <div className={`mt-2 text-2xl font-extrabold ${s.net >= 0 ? "text-cg" : "text-red-400"}`}><CountUp value={s.net} /></div>
            <div className="mt-1 text-xs text-mut">Pemasukan − pengeluaran periode ini</div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className={box}>
            <h2 className="mb-1 font-bold">Pemasukan vs Pengeluaran</h2>
            <div className="mb-2 flex gap-4 text-xs text-mut"><span className="text-cg">● Pemasukan</span><span className="text-red-400">● Pengeluaran</span><span>6 bulan terakhir</span></div>
            <MonthlyBars data={months} />
          </div>
          <div className={box}><h2 className="mb-3 font-bold">Distribusi Pengeluaran</h2><Donut slices={slices} /></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className={box}>
            <h2 className="mb-2 font-bold">Transaksi Terbaru</h2>
            {tx.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center gap-3 border-b border-line/60 py-3 last:border-0">
                <div className={`${ico} ${t.type === "income" ? "bg-cg/15 text-cg" : "bg-red-400/15 text-red-400"}`}>{t.type === "income" ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}</div>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{t.name}</div><div className="text-xs text-mut">{t.category_id ? cn[t.category_id] : "Tanpa kategori"} · {fd(t.tx_date)}</div></div>
                <div className={`text-sm font-bold tabular-nums ${t.type === "income" ? "text-cg" : "text-red-400"}`}>{t.type === "income" ? "+" : "−"}{rupiah(t.amount)}</div>
              </div>
            ))}
            <Link href="/riwayat" className="mt-3 inline-block rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-mut transition hover:text-white">Lihat Semua Transaksi</Link>
          </div>
          <div className={box}>
            <h2 className="mb-3 font-bold">Wawasan Keuangan</h2>
            {insights.length ? insights.map((i) => <div key={i} className="mb-2 rounded-r-lg border-l-[3px] border-cg bg-dgreen/60 px-3 py-2.5 text-sm">{i}</div>) : <p className="text-sm text-mut">Belum cukup data untuk wawasan bulan ini.</p>}
          </div>
        </div>
      </>)}
    </main>
  );
}