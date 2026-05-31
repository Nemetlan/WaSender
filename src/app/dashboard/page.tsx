import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch Stats
  const [{ count: totalSent }, { count: totalFailed }, { data: logs }] = await Promise.all([
    supabase.from('message_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('message_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('message_logs').select('*').order('sent_at', { ascending: false }).limit(10)
  ]);

  const stats = [
    { 
      name: 'Messages Sent', 
      value: totalSent || 0, 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      name: 'Failed Delivery', 
      value: totalFailed || 0, 
      icon: AlertCircle, 
      color: 'text-rose-600', 
      bg: 'bg-rose-50' 
    },
    { 
      name: 'Active Handshakes', 
      value: '1', 
      icon: Smartphone, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time performance metrics and delivery audit trail.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.name}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
            <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center tracking-tight">
              <Clock className="w-5 h-5 mr-2 text-slate-400" />
              Delivery Audit Trail
            </h2>
            <Link href="/dashboard/send" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center uppercase tracking-wider">
              New Campaign
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${log.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{log.phone_number}</p>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {new Date(log.sent_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                       {log.error_message && (
                         <span className="text-[10px] text-rose-500 font-medium hidden md:block italic max-w-[150px] truncate">
                           {log.error_message}
                         </span>
                       )}
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                         log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                       }`}>
                         {log.status}
                       </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-500 italic text-sm">
                  No messaging activity recorded yet.
                </div>
              )}
            </div>
            {logs && logs.length > 0 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                 <button className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                   View Full Audit History
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips / Sidebar Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />
              Campaign Tip
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              To avoid your account being flagged, we recommend using personal templates and avoiding rapid-fire sending to unknown numbers.
            </p>
            <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Health Score</span>
              <span className="text-xs font-bold text-emerald-400">98% Stable</span>
            </div>
          </div>

          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
               <Send className="w-32 h-32 rotate-12" />
            </div>
            <h3 className="text-lg font-bold mb-2 relative z-10">Scale your reach</h3>
            <p className="text-blue-100 text-sm mb-4 relative z-10 font-medium">Add more team members and connect multiple WA instances.</p>
            <button className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold relative z-10 transition-transform active:scale-95">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
