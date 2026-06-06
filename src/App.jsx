import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase'; 
import Login from './components/Login';
import Home from './pages/home';
import AddPost from './pages/add-post';
import Chat from './pages/chat';
import Navigation from './components/navigation';

// 🚀 INNER LAYOUT WRAPPER: Handles path checking inside the Router context
function AppLayout({ session }) {
  const location = useLocation(); // Tracks real-time route state switches

  return (
    <div className="min-h-screen bg-slate-900">
      <Routes>
        {/* If logged in, redirect "/" or "/login" straight to "/home" */}
        <Route path="/" element={session ? <Navigate to="/home" /> : <Login />} />
        <Route path="/login" element={session ? <Navigate to="/home" /> : <Login />} />
        
        {/* Protect routes: If NOT logged in, kick them back to login screen */}
        <Route path="/home" element={session ? <Home /> : <Navigate to="/login" />} />
        <Route path="/chat" element={session ? <Chat /> : <Navigate to="/login" />} />
       <Route path="/add-post" element={session?<AddPost/> : <Navigate to ="/login"/>}/>
      </Routes>

      {/* 🚀 FIXED: Dynamic location matching to hide navigation on the chat screen instantly */}
      {session && location.pathname !== '/chat' && <Navigation />}
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

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-medium">
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

