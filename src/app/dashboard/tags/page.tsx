'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Tag as TagIcon, 
  Plus, 
  Trash2, 
  Loader2,
  X,
  Palette,
  Edit2,
  Check
} from 'lucide-react';

export default function TagsPage() {
  const supabase = createClientComponentClient();
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);

  // Form State
  const [tagForm, setTagForm] = useState({
    name: '',
    color_code: '#3B82F6',
  });

  const fetchTags = async () => {
    setLoading(true);
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setTags(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTag) {
        const { error } = await supabase
          .from('tags')
          .update(tagForm)
          .eq('id', editingTag.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tags').insert([tagForm]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingTag(null);
      setTagForm({ name: '', color_code: '#3B82F6' });
      fetchTags();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag? It will be removed from all contacts.')) return;
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (!error) {
      fetchTags();
    } else {
      alert(error.message);
    }
  };

  const openAddModal = () => {
    setEditingTag(null);
    setTagForm({ name: '', color_code: '#3B82F6' });
    setIsModalOpen(true);
  };

  const openEditModal = (tag: any) => {
    setEditingTag(tag);
    setTagForm({ name: tag.name, color_code: tag.color_code });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <TagIcon className="w-6 h-6 mr-2 text-blue-600" />
            Tag Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage global tags to segment your contacts.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Tag
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest text-[10px]">Active Global Pool</h3>
        </div>

        <div className="p-6">
          {loading && tags.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : tags.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tags.map((tag) => (
                <div 
                  key={tag.id}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-200 hover:shadow-md transition-all flex items-center justify-between"
                  style={{ borderLeftColor: tag.color_code, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-inner"
                      style={{ backgroundColor: tag.color_code }}
                    />
                    <span className="font-bold text-slate-900 text-sm">{tag.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => openEditModal(tag)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 italic text-sm">
              No tags defined. Create one to start segmenting your contacts.
            </div>
          )}
        </div>
      </div>

      {/* Tag Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">{editingTag ? 'Edit Tag' : 'New Global Tag'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tag Name</label>
                <div className="relative">
                   <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input 
                    type="text" 
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                    placeholder="e.g. VIP Customers"
                    value={tagForm.name}
                    onChange={(e) => setTagForm({...tagForm, name: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center">
                  <Palette className="w-3 h-3 mr-1" /> Theme Color
                </label>
                <div className="flex items-center space-x-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <input 
                    type="color" 
                    className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                    value={tagForm.color_code}
                    onChange={(e) => setTagForm({...tagForm, color_code: e.target.value})}
                  />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-tight">{tagForm.color_code}</div>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Click color block to customize</p>
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 flex items-center justify-center active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingTag ? 'Update Tag' : 'Save Global Tag'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
