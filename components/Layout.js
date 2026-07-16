import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUiConfig } from '../lib/use-ui-config';

const navigation = [
  { name: 'Dashboard', href: '/', icon: 'D' },
  { name: 'Schema', href: '/schema', icon: 'S' },
  { name: 'Relationships', href: '/relationships', icon: 'R' },
  { name: 'Authorization', href: '/check', icon: 'A' },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const router = useRouter();
  const config = useUiConfig();

  useEffect(() => {
    const stored = localStorage.getItem('spicedb-ui-theme');
    const initial = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(initial);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('spicedb-ui-theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [router.asPath]);

  const active = (href) => href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);
  const title = navigation.find((item) => active(item.href))?.name || 'SpiceDB UI';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-white focus:p-3">Skip to content</a>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`} aria-label="Primary navigation">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">S</span>
            <span>SpiceDB UI</span>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} className="rounded p-2 lg:hidden" aria-label="Close navigation">✕</button>
        </div>
        <nav className="space-y-1 p-3">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active(item.href) ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 text-xs dark:bg-gray-800">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen(true)} className="rounded p-2 lg:hidden" aria-label="Open navigation">☰</button>
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              <span className={`rounded-full px-2.5 py-1 font-semibold uppercase ${config.environment === 'production' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'}`}>{config.environment}</span>
              {config.readOnly && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">Read only</span>}
              <span className="hidden text-gray-500 sm:inline dark:text-gray-400">{config.user} · {config.role}</span>
              <button type="button" onClick={() => setDark((value) => !value)} className="rounded-lg border border-gray-300 px-2.5 py-1.5 dark:border-gray-700" aria-label={`Use ${dark ? 'light' : 'dark'} theme`}>{dark ? 'Light' : 'Dark'}</button>
            </div>
          </div>
        </header>
        {config.environment === 'production' && !config.readOnly && (
          <div role="alert" className="border-b border-red-300 bg-red-50 px-4 py-2 text-center text-sm font-semibold text-red-800">Production writes are enabled. Verify every change before confirming.</div>
        )}
        <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>

      {sidebarOpen && <button type="button" className="fixed inset-0 z-40 bg-gray-900/70 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}
    </div>
  );
}
