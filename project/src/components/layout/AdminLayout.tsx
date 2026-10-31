import { NavLink, Outlet, Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, ClipboardList, FolderTree, LayoutDashboard, Sprout, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/admin/tests', label: 'Tests', icon: ClipboardList, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/admin/seed', label: 'Seed data', icon: Sprout, end: false },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="px-6 py-6">
          <p className="text-lg font-bold text-slate-900 dark:text-white">QuantaPrep Admin</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Manage content and students</p>
        </div>
        <nav className="flex-1 space-y-1 px-3" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-primary-300">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to site
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-900" aria-label="Admin navigation">
          <span className="shrink-0 self-center pr-2 text-sm font-bold text-slate-900 dark:text-white">QuantaPrep Admin</span>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-primary-700 text-white' : 'text-slate-600 dark:text-slate-400',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="px-4 py-6 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
