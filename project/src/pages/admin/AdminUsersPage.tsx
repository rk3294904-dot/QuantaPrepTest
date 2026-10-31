import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { errorMessage, formatDate, formatDateTime } from '@/lib/utils';
import type { Attempt, UserProfile } from '@/lib/types';
import { listUserAttempts } from '@/services/attemptService';
import { listUsersPage, searchUsersByEmail, setUserFlags } from '@/services/userService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';
import { Toggle } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const term = search.trim();

  const pagedQuery = useInfiniteQuery({
    queryKey: ['admin', 'users', 'paged'],
    queryFn: ({ pageParam }) => listUsersPage(pageParam),
    initialPageParam: undefined as Parameters<typeof listUsersPage>[0],
    getNextPageParam: (last) => last.cursor ?? undefined,
    enabled: term === '',
  });
  const searchQuery = useQuery({
    queryKey: ['admin', 'users', 'search', term.toLowerCase()],
    queryFn: () => searchUsersByEmail(term),
    enabled: term !== '',
  });

  const users = term
    ? (searchQuery.data ?? [])
    : (pagedQuery.data?.pages.flatMap((page) => page.users) ?? []);
  const isLoading = term ? searchQuery.isLoading : pagedQuery.isLoading;
  const isError = term ? searchQuery.isError : pagedQuery.isError;
  const retry = () => (term ? searchQuery.refetch() : pagedQuery.refetch());

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="People"
        title="Users"
        description="Search by email to find a student. Open a student to view attempts, grant premium, or block access."
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          className="input-base pl-10"
          placeholder="Search by email start, e.g. name@gmail.com"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users by email"
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-72" />
      ) : isError ? (
        <ErrorState onRetry={() => void retry()} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={term ? 'No users match that email' : 'No users yet'}
          description={term ? 'Email search matches the start of an address.' : 'Users appear here after they sign in with Google.'}
        />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 font-semibold">Access</th>
                  <th className="px-5 py-3 text-right font-semibold">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.uid} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {user.blocked && <Badge tone="error">Blocked</Badge>}
                        {user.isPremium && <Badge tone="secondary">Premium</Badge>}
                        {!user.blocked && !user.isPremium && <Badge tone="neutral">Free</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelected(user)}>Manage</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!term && pagedQuery.hasNextPage && (
            <div className="flex justify-center border-t border-slate-100 p-4 dark:border-slate-800">
              <Button variant="ghost" loading={pagedQuery.isFetchingNextPage} onClick={() => void pagedQuery.fetchNextPage()}>
                Load more users
              </Button>
            </div>
          )}
        </div>
      )}

      <UserDetailModal user={selected} onClose={() => setSelected(null)} onChanged={setSelected} />
    </div>
  );
}

function UserDetailModal({
  user,
  onClose,
  onChanged,
}: {
  user: UserProfile | null;
  onClose: () => void;
  onChanged: (user: UserProfile) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const attemptsQuery = useQuery({
    queryKey: ['admin', 'user-attempts', user?.uid],
    queryFn: () => listUserAttempts(user?.uid ?? '', 20),
    enabled: Boolean(user),
  });

  const flagMutation = useMutation({
    mutationFn: (flags: { isPremium?: boolean; blocked?: boolean }) => setUserFlags(user?.uid ?? '', flags),
    onSuccess: (_result, flags) => {
      if (user) onChanged({ ...user, ...flags });
      toast.success('Access updated');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => toast.error('Could not update access', errorMessage(error, 'Please try again.')),
  });

  return (
    <Modal open={user !== null} onClose={onClose} title={user?.name ?? 'Student'} size="lg">
      {user && (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
            <p className="text-xs text-slate-500 dark:text-slate-500">Joined {formatDate(user.createdAt)}</p>
          </div>

          <div className="space-y-3">
            <Toggle
              checked={user.isPremium}
              onChange={(value) => flagMutation.mutate({ isPremium: value })}
              label="Premium access"
              description="Lets the student start premium tests."
            />
            <Toggle
              checked={user.blocked}
              onChange={(value) => flagMutation.mutate({ blocked: value })}
              label="Blocked"
              description="Blocked students cannot start new attempts."
            />
          </div>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Recent attempts</h3>
            {attemptsQuery.isLoading ? (
              <Skeleton className="h-24" />
            ) : attemptsQuery.isError ? (
              <ErrorState onRetry={() => void attemptsQuery.refetch()} />
            ) : (attemptsQuery.data ?? []).length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                This student has not started any tests yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {(attemptsQuery.data ?? []).map((attempt) => (
                  <AttemptRow key={attempt.id} attempt={attempt} />
                ))}
              </ul>
            )}
          </section>
          {flagMutation.isPending && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Saving...</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function AttemptRow({ attempt }: { attempt: Attempt }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{attempt.testTitle}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Attempt {attempt.attemptNo} - {formatDateTime(attempt.startedAt)}
        </p>
      </div>
      {attempt.status === 'submitted' ? (
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {attempt.score ?? '-'} / {attempt.totalMarks}
        </span>
      ) : (
        <Badge tone="warning">In progress</Badge>
      )}
    </li>
  );
}
