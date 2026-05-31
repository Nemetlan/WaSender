'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Loader2, Send, Users, Hash } from 'lucide-react';

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
      const { data } = await supabase.from('tags').select('*');
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
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Send Campaign</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Send className="w-5 h-4 mr-2" /> Message Template
            </h2>
            <textarea
              className="w-full h-40 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter your message here... Use {{name}} for dynamic replacement."
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Available variables: <code>{"{{name}}"}</code>
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Hash className="w-5 h-4 mr-2" /> Manual Entry (Optional)
            </h2>
            <textarea
              className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Paste phone numbers here, one per line..."
              value={manualNumbers}
              onChange={(e) => setManualNumbers(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Include country code (e.g., 94771234567). This overrides tag filtering.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-4 mr-2" /> Filter by Tags
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tags.map(tag => (
                <label key={tag.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="mr-3 h-4 w-4 text-blue-600 rounded"
                    checked={selectedTags.includes(tag.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTags([...selectedTags, tag.id]);
                      else setSelectedTags(selectedTags.filter(id => id !== tag.id));
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: tag.color_code }}>{tag.name}</span>
                </label>
              ))}
              {tags.length === 0 && <p className="text-sm text-gray-400">No tags found.</p>}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
            Start Sending
          </button>

          {message && (
            <div className={`p-4 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
