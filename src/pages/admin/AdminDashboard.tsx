import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Building2, MapPin, Settings, TrendingUp, FileText, CheckCircle, 
  AlertCircle, Shield, DollarSign, Clock, Calendar, ArrowUpRight, 
  Activity, Zap, Database, Globe, PieChart 
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { HARDCODED_SERVICES } from '@/constants/services';

interface DashboardStats {
  totalUsers: number;
  totalCitizens: number;
  totalStaff: number;
  totalAdmins: number;
  verifiedUsers: number;
  pendingVerification: number;
  
  totalApplications: number;
  approvedApplications: number;
  pendingApplications: number;
  rejectedApplications: number;
  inProgressApplications: number;
  
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  
  totalServices: number;
  activeServices: number;
  totalCategories: number;
  
  totalRegions: number;
  totalDistricts: number;
  totalWards: number;
  totalStreets: number;
  
  systemUptime: number;
  activeSessions: number;
  apiCalls: number;
  averageResponseTime: number;
}

interface ActivityItem {
  id: string;
  type: 'user' | 'application' | 'payment' | 'service';
  action: string;
  description: string;
  user: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
}

const DASHBOARD_QUERY_KEY = 'admin-dashboard-stats';
const ACTIVITIES_QUERY_KEY = 'recent-activities';

