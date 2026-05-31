import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone,
  Clock,
  ArrowUpRight,
  Users
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { user } } = await supabase.auth.getUser();
  
  // Fetch Stats
  const [
    { count: totalContacts },
    { count: totalSent }, 
    { count: totalFailed }, 
    { data: logs }
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('message_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('message_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('message_logs').select('*').order('sent_at', { ascending: false }).limit(10)
  ]);

  const stats = [
    { 
      name: 'Global Reach', 
      value: totalContacts || 0, 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      name: 'Total Broadcasts', 
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
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Performance</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time metrics for your global outreach operations.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Engine Online</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all cursor-default">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.name}</p>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            </div>
            <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 shadow-sm`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center tracking-widest uppercase">
              <Clock className="w-4 h-4 mr-2 text-slate-400" />
              Delivery Audit Trail
            </h2>
            <Link href="/dashboard/send" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center uppercase tracking-widest bg-blue-50 px-2 py-1 rounded">
              Launch Campaign
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 font-medium">
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${log.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 tracking-tight">{log.phone_number}</p>
                        <p className="text-[11px] text-slate-400 uppercase tracking-tighter">
                          {new Date(log.sent_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                       {log.error_message && (
                         <span className="text-[10px] text-rose-500 font-bold hidden md:block italic max-w-[150px] truncate uppercase tracking-tighter">
                           {log.error_message}
                         </span>
                       )}
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                         log.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
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
                 <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                   View Full Audit History
                 </button>
              </div>
            )}
          </div>
        </div>


      </div>
  );
}
