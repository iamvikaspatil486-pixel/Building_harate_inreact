import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Menu, X, Send, Check, LogOut, MessageSquare, AlertTriangle } from 'lucide-react';

export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // Interactive Drawer & Modal Overlays
  const [showMenu, setShowMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'edit_nickname' | 'edit_bio' | null
  
  // 🚀 LOGOUT WARNING MODAL STATE
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  // Feedback Workflow Management States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Student Profile Data States
  const [student, setStudent] = useState(null);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      const storedData = localStorage.getItem('anon_user');
      if (!storedData) return;
      
      const localUser = JSON.parse(storedData);
      if (!localUser?.id) return;

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', localUser.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setStudent(data[0]);
        setNickname(data[0].nickname || '');
        setBio(data[0].bio || '');
      }
    } catch (err) {
      console.error('Error fetching profile data matrix:', err);
    }
  }

  async function handleUpdateField(column, value) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ [column]: value.trim() || null })
        .eq('id', student.id);

      if (error) throw error;

      setStudent(prev => ({ ...prev, [column]: value.trim() || null }));
      setActiveModal(null); 
    } catch (err) {
      alert('Failed to save configuration updates.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitFeedback() {
    if (!feedbackText.trim()) return;
    setFeedbackLoading(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert([{ user_id: student.id, feedback: feedbackText.trim() }]);

      if (error) throw error;
      setFeedbackText('');
      setFeedbackSubmitted(true);
    } catch (err) {
      alert('Could not submit feedback data.');
    } finally {
      setFeedbackLoading(false);
    }
  }

  function closeFeedbackWorkflow() {
    setShowFeedbackModal(false);
    setTimeout(() => {
      setFeedbackSubmitted(false);
    }, 200);
  }

  // 🚀 EXPLICIT SESSION TERMINATION TERMINAL
  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/login';
  }

  const initialLetter = student?.full_name ? student.full_name.charAt(0).toUpperCase() : '?';

  return (
    <div className="min-h-screen bg-white text-slate-950 px-4 pt-4 pb-24 max-w-md mx-auto select-none font-sans overflow-y-auto relative">
      
      {/* ─── 1. TOP INSTAGRAM LIGHT HEADER ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
        <p className="font-black text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
          STUDENTS HARATE
        </p>
        
        <button 
          onClick={() => setShowMenu(true)} 
          className="p-1 text-slate-800 hover:text-slate-600 active:scale-90 transition-all"
        >
          <Menu size={22} className="stroke-[2.5]" />
        </button>
      </div>

      {/* ─── 2. AVATAR PROFILE IDENTITY PANEL ───────────────────────────────── */}
      <div className="flex items-center gap-6 px-1 mb-6">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 blur-md opacity-40 animate-gradient-xy" style={{ backgroundSize: "200% 200%" }} />
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 flex items-center justify-center p-[2.5px] shadow-sm animate-gradient-xy relative z-10" style={{ backgroundSize: "200% 200%" }}>
            <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center border-[1.5px] border-white">
              <span className="text-2xl font-black text-slate-800 tracking-wide font-mono">{initialLetter}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-0.5">
          <h2 className="text-base font-black tracking-tight text-slate-900 truncate">{student?.full_name || 'Loading profile...'}</h2>
          {student?.nickname && <p className="text-xs text-blue-600 font-bold tracking-wide truncate">@{student.nickname.toLowerCase()}</p>}
          <div className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">Roll: {student?.roll_no || '---'}</div>
        </div>
      </div>

      {/* ─── 3. BIO SECTION ─────────────────────────────────────────────────── */}
      <div className="px-1 mb-6 border-b border-slate-100 pb-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">about me👇</p>
        <p className="text-xs text-slate-700 leading-relaxed break-words whitespace-pre-wrap bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
          {student?.bio || "Tap the top-right options bar to compose your personal profile bio track!"}
        </p>
      </div>

      {/* ─── 4. FEEDBACK ACTION BUTTON ──────────────────────────────────────── */}
      <div className="mt-4 px-1">
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="w-full py-3 bg-slate-50 hover:bg-slate-100/80 active:scale-98 border border-slate-200/60 rounded-xl text-slate-700 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
        >
          <MessageSquare size={14} className="text-blue-600" />
          Send App Feedback
        </button>
      </div>

      {/* ─── 5. OPTIONS NAVIGATION DRAWER ───────────────────────────────────── */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center px-4 animate-in fade-in duration-100">
          <div className="absolute inset-0" onClick={() => setShowMenu(false)} />
          <div className="w-full max-w-sm bg-white border-t border-slate-100 rounded-t-3xl p-4 pb-6 z-10 space-y-1 transform animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Account Control</p>
              <button onClick={() => setShowMenu(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            <button onClick={() => { setShowMenu(false); setActiveModal('edit_nickname'); }} className="w-full text-left py-3 px-3 hover:bg-slate-50 active:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 transition">📝 Edit Personal Nickname</button>
            <button onClick={() => { setShowMenu(false); setActiveModal('edit_bio'); }} className="w-full text-left py-3 px-3 hover:bg-slate-50 active:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border-b border-slate-100 pb-3 transition">✍️ Edit Profile Bio</button>

            {/* 🚀 LOGOUT TRIGGER: Closes drawer and opens the confirmation modal sheet */}
            <button 
              onClick={() => { setShowMenu(false); setShowLogoutWarning(true); }}
              className="w-full text-left py-3 px-3 hover:bg-red-50 active:bg-red-50 text-red-600 font-bold rounded-xl text-xs flex items-center gap-2 mt-2 transition"
            >
              <LogOut size={14} />
              Logout from Profile
            </button>
          </div>
        </div>
      )}

      {/* ─── 6. INTERACTIVE DATA EDITING INPUT OVERLAYS ──────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center px-6">
          <div className="w-full max-w-xs bg-white border border-slate-100 rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">{activeModal === 'edit_nickname' ? 'Update Nickname' : 'Update Profile Bio'}</h3>
            {activeModal === 'edit_nickname' ? (
              <input type="text" maxLength={15} value={nickname} onChange={e => setNickname(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none text-slate-900 focus:border-blue-500" placeholder="Type profile handle..." />
            ) : (
              <textarea rows={4} maxLength={150} value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none text-slate-900 focus:border-blue-500 resize-none" placeholder="Write a status updates..." />
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setActiveModal(null)} className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-lg bg-slate-100">Cancel</button>
              <button onClick={() => activeModal === 'edit_nickname' ? handleUpdateField('nickname', nickname) : handleUpdateField('bio', bio)} disabled={loading} className="text-xs font-black bg-blue-600 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition">
                <Check size={12} className="stroke-[3]" /> Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. FEEDBACK OVERLAY SCREEN MODULE ─────────────────────────────── */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center px-6 animate-in fade-in duration-150">
          <div className="w-full max-w-xs bg-white border border-slate-100 rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {!feedbackSubmitted ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <MessageSquare size={14} className="text-blue-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Send Feedback</h3>
                  </div>
                  <button onClick={closeFeedbackWorkflow} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">Students Harate is still in its building development state. If any visual inconveniences or errors occur, we are truly sorry!</p>
                <div className="relative pt-1">
                  <textarea rows={3} value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Report bugs, share experiences or ideas..." className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3 pr-12 text-xs outline-none text-slate-900 focus:border-blue-500 transition resize-none" />
                  <button onClick={handleSubmitFeedback} disabled={feedbackLoading || !feedbackText.trim()} className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-xl active:scale-95 transition disabled:opacity-30"><Send size={11} /></button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600"><Check size={18} className="stroke-[3]" /></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Feedback Received</h3>
                <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed px-1">Thanks for your time! If you find any other bugs while exploring, feel free to share it anytime.</p>
                <button onClick={closeFeedbackWorkflow} className="mt-4 w-full py-2 bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm">Close Panel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 🚀 8. BRAND NEW LOGOUT WARNING MODAL POPUP ─────────────────────── */}
      {showLogoutWarning && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center px-6 animate-in fade-in duration-100">
          {/* Tap outside to cancel warning */}
          <div className="absolute inset-0" onClick={() => setShowLogoutWarning(false)} />
          
          <div className="w-full max-w-xs bg-white border border-slate-100 rounded-2xl p-5 text-center shadow-2xl relative z-10 animate-in zoom-in-95 duration-150">
            
            {/* Warning Triangle Icon */}
            <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
              <AlertTriangle size={18} className="stroke-[2.5]" />
            </div>

            {/* Title Text */}
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Logout of Harate?
            </h3>

            {/* Warning Subtext */}
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed px-1">
              Are you sure you want to log out? You will need to enter your credentials again to browse your batch layout and chat with friends.
            </p>

            {/* Modal Actions Footer Grid Row */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
              <button
                onClick={() => setShowLogoutWarning(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm"
              >
                Logout
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

