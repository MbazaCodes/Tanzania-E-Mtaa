// src/App.tsx
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

import { supabase, type Service, type Application } from '@/lib/supabase';
import { useApplications } from './hooks/useApplications';
import { HARDCODED_SERVICES } from '@/constants/services';

import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { BottomTabBar } from './components/layout/BottomTabBar';

import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';

// Lazy loaded pages
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard').then((module) => ({ default: module.StaffDashboard })));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs').then((module) => ({ default: module.AdminLogs })));
const CitizenManagement = lazy(() => import('./pages/admin/CitizenManagement').then((module) => ({ default: module.CitizenManagement })));
const StaffCitizenManagement = lazy(() => import('./pages/staff/CitizenManagement').then((module) => ({ default: module.CitizenManagement })));
const Services = lazy(() => import('./pages/Services').then((module) => ({ default: module.Services })));
const Apply = lazy(() => import('./pages/Apply').then((module) => ({ default: module.Apply })));
const Applications = lazy(() => import('./pages/Applications').then((module) => ({ default: module.Applications })));
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })));
const VerifyDocuments = lazy(() => import('./components/VerifyDocuments').then((module) => ({ default: module.VerifyDocuments })));
const PaymentGateway = lazy(() => import('./components/PaymentGateway').then((module) => ({ default: module.PaymentGateway })));
const StaffManagement = lazy(() => import('./components/StaffManagement').then((module) => ({ default: module.StaffManagement })));
const ApplicationReview = lazy(() => import('./components/ApplicationReview').then((module) => ({ default: module.ApplicationReview })));
const OfficeManagement = lazy(() => import('./pages/admin/OfficeManagement').then((module) => ({ default: module.OfficeManagement })));
const LocationManagement = lazy(() => import('./pages/admin/LocationManagement').then((module) => ({ default: module.LocationManagement })));
const ServiceManagement = lazy(() => import('./pages/admin/ServiceManagement').then((module) => ({ default: module.ServiceManagement })));
const CustomerSupport = lazy(() => import('./pages/staff/CustomerSupport').then((module) => ({ default: module.CustomerSupport })));
const ManualVerification = lazy(() => import('./pages/staff/ManualVerification').then((module) => ({ default: module.ManualVerification })));

type ViewType =
  | 'dashboard' | 'services' | 'apply' | 'applications' | 'profile'
  | 'admin_dashboard' | 'staff_dashboard' | 'admin_logs' | 'citizen_management'
  | 'office_management' | 'location_management' | 'service_management'
  | 'customer_support' | 'manual_verification' | 'staff_management'
  | 'application_review' | 'verify_documents';

