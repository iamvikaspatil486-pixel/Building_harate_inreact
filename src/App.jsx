import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase'; // Adjust this path to your supabase.js file
import Login from './components/Login';
import Home from './pages/home';
import Chat from './pages/chat';
import Navigation from './components/navigation';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session immediately when app opens
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth state changes (e.g., login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show a clean loading state while checking the storage
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-medium">
        Loading Harate...
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-900">
        <Routes>
          {/* If logged in, redirect "/" or "/login" straight to "/home" */}
          <Route path="/" element={session ? <Navigate to="/home" /> : <Login />} />
          <Route path="/Login" element={session ? <Navigate to="/home" /> : <Login />} />
          
          {/* Protect routes: If NOT logged in, kick them back to login screen */}
          <Route path="/home" element={session ? <Home /> : <Navigate to="/Login" />} />
          <Route path="/chat" element={session ? <Chat /> : <Navigate to="/Login" />} />
        </Routes>

        {/* 🚀 FIX: Only show navigation if authenticated AND NOT on the chat page */}
      {session && window.location.pathname !== '/chat' && <Navigation />}
      </div>
    </Router>
  );
}

