import { budgetUsage, compare, monthRange, pctChange, rupiah, todayWIB, type Range } from "@/lib/finance";
import { periodRange } from "@/lib/periods";
import { loadAll, savedIn } from "@/lib/data";
import { fdr, pc } from "@/lib/format";

type SP = { mode?: string; m?: string; y?: string; a1?: string; a2?: string; b1?: string; b2?: string };
const MODES = [
  ["bulan", "Bulan ini vs bulan sebelumnya"], ["bulan_pilih", "Bulan tertentu vs bulan sebelumnya"],
  ["tahun", "Tahun ini vs tahun sebelumnya"], ["tahun_pilih", "Tahun tertentu vs tahun sebelumnya"],
  ["minggu", "Minggu ini vs minggu sebelumnya"], ["kustom", "Dua periode khusus"],
];
const C1 = "#8FB3A4", C2 = "#00CC99";

function resolve(sp: SP): { p1: Range; p2: Range; note?: string } {
  const today = todayWIB(), mode = sp.mode ?? "bulan";
  if (mode === "bulan_pilih") {
    const [y, m] = (/^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m ?? "") ? sp.m! : today.slice(0, 7)).split("-").map(Number);
    const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
    return { p1: monthRange(py, pm), p2: monthRange(y, m) };
  }
  if (mode === "tahun_pilih") {
    const y = /^\d{4}$/.test(sp.y ?? "") ? Number(sp.y) : Number(today.slice(0, 4));
    return { p1: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }, p2: { from: `${y}-01-01`, to: `${y}-12-31` } };
  }
  if (mode === "kustom") {
    const ok = (s?: string) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");
    const d = periodRange("bulan");
    if (!ok(sp.a1) || !ok(sp.a2) || !ok(sp.b1) || !ok(sp.b2)) return { p1: d.prev!, p2: d.range, note: "Isi keempat tanggal untuk membandingkan dua periode khusus. Sementara ditampilkan bulan ini vs bulan sebelumnya." };
    if (sp.a1! > sp.a2! || sp.b1! > sp.b2!) return { p1: d.prev!, p2: d.range, note: "Tanggal awal tidak boleh setelah tanggal akhir. Sementara ditampilkan bulan ini vs bulan sebelumnya." };
    return { p1: { from: sp.a1!, to: sp.a2! }, p2: { from: sp.b1!, to: sp.b2! } };
  }
  const d = periodRange(mode === "minggu" || mode === "tahun" ? mode : "bulan");
  return { p1: d.prev!, p2: d.range };
}

function Chg({ c, goodUp }: { c: number | null; goodUp: boolean | null }) {
  if (c === null) return <span className="text-xs text-mut">Tidak dapat dihitung (periode 1 kosong)</span>;
  if (Math.abs(c) < 0.05) return <span className="text-mut">Stabil (0%)</span>;
  const good = goodUp === null ? null : c >= 0 === goodUp;
  return <span className={`font-semibold ${good === null ? "text-white" : good ? "text-cg" : "text-red-400"}`}>{c >= 0 ? "▲ naik " : "▼ turun "}{pc(c)}</span>;
}
function Duo({ label, a, b, max }: { label: string; a: number; b: number; max: number }) {
  const w = (v: number) => `${Math.max(v > 0 ? 2 : 0, (v / max) * 100)}%`;
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold">{label}</div>
      <div className="flex items-center gap-2"><div className="h-3 rounded-full" style={{ width: w(a), background: C1 }} /><span className="text-xs tabular-nums text-mut">{rupiah(a)}</span></div>
      <div className="flex items-center gap-2"><div className="h-3 rounded-full" style={{ width: w(b), background: C2 }} /><span className="text-xs tabular-nums">{rupiah(b)}</span></div>
    </div>
  );
}