export default function App() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const { lang, currency } = useLanguage();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | undefined>(undefined);
  const [payingApplication, setPayingApplication] = useState<Application | null>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authDiaspora, setAuthDiaspora] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showPublicVerify, setShowPublicVerify] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const { applications, drafts, refreshApplications, setApplications } = useApplications(user);
  const previousAuthIdentityRef = useRef<string | null>(null);
  const passwordChangeNoticeRef = useRef(false);

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_SUPABASE_URL')
  );
  const requiresPasswordChange = Boolean(session?.user?.user_metadata?.must_change_password);

  const isUuid = (value?: string | null) =>
    Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

  const getDraftKey = (service: Service) => {
    const slug = (service.name || service.name_en || service.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return user ? `draft_${user.id}_${slug}` : '';
  };

  const removeDraftsForService = (service: Service, explicitDraftId?: string) => {
    if (!user) return;

    const draftKeys = new Set<string>([
      getDraftKey(service),
      explicitDraftId || '',
    ]);

    const serviceName = service.name.toLowerCase();
    if (serviceName.includes('mkazi')) {
      draftKeys.add(`draft_${user.id}_cheti_cha_mkazi`);
      draftKeys.add(`draft_${user.id}_residency_certificate`);
    }
    if (serviceName.includes('utambulisho')) {
      draftKeys.add(`draft_${user.id}_barua_ya_utambulisho`);
    }

    draftKeys.forEach((key) => {
      if (key) localStorage.removeItem(key);
    });
  };

  const resolveDatabaseServiceId = async (service: Service): Promise<string | null> => {
    if (isUuid(service.id)) return service.id;

    const { data: byName } = await supabase
      .from('services')
      .select('id')
      .eq('name', service.name)
      .maybeSingle();

    if (byName?.id && isUuid(byName.id)) return byName.id;

    if (service.name_en) {
      const { data: byEnglishName } = await supabase
        .from('services')
        .select('id')
        .eq('name_en', service.name_en)
        .maybeSingle();

      if (byEnglishName?.id && isUuid(byEnglishName.id)) return byEnglishName.id;
    }

    return null;
  };

  useEffect(() => {
    if (requiresPasswordChange && !passwordChangeNoticeRef.current) {
      passwordChangeNoticeRef.current = true;
      showToast(
        lang === 'sw'
          ? 'Badili nywila ya default kabla ya kuendelea.'
          : 'Change the default password before continuing.',
        'error'
      );
    }

    if (!requiresPasswordChange) {
      passwordChangeNoticeRef.current = false;
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [requiresPasswordChange, lang, showToast]);

  // Role-based redirection
  useEffect(() => {
    if (!user?.role || !user?.id) {
      previousAuthIdentityRef.current = null;
      return;
    }

    const roleViews: Record<string, ViewType> = {
      admin: 'admin_dashboard',
      staff: 'staff_dashboard',
      citizen: 'dashboard',
    };

    const targetView = roleViews[user.role];
    const authIdentity = `${user.id}:${user.role}`;

    if (targetView && previousAuthIdentityRef.current !== authIdentity) {
      previousAuthIdentityRef.current = authIdentity;
      setView(targetView);
    }
  }, [user?.id, user?.role]);

  // ==================== SUBMIT APPLICATION MUTATION ====================

  const submitApplicationMutation = useMutation({
    mutationFn: async ({ service, formData }: { service: Service; formData: any }) => {
      if (!user) throw new Error('User not authenticated');

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const serviceCode = service.name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3) || 'APP';
      const applicationNumber = `TZ-${serviceCode}-${dateStr}-${randomNum}`;

      // Check if we're in demo mode
      const isDemoMode = !isSupabaseConfigured || user.id.startsWith('demo-');

      if (isDemoMode) {
        const newApp: Application = {
          id: `demo-app-${Date.now()}`,
          user_id: user.id,
          service_id: service.id,
          service_name: service.name,
          application_number: applicationNumber,
          form_data: formData,
          status: 'submitted',
          region: user.region,
          district: user.district,
          ward: user.ward,
          street: user.street,
          created_at: now.toISOString(),
        };

        // Save to localStorage for demo
        const existing = JSON.parse(localStorage.getItem('demo_applications') || '[]');
        localStorage.setItem('demo_applications', JSON.stringify([newApp, ...existing]));
        return newApp;
      }

      // Real Supabase submission
      const serviceId = await resolveDatabaseServiceId(service);
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          service_id: serviceId,
          service_name: service.name || service.name_en,
          application_number: applicationNumber,
          form_data: formData,
          status: 'submitted',
          region: user.region || null,
          district: user.district || null,
          ward: user.ward || null,
          street: user.street || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Application;
    },

    onSuccess: (newApplication, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });

      removeDraftsForService(variables.service, selectedDraftId);
      setApplications([
        {
          ...newApplication,
          services: variables.service,
          users: user || undefined,
        },
        ...applications.filter((app) => app.id !== newApplication.id),
      ]);

      showToast(
        lang === 'sw' ? 'Maombi yametumwa kikamilifu!' : 'Application submitted successfully!',
        'success'
      );

      setView('applications');
      setSelectedService(null);
      setSelectedDraftId(undefined);
      refreshApplications();
    },

    onError: (error: any, variables) => {
      console.error('Application submission failed:', error);
      if (user && variables?.service) {
        const draftKey = getDraftKey(variables.service);
        localStorage.setItem(draftKey, JSON.stringify({
          id: draftKey,
          user_id: user.id,
          service_id: variables.service.id,
          service_name: variables.service.name,
          form_data: variables.formData,
          current_step: 'review',
          status: 'failed',
          error_message: error.message || 'Submission failed',
          last_saved: new Date().toISOString(),
        }));
        refreshApplications();
      }
      showToast(
        lang === 'sw' 
          ? `Hitilafu: ${error.message || 'Tafadhali jaribu tena'}` 
          : `Error: ${error.message || 'Please try again'}`,
        'error'
      );
    },
  });

  const handleSubmitApplication = (formData: any) => {
    if (!selectedService) return Promise.resolve();
    return submitApplicationMutation
      .mutateAsync({ service: selectedService, formData })
      .then(() => undefined);
  };

  const handleResumeDraft = (draft: any) => {
    const service = HARDCODED_SERVICES.find((item) =>
      item.id === draft.service_id || item.name === draft.service_name || item.name_en === draft.service_name
    );

    if (!service) {
      showToast(lang === 'sw' ? 'Huduma ya draft haijapatikana.' : 'Draft service was not found.', 'error');
      return;
    }

    setSelectedService(service);
    setSelectedDraftId(draft.id);
    setView('apply');
  };

  const handleViewChange = (nextView: string) => {
    setView(nextView as ViewType);
  };

  // Payment handler
  const handlePaymentSuccess = async (paymentData: any) => {
    if (!payingApplication) return;

    setApplications(applications.map((application) => (
      application.id === payingApplication.id
        ? {
            ...application,
            status: 'paid',
            payment_data: paymentData,
            paid_at: paymentData.paid_at,
          }
        : application
    )));
    setPayingApplication(null);
    showToast(
      lang === 'sw' ? 'Malipo yamepokelewa!' : 'Payment received successfully!',
      'success'
    );

    // Refresh applications list
    queryClient.invalidateQueries({ queryKey: ['applications'] });
  };

  const getPaymentAmount = (app: Application): number => {
    const serviceFee = (app as any).services?.fee;
    if (typeof serviceFee === 'number' && serviceFee > 0) {
      return serviceFee;
    }

    const matchedService = HARDCODED_SERVICES.find((service) =>
      service.id === app.service_id ||
      service.name === app.service_name ||
      service.name_en === app.service_name
    );

    if (typeof matchedService?.fee === 'number' && matchedService.fee > 0) {
      return matchedService.fee;
    }

    return app.form_data?.service_fee ?? app.form_data?.payment_data?.amount ?? 0;
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 8) {
      showToast(
        lang === 'sw'
          ? 'Nywila mpya lazima iwe na angalau herufi 8.'
          : 'New password must be at least 8 characters long.',
        'error'
      );
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast(
        lang === 'sw' ? 'Nywila mpya hazifanani.' : 'New passwords do not match.',
        'error'
      );
      return;
    }

    setChangingPassword(true);

    try {
      const currentMetadata = session?.user?.user_metadata ?? {};
      const nextMetadata = {
        ...currentMetadata,
        must_change_password: false,
      };

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: nextMetadata,
      });

      if (error) throw error;

      showToast(
        lang === 'sw' ? 'Nywila imebadilishwa kikamilifu.' : 'Password updated successfully.',
        'success'
      );
    } catch (error: any) {
      showToast(error.message || (lang === 'sw' ? 'Imeshindwa kubadili nywila.' : 'Failed to update password.'), 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const loadingFallback = (
    <div className="h-96 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 font-bold">E-MTAA PORTAL</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showPublicVerify) {
      return (
        <Suspense fallback={loadingFallback}>
          <VerifyDocuments lang={lang} onBack={() => setShowPublicVerify(false)} userRole="citizen" />
        </Suspense>
      );
    }

    return (
      <>
        <Landing 
          onShowAuth={(mode, isDiaspora) => {
            setAuthMode(mode);
            setAuthDiaspora(!!isDiaspora);
            setShowAuth(true);
          }} 
          onShowVerify={() => setShowPublicVerify(true)} 
        />

        <AnimatePresence>
          {showAuth && (
            <Auth 
              mode={authMode} 
              onClose={() => { setShowAuth(false); setAuthDiaspora(false); }} 
              setMode={setAuthMode}
              isDiaspora={authDiaspora}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 text-amber-800 text-sm">
          <AlertCircle size={18} />
          <p>
            {lang === 'sw' 
              ? 'Supabase haijasanidiwa. Tafadhali weka .env variables' 
              : 'Supabase is not configured. Please check your .env file'}
          </p>
        </div>
      )}

      <Header onMenuClick={() => setIsMobileNavOpen(true)} />

      <MobileNav 
        isOpen={isMobileNavOpen} 
        onClose={() => setIsMobileNavOpen(false)} 
        currentView={view}
        setView={handleViewChange}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={view} setView={handleViewChange} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          <Suspense fallback={loadingFallback}>
            <AnimatePresence mode="wait">
              {view === 'dashboard' && <Dashboard applications={applications} setView={handleViewChange} onRefresh={refreshApplications} />}
              {view === 'admin_dashboard' && user.role === 'admin' && <AdminDashboard setView={handleViewChange} />}
              {view === 'staff_dashboard' && user.role === 'staff' && <StaffDashboard setView={handleViewChange} />}
              {view === 'admin_logs' && user.role === 'admin' && <AdminLogs />}
              {view === 'citizen_management' && (
                user.role === 'admin' ? <CitizenManagement /> : 
                user.role === 'staff' ? <StaffCitizenManagement /> : null
              )}

              {view === 'services' && (
                <Services onSelectService={(service) => {
                  setSelectedService(service);
                  setSelectedDraftId(undefined);
                  setView('apply');
                }} />
              )}

              {view === 'apply' && selectedService && (
                <Apply 
                  selectedService={selectedService} 
                  onBack={() => setView('services')} 
                  onSubmit={handleSubmitApplication}
                  draftId={selectedDraftId}
                />
              )}

              {view === 'applications' && (
                <Applications
                  applications={applications}
                  drafts={drafts}
                  onPay={setPayingApplication}
                  onRefresh={refreshApplications}
                  onResumeDraft={handleResumeDraft}
                />
              )}
              {view === 'profile' && <Profile />}
              {view === 'verify_documents' && (
                <VerifyDocuments 
                  lang={lang} 
                  onBack={() => setView('dashboard')} 
                  userRole={user.role || 'citizen'} 
                />
              )}

              {/* Admin/Staff protected views */}
              {view === 'office_management' && user.role === 'admin' && <OfficeManagement />}
              {view === 'location_management' && user.role === 'admin' && <LocationManagement />}
              {view === 'service_management' && user.role === 'admin' && <ServiceManagement />}
              {view === 'staff_management' && user.role === 'admin' && <StaffManagement lang={lang} />}
              {view === 'application_review' && user.role !== 'citizen' && <ApplicationReview lang={lang} user={user} />}
              {view === 'customer_support' && user.role === 'staff' && <CustomerSupport />}
              {view === 'manual_verification' && user.role === 'staff' && <ManualVerification />}
            </AnimatePresence>
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <BottomTabBar currentView={view} setView={handleViewChange} />

      {/* Payment Modal */}
      <AnimatePresence>
        {payingApplication && (
          <Suspense fallback={null}>
            <PaymentGateway 
              applicationId={payingApplication.id}
              applicationNumber={payingApplication.application_number}
              amount={getPaymentAmount(payingApplication)}
              defaultPhone={user.phone}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setPayingApplication(null)}
              lang={lang}
              currency={currency}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {requiresPasswordChange && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-120 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">
                    {lang === 'sw' ? 'Badili Nywila' : 'Change Password'}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {lang === 'sw'
                      ? 'Umetumia nywila ya default. Tafadhali weka nywila mpya kabla ya kuendelea.'
                      : 'You signed in with the default password. Set a new password before continuing.'}
                  </p>
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {lang === 'sw'
                  ? 'Nywila ya default ni Staff@1234, na inaruhusiwa mara moja tu.'
                  : 'The default password is Staff@1234 and can only be used once.'}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500">
                    {lang === 'sw' ? 'Nywila Mpya' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-stone-200 px-4 outline-none focus:border-emerald-500"
                    placeholder={lang === 'sw' ? 'Weka nywila mpya' : 'Enter a new password'}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-stone-500">
                    {lang === 'sw' ? 'Thibitisha Nywila' : 'Confirm Password'}
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-stone-200 px-4 outline-none focus:border-emerald-500"
                    placeholder={lang === 'sw' ? 'Rudia nywila mpya' : 'Confirm the new password'}
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={signOut}
                  className="flex-1 rounded-2xl bg-stone-100 py-3 font-semibold text-stone-700 hover:bg-stone-200"
                >
                  {lang === 'sw' ? 'Toka' : 'Sign Out'}
                </button>
                <button
                  type="button"
                  onClick={handlePasswordUpdate}
                  disabled={changingPassword}
                  className="flex-1 rounded-2xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
                >
                  {changingPassword ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      {lang === 'sw' ? 'Inahifadhi...' : 'Saving...'}
                    </span>
                  ) : (
                    lang === 'sw' ? 'Hifadhi Nywila' : 'Save Password'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
