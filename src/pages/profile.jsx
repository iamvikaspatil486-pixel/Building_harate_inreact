import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Menu, X, Send, Check, LogOut, MessageSquare, AlertTriangle, Bell, BellOff } from 'lucide-react';
import { setupNotifications } from "../lib/notifications";


export default function Profile() {
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [student, setStudent] = useState(null);
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');

  // ── Notification state ──
  const [notifPermission, setNotifPermission] = useState('default');
  const [notifLoading, setNotifLoading] = useState(false);
  const [hasFcmToken, setHasFcmToken] = useState(false);

  useEffect(() => {
    fetchProfileData();
    // Check current permission state
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
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
        setHasFcmToken(!!data[0].fcm_token);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
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
      alert('Failed to save.');
    } finally {
      setLoading(false);
    }
  }

  // ── Enable notifications ──
  async function handleEnableNotifications() {
    setNotifLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== 'granted') {
        setNotifLoading(false);
        return;
      }

      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!token) { setNotifLoading(false); return; }

      const { error } = await supabase
        .from('students')
        .update({ fcm_token: token })
        .eq('id', student.id);

      if (!error) {
        setHasFcmToken(true);
        setStudent(prev => ({ ...prev, fcm_token: token }));
      }
    } catch (err) {
      console.error('Notification enable failed:', err);
    } finally {
      setNotifLoading(false);
    }
  }

  // ── Disable notifications (clear token from DB) ──
