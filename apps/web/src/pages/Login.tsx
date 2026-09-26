import { FormEvent, InputHTMLAttributes, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, requestEmployeeOtp, verifyEmployeeOtp } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MitraLogo } from '../components/common/MitraLogo';
import { ChevronRightIcon, LockIcon, MailIcon } from '../components/icons';

type Mode = 'staff' | 'employee';
type OtpStep = 'email' | 'code';

// Claymorphism + Light Glassmorphic redesign, per his exact spec -- v4:
// re-architected per his reference. Left column is now two SEPARATE
// floating cards (a frosted glass sign-in card on top, a standalone solid
// charcoal "New in MitraHR" banner below it) instead of one dark block.
// The right column, which used to be the solid dark date/time panel, is
// now itself a tall frosted glass card with dark text and an inner
// vertical orange glow -- there is no solid-black card left except the
// small standalone banner. Background got three new decorative layers: a
// large glassy "bubble" behind the card row, a couple of small floating
// clay-white stones near the base with soft contact shadows, and the
// orange ambient orb pushed behind the right column specifically. Kept as
// an isolated change to this one file -- easy to revert with git.
const ACCENT = '#FF7A29';
const CHARCOAL = '#121212';
const TEXT_SECONDARY = '#64748B';
const TEXT_PRIMARY = '#1E293B';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function greetingFor(hour: number) {
  if (hour < 5) return 'Working late?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Working late?';
}

// The sunken, inset-shadow pill input -- solid opaque white so it never
// picks up a color cast from a glass card behind it, a left-aligned line
// icon, and an inner shadow instead of a visible border.
function FieldPill(
  props: InputHTMLAttributes<HTMLInputElement> & { icon: typeof MailIcon; fieldRef?: React.Ref<HTMLInputElement> },
) {
  const { icon: Icon, fieldRef, className, ...rest } = props;
  return (
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: TEXT_SECONDARY }} />
      <input
        ref={fieldRef}
        {...rest}
        className={`w-full rounded-full pl-11 pr-4 py-2.5 text-sm bg-white focus:outline-none transition-shadow ${className || ''}`}
        style={{
          border: '1px solid rgba(226,232,240,0.8)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
          color: TEXT_PRIMARY,
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = `inset 0 2px 4px rgba(0,0,0,0.05), 0 0 0 3px ${ACCENT}33`;
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)';
          rest.onBlur?.(e);
        }}
      />
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
        active ? 'bg-[#121212] text-white' : 'bg-transparent text-[#64748B] hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

