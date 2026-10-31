import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Award, BarChart3, ChevronDown, Layers, ListChecks, Target, Timer, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { APP_NAME, TAGLINE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CardSkeleton, ErrorState } from '@/components/ui/Feedback';
import { listCategories } from '@/services/categoryService';

const features = [
  { icon: Timer, title: 'Exam-like timer', text: 'Server-synced countdown with auto-submit, so every mock feels like the real thing.' },
  { icon: ListChecks, title: 'Question palette', text: 'Track answered, skipped, and marked-for-review questions at a glance.' },
  { icon: BarChart3, title: 'Deep analytics', text: 'Section and topic charts show where your marks leak, plus your rank among first attempts.' },
  { icon: Award, title: 'Certificates and score cards', text: 'Pass a test to download a certificate, or share your score in one tap.' },
  { icon: Target, title: 'Quanta Revise', text: 'Every question you got wrong is collected into a focused revision queue.' },
  { icon: Layers, title: 'Math-ready', text: 'Formulas render cleanly with KaTeX, with images for diagrams and graphs.' },
];

const steps = [
  { title: 'Sign in with Google', text: 'One click. No passwords to remember.' },
  { title: 'Pick a test series', text: 'Browse by subject and filter for free or premium tests.' },
  { title: 'Attempt and analyse', text: 'Take the test, then study your score, rank, and mistakes.' },
];

const faqs = [
  { q: 'Is QuantaPrep free to use?', a: 'Free tests are available to every signed-in student. Premium tests are unlocked on your profile by the QuantaPrep team.' },
  { q: 'How is my score calculated?', a: 'Each correct answer earns its marks, each wrong answer deducts that question\'s penalty (or the test default), and skipped questions score zero. Totals never drop below zero.' },
  { q: 'Does my rank change if I retake a test?', a: 'Only your first attempt counts for the leaderboard. Retakes are practice and show up in your dashboard analytics.' },
  { q: 'Can I resume after a refresh or a closed tab?', a: 'Yes. Your answers autosave every 30 seconds and the timer continues from the original start time.' },
];

export function LandingPage() {
  const { firebaseUser } = useAuth();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    enabled: Boolean(firebaseUser),
  });
  const popular = (categories.data ?? []).filter((c) => c.isActive && c.parentId === null).slice(0, 4);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50 via-white to-white dark:from-primary-900/30 dark:via-slate-950 dark:to-slate-950" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-800 dark:border-accent-800 dark:bg-accent-900/30 dark:text-accent-200">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-600" />
              {APP_NAME} test series
            </span>
            <h1 className="mt-5 text-4xl font-extrabold text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              {TAGLINE}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-300">
              Full-length mock tests, precise timing, and analytics that show you why you lost marks. Build the habit of
              honest practice, one test at a time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={firebaseUser ? '/categories' : '/login'}>
                <Button size="lg" icon={<ArrowRight className="h-4 w-4" />}>
                  {firebaseUser ? 'Browse test series' : 'Start practising free'}
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg">
                  How it works
                </Button>
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
              {[
                ['Timed', 'exam mode'],
                ['Live', 'leaderboards'],
                ['Instant', 'analysis'],
              ].map(([value, label]) => (
                <div key={value} className="border-l-2 border-accent-500 pl-3">
                  <dt className="font-bold text-slate-900 dark:text-white">{value}</dt>
                  <dd className="text-slate-500 dark:text-slate-400">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-primary-100/60 blur-2xl dark:bg-primary-900/40" />
            <img
              src="https://images.pexels.com/photos/6958531/pexels-photo-6958531.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
              alt="Student practising maths with a notebook, calculator and textbooks"
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift"
              loading="eager"
            />
            <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lift sm:left-auto sm:right-6 sm:w-72 dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-50 text-success-700 dark:bg-success-600/15 dark:text-success-500">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">After every test</p>
                <p className="font-bold text-slate-900 dark:text-white">Score, rank and topic insights</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <SectionHeading eyebrow="Features" title="Everything a serious aspirant needs" text="Built around the exam hall experience and the analysis that comes after it." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="surface group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition group-hover:bg-primary-700 group-hover:text-white dark:bg-primary-900/40 dark:text-primary-300">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-900/40 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Popular categories" title="Start where you need the most help" text="Subjects and sub-categories with the most practice material." align="left" />
            {firebaseUser && (
              <Link to="/categories" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="mt-10">
            {!firebaseUser ? (
              <div className="surface flex flex-col items-start gap-4 p-8 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-slate-600 dark:text-slate-300">Sign in to explore the full catalogue of test series.</p>
                <Link to="/login">
                  <Button>Sign in to explore</Button>
                </Link>
              </div>
            ) : categories.isLoading ? (
              <CardSkeleton count={4} />
            ) : categories.isError ? (
              <ErrorState onRetry={() => void categories.refetch()} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {popular.map((category) => (
                  <Link
                    key={category.id}
                    to={`/categories/${category.id}`}
                    className="surface group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                      <CategoryIcon name={category.icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-slate-100">{category.name}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{category.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <SectionHeading eyebrow="How it works" title="From sign-in to insight in three steps" text="No setup, no clutter. Just the test, the timer, and the truth about your score." />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="surface relative p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-700 font-bold text-white">{index + 1}</span>
              <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" align="center" />
        <div className="mt-10 space-y-3">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-primary-800 px-8 py-12 text-center text-white shadow-lift sm:px-12 dark:bg-primary-900">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to see where you really stand?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-100">Take your first timed test and let the analysis do the rest.</p>
          <Link to={firebaseUser ? '/categories' : '/login'} className="mt-8 inline-block">
            <Button variant="accent" size="lg" icon={<ArrowRight className="h-4 w-4" />}>
              {firebaseUser ? 'Go to test series' : 'Continue with Google'}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text, align = 'center' }: { eyebrow: string; title: string; text?: string; align?: 'left' | 'center' }) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="text-xs font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-400">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">{title}</h2>
      {text && <p className="mt-3 text-slate-600 dark:text-slate-400">{text}</p>}
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left font-semibold text-slate-900 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/50"
      >
        {question}
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-all duration-300', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <p className="overflow-hidden px-6 text-sm text-slate-600 dark:text-slate-400">
          <span className={cn('block transition-all duration-300', open ? 'pb-5 opacity-100' : 'opacity-0')}>{answer}</span>
        </p>
      </div>
    </div>
  );
}
