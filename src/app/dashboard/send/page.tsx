'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Loader2, 
  Send, 
  Users, 
  Hash, 
  MessageSquare,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function SendPage() {
  const supabase = createClientComponentClient();
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [template, setTemplate] = useState('Hi {{name}}, this is a message from WaSender!');
  const [manualNumbers, setManualNumbers] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase.from('tags').select('*').order('name');
      if (data) setTags(data);
    };
    fetchTags();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        template,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        manualNumbers: manualNumbers ? manualNumbers.split('\n').map(n => n.trim()).filter(n => n) : undefined
      };

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to enqueue messages');

      setMessage({ type: 'success', text: data.message });
      setManualNumbers('');
      setSelectedTags([]);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (id: string) => {
    if (selectedTags.includes(id)) {
      setSelectedTags(selectedTags.filter(t => t !== id));
    } else {
      setSelectedTags([...selectedTags, id]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
          <Send className="w-6 h-6 mr-2 text-blue-600" />
          Campaign Launcher
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure your template and broadcast to your segments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center">
                <MessageSquare className="w-4 h-4 mr-2 text-slate-400" />
                Message Content
              </h2>
              <div className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                <Sparkles className="w-3 h-3 mr-1" />
                Supports Dynamic Variables
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium leading-relaxed"
                placeholder="Hi {{name}}, your order #123 is ready..."
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              />
              <div className="flex items-center justify-between px-2">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                    Use <code className="text-blue-600 bg-blue-50 px-1 rounded">{"{{name}}"}</code> to insert contact's display name
                 </p>
                 <span className="text-[10px] text-slate-300 font-medium italic">Max 4096 chars</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center">
              <Hash className="w-4 h-4 mr-2 text-slate-400" />
              Manual Override
            </h2>
            <textarea
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              placeholder="94771234567&#10;94777654321"
              value={manualNumbers}
              onChange={(e) => setManualNumbers(e.target.value)}
            />
            <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
               <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5" />
               <p className="text-[11px] text-slate-500 leading-normal font-medium italic">
                 Note: Entering manual numbers will ignore the tag filters below. Ensure numbers include the full country code without the '+' sign.
               </p>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center">
              <Users className="w-4 h-4 mr-2 text-slate-400" />
              Target Segments
            </h2>
            
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedTags.includes(tag.id)
                      ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                      : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color_code }} />
                    <span className={`text-xs font-bold ${selectedTags.includes(tag.id) ? 'text-blue-700' : 'text-slate-600'}`}>
                      {tag.name}
                    </span>
                  </div>
                  {selectedTags.includes(tag.id) && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))}
              {tags.length === 0 && (
                <div className="text-center py-8 text-slate-400 italic text-xs font-medium uppercase tracking-tighter">
                  No tags available
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading || (!template && !manualNumbers && selectedTags.length === 0)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-100 flex items-center justify-center active:scale-95 disabled:opacity-50 disabled:grayscale"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Execute Broadcast
          </button>

          {message && (
            <div className={`p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border shadow-lg animate-in slide-in-from-top-2 duration-300 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
              <div className="flex items-start space-x-3">
                 {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                 <span>{message.text}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
