import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

type PasswordRecoveryProps = {
  onCancel: () => void;
};

export default function PasswordRecovery({ onCancel }: PasswordRecoveryProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setError('Invalid or expired recovery link. Please request a new one.');
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');

    if (type === 'recovery' && access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setError('Recovery session expired. Please request a new reset link.');
        } else {
          setSessionReady(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      });
    } else {
      setError('Invalid recovery link. Please request a new one.');
    }
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess('Password updated successfully. You can continue into the calculators now.');
    setPassword('');
    setConfirmPassword('');
    setLoading(false);
  };

  return (
    <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_45%,#f8fafc_100%)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:38px_38px] opacity-40" />
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_25px_60px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700">
            Password Recovery
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-slate-900">Set a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your recovery link has been verified. Create a new password to regain access to the ROI calculators.
          </p>

          {!sessionReady && !error && (
            <p className="mt-6 text-sm text-slate-500">Verifying your recovery link...</p>
          )}

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

          <form className="mt-8 space-y-5" onSubmit={handlePasswordUpdate}>
            <div>
              <label htmlFor="recovery-password" className="text-sm font-medium text-slate-700">
                New password
              </label>
              <div className="relative mt-2">
                <input
                  id="recovery-password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((c) => !c)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="recovery-confirm-password" className="text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <div className="relative mt-2">
                <input
                  id="recovery-confirm-password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((c) => !c)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading || !sessionReady}
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}