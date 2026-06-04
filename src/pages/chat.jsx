import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Adjust path if necessary
import { 
  ArrowLeft, LogOut, Image, Mic, Gamepad2, 
  Send, Smile, ThumbsUp, Heart, Flame, Trash2, Edit3, X 
} from 'lucide-react';

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👍"];

export default function AnonymousChat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  // App States
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentUser, setCurrentUser] = useState({ id: '', name: '' });
  const [currentBatch, setCurrentBatch] = useState({ name: 'AGASTYANS', college: '' });
  const [onlineCount, setOnlineCount] = useState(0);
  
  // UI Interaction States
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
  const [showPollModal, setShowPollModal] = useState(false);
  
  // Local Database Cache
  const [reactionsMap, setReactionsMap] = useState({}); // { messageId: [reactions] }
  const [pollsMap, setPollsMap] = useState({});         // { messageId: { poll, votes } }

  // Poll Creator Form State
  const [pollForm, setPollForm] = useState({ question: '', options: ['', ''], isMultiple: false });

  /* ==========================================
     INITIALIZATION & REALTIME LIFECYCLES
     ========================================== */
  useEffect(() => {
    // 1. Resolve metadata from local storage
    let storedUser = null;
    let storedBatch = null;
    try {
      storedUser = JSON.parse(localStorage.getItem("anon_user"));
      storedBatch = JSON.parse(localStorage.getItem("selectedBatch"));
    } catch (e) { console.error("Storage parsing failed", e); }

    if (!storedUser || !storedBatch) {
      alert('Please login first');
      navigate('/login');
      return;
    }

    setCurrentBatch({
      name: storedBatch?.batchName || 'AGASTYANS',
      college: storedBatch?.collegeName || ''
    });

    const anonUsername = storedUser?.name || `User_${Math.floor(Math.random() * 1000)}`;
    const fallbackId = storedUser?.id || crypto.randomUUID();
    setCurrentUser({ id: fallbackId, name: anonUsername });

    // Sync auth context with official Supabase active account id
    supabase.auth.getUser().then((res) => {
      if (res.data?.user?.id) {
        const verifiedId = res.data.user.id;
        setCurrentUser(prev => ({ ...prev, id: verifiedId }));
        const updatedUser = { ...storedUser, id: verifiedId, name: anonUsername };
        localStorage.setItem('anon_user', JSON.stringify(updatedUser));
      }
    });
// 2. Initial Fetch Data Chains
    const loadChatHistory = async () => {
      const { data: msgData, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('batch_id', storedBatch?.batchId)
        .order('created_at', { ascending: true });

      if (error) return;
      setMessages(msgData || []);

      if (msgData?.length) {
        const msgIds = msgData.map(m => m.id);
        fetchReactions(msgIds);
        fetchPolls(msgIds);
      }
    };

    loadChatHistory();

    // 3. Establish Supabase Database Listeners
    const channel = supabase
      .channel(`batch-room-${storedBatch?.batchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, payload => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new]);
          fetchReactions([payload.new.id]);
          fetchPolls([payload.new.id]);
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
        // Refresh reactions map for visible viewport context
        if (messages.length) fetchReactions(messages.map(m => m.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
        if (messages.length) fetchPolls(messages.map(m => m.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  useEffect(() => {
    // Keep feed snapped to latest text inputs
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);/* ==========================================
     CORE LOGIC HANDLERS (CRUD, REACTIONS, POLLS)
     ========================================== */
  const fetchReactions = async (msgIds) => {
    if (!msgIds.length) return;
    const { data } = await supabase.from('reactions').select('*').in('message_id', msgIds);
    if (!data) return;
    
    const mapped = {};
    data.forEach(r => {
      if (!mapped[r.message_id]) mapped[r.message_id] = [];
      mapped[r.message_id].push(r);
    });
    setReactionsMap(prev => ({ ...prev, ...mapped }));
  };

  const fetchPolls = async (msgIds) => {
    if (!msgIds.length) return;
    const { data: polls } = await supabase.from('polls').select('*').in('message_id', msgIds);
    if (!polls || !polls.length) return;

    const pollIds = polls.map(p => p.id);
    const { data: votes } = await supabase.from('poll_votes').select('*').in('poll_id', pollIds);

    const mappedPolls = {};
    polls.forEach(poll => {
      mappedPolls[poll.message_id] = {
        poll,
        votes: (votes || []).filter(v => v.poll_id === poll.id)
      };
    });
    setPollsMap(prev => ({ ...prev, ...mappedPolls }));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const storedBatch = JSON.parse(localStorage.getItem("selectedBatch"));
    const newMessagePayload = {
      message: inputText.trim(),
      user_id: currentUser.id,
      username: currentUser.name,
      batch_id: storedBatch?.batchId,
      reply_to: replyTo ? replyTo.id : null,
      reply_user: replyTo ? replyTo.username : null,
      reply_text: replyTo ? (replyTo.message || '📷 Media') : null
    };

    setInputText('');
    setReplyTo(null);

    const { error } = await supabase.from('chat_messages').insert([newMessagePayload]);
    if (error) alert("Message delivery failed.");
  };

  const toggleReaction = async (msgId, emoji) => {
    const currentReactions = reactionsMap[msgId] || [];
    const existing = currentReactions.find(r => r.user_id === currentUser.id);

    if (existing) {
      if (existing.emoji === emoji) {
        await supabase.from('reactions').delete().eq('id', existing.id);
        setReactionsMap(prev => ({
          ...prev,
          [msgId]: currentReactions.filter(r => r.id !== existing.id)
        }));
      } else {
        await supabase.from('reactions').update({ emoji }).eq('id', existing.id);
        setReactionsMap(prev => ({
          ...prev,
          [msgId]: currentReactions.map(r => r.id === existing.id ? { ...r, emoji } : r)
        }));
      }
    } else {
      const { data, error } = await supabase
        .from('reactions')
        .insert({ message_id: msgId, emoji, user_id: currentUser.id, username: currentUser.name })
        .select().single();
      
      if (!error && data) {
        setReactionsMap(prev => ({
          ...prev,
          [msgId]: [...currentReactions, data]
        }));
      }
    }
    setActiveEmojiPicker(null);
  };

  const castVote = async (messageId, pollId, optionIndex) => {
    const pollData = pollsMap[messageId];
    if (!pollData) return;
    const { poll, votes } = pollData;
    const myVotes = votes.filter(v => v.user_id === currentUser.id);

    if (!poll.is_multiple) {
      if (myVotes.length > 0) {
        const existing = myVotes[0];
        await supabase.from('poll_votes').delete().eq('id', existing.id);
        if (existing.option_index === optionIndex) return; // Unvoted toggled target row
      }
    } else {
      const existing = myVotes.find(v => v.option_index === optionIndex);
      if (existing) {
        await supabase.from('poll_votes').delete().eq('id', existing.id);
        return;
      }
    }

    await supabase.from('poll_votes').insert({
      poll_id: pollId,
      option_index: optionIndex,
      username: currentUser.name,
      user_id: currentUser.id
    });
  };
const handleEditMessage = async (msgId, currentText, isMedia) => {
    setContextMenu(null);
    const newText = prompt(isMedia ? "Add a caption:" : "Edit message:", currentText || "");
    if (newText !== null && newText.trim() !== currentText) {
      await supabase.from("chat_messages").update({ message: newText.trim(), edited: true }).eq("id", msgId);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    setContextMenu(null);
    if (confirm("Delete this message?")) {
      await supabase.from("chat_messages").delete().eq("id", msgId);
    }
  };

  const submitNewPoll = async () => {
    if (!pollForm.question.trim()) return;
    const validOptions = pollForm.options.filter(o => o.trim() !== '');
    if (validOptions.length < 2) { alert('Provide at least 2 options'); return; }

    const storedBatch = JSON.parse(localStorage.getItem("selectedBatch"));
    
    // First generate the anchor container message text link wrapper 
    const { data: msgMsg, error: msgErr } = await supabase.from('chat_messages').insert({
      message: `📊 POLL: ${pollForm.question}`,
      user_id: currentUser.id,
      username: currentUser.name,
      batch_id: storedBatch?.batchId,
      is_poll: true
    }).select().single();

    if (msgErr || !msgMsg) return;

    await supabase.from('polls').insert({
      message_id: msgMsg.id,
      question: pollForm.question,
      options: validOptions,
      is_multiple: pollForm.isMultiple
    });

    setShowPollModal(false);
    setPollForm({ question: '', options: ['', ''], isMultiple: false });
  };

  const handleLogout = () => {
    localStorage.removeItem("anon_user");
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-900 text-white overflow-hidden select-none relative">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="font-bold text-base tracking-wide">{currentBatch.name}</h2>
            <p className="text-xs text-slate-400">{currentBatch.college}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {onlineCount > 0 && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">● {onlineCount} online</span>}
          <button onClick={handleLogout} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"><LogOut size={18} /></button>
        </div>
      </div>

      {/* MESSAGES VIEWPORT PANEL */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-28 scroll-smooth" onClick={() => { setContextMenu(null); setActiveEmojiPicker(null); }}>
        {messages.map((msg) => {
          const isMyMsg = msg.user_id === currentUser.id;
          const msgReactions = reactionsMap[msg.id] || [];
          const pollPack = pollsMap[msg.id];

          // Reaction Grouping Logic definitions
          const groupReactions = {};
          msgReactions.forEach(r => {
            if (!groupReactions[r.emoji]) groupReactions[r.emoji] = [];
            groupReactions[r.emoji].push(r);
          });

          return (
            <div key={msg.id} className={`flex flex-col ${isMyMsg ? 'items-end' : 'items-start'} space-y-1 relative group w-full`} data-id={msg.id}>
              
              {/* Username Stamp */}
              <span className="text-[11px] text-slate-400 px-1 font-medium">@{msg.username}</span>

              {/* Thread Core Nest Wrapper */}
              <div className="relative max-w-[85%]">
                
                {/* Reply UI Attachment */}
                {msg.reply_to && (
                  <div className="bg-slate-800/60 text-slate-300 text-xs px-3 py-1.5 rounded-t-xl border-l-2 border-blue-500 max-w-full opacity-80 truncate">
                    <span className="font-bold text-blue-400 block text-[10px]">↳ Reply to @{msg.reply_user}</span>
                    {msg.reply_text}
                  </div>
                )}

                {/* Main Message Content Box Container */}
                <div 
                  className={`p-3 rounded-2xl shadow-md cursor-pointer relative transition-all duration-150 ${
                    msg.reply_to ? 'rounded-tl-none' : ''
                  } ${
                    isMyMsg ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'
                  }`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ msg, x: e.clientX, y: e.clientY });
                  }}
                  onTouchStart={(e) => {
                    // Mobile long-press polyfill injection
                    window.contextTimer = setTimeout(() => {
                      setContextMenu({ msg, x: e.touches[0].clientX, y: e.touches[0].clientY });
                    }, 600);
                  }}
                  onTouchEnd={() => clearTimeout(window.contextTimer)}
                >
                  {/* Media Content Check */}
                  {msg.media_url && (
                    <img src={msg.media_url} alt="Shared content" className="rounded-lg mb-2 max-h-60 w-full object-cover" />
                  )}

                  {/* Render Poll interface block if dynamic wrapper matches context */}
                  {msg.is_poll && pollPack ? (
                    <div className="min-w-[220px] bg-slate-950/40 p-3 rounded-xl border border-slate-700/50">
                      <div className="font-semibold text-sm mb-1">📊 {pollPack.poll.question}</div>
                      <div className="text-[9px] text-slate-400 mb-3 uppercase tracking-wider">{pollPack.poll.is_multiple ? 'Multiple voting allowed' : 'Single vote selection'}</div>
                      <div className="space-y-2">
                        {pollPack.poll.options.map((opt, oIdx) => {
                          const opVotes = pollPack.votes.filter(v => v.option_index === oIdx);
                          const totalV = pollPack.votes.length;
                          const pct = totalV ? Math.round((opVotes.length / totalV) * 100) : 0;
                          const hasVoted = opVotes.some(v => v.user_id === currentUser.id);

                          return (
                            <div key={oIdx} className="space-y-1" onClick={() => castVote(msg.id, pollPack.poll.id, oIdx)}>
                              <div className="flex justify-between text-xs font-medium">
                                <span className={hasVoted ? 'text-blue-400' : 'text-slate-200'}>{hasVoted ? '✓ ' : ''}{opt}</span>
                                <span className="text-slate-400 text-[10px]">{opVotes.length} ({pct}%)</span>
                              </div>
                              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-300 ${hasVoted ? 'bg-blue-500' : 'bg-slate-600'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-2 font-medium">{pollPack.votes.length} responses captured</div>
                    </div>
                  ) : (
                    <span className="text-sm leading-relaxed whitespace-pre-wrap tracking-wide">{msg.message}</span>
                  )}

                  {/* Edited Status Label */}
                  {msg.edited && <span className="text-[9px] opacity-60 ml-2 font-semibold tracking-tight italic">edited</span>}
                </div>
{/* Render Horizontal Layout Cluster Reactions Row list inline */}
                {Object.entries(groupReactions).length > 0 && (
                  <div className={`flex items-center gap-1 mt-1 flex-wrap ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(groupReactions).map(([emoji, list]) => {
                      const userVoted = list.some(r => r.user_id === currentUser.id);
                      return (
                        <button 
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-transform active:scale-95 ${
                            userVoted ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-slate-800 border-slate-700/60 text-slate-300'
                          }`}
                        >
                          <span>{emoji}</span>
                          {list.length > 1 && <span className="text-[10px] font-bold">{list.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Double-tap utility shortcuts trigger layouts inside desktop configurations hooks */}
              <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-5 ${isMyMsg ? 'left-0 -translate-x-12' : 'right-0 translate-x-12'}`}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id);
                  }}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  <Smile size={16} />
                </button>
                <button onClick={() => setReplyTo(msg)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors text-xs font-bold">↳</button>
              </div>

              {/* Inline Mini-Floating Emoji Picker Engine Component inline wrapper rendering definitions */}
              {activeEmojiPicker === msg.id && (
                <div className={`absolute z-30 bg-slate-800 border border-slate-700 shadow-xl rounded-full px-2 py-1 flex gap-1.5 items-center top-[-35px] ${isMyMsg ? 'right-0' : 'left-0'} animate-[popIn_0.15s_cubic-bezier(0.34,1.56,0.64,1)]`}>
                  {REACTION_EMOJIS.map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => toggleReaction(msg.id, emoji)}
                      className="text-lg hover:scale-125 transition-transform p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* FOOTER TEXT INPUT AND CONTROL ACTION OVERLAY RENDER BAR */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-3 flex flex-col gap-2 z-20 shrink-0">
        
        {/* Active Structural Target Context Reply Bar Row */}
        {replyTo && (
          <div className="flex items-center justify-between bg-slate-800/80 border-l-4 border-blue-500 rounded-r-lg px-3 py-1.5 gap-3 animate-slide-in">
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold text-blue-400 block">Replying to @{replyTo.username}</span>
              <p className="text-xs text-slate-300 truncate">{replyTo.message || '📷 Media'}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-white shrink-0"><X size={16} /></button>
          </div>
        )}

        {/* Action Row Toolbar Controls */}
        <div className="flex items-center gap-3">
          <label className="text-slate-400 hover:text-white cursor-pointer transition-colors p-1 hover:bg-slate-800 rounded-lg">
            <Image size={22} />
            <input type="file" hidden accept="image/*" onChange={(e) => alert("File uploads call logic placeholder")} />
          </label>
          <button className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"><Mic size={22} /></button>
          <button onClick={() => navigate('/games')} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors"><Gamepad2 size={22} /></button>
          <button onClick={() => setShowPollModal(true)} className="text-xs bg-slate-800 hover:bg-slate-700 font-bold px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">📊 Poll</button>
          
          <div className="ml-auto flex items-center gap-2 w-full max-w-[65%]">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Write an anonymous post..." 
              className="w-full bg-slate-800 border-none outline-none focus:ring-1 focus:ring-blue-500 rounded-full px-4 py-2 text-sm text-white placeholder-slate-500"
            />
            {inputText.trim() && (
              <button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-transform active:scale-90 shadow-md shrink-0">
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC CONTEXT MENU POPUP LAYER OVERLAY */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setContextMenu(null)} />
          <div 
            className="fixed bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 min-w-[150px] overflow-hidden animate-[popIn_0.12s_ease-out]"
            style={{ 
              top: `${Math.min(contextMenu.y, window.innerHeight - 120)}px`, 
              left: `${Math.min(contextMenu.x, window.innerWidth - 170)}px` 
            }}
          >
            <button 
              onClick={() => handleEditMessage(contextMenu.msg.id, contextMenu.msg.message, !!contextMenu.msg.media_url)}
              className="w-full px-4 py-3 text-left text-sm hover:bg-slate-700 flex items-center gap-2 border-b border-slate-700/60"
            >
              <Edit3 size={14} /> {contextMenu.msg.media_url ? 'Caption' : 'Edit'}
            </button>
            {contextMenu.msg.user_id === currentUser.id && (
              <button 
                onClick={() => handleDeleteMessage(contextMenu.msg.id)}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        </>
      )}

      {/* INTERACTIVE POLL CREATOR COMPONENT SLIDE PANEL */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => setShowPollModal(false)}>
          <div className="w-full max-w-md bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold tracking-wide">📊 Create Custom Poll</h3>
              <button onClick={() => setShowPollModal(false)} className="text-slate-400 p-1 hover:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Question context</span>
              <input 
                type="text" 
                placeholder="Ask your query or set a topic..."
                value={pollForm.question}
                onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 text-sm border border-slate-700/60 outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase block">Options list</span>
              {pollForm.options.map((opt, index) => (
                <input 
                  key={index}
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const nextOpts = [...pollForm.options];
                    nextOpts[index] = e.target.value;
                    setPollForm({ ...pollForm, options: nextOpts });
                  }}
                  className="w-full bg-slate-800 text-white rounded-xl px-4 py-2.5 text-sm border border-slate-700/40 outline-none"
                />
              ))}
              <button 
                onClick={() => setPollForm({ ...pollForm, options: [...pollForm.options, ''] })}
                className="w-full py-2 border border-dashed border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                + Add Option
              </button>
            </div>

            <div className="flex items-center gap-3 py-1">
              <input 
                type="checkbox" 
                id="react-poll-mult"
                checked={pollForm.isMultiple}
                onChange={(e) => setPollForm({ ...pollForm, isMultiple: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="react-poll-mult" className="text-sm text-slate-300 font-medium select-none cursor-pointer">Allow voting for multiple selections</label>
            </div>

            <button 
              onClick={submitNewPoll}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.99] transition-transform"
            >
              Generate Live Poll Container
            </button>
          </div>
        </div>
      )}

      {/* KEYFRAME ANIMATIONS SUPPORT */}
      <style>{`
        @keyframes popIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

    </div>
  );
}
