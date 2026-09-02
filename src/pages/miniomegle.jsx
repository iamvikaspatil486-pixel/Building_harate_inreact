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
    s.onerror = () => reject(new Error("Failed to load script"));
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

  const [phase, setPhase] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [octave, setOctave] = useState(4);
  const [waveform, setWaveform] = useState("triangle");
  
  const octaveRef = useRef(octave);
  const waveformRef = useRef(waveform);

  useEffect(() => {
    octaveRef.current = octave;
    layoutKeys();
  }, [octave]);

  useEffect(() => {
    waveformRef.current = waveform;
  }, [waveform]);

  const layoutKeys = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const keyboardTop = H * 0.55;
    const keyboardHeight = H * 0.4;
    const whiteCount = WHITE_STEPS.length;
    const whiteW = W / whiteCount;
    const oct = octaveRef.current;

    const rects = [];
    
    // Layout White Keys
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
        fingers: new Set(),
        triggerY: keyboardTop + 10,
      });
    }

    // Layout Black Keys
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
        fingers: new Set(),
        triggerY: keyboardTop + 10,
      });
    });

    keyRectsRef.current = rects;
  }, []);

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

  const findKeyAt = (x, y) => {
    const rects = keyRectsRef.current;
    // Check black keys first (top priority layer)
    for (const k of rects) {
      if (k.type === "black" && x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) {
        return k;
      }
    }
    // Check white keys next
    for (const k of rects) {
      if (k.type === "white" && x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h) {
        return k;
      }
    }
    return null;
  };

  const drawKeyboard = (ctx) => {
    const rects = keyRectsRef.current;

    // 1. Draw White Keys
    rects.filter((k) => k.type === "white").forEach((k) => {
      ctx.save();
      
      // Key body
      const gradient = ctx.createLinearGradient(0, k.y, 0, k.y + k.h);
      if (k.active) {
        gradient.addColorStop(0, "#8b5cf6");
        gradient.addColorStop(1, "#6d28d9");
      } else {
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(0.85, "#ededed");
        gradient.addColorStop(1, "#d1d5db");
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(k.x + 2, k.y, k.w - 4, k.h, [0, 0, 8, 8]);
      ctx.fill();

      // Border line
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label (inversed canvas compensation for standard read orientation)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.fillStyle = k.active ? "#ffffff" : "#374151";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(k.name, -(k.x + k.w / 2), k.y + k.h - 16);
      ctx.restore();

      ctx.restore();
    });

    // 2. Draw Black Keys
    rects.filter((k) => k.type === "black").forEach((k) => {
      ctx.save();

      const gradient = ctx.createLinearGradient(0, k.y, 0, k.y + k.h);
      if (k.active) {
        gradient.addColorStop(0, "#a855f7");
        gradient.addColorStop(1, "#7e22ce");
      } else {
        gradient.addColorStop(0, "#374151");
        gradient.addColorStop(0.8, "#1f2937");
        gradient.addColorStop(1, "#111827");
      }

      ctx.fillStyle = gradient;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;

      ctx.beginPath();
      ctx.roundRect(k.x, k.y, k.w, k.h, [0, 0, 4, 4]);
      ctx.fill();

      // Key edge highlights
      ctx.strokeStyle = k.active ? "#c084fc" : "#4b5563";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    });
  };

  const drawFingertip = (ctx, x, y, active) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, active ? 12 : 8, 0, Math.PI * 2);
    ctx.fillStyle = active ? "rgba(236, 72, 153, 0.9)" : "rgba(6, 182, 212, 0.8)";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();
  };

  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render interactive air piano graphics
    drawKeyboard(ctx);

    const activeFingers = activeFingerMapRef.current;
    const currentFrameFingers = new Set();

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
              // Release previous key if finger moved off it
              if (previousState) {
                stopNote(previousState.voiceId);
                const prevKey = keyRectsRef.current.find(k => k.id === previousState.keyId);
                if (prevKey) prevKey.active = false;
              }
              // Play new note
              keyUnder.active = true;
              playNote(keyUnder.freq, activeVoiceId);
              activeFingers[fingerId] = { keyId: keyUnder.id, voiceId: activeVoiceId };
            }
          } else {
            // Finger raised up or outside valid key region
            if (previousState) {
              stopNote(previousState.voiceId);
              const prevKey = keyRectsRef.current.find(k => k.id === previousState.keyId);
              if (prevKey) prevKey.active = false;
              delete activeFingers[fingerId];
            }
          }

          drawFingertip(ctx, x, y, !!isPressed);
        });
      });
    }

    // Clean up untracked fingers that left screen scope
    Object.keys(activeFingers).forEach((fingerId) => {
      if (!currentFrameFingers.has(fingerId)) {
        const state = activeFingers[fingerId];
        stopNote(state.voiceId);
        const key = keyRectsRef.current.find(k => k.id === state.keyId);
        if (key) key.active = false;
        delete activeFingers[fingerId];
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
      setErrorMsg("Camera access failed: " + err.message);
      setPhase("error");
      return;
    }

    try {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
    } catch (err) {
      setErrorMsg("Failed loading hand tracking dependencies: " + err.message);
      setPhase("error");
      return;
    }

    resizeCanvas();

    const HandsCtor = window.Hands;
    const CameraCtor = window.Camera;
    if (!HandsCtor || !CameraCtor) {
      setErrorMsg("Hand tracking library failed initialization.");
      setPhase("error");
      return;
    }

    const hands = new HandsCtor({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
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
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
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
    Object.keys(voicesRef.current).forEach((vId) => stopNote(vId));
    voicesRef.current = {};
    activeFingerMapRef.current = {};
    setPhase("idle");
  }, [stopNote]);

  useEffect(() => {
    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      stop();
    };
  }, [resizeCanvas, stop]);

  return (
    <div style={styles.app}>
      {phase !== "running" && phase !== "loading" && (
        <div style={styles.startScreen}>
          <h2 style={styles.h2}>🎹 Visual Air Piano</h2>
          <p style={styles.p}>
            Dip your fingertips into the air keys displayed on screen to trigger realistic multi-note audio.
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
          <div style={styles.loadingText}>Initializing camera & optical models…</div>
        </div>
      )}

      <div style={{ ...styles.stage, display: phase === "running" ? "block" : "none" }}>
        <video ref={videoRef} playsInline autoPlay muted style={styles.video} />
        <canvas ref={canvasRef} style={styles.canvas} />

        <div style={styles.topbar}>
          <h1 style={styles.title}>
            Air <span style={{ color: "#ec4899" }}>Piano</span>
          </h1>
          <div style={styles.status}>Multi-Touch Polyphonic Active</div>
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
            <option value="triangle">Soft Piano (Triangle)</option>
            <option value="sine">Mellow Synth (Sine)</option>
            <option value="sawtooth">Bright Organ (Sawtooth)</option>
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
    background: "#09090b",
    color: "#f4f4f5",
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
    background: "radial-gradient(circle at 50% 30%, #18181b, #09090b)",
    textAlign: "center",
    padding: 24,
  },
  h2: { fontSize: 24, margin: "0 0 8px" },
  p: {
    color: "#a1a1aa",
    fontSize: 14,
    maxWidth: 340,
    lineHeight: 1.5,
    margin: "0 0 24px",
  },
  primaryBtn: {
    background: "#8b5cf6",
    color: "#ffffff",
    fontWeight: 600,
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    fontSize: 14,
    cursor: "pointer",
  },
  loadingText: { color: "#a1a1aa", fontSize: 13, marginTop: 12 },
  errText: { color: "#f87171", fontSize: 12, marginTop: 14, maxWidth: 320 },
  stage: { position: "absolute", inset: 0 },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
    filter: "brightness(0.75)",
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
    padding: "14px 20px",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
    zIndex: 5,
  },
  title: { fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: 0.5 },
  status: {
    fontSize: 12,
    color: "#34d399",
    background: "rgba(24, 24, 27, 0.8)",
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
    zIndex: 5,
  },
  select: {
    background: "#18181b",
    color: "#f4f4f5",
    border: "1px solid rgba(255,255,255,0.15)",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
  },
};