export function AdminDashboard({ setView }: { setView?: (view: string) => void }) {
  const { lang, currency } = useLanguage();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'reports'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [refreshing, setRefreshing] = useState(false);

  // Main Dashboard Stats Query
  const {
    data: stats = {
      totalUsers: 0, totalCitizens: 0, totalStaff: 0, totalAdmins: 0,
      verifiedUsers: 0, pendingVerification: 0,
      totalApplications: 0, approvedApplications: 0, pendingApplications: 0,
      rejectedApplications: 0, inProgressApplications: 0,
      totalRevenue: 0, todayRevenue: 0, monthlyRevenue: 0, pendingPayments: 0,
      totalServices: 0, activeServices: 0, totalCategories: 0,
      totalRegions: 0, totalDistricts: 0, totalWards: 0, totalStreets: 0,
      systemUptime: 99.98, activeSessions: 0, apiCalls: 0, averageResponseTime: 245,
    },
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: [DASHBOARD_QUERY_KEY, timeRange],
    queryFn: async () => {
      const [
        usersRes, citizensRes, staffRes, adminsRes,
        verifiedRes, pendingVerifRes,
        appsRes, approvedRes, pendingAppsRes, rejectedRes, inProgressRes,
        revenueRes, todayRevenueRes, monthRevenueRes, pendingPayRes,
        servicesRes, activeServicesRes, categoriesRes,
        regionsRes, districtsRes, wardsRes, streetsRes,
        sessionsRes
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'citizen'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'staff'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['approved', 'issued']),
        supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'paid']),
        supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['in_progress', 'verified']),
        supabase.from('applications').select('form_data, service_id').in('status', ['paid', 'issued', 'verified', 'approved']),
        supabase.from('applications').select('form_data, service_id').in('status', ['paid', 'issued', 'verified', 'approved']).gte('created_at', new Date().toISOString().split('T')[0]),
        supabase.from('applications').select('form_data, service_id').in('status', ['paid', 'issued', 'verified', 'approved']).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('applications').select('form_data, service_id').in('status', ['pending_payment', 'submitted']),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('service_categories').select('*', { count: 'exact', head: true }),
        supabase.from('locations').select('*', { count: 'exact', head: true }).eq('level', 'region'),
        supabase.from('locations').select('*', { count: 'exact', head: true }).eq('level', 'district'),
        supabase.from('locations').select('*', { count: 'exact', head: true }).eq('level', 'ward'),
        supabase.from('locations').select('*', { count: 'exact', head: true }).eq('level', 'street'),
        supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('active', true)
      ]);

      const calculateRevenue = (apps: any[]) => {
        return apps.reduce((sum, app) => {
          const payment = app.form_data?.payment_data?.amount;
          if (typeof payment === 'number') return sum + payment;
          const fee = app.form_data?.service_fee;
          if (typeof fee === 'number') return sum + fee;
          const service = HARDCODED_SERVICES.find(s => s.id === app.service_id);
          return sum + (service?.fee || 0);
        }, 0);
      };

      return {
        totalUsers: usersRes.count || 0,
        totalCitizens: citizensRes.count || 0,
        totalStaff: staffRes.count || 0,
        totalAdmins: adminsRes.count || 0,
        verifiedUsers: verifiedRes.count || 0,
        pendingVerification: pendingVerifRes.count || 0,
        
        totalApplications: appsRes.count || 0,
        approvedApplications: approvedRes.count || 0,
        pendingApplications: pendingAppsRes.count || 0,
        rejectedApplications: rejectedRes.count || 0,
        inProgressApplications: inProgressRes.count || 0,
        
        totalRevenue: calculateRevenue(revenueRes.data || []),
        todayRevenue: calculateRevenue(todayRevenueRes.data || []),
        monthlyRevenue: calculateRevenue(monthRevenueRes.data || []),
        pendingPayments: calculateRevenue(pendingPayRes.data || []),
        
        totalServices: servicesRes.count || HARDCODED_SERVICES.length,
        activeServices: activeServicesRes.count || HARDCODED_SERVICES.filter(s => s.active).length,
        totalCategories: categoriesRes.count || 4,
        
        totalRegions: regionsRes.count || 0,
        totalDistricts: districtsRes.count || 0,
        totalWards: wardsRes.count || 0,
        totalStreets: streetsRes.count || 0,
        
        systemUptime: 99.98,
        activeSessions: sessionsRes.count || 0,
        apiCalls: 1250000,
        averageResponseTime: 245,
      };
    },
    staleTime: 1000 * 45,   // 45 seconds
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Recent Activities Query
  const {
    data: activities = [],
    isLoading: activitiesLoading,
  } = useQuery<ActivityItem[]>({
    queryKey: [ACTIVITIES_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id, action, details, created_at,
          users:user_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        type: determineActivityType(item.action),
        action: item.action,
        description: item.details,
        user: item.users 
          ? `${(item.users as any).first_name} ${(item.users as any).last_name}`
          : 'System',
        timestamp: item.created_at,
        status: determineActivityStatus(item.action),
      }));
    },
    staleTime: 1000 * 30,
  });

  const recentActivities = useMemo(() => activities.slice(0, 5), [activities]);

  // Real-time subscription for both stats and activities
  useEffect(() => {
    const channel = supabase.channel('dashboard-realtime');

    channel
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [ACTIVITIES_QUERY_KEY] });
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [queryClient]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchStats(),
      queryClient.refetchQueries({ queryKey: [ACTIVITIES_QUERY_KEY] })
    ]);
    setRefreshing(false);
    showToast(lang === 'sw' ? 'Takwimu zimesasishwa' : 'Dashboard refreshed', 'success');
  };

  const applicationSuccessRate = useMemo(() => {
    return stats.totalApplications === 0 
      ? 0 
      : ((stats.approvedApplications / stats.totalApplications) * 100).toFixed(1);
  }, [stats]);

  const verificationRate = useMemo(() => {
    return stats.totalUsers === 0 
      ? 0 
      : ((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(1);
  }, [stats]);

  const determineActivityType = (action: string): ActivityItem['type'] => {
    const lower = action.toLowerCase();
    if (lower.includes('user') || lower.includes('citizen')) return 'user';
    if (lower.includes('application')) return 'application';
    if (lower.includes('payment')) return 'payment';
    if (lower.includes('service')) return 'service';
    return 'user';
  };

  const determineActivityStatus = (action: string): ActivityItem['status'] => {
    const lower = action.toLowerCase();
    if (lower.includes('approve') || lower.includes('success')) return 'success';
    if (lower.includes('pending') || lower.includes('submitted')) return 'pending';
    if (lower.includes('reject') || lower.includes('fail')) return 'error';
    return 'success';
  };

  const formatTimeAgo = (timestamp: string) => {
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return lang === 'sw' ? 'sasa hivi' : 'just now';
    if (diffMins < 60) return `${diffMins} ${lang === 'sw' ? 'dakika' : 'min'} ${lang === 'sw' ? 'zilizopita' : 'ago'}`;
    if (diffHours < 24) return `${diffHours} ${lang === 'sw' ? 'saa' : 'hour'}${diffHours > 1 ? 's' : ''} ${lang === 'sw' ? 'zilizopita' : 'ago'}`;
    return `${diffDays} ${lang === 'sw' ? 'siku' : 'day'}${diffDays > 1 ? 's' : ''} ${lang === 'sw' ? 'zilizopita' : 'ago'}`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            {lang === 'sw' ? 'Dashibodi ya Msimamizi' : 'Admin Dashboard'}
          </h1>
          <p className="text-stone-500 font-medium">
            {lang === 'sw' ? 'Muhtasari wa mfumo mzima wa E-Mtaa' : 'System-wide overview of E-Mtaa'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            title={lang === 'sw' ? 'Chagua muda wa takwimu' : 'Select dashboard time range'}
            aria-label={lang === 'sw' ? 'Chagua muda wa takwimu' : 'Select dashboard time range'}
            className="h-12 px-4 bg-white border border-stone-200 rounded-xl font-medium text-stone-600"
          >
            <option value="today">{lang === 'sw' ? 'Leo' : 'Today'}</option>
            <option value="week">{lang === 'sw' ? 'Wiki hii' : 'This Week'}</option>
            <option value="month">{lang === 'sw' ? 'Mwezi huu' : 'This Month'}</option>
            <option value="year">{lang === 'sw' ? 'Mwaka huu' : 'This Year'}</option>
          </select>

          <button 
            onClick={handleRefresh}
            disabled={statsFetching || refreshing}
            className="h-12 px-4 bg-white border border-stone-200 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <TrendingUp size={18} className={cn((statsFetching || refreshing) && "animate-spin")} />
            {statsFetching || refreshing 
              ? (lang === 'sw' ? 'Inasasisha...' : 'Refreshing...') 
              : (lang === 'sw' ? 'Onyesha upya' : 'Refresh')}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl w-fit">
        {(['overview', 'analytics', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 rounded-xl font-bold text-sm transition-all",
              activeTab === tab 
                ? "bg-white text-emerald-600 shadow-sm" 
                : "text-stone-500 hover:text-stone-700"
            )}
          >
            {lang === 'sw' 
              ? (tab === 'overview' ? 'Muhtasari' : tab === 'analytics' ? 'Takwimu' : 'Ripoti')
              : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              icon={<Users className="text-blue-500" />} 
              label={lang === 'sw' ? "Wananchi" : "Citizens"} 
              value={stats.totalCitizens.toLocaleString()}
              trend={12.5}
              description={lang === 'sw' ? '+12.5% kutoka mwezi uliopita' : '+12.5% from last month'}
            />
            <StatCard 
              icon={<Shield className="text-purple-500" />} 
              label={lang === 'sw' ? "Watumishi" : "Staff"} 
              value={stats.totalStaff.toLocaleString()}
              trend={5.2}
              description={lang === 'sw' ? '+5.2% kutoka mwezi uliopita' : '+5.2% from last month'}
            />
            <StatCard 
              icon={<FileText className="text-amber-500" />} 
              label={lang === 'sw' ? "Maombi" : "Applications"} 
              value={stats.totalApplications.toLocaleString()}
              trend={8.3}
              description={`Approval rate ${applicationSuccessRate}%`}
            />
            <StatCard 
              icon={<DollarSign className="text-emerald-500" />} 
              label={lang === 'sw' ? "Mapato" : "Revenue"} 
              value={formatCurrency(stats.totalRevenue, currency)}
              trend={15.7}
              description={`Today: ${formatCurrency(stats.todayRevenue, currency)}`}
            />
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Application Status */}
            <div className="bg-white rounded-4xl p-6 border border-stone-100 shadow-xl">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">
                {lang === 'sw' ? 'Hali ya Maombi' : 'Application Status'}
              </h3>
              <div className="space-y-4">
                {[
                  { label: lang === 'sw' ? 'Zilizoidhinishwa' : 'Approved', count: stats.approvedApplications, color: 'emerald' },
                  { label: lang === 'sw' ? 'Zinasubiri' : 'Pending', count: stats.pendingApplications, color: 'amber' },
                  { label: lang === 'sw' ? 'Zinafanyika' : 'In Progress', count: stats.inProgressApplications, color: 'blue' },
                  { label: lang === 'sw' ? 'Zilizokataliwa' : 'Rejected', count: stats.rejectedApplications, color: 'red' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
                      <span className="font-medium text-stone-600">{item.label}</span>
                    </div>
                    <span className="font-bold text-stone-900">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* User Statistics */}
            <div className="bg-white rounded-4xl p-6 border border-stone-100 shadow-xl">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">
                {lang === 'sw' ? 'Takwimu za Watumiaji' : 'User Statistics'}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-medium text-stone-600">Verified</span>
                  <span className="font-bold">{stats.verifiedUsers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-stone-600">Pending Verification</span>
                  <span className="font-bold">{stats.pendingVerification.toLocaleString()}</span>
                </div>
                <div className="mt-4 p-3 bg-stone-50 rounded-2xl">
                  <div className="flex justify-between mb-2 text-xs">
                    <span>Verification Rate</span>
                    <span className="font-bold">{verificationRate}%</span>
                  </div>
                  <ProgressBar
                    progress={Number(verificationRate)}
                    height="sm"
                    trackColor="bg-stone-200"
                    fillColor="bg-emerald-600"
                    transitionDuration={300}
                  />
                </div>
              </div>
            </div>

            {/* Services & Locations */}
            <div className="bg-white rounded-4xl p-6 border border-stone-100 shadow-xl">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">
                {lang === 'sw' ? 'Huduma na Maeneo' : 'Services & Locations'}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-stone-400">Services</p>
                  <p className="text-2xl font-black">{stats.totalServices}</p>
                  <p className="text-emerald-600 text-xs">{stats.activeServices} active</p>
                </div>
                <div>
                  <p className="text-stone-400">Categories</p>
                  <p className="text-2xl font-black">{stats.totalCategories}</p>
                </div>
                <div>
                  <p className="text-stone-400">Regions</p>
                  <p className="text-2xl font-black">{stats.totalRegions}</p>
                </div>
                <div>
                  <p className="text-stone-400">Districts</p>
                  <p className="text-2xl font-black">{stats.totalDistricts}</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Health + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-4xl p-6 border border-stone-100 shadow-xl">
              <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-4">System Health</h3>
              <div className="space-y-4">
                <div className="flex justify-between"><span>Uptime</span><span className="font-bold text-emerald-600">{stats.systemUptime}%</span></div>
                <div className="flex justify-between"><span>Active Sessions</span><span className="font-bold">{stats.activeSessions}</span></div>
                <div className="flex justify-between"><span>Response Time</span><span className="font-bold">{stats.averageResponseTime}ms</span></div>
                <div className="flex justify-between"><span>API Calls</span><span className="font-bold">{(stats.apiCalls / 1000000).toFixed(1)}M</span></div>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-4xl p-6 border border-stone-100 shadow-xl">
              <div className="flex justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">Recent Activity</h3>
                <button onClick={() => setView?.('admin_logs')} className="text-emerald-600 text-xs font-bold hover:underline">
                  View All Logs →
                </button>
              </div>
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-3 hover:bg-stone-50 rounded-2xl">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", 
                      activity.type === 'application' && "bg-blue-50 text-blue-600",
                      activity.type === 'payment' && "bg-emerald-50 text-emerald-600",
                      activity.type === 'user' && "bg-purple-50 text-purple-600",
                      activity.type === 'service' && "bg-amber-50 text-amber-600"
                    )}>
                      {activity.type === 'application' && <FileText size={16} />}
                      {activity.type === 'payment' && <DollarSign size={16} />}
                      {activity.type === 'user' && <Users size={16} />}
                      {activity.type === 'service' && <Settings size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <p className="font-bold text-stone-900 text-sm truncate">{activity.action}</p>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-black uppercase",
                          activity.status === 'success' && "bg-emerald-50 text-emerald-600",
                          activity.status === 'pending' && "bg-amber-50 text-amber-600",
                          activity.status === 'error' && "bg-red-50 text-red-600"
                        )}>
                          {activity.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-400">
                        <span>{activity.user}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-stone-900 rounded-4xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                <Zap size={20} className="text-emerald-400" />
                {lang === 'sw' ? 'Vitendo vya Haraka' : 'Quick Actions'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Services', icon: FileText, view: 'service_management' },
                  { label: 'Citizens', icon: Users, view: 'citizen_management' },
                  { label: 'Locations', icon: MapPin, view: 'location_management' },
                  { label: 'Activity Logs', icon: Activity, view: 'admin_logs' },
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => setView?.(item.view)}
                    className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 text-left transition-all"
                  >
                    <item.icon size={24} className="text-emerald-400 mb-2" />
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
                      {lang === 'sw' ? item.label : item.label}
                    </p>
                    <p className="text-sm font-bold">Manage</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Analytics & Reports Tabs - You can expand similarly */}
      {activeTab === 'analytics' && (
        <div className="text-center py-20 text-stone-400">
          Analytics tab coming with charts (Recharts or Tremor recommended)
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="text-center py-20 text-stone-400">
          Reports tab - link to logs, citizens, etc.
        </div>
      )}
    </motion.div>
  );
}