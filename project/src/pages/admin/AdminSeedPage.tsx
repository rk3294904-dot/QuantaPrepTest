import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/utils';
import { seedSampleData } from '@/services/seedService';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Feedback';

export function AdminSeedPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: seedSampleData,
    onSuccess: (count) => {
      toast.success('Sample data added', `${count} tests with questions are now published.`);
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => toast.error('Could not add sample data', errorMessage(error, 'Please try again.')),
  });

  const handleSeed = () => {
    const confirmed = window.confirm(
      'This adds 4 categories, 3 published tests and 30 questions. Running it again adds duplicates. Continue?',
    );
    if (confirmed) seedMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Setup"
        title="Sample data"
        description="Add a starter set of categories and tests so you can see the student experience right away."
      />

      <section className="surface space-y-5 p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
          <Database className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">What gets added</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-400">
            <li>Four categories: Quantitative Aptitude, Logical Reasoning, Data Interpretation and Mixed Practice.</li>
            <li>Two free tests and one premium test, each with 10 questions and answer keys.</li>
            <li>All three tests are published, so they appear on the student side straight away.</li>
          </ul>
        </div>
        <p className="rounded-xl bg-warning-50 p-4 text-sm text-warning-700 dark:bg-warning-600/15 dark:text-warning-500">
          Run this once on a fresh project. Running it again creates duplicate categories and tests.
        </p>
        <div className="flex justify-end">
          <Button onClick={handleSeed} loading={seedMutation.isPending}>Add sample data</Button>
        </div>
      </section>
    </div>
  );
}
