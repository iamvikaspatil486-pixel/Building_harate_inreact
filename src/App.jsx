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
    if (!session?.user?.id) return;

    const checkDeviceSessionValidity = async () => {
      try {
        // 1. Query your existing 'session_token' column for the logged-in student
        const { data: studentRecord, error } = await supabase
          .from('students')
          .select('session_token')
          .eq('id', session.user.id)
          .single();

        if (error || !studentRecord) return;

        // 2. Get the token stashed on this specific device during its login step
        const currentDeviceToken = localStorage.getItem("harate_active_session_token");

        // 3. 🚧 THE KICK OUT GATE: If the cloud token changed, a newer device took over!
        if (studentRecord.session_token && studentRecord.session_token !== currentDeviceToken) {
          
          // Set an on-screen warning error string message before wiping the cache
          setSessionError("You have been logged out because your account was logged into from another device.");
          
          // Delay the hard clear slightly so the user can read the error message banner
          setTimeout(async () => {
            // Wipe out local device states completely
            localStorage.clear();
            sessionStorage.clear();
            
            // Sign out of the native Supabase Auth layer instance
            await supabase.auth.signOut();
            
            // Bounce the browser completely back to your landing index page
            window.location.href = "/";
          }, 4000);
        }
      } catch (err) {
        console.error("Session device tracker error:", err);
      }
    };

    // Check immediately whenever they move to a new page route
    checkDeviceSessionValidity();

    // Poll the database quietly every 15 seconds to catch new logins in real-time
    const sessionCheckInterval = setInterval(checkDeviceSessionValidity, 15000);

    return () => clearInterval(sessionCheckInterval);
  }, [session, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-900 relative">
      
      {/* 🚨 DYNAMIC AUTOMATIC LOGOUT WARNING BANNER OVERLAY */}
      {sessionError && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in select-none">
          <div className="w-full max-w-sm bg-slate-950 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl space-y-4 animate-scale-up">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto text-xl font-bold animate-pulse">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Session Terminated</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {sessionError}
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Routing to entrance...</span>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
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

