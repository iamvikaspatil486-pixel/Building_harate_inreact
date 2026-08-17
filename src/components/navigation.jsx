import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  PlusSquare,
  MessageCircle,
  Menu,
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
  const [expanded, setExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const batchId = batch?.batchId;
  const username = JSON.parse(localStorage.getItem('chat_anon_session') || 'null')?.username;

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

  if (location.pathname === "/" || location.pathname === "/login") return null;

  const go = (path) => {
    setExpanded(false);
    navigate(path);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: expanded ? "rgba(2, 6, 23, 0.45)" : "transparent",
          opacity: expanded ? 1 : 0,
          pointerEvents: expanded ? "auto" : "none",
          backdropFilter: expanded ? "blur(10px)" : "blur(0px)",
          WebkitBackdropFilter: expanded ? "blur(10px)" : "blur(0px)",
        }}
        onClick={() => setExpanded(false)}
      />

      <div
        className="fixed z-50 flex justify-end"
        style={{
          bottom: "24px",
          right: "16px",
          left: expanded ? "16px" : "auto",
          transition: "left 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        <div
          className="overflow-hidden border shadow-2xl"
          style={{
            height: "60px",
            width: expanded ? "100%" : "60px",
            borderRadius: expanded ? "28px" : "9999px",
            padding: expanded ? "0 10px" : "0",
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.82), rgba(59, 130, 246, 0.22), rgba(168, 85, 247, 0.18))",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderColor: "rgba(255,255,255,0.12)",
            boxShadow:
              "0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
            transition:
              "width 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.3s ease, padding 0.4s ease",
          }}
        >
          {expanded ? (
            <div className="flex w-full h-full items-center justify-around animate-fade-in">
              {tabs.map(({ icon: Icon, path }) => {
                const isActive = location.pathname === path;
                const isChat = path === '/chat';
                return (
                  <button
                    key={path}
                    onClick={() => go(path)}
                    className="flex items-center justify-center flex-1 h-full active:scale-90 transition-transform duration-150"
                  >
                    <div
                      className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-white/20 shadow-lg shadow-cyan-500/20"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <Icon
                        size={21}
                        strokeWidth={isActive ? 2.5 : 1.9}
                        className={isActive ? "text-white" : "text-white/70"}
                        fill={isActive ? "currentColor" : "none"}
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
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="relative flex items-center justify-center w-full h-full text-white active:scale-90 transition-transform duration-150"
              aria-label="Open navigation menu"
            >
              {(() => {
                const CurrentIcon = tabs.find((t) => t.path === location.pathname)?.icon || Menu;
                return <CurrentIcon size={22} strokeWidth={2.2} />;
              })()}
              {location.pathname !== '/chat' && unreadCount > 0 && (
                <div className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-rose-500 rounded-full flex items-center justify-center px-1">
                  <span className="text-[9px] font-black text-white leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeInEffect 0.25s ease-out forwards;
          animation-delay: 0.08s;
          opacity: 0;
        }
        @keyframes fadeInEffect {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        body.comments-open .nav-container-wrapper {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>
    </>
  );
}

