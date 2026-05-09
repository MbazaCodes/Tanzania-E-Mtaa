import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Loader2, Plus, X, UserPlus, CheckCircle2, 
  XCircle, Check, MoreVertical, Mail, Phone, MapPin, ShieldCheck, ShieldAlert 
} from 'lucide-react';
import { supabase, UserProfile } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { TANZANIA_ADDRESS_DATA } from '@/lib/addressData';
import { cn } from '@/lib/utils';

interface PendingProfileChange {
  id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function CitizenManagement() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [citizens, setCitizens] = useState<UserProfile[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingProfileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [activeTab, setActiveTab] = useState<'citizens' | 'profile-changes'>('citizens');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCitizen, setNewCitizen] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    nidaNumber: '',
    sex: 'Me' as 'Me' | 'Ke',
    region: '',
    district: '',
    ward: '',
    street: ''
  });

  // Fetch citizens
  const fetchCitizens = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'citizen')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCitizens(data || []);
    } catch (error) {
      console.error('Failed to fetch citizens:', error);
      showToast(lang === 'sw' ? 'Hitilafu kupata wananchi' : 'Error fetching citizens', 'error');
    } finally {
      setLoading(false);
    }
  }, [lang, showToast]);

  // Fetch pending profile changes
  const fetchPendingProfileChanges = useCallback(async () => {
    setLoadingChanges(true);
    try {
      const { data, error } = await supabase
        .from('profile_change_requests')
        .select(`
          *,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingChanges(data || []);
    } catch (error) {
      console.error('Failed to fetch profile changes:', error);
      setPendingChanges([]);
    } finally {
      setLoadingChanges(false);
    }
  }, []);

  useEffect(() => {
    fetchCitizens();
    fetchPendingProfileChanges();
  }, [fetchCitizens, fetchPendingProfileChanges]);

  // Verify citizen
  const handleVerify = async (citizenId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', citizenId);

      if (error) throw error;

      setCitizens(prev => prev.map(c => 
        c.id === citizenId ? { ...c, is_verified: true } : c
      ));

      showToast(
        lang === 'sw' ? 'Mwananchi amethibitishwa kikamilifu!' : 'Citizen verified successfully!',
        'success'
      );
    } catch (error: any) {
      showToast(error.message || 'Verification failed', 'error');
    }
  };

  // Decline / Delete citizen
  const handleDecline = async (citizenId: string) => {
    if (!confirm(lang === 'sw' ? 'Je, una uhakika unataka kukataa uhakiki?' : 'Are you sure you want to decline verification?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', citizenId);

      if (error) throw error;

      setCitizens(prev => prev.filter(c => c.id !== citizenId));
      showToast(
        lang === 'sw' ? 'Uhakiki umekataliwa.' : 'Verification declined.',
        'success'
      );
    } catch (error: any) {
      showToast(error.message || 'Failed to decline', 'error');
    }
  };

  // Approve profile change
  const handleApproveChange = async (change: PendingProfileChange) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ [change.field_name]: change.new_value })
        .eq('id', change.user_id);

      if (updateError) throw updateError;

      const { error: statusError } = await supabase
        .from('profile_change_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', change.id);

      if (statusError) throw statusError;

      setPendingChanges(prev => prev.filter(c => c.id !== change.id));
      showToast(lang === 'sw' ? 'Mabadiliko yameidhinishwa' : 'Change approved', 'success');
      fetchCitizens();
    } catch (error: any) {
      showToast(error.message || 'Failed to approve change', 'error');
    }
  };

  // Reject profile change
  const handleRejectChange = async (change: PendingProfileChange) => {
    try {
      const { error } = await supabase
        .from('profile_change_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', change.id);

      if (error) throw error;

      setPendingChanges(prev => prev.filter(c => c.id !== change.id));
      showToast(lang === 'sw' ? 'Mabadiliko yamekataliwa' : 'Change rejected', 'info');
    } catch (error: any) {
      showToast(error.message || 'Failed to reject change', 'error');
    }
  };

  // Add new citizen (Demo + Real support)
  const handleAddCitizen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const citizenData = {
        first_name: newCitizen.firstName.toUpperCase(),
        middle_name: newCitizen.middleName.toUpperCase(),
        last_name: newCitizen.lastName.toUpperCase(),
        email: newCitizen.email,
        phone: newCitizen.phone,
        nida_number: newCitizen.nidaNumber,
        gender: newCitizen.sex,
        region: newCitizen.region,
        district: newCitizen.district,
        ward: newCitizen.ward,
        street: newCitizen.street,
        role: 'citizen',
        is_verified: true, // Staff-added citizens are auto-verified
      };

      const { error } = await supabase.from('users').insert(citizenData);

      if (error) throw error;

      showToast(
        lang === 'sw' ? 'Mwananchi amesajiliwa kikamilifu!' : 'Citizen registered successfully!',
        'success'
      );

      setShowAddModal(false);
      resetNewCitizenForm();
      fetchCitizens();
    } catch (error: any) {
      showToast(error.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetNewCitizenForm = () => {
    setNewCitizen({
      firstName: '', middleName: '', lastName: '', email: '', phone: '',
      nidaNumber: '', sex: 'Me', region: '', district: '', ward: '', street: ''
    });
  };

  // Filtered citizens
  const filteredCitizens = citizens.filter(c => {
    const matchesSearch = 
      `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.nida_number || '').includes(searchQuery);

    const matchesFilter = 
      filter === 'all' || 
      (filter === 'verified' && c.is_verified) || 
      (filter === 'unverified' && !c.is_verified);

    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === 'sw' ? 'Usimamizi wa Wananchi' : 'Citizen Management'}
          </h1>
          <p className="text-stone-500">
            {lang === 'sw' ? 'Sajili na dhibiti wananchi' : 'Register and manage citizens'}
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 h-12 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          {lang === 'sw' ? 'Sajili Mwananchi' : 'Register Citizen'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('citizens')}
          className={cn(
            "px-8 py-4 font-bold text-sm border-b-2 transition-all",
            activeTab === 'citizens' ? "border-emerald-600 text-emerald-600" : "border-transparent text-stone-500 hover:text-stone-700"
          )}
        >
          <Users className="inline mr-2" size={18} />
          {lang === 'sw' ? 'Wananchi' : 'Citizens'} ({filteredCitizens.length})
        </button>
        <button
          onClick={() => setActiveTab('profile-changes')}
          className={cn(
            "px-8 py-4 font-bold text-sm border-b-2 transition-all relative",
            activeTab === 'profile-changes' ? "border-emerald-600 text-emerald-600" : "border-transparent text-stone-500 hover:text-stone-700"
          )}
        >
          <CheckCircle2 className="inline mr-2" size={18} />
          {lang === 'sw' ? 'Mabadiliko ya Wasifu' : 'Profile Changes'}
          {pendingChanges.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
              {pendingChanges.length}
            </span>
          )}
        </button>
      </div>

      {/* Citizens Tab */}
      {activeTab === 'citizens' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
          {/* Search & Filter */}
          <div className="p-6 border-b flex flex-col sm:flex-row gap-4 bg-stone-50">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input
                type="text"
                placeholder={lang === 'sw' ? 'Tafuta kwa jina au NIDA...' : 'Search by name or NIDA...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 h-12 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'verified' | 'unverified')}
              title={lang === 'sw' ? 'Chuja wananchi' : 'Filter citizens'}
              aria-label={lang === 'sw' ? 'Chuja wananchi' : 'Filter citizens'}
              className="h-12 px-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">{lang === 'sw' ? 'Wote' : 'All'}</option>
              <option value="verified">{lang === 'sw' ? 'Wamethibitishwa' : 'Verified'}</option>
              <option value="unverified">{lang === 'sw' ? 'Wanasubiri' : 'Pending'}</option>
            </select>
          </div>

          {loading ? (
            <div className="p-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
              <p className="mt-4 text-stone-500">{lang === 'sw' ? 'Inapakia...' : 'Loading citizens...'}</p>
            </div>
          ) : filteredCitizens.length === 0 ? (
            <div className="p-20 text-center text-stone-400">
              Hakuna wananchi wanaolingana na utafutaji wako.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">Mwananchi</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">Mawasiliano</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">Eneo</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">Hali</th>
                    <th className="px-6 py-4 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCitizens.map((citizen) => (
                    <tr key={citizen.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-600 font-bold text-lg">
                            {citizen.first_name?.[0]}{citizen.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-stone-900">
                              {citizen.first_name} {citizen.last_name}
                            </p>
                            <p className="text-xs text-stone-500 font-mono">{citizen.nida_number || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail size={15} className="text-stone-400" /> {citizen.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={15} className="text-stone-400" /> {citizen.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <MapPin size={15} /> {citizen.region}, {citizen.district}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {citizen.is_verified ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            <ShieldCheck size={14} /> {lang === 'sw' ? 'Imethibitishwa' : 'Verified'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            <ShieldAlert size={14} /> {lang === 'sw' ? 'Inasubiri' : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        {!citizen.is_verified && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleVerify(citizen.id)}
                              className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600"
                              title={lang === 'sw' ? 'Thibitisha mwananchi' : 'Verify citizen'}
                              aria-label={lang === 'sw' ? 'Thibitisha mwananchi' : 'Verify citizen'}
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleDecline(citizen.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                              title={lang === 'sw' ? 'Kataa mwananchi' : 'Decline citizen'}
                              aria-label={lang === 'sw' ? 'Kataa mwananchi' : 'Decline citizen'}
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profile Changes Tab */}
      {activeTab === 'profile-changes' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-xl">
          {loadingChanges ? (
            <div className="p-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
          ) : pendingChanges.length === 0 ? (
            <div className="p-20 text-center">
              <CheckCircle2 className="mx-auto text-emerald-300" size={60} />
              <p className="mt-6 text-stone-500 font-medium">Hakuna mabadiliko yanayosubiri</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingChanges.map((change) => (
                <div key={change.id} className="p-6 hover:bg-stone-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">
                        {change.users?.first_name} {change.users?.last_name}
                      </p>
                      <p className="text-sm text-stone-500">{change.users?.email}</p>
                      <div className="mt-3 bg-amber-50 p-4 rounded-2xl">
                        <p className="text-xs uppercase tracking-widest text-amber-600 font-bold mb-1">
                          {change.field_name.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="line-through text-stone-400">{change.old_value || '-'}</span>
                          <span className="text-emerald-600 font-bold">â†’</span>
                          <span className="font-bold text-emerald-700">{change.new_value}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveChange(change)}
                        className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                        <Check size={16} />
                        {lang === 'sw' ? 'Idhinisha' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleRejectChange(change)}
                        className="px-5 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center gap-2"
                      >
                        <X size={16} />
                        {lang === 'sw' ? 'Kataa' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Citizen Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserPlus className="text-emerald-600" size={28} />
                  <h2 className="text-2xl font-bold">Sajili Mwananchi Mpya</h2>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-stone-400 hover:text-stone-600"
                  title={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                  aria-label={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddCitizen} className="p-8 space-y-6">
                {/* Form fields - simplified and clean */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2">Jina la Kwanza</label>
                    <input
                      required
                      value={newCitizen.firstName}
                      onChange={(e) => setNewCitizen({ ...newCitizen, firstName: e.target.value })}
                      className="w-full h-12 px-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder={lang === 'sw' ? 'Andika jina la kwanza' : 'Enter first name'}
                      title={lang === 'sw' ? 'Jina la kwanza' : 'First name'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2">Jina la Mwisho</label>
                    <input
                      required
                      value={newCitizen.lastName}
                      onChange={(e) => setNewCitizen({ ...newCitizen, lastName: e.target.value })}
                      className="w-full h-12 px-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder={lang === 'sw' ? 'Andika jina la mwisho' : 'Enter last name'}
                      title={lang === 'sw' ? 'Jina la mwisho' : 'Last name'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2">Barua Pepe</label>
                    <input
                      type="email"
                      required
                      value={newCitizen.email}
                      onChange={(e) => setNewCitizen({ ...newCitizen, email: e.target.value })}
                      className="w-full h-12 px-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder={lang === 'sw' ? 'Andika barua pepe' : 'Enter email'}
                      title={lang === 'sw' ? 'Barua pepe' : 'Email'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 mb-2">Simu</label>
                    <input
                      required
                      value={newCitizen.phone}
                      onChange={(e) => setNewCitizen({ ...newCitizen, phone: e.target.value })}
                      className="w-full h-12 px-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder={lang === 'sw' ? 'Andika namba ya simu' : 'Enter phone number'}
                      title={lang === 'sw' ? 'Namba ya simu' : 'Phone number'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : 'Kamilisha Usajili'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}