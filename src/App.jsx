import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Index from './components/Index'; 
import Login from './components/Login';
import Register from './components/Register';
import Home from './pages/home';
import AddPost from './pages/add-post';
import Chat from './pages/chat';
import Profile from './pages/profile';
import Navigation from './components/navigation';

// ─── INNER LAYOUT WRAPPER ───────────────────────────────────────────────────
function AppLayout({ session }) {
  const location = useLocation(); 
  const [sessionError, setSessionError] = useState(null);

  // 🚀 HIDE CONDITION: Paths where the bottom nav bar should disappear
  const hideNavBar = 
    location.pathname === '/chat' || 
    location.pathname === '/comments' || 
    location.pathname.startsWith('/comments/');

  // 🚀 SINGLE-DEVICE SESSION ENFORCEMENT GUARD
  useEffect(() => {
    // Exit early if the user is not actively logged in
    if (!session?.user?.id) return;

    const checkDeviceSessionValidity = async () => {
      try {
        // 🚀 GRACE PERIOD GUARD: Fetch the token stashed on this specific device
        const currentDeviceToken = localStorage.getItem("harate_active_session_token");

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
          console.warn("login confirmed. if you are log in other device then account in that device automatically logged out");
          
          // Clear out the live session state instantly to freeze protected routes
          setSession(null);
          
          // Wipe out local device configuration states completely
          localStorage.clear();
          sessionStorage.clear();
          
          // Sign out of the native Supabase Auth layer instance
          await supabase.auth.signOut();
          
          // Show our explanatory eviction warning modal overlay
          setShowKickModal(true);
        }
      } catch (err) {
        console.error("Session monitor connection error:", err);
      }
    };

    // Give the login script a 1.5-second head start to settle storage before running the path switch check
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

      <Routes>
        {/* ─── AUTHENTICATION ENTRANCE PATHS ─── */}
        <Route path="/" element={session ? <Navigate to="/home" replace /> : <Index />} />
        <Route path="/login" element={session ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/register" element={!session ? <Register /> : <Navigate to="/login" replace />} />

        {/* ─── PROTECTED APPLICATION ROUTES ─── */}
        <Route path="/home" element={session ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/chat" element={session ? <Chat /> : <Navigate to="/login" replace />} />
        <Route path="/add-post" element={session ? <AddPost /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/login" replace />} />     

{/* Catch-all global fallback */}
<Route path="*" element={<Navigate to={session ? "/home" : "/"} replace />} />

      </Routes>

      {/* Only render bottom navigation if user has a session AND we shouldn't hide it */}
      {session && !hideNavBar && <Navigation />}
    
  
}

// ─── MAIN APP ENTRY POINT ────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-bold text-xs uppercase tracking-widest">
        Loading Harate...
      </div>
    );
  }

  return (
    <Router>
      <AppLayout session={session} />
    </Router>
  );
}

