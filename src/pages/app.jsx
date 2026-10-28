import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const TARGET = 4 * 60 * 60;
const STORAGE_KEY = "study-timer-v2";

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
const nextDayStart = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d + 1).getTime();
};
const hm = (s) => `${Math.floor(s / 3600)}h ${pad(Math.floor((s % 3600) / 60))}m`;

const freshSession = () => ({ date: todayKey(), elapsed: 0, startedAt: null });

const loadLocal = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.date) return saved;
  } catch {}
  return freshSession();
};

// A session left running past midnight gets credited up to the end of its day
const closeStale = (s) => {
  if (!s.startedAt) return { ...s };
  const end = Math.min(nextDayStart(s.date), Date.now());
  return {
    date: s.date,
    elapsed: s.elapsed + Math.max(0, Math.floor((end - s.startedAt) / 1000)),
    startedAt: null,
  };
};

// Fixed-width digits so the clock never jitters
const Digits = ({ value }) =>
  value.split("").map((ch, i) => (
    <span key={i} className="inline-block w-[0.62em] text-center">
      {ch}
    </span>
  ));

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
    .st-display { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; font-variant-numeric: tabular-nums; }
    .st-ui { font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif; }
    @keyframes st-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
    .st-live { animation: st-pulse 1.6s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) { .st-live { animation: none; } }
  `}</style>
);

/* ---------- Tracker ---------- */
const CX = 140;
const R = 118;
const CIRC = 2 * Math.PI * R;
const TICKS = 48; // one tick every 5 minutes across the 4 hour goal

export default function StudyTracker() {
  const [session, setSession] = useState(loadLocal);
  const [history, setHistory] = useState({});
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState("idle"); // idle | saving | error

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const readyRef = useRef(false);
  const dirtyRef = useRef(false); // true when the last save failed

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const persist = useCallback(
    async (s) => {
      setSync("saving");
      const { error } = await supabase.from("study_days").upsert(
        {
          day: s.date,
          elapsed_seconds: s.elapsed,
          started_at: s.startedAt ? new Date(s.startedAt).toISOString() : null,
        },
        { onConflict: "day" }
      );
      if (error) console.error("study_days save failed:", error.message);
      dirtyRef.current = !!error;
      setSync(error ? "error" : "idle");
      return !error;
    },
    []
  );

  // Load history + today's row from Supabase
  const bootstrap = useCallback(async () => {
    const today = todayKey();
    try {
      const t = new Date();
      const since = keyOf(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 365));
      const { data: rows, error } = await supabase
        .from("study_days")
        .select("day, elapsed_seconds, started_at")
        .gte("day", since)
        .order("day", { ascending: true });
      if (error) throw error;

      const hist = {};
      let todayRow = null;
      for (const r of rows) {
        if (r.day === today) { todayRow = r; continue; }
        if (r.started_at) {
          const c = closeStale({ date: r.day, elapsed: r.elapsed_seconds, startedAt: Date.parse(r.started_at) });
          hist[r.day] = c.elapsed;
          await persist(c);
        } else {
          hist[r.day] = r.elapsed_seconds;
        }
      }

      const local = sessionRef.current;
      if (local.date !== today && (local.elapsed > 0 || local.startedAt)) {
        const closed = closeStale(local);
        if (closed.elapsed > (hist[closed.date] || 0)) {
          hist[closed.date] = closed.elapsed;
          await persist(closed);
        }
      }

      let cur;
      if (dirtyRef.current && local.date === today) cur = local;
      else if (todayRow)
        cur = {
          date: today,
          elapsed: todayRow.elapsed_seconds,
          startedAt: todayRow.started_at ? Date.parse(todayRow.started_at) : null,
        };
      else cur = local.date === today ? local : freshSession();

      if (!todayRow && (cur.elapsed > 0 || cur.startedAt)) await persist(cur);

      setSession(cur);
      sessionRef.current = cur;
      setHistory(hist);
    } catch (e) {
      console.error("study_days load failed:", e.message || e);
      setSync("error");
      if (sessionRef.current.date !== today) {
        const fresh = freshSession();
        setSession(fresh);
        sessionRef.current = fresh;
      }
    } finally {
      readyRef.current = true;
      setReady(true);
    }
  }, [persist]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Clock tick, midnight rollover, re-sync when the tab comes back
  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      if (!readyRef.current) return;
      const cur = sessionRef.current;
      if (cur.date !== todayKey()) {
        const closed = closeStale(cur);
        const fresh = freshSession();
        setSession(fresh);
        sessionRef.current = fresh;
        if (closed.elapsed > 0) {
          setHistory((h) => ({ ...h, [closed.date]: closed.elapsed }));
          persist(closed);
        }
      }
    };
    const onVisible = () => {
      tick();
      if (document.visibilityState === "visible" && readyRef.current) bootstrap();
    };
    const id = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [bootstrap, persist]);

  const running = session.startedAt !== null;
  const elapsed =
    session.elapsed +
    (running ? Math.max(0, Math.floor((now - session.startedAt) / 1000)) : 0);

  const h = pad(Math.floor(elapsed / 3600));
  const m = pad(Math.floor((elapsed % 3600) / 60));
  const s = pad(elapsed % 60);

  const remainingSecs = Math.max(0, TARGET - elapsed);
  const done = elapsed >= TARGET;
  const progress = Math.min(1, elapsed / TARGET);

  function start() {
    if (running) return;
    const next = { ...session, startedAt: Date.now() };
    setSession(next);
    sessionRef.current = next;
    setNow(Date.now());
    persist(next);
  }

  function stop() {
    if (!running) return;
    const total = session.elapsed + Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
    const next = { ...session, elapsed: total, startedAt: null };
    setSession(next);
    sessionRef.current = next;
    setNow(Date.now());
    persist(next);
  }

  const todayIndex = (new Date().getDay() + 6) % 7;
  const week = useMemo(() => {
    const t = new Date();
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
      const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - todayIndex + i);
      const value = i === todayIndex ? elapsed : history[keyOf(d)] || 0;
      return { label, value, isToday: i === todayIndex, future: i > todayIndex };
    });
  }, [history, elapsed, todayIndex]);

  const streak = useMemo(() => {
    const t = new Date();
    let count = elapsed >= TARGET ? 1 : 0;
    for (let i = 1; i < 365; i++) {
      const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - i);
      if ((history[keyOf(d)] || 0) >= TARGET) count++;
      else break;
    }
    return count;
  }, [history, elapsed]);

  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const dotX = CX + R * Math.cos(angle);
  const dotY = CX + R * Math.sin(angle);

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (!ready) {
    return (
      <main className="st-ui flex min-h-screen items-center justify-center bg-[#0B1F24] text-sm text-[#8FB0AB]">
        <Styles />
        Loading your study time…
      </main>
    );
  }

  const syncText =
    sync === "error"
      ? "Couldn’t sync. Your time is kept on this device and will retry on your next action."
      : sync === "saving"
      ? "Saving…"
      : running
      ? "The timer keeps running while you use other apps."
      : "Synced.";

  return (
    <main className="min-h-screen bg-[#0B1F24] px-5 py-8 text-[#E8F1EC] sm:px-8 sm:py-12 lg:px-12">
      <Styles />

      <div className="st-ui mx-auto max-w-5xl">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="st-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Study tracker
            </h1>
            <p className="mt-2 text-sm text-[#8FB0AB]">{dateLabel}</p>
          </div>
          <p className="text-sm text-[#8FB0AB]">Goal: 4 hours a day</p>
        </header>

        <div className="mt-10 grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-14 lg:gap-20">
          {/* Dial */}
          <section aria-label="Today's study timer" className="mx-auto w-full max-w-[24rem]">
            <div className="relative aspect-square">
              <svg viewBox="0 0 280 280" className="h-full w-full" role="img" aria-label={`${Math.floor(progress * 100)} percent of daily goal`}>
                {Array.from({ length: TICKS }).map((_, i) => {
                  const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
                  const major = i % 12 === 0;
                  const r1 = major ? 94 : 98;
                  const r2 = 104;
                  const filled = i / TICKS < progress;
                  return (
                    <line
                      key={i}
                      x1={CX + r1 * Math.cos(a)}
                      y1={CX + r1 * Math.sin(a)}
                      x2={CX + r2 * Math.cos(a)}
                      y2={CX + r2 * Math.sin(a)}
                      stroke={filled ? "#B8F2C9" : "#ffffff"}
                      strokeOpacity={filled ? 0.7 : major ? 0.35 : 0.14}
                      strokeWidth={major ? 2 : 1.5}
                      strokeLinecap="round"
                    />
                  );
                })}
                <circle cx={CX} cy={CX} r={R} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="14" />
                <circle
                  cx={CX}
                  cy={CX}
                  r={R}
                  fill="none"
                  stroke={done ? "#F3C969" : "#B8F2C9"}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - progress)}
                  transform={`rotate(-90 ${CX} ${CX})`}
                  className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                />
                {progress > 0 && (
                  <circle cx={dotX} cy={dotY} r="4" fill="#0B1F24" className={running ? "st-live" : ""} />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="st-display flex items-baseline text-[3.6rem] font-semibold leading-none sm:text-[4.2rem]">
                  <Digits value={h} />
                  <span className="px-0.5 text-[#8FB0AB]">:</span>
                  <Digits value={m} />
                </div>
                <div className="st-display mt-1 flex text-2xl text-[#8FB0AB]">
                  <Digits value={s} />
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm text-[#8FB0AB]">
                  <span className={`h-2 w-2 rounded-full ${running ? "st-live bg-[#B8F2C9]" : "bg-[#8FB0AB]/50"}`} />
                  {running ? "Focusing" : elapsed > 0 ? "Paused" : "Ready"}
                </p>
              </div>
            </div>

            <button
              onClick={running ? stop : start}
              className={`mt-8 flex min-h-14 w-full items-center justify-center rounded-full px-6 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8F2C9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1F24] motion-reduce:transition-none ${
                running
                  ? "border border-[#B8F2C9]/40 text-[#B8F2C9] hover:bg-[#B8F2C9]/10"
                  : "bg-[#B8F2C9] text-[#0B1F24] hover:bg-[#cdf7d9]"
              }`}
            >
              {running ? "Pause session" : elapsed > 0 ? "Resume session" : "Start studying"}
            </button>
            <p className={`mt-3 text-center text-xs ${sync === "error" ? "text-[#F3C969]" : "text-[#8FB0AB]"}`}>
              {syncText}
            </p>
          </section>

          {/* Stats + week */}
          <section aria-label="Progress this week">
            <dl className="divide-y divide-white/10 border-y border-white/10">
              <div className="flex items-baseline justify-between py-4">
                <dt className="text-sm text-[#8FB0AB]">Studied today</dt>
                <dd className="st-display text-2xl font-semibold">{hm(elapsed)}</dd>
              </div>
              <div className="flex items-baseline justify-between py-4">
                <dt className="text-sm text-[#8FB0AB]">{done ? "Goal" : "Left to reach goal"}</dt>
                <dd className="st-display text-2xl font-semibold">
                  {done ? <span className="text-[#F3C969]">Reached</span> : hm(remainingSecs)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between py-4">
                <dt className="text-sm text-[#8FB0AB]">Goal streak</dt>
                <dd className="st-display text-2xl font-semibold">
                  {streak} {streak === 1 ? "day" : "days"}
                </dd>
              </div>
            </dl>

            <h2 className="mt-10 text-sm font-semibold">This week</h2>
            <div className="mt-4 grid h-44 grid-cols-7 gap-2 sm:h-52 sm:gap-4">
              {week.map((d) => {
                const pct = Math.min(100, (d.value / TARGET) * 100);
                const hit = d.value >= TARGET;
                return (
                  <div key={d.label} className="flex min-w-0 flex-col items-center gap-2">
                    <div
                      className="relative flex w-full flex-1 items-end overflow-hidden rounded-full bg-white/[0.06]"
                      title={d.future ? "" : hm(d.value)}
                    >
                      <div
                        className={`w-full rounded-full transition-[height] duration-700 motion-reduce:transition-none ${
                          hit ? "bg-[#F3C969]" : d.isToday ? "bg-[#B8F2C9]" : "bg-[#4E8A82]"
                        }`}
                        style={{ height: `${d.value > 0 ? Math.max(6, pct) : 0}%` }}
                      />
                    </div>
                    <span className={`text-xs ${d.isToday ? "font-bold text-[#B8F2C9]" : "text-[#8FB0AB]"}`}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-[#8FB0AB]">
              <span className="h-2 w-2 rounded-full bg-[#F3C969]" />
              Days you hit the 4-hour goal
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

