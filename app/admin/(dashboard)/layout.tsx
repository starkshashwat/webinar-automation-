import { ReactNode } from 'react'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white p-6 flex flex-col gap-4">
        <div className="text-xl font-bold mb-6">Webinar Admin</div>
        <Link href="/admin" className="hover:text-slate-300">Dashboard</Link>
        <Link href="/admin/webinars" className="hover:text-slate-300">Webinars</Link>
        <Link href="/admin/registrations" className="hover:text-slate-300">Registrations</Link>
        <Link href="/admin/analytics" className="hover:text-slate-300">Analytics</Link>
        <Link href="/admin/settings" className="hover:text-slate-300">Settings</Link>
      </aside>
      <main className="flex-1 p-8 bg-slate-50 text-slate-900">
        {children}
      </main>
    </div>
  )
}
