import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Loader2, Plus, X, User, MapPin, ShieldCheck, 
  ShieldAlert, Edit2, Trash2, Check, XCircle, Mail, Phone 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

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

  const [citizens, setCitizens] = useState<any[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingProfileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [activeTab, setActiveTab] = useState<'citizens' | 'profile-changes'>('citizens');

  // Detail modal
  const [selectedCitizen, setSelectedCitizen] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  const fetchPendingProfileChanges = useCallback(async () => {
    setLoadingChanges(true);
    try {
      const { data, error } = await supabase
        .from('profile_change_requests')
        .select(`
          *,
          users:user_id (first_name, last_name, email)
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
      showToast(lang === 'sw' ? 'Mabadiliko yameidhinishwa' : 'Change approved successfully', 'success');
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
        lang === 'sw' ? 'Mwananchi amethibitishwa!' : 'Citizen verified successfully!',
        'success'
      );
    } catch (error: any) {
      showToast(error.message || 'Verification failed', 'error');
    }
  };

  const handleDecline = async (citizenId: string) => {
    if (!confirm(lang === 'sw' ? 'Je, una uhakika unataka kukataa uhakiki?' : 'Are you sure you want to decline verification?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', citizenId);

      if (error) throw error;

      setCitizens(prev => prev.filter(c => c.id !== citizenId));
      setShowDetailsModal(false);
      setSelectedCitizen(null);
      showToast(lang === 'sw' ? 'Uhakiki umekataliwa.' : 'Verification declined.', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to decline', 'error');
    }
  };

  const handleCitizenClick = (citizen: any) => {
    setSelectedCitizen(citizen);
    setShowDetailsModal(true);
  };

  const filteredCitizens = citizens.filter(c => {
    const matchesSearch = 
      `${c.first_name || ''} ${c.last_name || ''} ${c.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            {lang === 'sw' ? 'Tazama na dhibiti wananchi wote' : 'View and manage all citizens'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCitizens}
            disabled={loading}
            className="h-12 w-12 bg-white border border-stone-200 rounded-xl flex items-center justify-center hover:bg-stone-50"
            title={lang === 'sw' ? 'Onyesha upya wananchi' : 'Refresh citizens'}
            aria-label={lang === 'sw' ? 'Onyesha upya wananchi' : 'Refresh citizens'}
          >
            <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text"
              placeholder={lang === 'sw' ? 'Tafuta...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-12 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 w-full sm:w-64"
            />
          </div>

          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            title={lang === 'sw' ? 'Chuja wananchi' : 'Filter citizens'}
            aria-label={lang === 'sw' ? 'Chuja wananchi' : 'Filter citizens'}
            className="h-12 px-4 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{lang === 'sw' ? 'Wote' : 'All'}</option>
            <option value="verified">{lang === 'sw' ? 'Wamethibitishwa' : 'Verified'}</option>
            <option value="unverified">{lang === 'sw' ? 'Wasiohakikiwa' : 'Unverified'}</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('citizens')}
          className={`px-8 py-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'citizens' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Users className="inline mr-2" size={18} />
          {lang === 'sw' ? 'Wananchi' : 'Citizens'} ({filteredCitizens.length})
        </button>
        <button
          onClick={() => setActiveTab('profile-changes')}
          className={`px-8 py-4 font-bold text-sm border-b-2 transition-all relative ${
            activeTab === 'profile-changes' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <Edit2 className="inline mr-2" size={18} />
          {lang === 'sw' ? 'Mabadiliko ya Wasifu' : 'Profile Changes'}
          {pendingChanges.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingChanges.length}
            </span>
          )}
        </button>
      </div>

      {/* Citizens Tab */}
      {activeTab === 'citizens' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
          ) : filteredCitizens.length === 0 ? (
            <div className="p-20 text-center text-stone-400">
              Hakuna wananchi wanaolingana na utafutaji.
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
                    <tr 
                      key={citizen.id} 
                      onClick={() => handleCitizenClick(citizen)}
                      className="hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-stone-100 rounded-2xl flex items-center justify-center text-lg font-bold">
                            {citizen.first_name?.[0]}{citizen.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold">{citizen.first_name} {citizen.last_name}</p>
                            <p className="text-xs text-stone-500">NIDA: {citizen.nida_number || 'N/A'}</p>
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
                      <td className="px-6 py-5 text-sm text-stone-600">
                        {citizen.region}, {citizen.district}
                      </td>
                      <td className="px-6 py-5">
                        {citizen.is_verified ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                            <ShieldCheck size={14} /> Imethibitishwa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            <ShieldAlert size={14} /> Inasubiri
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button className="text-emerald-600 hover:text-emerald-700">
                          Angalia
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Profile Changes Tab - with Approve/Reject */}
      {activeTab === 'profile-changes' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
          {loadingChanges ? (
            <div className="p-20 flex justify-center">
              <Loader2 className="animate-spin text-emerald-600" size={40} />
            </div>
          ) : pendingChanges.length === 0 ? (
            <div className="p-20 text-center text-stone-400">
              Hakuna mabadiliko yanayosubiri
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
                      <p className="text-xs text-stone-500">{change.users?.email}</p>
                      <div className="mt-3 bg-amber-50 p-4 rounded-2xl">
                        <p className="text-xs uppercase text-amber-600 font-bold">Field: {change.field_name}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="line-through text-stone-400">{change.old_value || '-'}</span>
                          <span className="text-emerald-600">â†’</span>
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
                        Idhinisha
                      </button>
                      <button
                        onClick={() => handleRejectChange(change)}
                        className="px-5 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center gap-2"
                      >
                        <X size={16} />
                        Kataa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedCitizen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedCitizen.first_name} {selectedCitizen.last_name}
                    </h2>
                    <p className="text-stone-500">{selectedCitizen.email}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-stone-400 hover:text-stone-600"
                    title={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                    aria-label={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                  >
                    <X size={28} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-stone-50 p-6 rounded-2xl">
                    <p className="text-xs text-stone-400 mb-1">NIDA</p>
                    <p className="font-bold text-lg">{selectedCitizen.nida_number || 'N/A'}</p>
                  </div>
                  <div className="bg-stone-50 p-6 rounded-2xl">
                    <p className="text-xs text-stone-400 mb-1">Simu</p>
                    <p className="font-bold text-lg">{selectedCitizen.phone}</p>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  {!selectedCitizen.is_verified && (
                    <button 
                      onClick={() => {
                        handleVerify(selectedCitizen.id);
                        setSelectedCitizen({ ...selectedCitizen, is_verified: true });
                      }}
                      className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700"
                    >
                      Thibitisha
                    </button>
                  )}
                  <button 
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 h-14 bg-stone-100 text-stone-700 rounded-2xl font-bold hover:bg-stone-200"
                  >
                    Funga
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}