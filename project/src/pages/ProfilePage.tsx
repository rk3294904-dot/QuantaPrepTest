import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownCircle, ArrowUpCircle, CalendarCheck, Coins, Crown, Gift, LogOut, Mail, CalendarDays, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage, formatDate, formatDateTime } from '@/lib/utils';
import { DAILY_BONUS_COINS, PREMIUM_COST } from '@/lib/constants';
import { updateOwnName } from '@/services/userService';
import { listUserAttempts } from '@/services/attemptService';
import { claimDailyBonus, listCoinTransactions } from '@/services/coinService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { PageHeader, Skeleton } from '@/components/ui/Feedback';
import { PremiumModal } from '@/components/ui/PremiumModal';
import type { CoinTransaction } from '@/lib/types';

const NAME_MIN = 2;
const NAME_MAX = 60;

export function ProfilePage() {
  const { firebaseUser, profile, signOutUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const uid = firebaseUser?.uid ?? '';
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile]);

  const attemptsQuery = useQuery({
    queryKey: ['attempts', uid],
    queryFn: () => listUserAttempts(uid),
    enabled: Boolean(uid),
  });

  const coinTxQuery = useQuery({
    queryKey: ['coinTransactions', uid],
    queryFn: () => listCoinTransactions(uid),
    enabled: Boolean(uid),
  });

  const bonusMutation = useMutation({
    mutationFn: () => claimDailyBonus(uid),
    onSuccess: () => {
      toast.success('Daily bonus claimed!', `${DAILY_BONUS_COINS} coins added to your balance.`);
      void queryClient.invalidateQueries({ queryKey: ['coinTransactions', uid] });
    },
    onError: (error: unknown) => toast.error('Could not claim bonus', errorMessage(error, 'Please try again.')),
  });

  const saveMutation = useMutation({
    mutationFn: (value: string) => updateOwnName(uid, value),
    onSuccess: () => toast.success('Profile updated', 'Your name has been saved.'),
    onError: (error) => toast.error('Could not save', errorMessage(error, 'Please try again.')),
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const submittedCount = (attemptsQuery.data ?? []).filter((a) => a.status === 'submitted').length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) {
      setNameError(`Use between ${NAME_MIN} and ${NAME_MAX} characters.`);
      return;
    }
    setNameError(undefined);
    saveMutation.mutate(trimmed);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader eyebrow="Profile" title="Your account" description="Manage how your name appears on leaderboards." />

      <section className="surface flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-700 text-2xl font-bold text-white">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{profile.name}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={profile.isPremium ? 'secondary' : 'neutral'}>
              {profile.isPremium ? (
                <span className="inline-flex items-center gap-1"><Crown className="h-3 w-3" /> Premium</span>
              ) : (
                'Free plan'
              )}
            </Badge>
            <Badge tone="primary">{submittedCount} submitted test{submittedCount === 1 ? '' : 's'}</Badge>
          </div>
          <dl className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-400 sm:grid-cols-2">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" aria-hidden /> {profile.email}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden /> Joined {formatDate(profile.createdAt)}</div>
          </dl>
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Display name</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This name appears next to your leaderboard rank.</p>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <FormField label="Name" htmlFor="profile-name" error={nameError}>
              <input
                id="profile-name"
                className="input-base"
                value={name}
                maxLength={NAME_MAX}
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>
          </div>
          <Button type="submit" className="sm:mt-7" loading={saveMutation.isPending}>
            Save name
          </Button>
        </form>
      </section>

      {!profile.isPremium && (
        <section className="surface overflow-hidden p-0">
          <div className="bg-gradient-to-r from-secondary-600 to-primary-700 p-6 text-white sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                  <Crown className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="text-lg font-bold">Upgrade to Premium</p>
                  <p className="text-sm text-white/80">Unlock all premium tests with your coins or a coupon</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
                <Coins className="h-4 w-4" aria-hidden />
                <span className="font-bold">{profile.coins}/{PREMIUM_COST}</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <Button variant="secondary" icon={<Crown className="h-4 w-4" />} onClick={() => setPremiumOpen(true)}>
              View premium options
            </Button>
          </div>
        </section>
      )}

      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      {/* Daily bonus */}
      <DailyBonusCard uid={uid} coins={profile.coins} onClaim={() => bonusMutation.mutate()} loading={bonusMutation.isPending} />

      {/* Coin transaction history */}
      <CoinTransactionHistory transactions={coinTxQuery.data ?? []} loading={coinTxQuery.isLoading} />

      <section className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Sign out</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">You can sign back in any time with Google.</p>
        </div>
        <Button
          variant="outline"
          icon={<LogOut className="h-4 w-4" />}
          onClick={() => void signOutUser().catch((error: unknown) => toast.error('Sign out failed', errorMessage(error, 'Please try again.')))}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}

