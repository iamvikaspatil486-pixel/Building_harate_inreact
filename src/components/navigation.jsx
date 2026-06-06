import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, PlusSquare, MessageCircle, Menu } from "lucide-react";

const tabs = [
  { icon: Home,          label: "Home",  path: "/home"   },
  { icon: PlusSquare,    label: "Post",  path: "/add-post" },
  { icon: MessageCircle, label: "Chat",  path: "/chat"   },
];

export default function Navigation() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Hide completely on login/root screen
  if (location.pathname === "/" || location.pathname === "/login") return null;

  const go = (path) => {
    setExpanded(false);
    navigate(path);
  };

  return (
    <>
      {/* Dimmed Backdrop overlay for focus when expanded */}
      <div 
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          opacity: expanded ? 1 : 0,
          pointerEvents: expanded ? "auto" : "none",
          backdropFilter: expanded ? "blur(4px)" : "blur(0px)",
          WebkitBackdropFilter: expanded ? "blur(4px)" : "blur(0px)",
        }}
        onClick={() => setExpanded(false)}
      />

      {/* Main Container sitting bottom-right */}
      <div 
        className="fixed z-50 flex justify-end"
        style={{
          bottom: "24px",
          right: "16px",
          left: expanded ? "16px" : "auto", // Dynamically stretches across when expanded
          transition: "left 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        <div
          className="flex items-center overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(230, 230, 230, 0.7)",
            
            // Layout dimension morphing
            height: "56px",
            width: expanded ? "100%" : "56px", 
            borderRadius: expanded ? "24px" : "50%",
            padding: expanded ? "0 8px" : "0",
            
            // Smooth morphing timings
            transition: "width 0.4s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.3s ease, padding 0.4s ease",
          }}
        >
          {expanded ? (
            // ── EXPANDED STATE (Full Menu Items) ──
            <div className="flex w-full h-full items-center justify-around animate-fade-in">
              {tabs.map(({ icon: Icon, label, path }) => {
                const isActive = location.pathname === path;
                return (
                  <button
                    key={path}
                    onClick={() => go(path)}
                    className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 active:scale-90 transition-transform duration-150"
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={isActive ? "text-gray-900" : "text-gray-400"}
                      fill={isActive && label === "Home" ? "currentColor" : "none"}
                    />
                    <span className={`text-[10px] font-bold tracking-wide ${isActive ? "text-gray-900" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            // ── COLLAPSED STATE (Single Trigger Trigger Button) ──
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center justify-center w-full h-full text-gray-700 active:scale-90 transition-transform duration-150"
              aria-label="Open navigation menu"
            >
              {/* Dynamic Icon changes based on current route or default menu */}
              {(() => {
                const CurrentIcon = tabs.find((t) => t.path === location.pathname)?.icon || Menu;
                return <CurrentIcon size={22} strokeWidth={2} />;
              })()}
            </button>
          )}
        </div>
      </div>

      {/* Global CSS for fade micro-animations */}
      <style>{`
        .animate-fade-in {
          animation: fadeInEffect 0.25s ease-out forwards;
          animation-delay: 0.1s;
          opacity: 0;
        }
        @keyframes fadeInEffect {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

