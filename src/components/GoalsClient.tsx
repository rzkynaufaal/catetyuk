
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Ban,
  RotateCcw,
  CalendarDays,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rupiah, todayWIB, type GoalStatus } from "@/lib/finance";

type C = {
  id: string;
  goal_id: string;
  amount: number;
  contributed_on: string;
  notes: string | null;
};

export type GoalItem = {
  id: string;
  name: string;
  target_amount: number;
  initial_amount: number;
  target_date: string | null;
  kind: string | null;
  priority: string | null;
  notes: string | null;
  cancelled: boolean;
  saved: number;
  pct: number;
  remaining: number;
  status: GoalStatus;
  etaDays: number | null;
  contribs: C[];
};

const KINDS: Record<string, string> = {
  "Dana Darurat": "🛟",
  Elektronik: "💻",
  Kendaraan: "🚗",
  Pendidikan: "🎓",
  Liburan: "✈️",
  Rumah: "🏠",
  Lainnya: "🎯",
};

const ST: Record<GoalStatus, [string, string, string]> = {
  belum_dimulai: ["Belum dimulai", "bg-line text-mut", "bg-line"],
  berjalan: ["Sedang berjalan", "bg-cg/15 text-cg", "bg-cg"],
  hampir_tercapai: [
    "Hampir tercapai",
    "bg-amber-400/15 text-amber-400",
    "bg-amber-400",
  ],
  tercapai: [
    "Berhasil dicapai ✓",
    "bg-emerald-400/20 text-emerald-300",
    "bg-emerald-400",
  ],
  terlambat: [
    "Terlambat dari target waktu",
    "bg-red-400/15 text-red-400",
    "bg-red-400",
  ],
  dibatalkan: ["Dibatalkan", "bg-line text-mut", "bg-line"],
};

const fmt = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 13);
  return d ? Number(d).toLocaleString("id-ID") : "";
};

const num = (v: string) => parseInt(v.replace(/\D/g, ""), 10) || 0;

// Memastikan format tanggal sesuai kebutuhan input type="date".
const dateInputValue = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const fd = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const eta = (n: number) =>
  new Date(Date.now() + n * 864e5).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    month: "long",
    year: "numeric",
  });

// Membuka kalender native browser.
function openCalendar(input: HTMLInputElement | null) {
  if (!input) return;

  const dateInput = input as HTMLInputElement & {
    showPicker?: () => void;
  };

  if (typeof dateInput.showPicker === "function") {
    dateInput.showPicker();
  } else {
    input.focus();
    input.click();
  }
}