// A translucent "water bubble" -- mostly see-through with a bright glassy
// rim, a soft specular highlight near the upper-left, and a faint cool
// tint, rather than the flatter frosted-glass panel look used elsewhere.
// Used both for the one large bubble behind the card row and for the
// smaller bubbles scattered around it.
function WaterBubble({ size, className = '', style = {} }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute rounded-full pointer-events-none z-0 ${className}`}
      style={{
        width: size,
        height: size,
        background:
          'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 38%, rgba(214,235,255,0.06) 62%, rgba(255,255,255,0.2) 100%)',
        border: '1px solid rgba(255,255,255,0.65)',
        boxShadow: 'inset -6px -8px 14px rgba(0,0,0,0.05), inset 5px 6px 14px rgba(255,255,255,0.75), 0 10px 26px rgba(0,0,0,0.05)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        ...style,
      }}
    >
      <div
        className="absolute rounded-full bg-white/85 blur-[3px]"
        style={{ width: '32%', height: '20%', top: '16%', left: '20%' }}
      />
      <div
        className="absolute rounded-full bg-white/50 blur-[2px]"
        style={{ width: '12%', height: '8%', bottom: '22%', right: '26%' }}
      />
    </div>
  );
}

const ctaButtonClass =
  'rounded-full bg-[#121212] text-white font-medium disabled:opacity-60 hover:bg-black hover:scale-[1.01] active:scale-[0.99] transition-all duration-150';

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

  // Live date/time for the right glass card -- ticks once a minute,
  // ambience rather than a real clock.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Real actions, not decorative dead-end buttons: the banner's "Discover"
  // focuses the actual next field, and the tall card's bottom pill switches
  // between Admin/Employee sign-in.
  const staffEmailRef = useRef<HTMLInputElement>(null);
  const otpEmailRef = useRef<HTMLInputElement>(null);
  function focusPrimaryField() {
    requestAnimationFrame(() => {
      (mode === 'staff' ? staffEmailRef : otpEmailRef).current?.focus();
    });
  }

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
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 md:p-10 overflow-hidden" style={{ background: '#F3EFEA' }}>
      {/* Subtle warm-sand grain texture. */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* A cluster of translucent water bubbles behind the card row -- one
          large bubble (echoing the glass-dome prop from his original
          reference photo) plus several smaller ones scattered around it,
          some positioned right behind the card edges so the now-more-
          transparent glass cards let them show through. */}
      <WaterBubble size={560} className="-top-24 left-1/2 -translate-x-1/2" />
      <WaterBubble size={120} className="top-8 left-[8%]" />
      <WaterBubble size={70} className="top-[-10px] left-[30%]" />
      <WaterBubble size={90} className="top-16 right-[20%]" />
      <WaterBubble size={50} className="top-1/2 left-[4%]" />
      <WaterBubble size={64} className="bottom-24 right-[6%]" />
      <WaterBubble size={40} className="top-1/3 right-[38%]" />

      {/* Orange ambient orb, pushed behind the right column. */}
      <div
        className="absolute top-1/3 right-[6%] w-80 h-80 rounded-full blur-[90px] opacity-60 z-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${ACCENT}, #FFB074)` }}
      />

      {/* Solid white "clay" balls near the base, each with a soft contact
          shadow so they read as resting 3D objects rather than flat
          circles -- a few more of these now, alongside the bubbles. */}
      <div className="absolute -bottom-3 left-[10%] z-0 pointer-events-none">
        <div className="w-14 h-14 rounded-full" style={{ background: 'linear-gradient(145deg, #FFFFFF, #E8E2D8)', boxShadow: '0 14px 22px -8px rgba(0,0,0,0.18)' }} />
      </div>
      <div className="absolute bottom-6 right-[14%] z-0 pointer-events-none">
        <div className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(145deg, #FFFFFF, #E8E2D8)', boxShadow: '0 10px 16px -6px rgba(0,0,0,0.16)' }} />
      </div>
      <div className="absolute top-[6%] left-[36%] z-0 pointer-events-none">
        <div className="w-6 h-6 rounded-full" style={{ background: 'linear-gradient(145deg, #FFFFFF, #E8E2D8)', boxShadow: '0 8px 14px -6px rgba(0,0,0,0.16)' }} />
      </div>
      <div className="absolute bottom-16 left-[42%] z-0 pointer-events-none">
        <div className="w-10 h-10 rounded-full" style={{ background: 'linear-gradient(145deg, #FFFFFF, #E8E2D8)', boxShadow: '0 12px 18px -7px rgba(0,0,0,0.17)' }} />
      </div>

      {/* Card row -- left column holds two separate stacked cards; right
          column is one tall glass card that stretches (items-stretch) to
          match the left column's combined height automatically. */}
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch gap-6 max-w-4xl w-full">
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Top: frosted glass sign-in card */}
          <div
            className="flex flex-col justify-center p-8 md:p-10"
            style={{
              background: 'rgba(255,255,255,0.28)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.7)',
              borderRadius: '24px',
              boxShadow: '0 15px 35px rgba(0,0,0,0.05)',
            }}
          >
            <span className="text-xs font-semibold tracking-[0.15em] uppercase mb-6 block" style={{ color: TEXT_SECONDARY }}>
              MitraHR
            </span>

            <div className="flex gap-1 rounded-full p-1 mb-6" style={{ background: 'rgba(255,255,255,0.5)' }}>
              <TabButton active={mode === 'staff'} onClick={() => switchMode('staff')}>
                Admin Sign In
              </TabButton>
              <TabButton active={mode === 'employee'} onClick={() => switchMode('employee')}>
                Employee Sign In
              </TabButton>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50/80 border border-red-200 rounded-2xl px-3 py-2 mb-4">{error}</div>
            )}

            {mode === 'staff' && (
              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: TEXT_SECONDARY }}>
                    Email
                  </label>
                  <FieldPill
                    icon={MailIcon}
                    fieldRef={staffEmailRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: TEXT_SECONDARY }}>
                    Password
                  </label>
                  <FieldPill
                    icon={LockIcon}
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={busy} className={`w-full py-2.5 text-sm ${ctaButtonClass}`}>
                  {busy ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            )}

            {mode === 'employee' && otpStep === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: TEXT_SECONDARY }}>
                    Official email address
                  </label>
                  <FieldPill
                    icon={MailIcon}
                    fieldRef={otpEmailRef}
                    type="email"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="you@offshoremitra.com"
                  />
                </div>
                <p className="text-xs" style={{ color: TEXT_SECONDARY }}>
                  We'll email a 6-digit login code to this address if it matches an employee on file.
                </p>
                <button type="submit" disabled={busy} className={`w-full py-2.5 text-sm ${ctaButtonClass}`}>
                  {busy ? 'Sending...' : 'Send login code'}
                </button>
              </form>
            )}

            {mode === 'employee' && otpStep === 'code' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                {otpInfo && (
                  <div className="text-sm text-emerald-700 bg-emerald-50/80 border border-emerald-200 rounded-2xl px-3 py-2">
                    {otpInfo}
                  </div>
                )}
                <div>
                  <label className="block text-sm mb-1.5" style={{ color: TEXT_SECONDARY }}>
                    6-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-full px-4 py-2.5 text-lg text-center tracking-[0.5em] bg-white focus:outline-none"
                    style={{
                      border: '1px solid rgba(226,232,240,0.8)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                      color: TEXT_PRIMARY,
                    }}
                    placeholder="••••••"
                  />
                </div>
                <button type="submit" disabled={busy || otpCode.length !== 6} className={`w-full py-2.5 text-sm ${ctaButtonClass}`}>
                  {busy ? 'Verifying...' : 'Verify & sign in'}
                </button>
                <button
                  type="button"
                  onClick={resetOtpFlow}
                  className="w-full text-center text-xs hover:underline"
                  style={{ color: ACCENT }}
                >
                  Use a different email
                </button>
              </form>
            )}
          </div>

          {/* Bottom: standalone solid charcoal banner card -- a separate
              element, not embedded inside another card. */}
          <div
            className="flex items-center justify-between gap-4 px-6 py-4"
            style={{ background: CHARCOAL, borderRadius: '20px' }}
          >
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">New in MitraHR</p>
              <p className="text-white/50 text-xs truncate">Office Wall is live -- see what's happening</p>
            </div>
            <button
              type="button"
              onClick={focusPrimaryField}
              className="group inline-flex flex-shrink-0 items-center gap-1 rounded-full pl-3.5 pr-3 py-1.5 text-xs font-medium transition-all"
              style={{ background: 'rgba(255,122,41,0.18)', border: `1px solid rgba(255,122,41,0.45)`, color: ACCENT }}
            >
              Discover
              <ChevronRightIcon className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN -- tall frosted glass date/time card, stretched to
            match the left column's total height. */}
        <div
          className="flex-1 relative overflow-hidden p-8 flex flex-col justify-between"
          style={{
            background: 'rgba(255,255,255,0.4)',
            backdropFilter: 'blur(20px) saturate(160%)',
            WebkitBackdropFilter: 'blur(20px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.7)',
            borderRadius: '24px',
            boxShadow: '0 15px 35px rgba(0,0,0,0.05)',
          }}
        >
          {/* Inner vertical orange glow, bleeding through the middle-right
              side of the card. */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2/3 pointer-events-none"
            style={{ background: `linear-gradient(180deg, transparent 0%, rgba(255,122,41,0.28) 50%, transparent 100%)` }}
          />

          <div className="relative flex items-center justify-between">
            <MitraLogo mode="light" size={28} variant="full" />
            <span
              className="text-sm font-semibold tabular-nums tracking-wider"
              style={{ color: TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums' }}
            >
              {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="relative">
            <p className="text-sm mb-1" style={{ color: TEXT_SECONDARY }}>
              {greetingFor(now.getHours())}
            </p>
            <p className="text-5xl md:text-6xl font-semibold leading-none tracking-tight" style={{ color: TEXT_PRIMARY }}>
              {now.toLocaleDateString('en-US', { weekday: 'short' })}
            </p>
            <p className="text-2xl md:text-3xl font-medium mt-1" style={{ color: TEXT_PRIMARY }}>
              {ordinal(now.getDate())} {now.toLocaleDateString('en-US', { month: 'long' })}
            </p>
            <p className="text-sm mt-4" style={{ color: TEXT_SECONDARY }}>
              Connecting People -- welcome back to your workspace.
            </p>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => switchMode(mode === 'staff' ? 'employee' : 'staff')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm ${ctaButtonClass}`}
              >
                {mode === 'staff' ? 'Employee Sign In' : 'Admin Sign In'}
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
