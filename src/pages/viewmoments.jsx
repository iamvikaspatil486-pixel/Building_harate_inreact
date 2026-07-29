import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ViewMoments() {
  const navigate = useNavigate();

  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingIds, setViewingIds] = useState(new Set()); // moments currently being opened
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const currentStudentId = currentUser?.id || null;
  const currentBatchId = currentUser?.batchId || null;

  // Load moments for current batch + whether current student has viewed them
  const loadMoments = useCallback(async () => {
    if (!currentStudentId || !currentBatchId) {
      setError('No student or batch info found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // 1) Load all moments for this batch
    const { data: momentsData, error: momentsError } = await supabase
      .from('moments')
      .select(`
        id,
        image_url,
        caption,
        show_name,
        created_at,
        student_id,
        student:students!moments_student_id_fkey (
          id,
          full_name
        )
      `)
      .eq('batch_id', currentBatchId)
      .order('created_at', { ascending: false });

    if (momentsError) {
      setError('Failed to load moments.');
      setLoading(false);
      return;
    }

    const momentsList = momentsData || [];

    if (momentsList.length === 0) {
      setMoments([]);
      setLoading(false);
      return;
    }

    const momentIds = momentsList.map((m) => m.id);

    // 2) Load which of those moments this student already viewed
    const { data: viewsData, error: viewsError } = await supabase
      .from('moment_views')
      .select('moment_id')
      .eq('viewer_id', currentStudentId)
      .in('moment_id', momentIds);

    if (viewsError) {
      setError('Failed to load views.');
      setLoading(false);
      return;
    }

    const viewedMap = new Set((viewsData || []).map((v) => v.moment_id));

    // 3) Attach `alreadyViewed` flag to each moment
    const enriched = momentsList.map((m) => ({
      ...m,
      alreadyViewed: viewedMap.has(m.id),
    }));

    setMoments(enriched);
    setLoading(false);
  }, [currentStudentId, currentBatchId]);

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  // Called when student taps a moment to view it
  const handleViewMoment = async (moment) => {
    if (!currentStudentId) return;
    if (moment.alreadyViewed) return; // already consumed

    // Optimistic UI: mark as viewing to disable button
    setViewingIds((prev) => new Set(prev).add(moment.id));

    try {
      // Check again whether we already have a view record
      const { data: existing, error: checkError } = await supabase
        .from('moment_views')
        .select('id')
        .eq('moment_id', moment.id)
        .eq('viewer_id', currentStudentId)
        .maybeSingle();

      if (checkError) {
        console.error(checkError);
        setError('Failed to check view.');
        return;
      }

      if (!existing) {
        // Insert a view record (1-view only enforced by unique(moment_id, viewer_id))
        const { error: insertError } = await supabase
          .from('moment_views')
          .insert({
            moment_id: moment.id,
            viewer_id: currentStudentId,
          });

        if (insertError) {
          // unique violation means another tab just inserted it
          if (insertError.code !== '23505') {
            console.error(insertError);
            setError('Failed to mark as viewed.');
            return;
          }
        }
      }

      // At this point, treat it as viewed and show image once.
      // In a real app you can open a modal with the image here.
      // For now we'll just update UI state to hide it afterward.
      setMoments((prev) =>
        prev.map((m) =>
          m.id === moment.id ? { ...m, alreadyViewed: true } : m
        )
      );
    } finally {
      setViewingIds((prev) => {
        const next = new Set(prev);
        next.delete(moment.id);
        return next;
      });
    }
  };

  const hasMoments = moments.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-white/10 flex-shrink-0 bg-gray-950 z-[1000]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white/10 text-white active:scale-90 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="font-black text-white text-sm">Moments ✨</p>
          <p className="text-[11px] text-white/40">
            {hasMoments ? `${moments.length} moment${moments.length > 1 ? 's' : ''}` : 'No moments yet in your batch'}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="w-full flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-400" size={28} />
          </div>
        )}

        {!loading && !hasMoments && (
          <div className="mt-8 text-center text-xs text-white/40">
            No moments in your batch yet. Be the first to post one!
          </div>
        )}

        {error && (
          <div className="bg-red-500/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {!loading &&
          moments.map((moment) => {
            const isOwner = moment.student_id === currentStudentId;
            const displayName =
              moment.show_name && moment.student?.full_name
                ? moment.student.full_name
                : 'Anonymous';

            const isViewing = viewingIds.has(moment.id);

            // If 1-view-only and already viewed (and not owner), show expired card
            if (moment.alreadyViewed && !isOwner) {
              return (
                <div
                  key={moment.id}
                  className="rounded-2xl bg-white/5 border border-white/5 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-white/70">
                      Moment expired
                    </p>
                    <p className="text-[11px] text-white/40">
                      You already viewed this moment.
                    </p>
                  </div>
                  <EyeOff size={18} className="text-white/30" />
                </div>
              );
            }

            return (
              <div
                key={moment.id}
                className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden"
              >
                {/* Header */}
                <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold">
                      {isOwner ? 'You' : displayName}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {moment.caption || 'Moment'}
                    </p>
                  </div>
                </div>

                {/* Image (only if not yet viewed or if owner) */}
                <div className="relative">
                  <img
                    src={moment.image_url}
                    alt="Moment"
                    className="w-full max-h-72 object-cover bg-black"
                  />

                  {!isOwner && (
                    <button
                      onClick={() => handleViewMoment(moment)}
                      disabled={isViewing}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/60 text-[11px] font-semibold flex items-center gap-1 active:scale-95 disabled:opacity-60"
                    >
                      {isViewing ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Opening…
                        </>
                      ) : (
                        <>
                          <Eye size={14} /> View once
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
