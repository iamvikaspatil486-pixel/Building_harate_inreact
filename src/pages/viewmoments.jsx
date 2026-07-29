import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, X, Send, Loader2, Eye, EyeOff, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

const timeAgo = (ts) => {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const GRAD = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-pink-500',
];
const grad = (name = '') => GRAD[(name?.charCodeAt(0) || 0) % GRAD.length];

// ── Upload Sheet ──────────────────────────────────────────────────────────────
function UploadSheet({ onClose, onUploaded }) {
  const fileInputRef = useRef();
  const [image, setImage] = useState(null); // { file, previewUrl }
  const [caption, setCaption] = useState('');
  const [showName, setShowName] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage({ file, previewUrl: URL.createObjectURL(file) });
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!image) { setError('Pick an image first'); return; }
    if (!currentUser?.id) { setError('Not logged in'); return; }
    setUploading(true);
    setError('');
    try {
      const ext = image.file.name.split('.').pop() || 'jpg';
      const path = `${currentUser.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('moments').upload(path, image.file, { contentType: image.file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('moments').getPublicUrl(path);
      const { error: insertErr } = await supabase.from('moments').insert({
        student_id: currentUser.id,
        batch_id: batch?.batchId || null,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
        show_name: showName,
      });
      if (insertErr) throw insertErr;
      URL.revokeObjectURL(image.previewUrl);
      onUploaded();
      onClose();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end"
      style={{ backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-white rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">New Moment</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

          {/* Image picker */}
          <div>
            {image ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                <img src={image.previewUrl} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => { URL.revokeObjectURL(image.previewUrl); setImage(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-400 transition active:scale-95"
                style={{ aspectRatio: '4/3' }}
              >
                <Camera size={32} />
                <p className="text-sm font-semibold">Tap to pick photo</p>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Caption (optional)</label>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something about this moment…"
              maxLength={100}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 transition"
            />
          </div>

          {/* Show name toggle */}
          <button
            onClick={() => setShowName((v) => !v)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition active:scale-95 ${
              showName ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            {showName ? <Eye size={18} className="text-blue-500 flex-shrink-0" /> : <EyeOff size={18} className="text-gray-400 flex-shrink-0" />}
            <div className="text-left flex-1">
              <p className={`text-sm font-bold ${showName ? 'text-blue-700' : 'text-gray-700'}`}>
                {showName ? 'Showing your name' : 'Posted anonymously'}
              </p>
              <p className="text-xs text-gray-400">Tap to toggle</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${showName ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${showName ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </div>

        <div className="px-4 py-3 border-t border-gray-100" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleUpload}
            disabled={!image || uploading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {uploading ? 'Uploading…' : 'Share Moment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Moment Viewer ─────────────────────────────────────────────────────────────
function MomentViewer({ moments, startIndex, onClose, onViewed }) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const moment = moments[idx];

  // Mark as viewed and auto-advance
  useEffect(() => {
    if (!moment) return;
    markViewed(moment.id);

    // Progress bar animation over 5 seconds
    setProgress(0);
    const start = Date.now();
    const duration = 5000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        progressRef.current = requestAnimationFrame(tick);
      } else {
        // Auto advance
        if (idx < moments.length - 1) {
          setIdx((i) => i + 1);
        } else {
          onClose();
        }
      }
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => { if (progressRef.current) cancelAnimationFrame(progressRef.current); };
  }, [idx, moment?.id]);

  const markViewed = async (momentId) => {
    if (!currentUser?.id) return;
    await supabase.from('moment_views').upsert({
      moment_id: momentId,
      viewer_id: currentUser.id,
    }, { onConflict: 'moment_id,viewer_id' });
    onViewed(momentId);
  };

  const prev = () => {
    if (progressRef.current) cancelAnimationFrame(progressRef.current);
    if (idx > 0) setIdx((i) => i - 1);
  };

  const next = () => {
    if (progressRef.current) cancelAnimationFrame(progressRef.current);
    if (idx < moments.length - 1) setIdx((i) => i + 1);
    else onClose();
  };

  if (!moment) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 px-3 pt-3 pb-2 flex-shrink-0">
        {moments.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad(moment.students?.full_name || '')} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
          {moment.show_name ? (moment.students?.full_name?.[0] || '?').toUpperCase() : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold truncate">
            {moment.show_name ? (moment.students?.full_name || 'Unknown') : 'Anonymous'}
          </p>
          <p className="text-white/50 text-[10px]">{timeAgo(moment.created_at)}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white p-1">
          <X size={20} />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative overflow-hidden">
        <img src={moment.image_url} alt="" className="w-full h-full object-contain" />

        {/* Tap zones */}
        <button onClick={prev} className="absolute left-0 top-0 h-full w-1/3" />
        <button onClick={next} className="absolute right-0 top-0 h-full w-1/3" />
      </div>

      {/* Caption */}
      {moment.caption && (
        <div className="px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm leading-relaxed">{moment.caption}</p>
        </div>
      )}

      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} />
    </div>
  );
}

// ── Moments Page ──────────────────────────────────────────────────────────────
export default function ViewMoments() {
  const navigate = useNavigate();
  const [moments, setMoments] = useState([]);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewer, setViewer] = useState(null); // { moments, startIndex }

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const batchId = batch?.batchId;

  useEffect(() => {
    fetchMoments();
  }, []);

  const fetchMoments = async () => {
    setLoading(true);
    if (!batchId) { setLoading(false); return; }

    // Fetch all moments for this batch
    const { data: allMoments } = await supabase
      .from('moments')
      .select('id, image_url, caption, show_name, created_at, student_id, students(full_name)')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: false });

    // Fetch which ones current user has viewed
    const { data: views } = await supabase
      .from('moment_views')
      .select('moment_id')
      .eq('viewer_id', currentUser?.id || 'none');

    const viewedSet = new Set((views || []).map((v) => v.moment_id));
    setViewedIds(viewedSet);
    setMoments(allMoments || []);
    setLoading(false);
  };

  const handleViewed = (momentId) => {
    setViewedIds((prev) => new Set([...prev, momentId]));
  };

  // Group moments by student
  const grouped = moments.reduce((acc, m) => {
    const key = m.student_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // My moments first, then others
  const myMoments = grouped[currentUser?.id] || [];
  const otherGroups = Object.entries(grouped).filter(([id]) => id !== currentUser?.id);

  const openViewer = (momentsList, startIdx = 0) => {
    setViewer({ moments: momentsList, startIndex: startIdx });
  };

  const unviewedCount = (momentsList) =>
    momentsList.filter((m) => !viewedIds.has(m.id) && m.student_id !== currentUser?.id).length;

  return (
    <>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div className="min-h-screen bg-white flex flex-col pb-24">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
          <h1 className="font-bold text-gray-900 text-base">✨ Moments</h1>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition"
          >
            <Plus size={14} /> New
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <main className="px-4 py-4 space-y-6">

            {/* My moments */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3">Your Moments</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {/* Add new button */}
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition"
                >
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                    <Plus size={22} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">Add</span>
                </button>

                {myMoments.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => openViewer(myMoments, i)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-blue-400">
                      <img src={m.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{timeAgo(m.created_at)}</span>
                  </button>
                ))}

                {myMoments.length === 0 && (
                  <p className="text-gray-300 text-xs self-center">No moments yet</p>
                )}
              </div>
            </div>

            {/* Batchmates moments */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-3">Batchmates</p>

              {otherGroups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <p className="text-3xl">📸</p>
                  <p className="text-gray-500 text-sm font-semibold">No moments from batchmates yet</p>
                  <p className="text-gray-400 text-xs">Be the first to share!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {otherGroups.map(([studentId, studentMoments]) => {
                    const first = studentMoments[0];
                    const name = first.show_name ? (first.students?.full_name || 'Unknown') : 'Anonymous';
                    const unviewed = unviewedCount(studentMoments);
                    const allViewed = unviewed === 0;

                    return (
                      <button
                        key={studentId}
                        onClick={() => openViewer(studentMoments, 0)}
                        className="flex flex-col gap-1 active:scale-95 transition"
                      >
                        <div className={`relative rounded-2xl overflow-hidden border-2 ${allViewed ? 'border-gray-200' : 'border-blue-500'}`} style={{ aspectRatio: '1/1' }}>
                          <img src={first.image_url} alt="" className="w-full h-full object-cover" />
                          {/* Unviewed badge */}
                          {!allViewed && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-black">
                              {unviewed}
                            </div>
                          )}
                          {/* Viewed overlay */}
                          {allViewed && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Eye size={16} className="text-white/70" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-600 font-semibold truncate text-left">
                          {name}
                        </p>
                        <p className="text-[10px] text-gray-400 text-left -mt-0.5">
                          {studentMoments.length} moment{studentMoments.length > 1 ? 's' : ''}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {/* Upload sheet */}
      {showUpload && (
        <UploadSheet onClose={() => setShowUpload(false)} onUploaded={fetchMoments} />
      )}

      {/* Viewer */}
      {viewer && (
        <MomentViewer
          moments={viewer.moments}
          startIndex={viewer.startIndex}
          onClose={() => { setViewer(null); fetchMoments(); }}
          onViewed={handleViewed}
        />
      )}
    </>
  );
}

