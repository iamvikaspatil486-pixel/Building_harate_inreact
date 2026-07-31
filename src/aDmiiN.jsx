import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, Lock } from 'lucide-react';

export default function AdminVik() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const correctPassword = 'Vik345';

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === correctPassword) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Wrong password');
      setPassword('');
    }
  };

  const cleanupExpiredMoments = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      // 1. Get expired moments
      const { data: expired, error: fetchError } = await supabase
        .from('moments')
        .select('id, image_url')
        .lt('expires_at', new Date().toISOString());

      if (fetchError) throw fetchError;

      if (!expired || expired.length === 0) {
        setMessage('No expired moments found.');
        setLoading(false);
        return;
      }

      // 2. Extract storage paths
      const paths = expired
        .map((m) => {
          const url = m.image_url;
          const parts = url.split('/moments/');
          return parts[1] || null;
        })
        .filter(Boolean);

      // 3. Delete from Storage
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('moments')
          .remove(paths);

        if (storageError) {
          console.error('Storage error:', storageError);
        }
      }

      // 4. Delete from Database
      const ids = expired.map((m) => m.id);
      const { error: dbError } = await supabase
        .from('moments')
        .delete()
        .in('id', ids);

      if (dbError) throw dbError;

      setMessage(`Successfully cleaned ${expired.length} expired moments.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Cleanup failed');
    } finally {
      setLoading(false);
    }
  };

  // ========== Password Screen ==========
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
              <Lock size={28} className="text-cyan-400" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-center mb-2">Admin Access</h1>
          <p className="text-slate-400 text-sm text-center mb-6">Enter password to continue</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white outline-none focus:border-cyan-500"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-bold transition"
            >
              Unlock
            </button>
          </form>

          <button
            onClick={() => navigate(-1)}
            className="w-full mt-4 text-slate-500 text-sm"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // ========== Admin Panel ==========
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Admin Panel</h1>
      </div>

      <div className="p-6 max-w-md mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Cleanup Moments</h2>
              <p className="text-slate-400 text-sm">Delete expired moments (24h+)</p>
            </div>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            This will permanently delete all moments that are older than 24 hours from both the database and storage.
          </p>

          {message && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-3 rounded-xl mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <button
            onClick={cleanupExpiredMoments}
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-2xl font-bold flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Run Cleanup
              </>
            )}
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Password protected • Admin only
        </p>
      </div>
    </div>
  );
}
