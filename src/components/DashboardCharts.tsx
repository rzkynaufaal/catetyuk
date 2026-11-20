import { rupiah } from "@/lib/finance";

export function MonthlyBars({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const mx = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 600 200" className="h-auto w-full min-w-[420px]" role="img" aria-label="Grafik pemasukan dan pengeluaran 6 bulan terakhir">
        {data.map((d, i) => {
          const x = i * 100 + 14, hi = (d.income / mx) * 150, ho = (d.expense / mx) * 150;
          return (
            <g key={i}>
              <rect x={x} y={170 - hi} width={32} height={hi} rx={4} fill="#00CC99"><title>{`${d.label} — Pemasukan ${rupiah(d.income)}`}</title></rect>
              <rect x={x + 36} y={170 - ho} width={32} height={ho} rx={4} fill="#ff7b72"><title>{`${d.label} — Pengeluaran ${rupiah(d.expense)}`}</title></rect>
              <text x={x + 34} y={190} textAnchor="middle" fontSize={12} fill="#8FB3A4">{d.label}</text>
            </g>
          );
        })}
        <line x1={0} x2={600} y1={170} y2={170} stroke="#1B4636" />
      </svg>
    </div>
  );
}

export function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-mut">Belum ada pengeluaran pada periode ini.</p>;
  let acc = 0;
  return (
    <div>
      <svg viewBox="0 0 42 42" className="mx-auto h-40 w-40 -rotate-90" role="img" aria-label="Distribusi pengeluaran per kategori">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="#1B4636" strokeWidth="6" />
        {slices.map((s) => {
          const p = (s.value / total) * 100;
          const el = (
            <circle key={s.label} cx="21" cy="21" r="15.915" fill="none" stroke={s.color} strokeWidth="6" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-acc}>
              <title>{`${s.label} — ${rupiah(s.value)} (${Math.round(p)}%)`}</title>
            </circle>
          );
          acc += p;
          return el;
        })}
      </svg>
      <div className="mt-4 space-y-1.5">
        {slices.map((s) => (
          <div key={s.label} className="flex justify-between gap-2 text-sm">
            <span className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
            <span className="text-mut">{Math.round((s.value / total) * 100)}% · {rupiah(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}