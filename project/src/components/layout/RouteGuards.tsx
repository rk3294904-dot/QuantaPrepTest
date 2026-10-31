import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Skeleton, EmptyState } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';

export function PageLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-12 sm:px-6">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-5 w-2/3" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading />;
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (profile?.blocked) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState
          icon={Ban}
          title="Your account is blocked"
          description="You cannot start tests while your account is blocked. Please contact the QuantaPrep team if you think this is a mistake."
          action={
            <Link to="/">
              <Button variant="outline">Back to home</Button>
            </Link>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { firebaseUser, isAdmin, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
