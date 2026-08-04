import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Menu, Heart,  X, Send, Check, LogOut, Search, MessageSquare, AlertTriangle, Bell, BellOff } from 'lucide-react';
import { setupNotifications } from "../lib/notifications";

export default function Profile() {
  const navigate = useNavigate();
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

  const [notifPermission, setNotifPermission] = useState('default');
  const [notifLoading, setNotifLoading] = useState(false);
  const [hasFcmToken, setHasFcmToken] = useState(false);
 const [unreadCount, setUnreadCount] = useState(0);

// With:
const [currentUser] = useState(() => JSON.parse(localStorage.getItem('anon_user') || 'null'));

 useEffect(() => {
  const fetchUnread = async () => {
    if (!currentUser?.id) return;
    const { count } = await supabase
      .from('confessions')
      .select('*', { count: 'exact', head: true })
      .eq('to_student_id', currentUser.id)
      .eq('is_read', false);
    setUnreadCount(count || 0);
  };
  fetchUnread();
}, []); // ← just empty array

  useEffect(() => {
    fetchProfileData();
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

  async function handleEnableNotifications() {
    setNotifLoading(true);
    try {
      await setupNotifications(student.id);
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

  async function handleDisableNotifications() {
    setNotifLoading(true);
    try {
      await supabase
        .from('students')
        .update({ fcm_token: null })
        .eq('id', student.id);
      setHasFcmToken(false);
    } catch (err) {
      console.error(err);
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
  const notifEnabled = notifPermission === 'granted' && hasFcmToken;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white px-4 pt-5 pb-28 max-w-md mx-auto select-none font-sans relative overflow-x-hidden">

      {/* soft glow background */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-fuchsia-500/20 blur-[100px] rounded-full" />
      <div className="pointer-events-none absolute bottom-20 right-0 w-56 h-56 bg-cyan-500/15 blur-[90px] rounded-full" />

      {/* HEADER */}
     {/* HEADER */}
<div className="flex items-center justify-between mb-7 relative z-10">
  <p className="font-black text-sm tracking-[0.2em] uppercase bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
    HARATE
  </p>

  <div className="flex items-center gap-2">
    {/* Search Profile */}
    <button
      onClick={() => navigate('/searchprofile')}
      className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition"
    >
      <Search size={18} />
    </button>

  
  <button
  onClick={() => navigate('/SearchConfession')}
  className="relative w-10 h-10 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition"
>
  <Heart size={18} className="text-pink-300" />
  {unreadCount > 0 && (
    <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-pink-500 rounded-full flex items-center justify-center px-1">
      <span className="text-[10px] font-black text-white">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    </div>
  )}
</button>

    {/* Menu */}
    <button
      onClick={() => setShowMenu(true)}
      className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition"
    >
      <Menu size={18} />
    </button>
  </div>
</div>

      {/* PROFILE CARD */}
      <div className="relative z-10 mb-6 p-5 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 blur-md opacity-60" />
            <div className="relative w-20 h-20 rounded-full p-[2px] bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500">
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
                <span className="text-2xl font-black">{initialLetter}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black truncate leading-tight">
              {student?.full_name || 'Loading...'}
            </h2>
            {student?.nickname && (
              <p className="text-sm text-fuchsia-300 font-semibold truncate">
                @{student.nickname.toLowerCase()}
              </p>
            )}
            <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/10 border border-white/10 text-cyan-200">
              Roll {student?.roll_no || '---'}
            </div>
          </div>
        </div>
      </div>

      {/* PREMIUM ABOUT ME BOX */}
      <div className="relative z-10 mb-6">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-fuchsia-300/80 mb-2 px-1">
          About Me
        </p>
        <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-cyan-400/60 via-fuchsia-500/60 to-pink-500/60">
          <div className="rounded-3xl bg-slate-950/80 backdrop-blur-xl p-4 min-h-[90px]">
            <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
              {student?.bio || "No vibe written yet. Tap menu and drop your energy ✨"}
            </p>
          </div>
        </div>
      </div>

      {/* FEEDBACK BUTTON */}
      <div className="relative z-10 px-1">
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-white/10 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <MessageSquare size={15} className="text-cyan-300" />
          Send App Feedback
        </button>
      </div>

      {/* MENU DRAWER */}
      {showMenu && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center px-4">
          <div className="absolute inset-0" onClick={() => setShowMenu(false)} />
          <div className="w-full max-w-sm bg-slate-950 border border-white/10 rounded-t-3xl p-4 pb-7 z-10 space-y-1">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">Account</p>
              <button onClick={() => setShowMenu(false)} className="text-slate-400">
                <X size={16} />
              </button>
            </div>

            <button
              onClick={() => { setShowMenu(false); setActiveModal('edit_nickname'); }}
              className="w-full text-left py-3.5 px-3 rounded-2xl text-sm font-bold text-white hover:bg-white/5 transition"
            >
              📝 Edit Nickname
            </button>

            <button
              onClick={() => { setShowMenu(false); setActiveModal('edit_bio'); }}
              className="w-full text-left py-3.5 px-3 rounded-2xl text-sm font-bold text-white hover:bg-white/5 transition border-b border-white/5"
            >
              ✍️ Edit About Me
            </button>

            <button
              onClick={async () => {
                setShowMenu(false);
                if (notifEnabled) await handleDisableNotifications();
                else await handleEnableNotifications();
              }}
              disabled={notifLoading}
              className="w-full text-left py-3.5 px-3 rounded-2xl text-sm font-bold border-b border-white/5 transition flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {notifEnabled ? <BellOff size={15} className="text-rose-400" /> : <Bell size={15} className="text-cyan-300" />}
                <span className={notifEnabled ? "text-rose-300" : "text-white"}>
                  {notifLoading ? "Please wait..." : notifEnabled ? "Turn Off Notifications" : "Allow Notifications"}
                </span>
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${notifEnabled ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                {notifEnabled ? "ON" : "OFF"}
              </span>
            </button>

            <button
              onClick={() => { setShowMenu(false); setShowLogoutWarning(true); }}
              className="w-full text-left py-3.5 px-3 rounded-2xl text-sm font-bold text-rose-400 flex items-center gap-2 mt-1"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-xs bg-slate-950 border border-white/10 rounded-3xl p-5 shadow-2xl">
            <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
              {activeModal === 'edit_nickname' ? 'Update Nickname' : 'Update About Me'}
            </h3>

            {activeModal === 'edit_nickname' ? (
              <input
                type="text"
                maxLength={15}
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm outline-none text-white focus:border-fuchsia-400"
                placeholder="your vibe name..."
              />
            ) : (
              <textarea
                rows={4}
                maxLength={150}
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm outline-none text-white focus:border-fuchsia-400 resize-none"
                placeholder="Write your energy..."
              />
            )}

            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setActiveModal(null)} className="text-xs font-bold text-slate-400 px-3 py-2 rounded-xl bg-white/5">
                Cancel
              </button>
              <button
                onClick={() =>
                  activeModal === 'edit_nickname'
                    ? handleUpdateField('nickname', nickname)
                    : handleUpdateField('bio', bio)
                }
                disabled={loading}
                className="text-xs font-black bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white px-4 py-2 rounded-xl flex items-center gap-1 active:scale-95 transition"
              >
                <Check size={12} className="stroke-[3]" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-xs bg-slate-950 border border-white/10 rounded-3xl p-5 shadow-2xl">
            {!feedbackSubmitted ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-cyan-300" />
                    <h3 className="text-xs font-black uppercase tracking-wider">Send Feedback</h3>
                  </div>
                  <button onClick={closeFeedbackWorkflow} className="text-slate-400">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 bg-white/5 p-3 rounded-2xl border border-white/5 leading-relaxed">
                  Still building. Drop bugs or ideas here ✨
                </p>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Tell us something..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 pr-12 text-sm outline-none text-white focus:border-fuchsia-400 resize-none"
                  />
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={feedbackLoading || !feedbackText.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white rounded-xl active:scale-95 transition disabled:opacity-30"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="w-11 h-11 bg-emerald-400/15 border border-emerald-400/30 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-300">
                  <Check size={18} className="stroke-[3]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider">Feedback Received</h3>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Thanks! Keep the vibes coming.
                </p>
                <button
                  onClick={closeFeedbackWorkflow}
                  className="mt-4 w-full py-2.5 bg-white text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider active:scale-95 transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGOUT WARNING */}
      {showLogoutWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="absolute inset-0" onClick={() => setShowLogoutWarning(false)} />
          <div className="w-full max-w-xs bg-slate-950 border border-white/10 rounded-3xl p-5 text-center relative z-10">
            <div className="w-11 h-11 bg-rose-400/15 border border-rose-400/30 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-300">
              <AlertTriangle size={18} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider">Logout of Harate?</h3>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              You’ll need to login again to access your batch.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setShowLogoutWarning(false)}
                className="py-2.5 bg-white/5 text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-wider active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="py-2.5 bg-rose-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider active:scale-95"
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
