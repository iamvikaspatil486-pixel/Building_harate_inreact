import { useEffect, useRef, useState, useCallback } from "react";

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

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.body.appendChild(s);
  });
}

export default function MiniOmegle() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const voicesRef = useRef({});
  const keyRectsRef = useRef([]);
  const activeFingerMapRef = useRef({});
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState("idle"); // idle | loading | running | error
  const [errorMsg, setErrorMsg] = useState("");
  const [octave, setOctave] = useState(4);
  const [waveform, setWaveform] = useState("triangle");
  const octaveRef = useRef(octave);
  const waveformRef = useRef(waveform);

  useEffect(() => { octaveRef.current = octave; layoutKeys(); }, [octave]);
  useEffect(() => { waveformRef.current = waveform; }, [waveform]);

  const layoutKeys = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const keyboardTop = H * 0.55;
    const keyboardHeight = H * 0.4;
    const whiteCount = WHITE_STEPS.length;
    const whiteW = W / whiteCount;
    const oct = octaveRef.current;

    const rects = [];
    for (let i = 0; i < whiteCount; i++) {
      rects.push({
        type: "white",
        x: i * whiteW,
        y: keyboardTop,
        w: whiteW,
        h: keyboardHeight,
        freq: noteFreq(oct, WHITE_STEPS[i]),
        name: WHITE_NAMES[i],
        active: false,
        fingers: new Set(),
        triggerY: keyboardTop + keyboardHeight * 0.12,
      });
    }
    const blackW = whiteW * 0.6;
    const blackH = keyboardHeight * 0.62;
    BLACK_KEYS.forEach((bk) => {
      if (bk.after >= whiteCount) return;
      const centerX = (bk.after + 1) * whiteW;
      rects.push({
        type: "black",
        x: centerX - blackW / 2,
        y: keyboardTop,
        w: blackW,
        h: blackH,
        freq: noteFreq(oct, bk.offset),
        name: bk.name,
        active: false,
        fingers: new Set(),
        triggerY: keyboardTop + blackH * 0.18,
      });
    });
    keyRectsRef.current = rects;
  }, []);

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  }, []);

  const playNote = useCallback((freq) => {
    ensureAudio();
    const ctx = audioCtxRef.current;
    const key = freq.toFixed(2);
    if (voicesRef.current[key]) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveformRef.current;
    osc.frequency.value = freq;
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    osc.start();
    voicesRef.current[key] = { osc, gain };
  }, [ensureAudio]);

  const stopNote = useCallback((freq) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const key = freq.toFixed(2);
    const v = voicesRef.current[key];
    if (!v) return;
    const now = ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + 0.18);
    v.osc.stop(now + 0.2);
    delete voicesRef.current[key];
  }, []);

  const findKeyAt = (x, y) => {
    const rects = keyRectsRef.current;
    for (const k of rects) {
      if (k.type !== "black") continue;
      if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) return k;
    }
    for (const k of rects) {
      if (k.type !== "white") continue;
      if (x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) return k;
    }
    return null;
  };

  const drawKeys = (ctx) => {
    keyRectsRef.current.filter((k) => k.type === "white").forEach((k) => {
      ctx.fillStyle = k.active ? "#b9a9ff" : "#f4f2f8";
      ctx.fillRect(k.x, k.y, k.w - 2, k.h);
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(k.x, k.y, k.w - 2, k.h);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.fillStyle = "#33314a";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(k.name, -(k.x + k.w / 2), k.y + k.h - 12);
      ctx.restore();
    });
    keyRectsRef.current.filter((k) => k.type === "black").forEach((k) => {
      ctx.fillStyle = k.active ? "#6d4dff" : "#1a1b22";
      ctx.fillRect(k.x, k.y, k.w, k.h);
    });
  };

  const drawFingertip = (ctx, x, y, active) => {
    ctx.beginPath();
    ctx.arc(x, y, active ? 14 : 9, 0, Math.PI * 2);
    ctx.fillStyle = active ? "rgba(124,92,255,0.9)" : "rgba(34,211,238,0.85)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.stroke();
  };

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawKeys(ctx);

    const seen = new Set();
    const fingerMap = activeFingerMapRef.current;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length) {
      results.multiHandLandmarks.forEach((landmarks, handIdx) => {
        FINGERTIP_IDS.forEach((tipId) => {
          const fKey = `${handIdx}_${tipId}`;
          seen.add(fKey);
          const lm = landmarks[tipId];
          const x = lm.x * canvas.width;
          const y = lm.y * canvas.height;

          const keyUnder = findKeyAt(x, y);
          const isPressing = keyUnder && y >= keyUnder.triggerY;
          const prevKey = fingerMap[fKey];

          if (isPressing) {
            if (prevKey !== keyUnder) {
              if (prevKey) {
                prevKey.fingers.delete(fKey);
                if (prevKey.fingers.size === 0) {
                  prevKey.active = false;
                  stopNote(prevKey.freq);
                }
              }
              keyUnder.fingers.add(fKey);
              keyUnder.active = true;
              playNote(keyUnder.freq);
              fingerMap[fKey] = keyUnder;
            }
          } else if (prevKey) {
            prevKey.fingers.delete(fKey);
            if (prevKey.fingers.size === 0) {
              prevKey.active = false;
              stopNote(prevKey.freq);
            }
            delete fingerMap[fKey];
          }

          drawFingertip(ctx, x, y, !!isPressing);
        });
      });
    }

    Object.keys(fingerMap).forEach((fKey) => {
      if (!seen.has(fKey)) {
        const k = fingerMap[fKey];
        k.fingers.delete(fKey);
        if (k.fingers.size === 0) {
          k.active = false;
          stopNote(k.freq);
        }
        delete fingerMap[fKey];
      }
    });

    ctx.restore();
  }, [playNote, stopNote]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    layoutKeys();
  }, [layoutKeys]);

  const start = useCallback(async () => {
    setPhase("loading");
    setErrorMsg("");
    ensureAudio();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (err) {
      setErrorMsg("Camera access failed: " + err.message + ". Check permissions and try again.");
      setPhase("error");
      return;
    }

    try {
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
      );
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
      );
    } catch (err) {
      setErrorMsg("Failed to load hand-tracking library: " + err.message);
      setPhase("error");
      return;
    }

    resizeCanvas();

    const HandsCtor = window.Hands;
    const CameraCtor = window.Camera;
    if (!HandsCtor || !CameraCtor) {
      setErrorMsg("Hand-tracking library did not initialize correctly.");
      setPhase("error");
      return;
    }

    const hands = new HandsCtor({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    hands.onResults(onResults);
    handsRef.current = hands;

    const camera = new CameraCtor(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current });
      },
      width: 1280,
      height: 720,
    });
    camera.start();
    cameraRef.current = camera;

    setPhase("running");
  }, [ensureAudio, onResults, resizeCanvas]);

  const stop = useCallback(() => {
    if (cameraRef.current) {
      try { cameraRef.current.stop(); } catch (e) {}
    }
    if (handsRef.current) {
      try { handsRef.current.close(); } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    Object.values(voicesRef.current).forEach((v) => {
      try { v.osc.stop(); } catch (e) {}
    });
    voicesRef.current = {};
    activeFingerMapRef.current = {};
    setPhase("idle");
  }, []);

  useEffect(() => {
    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.app}>
      {phase !== "running" && phase !== "loading" && (
        <div style={styles.startScreen}>
          <h2 style={styles.h2}>🎹 Air Piano</h2>
          <p style={styles.p}>
            Play piano in the air. Hold your hand up to the camera and dip a
            fingertip down into a key to play it, like pressing a key floating
            in space.
          </p>
          <button style={styles.primaryBtn} onClick={start}>
            Start Camera
          </button>
          {phase === "error" && <div style={styles.errText}>{errorMsg}</div>}
        </div>
      )}

      {phase === "loading" && (
        <div style={styles.startScreen}>
          <h2 style={styles.h2}>🎹 Air Piano</h2>
          <div style={styles.loadingText}>Loading camera and hand tracking…</div>
        </div>
      )}

      <div style={{ ...styles.stage, display: phase === "running" ? "block" : "none" }}>
        <video ref={videoRef} playsInline autoPlay muted style={styles.video} />
        <canvas ref={canvasRef} style={styles.canvas} />

        <div style={styles.topbar}>
          <h1 style={styles.title}>
            Air <span style={{ color: "#22d3ee" }}>Piano</span>
          </h1>
          <div style={styles.status}>tracking active</div>
        </div>

        <div style={styles.controls}>
          <select
            style={styles.select}
            value={octave}
            onChange={(e) => setOctave(parseInt(e.target.value, 10))}
          >
            <option value={3}>Octave 3</option>
            <option value={4}>Octave 4</option>
            <option value={5}>Octave 5</option>
          </select>
          <select
            style={styles.select}
            value={waveform}
            onChange={(e) => setWaveform(e.target.value)}
          >
            <option value="triangle">Soft Piano</option>
            <option value="sine">Mellow Sine</option>
            <option value="sawtooth">Bright Synth</option>
          </select>
          <button style={styles.select} onClick={stop}>
            Stop Camera
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    position: "relative",
    width: "100%",
    height: "100vh",
    minHeight: 480,
    background: "#0b0c10",
    color: "#e9e9ef",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: "hidden",
  },
  startScreen: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at 50% 30%, #1b1d2a, #0b0c10)",
    textAlign: "center",
    padding: 24,
  },
  h2: { fontSize: 22, margin: "0 0 6px" },
  p: {
    color: "#8a8d9a",
    fontSize: 14,
    maxWidth: 320,
    lineHeight: 1.5,
    margin: "0 0 22px",
  },
  primaryBtn: {
    background: "#7c5cff",
    borderColor: "#7c5cff",
    color: "white",
    fontWeight: 600,
    border: "1px solid #7c5cff",
    padding: "9px 14px",
    borderRadius: 10,
    fontSize: 13,
    cursor: "pointer",
  },
  loadingText: { color: "#8a8d9a", fontSize: 13, marginTop: 12 },
  errText: { color: "#ff6b6b", fontSize: 12, marginTop: 14, maxWidth: 320 },
  stage: { position: "absolute", inset: 0 },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
    filter: "brightness(0.85) saturate(1.05)",
  },
  canvas: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    transform: "scaleX(-1)",
  },
  topbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)",
    zIndex: 5,
  },
  title: { fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: 0.3 },
  status: {
    fontSize: 12,
    color: "#6ee7a0",
    background: "rgba(20,22,29,0.7)",
    padding: "5px 10px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
    zIndex: 5,
    flexWrap: "wrap",
  },
  select: {
    background: "#14161d",
    color: "#e9e9ef",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "9px 14px",
    borderRadius: 10,
    fontSize: 13,
    cursor: "pointer",
  },
};