export default function GoalsClient({
  goals,
  balance,
  allocated,
}: {
  goals: GoalItem[];
  balance: number;
  allocated: number;
}) {
  const router = useRouter();

  const free = balance - allocated;

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [tgt, setTgt] = useState("");
  const [ini, setIni] = useState("");

  const [msg, setMsg] = useState<{
    ok: boolean;
    t: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);

  const [openId, setOpenId] = useState<string | null>(null);
  const [editC, setEditC] = useState<C | null>(null);

  const [camt, setCamt] = useState("");
  const [cmsg, setCmsg] = useState<string | null>(null);

  // Referensi input tanggal agar tombol kalender dapat membukanya.
  const targetDateRef = useRef<HTMLInputElement>(null);
  const contributionDateRef = useRef<HTMLInputElement>(null);

  const ed = goals.find((g) => g.id === editId) ?? null;

  function openForm(g?: GoalItem) {
    setEditId(g?.id ?? null);

    setTgt(
      g ? g.target_amount.toLocaleString("id-ID") : ""
    );

    setIni(
      g && g.initial_amount
        ? g.initial_amount.toLocaleString("id-ID")
        : ""
    );

    setMsg(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setTgt("");
    setIni("");
    setMsg(null);
  }

  async function saveGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);

    const f = new FormData(e.currentTarget);

    const name = String(f.get("name")).trim();
    const target = num(tgt);
    const initial = num(ini);

    if (!name) {
      return setMsg({
        ok: false,
        t: "Nama target wajib diisi.",
      });
    }

    if (target <= 0) {
      return setMsg({
        ok: false,
        t: "Nominal target harus lebih dari Rp0.",
      });
    }

    const row = {
      name,
      target_amount: target,
      initial_amount: initial,
      target_date: String(f.get("target_date")) || null,
      kind: String(f.get("kind")),
      priority: String(f.get("priority")) || null,
      notes: String(f.get("notes")).trim() || null,
    };

    setBusy(true);

    const sb = createClient();

    const { error } = editId
      ? await sb
          .from("savings_goals")
          .update(row)
          .eq("id", editId)
      : await sb
          .from("savings_goals")
          .insert(row);

    setBusy(false);

    if (error) {
      return setMsg({
        ok: false,
        t: "Gagal menyimpan: " + error.message,
      });
    }

    closeForm();
    router.refresh();
  }

  async function delGoal(g: GoalItem) {
    if (
      !confirm(
        `Hapus target "${g.name}" beserta seluruh kontribusinya? Dana kembali menjadi saldo bebas.`
      )
    ) {
      return;
    }

    const { error } = await createClient()
      .from("savings_goals")
      .delete()
      .eq("id", g.id);

    if (error) {
      return alert("Gagal menghapus: " + error.message);
    }

    router.refresh();
  }

  async function toggleCancel(g: GoalItem) {
    if (
      !g.cancelled &&
      !confirm(
        `Batalkan target "${g.name}"? Dana yang sudah dialokasikan kembali menjadi saldo bebas.`
      )
    ) {
      return;
    }

    const { error } = await createClient()
      .from("savings_goals")
      .update({ cancelled: !g.cancelled })
      .eq("id", g.id);

    if (error) {
      return alert("Gagal memperbarui: " + error.message);
    }

    router.refresh();
  }

  function openPanel(id: string) {
    setOpenId(openId === id ? null : id);
    setEditC(null);
    setCamt("");
    setCmsg(null);
  }

  async function saveContrib(
    e: React.FormEvent<HTMLFormElement>,
    g: GoalItem
  ) {
    e.preventDefault();
    setCmsg(null);

    const form = e.currentTarget;
    const f = new FormData(form);

    const amount = num(camt);
    const date = String(f.get("date"));

    if (amount <= 0) {
      return setCmsg("Nominal harus lebih dari Rp0.");
    }

    if (!date) {
      return setCmsg("Tanggal wajib diisi.");
    }

    const limit = free + (editC?.amount ?? 0);

    if (amount > limit) {
      return setCmsg(
        `Nominal melebihi saldo bebas (${rupiah(
          Math.max(0, limit)
        )}). Catat pemasukan terlebih dahulu.`
      );
    }

    const row = {
      goal_id: g.id,
      amount,
      contributed_on: date,
      notes: String(f.get("notes")).trim() || null,
    };

    const sb = createClient();

    const { error } = editC
      ? await sb
          .from("goal_contributions")
          .update(row)
          .eq("id", editC.id)
      : await sb
          .from("goal_contributions")
          .insert(row);

    if (error) {
      return setCmsg("Gagal menyimpan: " + error.message);
    }

    form.reset();
    setCamt("");
    setEditC(null);

    router.refresh();
  }

  async function delContrib(c: C) {
    if (!confirm("Hapus kontribusi ini? Dana kembali menjadi saldo bebas.")) {
      return;
    }

    const { error } = await createClient()
      .from("goal_contributions")
      .delete()
      .eq("id", c.id);

    if (error) {
      return alert("Gagal menghapus: " + error.message);
    }

    router.refresh();
  }

  const inp =
    "w-full rounded-lg border border-line bg-rich px-3 py-2.5 text-sm outline-none focus:border-cg";

  const lab =
    "mb-1.5 block text-xs font-semibold text-mut";

  const box =
    "rounded-2xl border border-line bg-panel p-4";

  // Komponen input tanggal dengan tombol kalender.
  function DatePicker({
    name,
    label,
    value,
    inputRef,
  }: {
    name: string;
    label: string;
    value: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) {
    return (
      <div>
        <label className={lab}>{label}</label>

        <div className="relative">
          <input
            ref={inputRef}
            type="date"
            name={name}
            defaultValue={dateInputValue(value)}
            className={`${inp} pr-11 scheme-dark`}
          />

          <button
            type="button"
            onClick={() => openCalendar(inputRef.current)}
            title="Buka kalender"
            aria-label="Buka kalender"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-md text-cg transition hover:bg-cg/15 hover:text-white"
          >
            <CalendarDays size={19} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Ringkasan saldo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={box}>
          <div className="text-xs font-semibold uppercase tracking-wider text-mut">
            Total Saldo
          </div>
          <div className="mt-1 text-xl font-extrabold tabular-nums">
            {rupiah(balance)}
          </div>
        </div>

        <div className={box}>
          <div className="text-xs font-semibold uppercase tracking-wider text-mut">
            Dialokasikan ke Target
          </div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-amber-400">
            {rupiah(allocated)}
          </div>
        </div>

        <div className={box}>
          <div className="text-xs font-semibold uppercase tracking-wider text-mut">
            Saldo Bebas
          </div>
          <div
            className={`mt-1 text-xl font-extrabold tabular-nums ${
              free >= 0 ? "text-cg" : "text-red-400"
            }`}
          >
            {rupiah(free)}
          </div>
        </div>
      </div>

      {/* Tombol buat target */}
      {!showForm ? (
        <button
          onClick={() => openForm()}
          className="rounded-lg bg-bd px-5 py-2.5 text-sm font-semibold hover:brightness-110"
        >
          + Buat Target Baru
        </button>
      ) : (
        <form
          key={editId ?? "baru"}
          onSubmit={saveGoal}
          className="grid gap-4 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2"
        >
          <h2 className="font-bold sm:col-span-2">
            {ed ? "Ubah Target" : "Buat Target Baru"}
          </h2>

          <div>
            <label className={lab}>Nama Target</label>
            <input
              name="name"
              maxLength={60}
              defaultValue={ed?.name}
              placeholder="Contoh: Membeli Laptop"
              className={inp}
            />
          </div>

          <div>
            <label className={lab}>Jenis Tujuan</label>
            <select
              name="kind"
              defaultValue={ed?.kind ?? "Lainnya"}
              className={inp}
            >
              {Object.keys(KINDS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={lab}>Nominal Target</label>
            <input
              inputMode="numeric"
              value={tgt}
              onChange={(e) => setTgt(fmt(e.target.value))}
              placeholder="Rp0"
              className={inp}
            />
          </div>

          <div>
            <label className={lab}>
              Nominal Awal Tabungan (opsional)
            </label>
            <input
              inputMode="numeric"
              value={ini}
              onChange={(e) => setIni(fmt(e.target.value))}
              placeholder="Rp0"
              className={inp}
            />
          </div>

          <DatePicker
            name="target_date"
            label="Tanggal Target (opsional)"
            value={ed?.target_date ?? ""}
            inputRef={targetDateRef}
          />

          <div>
            <label className={lab}>Prioritas (opsional)</label>
            <select
              name="priority"
              defaultValue={ed?.priority ?? ""}
              className={inp}
            >
              <option value="">Tanpa prioritas</option>
              <option>Tinggi</option>
              <option>Sedang</option>
              <option>Rendah</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className={lab}>Deskripsi (opsional)</label>
            <input
              name="notes"
              maxLength={160}
              defaultValue={ed?.notes ?? ""}
              className={inp}
            />
          </div>

          {msg && (
            <p
              className={`text-sm sm:col-span-2 ${
                msg.ok ? "text-cg" : "text-red-400"
              }`}
            >
              {msg.t}
            </p>
          )}

          <div className="flex gap-3 sm:col-span-2">
            <button
              disabled={busy}
              className="rounded-lg bg-bd px-5 py-2.5 text-sm font-semibold hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Menyimpan…" : "Simpan Target"}
            </button>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-mut hover:text-white"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Daftar target */}
      {!goals.length ? (
        <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-mut">
          Belum ada target tabungan. Buat target pertamamu, misalnya Dana
          Darurat atau membeli laptop.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g) => {
            const [label, badge, bar] = ST[g.status];

            const active =
              g.status !== "tercapai" &&
              g.status !== "dibatalkan";

            return (
              <div
                key={g.id}
                className={`rounded-2xl border border-line bg-panel p-5 ${
                  g.cancelled ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-dgreen text-xl">
                      {KINDS[g.kind ?? "Lainnya"] ?? "🎯"}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-bold">
                        {g.name}
                      </div>

                      <div className="text-xs text-mut">
                        {g.kind ?? "Lainnya"}
                        {g.priority
                          ? ` · Prioritas ${g.priority}`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <span className="flex shrink-0 gap-0.5">
                    <button
                      onClick={() => openForm(g)}
                      title="Ubah"
                      className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-white"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      onClick={() => toggleCancel(g)}
                      title={
                        g.cancelled
                          ? "Aktifkan kembali"
                          : "Batalkan target"
                      }
                      className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-white"
                    >
                      {g.cancelled ? (
                        <RotateCcw size={15} />
                      ) : (
                        <Ban size={15} />
                      )}
                    </button>

                    <button
                      onClick={() => delGoal(g)}
                      title="Hapus"
                      className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>

                <span
                  className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}
                >
                  {label}
                </span>

                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full transition-all ${bar}`}
                    style={{
                      width: `${Math.min(100, g.pct)}%`,
                    }}
                  />
                </div>

                <div className="mt-1.5 text-right text-sm font-bold tabular-nums">
                  {Math.floor(g.pct)}%
                </div>

                <dl className="mt-1 grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-mut">Target</dt>
                  <dd className="text-right tabular-nums">
                    {rupiah(g.target_amount)}
                  </dd>

                  <dt className="text-mut">Terkumpul</dt>
                  <dd className="text-right tabular-nums">
                    {rupiah(g.saved)}
                  </dd>

                  <dt className="text-mut">Sisa</dt>
                  <dd className="text-right font-semibold tabular-nums">
                    {rupiah(g.remaining)}
                  </dd>

                  {g.target_date && (
                    <>
                      <dt className="text-mut">Tanggal target</dt>
                      <dd className="text-right">
                        {fd(dateInputValue(g.target_date))}
                      </dd>
                    </>
                  )}
                </dl>

                {active && (
                  <p className="mt-2 text-xs text-mut">
                    {g.etaDays !== null
                      ? `Estimasi tercapai sekitar ${eta(
                          g.etaDays
                        )}, berdasarkan pola kontribusimu.`
                      : "Estimasi belum tersedia (butuh minimal 3 kontribusi dalam rentang 14 hari)."}
                  </p>
                )}

                {g.notes && (
                  <p className="mt-1 text-xs text-mut">
                    {g.notes}
                  </p>
                )}

                <button
                  onClick={() => openPanel(g.id)}
                  className="mt-3 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-mut hover:border-cg hover:text-white"
                >
                  {openId === g.id
                    ? "Tutup"
                    : `Kontribusi (${g.contribs.length})`}
                </button>

                {/* Panel kontribusi */}
                {openId === g.id && (
                  <div className="mt-3 space-y-3 border-t border-line pt-3">
                    {g.cancelled ? (
                      <p className="text-sm text-mut">
                        Target dibatalkan. Aktifkan kembali untuk
                        menambah dana.
                      </p>
                    ) : (
                      <form
                        key={editC?.id ?? "baru"}
                        onSubmit={(e) => saveContrib(e, g)}
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <div>
                          <label className={lab}>Nominal</label>
                          <input
                            inputMode="numeric"
                            value={camt}
                            onChange={(e) =>
                              setCamt(fmt(e.target.value))
                            }
                            placeholder="Rp0"
                            className={inp}
                          />
                        </div>

                        <DatePicker
                          name="date"
                          label="Tanggal Kontribusi"
                          value={
                            editC?.contributed_on ?? todayWIB()
                          }
                          inputRef={contributionDateRef}
                        />

                        <div className="sm:col-span-2">
                          <label className={lab}>
                            Catatan (opsional)
                          </label>
                          <input
                            name="notes"
                            maxLength={120}
                            defaultValue={editC?.notes ?? ""}
                            className={inp}
                          />
                        </div>

                        <p className="text-xs text-mut sm:col-span-2">
                          Sumber dana: saldo bebas (
                          {rupiah(free + (editC?.amount ?? 0))}).
                          Ini alokasi, bukan pemasukan baru.
                        </p>

                        {cmsg && (
                          <p className="text-sm text-red-400 sm:col-span-2">
                            {cmsg}
                          </p>
                        )}

                        <div className="flex gap-2 sm:col-span-2">
                          <button className="rounded-lg bg-bd px-4 py-2 text-sm font-semibold hover:brightness-110">
                            {editC
                              ? "Simpan Perubahan"
                              : "Tambah Dana"}
                          </button>

                          {editC && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditC(null);
                                setCamt("");
                                setCmsg(null);
                              }}
                              className="rounded-lg border border-line px-4 py-2 text-sm text-mut hover:text-white"
                            >
                              Batal
                            </button>
                          )}
                        </div>
                      </form>
                    )}

                    {/* Riwayat kontribusi */}
                    {g.contribs.length ? (
                      g.contribs.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-2 border-b border-line/60 pb-2 text-sm last:border-0"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold tabular-nums">
                              {rupiah(c.amount)}
                            </div>

                            <div className="truncate text-xs text-mut">
                              {fd(dateInputValue(c.contributed_on))}
                              {c.notes ? ` · ${c.notes}` : ""}
                            </div>
                          </div>

                          <span className="flex shrink-0 gap-0.5">
                            <button
                              onClick={() => {
                                setEditC(c);
                                setCamt(
                                  c.amount.toLocaleString("id-ID")
                                );
                                setCmsg(null);
                              }}
                              title="Ubah"
                              className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-white"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={() => delContrib(c)}
                              title="Hapus"
                              className="rounded p-1.5 text-mut hover:bg-dgreen hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-mut">
                        Belum ada kontribusi untuk target ini.
                      </p>
                    )}

                    {g.initial_amount > 0 && (
                      <p className="text-xs text-mut">
                        Termasuk nominal awal{" "}
                        {rupiah(g.initial_amount)}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
