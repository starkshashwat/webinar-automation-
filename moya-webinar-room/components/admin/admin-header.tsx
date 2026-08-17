'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Rocket, 
  BarChart, 
  Calendar, 
  Bot, 
  BookOpen, 
  Link as LinkIcon, 
  Activity, 
  Settings as SettingsIcon,
  Plus
} from 'lucide-react';

export function AdminHeader() {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: BarChart, exact: true },
    { href: '/admin/webinars', label: 'Webinars', icon: Calendar },
    { href: '/admin/ai/operator', label: 'AI Monitor', icon: Activity },
    { href: '/admin/ai/settings', label: 'AI Settings', icon: Bot },
    { href: '/admin/ai/knowledge', label: 'Knowledge Base', icon: BookOpen },
    { href: '/admin/ai/resources', label: 'Resources', icon: LinkIcon },
    { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <header className="bg-[#121419] border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-8">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-wider">MOYA ADMIN</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/admin/webinars/create"
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all hover:scale-102"
        >
          <Plus className="w-3.5 h-3.5" />
          New Webinar
        </Link>
      </div>
    </header>
  );
}
