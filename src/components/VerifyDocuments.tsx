import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, QrCode, Search, ShieldAlert } from 'lucide-react';
import { Language, useTranslation } from '@/lib/i18n';
import { supabase, UserRole } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface DocumentType {
  id: string;
  label: string;
  description: string;
}

interface VerificationRecord {
  documentType: string;
  verificationCode: string;
  applicantName: string;
  serviceName: string;
  status: string;
  issuedAt?: string;
  region?: string;
  district?: string;
  phone?: string;
  nidaNumber?: string;
}

interface VerifyDocumentsProps {
  lang: Language;
  onBack: () => void;
  userRole?: UserRole;
}

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'application',
    label: 'E-MTAA Application',
    description: 'Verify an application number issued by the portal.',
  },
  {
    id: 'ct_id',
    label: 'Citizen ID',
    description: 'Verify a citizen identification record number.',
  },
  {
    id: 'nida',
    label: 'NIDA',
    description: 'Verify a NIDA number saved on the platform.',
  },
];

const PUBLIC_DOCUMENT_TYPES = DOCUMENT_TYPES.filter((document) =>
  document.id === 'application' || document.id === 'ct_id'
);

const maskValue = (value?: string, keepStart = 3, keepEnd = 2) => {
  if (!value) return 'Haijapatikana';
  if (value.length <= keepStart + keepEnd) return value;
  return `${value.slice(0, keepStart)}${'*'.repeat(Math.max(2, value.length - keepStart - keepEnd))}${value.slice(-keepEnd)}`;
};

