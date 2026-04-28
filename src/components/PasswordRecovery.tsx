import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

type PasswordRecoveryProps = {
  onCancel: () => void;
};

export default function PasswordRecovery({ onCancel }: PasswordRecoveryProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
              <input
                id="recovery-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                type="password"
                placeholder="Create a new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="recovery-confirm-password" className="text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="recovery-confirm-password"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                type="password"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
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
