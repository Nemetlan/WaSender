'use client';

import { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Smartphone,
  ShieldCheck,
  Zap
} from 'lucide-react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export function WhatsAppConnector() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    setErrorMessage(null);
    setQrCode(null);

    const es = new EventSource('/api/whatsapp/connect');
    eventSourceRef.current = es;

    es.addEventListener('qr', (e) => {
      setQrCode(e.data);
      setStatus('connecting');
    });

    es.addEventListener('status', (e) => {
      const newStatus = e.data as any;
      if (newStatus === 'retry_now') {
        es.close();
        setTimeout(connect, 1000);
        return;
      }
      
      setStatus(newStatus);
      if (newStatus === 'connected') {
        setQrCode(null);
      }
    });

    es.onerror = () => {
      if (status === 'connecting' || status === 'reconnecting') {
        es.close();
        setTimeout(connect, 3000);
      } else {
        setStatus('error');
        setErrorMessage('Connection stream interrupted. Please try again.');
        es.close();
      }
    };
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 
            status === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
          }`}>
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-none">WhatsApp Engine</h3>
            <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              Connection Instance
            </p>
          </div>
        </div>

        <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          status === 'connected' ? 'bg-emerald-100 text-emerald-700' :
          status === 'error' ? 'bg-rose-100 text-rose-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full mr-2 animate-pulse ${
            status === 'connected' ? 'bg-emerald-500' :
            status === 'error' ? 'bg-rose-500' : 'bg-slate-400'
          }`} />
          {status}
        </div>
      </div>

      <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
        {status === 'disconnected' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
              <RefreshCw className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">No Active Session</p>
              <p className="text-xs text-slate-500 mt-1">Generate a QR code to link your account</p>
            </div>
            <button
              onClick={connect}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-100 flex items-center mx-auto"
            >
              <Zap className="w-4 h-4 mr-2" />
              Link Device
            </button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center space-y-6 w-full">
            {qrCode ? (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-sm">
                  <QRCodeSVG value={qrCode} size={200} includeMargin={true} />
                </div>
                <div className="mt-6 flex flex-col items-center">
                   <div className="flex items-center text-blue-600 font-bold text-sm mb-1">
                     <Loader2 className="w-4 h-4 animate-spin mr-2" />
                     Awaiting Scan
                   </div>
                   <p className="text-[11px] text-slate-500 max-w-[200px]">
                     Open WhatsApp {">"} Linked Devices {">"} Link a Device
                   </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <p className="text-sm font-medium text-slate-600 tracking-tight">Initializing secure bridge...</p>
              </div>
            )}
          </div>
        )}

        {status === 'connected' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 tracking-tight">System Ready</p>
              <p className="text-xs text-slate-500 mt-1">Your instance is actively polling WA servers</p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">+12 Connected</span>
            </div>
            <button
              onClick={connect}
              className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold flex items-center justify-center mx-auto transition-colors pt-4"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Force Reconnect
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 tracking-tight">Handshake Failed</p>
              <p className="text-xs text-rose-500 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={connect}
              className="bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg"
            >
              Retry Handshake
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3 mr-1.5 text-blue-500" />
          End-to-End Encrypted
        </div>
        <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden">
           <div className={`h-full transition-all duration-500 ${
             status === 'connected' ? 'w-full bg-emerald-500' : 
             status === 'connecting' ? 'w-1/2 bg-blue-500 animate-pulse' : 'w-0'
           }`} />
        </div>
      </div>
    </div>
  );
}
