import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
} from 'lucide-react';

export default function CreateMoment() {
  const navigate = useNavigate();

  // Read current student + batch from localStorage
  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const currentStudentId = currentUser?.id || null;
  const currentBatchId = currentUser?.batchId || null;

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [showName, setShowName] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If somehow user is not found, show simple message
  if (!currentStudentId || !currentBatchId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-950 text-white">
        <header className="flex items-center gap-3 px-4 h-14 border-b border-white/10 flex-shrink-0 bg-gray-950">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/10 text-white active:scale-90 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="font-black text-white text-sm">Create Moment</p>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 text-center text-xs text-white/50">
          Missing student or batch info. Please log in again.
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setError('');
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl('');
    setCaption('');
    setShowName(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please choose an image.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 1. Upload image to Supabase Storage
      // Make sure you have a bucket named "moments" in Supabase Storage [web:71][web:75]
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${currentBatchId}/${currentStudentId}/${crypto.randomUUID()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('moments') // bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setError('Failed to upload image.');
        setSubmitting(false);
        return;
      }

      // 2. Get public URL (or use signed URLs if bucket is private) [web:71][web:75]
      const {
        data: { publicUrl },
      } = supabase.storage.from('moments').getPublicUrl(uploadData.path);

      // 3. Insert moment row
      const { error: insertError } = await supabase.from('moments').insert({
        student_id: currentStudentId,
        batch_id: currentBatchId,
        image_url: publicUrl,
        caption: caption || null,
        show_name: showName,
      });

      if (insertError) {
        console.error(insertError);
        setError('Failed to create moment.');
        setSubmitting(false);
        return;
      }

      // 4. Success: clear and go back (or push to moments page)
      resetForm();
      navigate(-1); // or navigate('/moments');
    } catch (err) {
      console.error(err);
      setError('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-white/10 flex-shrink-0 bg-gray-950">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/10 text-white active:scale-90 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="font-black text-white text-sm">Create Moment ✨</p>
          <p className="text-[11px] text-white/40">
            Share a 1‑view image with your batchmates
          </p>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image picker */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs font-semibold mb-2">Moment image</p>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full max-h-80 object-cover bg-black"
                />
                <button
                  type="button"
                  onClick={resetForm}
                  className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5 active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-white/15 rounded-xl py-8 cursor-pointer active:scale-[0.99] transition">
                <ImageIcon size={28} className="mb-2 text-white/60" />
                <p className="text-xs font-semibold">Tap to choose image</p>
                <p className="text-[11px] text-white/40 mt-1">
                  JPG / PNG, a few MB max
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Caption */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
            <p className="text-xs font-semibold mb-2">Caption (optional)</p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full bg-black/20 text-xs rounded-xl px-3 py-2 outline-none border border-white/10 focus:border-emerald-400/80"
              placeholder="Say something about this moment..."
            />
          </div>

          {/* Show name toggle */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">
                Show your name to batchmates
              </p>
              <p className="text-[11px] text-white/40">
                Turn off to post as anonymous.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowName((v) => !v)}
              className={`w-11 h-6 flex items-center rounded-full px-0.5 transition-all ${
                showName ? 'bg-emerald-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white flex items-center justify-center transform transition-transform ${
                  showName ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {showName ? (
                  <Check size={13} className="text-emerald-500" />
                ) : (
                  <X size={13} className="text-gray-500" />
                )}
              </div>
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !file}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-emerald-500 text-white font-black text-sm active:scale-95 disabled:opacity-60 transition"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Posting…
                </>
              ) : (
                <>Post moment</>
              )}
            </button>
            <p className="mt-2 text-[11px] text-white/30 text-center">
              This moment will be visible only to your batchmates, and each of
              them can view it once.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
