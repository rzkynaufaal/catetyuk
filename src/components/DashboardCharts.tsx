"use client";
import { useState } from "react";
import { rupiah } from "@/lib/finance";

export function MonthlyBars({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const [h, setH] = useState<number | null>(null);
  const mx = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 600 220" className="h-auto w-full min-w-[420px]" role="img" aria-label="Grafik pemasukan dan pengeluaran 6 bulan terakhir">
        {[0, 1, 2, 3].map((i) => <line key={i} x1={0} x2={600} y1={190 - i * 50} y2={190 - i * 50} className="stroke-line" strokeDasharray={i ? "3 5" : undefined} opacity={i ? 0.6 : 1} />)}
        {data.map((d, i) => {
          const x = i * 100 + 14, hi = (d.income / mx) * 150, ho = (d.expense / mx) * 150;
          return (
            <g key={i} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)} onTouchStart={() => setH(i)} style={{ opacity: h !== null && h !== i ? 0.35 : 1, transition: "opacity .2s", cursor: "pointer" }}>
              <rect x={i * 100} y={20} width={96} height={190} fill="transparent" />
              <rect className="bar-up" style={{ animationDelay: `${i * 70}ms` }} x={x} y={190 - hi} width={32} height={hi} rx={5} fill="#00CC99" />
              <rect className="bar-up" style={{ animationDelay: `${i * 70 + 40}ms` }} x={x + 36} y={190 - ho} width={32} height={ho} rx={5} fill="#ff7b72" />
              <text x={x + 34} y={210} textAnchor="middle" fontSize={12} className="fill-mut">{d.label}</text>
            </g>
          );
        })}
        {h !== null && (() => {
          const d = data[h], tx = Math.min(Math.max(h * 100 + 48, 90), 510);
          return (
            <g pointerEvents="none">
              <rect x={tx - 92} y={0} width={184} height={36} rx={8} className="fill-panel stroke-line" />
              <text x={tx} y={15} textAnchor="middle" fontSize={11} fill="#00CC99">Masuk {rupiah(d.income)}</text>
              <text x={tx} y={29} textAnchor="middle" fontSize={11} fill="#ff7b72">Keluar {rupiah(d.expense)}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

export function Donut({ slices }: { slices: { label: string; value: number; color: string }[] }) {
  const [h, setH] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-mut">Belum ada pengeluaran pada periode ini.</p>;
  let acc = 0;
  return (
    <div>
      <div className="relative mx-auto h-44 w-44">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label="Distribusi pengeluaran per kategori">
          <circle cx="21" cy="21" r="15.915" fill="none" className="stroke-line" strokeWidth={6} />
          {slices.map((s, i) => {
            const p = (s.value / total) * 100;
            const el = (
              <circle key={s.label} className="slice-draw" cx="21" cy="21" r="15.915" fill="none" stroke={s.color} strokeWidth={h === i ? 7.5 : 6}
                strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={-acc} opacity={h !== null && h !== i ? 0.35 : 1}
                style={{ animationDelay: `${i * 90}ms`, transition: "stroke-width .2s, opacity .2s", cursor: "pointer" }}
                onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)} onTouchStart={() => setH(i)} />
            );
            acc += p;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="max-w-[90px] truncate text-[11px] text-mut">{h === null ? "Total" : slices[h].label}</div>
            <div className="text-sm font-extrabold tabular-nums">{rupiah(h === null ? total : slices[h].value)}</div>
            {h !== null && <div className="text-xs font-semibold text-cg">{Math.round((slices[h].value / total) * 100)}%</div>}
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        {slices.map((s, i) => (
          <div key={s.label} onMouseEnter={() => setH(i)} onMouseLeave={() => setH(null)} className={`flex cursor-default justify-between gap-2 rounded-lg px-2 py-1 text-sm transition ${h === i ? "bg-dgreen/70" : ""}`}>
            <span className="flex items-center gap-2"><i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.label}</span>
            <span className="text-mut">{Math.round((s.value / total) * 100)}% · {rupiah(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}