function DailyBonusCard({ uid, coins, onClaim, loading }: { uid: string; coins: number; onClaim: () => void; loading: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const lastBonusQuery = useQuery({
    queryKey: ['dailyBonus', uid],
    queryFn: async () => {
      const { getLastDailyBonus } = await import('@/services/coinService');
      return getLastDailyBonus(uid);
    },
    enabled: Boolean(uid),
  });

  const claimedToday = lastBonusQuery.data === today;

  return (
    <section className="surface overflow-hidden p-0">
      <div className="bg-gradient-to-r from-accent-600 to-primary-700 p-6 text-white sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Gift className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-bold">Daily Bonus</p>
              <p className="text-sm text-white/80">
                {claimedToday ? "Come back tomorrow for more coins!" : `Claim ${DAILY_BONUS_COINS} free coins every day`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
            <Coins className="h-4 w-4" aria-hidden />
            <span className="font-bold">{coins} coins</span>
          </div>
        </div>
      </div>
      <div className="p-6">
        {lastBonusQuery.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : claimedToday ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success-50 py-4 text-sm font-semibold text-success-700 dark:bg-success-600/15 dark:text-success-500">
            <CalendarCheck className="h-5 w-5" aria-hidden /> Today&rsquo;s bonus already claimed
          </div>
        ) : (
          <Button variant="accent" icon={<Zap className="h-4 w-4" />} loading={loading} onClick={onClaim}>
            Claim {DAILY_BONUS_COINS} coins
          </Button>
        )}
      </div>
    </section>
  );
}

const txTypeMeta: Record<CoinTransaction['type'], { label: string; tone: 'success' | 'error' | 'primary' | 'neutral'; icon: typeof ArrowUpCircle }> = {
  referral: { label: 'Referral', tone: 'success', icon: ArrowUpCircle },
  daily_bonus: { label: 'Daily bonus', tone: 'success', icon: ArrowUpCircle },
  coupon_redeem: { label: 'Coupon', tone: 'primary', icon: Gift },
  premium_purchase: { label: 'Premium', tone: 'error', icon: ArrowDownCircle },
};

function CoinTransactionHistory({ transactions, loading }: { transactions: CoinTransaction[]; loading: boolean }) {
  return (
    <section className="surface p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <Coins className="h-5 w-5 text-accent-600" aria-hidden /> Coin history
      </h2>
      {loading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <Coins className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No coin activity yet. Claim your daily bonus or refer friends to get started.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {transactions.map((tx) => {
            const meta = txTypeMeta[tx.type];
            const Icon = meta.icon;
            return (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    tx.amount > 0
                      ? 'bg-success-100 text-success-700 dark:bg-success-600/15 dark:text-success-500'
                      : tx.amount < 0
                        ? 'bg-error-100 text-error-600 dark:bg-error-600/15 dark:text-error-500'
                        : 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                  }`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{tx.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(tx.createdAt)}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-sm font-bold ${
                  tx.amount > 0
                    ? 'text-success-700 dark:text-success-500'
                    : tx.amount < 0
                      ? 'text-error-700 dark:text-error-500'
                      : 'text-primary-700 dark:text-primary-300'
                }`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
