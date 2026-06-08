import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Hash, Smile, FileText, Send, LogOut, Edit2, Check, AlertCircle } from 'lucide-react';
  
export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Student Profile Data States
  const [student, setStudent] = useState(null);
  const [nickname, setNickname] = useState('');
  const [about, setAbout] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  // Feedback Input State
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Pull local session and sync with live Supabase record
  async function fetchProfileData() {
    try {
      const localUser = JSON.parse(localStorage.getItem('anon_user'));
      if (!localUser?.id) return;

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', localUser.id)
        .single();

      if (data) {
        setStudent(data);
        setNickname(data.nickname || '');
        setAbout(data.about || '');
      }
    } catch (err) {
      console.error('Error parsing session profile:', err);
    }
  }

  // Update text metadata fields in 'students' table
  async function handleUpdateField(column, value, toggleEditSetter) {
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('students')
        .update({ [column]: value.trim() || null })
        .eq('id', student.id);

      if (error) throw error;

      // Update local view state copy
      setStudent(prev => ({ ...prev, [column]: value.trim() || null }));
      toggleEditSetter(false);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Failed to save changes. Try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  // Submit text straight into the feedback database table mapping
  async function handleSubmitFeedback() {
    if (!feedbackText.trim()) {
      setMessage({ text: 'Please type some feedback first.', type: 'error' });
      return;
    }

    setFeedbackLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('feedback')
        .insert([
          {
            user_id: student.id,
            feedback: feedbackText.trim()
          }
        ]);

      if (error) throw error;

      setFeedbackText('');
      setMessage({ text: 'Thank you! Your feedback has been sent to Vikas.', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Could not send feedback. Try again.', type: 'error' });
    } finally {
      setFeedbackLoading(false);
    }
  }

  // Safe global account session clear out tracking
  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 pt-6 pb-24 max-w-md mx-auto select-none overflow-y-auto">
      
      {/* ─── HEADER TITLE PROFILE SPOTLIGHT ─────────────────────────────────── */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-black tracking-tight bg-gradient-to-tr from-[#bc1888] via-[#e95950] to-[#fccf02] bg-clip-text text-transparent uppercase inline-block">
          My Profile
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">Manage your digital presence</p>
      </div>

      {/* Global Status Banner Alert */}
      {message.text && (
        <div className={`p-3 rounded-xl text-xs font-bold mb-4 border transition-all ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* ─── CORE USER DETAILS META MATRIX CARD ─────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        
        {/* Full Name Row */}
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-3">
          <User size={16} className="text-slate-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Full Name</p>
            <p className="text-sm font-bold text-white truncate">{student?.full_name || 'Loading...'}</p>
          </div>
        </div>

        {/* Roll Number Row */}
        <div className="flex items-center gap-3 border-b border-slate-800/60 pb-3">
          <Hash size={16} className="text-slate-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Roll Number</p>
            <p className="text-sm font-mono font-bold text-cyan-400 uppercase tracking-wider">{student?.roll_no || '---'}</p>
          </div>
        </div>

        {/* Nickname Interactive Row */}
        <div className="flex items-start gap-3 border-b border-slate-800/60 pb-3">
          <Smile size={16} className="text-slate-500 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Nickname</p>
            {isEditingNickname ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  maxLength={15}
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs outline-none text-white focus:border-cyan-500"
                  placeholder="Type nickname..."
                />
                <button 
                  onClick={() => handleUpdateField('nickname', nickname, setIsEditingNickname)}
                  disabled={loading}
                  className="p-2 bg-cyan-500 text-slate-900 rounded-lg active:scale-95 transition"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm text-slate-200 font-medium italic">{student?.nickname || 'No nickname set yet'}</p>
                <button onClick={() => setIsEditingNickname(true)} className="text-slate-500 hover:text-white transition p-1">
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* About Yourself Interactive Text Area Row */}
        <div className="flex items-start gap-3 pt-1">
          <FileText size={16} className="text-slate-500 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-wider text-slate-500 uppercase">About Yourself</p>
            {isEditingAbout ? (
              <div className="space-y-2 mt-1">
                <textarea
                  rows={3}
                  maxLength={150}
                  value={about}
                  onChange={e => setAbout(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs outline-none text-white focus:border-cyan-500 resize-none"
                  placeholder="Share something with your batchmates..."
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditingAbout(false)} className="text-xs text-slate-400 px-2.5 py-1 rounded-lg bg-slate-800">Cancel</button>
                  <button 
                    onClick={() => handleUpdateField('about', about, setIsEditingAbout)}
                    disabled={loading}
                    className="text-xs bg-cyan-500 text-slate-900 font-bold px-3 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition"
                  >
                    <Check size={12} /> Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between mt-1">
                <p className="text-xs text-slate-300 leading-relaxed break-words whitespace-pre-wrap flex-1 pr-2">
                  {student?.about || 'Write a short bio about yourself...'}
                </p>
                <button onClick={() => setIsEditingAbout(true)} className="text-slate-500 hover:text-white transition p-1 flex-shrink-0">
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── APP SYSTEM BETA NOTIFICATION BANNER ────────────────────────────── */}
      <div className="mt-5 p-3.5 bg-gradient-to-tr from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-2xl flex gap-3 items-start shadow-inner">
        <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-xs font-black tracking-wide text-amber-400 uppercase">Beta Stage System</h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            Students Harate is currently in its building development phase. If any visual errors or inconveniences occur, we are truly sorry! Drop a note below to help improve the space.
          </p>
        </div>
      </div>

      {/* ─── CONTEXT FEEDBACK TRANSMISSION MODULE ───────────────────────────── */}
      <div className="mt-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-black tracking-wider text-slate-500 uppercase">Send Developer Feedback</p>
        
        <div className="relative">
          <textarea
            rows={3}
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="Report a bug, suggest an idea, or share your experience..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pr-10 text-xs outline-none text-white placeholder-slate-600 focus:border-slate-700 transition"
          />
          <button
            onClick={handleSubmitFeedback}
            disabled={feedbackLoading || !feedbackText.trim()}
            className="absolute bottom-3 right-3 p-2 bg-[#0095f6] text-white rounded-xl active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-[#0095f6]/10"
          >
            <Send size={12} />
          </button>
        </div>
      </div>

      {/* ─── SYSTEM SESSION CONTROL ACTIONS ─────────────────────────────────── */}
      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-950/20 border border-red-900/30 hover:bg-red-900/30 text-red-400 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-98 flex items-center justify-center gap-2 shadow-lg"
        >
          <LogOut size={14} />
          Logout from App
        </button>
      </div>

    </div>
  );
}

