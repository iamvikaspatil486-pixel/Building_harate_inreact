import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Index from './components/Index';
import Login from './components/Login';
import Register from './components/Register';
import CreateBatch from './components/create-batch';
import Home from './pages/home';
import ViewMoments from './pages/viewmoments';
import AddPost from './pages/add-post';
import Chat from './pages/chat';
import Profile from './pages/profile';
import SearchProfile from './pages/searchprofile';
import ViewProfile from './pages/viewprofile';
import SearchConfession from './pages/SearchConfession';
import ViewConfession from './pages/ViewConfession';
import Navigation from './components/navigation';
import Huduku from './pages/Huduku';
import ResourceDetail from './pages/ResourceDetail';
import GameList from './components/gamelist';
import Kuchikus from './pages/kuchikus';
import TicTacToe from './games/tictactoe';
import MiniOmegle from './pages/miniomegle';

function AppLayout({ session, setSession }) {
  const location = useLocation();

  // Check both Supabase session and localStorage anon_user
  const localUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const isLoggedIn = !!session || !!localUser;

  const hideNavBar =
    location.pathname === '/chat' ||
    location.pathname === '/comments' ||
    location.pathname.startsWith('/comments/');

  return (
    <div className="min-h-screen bg-slate-900 relative">
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/home" replace /> : <Index />} />
        <Route path="/login" element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create-batch" element={<CreateBatch />} />

        {/* ── Protected routes ── */}
        <Route path="/home" element={isLoggedIn ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/chat" element={isLoggedIn ? <Chat /> : <Navigate to="/" replace />} />
        <Route path="/huduku" element={isLoggedIn ? <Huduku /> : <Navigate to="/" replace />} />
        <Route path="/resource/:id" element={isLoggedIn ? <ResourceDetail /> : <Navigate to="/" replace />} />
        <Route path="/add-post" element={isLoggedIn ? <AddPost /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={isLoggedIn ? <Profile /> : <Navigate to="/" replace />} />
        <Route path="/gamelist" element={isLoggedIn ? <GameList /> : <Navigate to="/" replace />} />
        <Route path="/tictactoe" element={isLoggedIn ? <TicTacToe /> : <Navigate to="/" replace />} />
        <Route path="/miniomegle" element={isLoggedIn ? <MiniOmegle /> : <Navigate to="/" replace />} />
        <Route path="/kuchikus" element={isLoggedIn ? <Kuchikus /> : <Navigate to="/" replace />} />
        <Route path="/viewmoments" element={isLoggedIn ? <ViewMoments /> : <Navigate to="/" replace />} />
        <Route path="/searchprofile" element={isLoggedIn ? <SearchProfile /> : <Navigate to="/" replace />} />
        <Route path="/viewprofile/:id" element={isLoggedIn ? <ViewProfile /> : <Navigate to="/" replace />} />
        <Route path="/SearchConfession" element={isLoggedIn ? <SearchConfession /> : <Navigate to="/" replace />} />
        <Route path="/ViewConfession/:id" element={isLoggedIn ? <ViewConfession /> : <Navigate to="/" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={isLoggedIn ? "/home" : "/"} replace />} />
      </Routes>

      {isLoggedIn && !hideNavBar && <Navigation />}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
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

