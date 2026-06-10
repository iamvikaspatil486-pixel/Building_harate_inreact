import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'


export default function Login() {
 const navigate = useNavigate()
  const [step, setStep] = useState(1)       // 1=name/roll, 2=batch, 3=password
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [nameOrRoll, setNameOrRoll] = useState('')
  const [student, setStudent] = useState(null)

  // Step 2
  const [batchCode, setBatchCode] = useState('')
  const [batch, setBatch] = useState(null)

  // Step 3
  const [password, setPassword] = useState('')

  // ── STEP 1: Find Student ────────────────────────────────
  async function handleFindStudent() {
    if (!nameOrRoll.trim()) {
      setError('Enter your name or roll number')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Try roll number first
      let { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('roll_no', nameOrRoll.trim())
        .single()

      // If not found, try name
      if (error || !data) {
        const res = await supabase
          .from('students')
          .select('*')
          .ilike('full_name', `%${nameOrRoll.trim()}%`)
          .single()

        data = res.data
        error = res.error
      }

      if (error || !data) {
        setError('Student not found. Check your name or roll number.')
        return
      }

      setStudent(data)
      setStep(2)

    } catch (err) {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 2: Verify Batch ────────────────────────────────
  async function handleVerifyBatch() {
    if (!batchCode.trim()) {
      setError('Enter your batch code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('batch_code', batchCode.trim().toUpperCase())
        .single()

      if (error || !data) {
        setError('Batch not found. Check your batch code.')
        return
      }

      if (student.batch_id !== data.id) {
        setError('You are not in this batch.')
        return
      }

      if (student.is_approved !== true) {
        setError('Your account is not approved yet. Contact admin.')
        return
      }

      setBatch(data)
      setStep(3)

    } catch (err) {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 3: Login ───────────────────────────────────────
  async function handleLogin() {
    if (!password.trim()) {
      setError('Enter your password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: student.email,
        password: password
      })

      if (error) {
        setError('Wrong password. Try again.')
        return
      }

      // Generate session token
      const sessionToken = typeof crypto.randomUUID === 'function' 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2) + Date.now().toString(36);


      // Save session token to students table
      await supabase
        .from('students')
        .update({ session_token: sessionToken })
        .eq('id', student.id)
        .select();

      // Save to localStorage
      localStorage.setItem('anon_user', JSON.stringify({
        id: student.id,
        name: student.full_name,
        roll: student.roll_no,
        email: student.email,
        batchId: batch.id
      }))

      localStorage.setItem('selectedBatch', JSON.stringify({
        batchId: batch.id,
        batchName: batch.batch_name,
        collegeName: batch.college_name,
        batchCode: batch.batch_code
      }))

      localStorage.setItem('session_token', sessionToken)

      // Redirect to home
      navigate('/home')

    } catch (err) {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── HANDLE ENTER KEY ────────────────────────────────────
  function handleKeyDown(e, action) {
    if (e.key === 'Enter') action()
  }

  // ── UI ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-cyan-400 tracking-tight">
          STUDENTS HARATE
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Your college social space
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${step === s ? 'bg-cyan-500 text-slate-900' :
                  step > s ? 'bg-cyan-900 text-cyan-400' :
                  'bg-slate-800 text-slate-500'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-0.5 ${step > s ? 'bg-cyan-500' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* ── STEP 1: Name or Roll ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Step 1 of 3</p>
              <h2 className="text-lg font-bold text-white">Who are you?</h2>
            </div>

            <input
              type="text"
              placeholder="Enter name or roll number"
              value={nameOrRoll}
              onChange={e => { setNameOrRoll(e.target.value); setError('') }}
              onKeyDown={e => handleKeyDown(e, handleFindStudent)}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
            />

            <button
              onClick={handleFindStudent}
              disabled={loading}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50">
              {loading ? 'Searching...' : 'Continue →'}
            </button>
          </div>
        )}

        {/* ── STEP 2: Batch Code ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Step 2 of 3</p>
              <h2 className="text-lg font-bold text-white">
                Hi {student?.full_name?.split(' ')[0]}! 👋
              </h2>
              <p className="text-slate-400 text-sm">Enter your batch code</p>
            </div>

            <input
              type="text"
              placeholder="Batch code (e.g. 73hsuwi)"
              value={batchCode}
              onChange={e => { setBatchCode(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => handleKeyDown(e, handleVerifyBatch)}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors uppercase tracking-widest"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(1); setError('') }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors">
                ← Back
              </button>
              <button
                onClick={handleVerifyBatch}
                disabled={loading}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50">
                {loading ? 'Checking...' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Password ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Step 3 of 3</p>
              <h2 className="text-lg font-bold text-white">Enter password</h2>
              <p className="text-slate-400 text-sm">
                Batch: <span className="text-cyan-400">{batch?.batch_name}</span>
              </p>
            </div>

            <input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => handleKeyDown(e, handleLogin)}
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(2); setError('') }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors">
                ← Back
              </button>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50">
                {loading ? 'Logging in...' : 'Login ✓'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Register Link */}
      <p className="text-slate-500 text-sm mt-6">
        New student?{' '}
<button onClick={() => navigate('/register')} className="text-cyan-400 font-bold">
  Register here
</button>
        </a>
      </p>

    </div>
  )
}