export function VerifyDocuments({ lang, onBack, userRole = 'citizen' }: VerifyDocumentsProps) {
  const t = useTranslation(lang);
  const [selectedDocType, setSelectedDocType] = useState('application');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verified' | 'invalid'>('idle');
  const [verifiedDocument, setVerifiedDocument] = useState<VerificationRecord | null>(null);

  const hasFullAccess = userRole === 'admin' || userRole === 'staff';
  const availableDocTypes = hasFullAccess ? DOCUMENT_TYPES : PUBLIC_DOCUMENT_TYPES;

  const selectedDocument = useMemo(
    () => availableDocTypes.find((document) => document.id === selectedDocType) ?? availableDocTypes[0],
    [availableDocTypes, selectedDocType]
  );

  const verifyApplication = useCallback(async (value: string) => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        application_number,
        status,
        created_at,
        region,
        district,
        users:user_id (first_name, last_name, phone, nida_number),
        services (name)
      `)
      .ilike('application_number', value)
      .maybeSingle();

    if (error || !data) return null;

    const relatedUser = Array.isArray(data.users) ? data.users[0] : data.users;
    const relatedService = Array.isArray(data.services) ? data.services[0] : data.services;

    return {
      documentType: selectedDocument.label,
      verificationCode: data.application_number,
      applicantName: `${relatedUser?.first_name || ''} ${relatedUser?.last_name || ''}`.trim() || 'Unknown',
      serviceName: relatedService?.name || 'Unknown service',
      status: data.status,
      issuedAt: data.created_at,
      region: data.region || undefined,
      district: data.district || undefined,
      phone: relatedUser?.phone || undefined,
      nidaNumber: relatedUser?.nida_number || undefined,
    } satisfies VerificationRecord;
  }, [selectedDocument.label]);

  const verifyIdentityNumber = useCallback(async (value: string) => {
    const column = selectedDocType === 'nida' ? 'nida_number' : 'citizen_id';
    const { data, error } = await supabase
      .from('users')
      .select('first_name, last_name, phone, nida_number, region, district, created_at')
      .eq(column, value)
      .maybeSingle();

    if (error || !data) return null;

    return {
      documentType: selectedDocument.label,
      verificationCode: value,
      applicantName: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown',
      serviceName: selectedDocType === 'nida' ? 'National ID Verification' : 'Citizen ID Verification',
      status: 'verified',
      issuedAt: data.created_at,
      region: data.region || undefined,
      district: data.district || undefined,
      phone: data.phone || undefined,
      nidaNumber: data.nida_number || undefined,
    } satisfies VerificationRecord;
  }, [selectedDocType, selectedDocument.label]);

  const handleVerify = useCallback(async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setLoading(true);
    setVerificationStatus('idle');
    setVerifiedDocument(null);

    try {
      const result = selectedDocType === 'application'
        ? await verifyApplication(trimmedQuery)
        : await verifyIdentityNumber(trimmedQuery);

      if (!result) {
        setVerificationStatus('invalid');
        return;
      }

      setVerifiedDocument(result);
      setVerificationStatus('verified');
    } catch {
      setVerificationStatus('invalid');
    } finally {
      setLoading(false);
    }
  }, [query, selectedDocType, verifyApplication, verifyIdentityNumber]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 font-medium text-stone-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
        >
          <ArrowLeft size={18} />
          <span>{lang === 'sw' ? 'Rudi' : 'Back'}</span>
        </button>

        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold',
            hasFullAccess ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
          )}
        >
          {hasFullAccess ? <Eye size={16} /> : <EyeOff size={16} />}
          <span>{hasFullAccess ? (lang === 'sw' ? 'Mtazamo Kamili' : 'Full Access') : (lang === 'sw' ? 'Mtazamo wa Umma' : 'Public View')}</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <QrCode size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-stone-900">{lang === 'sw' ? 'Hakiki Hati' : 'Verify Documents'}</h2>
              <p className="mt-1 text-sm text-stone-500">{lang === 'sw' ? 'Tafuta rekodi za maombi na vitambulisho vilivyosajiliwa.' : 'Search application and identity records stored on the portal.'}</p>
            </div>
          </div>

          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-stone-700">{lang === 'sw' ? 'Aina ya hati' : 'Document type'}</span>
              <select
                value={selectedDocType}
                onChange={(event) => setSelectedDocType(event.target.value)}
                className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 outline-none transition-colors focus:border-emerald-500"
              >
                {availableDocTypes.map((document) => (
                  <option key={document.id} value={document.id}>{document.label}</option>
                ))}
              </select>
            </label>

            <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
              <div className="font-semibold text-stone-800">{selectedDocument.label}</div>
              <div className="mt-1">{selectedDocument.description}</div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-stone-700">{lang === 'sw' ? 'Namba ya uthibitisho' : 'Verification number'}</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void handleVerify();
                    }
                  }}
                  placeholder={lang === 'sw' ? 'Ingiza namba ya maombi au kitambulisho' : 'Enter application or identity number'}
                  className="h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 outline-none transition-colors focus:border-emerald-500"
                />
              </div>
            </label>

            <button
              onClick={() => void handleVerify()}
              disabled={loading || !query.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              <span>{loading ? t('processing') : (lang === 'sw' ? 'Hakiki sasa' : 'Verify now')}</span>
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          {verificationStatus === 'idle' && !verifiedDocument && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <QrCode className="mb-4 text-stone-300" size={52} />
              <h3 className="text-lg font-semibold text-stone-800">{lang === 'sw' ? 'Matokeo ya uthibitisho' : 'Verification result'}</h3>
              <p className="mt-2 max-w-sm text-sm text-stone-500">{lang === 'sw' ? 'Matokeo yataonekana hapa baada ya kuingiza namba sahihi.' : 'Results will appear here after you submit a valid verification number.'}</p>
            </div>
          )}

          {verificationStatus === 'invalid' && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <ShieldAlert className="mb-4 text-red-500" size={52} />
              <h3 className="text-lg font-semibold text-stone-800">{lang === 'sw' ? 'Hakuna rekodi iliyopatikana' : 'No matching record found'}</h3>
              <p className="mt-2 max-w-sm text-sm text-stone-500">{lang === 'sw' ? 'Angalia namba uliyoingiza kisha ujaribu tena.' : 'Check the number you entered and try again.'}</p>
            </div>
          )}

          {verificationStatus === 'verified' && verifiedDocument && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
                <CheckCircle2 size={20} />
                <div>
                  <div className="font-semibold">{lang === 'sw' ? 'Rekodi imethibitishwa' : 'Record verified'}</div>
                  <div className="text-sm">{verifiedDocument.verificationCode}</div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-stone-200 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{lang === 'sw' ? 'Mwombaji' : 'Applicant'}</div>
                  <div className="mt-1 text-base font-semibold text-stone-900">{hasFullAccess ? verifiedDocument.applicantName : maskValue(verifiedDocument.applicantName, 1, 0)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{lang === 'sw' ? 'Huduma' : 'Service'}</div>
                  <div className="mt-1 text-stone-800">{verifiedDocument.serviceName}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{lang === 'sw' ? 'Hali' : 'Status'}</div>
                    <div className="mt-1 text-stone-800">{verifiedDocument.status}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{lang === 'sw' ? 'Tarehe' : 'Date'}</div>
                    <div className="mt-1 text-stone-800">{verifiedDocument.issuedAt ? new Date(verifiedDocument.issuedAt).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-GB') : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{lang === 'sw' ? 'Simu' : 'Phone'}</div>
                    <div className="mt-1 text-stone-800">{hasFullAccess ? (verifiedDocument.phone || '—') : maskValue(verifiedDocument.phone)}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">NIDA</div>
                    <div className="mt-1 text-stone-800">{hasFullAccess ? (verifiedDocument.nidaNumber || '—') : maskValue(verifiedDocument.nidaNumber, 4, 2)}</div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{lang === 'sw' ? 'Mkoa' : 'Region'}</div>
                    <div className="mt-1 text-stone-800">{verifiedDocument.region || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">{lang === 'sw' ? 'Wilaya' : 'District'}</div>
                    <div className="mt-1 text-stone-800">{verifiedDocument.district || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
