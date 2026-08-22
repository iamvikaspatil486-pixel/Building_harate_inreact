import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Lock, Check, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase automatically handles the token from the URL
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password.trim()) { setError('Enter a new password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;

      // Also update password in students table for custom auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('students')
          .update({ password })
          .eq('email', user.email);
      }

      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <Check size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-black text-white">Password Reset!</h2>
          <p className="text-slate-400 text-sm">Your password has been updated. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-cyan-400 tracking-tight">STUDENTS HARATE</h1>
        <p className="text-slate-400 text-sm mt-1">Set new password</p>
      </div>

      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">New Password</h2>
            <p className="text-slate-400 text-sm">Choose a strong password for your account.</p>
          </div>

          {!sessionReady && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm p-3 rounded-xl">
              ⏳ Verifying reset link...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">New Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full pl-9 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Confirm Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                className="w-full pl-9 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={loading || !sessionReady}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {loading ? 'Saving...' : 'Save New Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

