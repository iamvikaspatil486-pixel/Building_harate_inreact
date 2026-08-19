import React, { useState, useRef } from "react";
import { Reply } from "lucide-react";
import { timeAgo } from "./time";

const SWIPE_THRESHOLD = 60;

export default function SwipeableMessage({ msg, isMe, children, onReply, msgRef, highlighted }) {
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [showTime, setShowTime] = useState(false);
  
  const startX = useRef(null);
  const startY = useRef(null);
  const isLocked = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isLocked.current = false;
    setTriggered(false);
  };

  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!isLocked.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        startX.current = null;
        return;
      }
      isLocked.current = true;
    }

    const direction = isMe ? -1 : 1;
    const raw = dx * direction;
    const leftMove = dx * -1;
    
    setShowTime(leftMove > 20);
    if (raw < 0) return;

    e.preventDefault();
    setSwiping(true);

    const clamped = raw < SWIPE_THRESHOLD
      ? raw
      : SWIPE_THRESHOLD + (raw - SWIPE_THRESHOLD) * 0.2;

    setDragX(clamped * direction);

    if (raw >= SWIPE_THRESHOLD && !triggered) {
      setTriggered(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }
  };

  const handleTouchEnd = () => {
    if (triggered) onReply(msg);
    setSwiping(false);
    setTriggered(false);
    setDragX(0);
    setShowTime(false);
    startX.current = null;
    isLocked.current = false;
  };

  const replyIconOpacity = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const replyIconScale = 0.6 + replyIconOpacity * 0.4;

  return (
    <div
      ref={msgRef}
      className="relative rounded-2xl transition-colors duration-500"
      style={{ backgroundColor: highlighted ? "rgba(56, 189, 248, 0.15)" : "transparent" }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-y-0 flex items-center"
          style={{
            [isMe ? "left" : "right"]: 0,
            opacity: replyIconOpacity,
            transform: `scale(${replyIconScale})`,
            transition: swiping ? "none" : "opacity 0.2s, transform 0.2s",
            padding: "0 12px",
          }}
        >
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
            <Reply size={14} className="text-sky-400" style={{ transform: isMe ? "scaleX(-1)" : "none" }} />
          </div>
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: swiping ? "none" : "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {children}
      </div>

      {showTime && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 font-medium pointer-events-none">
          {timeAgo(msg.created_at)}
        </div>
      )}
    </div>
  );
}

