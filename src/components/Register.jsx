import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Register() {
  const navigate = useNavigate();

  const BATCH_ID = '27ab0ede-907d-46c9-8f07-7a394eec1b8b';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [blockedStudent, setBlockedStudent] = useState(null);
  const [temporaryNumber, setTemporaryNumber] = useState('');

  const [showTemporaryNumber, setShowTemporaryNumber] =
    useState(false);

  const [showBlockedMessage, setShowBlockedMessage] =
    useState(false);

  const [rollAlreadyRegistered, setRollAlreadyRegistered] =
    useState(false);

  /*
   * This is the important state.
   * It remains true after the user successfully verifies
   * the temporary number.
   */
  const [temporaryNumberVerified, setTemporaryNumberVerified] =
    useState(false);

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  function resetRollStatus() {
    setBlockedStudent(null);
    setTemporaryNumber('');
    setShowTemporaryNumber(false);
    setShowBlockedMessage(false);
    setRollAlreadyRegistered(false);
    setTemporaryNumberVerified(false);
  }

function handleRollNoChange(e) {
  // Correct regex: use D to remove non-digit characters
  const value = e.target.value.replace(/D/g, '');

  if (value === '') {
    setRollNo('');
    clearMessages();
    resetRollStatus();
    return;
  }

  const numericValue = Number(value);

  /*
   * Allow roll numbers:
   * 1 to 204
   * or exactly 300
   */
  const isAllowedRollNumber =
    (numericValue >= 1 && numericValue <= 204) ||
    numericValue === 300;

  /*
   * Allow typing intermediate values up to 300.
   * Final validation happens in checkRollNumber()
   * and handleRegister().
   */
  if (numericValue <= 300) {
    setRollNo(value);
    clearMessages();
    resetRollStatus();
  }

  /*
   * Optional immediate error for invalid final values.
   */
  if (!isAllowedRollNumber && numericValue > 204) {
    setError(
      'Roll number must be from 1 to 204.'
    );
  }
}

  function openRollComplaint() {
    const cleanRollNo = rollNo.trim();

    navigate('/registerfeedback', {
      state: {
        rollNo: cleanRollNo,
        complaintType: 'roll_number',
        complaintMessage: `My roll number ${cleanRollNo} is already being used by another user. Please verify and resolve this issue.`,
      },
    });
  }

  async function checkRollNumber() {
    const cleanRollNo = rollNo.trim();
    const numericRollNo = Number(cleanRollNo);

    clearMessages();
    resetRollStatus();

    if (!cleanRollNo) {
      setError('Please enter your roll number.');
      return;
    }

 if (
  !Number.isInteger(numericRollNo) ||
  !(
    (numericRollNo >= 1 && numericRollNo <= 204) ||
    numericRollNo === 300
  )
) {
  setError(
    'Roll number must be between 1 and 204, or exactly 300.'
  );
  return;
}

    setLoading(true);

    try {
      const { data: blockedRow, error: blockedError } =
        await supabase
          .from('blocked_students')
          .select('id, students_id, roll_no, temporary_no')
          .eq('roll_no', numericRollNo)
          .limit(1)
          .maybeSingle();

      if (blockedError) {
        console.error(
          'Blocked students query error:',
          blockedError
        );

        setError('Could not verify your roll number.');
        return;
      }

      console.log('Blocked row returned:', blockedRow);
      console.log(
        'Temporary number returned:',
        blockedRow?.temporary_no
      );

      if (blockedRow) {
        setBlockedStudent(blockedRow);

        const temporaryValue = blockedRow.temporary_no;

        const hasTemporaryNumber =
          temporaryValue !== null &&
          temporaryValue !== undefined &&
          String(temporaryValue).trim() !== '';

        if (!hasTemporaryNumber) {
          setShowBlockedMessage(true);
          setShowTemporaryNumber(false);
          setError(
            'Your account is blocked. We can resolve this shortly. Stay tuned.'
          );
          return;
        }

        setShowBlockedMessage(false);
        setShowTemporaryNumber(true);
        setError('Enter your temporary number to continue.');
        return;
      }

      const { data: existingStudent, error: studentError } =
        await supabase
          .from('students')
          .select('id')
          .eq('roll_no', cleanRollNo)
          .limit(1)
          .maybeSingle();

      if (studentError) {
        console.error(
          'Students query error:',
          studentError
        );

        setError('Could not check your roll number.');
        return;
      }

      if (existingStudent) {
        setRollAlreadyRegistered(true);
        setError('Roll number already in use.');
        return;
      }

      setStep(2);
    } catch (err) {
      console.error('Roll number checking error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyTemporaryNumber() {
    const enteredValue = temporaryNumber.trim();
    const currentRollNo = rollNo.trim();

    clearMessages();

    if (!currentRollNo) {
      setError('Please enter your roll number.');
      return;
    }

    if (!enteredValue) {
      setError('Please enter your temporary number.');
      return;
    }

    setLoading(true);

    try {
      /*
       * Fetch the existing temporary number.
       * We compare it manually so number/string differences
       * do not cause a false mismatch.
       */
      const {
        data: blockedRow,
        error: verifyError,
      } = await supabase
        .from('blocked_students')
        .select('id, roll_no, temporary_no')
        .eq('roll_no', Number(currentRollNo))
        .limit(1)
        .maybeSingle();

      if (verifyError) {
        console.error(
          'Temporary number verification error:',
          verifyError
        );

        setError('Could not verify temporary number.');
        return;
      }

      if (!blockedRow) {
        setError('No blocked record was found for this roll number.');
        return;
      }

      const databaseValue = blockedRow.temporary_no;

      if (
        databaseValue === null ||
        databaseValue === undefined ||
        String(databaseValue).trim() === ''
      ) {
        setError(
          'your acccount is blocked we can resolve this shortly. No temporary number is assigned to this roll number.'
        );
        return;
      }

      const enteredTemporaryValue = String(enteredValue).trim();
      const existingTemporaryValue = String(databaseValue).trim();

      if (enteredTemporaryValue !== existingTemporaryValue) {
        setTemporaryNumberVerified(false);
        setError('Incorrect temporary number.');
        return;
      }

      /*
       * The temporary number matches.
       * This state remains true while the user enters
       * their password on step 2.
       */
      setBlockedStudent(blockedRow);
      setTemporaryNumberVerified(true);
      setShowTemporaryNumber(false);
      setShowBlockedMessage(false);
      setTemporaryNumber('');
      setError('');
      setSuccess(
        'Temporary number verified. You can now create your account.'
      );
      setStep(2);
    } catch (err) {
      console.error(
        'Temporary number verification error:',
        err
      );

      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function validatePasswordStep() {
    if (!password.trim()) {
      setError('Please enter a password.');
      return false;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return false;
    }

    if (!confirmPassword.trim()) {
      setError('Please confirm your password.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  }

  async function handleRegister() {
    clearMessages();

    if (!validatePasswordStep()) {
      return;
    }

    const cleanRollNo = rollNo.trim();
    const numericRollNo = Number(cleanRollNo);

  if (
  !Number.isInteger(numericRollNo) ||
  (numericRollNo < 1 ||
    (numericRollNo > 204 && numericRollNo !== 300))
) {
  setStep(1);
  setError(
    'Roll number must from 1 to 204.'
  );
  return;
}

    setLoading(true);

    try {
      /*
       * Only check blocked_students again when the user
       * has NOT already verified a temporary number.
       *
       * If temporaryNumberVerified is true, the user is
       * allowed to continue.
       */
      if (!temporaryNumberVerified) {
        const {
          data: finalBlockedRow,
          error: finalBlockedError,
        } = await supabase
          .from('blocked_students')
          .select('id, roll_no, temporary_no')
          .eq('roll_no', numericRollNo)
          .limit(1)
          .maybeSingle();

        if (finalBlockedError) {
          console.error(
            'Final blocked check error:',
            finalBlockedError
          );

          setStep(1);
          setError('Could not verify your roll number.');
          return;
        }

        if (finalBlockedRow) {
          const databaseTemporaryNumber =
            finalBlockedRow.temporary_no;

          const hasTemporaryNumber =
            databaseTemporaryNumber !== null &&
            databaseTemporaryNumber !== undefined &&
            String(databaseTemporaryNumber).trim() !== '';

          setBlockedStudent(finalBlockedRow);
          setStep(1);

          if (hasTemporaryNumber) {
            setShowTemporaryNumber(true);
            setShowBlockedMessage(false);
            setError('Please enter your temporary number.');
          } else {
            setShowTemporaryNumber(false);
            setShowBlockedMessage(true);
            setError(
              'Your account is blocked. We can resolve this shortly. Stay tuned.'
            );
          }

          return;
        }
      }

      /*
       * Check if the roll number already exists.
       */
      const {
        data: existingStudent,
        error: duplicateError,
      } = await supabase
        .from('students')
        .select('id')
        .eq('roll_no', cleanRollNo)
        .limit(1)
        .maybeSingle();

      if (duplicateError) {
        console.error(
          'Duplicate roll number error:',
          duplicateError
        );

        setStep(1);
        setError('Could not verify your roll number.');
        return;
      }

      if (existingStudent) {
        setStep(1);
        setRollAlreadyRegistered(true);
        setError('Roll number already in use.');
        return;
      }

      /*
       * The user can reach this point when:
       *
       * 1. The roll number is not blocked, OR
       * 2. The temporary number was successfully verified.
       */
      const { error: insertError } = await supabase
        .from('students')
        .insert({
          full_name: fullName.trim(),
          nickname: nickname.trim() || null,
          roll_no: cleanRollNo,
          email: email.trim() || null,
          password,
          batch_id: BATCH_ID,
        });

      if (insertError) {
        console.error(
          'Student insert error:',
          insertError
        );

        if (insertError.code === '23505') {
          setStep(1);
          setRollAlreadyRegistered(true);
          setError('Roll number already in use.');
          return;
        }

        setError(insertError.message);
        return;
      }

      setTemporaryNumberVerified(false);
      setBlockedStudent(null);
      setSuccess('Registration completed successfully.');
      setStep(3);
    } catch (err) {
      console.error('Registration error:', err);
      setError('Something went wrong during registration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-8 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-cyan-400">
            STUDENT REGISTRATION
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Register with your correct roll number.
          </p>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-2xl sm:p-7">
          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                    step === item
                      ? 'bg-cyan-400 text-slate-950'
                      : step > item
                      ? 'bg-cyan-900 text-cyan-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > item ? '✓' : item}
                </div>

                {item < 3 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      step > item
                        ? 'bg-cyan-500'
                        : 'bg-slate-800'
                    }`}
                  />
                )}
              </div>
            ))}
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

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">
                  Step 1 of 3
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Enter your details
                </h2>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Full Name *
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearMessages();
                  }}
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Nickname
                </label>

                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    clearMessages();
                  }}
                  placeholder="Optional nickname"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearMessages();
                  }}
                  placeholder="Optional email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Roll Number *
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={rollNo}
                  onChange={handleRollNoChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      checkRollNumber();
                    }
                  }}
                  placeholder="Enter roll number"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 font-mono text-white outline-none transition focus:border-cyan-500"
                />

                <p className="mt-1 text-[10px] text-slate-500">
                  Roll number must be from 1 to 204.
                </p>
              </div>

              {showBlockedMessage && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-2xl">
                    🚫
                  </div>

                  <h3 className="text-sm font-black uppercase tracking-wide text-red-300">
                    Account Blocked
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Your account is blocked. We can resolve this
                    shortly. Stay tuned.
                  </p>
                </div>
              )}

              {showTemporaryNumber &&
                !temporaryNumberVerified && (
                  <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4">
                    <h3 className="text-sm font-black uppercase tracking-wide text-orange-300">
                      Enter Temporary Number
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Enter the temporary number assigned to this
                      roll number.
                    </p>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={temporaryNumber}
                      onChange={(e) => {
                        setTemporaryNumber(
                          e.target.value.replace(/D/g, '')
                        );
                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          verifyTemporaryNumber();
                        }
                      }}
                      placeholder="Enter temporary number"
                      className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 font-mono text-white outline-none transition focus:border-orange-400"
                    />

                    <button
                      type="button"
                      onClick={verifyTemporaryNumber}
                      disabled={loading}
                      className="mt-3 w-full rounded-xl bg-orange-400 py-3 font-black text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading
                        ? 'Checking...'
                        : 'Verify Temporary Number'}
                    </button>
                  </div>
                )}

      
   {rollAlreadyRegistered && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <h3 className="text-sm font-black uppercase tracking-wide text-amber-300">
                    Roll Number Already In Use
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Roll number <strong>{rollNo}</strong> is already
                    being used by another user.
                  </p>

                  <button
                    type="button"
                    onClick={openRollComplaint}
                    className="mt-4 w-full rounded-xl bg-amber-400 py-3 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-amber-300 active:scale-95"
                  >
                    Raise Complaint
                  </button>
                </div>
              )}

              {!showBlockedMessage &&
                !showTemporaryNumber &&
                !rollAlreadyRegistered && (
                  <button
                    type="button"
                    onClick={checkRollNumber}
                    disabled={loading}
                    className="w-full rounded-xl bg-cyan-400 py-3 font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Checking...' : 'Continue'}
                  </button>
                )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">
                  Step 2 of 3
                </p>

                <h2 className="mt-1 text-xl font-black">
                  Create your password
                </h2>

                {temporaryNumberVerified && (
                  <p className="mt-2 text-xs font-semibold text-emerald-400">
                    Temporary number verified successfully.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Password *
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearMessages();
                  }}
                  placeholder="Enter password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Confirm Password *
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearMessages();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRegister();
                    }
                  }}
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    clearMessages();
                  }}
                  className="flex-1 rounded-xl bg-slate-800 py-3 font-bold text-slate-300 transition hover:bg-slate-700"
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-cyan-400 py-3 font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-3xl text-emerald-400">
                ✓
              </div>

              <h2 className="mt-5 text-2xl font-black text-emerald-400">
                Registration Complete
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                Your account has been created successfully.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-6 w-full rounded-xl bg-cyan-400 py-3 font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-300"
              >
                Go to Login
              </button>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-bold text-cyan-400 hover:text-cyan-300"
          >
            Login
          </button>
        </p>
      </div>
    </main>
  );
}