export default async function PerbandinganPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { tx, cn, budgets, contribs } = await loadAll();
  const { p1, p2, note } = resolve(sp);
  const c = compare(tx, p1, p2), { A, B } = c;
  const sA = savedIn(contribs, p1), sB = savedIn(contribs, p2);
  const empty = A.count === 0 && B.count === 0;

  const fullMonth = (r: Range) => r.from.endsWith("-01") && r.from.slice(0, 7) === r.to.slice(0, 7);
  const bud = (r: Range) => {
    const bs = budgets.filter((b) => b.year === Number(r.from.slice(0, 4)) && b.month === Number(r.from.slice(5, 7)));
    if (!bs.length) return null;
    const o = bs.find((b) => b.category_id === null);
    return { amount: o ? o.amount : bs.reduce((s, b) => s + b.amount, 0), spent: o ? budgetUsage(o, tx).spent : bs.reduce((s, b) => s + budgetUsage(b, tx).spent, 0) };
  };
  const both = fullMonth(p1) && fullMonth(p2);
  const bd1 = both ? bud(p1) : null, bd2 = both ? bud(p2) : null;

  const cats = [...c.categories].sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b));
  const maxCat = Math.max(1, ...cats.flatMap((x) => [x.a, x.b]));
  const maxMain = Math.max(1, A.income, B.income, A.expense, B.expense);
  const name = (id: string) => cn[id] ?? "Lainnya";

  const out: string[] = [];
  if (A.expense > 0 || B.expense > 0)
    out.push(c.expenseChange === null ? "Perubahan pengeluaran tidak dapat dihitung karena periode pertama tidak memiliki pengeluaran." : Math.abs(c.expenseChange) < 0.05 ? "Total pengeluaran relatif sama dengan periode pertama." : `Total pengeluaran periode kedua ${c.expenseChange > 0 ? "meningkat" : "menurun"} sebesar ${pc(c.expenseChange)} dibandingkan periode pertama.`);
  if (A.income > 0 || B.income > 0)
    out.push(c.incomeChange === null ? "Perubahan pemasukan tidak dapat dihitung karena periode pertama tidak memiliki pemasukan." : Math.abs(c.incomeChange) < 0.05 ? "Total pemasukan relatif sama dengan periode pertama." : `Total pemasukan periode kedua ${c.incomeChange > 0 ? "meningkat" : "menurun"} sebesar ${pc(c.incomeChange)}.`);
  if (c.incomeChange !== null && c.expenseChange !== null && c.incomeChange > 0 && c.expenseChange <= 0) out.push("Pemasukan mengalami peningkatan, sementara pengeluaran berhasil dipertahankan.");
  const up = cats.filter((x) => x.b > x.a).sort((x, y) => y.b - y.a - (x.b - x.a))[0];
  const down = cats.filter((x) => x.b < x.a).sort((x, y) => y.a - y.b - (x.a - x.b))[0];
  if (up) out.push(`Kategori ${name(up.id)} menjadi kategori dengan peningkatan pengeluaran terbesar (+${rupiah(up.b - up.a)}).`);
  if (down) out.push(`Kategori ${name(down.id)} mengalami penurunan pengeluaran terbesar (−${rupiah(down.a - down.b)}).`);

  const rows: [string, number, number, boolean | null][] = [
    ["Total pemasukan", A.income, B.income, true], ["Total pengeluaran", A.expense, B.expense, false],
    ["Selisih pemasukan − pengeluaran", A.net, B.net, null], ["Rata-rata pengeluaran harian", A.avgDaily, B.avgDaily, false],
    ["Total alokasi tabungan", sA, sB, true],
  ];
  const inp = "rounded-lg border border-line bg-rich px-3 py-2 text-sm outline-none focus:border-cg";
  const box = "rounded-2xl border border-line bg-panel p-5";
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <div><h1 className="text-2xl font-extrabold">Perbandingan Keuangan</h1><p className="text-sm text-mut">Bandingkan dua periode untuk melihat perkembangan keuanganmu.</p></div>
      <form method="get" className={`${box} flex flex-wrap items-end gap-3`}>
        <div><label className="mb-1.5 block text-xs font-semibold text-mut">Jenis perbandingan</label>
          <select name="mode" defaultValue={sp.mode ?? "bulan"} className={inp}>{MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-mut">Bulan (opsi bulan tertentu)</label><input type="month" name="m" defaultValue={sp.m ?? ""} className={inp} /></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-mut">Tahun (opsi tahun tertentu)</label><input type="number" name="y" min={2000} max={2100} defaultValue={sp.y ?? ""} className={`${inp} w-28`} /></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-mut">Periode 1 (khusus)</label><div className="flex gap-1"><input type="date" name="a1" defaultValue={sp.a1 ?? ""} className={inp} /><input type="date" name="a2" defaultValue={sp.a2 ?? ""} className={inp} /></div></div>
        <div><label className="mb-1.5 block text-xs font-semibold text-mut">Periode 2 (khusus)</label><div className="flex gap-1"><input type="date" name="b1" defaultValue={sp.b1 ?? ""} className={inp} /><input type="date" name="b2" defaultValue={sp.b2 ?? ""} className={inp} /></div></div>
        <button className="rounded-lg bg-bd px-5 py-2.5 text-sm font-semibold hover:brightness-110">Bandingkan</button>
      </form>
      {note && <p className="text-sm text-amber-400">{note}</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm"><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: C1 }} />Periode 1: {fdr(p1)}</span><span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: C2 }} />Periode 2: {fdr(p2)}</span></div>

      {empty ? <div className={`${box} p-8 text-center text-sm text-mut`}>Belum ada transaksi pada kedua periode ini. Coba pilih periode lain atau mulai catat transaksimu.</div> : (<>
        <div className={`${box} overflow-x-auto`}>
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wider text-mut"><th className="py-2">Indikator</th><th className="text-right">Periode 1</th><th className="text-right">Periode 2</th><th className="pl-4">Perubahan</th></tr></thead>
            <tbody>{rows.map(([l, a, b, good]) => (
              <tr key={l} className="border-b border-line/60">
                <td className="py-3 pr-2">{l}</td><td className="text-right tabular-nums text-mut">{rupiah(a)}</td><td className="text-right font-semibold tabular-nums">{rupiah(b)}</td>
                <td className="pl-4">{good === null ? <span className={b - a >= 0 ? "font-semibold text-cg" : "font-semibold text-red-400"}>{b - a >= 0 ? "+" : "−"}{rupiah(Math.abs(b - a))}</span> : <Chg c={pctChange(a, b)} goodUp={good} />}</td>
              </tr>))}
              {(bd1 || bd2) && <tr><td className="py-3 pr-2">Anggaran vs realisasi</td>
                {[bd1, bd2].map((x, i) => <td key={i} className="text-right text-xs tabular-nums text-mut">{x ? `${rupiah(x.spent)} / ${rupiah(x.amount)} (${Math.round((x.spent / x.amount) * 100)}%)` : "Tidak ada anggaran"}</td>)}<td /></tr>}
            </tbody>
          </table>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={`${box} space-y-4`}><h2 className="font-bold">Pemasukan dan Pengeluaran</h2><Duo label="Pemasukan" a={A.income} b={B.income} max={maxMain} /><Duo label="Pengeluaran" a={A.expense} b={B.expense} max={maxMain} /></div>
          <div className={`${box} space-y-4`}><h2 className="font-bold">Pengeluaran per Kategori</h2>
            {cats.length ? cats.slice(0, 8).map((x) => (<div key={x.id}><Duo label={name(x.id)} a={x.a} b={x.b} max={maxCat} /><div className="mt-1 text-xs">{x.change === null ? <span className="text-mut">Baru muncul di periode 2</span> : <Chg c={x.change} goodUp={false} />}</div></div>)) : <p className="text-sm text-mut">Belum ada pengeluaran pada kedua periode.</p>}</div>
        </div>
        <div className={box}><h2 className="mb-3 font-bold">Kesimpulan</h2>{out.length ? out.map((t) => <div key={t} className="mb-2 rounded-r-lg border-l-[3px] border-cg bg-dgreen/60 px-3 py-2.5 text-sm">{t}</div>) : <p className="text-sm text-mut">Belum ada perubahan yang dapat disimpulkan.</p>}</div>
      </>)}
    </main>
  );
}