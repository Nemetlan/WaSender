'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Users, 
  Plus, 
  Search, 
  Tag as TagIcon, 
  MoreVertical,
  Phone,
  MessageSquare,
  Loader2,
  X,
  Edit2,
  Trash2,
  Check,
  FileUp,
  AlertTriangle
} from 'lucide-react';

export default function ContactsPage() {
  const supabase = createClientComponentClient();
  const [contacts, setContacts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContact, setActiveContact] = useState<any>(null);

  // Form State
  const [contactForm, setContactForm] = useState({
    phone_number: '',
    display_name: '',
    comment: '',
  });

  // Import State
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: contactsData } = await supabase
      .from('contacts')
      .select(`
        *,
        contact_tags (
          tag_id,
          tags (
            id,
            name,
            color_code
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    const { data: tagsData } = await supabase.from('tags').select('*').order('name');
    
    if (contactsData) setContacts(contactsData);
    if (tagsData) setTags(tagsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('contacts').insert([contactForm]);
    if (!error) {
      setIsAddModalOpen(false);
      setContactForm({ phone_number: '', display_name: '', comment: '' });
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('contacts')
      .update({
        display_name: contactForm.display_name,
        phone_number: contactForm.phone_number,
        comment: contactForm.comment,
      })
      .eq('id', activeContact.id);

    if (!error) {
      setIsEditModalOpen(false);
      setActiveContact(null);
      setContactForm({ phone_number: '', display_name: '', comment: '' });
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (!error) {
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportLoading(true);
    setImportError(null);

    try {
      let rawData: any[] = [];

      if (importFormat === 'json') {
        rawData = JSON.parse(importData);
        if (!Array.isArray(rawData)) throw new Error('JSON must be an array of objects');
      } else {
        // CSV Parser with Tag Support
        const lines = importData.split('\n').filter(line => line.trim());
        rawData = lines.map((line, index) => {
          if (index === 0 && line.toLowerCase().includes('phone_number')) return null;
          const [phone, name, comment, tagString] = line.split(',').map(s => s.trim());
          if (!phone) return null;
          return {
            phone_number: phone,
            display_name: name || phone,
            comment: comment || '',
            tags: tagString ? tagString.split(';').map(t => t.trim()).filter(t => t) : []
          };
        }).filter(c => c !== null);
      }

      if (rawData.length === 0) throw new Error('No valid contacts found to import');

      // 1. Prepare and Upsert Contacts
      const contactsToUpsert = rawData.map(({ tags, ...c }) => c);
      const { data: upsertedContacts, error: contactError } = await supabase
        .from('contacts')
        .upsert(contactsToUpsert, { onConflict: 'phone_number' })
        .select('id, phone_number');
      
      if (contactError) throw contactError;

      // 2. Extract and Upsert All Unique Tag Names
      const allTagNames = Array.from(new Set(rawData.flatMap(r => r.tags || [])));
      
      if (allTagNames.length > 0) {
        // Ensure all tags exist (upsert by name)
        const tagsToUpsert = allTagNames.map(name => ({ name }));
        const { data: existingTags, error: tagError } = await supabase
          .from('tags')
          .upsert(tagsToUpsert, { onConflict: 'name' })
          .select('id, name');
        
        if (tagError) throw tagError;

        // 3. Create Tag Mappings
        const tagMap = new Map(existingTags.map(t => [t.name, t.id]));
        const contactMap = new Map(upsertedContacts.map(c => [c.phone_number, c.id]));

        const mappings: any[] = [];
        rawData.forEach(item => {
          const contactId = contactMap.get(item.phone_number);
          if (contactId && item.tags) {
            item.tags.forEach((tagName: string) => {
              const tagId = tagMap.get(tagName);
              if (tagId) {
                mappings.push({ contact_id: contactId, tag_id: tagId });
              }
            });
          }
        });

        if (mappings.length > 0) {
          const { error: mappingError } = await supabase
            .from('contact_tags')
            .upsert(mappings, { onConflict: 'contact_id,tag_id' });
          if (mappingError) throw mappingError;
        }
      }

      setIsImportModalOpen(false);
      setImportData('');
      fetchData();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const toggleTag = async (tagId: string) => {
    if (!activeContact) return;

    const currentTagIds = activeContact.contact_tags.map((ct: any) => ct.tag_id);
    const isAssigned = currentTagIds.includes(tagId);

    if (isAssigned) {
      await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', activeContact.id)
        .eq('tag_id', tagId);
    } else {
      await supabase
        .from('contact_tags')
        .insert([{ contact_id: activeContact.id, tag_id: tagId }]);
    }

    const { data } = await supabase
      .from('contacts')
      .select(`
        *,
        contact_tags (
          tag_id,
          tags (
            id,
            name,
            color_code
          )
        )
      `)
      .eq('id', activeContact.id)
      .single();
    
    if (data) {
      setActiveContact(data);
      setContacts(contacts.map(c => c.id === data.id ? data : c));
    }
  };

  const openEditModal = (contact: any) => {
    setActiveContact(contact);
    setContactForm({
      display_name: contact.display_name,
      phone_number: contact.phone_number,
      comment: contact.comment || '',
    });
    setIsEditModalOpen(true);
  };

  const openTagModal = (contact: any) => {
    setActiveContact(contact);
    setIsTagModalOpen(true);
  };

  const filteredContacts = contacts.filter(c => 
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone_number.includes(searchQuery) ||
    (c.comment && c.comment.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            Global Contacts
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium tracking-tight">Unified shared directory for all broadcast operations.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center transition-all active:scale-95"
          >
            <FileUp className="w-4 h-4 mr-2" />
            Bulk Import
          </button>
          <button 
            onClick={() => {
              setContactForm({ phone_number: '', display_name: '', comment: '' });
              setIsAddModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center shadow-xl shadow-blue-100 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            Enroll Contact
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search directory..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase tracking-widest placeholder:text-slate-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/50">
                <th className="px-8 py-5 border-b border-slate-100">Identity</th>
                <th className="px-8 py-5 border-b border-slate-100">Tags</th>
                <th className="px-8 py-5 border-b border-slate-100">Comment</th>
                <th className="px-8 py-5 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && contacts.length === 0 ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-48 mb-2"></div><div className="h-3 bg-slate-50 rounded w-32"></div></td>
                    <td className="px-8 py-6"><div className="flex space-x-2"><div className="h-5 bg-slate-100 rounded-full w-16"></div></div></td>
                    <td className="px-8 py-6"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                    <td className="px-8 py-6"><div className="h-8 bg-slate-100 rounded-lg w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mr-5 group-hover:bg-blue-50 transition-colors shadow-inner">
                          <Users className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 tracking-tight">{contact.display_name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center uppercase tracking-widest font-black">
                            <Phone className="w-3 h-3 mr-1.5 text-blue-500" />
                            {contact.phone_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2 max-w-[250px]">
                        {contact.contact_tags?.map((ct: any) => (
                          <span 
                            key={ct.tag_id}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm"
                            style={{ backgroundColor: `${ct.tags.color_code}10`, color: ct.tags.color_code, borderColor: `${ct.tags.color_code}20` }}
                          >
                            {ct.tags.name}
                          </span>
                        ))}
                        <button 
                          onClick={() => openTagModal(contact)}
                          className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-xl inline-flex max-w-[200px] truncate">
                        <MessageSquare className="w-3 h-3 mr-1.5 text-slate-400 flex-shrink-0" />
                        {contact.comment || '-'}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => openEditModal(contact)}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Edit Contact"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-8 py-16 text-center text-slate-400 italic text-sm font-bold uppercase tracking-widest">
                    Directory clear. Use the action button to enroll contacts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} />
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{isAddModalOpen ? 'New Enrollment' : 'Modify Record'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 text-slate-400 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddContact : handleEditContact} className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Full Identity</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all tracking-tight"
                    placeholder="e.g. John Doe"
                    value={contactForm.display_name}
                    onChange={(e) => setContactForm({...contactForm, display_name: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Phone String</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono tracking-tighter"
                    placeholder="e.g. 94771234567"
                    value={contactForm.phone_number}
                    onChange={(e) => setContactForm({...contactForm, phone_number: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Comment</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all tracking-tight"
                    placeholder="Add a note or remark..."
                    value={contactForm.comment}
                    onChange={(e) => setContactForm({...contactForm, comment: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl shadow-slate-200 flex items-center justify-center active:scale-95"
              >
                {isAddModalOpen ? 'Commit to Registry' : 'Update Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Bulk Import</h2>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1.5">Import contacts in high-volume</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkImport} className="p-8 space-y-6">
              <div className="flex items-center space-x-4 mb-2">
                <button 
                  type="button"
                  onClick={() => setImportFormat('csv')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importFormat === 'csv' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  CSV Format
                </button>
                <button 
                  type="button"
                  onClick={() => setImportFormat('json')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${importFormat === 'json' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  JSON Format
                </button>
              </div>

              <div className="space-y-4">
                <textarea 
                  required
                  className="w-full h-64 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all leading-relaxed"
                  placeholder={importFormat === 'csv' ? "phone_number, display_name, comment, tags\n94771234567, John Doe, VIP, Premium;Lead\n94777654321, Jane Smith, Lead, Customer" : '[{"phone_number": "94771234567", "display_name": "John Doe", "comment": "VIP", "tags": ["Premium", "Lead"]}]'}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                />
                
                <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                   <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                   <p className="text-[10px] text-amber-700 leading-normal font-bold uppercase tracking-tight">
                     Note: Phone numbers must be unique. Tags should be semicolon-separated (;) in CSV. Duplicate phone numbers will update existing records.
                   </p>
                </div>
              </div>

              {importError && (
                <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl text-xs font-bold uppercase tracking-widest">
                  Error: {importError}
                </div>
              )}

              <button 
                type="submit"
                disabled={importLoading}
                className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl shadow-slate-200 flex items-center justify-center active:scale-95 disabled:opacity-50"
              >
                {importLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Execute High-Volume Import'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tag Assignment Modal */}
      {isTagModalOpen && activeContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsTagModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Tag Management</h2>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1.5">{activeContact.display_name}</p>
              </div>
              <button onClick={() => setIsTagModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 max-h-[450px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-3">
                {tags.map(tag => {
                  const isAssigned = activeContact.contact_tags.some((ct: any) => ct.tag_id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left group ${
                        isAssigned 
                          ? 'border-blue-500 bg-blue-50/50 shadow-md translate-x-1' 
                          : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div 
                          className={`w-3 h-3 rounded-full transition-transform group-hover:scale-150 ${isAssigned ? 'scale-125' : ''}`}
                          style={{ backgroundColor: tag.color_code }}
                        />
                        <span className={`text-xs font-black uppercase tracking-widest ${isAssigned ? 'text-blue-700' : 'text-slate-500'}`}>
                          {tag.name}
                        </span>
                      </div>
                      {isAssigned && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
                {tags.length === 0 && (
                  <div className="text-center py-12 text-slate-400 italic text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
                    No segments defined.
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100">
               <button 
                onClick={() => setIsTagModalOpen(false)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-slate-200 active:scale-95 transition-all"
               >
                 Confirm Updates
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
