import React, { useState, useRef } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";

const timeAgo = (ts) => {
  if (!ts) return "just now";
  const utcDate = new Date(ts);
  const localDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000);
  const now = new Date();
  const diffSeconds = Math.floor((now - localDate) / 1000);

  if (diffSeconds < 0 || diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
};

export default function CmBubble({
  message,
  fromMe,
  showName = false,
  nameLabel = "",
  isOriginal = false,
  onEdit,   // (id, newText) => {}
  onDelete, // (id) => {}
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.message || "");
  const holdTimer = useRef(null);

  const type = message?.type || "text";
  const canModify = fromMe && !isOriginal && type === "text"; // only own replies

  const startHold = () => {
    if (!canModify) return;
    holdTimer.current = setTimeout(() => setMenuOpen(true), 450);
  };

  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const saveEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === message.message) {
      setEditing(false);
      return;
    }
    onEdit?.(message.id, trimmed);
    setEditing(false);
    setMenuOpen(false);
  };

  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[78%] animate-slide-in ${
          fromMe ? "origin-right" : "origin-left"
        }`}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onTouchMove={endHold}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onContextMenu={(e) => {
          if (canModify) {
            e.preventDefault();
            setMenuOpen(true);
          }
        }}
      >
        {showName && !fromMe && (
          <p className="text-[10px] text-gray-400 mb-1 px-1">{nameLabel}</p>
        )}

        {/* EDIT MODE */}
        {editing ? (
          <div className="flex items-center gap-2 bg-white border border-pink-300 rounded-3xl px-3 py-2 shadow-sm min-w-[180px]">
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 outline-none"
            />
            <button onClick={saveEdit} className="text-emerald-500 p-1">
              <Check size={16} />
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-400 p-1">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* TEXT BUBBLE */}
            {type === "text" && (
              <div
                className={`px-4 py-3 rounded-3xl text-sm leading-relaxed ${
                  fromMe
                    ? isOriginal
                      ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-tr-md shadow-sm"
                      : "bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-tr-md shadow-lg shadow-pink-200/50"
                    : "bg-white border border-gray-100 text-gray-900 rounded-tl-md shadow-sm"
                }`}
              >
                {message.message}
              </div>
            )}

            {/* Hold menu */}
            {menuOpen && canModify && (
              <div
                className={`absolute z-20 top-0 ${
                  fromMe ? "right-0" : "left-0"
                } bg-white shadow-xl rounded-xl border border-gray-100 py-1 w-32`}
              >
                <button
                  onClick={() => {
                    setEditText(message.message || "");
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50"
                >
                  <Pencil size={14} className="text-blue-500" /> Edit
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete?.(message.id);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </>
        )}

        {/* time + edited label */}
        <p
          className={`text-[10px] text-gray-400 mt-1.5 px-1 ${
            fromMe ? "text-right" : "text-left"
          }`}
        >
          {timeAgo(message.created_at)}
          {message.edited && (
            <span className="ml-1 opacity-70">· edited</span>
          )}
        </p>
      </div>

      {/* tap outside closes menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
