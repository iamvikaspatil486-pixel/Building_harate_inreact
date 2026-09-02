import React, { useState, useRef, useEffect, useCallback } from "react";
import CameraFeed from "../components/CameraFeed";
import PianoOverlay from "../components/PianoOverlay";

const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14];
const WHITE_NAMES = ["C", "D", "E", "F", "G", "A", "B", "C", "D"];
const BLACK_KEYS = [
  { after: 0, offset: 1, name: "C#" },
  { after: 1, offset: 3, name: "D#" },
  { after: 3, offset: 6, name: "F#" },
  { after: 4, offset: 8, name: "G#" },
  { after: 5, offset: 10, name: "A#" },
  { after: 6, offset: 13, name: "C#" },
  { after: 7, offset: 15, name: "D#" },
];
const FINGERTIP_IDS = [4, 8, 12, 16, 20];

function noteFreq(baseOctave, semitoneOffset) {
  const midi = (baseOctave + 1) * 12 + semitoneOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export default function AirPiano() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const voicesRef = useRef({});
  const activeFingerMapRef = useRef({});

  const [phase, setPhase] = useState("idle"); // idle | loading | running | error
  const [errorMsg, setErrorMsg] = useState("");
  const [octave, setOctave] = useState(4);
  const [waveform, setWaveform] = useState("triangle");
  const [keyRects, setKeyRects] = useState([]);

  const octaveRef = useRef(octave);
  const waveformRef = useRef(waveform);

  const layoutKeys = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width || window.innerWidth;
    const H = canvas.height || window.innerHeight;
    const keyboardTop = H * 0.55;
    const keyboardHeight = H * 0.4;
    const whiteCount = WHITE_STEPS.length;
    const whiteW = W / whiteCount;
    const oct = octaveRef.current;

    const rects = [];
    for (let i = 0; i < whiteCount; i++) {
      rects.push({
        id: `w_${i}`,
        type: "white",
        x: i * whiteW,
        y: keyboardTop,
        w: whiteW,
        h: keyboardHeight,
        freq: noteFreq(oct, WHITE_STEPS[i]),
        name: WHITE_NAMES[i],
        active: false,
        triggerY: keyboardTop + 10,
      });
    }

    const blackW = whiteW * 0.58;
    const blackH = keyboardHeight * 0.6;
    BLACK_KEYS.forEach((bk, idx) => {
      if (bk.after >= whiteCount) return;
      const centerX = (bk.after + 1) * whiteW;
      rects.push({
        id: `b_${idx}`,
        type: "black",
        x: centerX - blackW / 2,
        y: keyboardTop,
        w: blackW,
        h: blackH,
        freq: noteFreq(oct, bk.offset),
        name: bk.name,
        active: false,
        triggerY: keyboardTop + 10,
      });
    });

    setKeyRects(rects);
  }, []);

  useEffect(() => {
    octaveRef.current = octave;
    layoutKeys();
  }, [octave, layoutKeys]);

  useEffect(() => {
    waveformRef.current = waveform;
  }, [waveform]);

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const playNote = useCallback((freq, voiceId) => {
    ensureAudio();
    const ctx = audioCtxRef.current;
    if (voicesRef.current[voiceId]) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveformRef.current;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    voicesRef.current[voiceId] = { osc, gain };
  }, [ensureAudio]);

  const stopNote = useCallback((voiceId) => {
    const ctx = audioCtxRef.current;
    const voice = voicesRef.current[voiceId];
    if (!ctx || !voice) return;

    const { osc, gain } = voice;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.stop(now + 0.12);

    delete voicesRef.current[voiceId];
  }, []);

  const handleResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const activeFingers = activeFingerMapRef.current;
    const currentFrameFingers = new Set();
    let rectsChanged = false;

    setKeyRects((prevRects) => {
      const nextRects = prevRects.map((r) => ({ ...r }));

      const findKeyAt = (x, y) => {
        for (const k of nextRects) {
          if (k.type === "black" && x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) return k;
        }
        for (const k of nextRects) {
          if (k.type === "white" && x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) return k;
        }
        return null;
      };

      if (results.multiHandLandmarks && results.multiHandLandmarks.length) {
        results.multiHandLandmarks.forEach((landmarks, handIdx) => {
          FINGERTIP_IDS.forEach((tipId) => {
            const fingerId = `h${handIdx}_f${tipId}`;
            currentFrameFingers.add(fingerId);

            const lm = landmarks[tipId];
            const x = lm.x * canvas.width;
            const y = lm.y * canvas.height;

            const keyUnder = findKeyAt(x, y);
            const isPressed = keyUnder && y >= keyUnder.triggerY;
            const activeVoiceId = `${fingerId}_${keyUnder ? keyUnder.id : ""}`;
            const previousState = activeFingers[fingerId];

            if (isPressed) {
              if (!previousState || previousState.keyId !== keyUnder.id) {
                if (previousState) {
                  stopNote(previousState.voiceId);
                  const pk = nextRects.find((k) => k.id === previousState.keyId);
                  if (pk) pk.active = false;
                }
                keyUnder.active = true;
                playNote(keyUnder.freq, activeVoiceId);
                activeFingers[fingerId] = { keyId: keyUnder.id, voiceId: activeVoiceId };
                rectsChanged = true;
              }
            } else if (previousState) {
              stopNote(previousState.voiceId);
              const pk = nextRects.find((k) => k.id === previousState.keyId);
              if (pk) pk.active = false;
              delete activeFingers[fingerId];
              rectsChanged = true;
            }
          });
        });
      }

      Object.keys(activeFingers).forEach((fingerId) => {
        if (!currentFrameFingers.has(fingerId)) {
          const state = activeFingers[fingerId];
          stopNote(state.voiceId);
          const pk = nextRects.find((k) => k.id === state.keyId);
          if (pk) pk.active = false;
          delete activeFingers[fingerId];
          rectsChanged = true;
        }
      });

      return rectsChanged ? nextRects : prevRects;
    });

    if (phase === "loading") setPhase("running");
  }, [playNote, stopNote, phase]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    layoutKeys();
  }, [layoutKeys]);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div style={styles.app}>
      {phase !== "running" && phase !== "loading" && (
        <div style={styles.startScreen}>
          <h2 style={styles.h2}>🎹 Modular Air Piano</h2>
          <p style={styles.p}>Press start to load the optical feed & overlay keyboard component.</p>
          <button style={styles.primaryBtn} onClick={() => setPhase("loading")}>Start Camera</button>
          {phase === "error" && <div style={styles.errText}>{errorMsg}</div>}
        </div>
      )}

      {phase === "loading" && (
        <div style={styles.startScreen}>
          <h2 style={styles.h2}>🎹 Modular Air Piano</h2>
          <div style={styles.loadingText}>Initializing camera & optical models…</div>
        </div>
      )}

      <div style={{ ...styles.stage, display: phase === "running" || phase === "loading" ? "block" : "none" }}>
        <CameraFeed
          videoRef={videoRef}
          onResults={handleResults}
          onError={(msg) => { setErrorMsg(msg); setPhase("error"); }}
          phase={phase}
        />
        <PianoOverlay canvasRef={canvasRef} keyRects={keyRects} />

        <div style={styles.topbar}>
          <h1 style={styles.title}>Air <span style={{ color: "#ec4899" }}>Piano</span></h1>
          <div style={styles.status}>Multi-Touch Tracking Active</div>
        </div>

        <div style={styles.controls}>
          <select style={styles.select} value={octave} onChange={(e) => setOctave(parseInt(e.target.value, 10))}>
            <option value={3}>Octave 3</option>
            <option value={4}>Octave 4</option>
            <option value={5}>Octave 5</option>
          </select>
          <select style={styles.select} value={waveform} onChange={(e) => setWaveform(e.target.value)}>
            <option value="triangle">Soft Piano</option>
            <option value="sine">Mellow Synth</option>
            <option value="sawtooth">Bright Organ</option>
          </select>
          <button style={styles.select} onClick={() => setPhase("idle")}>Stop Camera</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { position: "relative", width: "100%", height: "100vh", background: "#09090b", color: "#f4f4f5", overflow: "hidden" },
  startScreen: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#09090b", textAlign: "center", padding: 24 },
  h2: { fontSize: 24, margin: "0 0 8px" },
  p: { color: "#a1a1aa", fontSize: 14, maxWidth: 340, lineHeight: 1.5, margin: "0 0 24px" },
  primaryBtn: { background: "#8b5cf6", color: "#ffffff", fontWeight: 600, border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 14, cursor: "pointer" },
  loadingText: { color: "#a1a1aa", fontSize: 13, marginTop: 12 },
  errText: { color: "#f87171", fontSize: 12, marginTop: 14, maxWidth: 320 },
  stage: { position: "absolute", inset: 0 },
  topbar: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)", zIndex: 5 },
  title: { fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: 0.5 },
  status: { fontSize: 12, color: "#34d399", background: "rgba(24, 24, 27, 0.8)", padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)" },
  controls: { position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 16, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", zIndex: 5 },
  select: { background: "#18181b", color: "#f4f4f5", border: "1px solid rgba(255,255,255,0.15)", padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" },
};

