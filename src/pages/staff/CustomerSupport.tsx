import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, HelpCircle, Loader2, AlertCircle, CheckCircle2, 
  CreditCard, ThumbsUp, MessageSquare, RefreshCw 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/currency';

export function CustomerSupport() {
  const { lang, currency } = useLanguage();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);
    setApplication(null);

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*, services(*), users:user_id(*)')
        .eq('application_number', searchTerm.trim().toUpperCase())
        .single();

      if (error || !data) {
        setError(lang === 'sw' ? 'Maombi hayajapatikana' : 'Application not found');
      } else {
        setApplication(data);
      }
    } catch (err) {
      setError(lang === 'sw' ? 'Hitilafu wakati wa kutafuta' : 'Search error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!application) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'issued' })
        .eq('id', application.id);

      if (error) throw error;

      setApplication({ ...application, status: 'issued' });
      showToast(lang === 'sw' ? 'Malipo yamethibitishwa' : 'Payment confirmed', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!application) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'pending_payment' })
        .eq('id', application.id);

      if (error) throw error;

      setApplication({ ...application, status: 'pending_payment' });
      showToast(lang === 'sw' ? 'Maombi yameidhinishwa' : 'Application approved', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
          <HelpCircle size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-stone-900">
            {lang === 'sw' ? 'Huduma kwa Wateja' : 'Customer Support'}
          </h1>
          <p className="text-stone-500">
            {lang === 'sw' ? 'Tafuta na saidia maombi ya wananchi' : 'Search and assist citizen applications'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-xl">
        <form onSubmit={handleSearch} className="relative mb-8">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400" size={24} />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'sw' ? 'Ingiza Namba ya Maombi (EMT-XXXXXX)' : 'Enter Application Number'}
            className="w-full h-16 pl-16 pr-40 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 text-lg font-mono"
          />
          <button 
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="absolute right-3 top-3 bottom-3 px-10 bg-stone-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (lang === 'sw' ? 'Tafuta' : 'Search')}
          </button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-700 mb-8"
            >
              <AlertCircle size={28} />
              <p className="font-bold">{error}</p>
            </motion.div>
          )}

          {application && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-stone-50 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-stone-500 mb-4">MAOMBI</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Namba</span>
                      <span className="font-mono font-bold">{application.application_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Huduma</span>
                      <span className="font-bold">{(application as any).services?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Hali</span>
                      <StatusBadge status={application.status} lang={lang} />
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-stone-500 mb-4">MWOMBAJI</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Jina</span>
                      <span className="font-bold">{(application as any).users?.first_name} {(application as any).users?.last_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Simu</span>
                      <span>{(application as any).users?.phone}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-6 border-t">
                {(application.status === 'submitted' || application.status === 'pending_payment') && (
                  <button 
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <ThumbsUp size={20} />
                    {lang === 'sw' ? 'Idhinisha' : 'Approve'}
                  </button>
                )}

                {application.status === 'pending_payment' && (
                  <button 
                    onClick={handleConfirmPayment}
                    disabled={processing}
                    className="flex-1 h-14 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    <CreditCard size={20} />
                    {lang === 'sw' ? 'Thibitisha Malipo' : 'Confirm Payment'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}