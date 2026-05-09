import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Smartphone, Building2, CheckCircle2, AlertCircle, ArrowRight, X, Loader2, ChevronRight, ShieldCheck, Copy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language, useTranslation } from '@/lib/i18n';
import { formatCurrency, CurrencyCode } from '@/lib/currency';
import { supabase } from '@/lib/supabase';

interface PaymentGatewayProps {
  amount: number;
  applicationId: string;
  applicationNumber?: string;
  defaultPhone?: string;
  onSuccess: (paymentData: any) => void;
  onCancel: () => void;
  lang: Language;
  currency: CurrencyCode;
}

type PaymentMethod = 'mobile' | 'bank' | 'card';
type MobileProvider = 'mpesa' | 'tigopesa' | 'airtelmoney';
type BankProvider = 'nmb' | 'crdb';
type PaymentStep = 'choose' | 'push_setup' | 'awaiting_push' | 'reference' | 'processing' | 'success';

interface PaymentSession {
  reference: string;
  amount: number;
  status: 'pending' | 'completed';
  createdAt: string;
}

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  amount,
  applicationId,
  applicationNumber,
  defaultPhone,
  onSuccess,
  onCancel,
  lang,
  currency,
}) => {
  const t = useTranslation(lang);
  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('YOUR_SUPABASE_URL')
  );

  const [step, setStep] = useState<PaymentStep>('choose');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [mobileProvider, setMobileProvider] = useState<MobileProvider | null>(null);
  const [bankProvider, setBankProvider] = useState<BankProvider | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [manualTransactionId, setManualTransactionId] = useState('');
  const [loadingReference, setLoadingReference] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pushRequestedAt, setPushRequestedAt] = useState<string | null>(null);

  const methodLabel = useMemo(() => {
    if (method === 'mobile') {
      const providerNames: Record<MobileProvider, string> = {
        mpesa: 'M-Pesa',
        tigopesa: 'Tigo Pesa',
        airtelmoney: 'Airtel Money',
      };

      return mobileProvider ? providerNames[mobileProvider] : (lang === 'sw' ? 'Mtandao wa Simu' : 'Mobile Money');
    }

    if (method === 'bank') {
      return bankProvider ? bankProvider.toUpperCase() : (lang === 'sw' ? 'Benki' : 'Bank');
    }

    if (method === 'card') {
      return lang === 'sw' ? 'Kadi' : 'Card';
    }

    return '';
  }, [bankProvider, lang, method, mobileProvider]);

  const normalizePhoneNumber = useCallback((value: string) => value.replace(/\D/g, ''), []);

  const generateReference = useCallback(() => {
    const source = (applicationNumber || applicationId).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return `GEPG-${source.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
  }, [applicationId, applicationNumber]);

  const persistLocalSession = useCallback((session: PaymentSession) => {
    localStorage.setItem(`payment_session_${applicationId}`, JSON.stringify(session));
  }, [applicationId]);

  const loadOrCreateReference = useCallback(async () => {
    if (paymentSession || loadingReference) return;

    setLoadingReference(true);
    setErrorMessage(null);

    try {
      if (!isSupabaseConfigured) {
        const localSession = localStorage.getItem(`payment_session_${applicationId}`);
        if (localSession) {
          const parsedSession = JSON.parse(localSession) as PaymentSession;
          setPaymentSession(parsedSession);
          return;
        }

        const nextSession: PaymentSession = {
          reference: generateReference(),
          amount,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        persistLocalSession(nextSession);
        setPaymentSession(nextSession);
        return;
      }

      const { data: application, error: applicationError } = await supabase
        .from('applications')
        .select('payment_data')
        .eq('id', applicationId)
        .single();

      if (applicationError) throw applicationError;

      const currentPaymentData = application?.payment_data as Record<string, any> | null;
      const existingReference = currentPaymentData?.payment_reference;

      if (existingReference) {
        setPaymentSession({
          reference: existingReference,
          amount: Number(currentPaymentData?.amount ?? amount),
          status: currentPaymentData?.payment_status === 'completed' ? 'completed' : 'pending',
          createdAt: currentPaymentData?.initiated_at || currentPaymentData?.paid_at || new Date().toISOString(),
        });
        return;
      }

      const nextSession: PaymentSession = {
        reference: generateReference(),
        amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const nextPaymentData = {
        ...(currentPaymentData || {}),
        amount,
        payment_reference: nextSession.reference,
        payment_status: 'pending',
        initiated_at: nextSession.createdAt,
      };

      const { error: updateError } = await supabase
        .from('applications')
        .update({ payment_data: nextPaymentData })
        .eq('id', applicationId);

      if (updateError) throw updateError;
      setPaymentSession(nextSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : (lang === 'sw' ? 'Imeshindwa kutengeneza kumbukumbu ya malipo.' : 'Failed to generate payment reference.');
      setErrorMessage(message);
    } finally {
      setLoadingReference(false);
    }
  }, [amount, applicationId, generateReference, isSupabaseConfigured, lang, loadingReference, paymentSession, persistLocalSession]);

  useEffect(() => {
    if (step === 'push_setup' || step === 'awaiting_push' || step === 'reference') {
      void loadOrCreateReference();
    }
  }, [loadOrCreateReference, step]);

  const finalizePayment = useCallback(async (transactionId: string, channel: 'push' | 'reference') => {
    if (!method || !paymentSession) return;

    const paidAt = new Date().toISOString();
    const paymentMethod = method === 'mobile'
      ? `${mobileProvider || 'mobile'}_${channel}`
      : method === 'bank'
        ? `${bankProvider || 'bank'}_${channel}`
        : `card_${channel}`;

    const completedPayment = {
      application_id: applicationId,
      amount,
      payment_method: paymentMethod,
      provider: method === 'mobile' ? mobileProvider : method === 'bank' ? bankProvider : 'card',
      phone_number: method === 'mobile' ? normalizePhoneNumber(phoneNumber) : undefined,
      payment_reference: paymentSession.reference,
      transaction_id: transactionId,
      paid_at: paidAt,
      status: 'completed',
      payment_channel: channel,
    };

    if (!isSupabaseConfigured) {
      const demoPayments = JSON.parse(localStorage.getItem('demo_payments') || '[]');
      localStorage.setItem('demo_payments', JSON.stringify([{ ...completedPayment, receipt_number: paymentSession.reference }, ...demoPayments]));

      const demoApplications = JSON.parse(localStorage.getItem('demo_applications') || '[]');
      const nextApplications = demoApplications.map((application: any) => (
        application.id === applicationId
          ? { ...application, status: 'paid', payment_data: completedPayment, paid_at: paidAt }
          : application
      ));
      localStorage.setItem('demo_applications', JSON.stringify(nextApplications));
      localStorage.removeItem(`payment_session_${applicationId}`);
      setPaymentResult(completedPayment);
      setPaymentSession((currentSession) => currentSession ? { ...currentSession, status: 'completed' } : currentSession);
      setStep('success');
      onSuccess(completedPayment);
      return;
    }

    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert({
        application_id: applicationId,
        amount,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        receipt_number: paymentSession.reference,
        status: 'completed',
        breakdown: {
          provider: method === 'mobile' ? mobileProvider : method === 'bank' ? bankProvider : 'card',
          phone_number: method === 'mobile' ? normalizePhoneNumber(phoneNumber) : null,
          account_number: method === 'bank' ? accountNumber : null,
          card_last_four: method === 'card' ? cardDetails.number.slice(-4) : null,
          payment_channel: channel,
          push_requested_at: pushRequestedAt,
          application_number: applicationNumber,
        },
      });

    if (paymentInsertError) throw paymentInsertError;

    const { error: applicationUpdateError } = await supabase
      .from('applications')
      .update({
        status: 'paid',
        payment_data: completedPayment,
        updated_at: paidAt,
      })
      .eq('id', applicationId);

    if (applicationUpdateError) throw applicationUpdateError;

    setPaymentResult(completedPayment);
    setPaymentSession((currentSession) => currentSession ? { ...currentSession, status: 'completed' } : currentSession);
    setStep('success');
    onSuccess(completedPayment);
  }, [accountNumber, amount, applicationId, applicationNumber, bankProvider, cardDetails.number, isSupabaseConfigured, method, mobileProvider, normalizePhoneNumber, onSuccess, paymentSession, phoneNumber, pushRequestedAt]);

  const pollForPayment = useCallback(async () => {
    if (!paymentSession || !isSupabaseConfigured) return;

    setPollingStatus(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('transaction_id, payment_method, receipt_number, status, created_at')
        .eq('application_id', applicationId)
        .eq('receipt_number', paymentSession.reference)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.transaction_id) {
        await finalizePayment(data.transaction_id, 'push');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : (lang === 'sw' ? 'Imeshindwa kuangalia hali ya malipo.' : 'Failed to check payment status.');
      setErrorMessage(message);
    } finally {
      setPollingStatus(false);
    }
  }, [applicationId, finalizePayment, isSupabaseConfigured, lang, paymentSession]);

  const requestPushPayment = useCallback(async () => {
    if (!paymentSession || method !== 'mobile') return;
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!mobileProvider || normalizedPhone.length < 10) {
      setErrorMessage(lang === 'sw' ? 'Chagua mtandao na andika namba sahihi ya simu.' : 'Choose an operator and enter a valid phone number.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const requestedAt = new Date().toISOString();
      setPushRequestedAt(requestedAt);

      if (!isSupabaseConfigured) {
        const localSession = {
          ...paymentSession,
          provider: mobileProvider,
          phone_number: normalizedPhone,
          push_requested_at: requestedAt,
        };
        localStorage.setItem(`payment_session_${applicationId}`, JSON.stringify(localSession));
      } else {
        const { data: application, error: applicationError } = await supabase
          .from('applications')
          .select('payment_data')
          .eq('id', applicationId)
          .single();

        if (applicationError) throw applicationError;

        const nextPaymentData = {
          ...((application?.payment_data as Record<string, any>) || {}),
          amount,
          payment_reference: paymentSession.reference,
          payment_status: 'pending_confirmation',
          payment_method: `${mobileProvider}_push`,
          provider: mobileProvider,
          phone_number: normalizedPhone,
          initiated_at: paymentSession.createdAt,
          push_requested_at: requestedAt,
        };

        const { error: updateError } = await supabase
          .from('applications')
          .update({ payment_data: nextPaymentData, updated_at: requestedAt })
          .eq('id', applicationId);

        if (updateError) throw updateError;
      }

      setStep('awaiting_push');
    } catch (error) {
      const message = error instanceof Error ? error.message : (lang === 'sw' ? 'Imeshindwa kutuma ombi la malipo.' : 'Failed to send payment request.');
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }, [amount, applicationId, isSupabaseConfigured, lang, method, mobileProvider, normalizePhoneNumber, paymentSession, phoneNumber]);

  const confirmPushPayment = useCallback(async () => {
    if (!paymentSession) return;

    setSubmitting(true);
    setErrorMessage(null);
    setStep('processing');

    try {
      await finalizePayment(`MOB-${Date.now().toString().slice(-8)}`, 'push');
    } catch (error) {
      const message = error instanceof Error ? error.message : (lang === 'sw' ? 'Imeshindwa kukamilisha malipo ya push.' : 'Failed to finalize push payment.');
      setErrorMessage(message);
      setStep('awaiting_push');
    } finally {
      setSubmitting(false);
    }
  }, [finalizePayment, lang, paymentSession]);

  const submitReferencePayment = useCallback(async () => {
    if (!paymentSession || !manualTransactionId.trim()) return;

    setSubmitting(true);
    setErrorMessage(null);
    setStep('processing');

    try {
      await finalizePayment(manualTransactionId.trim().toUpperCase(), 'reference');
    } catch (error) {
      const message = error instanceof Error ? error.message : (lang === 'sw' ? 'Imeshindwa kuthibitisha malipo ya reference.' : 'Failed to confirm reference payment.');
      setErrorMessage(message);
      setStep('reference');
    } finally {
      setSubmitting(false);
    }
  }, [finalizePayment, lang, manualTransactionId, paymentSession]);

  const copyReference = useCallback(async () => {
    if (!paymentSession?.reference) return;

    try {
      await navigator.clipboard.writeText(paymentSession.reference);
    } catch {
      setErrorMessage(lang === 'sw' ? 'Nakili reference mwenyewe kama copy haikufanya kazi.' : 'Copy failed. Please copy the reference manually.');
    }
  }, [lang, paymentSession?.reference]);

  const isDetailsValid = useCallback(() => {
    if (method === 'mobile') return !!mobileProvider && normalizePhoneNumber(phoneNumber).length >= 10;
    if (method === 'bank') return !!bankProvider && accountNumber.length >= 8;
    if (method === 'card') return Boolean(cardDetails.number && cardDetails.expiry && cardDetails.cvv && cardDetails.name);
    return false;
  }, [method, mobileProvider, normalizePhoneNumber, phoneNumber, bankProvider, accountNumber, cardDetails]);

  const manualIntro = lang === 'sw'
    ? 'Ukilipa nje ya mfumo kwa kutumia reference hii, weka namba ya muamala baada ya sekunde 30 hadi dakika 5 au bonyeza angalia tena kama mfumo umeipokea.'
    : 'If you pay outside the system with this reference, enter the transaction number after 30 seconds to 5 minutes or check again if the system has already received it.';

  const pushIntro = lang === 'sw'
    ? 'Ukibonyeza lipa sasa, mfumo utatuma ombi la malipo kwenye simu yako. Ukishaidhinisha kwenye flash SMS/STK prompt, bonyeza nimethibitisha au acha mfumo uangalie tena.'
    : 'When you tap pay now, the system sends a payment request to your phone. After you approve the flash SMS/STK prompt, confirm it here or let the system check again.';

  // ── helpers ─────────────────────────────────────────────────────────────────
  const providerLabel = (p: MobileProvider | null) =>
    p === 'mpesa' ? 'M-Pesa' : p === 'tigopesa' ? 'Tigo Pesa' : p === 'airtelmoney' ? 'Airtel Money' : '';

  const isPushValid = !!mobileProvider && normalizePhoneNumber(phoneNumber).length >= 10;

  return (
    <div className="fixed inset-0 z-9999 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[95vh] sm:max-h-[90vh]"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-6 py-5">
          <div>
            <h3 className="text-lg font-extrabold text-stone-900">
              {lang === 'sw' ? 'Malipo ya Huduma' : 'Service Payment'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {lang === 'sw' ? 'Kiasi' : 'Amount'}: <span className="font-black text-primary">{formatCurrency(amount, currency)}</span>
            </p>
          </div>
          {(step === 'push_setup' || step === 'reference') && (
            <button
              onClick={() => { setStep('choose'); setErrorMessage(null); }}
              className="mr-2 text-sm font-bold text-primary hover:underline"
            >
              ← {lang === 'sw' ? 'Rudi' : 'Back'}
            </button>
          )}
          <button
            onClick={onCancel}
            className="rounded-full p-2 transition hover:bg-stone-200"
            aria-label={lang === 'sw' ? 'Funga' : 'Close'}
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════════════════════════
                STEP 1 — Choose path: Lipa Sasa  vs  Lipa kwa Reference
                ═══════════════════════════════════════════════════════════ */}
            {step === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <p className="text-sm font-medium text-stone-500 text-center">
                  {lang === 'sw' ? 'Chagua jinsi unavyotaka kulipa' : 'Choose how you want to pay'}
                </p>

                {/* Option 1 — Lipa Sasa */}
                <button
                  onClick={() => { setMethod('mobile'); setStep('push_setup'); setErrorMessage(null); }}
                  className="w-full flex items-center gap-4 rounded-2xl p-5 text-left shadow-lg transition hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: '#1a6b38' }}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                    <Smartphone className="h-7 w-7" style={{ color: '#ffffff' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-black tracking-tight" style={{ color: '#ffffff' }}>
                      {lang === 'sw' ? 'Lipa Sasa' : 'Pay Now'}
                    </p>
                    <p className="mt-0.5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {lang === 'sw'
                        ? 'Tuma ombi moja kwa moja kwenye simu yako (M-Pesa, Tigo, Airtel)'
                        : 'Push request directly to your phone (M-Pesa, Tigo, Airtel)'}
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6 shrink-0" style={{ color: 'rgba(255,255,255,0.8)' }} />
                </button>

                {/* Option 2 — Lipa kwa Reference */}
                <button
                  onClick={() => { setMethod('mobile'); setStep('reference'); setErrorMessage(null); }}
                  className="w-full flex items-center gap-4 rounded-2xl border-2 border-stone-200 bg-white p-5 text-left text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 active:scale-[0.98]"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                    <Copy className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-black tracking-tight text-stone-900">
                      {lang === 'sw' ? '🔢 Lipa kwa Reference' : '🔢 Pay by Reference'}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-stone-500">
                      {lang === 'sw'
                        ? 'Pata namba ya reference, lipa nje, thibitisha hapa'
                        : 'Get a reference number, pay externally, confirm here'}
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6 shrink-0 text-stone-300" />
                </button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STEP 2a — Lipa Sasa: pick provider + phone
                ═══════════════════════════════════════════════════════════ */}
            {step === 'push_setup' && (
              <motion.div key="push_setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {/* Reference pill */}
                <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{lang === 'sw' ? 'Reference' : 'Reference'}</p>
                    {loadingReference ? (
                      <span className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                        <Loader2 className="h-3 w-3 animate-spin" /> {lang === 'sw' ? 'Inaunda...' : 'Generating...'}
                      </span>
                    ) : (
                      <p className="mt-0.5 text-sm font-black text-stone-900">{paymentSession?.reference || '—'}</p>
                    )}
                  </div>
                </div>

                {/* Provider buttons */}
                <div>
                  <p className="mb-2 text-sm font-bold text-stone-700">{lang === 'sw' ? 'Chagua mtandao wako' : 'Select your network'}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { id: 'mpesa', name: 'M-Pesa', bar: 'bg-red-500' },
                      { id: 'tigopesa', name: 'Tigo Pesa', bar: 'bg-blue-600' },
                      { id: 'airtelmoney', name: 'Airtel Money', bar: 'bg-red-600' },
                    ] as { id: MobileProvider; name: string; bar: string }[]).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setMobileProvider(p.id)}
                        className={cn(
                          'rounded-xl border-2 p-3 text-center transition-all',
                          mobileProvider === p.id
                            ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                            : 'border-stone-100 hover:border-stone-200'
                        )}
                      >
                        <div className={cn('h-2 w-full rounded-full mb-2', p.bar)} />
                        <span className="text-xs font-bold">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1 block text-sm font-bold text-stone-700">
                    {lang === 'sw' ? 'Namba ya Simu' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    placeholder="07XX XXX XXX"
                    className="h-14 w-full rounded-2xl border border-stone-200 px-5 text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                {/* Info */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  {lang === 'sw'
                    ? 'Ukibonyeza "Tuma Ombi", utapata ujumbe wa kuthibitisha malipo kwenye simu yako.'
                    : 'Tapping "Send Request" will send a payment prompt to your phone to approve.'}
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STEP 2b — Awaiting push confirmation
                ═══════════════════════════════════════════════════════════ */}
            {step === 'awaiting_push' && (
              <motion.div key="awaiting_push" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-emerald-950">
                        {lang === 'sw' ? 'Ombi limetumwa kwenye simu yako!' : 'Request sent to your phone!'}
                      </h4>
                      <p className="mt-1 text-sm text-emerald-900">
                        {lang === 'sw'
                          ? `Thibitisha ujumbe wa malipo kwenye ${providerLabel(mobileProvider)} (${phoneNumber}), kisha bonyeza "Nimethibitisha" hapa chini.`
                          : `Approve the payment prompt on ${providerLabel(mobileProvider)} (${phoneNumber}), then tap "I Approved" below.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">{lang === 'sw' ? 'Reference' : 'Reference'}</p>
                  <p className="mt-1 break-all text-base font-black text-stone-900">{paymentSession?.reference}</p>
                </div>

                <button
                  type="button"
                  onClick={() => { setStep('reference'); setErrorMessage(null); }}
                  className="w-full rounded-2xl border border-dashed border-stone-300 px-4 py-3 text-sm font-semibold text-stone-600 transition hover:bg-stone-50"
                >
                  {lang === 'sw' ? 'Lipa kwa reference badala yake' : 'Use reference payment instead'}
                </button>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                STEP 2b — Lipa kwa Reference: copy ref + enter tx ID
                ═══════════════════════════════════════════════════════════ */}
            {step === 'reference' && (
              <motion.div key="reference" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                {/* Reference display */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                    {lang === 'sw' ? 'Reference ya Malipo' : 'Payment Reference'}
                  </p>
                  {loadingReference ? (
                    <span className="mt-3 flex items-center gap-2 text-sm text-stone-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> {lang === 'sw' ? 'Inaunda reference...' : 'Generating reference...'}
                    </span>
                  ) : (
                    <>
                      <p className="mt-2 break-all text-2xl font-black tracking-wider text-stone-900">
                        {paymentSession?.reference || '—'}
                      </p>
                      <button
                        type="button"
                        onClick={copyReference}
                        disabled={!paymentSession?.reference}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
                      >
                        <Copy className="h-4 w-4" />
                        {lang === 'sw' ? 'Nakili Reference' : 'Copy Reference'}
                      </button>
                    </>
                  )}
                </div>

                {/* Instructions */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  {lang === 'sw'
                    ? 'Lipa kwa kutumia reference hii kupitia M-Pesa, benki, au njia nyingine. Baada ya kulipa, andika namba ya muamala hapa chini.'
                    : 'Pay using this reference via M-Pesa, your bank, or any other method. After paying, enter the transaction ID below.'}
                </div>

                {/* Transaction ID input */}
                <div>
                  <label className="mb-1 block text-sm font-bold text-stone-700">
                    {lang === 'sw' ? 'Namba ya Muamala (Transaction ID)' : 'Transaction ID'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'sw' ? 'Mfano: MP240508XYZ123' : 'e.g. MP240508XYZ123'}
                    className="h-14 w-full rounded-2xl border border-stone-200 px-5 text-base font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    value={manualTransactionId}
                    onChange={(e) => setManualTransactionId(e.target.value.toUpperCase())}
                  />
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Processing */}
            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Loader2 className="h-10 w-10 animate-spin" />
                </div>
                <h4 className="text-xl font-black text-stone-900">{lang === 'sw' ? 'Inakamilisha malipo...' : 'Finalizing payment...'}</h4>
                <p className="mt-2 text-sm text-stone-500">{lang === 'sw' ? 'Tafadhali subiri.' : 'Please wait.'}</p>
              </motion.div>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-6 py-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div className="text-center">
                  <h4 className="text-2xl font-black text-stone-900">{lang === 'sw' ? 'Malipo yamekamilika!' : 'Payment Successful!'}</h4>
                  <p className="mt-2 text-sm text-stone-500">
                    {lang === 'sw' ? 'Malipo yamehifadhiwa. Unaweza kuendelea.' : 'Payment recorded. You may continue.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Reference</p>
                    <p className="mt-1 break-all text-sm font-black text-stone-900">{paymentResult?.payment_reference}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-400">
                      {lang === 'sw' ? 'Muamala' : 'Transaction'}
                    </p>
                    <p className="mt-1 break-all text-sm font-black text-stone-900">{paymentResult?.transaction_id}</p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  className="h-16 w-full rounded-2xl text-lg font-bold text-white transition"
                  style={{ backgroundColor: '#1a6b38' }}
                >
                  {lang === 'sw' ? 'Funga' : 'Close'}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Permanent Action Footer ──────────────────────────────────── */}
        {step === 'push_setup' && (
          <div className="shrink-0 border-t border-stone-200 bg-white px-5 pb-5 pt-4 sm:px-8">
            <button
              disabled={!isPushValid || !paymentSession || submitting}
              onClick={requestPushPayment}
              className="h-16 w-full rounded-2xl text-base font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: '#1a6b38' }}
            >
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {lang === 'sw' ? 'Inatuma Ombi...' : 'Sending Request...'}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  {lang === 'sw' ? 'Tuma Ombi la Malipo' : 'Send Payment Request'}
                </span>
              )}
            </button>
          </div>
        )}

        {step === 'awaiting_push' && (
          <div className="shrink-0 border-t border-stone-200 bg-white px-5 pb-5 pt-4 sm:px-8">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={confirmPushPayment}
                disabled={submitting}
                className="h-16 rounded-2xl text-base font-bold text-white transition disabled:opacity-40"
                style={{ backgroundColor: '#1a6b38' }}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {lang === 'sw' ? 'Inamaliza...' : 'Finishing...'}
                  </span>
                ) : (
                  lang === 'sw' ? '✓ Nimethibitisha' : '✓ I Approved'
                )}
              </button>
              <button
                onClick={() => void pollForPayment()}
                disabled={pollingStatus}
                className="h-16 rounded-2xl border-2 border-stone-300 bg-white text-base font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
              >
                {pollingStatus ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {lang === 'sw' ? 'Inaangalia...' : 'Checking...'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <RefreshCw className="h-5 w-5" />
                    {lang === 'sw' ? 'Angalia Tena' : 'Check Again'}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'reference' && (
          <div className="shrink-0 border-t border-stone-200 bg-white px-5 pb-5 pt-4 sm:px-8">
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={!manualTransactionId.trim() || submitting}
                onClick={submitReferencePayment}
                className="h-16 rounded-2xl text-base font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: '#1a6b38' }}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {lang === 'sw' ? 'Inatuma...' : 'Submitting...'}
                  </span>
                ) : (
                  lang === 'sw' ? 'Wasilisha Malipo' : 'Submit Payment'
                )}
              </button>
              <button
                onClick={() => void pollForPayment()}
                disabled={pollingStatus || !paymentSession}
                className="h-16 rounded-2xl border-2 border-stone-300 bg-white text-base font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
              >
                {pollingStatus ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {lang === 'sw' ? 'Inaangalia...' : 'Checking...'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <RefreshCw className="h-5 w-5" />
                    {lang === 'sw' ? 'Angalia Tena' : 'Check Again'}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="shrink-0 flex items-center justify-center gap-2 border-t border-stone-100 bg-stone-50 px-8 py-3 text-xs font-bold uppercase tracking-widest text-stone-400">
          <ShieldCheck className="h-3 w-3" /> Secured by GePG (Government Payment Gateway)
        </div>
      </motion.div>
    </div>
  );
};
