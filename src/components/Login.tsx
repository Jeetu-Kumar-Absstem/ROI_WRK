import { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

type AuthMode = 'login' | 'signup';

type SignupForm = {
  name: string;
  company_name: string;
  country: string;
  email: string;
  phone: string;
  engineer_reference: string;
  password: string;
  confirmPassword: string;
};

const countryOptions = [
  'India',
  'United States',
  'United Kingdom',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'Oman',
  'Kuwait',
  'Bangladesh',
  'Nepal',
  'Sri Lanka',
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Thailand',
  'Vietnam',
  'Australia',
  'Canada',
  'Germany',
  'France',
  'South Africa',
  'Other',
];

const defaultSignupForm: SignupForm = {
  name: '',
  company_name: '',
  country: '',
  email: '',
  phone: '',
  engineer_reference: '',
  password: '',
  confirmPassword: '',
};

const Login = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupForm, setSignupForm] = useState<SignupForm>(defaultSignupForm);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cardTitle = useMemo(
    () => (mode === 'login' ? 'Access ROI Calculators' : 'Create Your Account'),
    [mode]
  );

  const cardDescription = useMemo(
    () =>
      mode === 'login'
        ? 'Sign in to continue with the Absstem ROI calculator suite.'
        : 'Register with your work details to access all ROI calculators.',
    [mode]
  );

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    resetMessages();

    if (!email.trim()) {
      setError('Enter your email address first, then click Forgot password.');
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password reset email sent. Open the recovery link in your inbox to set a new password.');
    }

    setResetLoading(false);
  };

  const updateSignupField = <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => {
    setSignupForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Password and confirm password must match.');
      setLoading(false);
      return;
    }

    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    const profilePayload = {
      name: signupForm.name.trim(),
      company_name: signupForm.company_name.trim() || null,
      country: signupForm.country,
      phone: signupForm.phone.trim(),
      engineer_reference: signupForm.engineer_reference.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email.trim(),
      password: signupForm.password,
      options: {
        data: profilePayload,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          ...profilePayload,
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    if (!data.session) {
      setSuccess('Account created. Please verify your email, then sign in to continue.');
      setEmail(signupForm.email.trim());
      setPassword('');
      setSignupForm(defaultSignupForm);
      setMode('login');
    } else {
      setSuccess('Account created successfully. Redirecting you into the calculators...');
    }

    setLoading(false);
  };

  const renderPasswordToggle = (visible: boolean, onToggle: () => void, label: string) => (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-700"
    >
      {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_45%,#f8fafc_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:38px_38px] opacity-40" />
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
          <section className="rounded-[2rem] border border-white/70 bg-slate-900 px-6 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:px-8 lg:px-10">
            <div className="inline-flex items-center rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-1 text-sm font-medium text-blue-100">
              Absstem ROI Calculators
            </div>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Secure access for industrial ROI planning.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Sign in or create an account to access all ROI calculators, generate reports.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Savings against Liquid Nitrogen</p>
                <p className="mt-2 text-sm text-slate-300">
                  Calculate potential cost savings by replacing liquid nitrogen systems with more efficient alternatives.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Savings Against any PSA</p>
                <p className="mt-2 text-sm text-slate-300">
                  Evaluate cost benefits of upgrading from Pressure Swing Adsorption (PSA) systems to determine optimal gas generation solutions.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Savings against Cylinders</p>
                <p className="mt-2 text-sm text-slate-300">
                  Assess potential savings from replacing traditional pneumatic cylinder systems with our advanced alternatives.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8">
            <div className="mb-6 flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Create Account
              </button>
            </div>

            <h2 className="text-3xl font-semibold text-slate-900">{cardTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{cardDescription}</p>

            {success && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="password"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      type={showLoginPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    {renderPasswordToggle(
                      showLoginPassword,
                      () => setShowLoginPassword((current) => !current),
                      showLoginPassword ? 'Hide password' : 'Show password'
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading || resetLoading}
                  >
                    {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading || resetLoading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleSignup}>
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    id="name"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    type="text"
                    placeholder="Your full name"
                    value={signupForm.name}
                    onChange={(e) => updateSignupField('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="company_name" className="text-sm font-medium text-slate-700">
                    Company name
                  </label>
                  <input
                    id="company_name"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    type="text"
                    placeholder="Your company"
                    value={signupForm.company_name}
                    onChange={(e) => updateSignupField('company_name', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="country" className="text-sm font-medium text-slate-700">
                    Country
                  </label>
                  <select
                    id="country"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    value={signupForm.country}
                    onChange={(e) => updateSignupField('country', e.target.value)}
                    required
                  >
                    <option value="">Select your country</option>
                    {countryOptions.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="signup_email" className="text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    id="signup_email"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    type="email"
                    placeholder="you@company.com"
                    value={signupForm.email}
                    onChange={(e) => updateSignupField('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                    Phone number
                  </label>
                  <input
                    id="phone"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={signupForm.phone}
                    onChange={(e) => updateSignupField('phone', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="engineer_reference" className="text-sm font-medium text-slate-700">
                    Engineer reference
                  </label>
                  <input
                    id="engineer_reference"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    type="text"
                    placeholder="Optional"
                    value={signupForm.engineer_reference}
                    onChange={(e) => updateSignupField('engineer_reference', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="signup_password" className="text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="signup_password"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      type={showSignupPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={signupForm.password}
                      onChange={(e) => updateSignupField('password', e.target.value)}
                      required
                    />
                    {renderPasswordToggle(
                      showSignupPassword,
                      () => setShowSignupPassword((current) => !current),
                      showSignupPassword ? 'Hide password' : 'Show password'
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <div className="relative mt-2">
                    <input
                      id="confirmPassword"
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      type={showSignupConfirmPassword ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => updateSignupField('confirmPassword', e.target.value)}
                      required
                    />
                    {renderPasswordToggle(
                      showSignupConfirmPassword,
                      () => setShowSignupConfirmPassword((current) => !current),
                      showSignupConfirmPassword ? 'Hide password' : 'Show password'
                    )}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Complete Registration'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Login;