async function handleEnableNotifications() {
  setNotifLoading(true);
  try {
    await setupNotifications(student.id);
    // Re-fetch to confirm token was saved
    const { data } = await supabase
      .from('students')
      .select('fcm_token')
      .eq('id', student.id)
      .single();
    if (data?.fcm_token) {
      setHasFcmToken(true);
      setNotifPermission('granted');
    }
  } catch (err) {
    console.error('Enable notifications failed:', err);
  } finally {
    setNotifLoading(false);
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
      alert('Could not submit feedback.');
    } finally {
      setFeedbackLoading(false);
    }
  }

  function closeFeedbackWorkflow() {
    setShowFeedbackModal(false);
    setTimeout(() => setFeedbackSubmitted(false), 200);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.href = '/';
  }

  const initialLetter = student?.full_name ? student.full_name.charAt(0).toUpperCase() : '?';

  // Notification row label logic
  const notifEnabled = notifPermission === 'granted' && hasFcmToken;

  return (
    <div className="min-h-screen bg-white text-slate-950 px-4 pt-4 pb-24 max-w-md mx-auto select-none font-sans overflow-y-auto relative">

      {/* ─── 1. HEADER ── */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
        <p className="font-black text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 bg-clip-text text-transparent">
          STUDENTS HARATE
        </p>
        <button onClick={() => setShowMenu(true)} className="p-1 text-slate-800 hover:text-slate-600 active:scale-90 transition-all">
          <Menu size={22} className="stroke-[2.5]" />
        </button>
      </div>

      {/* ─── 2. AVATAR ── */}
      <div className="flex items-center gap-6 px-1 mb-6">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 blur-md opacity-40" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 flex items-center justify-center p-[2.5px] shadow-sm relative z-10">
            <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center border-[1.5px] border-white">
              <span className="text-2xl font-black text-slate-800 tracking-wide font-mono">{initialLetter}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <h2 className="text-base font-black tracking-tight text-slate-900 truncate">{student?.full_name || 'Loading...'}</h2>
          {student?.nickname && <p className="text-xs text-blue-600 font-bold tracking-wide truncate">@{student.nickname.toLowerCase()}</p>}
          <div className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1">
            Roll: {student?.roll_no || '---'}
          </div>
        </div>
      </div>

      {/* ─── 3. BIO ── */}
      <div className="px-1 mb-6 border-b border-slate-100 pb-5">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">about me 👇</p>
        <p className="text-xs text-slate-700 leading-relaxed break-words whitespace-pre-wrap bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
          {student?.bio || "Tap the top-right menu to add your bio!"}
        </p>
      </div>

      {/* ─── 4. FEEDBACK BUTTON ── */}
      <div className="mt-4 px-1">
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="w-full py-3 bg-slate-50 hover:bg-slate-100/80 active:scale-98 border border-slate-200/60 rounded-xl text-slate-700 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
        >
          <MessageSquare size={14} className="text-blue-600" />
          Send App Feedback
        </button>
      </div>

      {/* ─── 5. MENU DRAWER ── */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end justify-center px-4 animate-in fade-in duration-100">
          <div className="absolute inset-0" onClick={() => setShowMenu(false)} />
          <div className="w-full max-w-sm bg-white border-t border-slate-100 rounded-t-3xl p-4 pb-6 z-10 space-y-1 transform animate-in slide-in-from-bottom duration-200">
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Account Control</p>
              <button onClick={() => setShowMenu(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>

            <button
              onClick={() => { setShowMenu(false); setActiveModal('edit_nickname'); }}
              className="w-full text-left py-3 px-3 hover:bg-slate-50 active:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 transition"
            >
              📝 Edit Personal Nickname
            </button>

            <button
              onClick={() => { setShowMenu(false); setActiveModal('edit_bio'); }}
              className="w-full text-left py-3 px-3 hover:bg-slate-50 active:bg-slate-50 rounded-xl text-xs font-bold text-slate-800 border-b border-slate-100 pb-3 transition"
            >
              ✍️ Edit Profile Bio
            </button>

            {/* ── Notification toggle row ── */}
            <button
              onClick={async () => {
                setShowMenu(false);
                if (notifEnabled) {
                  await handleDisableNotifications();
                } else {
                  await handleEnableNotifications();
                }
              }}
              disabled={notifLoading}
              className="w-full text-left py-3 px-3 hover:bg-slate-50 active:bg-slate-50 rounded-xl text-xs font-bold border-b border-slate-100 pb-3 transition flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {notifEnabled
                  ? <BellOff size={14} className="text-red-500" />
                  : <Bell size={14} className="text-blue-500" />
                }
                <span className={notifEnabled ? "text-red-600" : "text-slate-800"}>
                  {notifLoading
                    ? "Please wait..."
                    : notifEnabled
                      ? "Turn Off Notifications"
                      : "Allow Notifications"
                  }
                </span>
              </span>
              {/* Status pill */}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                notifEnabled
                  ? "bg-green-100 text-green-600"
                  : "bg-slate-100 text-slate-400"
              }`}>
                {notifEnabled ? "ON" : "OFF"}
              </span>
            </button>

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

      {/* ─── 6. EDIT MODALS ── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center px-6">
          <div className="w-full max-w-xs bg-white border border-slate-100 rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
              {activeModal === 'edit_nickname' ? 'Update Nickname' : 'Update Profile Bio'}
            </h3>
            {activeModal === 'edit_nickname' ? (
              <input type="text" maxLength={15} value={nickname} onChange={e => setNickname(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none text-slate-900 focus:border-blue-500"
                placeholder="Type profile handle..." />
            ) : (
              <textarea rows={4} maxLength={150} value={bio} onChange={e => setBio(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none text-slate-900 focus:border-blue-500 resize-none"
                placeholder="Write a status..." />
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setActiveModal(null)} className="text-xs font-bold text-slate-500 px-3 py-1.5 rounded-lg bg-slate-100">Cancel</button>
              <button
                onClick={() => activeModal === 'edit_nickname' ? handleUpdateField('nickname', nickname) : handleUpdateField('bio', bio)}
                disabled={loading}
                className="text-xs font-black bg-blue-600 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition"
              >
                <Check size={12} className="stroke-[3]" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 7. FEEDBACK MODAL ── */}
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
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                  Students Harate is still being built. If you find bugs or have ideas, share them here!
                </p>
                <div className="relative pt-1">
                  <textarea rows={3} value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Report bugs, share ideas..."
                    className="w-full bg-slate-50/60 border border-slate-200 rounded-xl p-3 pr-12 text-xs outline-none text-slate-900 focus:border-blue-500 transition resize-none" />
                  <button onClick={handleSubmitFeedback} disabled={feedbackLoading || !feedbackText.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-xl active:scale-95 transition disabled:opacity-30">
                    <Send size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                  <Check size={18} className="stroke-[3]" />
                </div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Feedback Received</h3>
                <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed px-1">Thanks! Feel free to share more anytime.</p>
                <button onClick={closeFeedbackWorkflow} className="mt-4 w-full py-2 bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 8. LOGOUT WARNING ── */}
      {showLogoutWarning && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center px-6 animate-in fade-in duration-100">
          <div className="absolute inset-0" onClick={() => setShowLogoutWarning(false)} />
          <div className="w-full max-w-xs bg-white border border-slate-100 rounded-2xl p-5 text-center shadow-2xl relative z-10 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
              <AlertTriangle size={18} className="stroke-[2.5]" />
            </div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Logout of Harate?</h3>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed px-1">
              Are you sure? You'll need to enter your credentials again to access your batch.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
              <button onClick={() => setShowLogoutWarning(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95">
                Cancel
              </button>
              <button onClick={handleLogout}
                className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

