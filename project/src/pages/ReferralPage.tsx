import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Coins, Copy, Gift, Link2, Share2, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage, formatDate } from '@/lib/utils';
import { REFERRAL_COINS } from '@/lib/constants';
import { listReferralsBy, redeemReferralCode } from '@/services/referralService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader, Skeleton } from '@/components/ui/Feedback';

export function ReferralPage() {
  const { firebaseUser, profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const uid = firebaseUser?.uid ?? '';
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');

  const referralsQuery = useQuery({
    queryKey: ['referrals', uid],
    queryFn: () => listReferralsBy(uid),
    enabled: Boolean(uid),
  });

  const redeemMutation = useMutation({
    mutationFn: (code: string) => {
      if (!firebaseUser) throw new Error('Please sign in first.');
      return redeemReferralCode(firebaseUser, code);
    },
    onSuccess: () => {
      toast.success('Referral applied', `${REFERRAL_COINS} coins credited to your referrer.`);
      setRedeemCode('');
      void queryClient.invalidateQueries({ queryKey: ['referrals', uid] });
    },
    onError: (error: unknown) => toast.error('Could not apply code', errorMessage(error, 'Please try again.')),
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const referralCode = profile.referralCode;
  const shareLink = `${window.location.origin}/login?ref=${referralCode}`;
  const referrals = referralsQuery.data ?? [];
  const totalEarned = referrals.reduce((sum, r) => sum + r.coinsAwarded, 0);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied', 'Share it with friends to earn coins.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy', 'Copy the link manually instead.');
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on QuantaPrep',
          text: 'Practice timed mock tests and track your progress. Use my referral code to sign up.',
          url: shareLink,
        });
      } catch {
        // user dismissed the share sheet
      }
    } else {
      void copyLink();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Refer &amp; earn"
        title="Invite friends, earn coins"
        description={`Share your referral link. Every friend who signs up earns you ${REFERRAL_COINS} coins.`}
      />

      <section className="surface overflow-hidden p-0">
        <div className="bg-gradient-to-br from-primary-700 to-accent-700 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Your referral code</p>
              <p className="mt-1 text-3xl font-extrabold tracking-wider">{referralCode || '—'}</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-3 backdrop-blur-sm">
              <Coins className="h-6 w-6" aria-hidden />
              <span className="text-2xl font-bold">{profile.coins}</span>
              <span className="text-sm text-white/80">coins</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6 sm:p-8">
          <div>
            <label htmlFor="referral-link" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Your referral link
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                <Link2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <input
                  id="referral-link"
                  readOnly
                  value={shareLink}
                  className="min-w-0 flex-1 truncate bg-transparent text-sm text-slate-700 outline-none dark:text-slate-200"
                />
              </div>
              <Button variant="outline" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void copyLink()}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1 sm:flex-none" icon={<Share2 className="h-4 w-4" />} onClick={() => void shareNative()}>
              Share link
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your friend must open this link, then sign in with Google. We credit your coins automatically once their account is created.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5">
          <Users className="h-6 w-6 text-primary-700 dark:text-primary-300" aria-hidden />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{referrals.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Friends referred</p>
        </div>
        <div className="surface p-5">
          <Gift className="h-6 w-6 text-accent-700 dark:text-accent-300" aria-hidden />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{totalEarned}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Coins earned</p>
        </div>
        <div className="surface p-5">
          <Coins className="h-6 w-6 text-secondary-700 dark:text-secondary-300" aria-hidden />
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{profile.coins}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Current balance</p>
        </div>
      </section>

      {profile.referredBy == null && (
        <section className="surface p-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Have a referral code?</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enter a friend's code to credit them {REFERRAL_COINS} coins. You can only do this once.
          </p>
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const code = redeemCode.trim();
              if (code) redeemMutation.mutate(code);
            }}
          >
            <input
              className="input-base flex-1 uppercase"
              placeholder="Enter code"
              value={redeemCode}
              maxLength={8}
              onChange={(event) => setRedeemCode(event.target.value)}
              aria-label="Referral code"
            />
            <Button type="submit" loading={redeemMutation.isPending} icon={<Sparkles className="h-4 w-4" />}>
              Apply code
            </Button>
          </form>
        </section>
      )}

      <section className="surface p-6">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Referral history</h2>
        {referralsQuery.isLoading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <Gift className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              No referrals yet. Share your link to start earning coins.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {referrals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{r.referredName}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {r.referredEmail || '—'} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <Badge tone="success">+{r.coinsAwarded} coins</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
