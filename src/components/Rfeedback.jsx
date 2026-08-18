import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Rfeedback() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialRollNo = location.state?.rollNo || '';
  const initialMessage =
    location.state?.message ||
    (initialRollNo
      ? `My roll number ${initialRollNo} is already in use. Please verify and resolve this issue.`
      : '');

  const [rollNo, setRollNo] = useState(initialRollNo);
  const [feedbackMessage, setFeedbackMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!location.state?.rollNo) {
      return;
    }

    setRollNo(location.state.rollNo);

    if (location.state.message) {
      setFeedbackMessage(location.state.message);
    }
  }, [location.state]);

  async function handleSendFeedback(e) {
    e.preventDefault();

    const cleanRollNo = rollNo.trim();
    const cleanMessage = feedbackMessage.trim();

    setError('');
    setSuccess('');

    if (!cleanRollNo) {
      setError('Roll number is required.');
      return;
    }

    if (!cleanMessage) {
      setError('Please write your complaint.');
      return;
    }

    if (cleanMessage.length < 10) {
      setError('Complaint must contain at least 10 characters.');
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          roll_no: cleanRollNo,
          feedback: cleanMessage,
          user_id: user?.id || null,
        });

      if (insertError) {
        console.error('Feedback insert error:', insertError);
        setError(insertError.message);
        return;
      }

      setFeedbackMessage('');
      setSuccess(
        'Your complaint has been sent. We can resolve this shortly.'
      );
    } catch (err) {
      console.error('Feedback error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
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
              Raise Complaint
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Tell us about your roll-number problem.
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
              <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Roll Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={rollNo}
                onChange={(e) => {
                  setRollNo(e.target.value.replace(/D/g, ''));
                  setError('');
                  setSuccess('');
                }}
                placeholder="Enter roll number"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 font-mono text-white outline-none transition focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                Complaint
              </label>

              <textarea
                rows={7}
                maxLength={1000}
                value={feedbackMessage}
                onChange={(e) => {
                  setFeedbackMessage(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                placeholder="Write your complaint here..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
              />

              <p className="mt-1 text-right text-[10px] text-slate-500">
                {feedbackMessage.length}/1000
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 py-3 font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Complaint'}
            </button>
    <p className="mt-3 text-xs leading-relaxed text-cyan-300/90">
    if ur roll no. already taken by others u should DM us on Instagram →{" "}
    <span className="font-bold text-cyan-300">@students_harate</span>
  </p>
          </form>
        </section>
      </div>
    </main>
  );
}
