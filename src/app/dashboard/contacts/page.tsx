'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Users, 
  Plus, 
  Search, 
  Tag as TagIcon, 
  MoreVertical,
  Phone,
  Globe,
  Loader2,
  X,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';

export default function ContactsPage() {
  const supabase = createClientComponentClient();
  const [contacts, setContacts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeContact, setActiveContact] = useState<any>(null);

  // Form State
  const [contactForm, setContactForm] = useState({
    phone_number: '',
    display_name: '',
    country_code: '',
  });

  const fetchData = async () => {
    setLoading(true);
    // Fetch contacts with their tags
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
      setContactForm({ phone_number: '', display_name: '', country_code: '' });
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
        country_code: contactForm.country_code,
      })
      .eq('id', activeContact.id);

    if (!error) {
      setIsEditModalOpen(false);
      setActiveContact(null);
      setContactForm({ phone_number: '', display_name: '', country_code: '' });
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

  const toggleTag = async (tagId: string) => {
    if (!activeContact) return;

    const currentTagIds = activeContact.contact_tags.map((ct: any) => ct.tag_id);
    const isAssigned = currentTagIds.includes(tagId);

    if (isAssigned) {
      // Remove tag
      await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', activeContact.id)
        .eq('tag_id', tagId);
    } else {
      // Add tag
      await supabase
        .from('contact_tags')
        .insert([{ contact_id: activeContact.id, tag_id: tagId }]);
    }

    // Refresh active contact state and list
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
      country_code: contact.country_code,
    });
    setIsEditModalOpen(true);
  };

  const openTagModal = (contact: any) => {
    setActiveContact(contact);
    setIsTagModalOpen(true);
  };

  const filteredContacts = contacts.filter(c => 
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone_number.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            Global Contacts
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your shared contact database and segment with tags.</p>
        </div>
        <button 
          onClick={() => {
            setContactForm({ phone_number: '', display_name: '', country_code: '' });
            setIsAddModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or number..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/30">
                <th className="px-6 py-4 border-b border-slate-100">Contact Details</th>
                <th className="px-6 py-4 border-b border-slate-100">Tags</th>
                <th className="px-6 py-4 border-b border-slate-100">Country</th>
                <th className="px-6 py-4 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-48 mb-2"></div><div className="h-3 bg-slate-50 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="flex space-x-2"><div className="h-5 bg-slate-100 rounded-full w-16"></div><div className="h-5 bg-slate-100 rounded-full w-12"></div></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-8 bg-slate-100 rounded-lg w-8 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mr-4 group-hover:bg-blue-50 transition-colors">
                          <Users className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 leading-tight">{contact.display_name}</div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center uppercase tracking-wider font-semibold">
                            <Phone className="w-3 h-3 mr-1" />
                            {contact.phone_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {contact.contact_tags?.map((ct: any) => (
                          <span 
                            key={ct.tag_id}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border shadow-sm"
                            style={{ backgroundColor: `${ct.tags.color_code}15`, color: ct.tags.color_code, borderColor: `${ct.tags.color_code}30` }}
                          >
                            {ct.tags.name}
                          </span>
                        ))}
                        <button 
                          onClick={() => openTagModal(contact)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm font-medium text-slate-600 uppercase tracking-widest">
                        <Globe className="w-3 h-3 mr-1.5 text-slate-400" />
                        {contact.country_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button 
                          onClick={() => openEditModal(contact)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Contact"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                    No contacts found. Click "Add Contact" to get started.
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">{isAddModalOpen ? 'New Contact' : 'Edit Contact'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 text-slate-400 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={isAddModalOpen ? handleAddContact : handleEditContact} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Enter display name..."
                    value={contactForm.display_name}
                    onChange={(e) => setContactForm({...contactForm, display_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    placeholder="e.g. 94771234567"
                    value={contactForm.phone_number}
                    onChange={(e) => setContactForm({...contactForm, phone_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Country</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    placeholder="e.g. LK"
                    value={contactForm.country_code}
                    onChange={(e) => setContactForm({...contactForm, country_code: e.target.value.toUpperCase()})}
                  />
                </div>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 flex items-center justify-center active:scale-95"
              >
                {isAddModalOpen ? 'Create Global Record' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tag Assignment Modal */}
      {isTagModalOpen && activeContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTagModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Manage Tags</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Contact: {activeContact.display_name}</p>
              </div>
              <button onClick={() => setIsTagModalOpen(false)} className="p-2 text-slate-400 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {tags.map(tag => {
                  const isAssigned = activeContact.contact_tags.some((ct: any) => ct.tag_id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                        isAssigned 
                          ? 'border-blue-200 bg-blue-50/50' 
                          : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color_code }}
                        />
                        <span className={`text-sm font-bold ${isAssigned ? 'text-blue-700' : 'text-slate-600'}`}>
                          {tag.name}
                        </span>
                      </div>
                      {isAssigned && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
                {tags.length === 0 && (
                  <div className="text-center py-8 text-slate-400 italic text-sm">
                    No tags available. Create tags first.
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
               <button 
                onClick={() => setIsTagModalOpen(false)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm"
               >
                 Done
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
