import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, requestEmployeeOtp, verifyEmployeeOtp } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Mode = 'staff' | 'employee';
type OtpStep = 'email' | 'code';

const inputClass =
  'w-full rounded-lg bg-white/10 border border-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitra-accentFrom placeholder:text-slate-500';

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

export default function Login() {
  const [mode, setMode] = useState<Mode>('staff');
  const { setToken } = useAuth();
  const navigate = useNavigate();

  // staff form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // employee OTP form state
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpInfo, setOtpInfo] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setOtpInfo('');
  }

  async function handleStaffSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(email, password);
      setToken(result.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOtpInfo('');
    setBusy(true);
    try {
      const result = await requestEmployeeOtp(otpEmail);
      setOtpInfo(result.message);
      setOtpStep('code');
    } catch (err: any) {
      setError(err.message || 'Could not send a login code');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await verifyEmployeeOtp(otpEmail, otpCode);
      setToken(result.accessToken);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code');
    } finally {
      setBusy(false);
    }
  }

  function resetOtpFlow() {
    setOtpStep('email');
    setOtpCode('');
    setOtpInfo('');
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mitra-navy to-mitra-navyLight flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            <span className="bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo bg-clip-text text-transparent">
              MitraHR
            </span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Sign in to your workspace</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
          <div className="flex gap-1 rounded-lg bg-black/20 p-1 mb-5">
            <TabButton active={mode === 'staff'} onClick={() => switchMode('staff')}>
              Admin Sign In
            </TabButton>
            <TabButton active={mode === 'employee'} onClick={() => switchMode('employee')}>
              Employee Sign In
            </TabButton>
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {mode === 'staff' && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white font-medium py-2 text-sm disabled:opacity-60 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                {busy ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {mode === 'employee' && otpStep === 'email' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Official email address</label>
                <input
                  type="email"
                  required
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@offshoremitra.com"
                />
              </div>
              <p className="text-xs text-slate-400">
                We'll email a 6-digit login code to this address if it matches an employee on file.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white font-medium py-2 text-sm disabled:opacity-60 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                {busy ? 'Sending...' : 'Send login code'}
              </button>
            </form>
          )}

          {mode === 'employee' && otpStep === 'code' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {otpInfo && (
                <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                  {otpInfo}
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-300 mb-1">6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} tracking-[0.5em] text-center text-lg`}
                  placeholder="••••••"
                />
              </div>
              <button
                type="submit"
                disabled={busy || otpCode.length !== 6}
                className="w-full rounded-lg bg-gradient-to-r from-mitra-accentFrom to-mitra-accentTo text-white font-medium py-2 text-sm disabled:opacity-60 shadow-[0_6px_16px_-4px_rgba(124,111,255,0.55)] hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(124,111,255,0.6)] active:translate-y-0 active:shadow-[0_3px_8px_-2px_rgba(124,111,255,0.5)] transition-all duration-150"
              >
                {busy ? 'Verifying...' : 'Verify & sign in'}
              </button>
              <button
                type="button"
                onClick={resetOtpFlow}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
