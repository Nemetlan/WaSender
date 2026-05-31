'use client';

import { WhatsAppConnector } from '@/components/WhatsAppConnector';
import { Smartphone, ShieldCheck, History } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
          <Smartphone className="w-6 h-6 mr-2 text-blue-600" />
          WhatsApp Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage your device connections and security parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connection Widget */}
        <div className="space-y-6">
          <WhatsAppConnector />
          
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex items-start space-x-4">
             <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
               <ShieldCheck className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-emerald-900">Security Verified</h3>
               <p className="text-xs text-emerald-700 mt-1 leading-relaxed font-medium">
                 Your session is encrypted using industry-standard protocols. WaSender never stores your personal messages, only the authentication matrix required to maintain the bridge.
               </p>
             </div>
          </div>
        </div>

        {/* Configuration / Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center tracking-tight">
              <History className="w-5 h-5 mr-2 text-slate-400" />
              Instance Configuration
            </h2>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Protocol Version</span>
                <span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">2.3000.x</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">User Identity</span>
                <span className="text-sm font-bold text-slate-700 italic">Ubuntu / Chrome</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reconnect Strategy</span>
                <span className="text-sm font-bold text-blue-600">Adaptive (3s - 30s)</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Retention</span>
                <span className="text-sm font-bold text-slate-700">Permanent (DB Store)</span>
              </div>
            </div>

            <div className="mt-8">
              <button className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-slate-200">
                Wipe Local Cache & Reset
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-3 font-medium uppercase tracking-tighter">
                Warning: This will terminate all active sending jobs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
