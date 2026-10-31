import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { ADMIN_EMAIL, REFERRAL_QUERY_KEY } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';
import { ensureUserProfile, toUserProfile } from '@/services/userService';
import { applyReferralCode } from '@/services/referralService';

const PENDING_REFERRAL_KEY = 'quantaprep:pendingReferral';

// Capture a ?ref=CODE from the URL before the SPA navigates, and remember it across the
// Google sign-in redirect/popup round-trip. Applied once on first profile creation.
function captureReferralCode() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get(REFERRAL_QUERY_KEY)?.trim().toUpperCase() ?? '';
  if (fromUrl) {
    window.sessionStorage.setItem(PENDING_REFERRAL_KEY, fromUrl);
  }
}

function consumeReferralCode(): string | null {
  const stored = window.sessionStorage.getItem(PENDING_REFERRAL_KEY);
  if (!stored) return null;
  window.sessionStorage.removeItem(PENDING_REFERRAL_KEY);
  return stored;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    captureReferralCode();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      profileUnsubscribe.current?.();
      profileUnsubscribe.current = null;
      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const refCode = consumeReferralCode();
      ensureUserProfile(user)
        .then(async (created) => {
          if (created && refCode) {
            // Apply the referral once, after the profile is created. Failures are swallowed so a bad code never blocks login.
            try {
              await applyReferralCode(user, refCode);
            } catch {
              // ignore invalid / self-referral / network errors during signup
            }
          }
        })
        .catch(() => undefined)
        .finally(() => {
          profileUnsubscribe.current = onSnapshot(
            doc(db, 'users', user.uid),
            (snap) => {
              setProfile(snap.exists() ? toUserProfile(snap.id, snap.data()) : null);
              setLoading(false);
            },
            () => {
              setProfile(null);
              setLoading(false);
            },
          );
        });
    });

    return () => {
      unsubscribeAuth();
      profileUnsubscribe.current?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      loading,
      isAdmin: firebaseUser?.email === ADMIN_EMAIL && firebaseUser.emailVerified === true,
      signIn: async () => {
        await signInWithPopup(auth, googleProvider);
      },
      signOutUser: async () => {
        await signOut(auth);
      },
    }),
    [firebaseUser, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
