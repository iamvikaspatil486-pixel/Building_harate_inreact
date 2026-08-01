import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, Loader2, User } from 'lucide-react';

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

  const currentUser = JSON.parse(localStorage.getItem('anon_user') || 'null');
  const batch = JSON.parse(localStorage.getItem('selectedBatch') || 'null');
  const myBatchId = batch?.batchId;

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
      const batch = data.filter((s) => s.batch_id === myBatchId);
      const rest = data.filter((s) => s.batch_id !== myBatchId);
      setBatchmates(batch);
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
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 active:bg-gray-50 transition">
      {/* Avatar */}
      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${grad(student.full_name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {student.full_name?.[0]?.toUpperCase() || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{student.full_name}</p>
          {student.nickname && (
            <span className="text-[10px] text-gray-400 font-medium">@{student.nickname}</span>
          )}
          {isBatchmate && (
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
              Batchmate
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {student.roll_no && (
            <span className="text-[11px] text-gray-400">Roll: {student.roll_no}</span>
          )}
          {student.batches?.college_name && (
            <span className="text-[11px] text-gray-400 truncate">· {student.batches.college_name}</span>
          )}
        </div>
        {!isBatchmate && student.batches?.batch_name && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">{student.batches.batch_name}</p>
        )}
      </div>
    </div>
  );

  const totalResults = batchmates.length + others.length;

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 active:scale-90 transition">
            <ArrowLeft size={22} />
          </button>
          <p className="font-bold text-gray-900 text-sm">Find Students</p>
        </div>

        {/* Search bar */}
        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2.5 gap-2">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={handleChange}
            placeholder="Search by name…"
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          {query && (
            <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Results */}
      <main className="flex-1 pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-gray-300" />
          </div>

        ) : !searched ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <User size={26} className="text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold text-sm">Search for students</p>
            <p className="text-gray-400 text-xs">Your batchmates appear first in results</p>
          </div>

        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center gap-2 py-24 text-center px-6">
            <p className="text-3xl">🔍</p>
            <p className="text-gray-900 font-semibold text-sm">No students found</p>
            <p className="text-gray-400 text-xs">Try a different name</p>
          </div>

        ) : (
          <>
            {/* Batchmates section */}
            {batchmates.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                  <p className="text-[11px] font-black uppercase tracking-wider text-blue-500">
                    Your Batch · {batchmates.length} result{batchmates.length > 1 ? 's' : ''}
                  </p>
                </div>
                {batchmates.map((s) => (
                  <StudentCard key={s.id} student={s} isBatchmate={true} />
                ))}
              </div>
            )}

            {/* Other batches section */}
            {others.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                    Other Batches · {others.length} result{others.length > 1 ? 's' : ''}
                  </p>
                </div>
                {others.map((s) => (
                  <StudentCard key={s.id} student={s} isBatchmate={false} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

