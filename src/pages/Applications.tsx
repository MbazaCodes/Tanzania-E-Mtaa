import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, ArrowUpDown, Calendar, X, Eye, 
  FileText, Clock, CreditCard, RefreshCw, Receipt, CheckCircle2,
  PlusCircle,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase, Application } from '@/lib/supabase';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ApplicationProgressBar } from '@/components/ui/ApplicationProgressBar';
import { DeferredPDFPreview } from '@/components/DeferredPDFPreview';
import { formatCurrency } from '@/lib/currency';

interface ApplicationsProps {
  applications: Application[];
  drafts?: any[];
  onPay: (app: Application) => void;
  onRefresh?: () => void;
  onResumeDraft?: (draft: any) => void;
  onApplyAgain?: (app: Application) => void;
}

export function Applications({ applications, drafts = [], onPay, onRefresh, onResumeDraft, onApplyAgain }: ApplicationsProps) {
  const { lang, t, currency } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [previewApp, setPreviewApp] = useState<Application | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const getServiceName = useCallback((app: Application) => {
    return (app as any).services?.name || app.service_name || (lang === 'sw' ? 'Huduma' : 'Service');
  }, [lang]);

  // Helper: Calculate payment amount
  const getPaymentAmount = useCallback((app: Application): number => {
    const serviceFee = (app as any).services?.fee || 0;
    const formServiceFee = app.form_data?.service_fee;
    const extraAddressFee = (app as any).services?.extra_address_fee || 0;

    let baseFee = serviceFee > 0 ? serviceFee : 0;

    if (baseFee === 0 && formServiceFee) {
      baseFee = typeof formServiceFee === 'number' 
        ? formServiceFee 
        : parseFloat(formServiceFee as string) || 0;
    }

    // Extra fees for Barua ya Utambulisho
    if (extraAddressFee > 0 && app.form_data?.num_extra_addresses) {
      const numExtra = parseInt(app.form_data.num_extra_addresses as string) || 0;
      baseFee += numExtra * extraAddressFee;
    }

    return baseFee;
  }, []);

  // Auto-update approved applications to pending_payment
  useEffect(() => {
    const updateApprovedApps = async () => {
      const approvedApps = applications.filter(app => app.status === 'approved');
      if (approvedApps.length === 0) return;

      for (const app of approvedApps) {
        try {
          const { error } = await supabase
            .from('applications')
            .update({ status: 'pending_payment' })
            .eq('id', app.id)
            .eq('status', 'approved');

          if (error) console.error('Update error:', error);
        } catch (err) {
          console.error('Failed to update status:', err);
        }
      }

      if (onRefresh) onRefresh();
    };

    updateApprovedApps();
  }, [applications, onRefresh]);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [onRefresh]);

  const handleDownload = useCallback(async (app: Application, documentType: 'receipt' | 'certificate') => {
    const downloadKey = `${documentType}-${app.id}`;
    setDownloadingKey(downloadKey);

    try {
      const [{ pdf }, receiptModule, factoryModule] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/ReceiptPDF'),
        import('@/components/pdf/PDFFactory'),
      ]);

      const ReceiptComponent = receiptModule.ReceiptPDF;
      const DocumentComponent = factoryModule.PDFFactory;

      const documentNode = documentType === 'receipt'
        ? React.createElement(ReceiptComponent, {
            application: app,
            paymentData: (app as any).payment_data || {
              transaction_id: app.application_number,
              amount: getPaymentAmount(app),
              payment_method: 'system',
              paid_at: app.paid_at || app.updated_at || app.created_at,
            },
            lang,
          })
        : React.createElement(DocumentComponent, {
            application: app,
            lang,
          });

      const blob = await pdf(documentNode as React.ReactElement).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentType === 'receipt'
        ? `Receipt_${app.application_number}.pdf`
        : `Certificate_${app.application_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download failed:', error);
      showToast(
        lang === 'sw' ? 'Imeshindwa kuandaa PDF' : 'Failed to prepare PDF',
        'error'
      );
    } finally {
      setDownloadingKey((currentKey) => currentKey === downloadKey ? null : currentKey);
    }
  }, [getPaymentAmount, lang, showToast]);

  // Filtered & Sorted Applications
  const filteredAndSortedApplications = useMemo(() => {
    return applications
      .filter(app => {
        const serviceName = lang === 'sw' 
          ? getServiceName(app)
          : (app as any).services?.name_en || getServiceName(app);

        const matchesSearch = 
          serviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.application_number.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
  }, [applications, searchTerm, statusFilter, sortOrder, lang, getServiceName]);

  // Transform approved â†’ pending_payment for UI consistency
  const displayApplications = useMemo(() => {
    return filteredAndSortedApplications.map(app => 
      app.status === 'approved' 
        ? { ...app, status: 'pending_payment' as const }
        : app
    );
  }, [filteredAndSortedApplications]);

  const statuses = [
    { value: 'all', label: lang === 'sw' ? 'Zote' : 'All' },
    { value: 'submitted', label: lang === 'sw' ? 'Imetumwa' : 'Submitted' },
    { value: 'pending_payment', label: lang === 'sw' ? 'Inasubiri Malipo' : 'Pending Payment' },
    { value: 'paid', label: lang === 'sw' ? 'Imelipiwa' : 'Paid' },
    { value: 'processing', label: lang === 'sw' ? 'Inashughulikiwa' : 'Processing' },
    { value: 'issued', label: lang === 'sw' ? 'Imetolewa' : 'Issued' },
    { value: 'rejected', label: lang === 'sw' ? 'Imekataliwa' : 'Rejected' },
    { value: 'refunded', label: lang === 'sw' ? 'Imerejeshwa' : 'Refunded' },
  ];

  const renderFieldValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '-';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? (lang === 'sw' ? 'Ndiyo' : 'Yes') : (lang === 'sw' ? 'Hapana' : 'No');
    return String(value);
  };

  const formatFieldLabel = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const handlePayFromModal = (app: Application) => {
    setSelectedApp(null);
    onPay(app);
  };

  return (
    <motion.div 
      key="applications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-stone-800">{lang === 'sw' ? 'Maombi Yangu' : 'My Applications'}</h2>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-semibold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {lang === 'sw' ? 'Onyesha Upya' : 'Refresh'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text"
              placeholder={lang === 'sw' ? 'Tafuta...' : 'Search...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-11 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 w-full md:w-64"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              title={lang === 'sw' ? 'Chuja kwa hali' : 'Filter by status'}
              aria-label={lang === 'sw' ? 'Chuja kwa hali' : 'Filter by status'}
              className="pl-10 pr-8 h-11 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 appearance-none"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-4 h-11 bg-white border border-stone-200 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-50"
          >
            <Calendar size={18} />
            {lang === 'sw' ? 'Tarehe' : 'Date'}
            <ArrowUpDown size={14} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>

      {/* Applications List */}
      {drafts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-200">
            <h3 className="font-bold text-amber-900 flex items-center gap-2">
              <Clock size={18} />
              {lang === 'sw' ? 'Maombi ambayo hayajakamilika' : 'Unfinished applications'}
            </h3>
          </div>
          <div className="divide-y divide-amber-100">
            {drafts.map((draft) => (
              <div key={draft.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-stone-900">{draft.service_name || draft.services?.name}</p>
                  <p className="text-sm text-stone-600">
                    {draft.status === 'failed'
                      ? (lang === 'sw' ? 'Uwasilishaji ulifeli. Unaweza kuendelea na kujaribu tena.' : 'Submission failed. You can continue and retry.')
                      : (lang === 'sw' ? 'Draft imehifadhiwa. Endelea pale ulipoishia.' : 'Draft saved. Continue where you left off.')}
                  </p>
                  {draft.error_message && (
                    <p className="text-xs text-red-600 mt-1">{draft.error_message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onResumeDraft?.(draft)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
                >
                  <FileText size={16} />
                  {lang === 'sw' ? 'Endelea / Jaribu Tena' : 'Continue / Retry'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Huduma</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Namba ya Maombi</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Tarehe</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Hali</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">Kitendo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {displayApplications.map(app => {
                const paymentAmount = getPaymentAmount(app);
                const needsPayment = (app.status === 'submitted' || app.status === 'pending_payment') && paymentAmount > 0;
                const isIssued = app.status === 'issued' || app.status === 'paid';

                return (
                  <tr 
                    key={app.id} 
                    className="hover:bg-stone-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedApp(app)}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-stone-800">
                        {getServiceName(app)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                        className="font-mono text-sm font-semibold text-emerald-700 underline-offset-4 hover:text-emerald-900 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded"
                        title={lang === 'sw' ? 'Fungua ombi hili' : 'Open this application'}
                        aria-label={`${lang === 'sw' ? 'Fungua ombi' : 'Open application'} ${app.application_number}`}
                      >
                        {app.application_number}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="text-sm text-stone-600">
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-stone-400">
                          {new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <StatusBadge status={app.status} lang={lang} />
                        {needsPayment && (
                          <span className="flex items-center gap-1 text-orange-600 text-[10px] font-bold">
                            <CreditCard size={12} /> Haijalipwa
                          </span>
                        )}
                        {isIssued && (
                          <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                            <CheckCircle2 size={12} /> {app.status === 'issued' ? 'Imetolewa' : 'Imelipiwa'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {needsPayment ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onPay(app); }}
                          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700"
                        >
                          {(lang === 'sw' ? 'Lipa Sasa' : 'Pay Now')} ({formatCurrency(paymentAmount, currency)})
                        </button>
                      ) : isIssued ? (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownload(app, 'receipt');
                            }}
                            className="text-amber-600 text-sm font-bold hover:underline disabled:opacity-60"
                            disabled={downloadingKey === `receipt-${app.id}`}
                          >
                            {downloadingKey === `receipt-${app.id}` ? (lang === 'sw' ? 'Inaandaa...' : 'Preparing...') : 'Risiti'}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setPreviewApp(app); }} className="text-stone-600 text-sm font-bold hover:underline">
                            Hakiki
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownload(app, 'certificate');
                            }}
                            className="text-emerald-600 text-sm font-bold hover:underline disabled:opacity-60"
                            disabled={downloadingKey === `certificate-${app.id}`}
                          >
                            {downloadingKey === `certificate-${app.id}` ? (lang === 'sw' ? 'Inaandaa...' : 'Preparing...') : 'Pakua'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-stone-400 text-sm font-bold">
                          {app.status === 'rejected' ? 'Imekataliwa' : 'Inashughulikiwa'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {displayApplications.map(app => {
            const paymentAmount = getPaymentAmount(app);
            const needsPayment = (app.status === 'submitted' || app.status === 'pending_payment') && paymentAmount > 0;
            const isIssued = app.status === 'issued' || app.status === 'paid';

            return (
              <div
                key={app.id}
                className="p-4 active:bg-stone-50"
                onClick={() => setSelectedApp(app)}
              >
                {/* Service name + status row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-stone-900 text-sm leading-snug flex-1">
                    {getServiceName(app)}
                  </p>
                  <StatusBadge status={app.status} lang={lang} />
                </div>

                {/* App number + date */}
                <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
                  <span className="font-mono font-semibold text-emerald-700">{app.application_number}</span>
                  <span>•</span>
                  <span>{new Date(app.created_at).toLocaleDateString()}</span>
                </div>

                {/* Progress bar */}
                <ApplicationProgressBar status={app.status} lang={lang} compact />

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  {needsPayment && (
                    <button
                      onClick={() => onPay(app)}
                      className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      <CreditCard className="inline h-3 w-3 mr-1" />
                      {lang === 'sw' ? 'Lipa' : 'Pay'} ({formatCurrency(paymentAmount, currency)})
                    </button>
                  )}
                  {isIssued && (
                    <>
                      <button
                        onClick={() => void handleDownload(app, 'receipt')}
                        disabled={downloadingKey === `receipt-${app.id}`}
                        className="flex-1 bg-amber-100 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-200 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        <Receipt className="inline h-3 w-3 mr-1" />
                        {lang === 'sw' ? 'Risiti' : 'Receipt'}
                      </button>
                      <button
                        onClick={() => void handleDownload(app, 'certificate')}
                        disabled={downloadingKey === `certificate-${app.id}`}
                        className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        <FileText className="inline h-3 w-3 mr-1" />
                        {lang === 'sw' ? 'Pakua' : 'Download'}
                      </button>
                    </>
                  )}
                  {(isIssued || app.status === 'rejected') && onApplyAgain && (
                    <button
                      onClick={() => onApplyAgain(app)}
                      className="flex-1 border border-emerald-300 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 active:scale-95 transition-all"
                    >
                      <PlusCircle className="inline h-3 w-3 mr-1" />
                      {lang === 'sw' ? 'Ombi Jipya' : 'Apply Again'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {displayApplications.length === 0 && (
          <div className="px-6 py-12 text-center text-stone-400">
            <Search size={32} className="mx-auto opacity-20 mb-3" />
            {lang === 'sw' ? 'Hakuna maombi yaliyopatikana.' : 'No applications found.'}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewApp && (
        <DeferredPDFPreview 
          application={previewApp} 
          service={(previewApp as any).services} 
          title="Document Preview"
          subtitle={previewApp.application_number}
          closeLabel="Close preview"
          onClose={() => setPreviewApp(null)} 
        />
      )}

      {/* Application Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-stone-900">{selectedApp.application_number}</h3>
                    <StatusBadge status={selectedApp.status} lang={lang} />
                  </div>
                  <p className="text-sm text-stone-500 mt-1">
                    {getServiceName(selectedApp)} • {new Date(selectedApp.created_at).toLocaleString('sw-TZ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
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
                      {lang === 'sw' ? 'Huduma' : 'Service'}
                    </p>
                    <p className="font-bold text-stone-900">{getServiceName(selectedApp)}</p>
                    <p className="text-sm text-stone-500">{formatCurrency(getPaymentAmount(selectedApp), currency)}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 p-4">
                    <p className="text-xs font-bold uppercase text-stone-400 mb-1">
                      {lang === 'sw' ? 'Hali' : 'Status'}
                    </p>
                    <StatusBadge status={selectedApp.status} lang={lang} />
                    <div className="mt-3">
                      <ApplicationProgressBar status={selectedApp.status} lang={lang} compact />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 p-4">
                    <p className="text-xs font-bold uppercase text-stone-400 mb-1">
                      {lang === 'sw' ? 'Tarehe' : 'Date'}
                    </p>
                    <p className="font-bold text-stone-900">{new Date(selectedApp.created_at).toLocaleDateString('sw-TZ')}</p>
                    <p className="text-sm text-stone-500">{new Date(selectedApp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-stone-200 overflow-hidden">
                  <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600" />
                    <h4 className="font-bold text-stone-900">
                      {lang === 'sw' ? 'Taarifa za Ombi' : 'Application Details'}
                    </h4>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedApp.form_data || {}).length === 0 ? (
                      <p className="text-sm text-stone-500 md:col-span-2">
                        {lang === 'sw' ? 'Hakuna taarifa za ziada.' : 'No extra details.'}
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
              </div>

              <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewApp(selectedApp)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 font-semibold hover:bg-stone-100"
                  >
                    <Eye size={18} />
                    {lang === 'sw' ? 'Hakiki' : 'Preview'}
                  </button>

                  {/* Apply Again — available once issued, paid, or rejected */}
                  {(selectedApp.status === 'issued' || selectedApp.status === 'paid' || selectedApp.status === 'rejected') && onApplyAgain && (
                    <button
                      type="button"
                      onClick={() => { setSelectedApp(null); onApplyAgain(selectedApp); }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-100"
                    >
                      <PlusCircle size={18} />
                      {lang === 'sw' ? 'Ombi Jipya' : 'Apply Again'}
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {(selectedApp.status === 'submitted' || selectedApp.status === 'pending_payment') && getPaymentAmount(selectedApp) > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePayFromModal(selectedApp)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                    >
                      <CreditCard size={18} />
                      {lang === 'sw' ? 'Lipa Sasa' : 'Pay Now'} ({formatCurrency(getPaymentAmount(selectedApp), currency)})
                    </button>
                  )}

                  {(selectedApp.status === 'issued' || selectedApp.status === 'paid') && (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleDownload(selectedApp, 'receipt')}
                        disabled={downloadingKey === `receipt-${selectedApp.id}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 font-semibold hover:bg-amber-200 disabled:opacity-50"
                      >
                        <Receipt size={18} />
                        {downloadingKey === `receipt-${selectedApp.id}` ? (lang === 'sw' ? 'Inaandaa...' : 'Preparing...') : (lang === 'sw' ? 'Risiti' : 'Receipt')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload(selectedApp, 'certificate')}
                        disabled={downloadingKey === `certificate-${selectedApp.id}`}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <FileText size={18} />
                        {downloadingKey === `certificate-${selectedApp.id}` ? (lang === 'sw' ? 'Inaandaa...' : 'Preparing...') : (lang === 'sw' ? 'Pakua Hati' : 'Download Document')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
