import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCheck, Search, CheckCircle2, XCircle, AlertCircle, 
  Loader2, User, MapPin 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

export function ManualVerification() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchUnverifiedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const isConfigured = supabaseUrl && 
        !supabaseUrl.includes('YOUR_SUPABASE_URL') && 
        !supabaseUrl.includes('bqxevbmjqvogebmlbidx');

      if (!isConfigured) {
        // Demo mode
        await new Promise(resolve => setTimeout(resolve, 800));
        const demoUsers = JSON.parse(localStorage.getItem('demo_citizens') || '[]');
        setUsers(demoUsers.filter((u: any) => !u.is_verified));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_verified', false)
        .eq('role', 'citizen')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch unverified users:', error);
      showToast(lang === 'sw' ? 'Hitilafu kupata data' : 'Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  }, [lang, showToast]);

  useEffect(() => {
    fetchUnverifiedUsers();
  }, [fetchUnverifiedUsers]);

  const handleVerify = async (userId: string) => {
    if (!confirm(lang === 'sw' ? 'Thibitisha raia huyu?' : 'Verify this citizen?')) return;

    setProcessing(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(
        lang === 'sw' ? 'Raia amethibitishwa!' : 'Citizen verified successfully!',
        'success'
      );
    } catch (error: any) {
      showToast(error.message || 'Verification failed', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.nida_number || '').includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
          <UserCheck size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-stone-900">
            {lang === 'sw' ? 'Uhakiki wa Mwongozo' : 'Manual Verification'}
          </h1>
          <p className="text-stone-500">
            {lang === 'sw' ? 'Thibitisha raia walioshindwa uhakiki wa NIDA' : 'Manually verify citizens who failed NIDA check'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b bg-stone-50">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input 
              type="text"
              placeholder={lang === 'sw' ? 'Tafuta kwa jina au NIDA...' : 'Search by name or NIDA...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b">
                <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">Raia</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">NIDA</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-stone-500 uppercase">Eneo</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" size={36} />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-stone-400">
                    {lang === 'sw' ? 'Hakuna raia wanaosubiri' : 'No citizens pending verification'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-stone-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-mono text-sm">
                      {u.nida_number || u.passport_number || '-'}
                    </td>
                    <td className="px-6 py-5 text-sm text-stone-600">
                      {u.region}, {u.district}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button 
                        onClick={() => handleVerify(u.id)}
                        disabled={processing === u.id}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {processing === u.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        {lang === 'sw' ? 'Thibitisha' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}