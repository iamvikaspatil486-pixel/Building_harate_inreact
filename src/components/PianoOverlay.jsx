import React, { useEffect } from "react";

export default function PianoOverlay({ canvasRef, keyRects }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !keyRects.length) return;
    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw White Keys
    keyRects.filter((k) => k.type === "white").forEach((k) => {
      ctx.save();
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

      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inverted label render to offset camera mirroring scaleX(-1)
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
    keyRects.filter((k) => k.type === "black").forEach((k) => {
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

      ctx.strokeStyle = k.active ? "#c084fc" : "#4b5563";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    });

    ctx.restore();
  }, [canvasRef, keyRects]);

  return <canvas ref={canvasRef} style={overlayStyle} />;
}

const overlayStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  transform: "scaleX(-1)",
};

