import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  PlusSquare,
  MessageCircle,
  FileSearch,
  UserCircle,
  MapPin,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const tabs = [
  { icon: MapPin, path: "/kuchikus" },
  { icon: Home, path: "/home" },
  { icon: PlusSquare, path: "/add-post" },
  { icon: FileSearch, path: "/huduku" },
  { icon: MessageCircle, path: "/chat" },
  { icon: UserCircle, path: "/profile" },
];

export default function Navigation() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const itemRefs = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();

  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const batchId = batch?.batchId;
  const username = JSON.parse(localStorage.getItem('chat_anon_session') || 'null')?.username;

  const activeIndex = tabs.findIndex((t) => t.path === location.pathname);

  useEffect(() => {
    if (!batchId || !username) return;

    const fetchUnread = async () => {
      const lastSeen = localStorage.getItem('chat_last_seen') || new Date(0).toISOString();
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .neq('username', username)
        .gt('created_at', lastSeen);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const ch = supabase.channel(`nav-unread-${batchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `batch_id=eq.${batchId}`,
      }, (payload) => {
        if (payload.new.username !== username) {
          setUnreadCount((prev) => prev + 1);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [batchId, username]);

  useEffect(() => {
    if (location.pathname === '/chat') {
      localStorage.setItem('chat_last_seen', new Date().toISOString());
      setUnreadCount(0);
    }
  }, [location.pathname]);

  // Position the sliding indicator under whichever tab is active,
  // and re-measure on resize so it stays aligned.
  useEffect(() => {
    const measure = () => {
      const node = itemRefs.current[activeIndex];
      if (!node) {
        setIndicator((prev) => ({ ...prev, width: 0 }));
        return;
      }
      setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex, location.pathname]);

  if (location.pathname === "/" || location.pathname === "/login") return null;

  const go = (path) => {
    navigate(path);
  };

  return (
    <div
      className="fixed z-50 left-1/2"
      style={{
        bottom: "20px",
        transform: "translateX(-50%)",
        width: "min(92vw, 420px)",
      }}
    >
      <div
        className="relative flex items-center border shadow-2xl"
        style={{
          height: "60px",
          borderRadius: "28px",
          padding: "0 8px",
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.82), rgba(59, 130, 246, 0.22), rgba(168, 85, 247, 0.18))",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "rgba(255,255,255,0.12)",
          boxShadow:
            "0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        {/* Sliding active-tab indicator */}
        <div
          className="absolute top-1/2 pointer-events-none"
          style={{
            left: indicator.left,
            width: indicator.width,
            height: "44px",
            transform: "translateY(-50%)",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.20)",
            boxShadow: "0 4px 16px rgba(56,189,248,0.25)",
            opacity: indicator.width ? 1 : 0,
            transition:
              "left 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease",
          }}
        />

        {tabs.map(({ icon: Icon, path }, i) => {
          const isActive = i === activeIndex;
          const isChat = path === '/chat';
          return (
            <button
              key={path}
              ref={(el) => (itemRefs.current[i] = el)}
              onClick={() => go(path)}
              className="relative flex items-center justify-center flex-1 h-full active:scale-90 transition-transform duration-150"
            >
              <div className="relative w-11 h-11 flex items-center justify-center">
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 1.9}
                  className={isActive ? "text-white" : "text-white/70"}
                  fill={isActive ? "currentColor" : "none"}
                  style={{ transition: "color 0.25s ease, stroke-width 0.25s ease" }}
                />
                {isChat && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-rose-500 rounded-full flex items-center justify-center px-1">
                    <span className="text-[9px] font-black text-white leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        body.comments-open .nav-container-wrapper {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
    </div>
  );
}

