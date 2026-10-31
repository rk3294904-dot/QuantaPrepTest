import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Bot, Gift, LayoutDashboard, LogOut, Moon, NotebookPen, Shield, Sun, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { APP_NAME, TAGLINE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';

const navItems = [
  { to: '/categories', label: 'Test Series' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/revise', label: 'Quanta Revise' },
];

const bottomNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/categories', label: 'Test', icon: BookOpen },
  { to: '/revise', label: 'Revise', icon: NotebookPen },
  { to: '/ai', label: 'AI', icon: Bot },
];

export function SiteLayout() {
  const { firebaseUser, profile, isAdmin, signOutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85 print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive
                        ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-900/30"
                >
                  <Shield className="h-4 w-4" aria-hidden />
                  Admin
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile upper-right controls: profile, theme, animated refer & earn */}
            {firebaseUser && (
              <div className="flex items-center gap-1.5 md:hidden">
                <Link
                  to="/profile"
                  className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Profile"
                >
                  <User className="h-5 w-5" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <Link
                  to="/referral"
                  className="group relative flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-700 to-accent-700 px-2 py-1.5 text-[11px] font-extrabold leading-none shadow-sm transition active:scale-95 sm:px-2.5 sm:text-xs"
                  aria-label="Refer and earn"
                >
                  <Gift className="h-3.5 w-3.5 shrink-0 animate-pulse text-amber-300" aria-hidden />
                  <span className="hidden whitespace-nowrap sm:inline">
                    <span className="text-white">Refer</span>
                    <span className="ml-1 animate-pulse text-amber-300">&amp; Earn</span>
                  </span>
                  {Boolean(profile?.coins) && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-primary-900">
                      {profile?.coins ?? 0}
                    </span>
                  )}
                </Link>
              </div>
            )}

            {/* Desktop referral icon */}
            {firebaseUser && (
              <Link
                to="/referral"
                className="relative hidden rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:block dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Refer &amp; earn"
                title="Refer &amp; earn"
              >
                <Gift className="h-5 w-5" aria-hidden />
                {Boolean(profile?.coins) && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
                    {profile?.coins ?? 0}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:block dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {firebaseUser ? (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/profile" className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-3 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Avatar name={profile?.name ?? firebaseUser.displayName ?? 'Student'} src={profile?.photoURL ?? firebaseUser.photoURL} />
                  <span className="max-w-[120px] truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                    {profile?.name ?? 'Profile'}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void signOutUser()}
                  className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link to="/login">
                <Button size="sm">Sign in</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main key={location.pathname} className="flex-1 animate-fade-up pb-20 md:pb-0">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-950/95 print:hidden"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-4">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition',
                    active ? 'text-primary-700 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <footer className="hidden border-t border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-950 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{APP_NAME}</span> | {TAGLINE}
            </span>
          </div>
          <p>Built for focused practice and honest analysis.</p>
        </div>
      </footer>
    </div>
  );
}

export function Avatar({ name, src, size = 'sm' }: { name: string; src?: string | null; size?: 'sm' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const dimension = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-8 w-8 text-xs';
  if (src) {
    return <img src={src} alt="" referrerPolicy="no-referrer" className={cn('shrink-0 rounded-full object-cover', dimension)} />;
  }
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-800 dark:bg-accent-900/50 dark:text-accent-200', dimension)}>
      {initials || '?'}
    </span>
  );
}
