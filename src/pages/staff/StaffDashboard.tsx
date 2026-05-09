import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  UserCheck,
  HelpCircle,
  Building2,
  Loader2,
  RefreshCw,
  Search
} from 'lucide-react';
import { supabase, Application } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface StaffDashboardProps {
  setView: (view: string) => void;
}

export function StaffDashboard({ setView }: StaffDashboardProps) {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    paid: 0,
    returned: 0,
    approved: 0,
    total: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const isConfigured = supabaseUrl && 
        !supabaseUrl.includes('YOUR_SUPABASE_URL') && 
        !supabaseUrl.includes('bqxevbmjqvogebmlbidx');

      if (!isConfigured || user?.id?.startsWith('demo-')) {
        // Demo mode
        const demoApps = JSON.parse(localStorage.getItem('demo_applications') || '[]');
        
        const filteredApps = demoApps.filter((app: any) => {
          if (user?.role === 'staff' || user?.role === 'admin') {
            if (user.assigned_district && app.district !== user.assigned_district) return false;
            if (user.assigned_region && app.region !== user.assigned_region) return false;
          }
          return true;
        });

        setStats({
          pending: filteredApps.filter((a: any) => a.status === 'submitted').length,
          paid: filteredApps.filter((a: any) => a.status === 'paid').length,
          returned: filteredApps.filter((a: any) => a.status === 'returned').length,
          approved: filteredApps.filter((a: any) => ['approved', 'issued'].includes(a.status)).length,
          total: filteredApps.length
        });

        setApplications(filteredApps.slice(0, 10).map((app: any) => ({
          ...app,
          services: { name: app.service_name || 'Huduma' }
        })));
        setLoading(false);
        return;
      }

      // Real Supabase mode
      let query = supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (user?.role === 'staff' || user?.role === 'admin') {
        if (user.assigned_district) {
          query = query.eq('district', user.assigned_district);
        } else if (user.assigned_region) {
          query = query.eq('region', user.assigned_region);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching applications:', error);
      } else if (data) {
        setApplications(data);
        
        setStats({
          pending: data.filter(a => a.status === 'submitted').length,
          paid: data.filter(a => a.status === 'paid').length,
          returned: data.filter(a => a.status === 'returned').length,
          approved: data.filter(a => ['approved', 'issued'].includes(a.status)).length,
          total: data.length
        });
      }
    } catch (error) {
      console.error('Staff dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === 'sw' ? 'Dashibodi ya Mtumishi' : 'Staff Dashboard'}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === 'sw' 
              ? `Karibu, ${user?.first_name || 'Mtumishi'}. ${user?.assigned_district || user?.assigned_region || 'Makao Makuu'}`
              : `Welcome, ${user?.first_name || 'Staff'}. ${user?.assigned_district || user?.assigned_region || 'Headquarters'}`
            }
          </p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-2xl font-bold text-sm flex items-center gap-2 border border-emerald-100">
          <TrendingUp size={18} />
          {lang === 'sw' ? 'Mtandaoni' : 'Online'}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard icon={<Clock className="text-blue-500" />} label={lang === 'sw' ? "Maombi Mapya" : "New Applications"} value={stats.pending} />
        <StatCard icon={<AlertCircle className="text-amber-500" />} label={lang === 'sw' ? "Zilizolipwa" : "Paid"} value={stats.paid} />
        <StatCard icon={<RefreshCw className="text-orange-500" />} label={lang === 'sw' ? "Zilizorudishwa" : "Returned"} value={stats.returned} />
        <StatCard icon={<CheckCircle className="text-emerald-500" />} label={lang === 'sw' ? "Zilizoidhinishwa" : "Approved"} value={stats.approved} />
        <StatCard icon={<FileText className="text-stone-500" />} label={lang === 'sw' ? "Jumla" : "Total"} value={stats.total} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
          <div className="px-8 py-6 border-b flex items-center justify-between">
            <h3 className="text-xl font-bold">{lang === 'sw' ? 'Maombi ya Karibuni' : 'Recent Applications'}</h3>
            <button 
              onClick={() => setView('application_review')}
              className="text-emerald-600 font-bold hover:underline text-sm"
            >
              {lang === 'sw' ? 'Tazama Yote' : 'View All'}
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="animate-spin mx-auto text-emerald-600" size={32} />
                <p className="mt-3 text-stone-400">{lang === 'sw' ? 'Inapakia...' : 'Loading...'}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center text-stone-400">
                {lang === 'sw' ? 'Hakuna maombi mapya' : 'No recent applications'}
              </div>
            ) : (
              applications.map((app) => (
                <div 
                  key={app.id}
                  onClick={() => setView('application_review')}
                  className="px-8 py-5 flex items-center justify-between hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                      <FileText size={20} className="text-stone-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">{(app as any).services?.name || 'Huduma'}</p>
                      <p className="text-xs text-stone-500 font-mono">{app.application_number}</p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} lang={lang} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-stone-900 rounded-3xl p-8 text-white relative overflow-hidden">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <UserCheck className="text-emerald-400" />
              {lang === 'sw' ? 'Njia za Mkato' : 'Quick Access'}
            </h3>

            <div className="space-y-3">
              <button onClick={() => setView('customer_support')} className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all flex items-center gap-4 text-left">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <HelpCircle size={22} />
                </div>
                <div>
                  <p className="font-bold">{lang === 'sw' ? 'Huduma kwa Wateja' : 'Customer Support'}</p>
                  <p className="text-xs text-white/70">{lang === 'sw' ? 'Tafuta na saidia' : 'Search & Assist'}</p>
                </div>
              </button>

              <button onClick={() => setView('manual_verification')} className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all flex items-center gap-4 text-left">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <UserCheck size={22} />
                </div>
                <div>
                  <p className="font-bold">{lang === 'sw' ? 'Uhakiki wa Mwongozo' : 'Manual Verification'}</p>
                  <p className="text-xs text-white/70">{lang === 'sw' ? 'Thibitisha raia' : 'Verify Citizens'}</p>
                </div>
              </button>

              <button onClick={() => setView('verify_documents')} className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all flex items-center gap-4 text-left">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Search size={22} />
                </div>
                <div>
                  <p className="font-bold">{lang === 'sw' ? 'Hakiki Hati' : 'Verify Documents'}</p>
                  <p className="text-xs text-white/70">{lang === 'sw' ? 'Thibitisha uhalali' : 'Check Authenticity'}</p>
                </div>
              </button>
            </div>

            <Building2 className="absolute -right-12 -bottom-12 h-48 w-48 text-white/5 rotate-12" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}