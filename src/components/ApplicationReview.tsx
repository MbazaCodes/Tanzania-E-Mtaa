import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, Application, Service, UserProfile } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, CheckCircle, XCircle, AlertCircle, Clock, Search, 
  Eye, RefreshCw, ClipboardList, Paperclip, ExternalLink, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { DeferredPDFPreview } from './DeferredPDFPreview';

interface ApplicationReviewProps {
  lang: 'sw' | 'en';
  user: UserProfile | null;
}

type ReviewApplication = Application & {
  users?: Pick<UserProfile, 'first_name' | 'last_name' | 'phone' | 'nida_number' | 'email'>;
  services?: Pick<Service, 'name' | 'fee'>;
};

export const ApplicationReview: React.FC<ApplicationReviewProps> = ({ lang, user }) => {
  const { showToast } = useToast();

  const [applications, setApplications] = useState<ReviewApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  // Filters
  const [filter, setFilter] = useState<'all' | 'submitted' | 'pending_payment' | 'paid' | 'verified' | 'approved' | 'rejected' | 'pending_review' | 'issued'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [selectedApp, setSelectedApp] = useState<ReviewApplication | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  const [processing, setProcessing] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<'rejected' | 'returned' | null>(null);

  const getServiceName = useCallback((app: ReviewApplication | Application) => {
    return app.services?.name || app.service_name || (lang === 'sw' ? 'Huduma haijatajwa' : 'Unknown service');
  }, [lang]);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setIsGlobalSearching(false);

    const isDemo = !import.meta.env.VITE_SUPABASE_URL || 
                   import.meta.env.VITE_SUPABASE_URL.includes('YOUR_SUPABASE_URL');

    if (isDemo || (user?.id && user.id.startsWith('demo-'))) {
      await new Promise(r => setTimeout(r, 600));
      const demoApps = JSON.parse(localStorage.getItem('demo_applications') || '[]');
      
      let filtered = demoApps;
      if (user?.role === 'staff' || user?.role === 'admin') {
        if (user.assigned_district) {
          filtered = demoApps.filter((app: any) => app.district === user.assigned_district);
        } else if (user.assigned_region) {
          filtered = demoApps.filter((app: any) => app.region === user.assigned_region);
        }
      }

      setApplications(filtered as ReviewApplication[]);
      setLoading(false);
      return;
    }

    // Real Supabase query
    let query = supabase
      .from('applications')
      .select(`
        *,
        users:user_id (first_name, last_name, phone, nida_number, email),
        services (name, fee)
      `)
      .order('created_at', { ascending: false });

    // Staff/ Admin location filtering
    if ((user?.role === 'staff' || user?.role === 'admin')) {
      if (user.assigned_district) {
        query = query.eq('district', user.assigned_district);
      } else if (user.assigned_region) {
        query = query.eq('region', user.assigned_region);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching applications:', error);
      showToast(lang === 'sw' ? 'Hitilafu ya kupata maombi' : 'Failed to load applications', 'error');
    } else {
      setApplications((data || []) as ReviewApplication[]);
    }
    setLoading(false);
  }, [user, lang, showToast]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Optimized filtered & paginated list
  const filteredAndPaginatedApps = useMemo(() => {
    const isPaid = (status: string) => ['paid', 'verified', 'approved', 'issued'].includes(status);

    let result = applications.filter(app => {
      const serviceName = getServiceName(app);
      const matchesStatus = filter === 'all' || app.status === filter;
      const matchesPayment = paymentFilter === 'all' || 
        (paymentFilter === 'paid' && isPaid(app.status)) ||
        (paymentFilter === 'unpaid' && !isPaid(app.status));
      const matchesRegion = regionFilter === 'all' || app.region === regionFilter;
      const matchesDistrict = districtFilter === 'all' || app.district === districtFilter;
      const matchesService = serviceFilter === 'all' || serviceName === serviceFilter;

      const searchLower = search.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        app.application_number.toLowerCase().includes(searchLower) ||
        `${app.users?.first_name || ''} ${app.users?.last_name || ''}`.toLowerCase().includes(searchLower) ||
        serviceName.toLowerCase().includes(searchLower);

      return matchesStatus && matchesPayment && matchesRegion && matchesDistrict && matchesService && matchesSearch;
    });

    const totalPages = Math.ceil(result.length / itemsPerPage);
    const paginated = result.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return { apps: paginated, totalPages, totalCount: result.length };
  }, [applications, filter, paymentFilter, search, regionFilter, districtFilter, serviceFilter, currentPage, getServiceName]);

  const { apps: paginatedApps, totalPages } = filteredAndPaginatedApps;

  const serviceOptions = useMemo(() => {
    return Array.from(new Set(applications.map(getServiceName)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [applications, getServiceName]);

  // Global search (searches entire database)
  const handleGlobalSearch = useCallback(async () => {
    if (!search.trim()) {
      showToast(lang === 'sw' ? 'Ingiza namba ya ombi' : 'Enter application number', 'error');
      return;
    }

    setIsGlobalSearching(true);

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        users:user_id (first_name, last_name),
        services (name)
      `)
      .ilike('application_number', `%${search}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      showToast(lang === 'sw' ? 'Hitilafu katika kutafuta' : 'Search error', 'error');
    } else if (data) {
      setApplications(data as ReviewApplication[]);
      showToast(`${data.length} ${lang === 'sw' ? 'maombi yamepatikana' : 'applications found'}`, 'success');
    } else {
      setApplications([]);
    }

    setIsGlobalSearching(false);
  }, [search, lang, showToast]);

  const clearGlobalSearch = () => {
    setSearch('');
    fetchApplications();
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchApplications();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Status update
  const updateStatus = useCallback(async (id: string, status: string, feedback?: string) => {
    setProcessing(true);

    const feedbackPayload = feedback
      ? {
          form_data: {
            ...(selectedApp?.form_data || {}),
            staff_feedback: feedback,
            staff_feedback_action: status,
            staff_feedback_at: new Date().toISOString(),
          },
        }
      : {};

    const updateData: any = { 
      status,
      ...feedbackPayload,
      ...(status === 'approved' && { approved_by: user?.id, approved_at: new Date().toISOString() }),
      ...(status === 'issued' && { issued_by: user?.id, issued_at: new Date().toISOString() }),
      ...(status === 'rejected' && { rejected_by: user?.id, rejected_at: new Date().toISOString() }),
      ...(status === 'returned' && { returned_by: user?.id, returned_at: new Date().toISOString() }),
    };

    const isDemo = !import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co');

    if (isDemo) {
      // Demo mode
      await new Promise(r => setTimeout(r, 700));
      setApplications(prev => prev.map(app => 
        app.id === id ? { ...app, ...updateData } : app
      ));
      if (selectedApp?.id === id) setSelectedApp(prev => prev ? { ...prev, ...updateData } : null);
    } else {
      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id);

      if (error) {
        showToast(lang === 'sw' ? 'Hitilafu ya kusasisha' : 'Update failed', 'error');
        setProcessing(false);
        return;
      }
    }

    // Success messages
    const messages: Record<string, string> = {
      pending_payment: lang === 'sw' ? 'Maombi yameidhinishwa! Inasubiri malipo.' : 'Approved! Awaiting payment.',
      issued: lang === 'sw' ? 'Hati imetolewa kikamilifu!' : 'Document issued successfully!',
      rejected: lang === 'sw' ? 'Maombi yamekataliwa.' : 'Application rejected.',
      returned: lang === 'sw' ? 'Maombi yamerudishwa kwa marekebisho.' : 'Application returned for revision.',
    };

    showToast(messages[status] || 'Status updated', status === 'rejected' ? 'info' : 'success');
    setApplications(prev => prev.map(app =>
      app.id === id ? { ...app, ...updateData } : app
    ));

    setProcessing(false);
    setShowFeedbackInput(false);
    setFeedbackText('');
    setPendingAction(null);
    setShowFullDetails(false);
    setSelectedApp(null);
    await fetchApplications();
  }, [user, lang, showToast, selectedApp, fetchApplications]);

  const handleApprove = () => {
    if (!selectedApp) return;
    const nextStatus = selectedApp.status === 'paid' || selectedApp.status === 'verified' 
      ? 'issued' 
      : 'pending_payment';
    updateStatus(selectedApp.id, nextStatus);
  };

  const handleReject = () => {
    setPendingAction('rejected');
    setShowFeedbackInput(true);
    setFeedbackText('');
  };

  const handleReturn = () => {
    setPendingAction('returned');
    setShowFeedbackInput(true);
    setFeedbackText('');
  };

  const submitFeedback = () => {
    if (!selectedApp || !pendingAction || !feedbackText.trim()) return;
    updateStatus(selectedApp.id, pendingAction, feedbackText.trim());
  };

  const openDetails = (app: ReviewApplication) => {
    setSelectedApp(app);
    setShowFullDetails(true);
  };

  const openPDF = (app: ReviewApplication) => {
    setSelectedApp(app);
    setShowPDFPreview(true);
  };

  const closeDetails = () => {
    setShowFullDetails(false);
    setShowFeedbackInput(false);
    setFeedbackText('');
    setPendingAction(null);
  };

  const formatFieldLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const renderFieldValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? (lang === 'sw' ? 'Ndiyo' : 'Yes') : (lang === 'sw' ? 'Hapana' : 'No');
    return String(value);
  };

  const getApplicationLocation = (app: ReviewApplication) => {
    const formData = app.form_data || {};
    const primary = [
      app.region || formData.region || formData.council,
      app.district || formData.district,
      app.ward || formData.ward,
      app.street || formData.street,
    ].filter(Boolean);

    const secondary = [
      formData.neighborhood,
      formData.house_number ? `${lang === 'sw' ? 'Nyumba' : 'House'} ${formData.house_number}` : '',
      formData.plot_number ? `${lang === 'sw' ? 'Kiwanja' : 'Plot'} ${formData.plot_number}` : '',
    ].filter(Boolean);

    return {
      primary: primary.join(', ') || '-',
      secondary: secondary.join(', ') || '-',
    };
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: "bg-blue-100 text-blue-700",
      pending_payment: "bg-orange-100 text-orange-700",
      paid: "bg-amber-100 text-amber-700",
      verified: "bg-indigo-100 text-indigo-700",
      approved: "bg-emerald-100 text-emerald-700",
      issued: "bg-emerald-600 text-white",
      rejected: "bg-red-100 text-red-700",
      returned: "bg-amber-100 text-amber-700",
    };

    const labels: Record<string, string> = {
      submitted: lang === 'sw' ? 'Imewasilishwa' : 'Submitted',
      pending_payment: lang === 'sw' ? 'Inasubiri Malipo' : 'Pending Payment',
      paid: lang === 'sw' ? 'Imelipiwa' : 'Paid',
      verified: lang === 'sw' ? 'Imethibitishwa' : 'Verified',
      approved: lang === 'sw' ? 'Imeidhinishwa' : 'Approved',
      issued: lang === 'sw' ? 'Imetolewa' : 'Issued',
      rejected: lang === 'sw' ? 'Imekataliwa' : 'Rejected',
      returned: lang === 'sw' ? 'Imerudishwa' : 'Returned',
    };

    return (
      <span className={cn("px-3 py-1 rounded-full text-xs font-bold", styles[status] || "bg-stone-100 text-stone-600")}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">
            {lang === 'sw' ? 'Uhakiki wa Maombi' : 'Application Review'}
          </h2>
          <p className="text-stone-500">
            {lang === 'sw' ? 'Simamia maombi ya wananchi' : 'Manage and review citizen applications'}
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={isRefreshing || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl font-semibold transition-all disabled:opacity-60"
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          {lang === 'sw' ? 'Onyesha Upya' : 'Refresh'}
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder={lang === 'sw' ? 'Tafuta namba ya ombi...' : 'Search application number...'}
            className="w-full pl-11 pr-4 h-12 rounded-2xl border border-stone-200 focus:border-emerald-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
          />
        </div>

        <button
          onClick={handleGlobalSearch}
          disabled={isGlobalSearching || !search.trim()}
          className="h-12 px-8 bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 text-white rounded-2xl font-semibold flex items-center gap-2 whitespace-nowrap"
        >
          {isGlobalSearching ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
          {lang === 'sw' ? 'Tafuta Kote' : 'Search All'}
        </button>

        {search && (
          <button onClick={clearGlobalSearch} className="h-12 px-6 text-stone-500 hover:text-red-600 font-medium">
            {lang === 'sw' ? 'Ondoa' : 'Clear'}
          </button>
        )}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        <select value={filter} onChange={(e) => { setFilter(e.target.value as any); setCurrentPage(1); }} title={lang === 'sw' ? 'Chuja kwa hali ya ombi' : 'Filter by application status'} aria-label={lang === 'sw' ? 'Chuja kwa hali ya ombi' : 'Filter by application status'} className="h-11 px-4 rounded-2xl border border-stone-200 bg-white">
          <option value="all">{lang === 'sw' ? 'Hali Zote' : 'All Status'}</option>
          <option value="submitted">{lang === 'sw' ? 'Imewasilishwa' : 'Submitted'}</option>
          <option value="pending_payment">{lang === 'sw' ? 'Inasubiri Malipo' : 'Pending Payment'}</option>
          <option value="paid">{lang === 'sw' ? 'Imelipiwa' : 'Paid'}</option>
          <option value="verified">{lang === 'sw' ? 'Imethibitishwa' : 'Verified'}</option>
          <option value="approved">{lang === 'sw' ? 'Imeidhinishwa' : 'Approved'}</option>
          <option value="issued">{lang === 'sw' ? 'Imetolewa' : 'Issued'}</option>
          <option value="rejected">{lang === 'sw' ? 'Imekataliwa' : 'Rejected'}</option>
        </select>

        <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value as any); setCurrentPage(1); }} title={lang === 'sw' ? 'Chuja kwa hali ya malipo' : 'Filter by payment status'} aria-label={lang === 'sw' ? 'Chuja kwa hali ya malipo' : 'Filter by payment status'} className="h-11 px-4 rounded-2xl border border-stone-200 bg-white">
          <option value="all">{lang === 'sw' ? 'Malipo Yote' : 'All Payments'}</option>
          <option value="paid">{lang === 'sw' ? 'Imelipiwa' : 'Paid'}</option>
          <option value="unpaid">{lang === 'sw' ? 'Haijalipiwa' : 'Unpaid'}</option>
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => { setServiceFilter(e.target.value); setCurrentPage(1); }}
          title={lang === 'sw' ? 'Chuja kwa aina ya huduma' : 'Filter by service type'}
          aria-label={lang === 'sw' ? 'Chuja kwa aina ya huduma' : 'Filter by service type'}
          className="h-11 px-4 rounded-2xl border border-stone-200 bg-white"
        >
          <option value="all">{lang === 'sw' ? 'Huduma Zote' : 'All Services'}</option>
          {serviceOptions.map((serviceName) => (
            <option key={serviceName} value={serviceName}>{serviceName}</option>
          ))}
        </select>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr className="text-left text-xs font-bold text-stone-500 uppercase tracking-wider">
                <th className="px-6 py-4">Namba ya Maombi</th>
                <th className="px-6 py-4">Mwombaji</th>
                <th className="px-6 py-4">Huduma</th>
                <th className="px-6 py-4">Hali</th>
                <th className="px-6 py-4">Tarehe</th>
                <th className="px-6 py-4 text-right">Vitendo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><RefreshCw className="animate-spin mx-auto" size={28} /></td></tr>
              ) : paginatedApps.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-stone-400">Hakuna maombi yanayolingana</td></tr>
              ) : (
                paginatedApps.map(app => (
                  <tr key={app.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => openDetails(app)}
                        className="font-mono font-semibold text-emerald-700 underline-offset-4 hover:text-emerald-900 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded"
                        title={lang === 'sw' ? 'Fungua ombi hili' : 'Open this application'}
                        aria-label={`${lang === 'sw' ? 'Fungua ombi' : 'Open application'} ${app.application_number}`}
                      >
                        {app.application_number}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      {app.users?.first_name} {app.users?.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm">{getServiceName(app)}</td>
                    <td className="px-6 py-4">{getStatusBadge(app.status)}</td>
                    <td className="px-6 py-4 text-sm text-stone-500">
                      {new Date(app.created_at).toLocaleDateString('sw-TZ')}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openDetails(app)} title={lang === 'sw' ? 'Fungua maelezo ya ombi' : 'Open application details'} aria-label={lang === 'sw' ? 'Fungua maelezo ya ombi' : 'Open application details'} className="text-emerald-600 hover:text-emerald-700">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => openPDF(app)} title={lang === 'sw' ? 'Fungua PDF ya ombi' : 'Open application PDF'} aria-label={lang === 'sw' ? 'Fungua PDF ya ombi' : 'Open application PDF'} className="text-red-600 hover:text-red-700">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-9 h-9 rounded-xl text-sm font-medium",
                  currentPage === page 
                    ? "bg-emerald-600 text-white" 
                    : "hover:bg-stone-100 text-stone-600"
                )}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Full Details Modal */}
      <AnimatePresence>
        {showFullDetails && selectedApp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={closeDetails}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-stone-900">
                      {selectedApp.application_number}
                    </h3>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                  <p className="text-sm text-stone-500 mt-1">
                    {getServiceName(selectedApp)} • {new Date(selectedApp.created_at).toLocaleString('sw-TZ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="h-10 w-10 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-900 flex items-center justify-center"
                  title={lang === 'sw' ? 'Funga' : 'Close'}
                  aria-label={lang === 'sw' ? 'Funga' : 'Close'}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-6">
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-stone-200 p-4">
                    <p className="text-xs font-bold uppercase text-stone-400 mb-1">
                      {lang === 'sw' ? 'Mwombaji' : 'Applicant'}
                    </p>
                    <p className="font-bold text-stone-900">
                      {[selectedApp.users?.first_name, selectedApp.users?.last_name].filter(Boolean).join(' ') || '-'}
                    </p>
                    <p className="text-sm text-stone-500">{selectedApp.users?.phone || selectedApp.users?.email || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 p-4">
                    <p className="text-xs font-bold uppercase text-stone-400 mb-1">
                      {lang === 'sw' ? 'Huduma' : 'Service'}
                    </p>
                    <p className="font-bold text-stone-900">{getServiceName(selectedApp)}</p>
                    <p className="text-sm text-stone-500">{selectedApp.service_id || selectedApp.service_name || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 p-4">
                    <p className="text-xs font-bold uppercase text-stone-400 mb-1">
                      {lang === 'sw' ? 'Eneo' : 'Location'}
                    </p>
                    <p className="font-bold text-stone-900">
                      {getApplicationLocation(selectedApp).primary}
                    </p>
                    <p className="text-sm text-stone-500">
                      {getApplicationLocation(selectedApp).secondary}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
                    <ClipboardList size={18} className="text-emerald-600" />
                    <h4 className="font-bold text-stone-900">
                      {lang === 'sw' ? 'Taarifa za Fomu' : 'Form Details'}
                    </h4>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedApp.form_data || {}).length === 0 ? (
                      <p className="text-sm text-stone-500 md:col-span-2">
                        {lang === 'sw' ? 'Hakuna taarifa za fomu.' : 'No form details.'}
                      </p>
                    ) : (
                      Object.entries(selectedApp.form_data || {}).map(([key, value]) => (
                        <div key={key} className="rounded-xl bg-stone-50 px-4 py-3">
                          <p className="text-xs font-bold uppercase text-stone-400">{formatFieldLabel(key)}</p>
                          <p className="mt-1 text-sm font-medium text-stone-800 whitespace-pre-wrap wrap-break-word">
                            {renderFieldValue(value)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {showFeedbackInput && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <label className="block text-sm font-bold text-amber-900 mb-2">
                      {pendingAction === 'rejected'
                        ? (lang === 'sw' ? 'Sababu ya kukataa' : 'Rejection reason')
                        : (lang === 'sw' ? 'Maelekezo ya marekebisho' : 'Revision instructions')}
                    </label>
                    <textarea
                      value={feedbackText}
                      onChange={(event) => setFeedbackText(event.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-amber-200 bg-white p-3 outline-none focus:border-amber-500"
                      placeholder={lang === 'sw' ? 'Andika maelezo kwa mwananchi...' : 'Write feedback for the citizen...'}
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowFeedbackInput(false);
                          setPendingAction(null);
                          setFeedbackText('');
                        }}
                        className="px-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-900 font-semibold"
                      >
                        {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={submitFeedback}
                        disabled={processing || !feedbackText.trim()}
                        className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold disabled:opacity-50"
                      >
                        {lang === 'sw' ? 'Tuma' : 'Send'}
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex flex-col sm:flex-row justify-between gap-3">
                <button
                  type="button"
                  onClick={() => openPDF(selectedApp)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 font-semibold hover:bg-stone-100"
                >
                  <FileText size={18} />
                  {lang === 'sw' ? 'Fungua PDF' : 'Open PDF'}
                </button>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleReturn}
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 font-semibold hover:bg-amber-200 disabled:opacity-50"
                  >
                    <AlertCircle size={18} />
                    {lang === 'sw' ? 'Rudisha' : 'Return'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    {lang === 'sw' ? 'Kataa' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={processing}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    {processing ? (lang === 'sw' ? 'Inashughulikia...' : 'Processing...') : (lang === 'sw' ? 'Idhinisha / Toa' : 'Approve / Issue')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {showPDFPreview && selectedApp && (
          <DeferredPDFPreview
            application={selectedApp}
            service={selectedApp.services}
            title={`PDF Preview - ${selectedApp.application_number}`}
            closeLabel={lang === 'sw' ? 'Funga hakiki ya PDF' : 'Close PDF preview'}
            onClose={() => setShowPDFPreview(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
