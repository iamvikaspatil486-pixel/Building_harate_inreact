import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Index from './components/Index'; 
import Login from './components/Login';
import Register from './components/Register';
import CreateBatch from './components/create-batch';
import Home from './pages/home';
import AddPost from './pages/add-post';
import Chat from './pages/chat';
import Profile from './pages/profile';
import Navigation from './components/navigation';
import Huduku from './pages/Huduku'
import ResourceDetail from './pages/ResourceDetail'
import GameList from './components/gamelist'
import { ShieldAlert } from 'lucide-react';
import OneSignal from 'react-onesignal'; // 🚀 Added OneSignal SDK Integration

// ─── INNER LAYOUT WRAPPER ───────────────────────────────────────────────────
function AppLayout({ session, setSession }) {
  const location = useLocation(); 
  const [showKickModal, setShowKickModal] = useState(false);

  // 🚀 HIDE CONDITION: Paths where the bottom nav bar should disappear
  const hideNavBar = 
    location.pathname === '/chat' || 
    location.pathname === '/comments' || 
    location.pathname.startsWith('/comments/');

  // 🚀 SINGLE-DEVICE SESSION ENFORCEMENT GUARD
  useEffect(() => {
    if (!session?.user?.id) return;

    const checkDeviceSessionValidity = async () => {
      try {
        // 🚀 SYNCHRONIZED KEY: Read the exact key name ('session_token') your login file writes!
        const currentDeviceToken = localStorage.getItem("session_token");

        // If the login script hasn't written the token to local storage yet, 
        // skip this loop cycle so we don't accidentally log out a new user!
        if (!currentDeviceToken) {
          console.log("Local session token is stabilizing, pausing check cycle...");
          return;
        }

        // 1. Query the 'session_token' column for the logged-in user
        const { data: studentRecord, error } = await supabase
          .from('students')
          .select('session_token')
          .eq('id', session.user.id)
          .single();

        if (error || !studentRecord) return;

        // 2. 🚧 THE KICK OUT GATE: If cloud token changed, a newer device logged in!
        if (studentRecord.session_token && studentRecord.session_token !== currentDeviceToken) {
          console.warn("New device login confirmed. Triggering automatic logout on this device.");
          
          // Clear out the live session state instantly to freeze protected routes
          setSession(null);
          
          // Wipe out local device configuration states completely
          localStorage.clear();
          sessionStorage.clear();
          
          // Sign out of the native Supabase Auth layer instance
          await supabase.auth.signOut();
          
          // Reveal our beautiful alert overlay banner
          setShowKickModal(true);
        }
      } catch (err) {
        console.error("Session monitor connection error:", err);
      }
    };

    // Give the login script a 1.5-second head start to settle storage before running the check
    const graceTimer = setTimeout(() => {
      checkDeviceSessionValidity();
    }, 1500);

    // Poll the database quietly every 15 seconds to keep background checks tight
    const sessionCheckInterval = setInterval(checkDeviceSessionValidity, 15000);

    return () => {
      clearTimeout(graceTimer);
      clearInterval(sessionCheckInterval);
    };
  }, [session, location.pathname, setSession]);

  const handleCloseKickModal = () => {
    setShowKickModal(false);
    window.location.href = "/";
  };

  // 🚀 THE FIXED RETURN: Wrap your JSX code layout tree properly!
  return (
    <div className="min-h-screen bg-slate-900 relative">
      <Routes>
        {/* ─── AUTHENTICATION ENTRANCE PATHS ─── */}
        <Route path="/" element={session ? <Navigate to="/home" replace /> : <Index />} />
        <Route path="/login" element={session ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/login" replace />} />
      <Route path="/create-batch" element={!session ? <CreateBatch /> : <Navigate to="/login" replace />} />

        {/* ─── PROTECTED APPLICATION ROUTES ─── */}
        <Route path="/home" element={session ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/chat" element={session ? <Chat /> : <Navigate to="/login" replace />} />
        <Route path="/huduku" element={session ? <Huduku /> : <Navigate to="/" />} />
<Route path="/resource/:id" element={session ? <ResourceDetail /> : <Navigate to="/" />} />
        <Route path="/add-post" element={session ? <AddPost /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" replace />} />     
       <Route path="/gamelist" element={session ? <GameList/> : <Navigate to="/login" replace />} />
        
        {/* Catch-all global fallback */}
<Route path="*" element={<Navigate to={session ? "/home" : "/"} replace />} />
      </Routes>

      {/* Only render bottom navigation if user has a session AND we shouldn't hide it */}
      {session && !hideNavBar && <Navigation />}

      {/* ─── 🚨 DETECTED NEW DEVICE LOGIN MODAL OVERLAY ─── */}
      {showKickModal && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="w-full max-w-sm bg-slate-950 border border-red-500/20 rounded-2xl p-6 text-center shadow-2xl animate-scale-up">
            
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <ShieldAlert size={24} className="stroke-[2.5]" />
            </div>

            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Logged Out Automatically
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed px-2">
              You have logged into your account on another device. This session has been closed for security.
            </p>

            <button
              onClick={handleCloseKickModal}
              className="w-full mt-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition active:scale-95 shadow-md shadow-red-600/10"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Embedded micro-animations */}
      <style>{`
        @keyframes fIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fIn 0.2s ease-out forwards; }
        .animate-scale-up { animation: sUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>
    </div>
  );
}

// ─── MAIN APP ENTRY POINT ────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🚀 INITIALIZE ONESIGNAL RUNTIME ENGINE
    OneSignal.init({
      appId: "YOUR_ONESIGNAL_APP_ID_HERE", // <-- ⚠️ PASTE YOUR ACTUAL DASHBOARD APP ID HERE
      allowLocalhostAsSecureOrigin: true,   // Permits clean local testing within Termux environments
    }).then(() => {
      console.log("OneSignal background push pipeline successfully deployed.");
    }).catch((err) => {
      console.error("OneSignal initialization timeout:", err);
    });

    // Check active session immediately when app opens
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth state changes (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-500 font-bold text-xs uppercase tracking-widest">
        Loading Harate...
      </div>
    );
  }

  return (
    <Router>
      <AppLayout session={session} setSession={setSession} />
    </Router>
  );
}

