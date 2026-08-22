import React, { useState, useRef, useEffect } from "react";
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
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const type = message?.type || "text";
  const canModify = fromMe && !isOriginal && type === "text"; // only own replies

  // Close the menu on an outside tap/click. Using a document-level
  // listener (instead of a full-screen overlay <div>) avoids the
  // z-index / touch-event race that was previously eating taps on
  // the Edit/Delete buttons on mobile.
  useEffect(() => {
    if (!menuOpen) return;

    const handleOutside = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handleOutside, true);
    return () => document.removeEventListener("pointerdown", handleOutside, true);
  }, [menuOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (!canModify) return;
    setMenuOpen((open) => !open);
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

  const handleEditClick = (e) => {
    e.stopPropagation();
    setEditText(message.message || "");
    setEditing(true);
    setMenuOpen(false);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    // Opens a confirmation modal in the parent — does not delete
    // immediately.
    onDelete?.(message.id);
  };

  return (
    <div className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative max-w-[78%] animate-slide-in ${
          fromMe ? "origin-right" : "origin-left"
        }`}
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
          <div className="flex items-end gap-1">
            {/* Kebab trigger sits to the LEFT of your own bubbles so it
                doesn't overlap the bubble's rounded corner */}

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

          </div>
        )}

        {/* Dropdown menu */}
        {menuOpen && canModify && (
          <div
            ref={menuRef}
            className={`absolute z-20 bottom-full mb-1 ${
              fromMe ? "right-0" : "left-0"
            } bg-white shadow-xl rounded-xl border border-gray-100 py-1 w-32`}
          >
            <button
              onClick={handleEditClick}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-50 active:bg-gray-100"
            >
              <Pencil size={14} className="text-blue-500" /> Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-50 active:bg-rose-100"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
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
    </div>
  );
}

