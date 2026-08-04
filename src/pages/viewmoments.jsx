import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, X, Send, Loader2, Eye, EyeOff, Camera, FlipHorizontal, Image as ImageIcon, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';

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
      alert('Could not access camera.');
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
      </div>
      <div className="flex items-center justify-between px-8 py-6 bg-black">
        <button onClick={onClose} className="p-3 rounded-full bg-white/10 text-white">
          <X size={20} />
        </button>
        <button onClick={capture} disabled={!ready} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-fuchsia-500" />
        </button>
        <button onClick={flipCamera} className="p-3 rounded-full bg-white/10 text-white">
          <FlipHorizontal size={20} />
        </button>
      </div>
    </div>
  );
}

// ── Upload Sheet ──────────────────────────────────────────────────────────────
function UploadSheet({ onClose, onUploaded }) {
  const fileInputRef = useRef();
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [showName, setShowName] = useState(true);
  const [uploading, setUploading] = useState(false);
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
    if (!image || !currentUser?.id) return;
    setUploading(true);
    try {
      const ext = image.file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${currentUser.id}/${Date.now()}.${ext}`;
      
      const { error: upErr } = await supabase.storage.from('moments').upload(path, image.file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('moments').getPublicUrl(path);

      // Set expiration to exactly 20 hours from creation
      const expiresAt = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();

      await supabase.from('moments').insert({
        student_id: currentUser.id,
        batch_id: batch?.batchId || null,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
        show_name: showName,
        expires_at: expiresAt,
      });

      URL.revokeObjectURL(image.previewUrl);
      onUploaded();
      onClose();
    } catch (err) {
      alert(err.message || 'Upload failed');
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

      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
        <div className="w-full bg-slate-900 border-t border-white/10 rounded-t-3xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="font-bold text-white text-base">New Moment</h3>
            <button onClick={onClose} className="text-slate-400"><X size={20} /></button>
          </div>

          {!image ? (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center gap-2">
                <ImageIcon size={28} className="text-cyan-400" />
                <span className="text-xs text-slate-300 font-bold">Gallery</span>
              </button>
              <button onClick={() => setShowWebcam(true)} className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center gap-2">
                <Camera size={28} className="text-fuchsia-400" />
                <span className="text-xs text-slate-300 font-bold">Camera</span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden h-48 bg-black">
              <img src={image.previewUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setImage(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white">
                <X size={16} />
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add caption..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-400"
          />

          <button
            onClick={() => setShowName(!showName)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300"
          >
            <span className="flex items-center gap-2">
              {showName ? <Eye size={16} className="text-cyan-400" /> : <EyeOff size={16} className="text-slate-400" />}
              {showName ? 'Showing Name' : 'Posting Anonymously'}
            </span>
            <span className="text-xs text-slate-500">Toggle</span>
          </button>

          <button
            onClick={handleUpload}
            disabled={!image || uploading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {uploading ? 'Sharing...' : 'Send Moment'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Moments() {
  const navigate = useNavigate();
  const [unviewedMoments, setUnviewedMoments] = useState([]);
  const [myMoments, setMyMoments] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const batchId = batch?.batchId;

  useEffect(() => { fetchMoments(); }, []);

  // ── Auto-delete moments older than 20 hours (Bucket + Table) ───────────
  const purgeExpiredMoments = async () => {
    try {
      const now = new Date().toISOString();
      const { data: expired } = await supabase
        .from('moments')
        .select('id, image_url')
        .lte('expires_at', now);

      if (expired && expired.length > 0) {
        const filePaths = expired.map((m) => {
          const parts = m.image_url.split('/moments/');
          return parts.length > 1 ? parts[1] : null;
        }).filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage.from('moments').remove(filePaths);
        }

        const expiredIds = expired.map((m) => m.id);
        await supabase.from('moments').delete().in('id', expiredIds);
      }
    } catch {
      // Background cleanup error handled silently
    }
  };

  const fetchMoments = async () => {
    setLoading(true);
    if (!batchId || !currentUser?.id) { setLoading(false); return; }

    // 1. First trigger auto-purge for expired moments (>20 hours)
    await purgeExpiredMoments();

    // 2. Fetch all valid active moments for current batch
    const { data: allActive } = await supabase
      .from('moments')
      .select('id, image_url, caption, show_name, created_at, student_id, students(full_name)')
      .eq('batch_id', batchId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // 3. Fetch moment IDs viewed by current user
    const { data: views } = await supabase
      .from('moment_views')
      .select('moment_id')
      .eq('viewer_id', currentUser.id);

    const viewedSet = new Set((views || []).map((v) => v.moment_id));

    // 4. Filter for UNVIEWED moments only (excluding user's own from main cycle if preferred, or keeping unviewed ones)
    const unseen = (allActive || []).filter((m) => !viewedSet.has(m.id));
    
    // 5. Separate current user's active uploaded moments for bottom tray
    const mine = (allActive || []).filter((m) => m.student_id === currentUser.id);

    setUnviewedMoments(unseen);
    setMyMoments(mine);
    setCurrentIdx(0);

    // Automatically mark the initial displayed moment as viewed
    if (unseen.length > 0) {
      markAsViewed(unseen[0].id);
    }

    setLoading(false);
  };

  // Mark viewed in Database
  const markAsViewed = async (momentId) => {
    if (!currentUser?.id || !momentId) return;
    await supabase.from('moment_views').upsert(
      { moment_id: momentId, viewer_id: currentUser.id },
      { onConflict: 'moment_id,viewer_id' }
    );
  };

  const handleNext = () => {
    if (unviewedMoments.length === 0) return;

    const nextIndex = currentIdx + 1;
    if (nextIndex < unviewedMoments.length) {
      setCurrentIdx(nextIndex);
      markAsViewed(unviewedMoments[nextIndex].id);
    } else {
      // All fetched unviewed moments consumed
      setUnviewedMoments([]);
    }
  };

  const handleDelete = async (momentId, imageUrl) => {
    try {
      const urlParts = imageUrl.split('/moments/');
      if (urlParts.length > 1) {
        await supabase.storage.from('moments').remove([urlParts[1]]);
      }
      await supabase.from('moments').delete().eq('id', momentId);
      
      setMyMoments((prev) => prev.filter((m) => m.id !== momentId));
      setUnviewedMoments((prev) => prev.filter((m) => m.id !== momentId));
    } catch {
      alert('Could not delete moment.');
    }
  };

  const currentMoment = unviewedMoments[currentIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 max-w-md mx-auto">
      {/* 1. Header: Back Arrow, Moments Title, Plus Button */}
      <header className="flex items-center justify-between pb-3 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="p-2 text-slate-300">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-black tracking-wide bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
          Moments
        </h1>
        <button
          onClick={() => setShowUpload(true)}
          className="w-9 h-9 rounded-full border border-cyan-400/50 flex items-center justify-center text-cyan-300 active:scale-95 transition"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* 2. Central Viewing Box (Unviewed Moments Only) */}
      <main className="flex-1 flex flex-col justify-center my-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-fuchsia-400" />
          </div>
        ) : currentMoment ? (
          <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-4 flex flex-col gap-3 shadow-2xl">
            {/* Uploader Name */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-cyan-300">
                {currentMoment.show_name ? (currentMoment.students?.full_name || 'Student') : 'Someone'}
              </span>
              <span className="text-xs text-slate-500">
                {currentIdx + 1} / {unviewedMoments.length}
              </span>
            </div>

            {/* Moment Image Display */}
            <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-black border border-white/5">
              <img src={currentMoment.image_url} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Caption & Next Button Container */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 truncate">
                {currentMoment.caption || 'No caption'}
              </div>
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-3xl flex flex-col items-center gap-2">
            <p className="text-2xl">🎉</p>
            <p className="text-slate-300 text-sm font-semibold">All caught up!</p>
            <p className="text-slate-500 text-xs">No new unviewed moments available.</p>
          </div>
        )}
      </main>

      {/* 3. Bottom Tray: "My Moments" with Delete options */}
      <section className="border-t border-white/10 pt-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">My Moments</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {myMoments.map((m) => (
            <div key={m.id} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-white/20 flex-shrink-0">
              <img src={m.image_url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(m.id, m.image_url)}
                className="absolute inset-0 bg-black/50 opacity-90 hover:opacity-100 flex items-center justify-center text-rose-400 transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {myMoments.length === 0 && (
            <span className="text-xs text-slate-600 self-center">No uploaded moments</span>
          )}
        </div>
      </section>

      {showUpload && (
        <UploadSheet onClose={() => setShowUpload(false)} onUploaded={fetchMoments} />
      )}
    </div>
  );
}

