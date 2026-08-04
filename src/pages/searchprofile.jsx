import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Loader2, User, X } from 'lucide-react';

const GRAD = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-fuchsia-500 to-pink-500',
];
const grad = (name = '') => GRAD[(name?.charCodeAt(0) || 0) % GRAD.length];

export default function SearchProfile() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [batchmates, setBatchmates] = useState([]);
  const [others, setOthers] = useState([]);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);
  const [showAllBatchmates, setShowAllBatchmates] = useState(false);
const [allBatchmates, setAllBatchmates] = useState([]);
const [loadingAll, setLoadingAll] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const myBatchId = batch?.batchId;
  
const fetchAllBatchmates = async () => {
  setLoadingAll(true);
  const { data } = await supabase
    .from('students')
    .select('id, full_name, nickname, roll_no, batch_id')
    .eq('batch_id', myBatchId)
    .eq('is_approved', true)
    .neq('id', currentUser?.id || 'none')
    .order('full_name', { ascending: true }); // alphabetical
  setAllBatchmates(data || []);
  setLoadingAll(false);
};

  const runSearch = async (text) => {
    if (!text.trim()) {
      setBatchmates([]);
      setOthers([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, nickname, roll_no, batch_id, is_approved')
      .ilike('full_name', `%${text.trim()}%`)
      .eq('is_approved', true)
      .neq('id', currentUser?.id || 'none');

    if (!error && data) {
      const batchList = data.filter((s) => s.batch_id === myBatchId);
      const rest = data.filter((s) => s.batch_id !== myBatchId);
      setBatchmates(batchList);
      setOthers(rest);
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 350);
  };

  const clearSearch = () => {
    setQuery('');
    setBatchmates([]);
    setOthers([]);
    setSearched(false);
  };

  const StudentCard = ({ student, isBatchmate }) => (
    <button
      onClick={() => navigate(`/viewprofile/${student.id}`, { state: { student } })}
      className="w-full flex items-center gap-3 p-3.5 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/[0.08] active:scale-[0.99] transition text-left shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
    >
      <div
        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad(student.full_name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-fuchsia-500/10`}
      >
        {student.full_name?.[0]?.toUpperCase() || '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white truncate">
            {student.full_name}
          </p>

          {isBatchmate && (
            <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-400/20 px-1.5 py-0.5 rounded-full">
              Batchmate
            </span>
          )}
        </div>

        {student.nickname && (
          <p className="text-[11px] text-fuchsia-300 truncate mt-0.5">
            @{student.nickname}
          </p>
        )}

        {/* Roll only for batchmates */}
        {isBatchmate && student.roll_no && (
          <p className="text-[11px] text-slate-500 mt-0.5">
            Roll: {student.roll_no}
          </p>
        )}
      </div>
    </button>
  );

  const totalResults = batchmates.length + others.length;

  return (
    <div className="min-h-screen w-full max-w-[100%] bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-white flex flex-col relative overflow-x-hidden box-border">
      {/* glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-fuchsia-500/20 blur-[110px] rounded-full" />
      <div className="pointer-events-none absolute bottom-24 right-0 w-56 h-56 bg-cyan-500/15 blur-[90px] rounded-full" />

      {/* Header */}
       <header className="sticky top-0 z-10 w-full max-w-[100%] px-4 py-3 bg-slate-950/70 backdrop-blur-xl border-b border-white/5 relative box-border">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-slate-200 active:scale-90 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="font-black text-sm tracking-[0.14em] uppercase bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
              Find Students
            </p>
            <p className="text-[11px] text-slate-500">Batchmates first</p>
          </div>
        </div>

        <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2.5 gap-2">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Search by name…"
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="text-slate-400 hover:text-white transition flex-shrink-0"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Results */}
      <main className="flex-1 w-full max-w-[100%] pb-24 relative z-10 box-border">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-fuchsia-300" />
          </div>
        ) : !searched ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <User size={26} className="text-fuchsia-300" />
            </div>
            <p className="text-white font-semibold text-sm">Search for students</p>
            <p className="text-slate-500 text-xs">Your batchmates appear first in results</p>
          </div>
        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center gap-2 py-24 text-center px-6">
            <p className="text-3xl">🔍</p>
            <p className="text-white font-semibold text-sm">No students found</p>
            <p className="text-slate-500 text-xs">Try a different name</p>
          </div>
        ) : (
          <>
            {/* Batchmates */}
    {batchmates.length > 0 && (
  <div className="w-full">
    <div className="w-full px-4 pt-4 pb-2 flex items-center justify-between">
      <p className="text-[12px] font-semibold text-cyan-300/90">
        {batchmates.length} batchmate{batchmates.length > 1 ? 's' : ''} found
      </p>
      <button
        onClick={() => { setShowAllBatchmates(true); fetchAllBatchmates(); }}
        className="text-[12px] font-semibold text-cyan-300/90 active:scale-95 transition"
      >
        View all batchmates
      </button>
    </div>

    {/* ← THIS PART WAS MISSING */}
    <div className="w-full px-4 pb-4 space-y-2.5">
      {batchmates.map((s) => (
        <StudentCard key={s.id} student={s} isBatchmate={true} />
      ))}
    </div>

  </div>
)}
   
            {/* Other batches */}
            {others.length > 0 && (
              <div className="w-full">
                <div className="w-full px-4 pt-2 pb-2">
                  <p className="text-[12px] font-semibold text-slate-400">
                    {others.length} from other batches
                  </p>
                </div>

                <div className="w-full px-4 pb-4 space-y-2.5">
                  {others.map((s) => (
                    <StudentCard key={s.id} student={s} isBatchmate={false} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
  {showAllBatchmates && (
  <div
    className="fixed inset-0 z-50 bg-black/50 flex items-end"
    onClick={(e) => { if (e.target === e.currentTarget) setShowAllBatchmates(false); }}
  >
    <div
      className="w-full rounded-t-3xl flex flex-col shadow-2xl"
      style={{
        maxHeight: '85vh',
        background: '#0f172a',
        animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-slate-700" />
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <p className="font-bold text-slate-100 text-sm">All Batchmates</p>
        <button onClick={() => setShowAllBatchmates(false)} className="text-slate-500">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadingAll ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            {/* Alphabetical group headers */}
            {Array.from(new Set(allBatchmates.map((s) => s.full_name?.[0]?.toUpperCase()))).sort().map((letter) => (
              <div key={letter}>
                <div className="px-4 py-1.5 bg-slate-800/50">
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">{letter}</p>
                </div>
                {allBatchmates
                  .filter((s) => s.full_name?.[0]?.toUpperCase() === letter)
                  .map((s) => (
                    <div
                      key={s.id}
                      onClick={() => { setShowAllBatchmates(false); navigate(`/viewprofile/${s.id}`); }}
                      className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/50 active:bg-slate-800/40 transition"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{s.full_name}</p>
                        {s.roll_no && <p className="text-[11px] text-slate-500">Roll: {s.roll_no}</p>}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </>
        )}
      </div>
      <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }} />
    </div>
  </div>
)}
    </div>
  );
}
