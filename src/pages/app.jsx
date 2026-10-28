import React, { useEffect, useMemo, useState } from "react";

const TARGET = 4 * 60 * 60;
const STORAGE_KEY = "study-timer-v1";
const HISTORY_KEY = "study-history-v1";

const keyOf = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const todayKey = () => keyOf(new Date());

const initialSession = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.date === todayKey()) return saved;
  } catch {}
  return { date: todayKey(), elapsed: 0, startedAt: null };
};

const initialHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
  } catch {
    return {};
  }
};

const pad = (n) => String(n).padStart(2, "0");
const hm = (s) => `${Math.floor(s / 3600)}h ${pad(Math.floor((s % 3600) / 60))}m`;

// Fixed-width digits so the clock never jitters
const Digits = ({ value }) =>
  value.split("").map((ch, i) => (
    <span key={i} className="inline-block w-[0.62em] text-center">
      {ch}
    </span>
  ));

const CX = 140;
const R = 118;
const CIRC = 2 * Math.PI * R;
const TICKS = 48; // one tick every 5 minutes across the 4 hour goal

export default function StudyTracker() {
  const [session, setSession] = useState(initialSession);
  const [history, setHistory] = useState(initialHistory);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    if (session.elapsed > 0) {
      setHistory((h) =>
        h[session.date] === session.elapsed
          ? h
          : { ...h, [session.date]: session.elapsed }
      );
    }
  }, [session]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const refresh = () => {
      setNow(Date.now());
      setSession((old) =>
        old.date === todayKey()
          ? old
          : { date: todayKey(), elapsed: 0, startedAt: null }
      );
    };
    const id = setInterval(refresh, 1000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

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
    setSession({ ...session, startedAt: Date.now() });
    setNow(Date.now());
  }

  function stop() {
    if (!running) return;
    const total =
      session.elapsed +
      Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
    setSession({ ...session, elapsed: total, startedAt: null });
    setNow(Date.now());
  }

  // Week (Mon–Sun) built from saved history; today is live
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
    let count = 0;
    let startOffset = 0;
    if (elapsed >= TARGET) {
      count = 1;
      startOffset = 1;
    } else {
      startOffset = 1;
    }
    for (let i = startOffset; i < 365; i++) {
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

  return (
    <main className="min-h-screen bg-[#0B1F24] px-5 py-8 text-[#E8F1EC] sm:px-8 sm:py-12 lg:px-12">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        .st-display { font-family: 'Fraunces', Georgia, 'Times New Roman', serif; font-variant-numeric: tabular-nums; }
        .st-ui { font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif; }
        @keyframes st-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        .st-live { animation: st-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .st-live { animation: none; } }
      `}</style>

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
                {/* tick marks: each one is 5 minutes */}
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

                {/* track */}
                <circle cx={CX} cy={CX} r={R} fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeWidth="14" />
                {/* progress */}
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
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r="4"
                    fill="#0B1F24"
                    className={running ? "st-live" : ""}
                  />
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
                  <span
                    className={`h-2 w-2 rounded-full ${
                      running ? "st-live bg-[#B8F2C9]" : "bg-[#8FB0AB]/50"
                    }`}
                  />
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
            <p className="mt-3 text-center text-xs text-[#8FB0AB]">
              {running
                ? "The timer keeps running while you use other apps."
                : "Your time is saved on this device."}
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
                  {done ? (
                    <span className="text-[#F3C969]">Reached</span>
                  ) : (
                    hm(remainingSecs)
                  )}
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
                    <span
                      className={`text-xs ${
                        d.isToday ? "font-bold text-[#B8F2C9]" : "text-[#8FB0AB]"
                      }`}
                    >
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

