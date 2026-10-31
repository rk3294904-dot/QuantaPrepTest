import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Coins, Crown, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/utils';
import { PREMIUM_COST } from '@/lib/constants';
import { buyPremiumWithCoins } from '@/services/premiumService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const perks = [
  'Unlock every premium test in the library',
  'Access full answer keys and explanations',
  'Priority leaderboard rankings',
  'Unlimited attempts on all tests',
];

export function PremiumModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { firebaseUser, profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const uid = firebaseUser?.uid ?? '';
  const balance = profile?.coins ?? 0;
  const isPremium = profile?.isPremium ?? false;
  const shortfall = Math.max(0, PREMIUM_COST - balance);
  const canAfford = balance >= PREMIUM_COST;

  const buyMutation = useMutation({
    mutationFn: () => buyPremiumWithCoins(uid),
    onSuccess: () => {
      toast.success('Premium unlocked!', `${PREMIUM_COST} coins spent. All premium tests are now available.`);
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      onClose();
    },
    onError: (error: unknown) => toast.error('Could not complete purchase', errorMessage(error, 'Please try again.')),
  });

  return (
    <Modal open={open} onClose={onClose} title="Upgrade to Premium" size="md">
      <div className="space-y-6">
        {/* Plan badge */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-secondary-600 to-primary-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Crown className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-lg font-bold">Premium Plan</p>
              <p className="text-sm text-white/80">Unlock the full test library</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5">
            <Coins className="h-4 w-4" aria-hidden />
            <span className="text-lg font-extrabold">{PREMIUM_COST}</span>
          </div>
        </div>

        {/* Perks */}
        <ul className="space-y-3">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700 dark:bg-success-600/20 dark:text-success-500">
                <Check className="h-3.5 w-3.5" aria-hidden />
              </span>
              {perk}
            </li>
          ))}
        </ul>

        {/* Coin balance */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Coins className="h-4 w-4 text-accent-600" aria-hidden />
              Your coin balance
            </span>
            <Badge tone={canAfford ? 'success' : 'warning'}>{balance} coins</Badge>
          </div>
          {!canAfford && (
            <p className="mt-2 text-sm text-warning-700 dark:text-warning-500">
              You need {shortfall} more coin{shortfall === 1 ? '' : 's'} to unlock premium. Refer friends to earn coins!
            </p>
          )}
        </div>

        {/* Action */}
        {isPremium ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success-50 py-4 text-sm font-semibold text-success-700 dark:bg-success-600/15 dark:text-success-500">
            <Crown className="h-5 w-5" aria-hidden /> You are already on the premium plan
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              loading={buyMutation.isPending}
              disabled={!canAfford}
              icon={<Zap className="h-4 w-4" />}
              onClick={() => buyMutation.mutate()}
            >
              {canAfford ? `Buy premium for ${PREMIUM_COST} coins` : 'Not enough coins'}
            </Button>
            {!canAfford && (
              <a
                href="/referral"
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-700 transition hover:underline dark:text-primary-300"
              >
                <Sparkles className="h-3.5 w-3.5" /> Earn coins by referring friends
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
