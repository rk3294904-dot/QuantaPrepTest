import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { APP_NAME, TAGLINE } from '@/lib/constants';
import { errorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.6 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function LoginPage() {
  const { firebaseUser, loading, signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/categories';

  if (!loading && firebaseUser) return <Navigate to={from} replace />;

  const handleSignIn = async () => {
    setSubmitting(true);
    try {
      await signIn();
      navigate(from, { replace: true });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        toast.error('Sign-in failed', errorMessage(error, 'Please try again in a moment.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl items-center px-4 py-12 sm:px-6">
      <div className="grid w-full items-center gap-10 md:grid-cols-2">
        <div className="animate-fade-up">
          <Logo />
          <h1 className="mt-8 text-4xl font-extrabold text-slate-900 dark:text-white">{TAGLINE}</h1>
          <p className="mt-4 max-w-md text-slate-600 dark:text-slate-400">
            Sign in to take timed tests, track your progress, and climb the {APP_NAME} leaderboard.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-700" /> Sign in with your Google account only</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-700" /> Your progress is saved automatically</li>
          </ul>
        </div>

        <div className="surface animate-fade-up p-8 [animation-delay:100ms] sm:p-10">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Continue with the Google account you want to use for tests.</p>
          <Button
            variant="outline"
            size="lg"
            className="mt-8 w-full gap-3 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:bg-slate-900"
            onClick={() => void handleSignIn()}
            loading={submitting}
          >
            {!submitting && <GoogleGlyph />}
            Continue with Google
          </Button>
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            By continuing you agree to use {APP_NAME} for personal exam preparation.
          </p>
        </div>
      </div>
    </div>
  );
}
