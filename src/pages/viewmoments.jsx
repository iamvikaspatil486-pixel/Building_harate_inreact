import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, X, Send, Loader2, Eye, EyeOff, Camera, FlipHorizontal, Image as ImageIcon } from 'lucide-react';

// ── Webcam Capture ────────────────────────────────────────────────────────────
function WebcamCapture({ onCapture, onClose }) {
  const videoRef = useRef();
  const streamRef = useRef();
  const [ready, setReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user');

  const startCamera = async (mode) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      alert('Could not access camera. Check permissions.');
      onClose();
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [facingMode]);

  const flipCamera = () => {
    setReady(false);
    setFacingMode((m) => (m === 'user' ? 'environment' : 'user'));
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], `moment_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture({ file, previewUrl });
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* soft glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-fuchsia-500/10 via-transparent to-cyan-500/10" />

      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 size={32} className="animate-spin text-fuchsia-300" />
          </div>
        )}

        {/* top label */}
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-bold tracking-wide">
            Capture your moment
          </div>
        </div>
      </div>

      {/* controls */}
      <div
        className="relative flex items-center justify-between px-8 py-7 bg-gradient-to-t from-black via-black/95 to-transparent"
        style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90 transition"
        >
          <X size={20} />
        </button>

        <button
          onClick={capture}
          disabled={!ready}
          className="w-[78px] h-[78px] rounded-full border-[3px] border-white/90 flex items-center justify-center active:scale-90 transition disabled:opacity-40 shadow-[0_0_30px_rgba(236,72,153,0.35)]"
        >
          <div className="w-[58px] h-[58px] rounded-full bg-gradient-to-br from-fuchsia-400 to-cyan-400" />
        </button>

        <button
          onClick={flipCamera}
          className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90 transition"
        >
          <FlipHorizontal size={18} />
        </button>
      </div>
    </div>
  );
}

const timeAgo = (ts) => {
  if (!ts) return 'just now';

  // Convert UTC to local Indian time properly
  const utcDate = new Date(ts);
  const localDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000)); // Add IST offset

  const now = new Date();
  const diffMs = now - localDate;
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 0) return 'just now';           // Safety for small differences
  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  
  return `${Math.floor(diffSeconds / 86400)}d ago`;
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
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [showName, setShowName] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);

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
      const path = `\( {currentUser.id}/ \){Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('moments')
        .upload(path, image.file, { contentType: image.file.type });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('moments').getPublicUrl(path);

      const { error: insertErr } = await supabase.from('moments').insert({
        student_id: currentUser.id,
        batch_id: batch?.batchId || null,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
        show_name: showName,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
    <>
      {showWebcam && (
        <WebcamCapture
          onCapture={(captured) => { setImage(captured); setShowWebcam(false); }}
          onClose={() => setShowWebcam(false)}
        />
      )}

      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-full bg-slate-950 border-t border-white/10 rounded-t-[28px] max-h-[92vh] flex flex-col shadow-2xl"
          style={{ animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)' }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="font-bold text-white text-sm">New Moment</p>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-3 rounded-2xl">
                {error}
              </div>
            )}

            <div>
              {image ? (
                <div className="relative w-full rounded-3xl overflow-hidden bg-white/5" style={{ aspectRatio: '4/3' }}>
                  <img src={image.previewUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { URL.revokeObjectURL(image.previewUrl); setImage(null); }}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-3xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 text-slate-300 active:scale-95 transition"
                    style={{ aspectRatio: '1/1' }}
                  >
                    <ImageIcon size={28} className="text-cyan-300" />
                    <p className="text-xs font-bold">Gallery</p>
                  </button>
                  <button
                    onClick={() => setShowWebcam(true)}
                    className="rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/15 to-cyan-500/15 flex flex-col items-center justify-center gap-2 text-slate-200 active:scale-95 transition"
                    style={{ aspectRatio: '1/1' }}
                  >
                    <Camera size={28} className="text-fuchsia-300" />
                    <p className="text-xs font-bold">Camera</p>
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Caption
              </label>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a line..."
                maxLength={100}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-fuchsia-400/60 transition"
              />
            </div>

            <button
              onClick={() => setShowName((v) => !v)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition active:scale-95 ${
                showName
                  ? 'bg-cyan-500/10 border-cyan-400/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {showName ? <Eye size={18} className="text-cyan-300" /> : <EyeOff size={18} className="text-slate-400" />}
              <div className="text-left flex-1">
                <p className={`text-sm font-bold ${showName ? 'text-cyan-200' : 'text-slate-200'}`}>
                  {showName ? 'Showing your name' : 'Post as Someone'}
                </p>
                <p className="text-xs text-slate-500">Tap to toggle</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors ${showName ? 'bg-cyan-400' : 'bg-white/20'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow mt-0.5 transition-transform ${showName ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </div>

          <div className="px-4 py-3 border-t border-white/5" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
            <button
              onClick={handleUpload}
              disabled={!image || uploading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {uploading ? 'Uploading…' : 'Share Moment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Moment Viewer ─────────────────────────────────────────────────────────────
function MomentViewer({ moments, startIndex, onClose, onViewed }) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const moment = moments[idx];

  useEffect(() => {
    if (!moment) return;
    markViewed(moment.id);
    setProgress(0);
    const start = Date.now();
    const duration = 5000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) progressRef.current = requestAnimationFrame(tick);
      else if (idx < moments.length - 1) setIdx((i) => i + 1);
      else onClose();
    };
    progressRef.current = requestAnimationFrame(tick);
    return () => { if (progressRef.current) cancelAnimationFrame(progressRef.current); };
  }, [idx, moment?.id]);

  const markViewed = async (momentId) => {
    if (!currentUser?.id) return;
    await supabase.from('moment_views').upsert(
      { moment_id: momentId, viewer_id: currentUser.id },
      { onConflict: 'moment_id,viewer_id' }
    );
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

  const displayName = moment.show_name ? (moment.students?.full_name || 'Unknown') : 'Someone';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex gap-1 px-3 pt-3 pb-2">
        {moments.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad(displayName)} flex items-center justify-center text-white text-xs font-bold`}>
          {displayName[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold truncate">{displayName}</p>
          <p className="text-white/50 text-[10px]">{timeAgo(moment.created_at)}</p>
        </div>
        <button onClick={onClose} className="text-white/70 p-1">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <img src={moment.image_url} alt="" className="w-full h-full object-contain" />
        <button onClick={prev} className="absolute left-0 top-0 h-full w-1/3" />
        <button onClick={next} className="absolute right-0 top-0 h-full w-1/3" />
      </div>

      {moment.caption && (
        <div className="px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm leading-relaxed">{moment.caption}</p>
        </div>
      )}
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Moments() {
  const navigate = useNavigate();
  const [moments, setMoments] = useState([]);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewer, setViewer] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const batchId = batch?.batchId;

  useEffect(() => { fetchMoments(); }, []);

  const fetchMoments = async () => {
    setLoading(true);
    if (!batchId) { setLoading(false); return; }

    const { data: allMoments } = await supabase
      .from('moments')
      .select('id, image_url, caption, show_name, created_at, student_id, students(full_name)')
      .eq('batch_id', batchId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    const { data: views } = await supabase
      .from('moment_views')
      .select('moment_id')
      .eq('viewer_id', currentUser?.id || 'none');

    setViewedIds(new Set((views || []).map((v) => v.moment_id)));
    setMoments(allMoments || []);
    setLoading(false);
  };

  const handleViewed = (momentId) => {
    setViewedIds((prev) => new Set([...prev, momentId]));
  };

  const grouped = moments.reduce((acc, m) => {
    if (!acc[m.student_id]) acc[m.student_id] = [];
    acc[m.student_id].push(m);
    return acc;
  }, {});

  const myMoments = grouped[currentUser?.id] || [];
  const otherGroups = Object.entries(grouped).filter(([id]) => id !== currentUser?.id);

  const openViewer = (list, startIdx = 0) => setViewer({ moments: list, startIndex: startIdx });
  const unviewedCount = (list) =>
    list.filter((m) => !viewedIds.has(m.id) && m.student_id !== currentUser?.id).length;

  return (
    <>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col pb-24 relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-fuchsia-500/20 blur-[110px] rounded-full" />
        <div className="pointer-events-none absolute bottom-24 right-0 w-56 h-56 bg-cyan-500/15 blur-[90px] rounded-full" />

        {/* Header */}
        <header className="sticky top-0 z-10 px-4 h-14 flex items-center justify-between bg-slate-950/70 backdrop-blur-xl border-b border-white/5">
          <button onClick={() => navigate(-1)} className="text-slate-400 text-sm font-medium">
            ← Back
          </button>
          <h1 className="font-black text-sm tracking-wide bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
            college life MOMENTS
          </h1>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition"
          >
            <Plus size={14} /> New
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={26} className="animate-spin text-fuchsia-300" />
          </div>
        ) : (
          <main className="relative z-10 px-4 py-5 space-y-7">
            {/* Your Moments */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-3">
                Your Moments
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                <button
             onClick={() => setShowUpload(true)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition"
                >
                  <div className="w-16 h-16 rounded-2xl border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-slate-400">
                    <Plus size={22} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Add</span>
                </button>

                {myMoments.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => openViewer(myMoments, i)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition"
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-cyan-400/70">
                      <img src={m.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{timeAgo(m.created_at)}</span>
                  </button>
                ))}

                {myMoments.length === 0 && (
                  <p className="text-slate-600 text-xs self-center">No moments yet</p>
                )}
              </div>
            </div>

            {/* Batchmates */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-3">
                Batchmates
              </p>

              {otherGroups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center">
                  <p className="text-3xl">✨</p>
                  <p className="text-slate-300 text-sm font-semibold">No moments yet</p>
                  <p className="text-slate-500 text-xs">Be the first to drop one</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  {otherGroups.map(([studentId, studentMoments]) => {
                    const first = studentMoments[0];
                    const name = first.show_name ? (first.students?.full_name || 'Unknown') : 'Someone';
                    const unviewed = unviewedCount(studentMoments);
                    const allViewed = unviewed === 0;

                    return (
                      <button
                        key={studentId}
                        onClick={() => openViewer(studentMoments, 0)}
                        className="flex flex-col gap-1 active:scale-95 transition"
                      >
                        <div
                          className={`relative rounded-2xl overflow-hidden border-2 ${
                            allViewed ? 'border-white/10' : 'border-fuchsia-400/80'
                          }`}
                          style={{ aspectRatio: '1/1' }}
                        >
                          <img src={first.image_url} alt="" className="w-full h-full object-cover" />
                          {!allViewed && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-fuchsia-500 flex items-center justify-center text-white text-[9px] font-black">
                              {unviewed}
                            </div>
                          )}
                          {allViewed && (
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                              <Eye size={15} className="text-white/70" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-300 font-semibold truncate text-left">{name}</p>
                        <p className="text-[10px] text-slate-500 text-left -mt-0.5">
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

      {showUpload && (
        <UploadSheet onClose={() => setShowUpload(false)} onUploaded={fetchMoments} />
      )}

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
