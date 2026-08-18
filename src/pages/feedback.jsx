import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Feedback() {
  const navigate = useNavigate();

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSendFeedback(e) {
    e.preventDefault();

    const message = feedbackMessage.trim();

    if (!message) {
      setError('Please write your feedback before sending.');
      setSuccess('');
      return;
    }

    if (message.length < 5) {
      setError('Feedback must contain at least 5 characters.');
      setSuccess('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Get user error:', userError);
      }

      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          feedback: message,
          user_id: user?.id || null,
        });

      if (insertError) {
        console.error('Feedback insert error:', insertError);
        setError(insertError.message);
        return;
      }

      setFeedbackMessage('');
      setSuccess('Thank you. Your feedback has been sent successfully.');
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-6">
      <div className="mx-auto w-full max-w-xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-slate-300 transition hover:border-cyan-500 hover:text-cyan-400 active:scale-95"
        >
          <span className="text-xl leading-none">←</span>
          Back
        </button>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl sm:p-7">
          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-5 text-center">
            <h1 className="text-2xl font-black uppercase tracking-wide text-cyan-400">
              Feedback
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Tell us if someone has taken your roll number or share any
              problem with us.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSendFeedback} className="space-y-4">
            <div>
              <label
                htmlFor="feedback"
                className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500"
              >
                Write your feedback
              </label>

              <textarea
                id="feedback"
                rows={7}
                maxLength={1000}
                value={feedbackMessage}
                onChange={(e) => {
                  setFeedbackMessage(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                placeholder="Write your feedback here..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-4 text-white placeholder-slate-500 outline-none transition-colors focus:border-cyan-500"
              />

              <div className="mt-1 text-right text-[10px] text-slate-500">
                {feedbackMessage.length}/1000
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-500 py-3 font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
