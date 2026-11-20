import Link from "next/link";
import { budgetUsage, inRange, monthRange, pctChange, rupiah, summarize, todayWIB } from "@/lib/finance";
import { periodRange } from "@/lib/periods";
import { loadAll, savedIn } from "@/lib/data";
import { fdr, pc } from "@/lib/format";
import { Donut, MonthlyBars } from "@/components/DashboardCharts";

const P = [["minggu", "Mingguan"], ["bulan", "Bulanan"], ["tahun", "Tahunan"]] as const;
const COLORS = ["#00CC99", "#006A4E", "#f5b942", "#8b7cf6", "#2bb3c0", "#e879a9", "#8FB3A4"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function Section({ tag, color, title, children }: { tag: string; color: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-3 flex items-center gap-3"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${color}`}>{tag}</span><h2 className="font-bold">{title}</h2></div>
      {children}
    </section>
  );
}
const List = ({ items, empty }: { items: string[]; empty: string }) =>
  items.length ? <>{items.map((t) => <div key={t} className="mb-2 rounded-r-lg border-l-[3px] border-line bg-dgreen/50 px-3 py-2.5 text-sm">{t}</div>)}</> : <p className="text-sm text-mut">{empty}</p>;

export default async function AnalisisPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = (await searchParams).p;
  const key = P.some(([k]) => k === sp) ? sp! : "bulan";
  const { tx, cn, budgets, contribs } = await loadAll();
  const { range, prev } = periodRange(key);
  const s = summarize(tx, range), ps = summarize(tx, prev!);
  const name = (id: string) => cn[id] ?? "Lainnya";

  const head = (
    <>
      <div><h1 className="text-2xl font-extrabold">Financial Intelligence</h1><p className="text-sm text-mut">Analisis dan rekomendasi dari data transaksimu. Semua angka dihitung langsung dari catatanmu.</p></div>
      <div className="flex flex-wrap gap-2">{P.map(([k, l]) => <Link key={k} href={`/analisis?p=${k}`} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${k === key ? "border-bd bg-bd text-white" : "border-line text-mut hover:border-cg hover:text-white"}`}>{l}</Link>)}<span className="self-center text-sm text-mut">{fdr(range)}</span></div>
    </>
  );
  if (tx.length < 5 || s.count === 0)
    return <main className="mx-auto max-w-5xl space-y-5 p-6">{head}<div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-mut">Belum cukup data untuk menghasilkan analisis keuangan. Mulai catat pemasukan dan pengeluaran Anda secara rutin.</div></main>;

  const [y, m] = todayWIB().split("-").map(Number);
  const ms = Array.from({ length: 6 }, (_, k) => {
    let yy = y, mm = m - (5 - k);
    while (mm < 1) { mm += 12; yy--; }
    const r = monthRange(yy, mm), x = summarize(tx, r);
    return { label: new Date(yy, mm - 1, 1).toLocaleDateString("id-ID", { month: "short" }), income: x.income, expense: x.expense, by: x.byCategory, saved: savedIn(contribs, r) };
  });

  const exp = tx.filter((t) => t.type === "expense" && inRange(t.tx_date, range));
  const saved = savedIn(contribs, range);
  const sorted = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const topShare = top && s.expense > 0 ? (top[1] / s.expense) * 100 : 0;
  const incC = pctChange(ps.income, s.income), expC = pctChange(ps.expense, s.expense);
  const slices = sorted.slice(0, 6).map(([id, v], i) => ({ label: name(id), value: v, color: COLORS[i] }));
  const rest = sorted.slice(6).reduce((t, [, v]) => t + v, 0);
  if (rest > 0) slices.push({ label: "Kategori lain", value: rest, color: COLORS[6] });

  // ANALISIS
  const analisis: string[] = [];
  if (top) analisis.push(`Pengeluaran terbesar berasal dari kategori ${name(top[0])}: ${rupiah(top[1])} atau ${Math.round(topShare)}% dari total pengeluaran.`);
  sorted.filter(([id, v]) => (ps.byCategory[id] ?? 0) > 0 && v > (ps.byCategory[id] ?? 0) * 1.1).slice(0, 3)
    .forEach(([id, v]) => analisis.push(`Pengeluaran ${name(id)} meningkat ${pc(pctChange(ps.byCategory[id], v)!)} dibandingkan periode sebelumnya.`));
  if (exp.length) analisis.push(`Ada ${exp.length} transaksi pengeluaran dengan rata-rata ${rupiah(Math.round(s.expense / exp.length))} per transaksi.`);
  const wd: number[] = Array(7).fill(0);
  exp.forEach((t) => { wd[new Date(t.tx_date + "T00:00:00Z").getUTCDay()] += t.amount; });
  if (exp.length >= 7 && new Set(exp.map((t) => t.tx_date)).size >= 3) {
    const i = wd.indexOf(Math.max(...wd));
    analisis.push(`Pengeluaran cenderung paling tinggi pada hari ${DAYS[i]} (${Math.round((wd[i] / s.expense) * 100)}% dari total).`);
  }
  const bm = budgets.filter((b) => b.year === y && b.month === m).map((b) => ({ b, u: budgetUsage(b, tx) }));
  if (bm.length) { const over = bm.filter((x) => x.u.pct >= 100).length; analisis.push(`Dari ${bm.length} anggaran bulan ini, ${bm.length - over} masih dalam batas dan ${over} telah terlampaui.`); }

  // KEBIASAAN
  const ratio = s.income > 0 ? (s.net / s.income) * 100 : null;
  const ratioLabel = ratio === null ? "—" : ratio >= 20 ? "Baik" : ratio >= 10 ? "Cukup" : ratio >= 0 ? "Perlu perhatian" : "Defisit";
  const active = ms.filter((x) => x.income + x.expense > 0);
  const kebiasaan: [string, string, string][] = [
    ["Rasio selisih terhadap pemasukan", ratio === null ? "Belum ada pemasukan" : `${ratio < 0 ? "−" : ""}${pc(ratio)} · ${ratioLabel}`, "(pemasukan − pengeluaran) ÷ pemasukan. Baik ≥ 20%, cukup 10–20%, di bawah itu perlu perhatian."],
    ["Kepatuhan anggaran bulan ini", bm.length ? `${bm.filter((x) => x.u.pct < 100).length} dari ${bm.length} anggaran aman` : "Belum ada anggaran", "Jumlah anggaran bulan ini yang belum mencapai 100%."],
    ["Konsistensi surplus (6 bulan)", active.length ? `${active.filter((x) => x.income >= x.expense).length} dari ${active.length} bulan` : "Belum ada data", "Bulan dengan pemasukan ≥ pengeluaran, dari bulan yang punya transaksi."],
    ["Konsistensi menabung (6 bulan)", contribs.length ? `${ms.filter((x) => x.saved > 0).length} dari 6 bulan` : "Belum ada kontribusi", "Bulan dengan minimal satu kontribusi ke target tabungan aktif."],
  ];

  // REKOMENDASI
  const rek: string[] = [];
  const [m3, m2, m1] = [ms[2], ms[3], ms[4]];
  Object.keys(m1.by).forEach((id) => { const a = m3.by[id] ?? 0, b = m2.by[id] ?? 0, c = m1.by[id]; if (a > 0 && b > a && c > b) rek.push(`Coba kurangi pengeluaran kategori ${name(id)} karena meningkat tiga bulan penuh berturut-turut (${rupiah(a)} → ${rupiah(b)} → ${rupiah(c)}).`); });
  bm.filter((x) => x.b.category_id && x.u.pct >= 100).slice(0, 2).forEach((x) => rek.push(`Pengeluaran ${name(x.b.category_id!)} telah melebihi anggaran bulan ini. Tinjau ulang kebiasaan di kategori ini.`));
  bm.filter((x) => x.b.category_id && x.u.pct < 70 && x.u.count > 0).slice(0, 2).forEach((x) => rek.push(`Pertahankan pengeluaran ${name(x.b.category_id!)} agar tetap sesuai anggaran (baru ${Math.floor(x.u.pct)}% terpakai).`));
  if (s.net > 0 && saved === 0) rek.push("Pemasukan lebih besar daripada pengeluaran, tetapi belum ada alokasi tabungan pada periode ini. Pertimbangkan menyisihkan sebagian selisih ke target tabungan.");
  if (s.net < 0 && top) rek.push(`Pengeluaran melebihi pemasukan pada periode ini. Mulailah menelusuri kategori terbesar, yaitu ${name(top[0])}, untuk mencari ruang penghematan.`);
  if (topShare >= 40 && top) rek.push(`Kategori ${name(top[0])} mendominasi ${Math.round(topShare)}% pengeluaran. Satu kategori yang terlalu besar perlu dipantau lebih ketat.`);

  const card = "rounded-xl border border-line bg-rich p-4";
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      {head}
      <Section tag="Fakta" color="bg-cg/15 text-cg" title="Ringkasan kondisi keuangan">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([["Total pemasukan", rupiah(s.income), incC, true], ["Total pengeluaran", rupiah(s.expense), expC, false], ["Selisih", rupiah(s.net), null, true], ["Alokasi tabungan", rupiah(saved), null, true]] as const).map(([l, v, c, good]) => (
            <div key={l} className={card}><div className="text-xs font-semibold uppercase tracking-wider text-mut">{l}</div><div className="mt-1 text-lg font-extrabold tabular-nums">{v}</div>
              {c !== null && <div className={`mt-1 text-xs font-semibold ${c >= 0 === good ? "text-cg" : "text-red-400"}`}>{c >= 0 ? "▲" : "▼"} {pc(c)} dari periode sebelumnya</div>}</div>))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className={card}><div className="text-xs font-semibold uppercase tracking-wider text-mut">Rata-rata pengeluaran harian</div><div className="mt-1 text-lg font-extrabold tabular-nums">{rupiah(s.avgDaily)}</div></div>
          <div className={card}><div className="text-xs font-semibold uppercase tracking-wider text-mut">Kategori pengeluaran terbesar</div><div className="mt-1 text-lg font-extrabold">{top ? `${name(top[0])} (${rupiah(top[1])})` : "—"}</div></div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div><h3 className="mb-2 text-sm font-bold">Pemasukan vs pengeluaran (6 bulan)</h3><MonthlyBars data={ms.map((x) => ({ label: x.label, income: x.income, expense: x.expense }))} /></div>
          <div><h3 className="mb-2 text-sm font-bold">Distribusi pengeluaran periode ini</h3><Donut slices={slices} /></div>
        </div>
      </Section>
      <Section tag="Analisis" color="bg-amber-400/15 text-amber-400" title="Pola pengeluaran"><List items={analisis} empty="Belum ada pola yang dapat dianalisis." /></Section>
      <Section tag="Analisis" color="bg-amber-400/15 text-amber-400" title="Kebiasaan keuangan">
        <div className="grid gap-3 sm:grid-cols-2">{kebiasaan.map(([l, v, d]) => <div key={l} className={card}><div className="text-xs font-semibold uppercase tracking-wider text-mut">{l}</div><div className="mt-1 font-extrabold">{v}</div><div className="mt-1 text-xs text-mut">{d}</div></div>)}</div>
      </Section>
      <Section tag="Rekomendasi" color="bg-violet-400/15 text-violet-300" title="Saran untukmu"><List items={rek} empty="Belum ada rekomendasi khusus. Teruskan mencatat transaksi secara rutin." /></Section>
    </main>
  );
}