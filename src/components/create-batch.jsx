import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Loader2, Copy, Check, PartyPopper } from "lucide-react";

// Generates a distinct batch code each time — e.g. SSIMS-X7K2
const generateBatchCode = (collegeName) => {
  const prefix = (collegeName || "BATCH")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 5)
    .toUpperCase() || "BATCH";
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${random}`;
};

export default function CreateBatch() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Batch info (step 1)
  const [collegeName, setCollegeName] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchPassword, setBatchPassword] = useState("");

  // Created batch (after step 1 succeeds)
  const [createdBatch, setCreatedBatch] = useState(null); // { id, batch_code, batch_name, college_name }

  // Creator info (step 2)
  const [fullName, setFullName] = useState("");
  const [rollNo, setRollNo] = useState("");

  // ── STEP 1: Create the batch ──
  async function handleCreateBatch() {
    if (!collegeName.trim()) { setError("Enter your college name"); return; }
    if (!batchName.trim()) { setError("Enter a batch name"); return; }
    if (!batchPassword.trim() || batchPassword.length < 4) {
      setError("Set a batch password (min 4 characters)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Generate a distinct batch code, retry on collision
      let batchCode = generateBatchCode(collegeName);
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from("batches")
          .select("id")
          .eq("batch_code", batchCode)
          .limit(1);
        if (!existing?.length) break;
        batchCode = generateBatchCode(collegeName);
        attempts++;
      }

      // Create the batch — created_by stays null for now
      const { data: batchData, error: batchErr } = await supabase
        .from("batches")
        .insert([{
          batch_name: batchName.trim(),
          created_by: null,
          description: null,
          batch_code: batchCode,
          college_name: collegeName.trim(),
          batch_password: batchPassword,
        }])
        .select()
        .single();

      if (batchErr) {
        setError("Could not create batch: " + batchErr.message);
        setLoading(false);
        return;
      }

      setCreatedBatch(batchData);
      setStep(2);

    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── STEP 2: Create the student + link to batch ──
  async function handleCreateProfile() {
    if (!fullName.trim()) {
      setError("Enter your full name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const studentId = crypto.randomUUID();

      // 1. Create the student row, already linked to the batch
      const { error: studentErr } = await supabase
        .from("students")
        .insert([{
          id: studentId,
          full_name: fullName.trim(),
          roll_no: rollNo.trim() || null,
          is_approved: true,
          status: "approved",
          batch_id: createdBatch.id,
        }]);

      if (studentErr) {
        setError("Could not create your profile: " + studentErr.message);
        setLoading(false);
        return;
      }

      // 2. Now that student exists, set batches.created_by
      const { error: updateErr } = await supabase
        .from("batches")
        .update({ created_by: studentId })
        .eq("id", createdBatch.id);

      if (updateErr) {
        setError("Batch ownership update failed: " + updateErr.message);
        setLoading(false);
        return;
      }

      // 3. Add to batch_members, auto-approved
      const { error: memberErr } = await supabase
        .from("batch_members")
        .insert([{
          batch_id: createdBatch.id,
          student_id: studentId,
          is_approved: true,
        }]);

      if (memberErr) {
        setError("Batch created but membership failed: " + memberErr.message);
        setLoading(false);
        return;
      }

      // Save creator session locally so they're logged in
      localStorage.setItem("anon_user", JSON.stringify({
        id: studentId,
        name: fullName.trim(),
        roll: rollNo.trim() || null,
      }));
      localStorage.setItem("selectedBatch", JSON.stringify({
        batchId: createdBatch.id,
        batchName: createdBatch.batch_name,
        collegeName: createdBatch.college_name,
        batchCode: createdBatch.batch_code,
      }));

      setStep(3);

    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(createdBatch.batch_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleKeyDown(e, action) {
    if (e.key === "Enter") action();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">

      {/* Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-cyan-400 tracking-tight">
          STUDENTS HARATE
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {step < 3 ? "Create your batch" : "Batch created!"}
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${step === s ? "bg-cyan-500 text-slate-900" :
                    step > s ? "bg-cyan-900 text-cyan-400" :
                    "bg-slate-800 text-slate-500"}`}>
                  {step > s ? "✓" : s}
                </div>
                {s < 2 && (
                  <div className={`flex-1 h-0.5 ${step > s ? "bg-cyan-500" : "bg-slate-800"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* ── STEP 1: Batch info ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Step 1 of 2</p>
              <h2 className="text-lg font-bold text-white">Set up your batch</h2>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">College Name *</label>
              <input
                type="text"
                placeholder="e.g. SSIMS Davanagere"
                value={collegeName}
                onChange={(e) => { setCollegeName(e.target.value); setError(""); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Batch Name * <span className="text-slate-600 font-normal">(you can change this later)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. MBBS 2024 Batch"
                value={batchName}
                onChange={(e) => { setBatchName(e.target.value); setError(""); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Batch Password *</label>
              <input
                type="password"
                placeholder="Min 4 characters"
                value={batchPassword}
                onChange={(e) => { setBatchPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => handleKeyDown(e, handleCreateBatch)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
              <p className="text-[11px] text-slate-600 mt-1.5 ml-1">
                💡 Share this with your batchmates so they can join.
              </p>
            </div>

            <button
              onClick={handleCreateBatch}
              disabled={loading}
              className="w-full py-3 mt-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Create Batch →"}
            </button>
          </div>
        )}

        {/* ── STEP 2: Creator info ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Step 2 of 2</p>
              <h2 className="text-lg font-bold text-white">
                "{createdBatch?.batch_name}" created! 🎉
              </h2>
              <p className="text-slate-400 text-sm">Now set up your own profile</p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(""); }}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Roll Number <span className="text-slate-600 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 208"
                value={rollNo}
                onChange={(e) => { setRollNo(e.target.value); setError(""); }}
                onKeyDown={(e) => handleKeyDown(e, handleCreateProfile)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors uppercase font-mono"
              />
            </div>

            <button
              onClick={handleCreateProfile}
              disabled={loading}
              className="w-full py-3 mt-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Finish Setup ✓"}
            </button>
          </div>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 3 && (
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 bg-cyan-950 border border-cyan-800/50 rounded-full flex items-center justify-center text-cyan-400 mx-auto mb-2">
              <PartyPopper size={26} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {createdBatch?.batch_name} is live!
              </h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed px-1">
                Share this code with your batchmates so they can join during registration.
              </p>
            </div>

            {/* Batch code display */}
            <button
              onClick={copyCode}
              className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-2xl py-4 flex items-center justify-center gap-3 transition-colors active:bg-cyan-500/10"
            >
              <span className="text-2xl font-black text-cyan-400 font-mono tracking-widest">
                {createdBatch?.batch_code}
              </span>
              {copied ? (
                <Check size={18} className="text-emerald-400" />
              ) : (
                <Copy size={18} className="text-cyan-600" />
              )}
            </button>
            <p className="text-[11px] text-slate-600 -mt-2">
              {copied ? "Copied!" : "Tap to copy"}
            </p>

            <button
              onClick={() => navigate("/home")}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors tracking-wide text-sm mt-2"
            >
              Go to Home →
            </button>
          </div>
        )}

      </div>

      {step < 3 && (
        <p className="text-slate-500 text-sm mt-6">
          Already have a batch code?{" "}
          <button onClick={() => navigate("/")} className="text-cyan-400 font-bold hover:text-cyan-300">
            Go back
          </button>
        </p>
      )}

    </div>
  );
}

