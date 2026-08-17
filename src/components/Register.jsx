import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [rollNo, setRollNo] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  function handleNextStep() {
    if (!fullName.trim() || !rollNo.trim()) {
      setError('Please fill in both Full Name and Roll Number')
      return
    }
    setError('')
    setStep(2)
  }

  async function handleRegisterSubmit() {
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please retype.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    setError('')

    try {
      let userId = null

      if (email.trim()) {
        // Has email — create Supabase Auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        })
        if (authError) {
          setError(authError.message)
          return
        }
        userId = authData?.user?.id
      } else {
        // No email — generate random UUID
        userId = crypto.randomUUID()
      }

      // Insert student row  
   const batchId = '27ab0ede-907d-46c9-8f07-7a394eec1b8b';

      const { error: profileError } = await supabase
        .from('students')
        .insert([{
          id: userId,
          full_name: fullName.trim(),
          nickname: nickname.trim() || null,
          roll_no: rollNo.trim().toUpperCase(),
          email: email.trim() || null,
          password: password,
          is_approved: true,
          batch_id: batchId,
          status: 'approved',
        }])

      if (profileError) {
        setError('Profile setup failed: ' + profileError.message)
        return
      }

      setStep(3)

    } catch (err) {
      setError('Something went wrong during account setup.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e, action) {
    if (e.key === 'Enter') action()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">

      {/* Branding */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-black text-cyan-400 tracking-tight">
          STUDENTS HARATE
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Create your classmate profile
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${step === s ? 'bg-cyan-500 text-slate-900' :
                    step > s ? 'bg-cyan-900 text-cyan-400' :
                    'bg-slate-800 text-slate-500'}`}>
                  {step > s ? '✓' : s}
                </div>
                {s < 2 && (
                  <div className={`flex-1 h-0.5 ${step > s ? 'bg-cyan-500' : 'bg-slate-800'}`} />
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

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Step 1 of 2</p>
              <h2 className="text-lg font-bold text-white">Profile Details</h2>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setError('') }}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Nickname <span className="text-slate-600 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="What your batchmates call you"
                value={nickname}
                onChange={e => { setNickname(e.target.value); setError('') }}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Roll Number *</label>
              <input
                type="text"
                placeholder="e.g. 208"
                value={rollNo}
                onChange={e => { setRollNo(e.target.value); setError('') }}
                onKeyDown={e => handleKeyDown(e, handleNextStep)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors uppercase font-mono"
              />
            </div>

            <button
              onClick={handleNextStep}
              className="w-full py-3 mt-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors">
              Continue to Account →
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Step 2 of 2</p>
              <h2 className="text-lg font-bold text-white">
                Hi {nickname || fullName.split(' ')[0]}! 👋
              </h2>
              <p className="text-slate-400 text-sm">Secure your account credentials</p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Email Address <span className="text-slate-600 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                placeholder="Used only for password recovery"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
              <p className="text-[11px] text-slate-600 mt-1.5 ml-1 leading-relaxed">
                💡for reset password, email is required cause we know that it's really u trying to reset password.
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Set Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Verify Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                onKeyDown={e => handleKeyDown(e, handleRegisterSubmit)}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setStep(1); setError('') }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors">
                ← Back
              </button>
              <button
                onClick={handleRegisterSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-900 font-bold rounded-xl transition-colors disabled:opacity-50">
                {loading ? 'creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Pending ── */}
  {/* ── STEP 3: Account Created ── */}
{step === 3 && (
  <div className="space-y-6 text-center py-6">
    <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center text-white font-black text-3xl mx-auto shadow-[0_0_35px_rgba(34,211,238,0.35)]">
      ✓
    </div>

    <div>
      <h2 className="text-2xl font-black text-white tracking-tight">
        Account Successfully Created
      </h2>

      <p className="text-slate-400 text-sm mt-3 leading-relaxed px-2">
        Your account for{' '}
        <b className="text-cyan-300">{nickname || fullName}</b> has been created successfully.
      </p>

      <p className="text-cyan-300 text-sm font-semibold mt-4 leading-relaxed">
        Enjoy your premium student life with your batchmates.
      </p>
    </div>

    <button
      onClick={() => navigate('/login')}
      className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:via-blue-500 hover:to-violet-500 text-white font-black rounded-xl transition-all active:scale-[0.98] tracking-wide text-xs uppercase shadow-[0_12px_30px_rgba(37,99,235,0.3)]"
    >
      Go to Login Panel
    </button>
  </div>
)}

</div>

      {step < 3 && (
        <p className="text-slate-500 text-sm mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-cyan-400 font-bold hover:text-cyan-300">
            Login here
          </button>
        </p>
      )}

    </div>
  )
}
