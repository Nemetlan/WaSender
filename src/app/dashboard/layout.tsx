'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Send, 
  Settings, 
  Menu, 
  X, 
  LogOut,
  ChevronRight,
  Tag as TagIcon
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { name: 'Tags', href: '/dashboard/tags', icon: TagIcon },
  { name: 'Campaigns', href: '/dashboard/send', icon: Send },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
              <Send className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">WaSender</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center">
                  <item.icon className={`w-5 h-5 mr-3 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-rose-500 transition-colors" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white shadow-xl flex flex-col">
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Send className="text-white w-5 h-5" />
                </div>
                <span className="font-bold text-xl tracking-tight">WaSender</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 space-y-1 pt-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-4 rounded-xl text-base font-medium transition-all ${
                    pathname === item.href 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className="w-6 h-6 mr-4" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button 
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-4 text-base font-medium text-rose-600 bg-rose-50 rounded-xl"
              >
                <LogOut className="w-6 h-6 mr-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
