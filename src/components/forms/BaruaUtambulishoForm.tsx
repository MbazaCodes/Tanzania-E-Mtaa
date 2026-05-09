/**
 * Barua ya Utambulisho Form
 * Identification Letter (Requires Residence Certificate Number)
 * 
 * Service: Barua ya Utambulisho
 * Fee: 5,000 TZS
 * 
 * Features:
 * - Book-style layout with sections
 * - Residence certificate lookup and reference
 * - Progress tracking
 * - Review step before submission
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Loader2, CheckCircle, ArrowLeft, ArrowRight, Eye, FileCheck,
  User, MapPin, Phone, Mail, Calendar, CreditCard, Home,
  AlertCircle, Search, FileText, Building, Users, Upload,
  Plus, Trash2, Pencil,
} from 'lucide-react';
import { FormProps, labels } from './types';
import { ProgressFill } from '../ui/ProgressFill';
import { PhotoCapture } from '../ui/PhotoCapture';
import { supabase } from '@/lib/supabase';

// Council options - All Tanzania Halmashauri (Ward-level Councils)
const COUNCILS = [
  { label: 'HALMASHAURI YA MTAA - ARUSHA', value: 'ARUSHA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - DAR ES SALAAM', value: 'DAR_MTAA' },
  { label: 'HALMASHAURI YA MTAA - DODOMA', value: 'DODOMA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - GEITA', value: 'GEITA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - IRINGA', value: 'IRINGA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - KAGERA', value: 'KAGERA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - KATAVI', value: 'KATAVI_MTAA' },
  { label: 'HALMASHAURI YA MTAA - KIGOMA', value: 'KIGOMA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - KILIMANJARO', value: 'KILIMANJARO_MTAA' },
  { label: 'HALMASHAURI YA MTAA - LINDI', value: 'LINDI_MTAA' },
  { label: 'HALMASHAURI YA MTAA - MANYARA', value: 'MANYARA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - MARA', value: 'MARA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - MBEYA', value: 'MBEYA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - MOROGORO', value: 'MOROGORO_MTAA' },
  { label: 'HALMASHAURI YA MTAA - MTWARA', value: 'MTWARA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - MWANZA', value: 'MWANZA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - NJOMBE', value: 'NJOMBE_MTAA' },
  { label: 'HALMASHAURI YA MTAA - PWANI', value: 'PWANI_MTAA' },
  { label: 'HALMASHAURI YA MTAA - RUKWA', value: 'RUKWA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - RUVUMA', value: 'RUVUMA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - SHINYANGA', value: 'SHINYANGA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - SIMIYU', value: 'SIMIYU_MTAA' },
  { label: 'HALMASHAURI YA MTAA - SINGIDA', value: 'SINGIDA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - SONGWE', value: 'SONGWE_MTAA' },
  { label: 'HALMASHAURI YA MTAA - TABORA', value: 'TABORA_MTAA' },
  { label: 'HALMASHAURI YA MTAA - TANGA', value: 'TANGA_MTAA' },
];

// Comprehensive Wards by Council for all Tanzania regions
const WARDS_BY_COUNCIL: Record<string, { label: string; value: string }[]> = {
  ARUSHA_MTAA: [
    { label: 'Arusha Urban', value: 'ARUSHA_URBAN' },
    { label: 'Arusha Rural', value: 'ARUSHA_RURAL' },
    { label: 'Karatu', value: 'KARATU' },
    { label: 'Longido', value: 'LONGIDO' },
    { label: 'Monduli', value: 'MONDULI' },
    { label: 'Ngorongoro', value: 'NGORONGORO' },
  ],
  DAR_MTAA: [
    { label: 'Ilala', value: 'ILALA' },
    { label: 'Kinondoni', value: 'KINONDONI' },
    { label: 'Ubungo', value: 'UBUNGO' },
    { label: 'Kigamboni', value: 'KIGAMBONI' },
    { label: 'Temeke', value: 'TEMEKE' },
    { label: 'Chalinze', value: 'CHALINZE' },
  ],
  DODOMA_MTAA: [
    { label: 'Dodoma Urban', value: 'DODOMA_URBAN' },
    { label: 'Dodoma Rural', value: 'DODOMA_RURAL' },
    { label: 'Bahi', value: 'BAHI' },
    { label: 'Chamwino', value: 'CHAMWINO' },
    { label: 'Chemba', value: 'CHEMBA' },
    { label: 'Kondoa', value: 'KONDOA' },
    { label: 'Kongwa', value: 'KONGWA' },
    { label: 'Mpwapwa', value: 'MPWAPWA' },
  ],
  GEITA_MTAA: [
    { label: 'Geita Town', value: 'GEITA_TOWN' },
    { label: 'Bukombe', value: 'BUKOMBE' },
    { label: 'Chato', value: 'CHATO' },
    { label: 'Mbogwe', value: 'MBOGWE' },
    { label: 'Nyang\'hwale', value: 'NYANG_HWALE' },
  ],
  IRINGA_MTAA: [
    { label: 'Iringa Urban', value: 'IRINGA_URBAN' },
    { label: 'Iringa Rural', value: 'IRINGA_RURAL' },
    { label: 'Kilolo', value: 'KILOLO' },
    { label: 'Mafinga', value: 'MAFINGA' },
  ],
  KAGERA_MTAA: [
    { label: 'Bukoba Urban', value: 'BUKOBA_URBAN' },
    { label: 'Bukoba Rural', value: 'BUKOBA_RURAL' },
    { label: 'Biharamulo', value: 'BIHARAMULO' },
    { label: 'Karagwe', value: 'KARAGWE' },
    { label: 'Muleba', value: 'MULEBA' },
    { label: 'Ngara', value: 'NGARA' },
  ],
  KATAVI_MTAA: [
    { label: 'Mpanda Town', value: 'MPANDA_TOWN' },
    { label: 'Mpanda District', value: 'MPANDA_DISTRICT' },
    { label: 'Sumbawanga', value: 'SUMBAWANGA' },
  ],
  KIGOMA_MTAA: [
    { label: 'Kigoma Urban', value: 'KIGOMA_URBAN' },
    { label: 'Kigoma Rural', value: 'KIGOMA_RURAL' },
    { label: 'Kasulu', value: 'KASULU' },
    { label: 'Kibondo', value: 'KIBONDO' },
    { label: 'Uvinza', value: 'UVINZA' },
  ],
  KILIMANJARO_MTAA: [
    { label: 'Arusha Urban', value: 'ARUSHA_URBAN_KLM' },
    { label: 'Moshi Urban', value: 'MOSHI_URBAN' },
    { label: 'Moshi Rural', value: 'MOSHI_RURAL' },
    { label: 'Hai', value: 'HAI' },
    { label: 'Same', value: 'SAME' },
    { label: 'Rombo', value: 'ROMBO' },
  ],
  LINDI_MTAA: [
    { label: 'Lindi Urban', value: 'LINDI_URBAN' },
    { label: 'Lindi Rural', value: 'LINDI_RURAL' },
    { label: 'Mtwara Urban', value: 'MTWARA_URBAN' },
    { label: 'Mtwara Rural', value: 'MTWARA_RURAL' },
  ],
  MANYARA_MTAA: [
    { label: 'Moshi', value: 'MOSHI_MANYARA' },
    { label: 'Iramba', value: 'IRAMBA' },
    { label: 'Kiteto', value: 'KITETO' },
    { label: 'Mbulu', value: 'MBULU' },
  ],
  MARA_MTAA: [
    { label: 'Musoma Urban', value: 'MUSOMA_URBAN' },
    { label: 'Musoma Rural', value: 'MUSOMA_RURAL' },
    { label: 'Bariadi', value: 'BARIADI' },
    { label: 'Butiama', value: 'BUTIAMA' },
    { label: 'Serengeti', value: 'SERENGETI' },
    { label: 'Tarime', value: 'TARIME' },
  ],
  MBEYA_MTAA: [
    { label: 'Mbeya Urban', value: 'MBEYA_URBAN' },
    { label: 'Mbeya Rural', value: 'MBEYA_RURAL' },
    { label: 'Chunya', value: 'CHUNYA' },
    { label: 'Karoi', value: 'KAROI' },
    { label: 'Rungwe', value: 'RUNGWE' },
  ],
  MOROGORO_MTAA: [
    { label: 'Morogoro Urban', value: 'MOROGORO_URBAN' },
    { label: 'Morogoro Rural', value: 'MOROGORO_RURAL' },
    { label: 'Iringa', value: 'IRINGA_MOROGORO' },
    { label: 'Kilombero', value: 'KILOMBERO' },
    { label: 'Ulanga', value: 'ULANGA' },
  ],
  MTWARA_MTAA: [
    { label: 'Mtwara Urban', value: 'MTWARA_URBAN_MT' },
    { label: 'Mtwara Rural', value: 'MTWARA_RURAL_MT' },
    { label: 'Newala', value: 'NEWALA' },
    { label: 'Tandahimba', value: 'TANDAHIMBA' },
  ],
  MWANZA_MTAA: [
    { label: 'Mwanza Urban', value: 'MWANZA_URBAN' },
    { label: 'Mwanza Rural', value: 'MWANZA_RURAL' },
    { label: 'Bukoba', value: 'BUKOBA_MWANZA' },
    { label: 'Kigoma', value: 'KIGOMA_MWANZA' },
    { label: 'Kwimba', value: 'KWIMBA' },
    { label: 'Nyamagana', value: 'NYAMAGANA' },
  ],
  NJOMBE_MTAA: [
    { label: 'Njombe Urban', value: 'NJOMBE_URBAN' },
    { label: 'Njombe Rural', value: 'NJOMBE_RURAL' },
    { label: 'Makambako', value: 'MAKAMBAKO' },
    { label: 'Wanging\'ombe', value: 'WANGING_OMBE' },
  ],
  PWANI_MTAA: [
    { label: 'Bagamoyo', value: 'BAGAMOYO' },
    { label: 'Chalinze', value: 'CHALINZE_PWANI' },
    { label: 'Mkuranga', value: 'MKURANGA' },
    { label: 'Kibaha', value: 'KIBAHA' },
    { label: 'Kunduchi', value: 'KUNDUCHI_PWANI' },
  ],
  RUKWA_MTAA: [
    { label: 'Sumbawanga Urban', value: 'SUMBAWANGA_URBAN' },
    { label: 'Sumbawanga Rural', value: 'SUMBAWANGA_RURAL' },
    { label: 'Nkansi', value: 'NKANSI' },
  ],
  RUVUMA_MTAA: [
    { label: 'Songea Urban', value: 'SONGEA_URBAN' },
    { label: 'Songea Rural', value: 'SONGEA_RURAL' },
    { label: 'Iringa', value: 'IRINGA_RUVUMA' },
    { label: 'Tunduru', value: 'TUNDURU' },
  ],
  SHINYANGA_MTAA: [
    { label: 'Shinyanga Urban', value: 'SHINYANGA_URBAN' },
    { label: 'Shinyanga Rural', value: 'SHINYANGA_RURAL' },
    { label: 'Kahama', value: 'KAHAMA' },
    { label: 'Nzega', value: 'NZEGA' },
  ],
  SIMIYU_MTAA: [
    { label: 'Bariadi', value: 'BARIADI_SIMIYU' },
    { label: 'Busega', value: 'BUSEGA_SIMIYU' },
    { label: 'Itilima', value: 'ITILIMA_SIMIYU' },
    { label: 'Maswa', value: 'MASWA_SIMIYU' },
  ],
  SINGIDA_MTAA: [
    { label: 'Singida Urban', value: 'SINGIDA_URBAN' },
    { label: 'Singida Rural', value: 'SINGIDA_RURAL' },
    { label: 'Ikungi', value: 'IKUNGI_SINGIDA' },
    { label: 'Manyoni', value: 'MANYONI_SINGIDA' },
  ],
  SONGWE_MTAA: [
    { label: 'Mbozi', value: 'MBOZI' },
    { label: 'Ileje', value: 'ILEJE' },
    { label: 'Momba', value: 'MOMBA' },
    { label: 'Songwe', value: 'SONGWE_WARD' },
  ],
  TABORA_MTAA: [
    { label: 'Tabora Urban', value: 'TABORA_URBAN' },
    { label: 'Tabora Rural', value: 'TABORA_RURAL' },
    { label: 'Igunga', value: 'IGUNGA' },
    { label: 'Nzega', value: 'NZEGA_TABORA' },
    { label: 'Urambo', value: 'URAMBO' },
  ],
  TANGA_MTAA: [
    { label: 'Tanga Urban', value: 'TANGA_URBAN' },
    { label: 'Tanga Rural', value: 'TANGA_RURAL' },
    { label: 'Handeni', value: 'HANDENI' },
    { label: 'Kilindi', value: 'KILINDI' },
    { label: 'Korogwe', value: 'KOROGWE' },
    { label: 'Lushoto', value: 'LUSHOTO' },
    { label: 'Muheza', value: 'MUHEZA' },
    { label: 'Pangani', value: 'PANGANI' },
  ],
};

// Purpose options
const PURPOSE_OPTIONS = [
  { label: 'KUSOMA - Studies', value: 'STUDIES' },
  { label: 'AJIRA - Employment', value: 'EMPLOYMENT' },
  { label: 'BIASHARA - Business', value: 'BUSINESS' },
  { label: 'HUDUMA YA AFYA - Healthcare', value: 'HEALTHCARE' },
  { label: 'HATI YA KUSAFIRI - Travel Document', value: 'TRAVEL' },
  { label: 'KUFUNGUA AKAUNTI BENKI - Bank Account', value: 'BANK' },
  { label: 'KUOMBA MKOPO - Loan Application', value: 'LOAN' },
  { label: 'NYINGINEZO - Other', value: 'OTHER' },
];

interface MkaziRecord {
  mkazi_number: string;
  application_id?: string;
  full_name: string;
  registration_date: string;
  status: 'active' | 'suspended' | 'expired';
  ward: string;
  street: string;
  village?: string;
}

interface FormData {
  // Who is being applied for
  applicant_type: 'self' | 'minor' | 'third_party';

  // Subject details (used when applicant_type is 'minor' or 'third_party')
  subject_full_name: string;
  subject_dob: string;
  subject_nida: string;
  subject_relationship: string;
  subject_reason: string;

  // Mkazi Reference
  mkazi_number: string;
  mkazi_verified: boolean;
  residence_application_id?: string;
  residence_certificate_status?: string;
  residence_certificate_date?: string;
  
  // Personal Information (pre-filled from Residence Certificate)
  full_name: string;
  nida_number: string;
  phone: string;
  email: string;
  
  // Residence Information (from Residence Certificate)
  region: string;
  district: string;
  ward: string;
  street: string;
  house_number: string;
  neighborhood: string;
  
  // Application Details
  council: string;
  purpose: string;
  institution_name: string;
  institution_address: string;
  additional_notes: string;

  // ID type for uploaded document
  id_type: string;
}

type Step = 'mkazi' | 'verify' | 'purpose' | 'documents' | 'review';

export const BaruaUtambulishoForm: React.FC<FormProps> = ({
  onSubmit,
  isLoading,
  lang = 'sw',
  userProfile,
  draftId
}) => {
  const t = labels[lang];
  const [currentStep, setCurrentStep] = useState<Step>('mkazi');
  const [showReview, setShowReview] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [selectedCouncil, setSelectedCouncil] = useState<string>('');
  const [applicantType, setApplicantType] = useState<'self' | 'minor' | 'third_party'>('self');

  // Photo & document upload state
  const [applicantIdPhoto, setApplicantIdPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [subjectPhoto, setSubjectPhoto] = useState<string | null>(null);
  const [supportingDocPhoto, setSupportingDocPhoto] = useState<string | null>(null);

  // Auto-fetch and fill mkazi cert when applicant type changes to minor/third_party
  useEffect(() => {
    if (applicantType === 'self' || !userProfile?.id) return;
    // Only auto-fill if field is still empty
    if (mkaziNumber.trim()) return;

    supabase
      .from('applications')
      .select('application_number, status, service_name')
      .eq('user_id', userProfile.id)
      .in('status', ['approved', 'issued', 'paid', 'pending_payment'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const cert = data.find(app =>
          String(app.service_name || '').toLowerCase().includes('mkazi')
        );
        if (cert?.application_number) {
          setMkaziNumber(cert.application_number);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantType, userProfile?.id]);

  // Custom fields — user-added key/value pairs
  const [customFields, setCustomFields] = useState<{ id: string; label: string; value: string }[]>([]);

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { id: crypto.randomUUID(), label: '', value: '' }]);
  };
  const updateCustomField = (id: string, key: 'label' | 'value', val: string) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };
  const removeCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };
  
  // Mkazi lookup state
  const [mkaziNumber, setMkaziNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [mkaziRecord, setMkaziRecord] = useState<MkaziRecord | null>(null);
  const [verificationError, setVerificationError] = useState<string>('');

  const { register, handleSubmit, setValue, formState: { errors }, trigger, getValues, watch, reset } = useForm<FormData>();

  // Watch council field to update ward options
  const councilValue = watch('council');
  React.useEffect(() => {
    setSelectedCouncil(councilValue || '');
  }, [councilValue]);

  const steps: { key: Step; label: string; swLabel: string }[] = [
    { key: 'mkazi', label: 'Residence Certificate', swLabel: 'Cheti cha Mkazi' },
    { key: 'verify', label: 'Verify Details', swLabel: 'Hakiki Taarifa' },
    { key: 'purpose', label: 'Purpose', swLabel: 'Sababu' },
    { key: 'documents', label: 'Documents', swLabel: 'Nyaraka' },
    { key: 'review', label: 'Review', swLabel: 'Hakiki' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  React.useEffect(() => {
    if (!draftId) return;

    const draftData = localStorage.getItem(draftId);
    if (!draftData) return;

    try {
      const draft = JSON.parse(draftData);
      if (draft.form_data) {
        reset(draft.form_data);
        setMkaziNumber(draft.form_data.mkazi_number || '');
        if (draft.form_data.mkazi_verified) {
          setMkaziRecord({
            mkazi_number: draft.form_data.mkazi_number,
            application_id: draft.form_data.residence_application_id,
            full_name: draft.form_data.full_name || '',
            registration_date: draft.form_data.residence_certificate_date || draft.last_saved || new Date().toISOString(),
            status: 'active',
            ward: draft.form_data.ward || '',
            street: draft.form_data.street || '',
            village: draft.form_data.neighborhood || '',
          });
        }
        setCurrentStep(draft.current_step === 'review' ? 'review' : draft.current_step || 'mkazi');
      }
    } catch (error) {
      console.error('Error loading Barua ya Utambulisho draft:', error);
    }
  }, [draftId, reset]);

  const saveDraft = React.useCallback(() => {
    if (!userProfile) return;

    const draftKey = draftId || `draft_${userProfile.id}_barua_ya_utambulisho`;
    localStorage.setItem(draftKey, JSON.stringify({
      id: draftKey,
      user_id: userProfile.id,
      service_name: 'Barua ya Utambulisho',
      service_id: '2',
      form_data: getValues(),
      current_step: currentStep,
      last_saved: new Date().toISOString(),
      status: 'draft',
    }));
  }, [currentStep, draftId, getValues, userProfile]);

  React.useEffect(() => {
    const subscription = watch(() => {
      const timeoutId = window.setTimeout(saveDraft, 800);
      return () => window.clearTimeout(timeoutId);
    });
    return () => subscription.unsubscribe();
  }, [saveDraft, watch]);

  React.useEffect(() => {
    saveDraft();
  }, [currentStep, saveDraft]);

  // Verify Residence Certificate Number and import details from that application.
  const verifyMkaziNumber = async () => {
    const certificateNumber = mkaziNumber.trim().toUpperCase();

    if (!certificateNumber || certificateNumber.length < 8) {
      setVerificationError(lang === 'sw' ? 'Ingiza namba kamili ya Cheti cha Mkazi' : 'Enter the full Residence Certificate number');
      return;
    }

    setVerifying(true);
    setVerificationError('');
    setMkaziRecord(null);

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('id, user_id, service_name, application_number, form_data, status, created_at')
        .eq('application_number', certificateNumber)
        .eq('user_id', userProfile?.id || '')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setVerificationError(
          lang === 'sw'
            ? 'Cheti cha Mkazi hakijapatikana kwa namba hii.'
            : 'No Residence Certificate was found with this number.'
        );
        return;
      }

      const isResidenceCertificate =
        String(data.service_name || '').toLowerCase().includes('mkazi') ||
        String(data.form_data?.document_type || '').toLowerCase().includes('mkazi');

      if (!isResidenceCertificate) {
        setVerificationError(
          lang === 'sw'
            ? 'Namba hii si ya Cheti cha Mkazi.'
            : 'This number is not for a Residence Certificate.'
        );
        return;
      }

      // Check if status is active
      if (!['approved', 'issued', 'paid', 'pending_payment'].includes(data.status)) {
        setVerificationError(
          lang === 'sw' 
            ? 'Cheti hiki bado hakijakamilika au hakitumiki kwa Barua ya Utambulisho.' 
            : 'This certificate is not complete or cannot be used for an Introduction Letter yet.'
        );
        return;
      }

      const certificateData = data.form_data || {};
      const fullName = certificateData.full_name || [userProfile?.first_name, userProfile?.middle_name, userProfile?.last_name].filter(Boolean).join(' ');
      const record: MkaziRecord = {
        mkazi_number: certificateNumber,
        application_id: data.id,
        full_name: fullName,
        registration_date: data.created_at,
        status: 'active',
        ward: certificateData.ward || userProfile?.ward || '',
        street: certificateData.street || userProfile?.street || '',
        village: certificateData.neighborhood || '',
      };

      setMkaziRecord(record);
      
      // Auto-fill form fields from the Residence Certificate.
      setValue('mkazi_number', certificateNumber);
      setValue('mkazi_verified', true);
      setValue('full_name', record.full_name);
      setValue('ward', record.ward);
      setValue('street', record.street);
      setValue('house_number', certificateData.house_number || '');
      setValue('neighborhood', certificateData.neighborhood || '');
      setValue('region', certificateData.region || userProfile?.region || '');
      setValue('district', certificateData.district || userProfile?.district || '');
      setValue('residence_application_id', data.id);
      setValue('residence_certificate_status', data.status);
      setValue('residence_certificate_date', data.created_at);
      
      if (userProfile) {
        setValue('nida_number', userProfile.nida_number || '');
        setValue('phone', userProfile.phone || '');
        setValue('email', userProfile.email || '');
      }

    } catch (err) {
      setVerificationError(
        lang === 'sw' 
          ? 'Hitilafu katika kuthibitisha cheti. Jaribu tena.' 
          : 'Error verifying the certificate. Please try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    let fieldsToValidate: (keyof FormData)[] = [];
    
    switch (currentStep) {
      case 'mkazi':
        return mkaziRecord ? true : false;
      case 'verify':
        // All fields in verify are auto-filled, no validation needed
        return true;
      case 'purpose':
        fieldsToValidate = ['purpose', 'council', 'institution_name'];
        break;
      default:
        return true;
    }
    
    const result = await trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (currentStep === 'purpose') {
      setCurrentStep('documents');
    } else if (currentStep === 'documents') {
      setCurrentStep('review');
    } else {
      const nextStep = steps[currentStepIndex + 1].key;
      setCurrentStep(nextStep);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].key);
    }
  };

  const onFormSubmit = (data: FormData) => {
    setFormData(data);
    setShowReview(true);
  };

  const confirmSubmit = async () => {
    if (!mkaziRecord) return;
    const submitData = {
      ...(formData ?? getValues()),
      applicant_type: applicantType,
      applicant_id_photo: applicantIdPhoto,
      selfie_photo: selfiePhoto,
      subject_photo: subjectPhoto,
      supporting_doc_photo: supportingDocPhoto,
      custom_fields: customFields.filter(f => f.label.trim()),
    };
    await Promise.resolve(onSubmit(submitData, [], 'self'));
  };

  const inputClass = "w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white";
  const labelClass = "block text-sm font-semibold text-stone-700 mb-2";
  const sectionClass = "bg-linear-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border-l-4 border-emerald-500 mb-6 shadow-sm";

  // Progress Bar Component
  const ProgressBar = () => (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        {steps.map((step, index) => (
          <div 
            key={step.key}
            className={`flex flex-col items-center ${index <= currentStepIndex ? 'text-emerald-600' : 'text-stone-400'}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1
              ${index < currentStepIndex 
                ? 'bg-emerald-600 text-white' 
                : index === currentStepIndex
                ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-600'
                : 'bg-stone-100 text-stone-400'
              }
            `}>
              {index < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : index + 1}
            </div>
            <span className="text-xs font-medium hidden sm:block">
              {lang === 'sw' ? step.swLabel : step.label}
            </span>
          </div>
        ))}
      </div>
      <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
        <ProgressFill progress={progress} className="bg-linear-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-300" />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-stone-500">
          {lang === 'sw' ? 'Hatua' : 'Step'} {currentStepIndex + 1} {lang === 'sw' ? 'kati ya' : 'of'} {steps.length}
        </span>
        <span className="text-xs font-bold text-emerald-600">{Math.round(progress)}%</span>
      </div>
    </div>
  );

  // Review Component
  const ReviewSection = () => {
    const data = getValues();
    
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800">
                {lang === 'sw' ? 'Hakiki Maombi ya Barua ya Utambulisho' : 'Review Identification Letter Application'}
              </h3>
              <p className="text-sm text-amber-700">
                {lang === 'sw' 
                  ? 'Tafadhali hakiki taarifa zako kabla ya kuwasilisha. Barua ya utambulisho itatolewa kwa kutumia namba ya Cheti cha Mkazi.'
                  : 'Please review your information before submitting. The introduction letter will be issued using your Residence Certificate number.'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Mkazi Reference */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {lang === 'sw' ? 'Namba ya Cheti cha Mkazi' : 'Residence Certificate Number'}
              </h4>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded">
                  {data.mkazi_number}
                </span>
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {lang === 'sw' ? 'Imethibitishwa' : 'Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <User className="h-4 w-4" />
                {lang === 'sw' ? 'Taarifa Binafsi' : 'Personal Information'}
              </h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Jina Kamili' : 'Full Name'}</span>
                  <p className="font-medium">{data.full_name}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">NIDA</span>
                  <p className="font-medium">{data.nida_number || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Simu' : 'Phone'}</span>
                  <p className="font-medium">{data.phone}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">Email</span>
                  <p className="font-medium">{data.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Residence Information */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <Home className="h-4 w-4" />
                {lang === 'sw' ? 'Anwani ya Makazi' : 'Residence Address'}
              </h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Mkoa' : 'Region'}</span>
                  <p className="font-medium">{data.region || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Wilaya' : 'District'}</span>
                  <p className="font-medium">{data.district || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Kata' : 'Ward'}</span>
                  <p className="font-medium">{data.ward}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Mtaa' : 'Street'}</span>
                  <p className="font-medium">{data.street}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Kitongoji' : 'Neighborhood'}</span>
                  <p className="font-medium">{data.neighborhood || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Namba ya Nyumba' : 'House Number'}</span>
                  <p className="font-medium">{data.house_number || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
              <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                <Building className="h-4 w-4" />
                {lang === 'sw' ? 'Sababu na Lengo' : 'Purpose and Destination'}
              </h4>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Halmashauri' : 'Council'}</span>
                  <p className="font-medium">{COUNCILS.find(c => c.value === data.council)?.label || data.council}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Sababu' : 'Purpose'}</span>
                  <p className="font-medium">{PURPOSE_OPTIONS.find(p => p.value === data.purpose)?.label || data.purpose}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Taasisi' : 'Institution'}</span>
                  <p className="font-medium">{data.institution_name}</p>
                </div>
                {data.institution_address && (
                  <div className="md:col-span-2">
                    <span className="text-xs text-stone-500">{lang === 'sw' ? 'Anwani ya Taasisi' : 'Institution Address'}</span>
                    <p className="font-medium">{data.institution_address}</p>
                  </div>
                )}
              </div>
              
              {data.additional_notes && (
                <div className="mt-3">
                  <span className="text-xs text-stone-500">{lang === 'sw' ? 'Maelezo ya Ziada' : 'Additional Notes'}</span>
                  <p className="font-medium bg-stone-50 p-2 rounded-lg mt-1">{data.additional_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Custom Fields in review */}
          {customFields.filter(f => f.label.trim()).length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100">
                <h4 className="font-bold text-emerald-800 flex items-center gap-2">
                  <Pencil className="h-4 w-4" />
                  {lang === 'sw' ? 'Sehemu za Ziada' : 'Custom Fields'}
                </h4>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.filter(f => f.label.trim()).map(f => (
                  <div key={f.id}>
                    <span className="text-xs text-stone-500">{f.label}</span>
                    <p className="font-medium">{f.value || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fee Summary */}
          <div className="bg-linear-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-emerald-800">{lang === 'sw' ? 'Ada ya Barua ya Utambulisho:' : 'Identification Letter Fee:'}</span>
              <span className="font-bold text-xl text-emerald-600">5,000 TZS</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              {lang === 'sw' 
                ? 'Ada hii ni kwa ajili ya utoaji wa Barua ya Utambulisho. Malipo yatakamilishwa baada ya kuwasilisha.'
                : 'This is the identification letter fee. Payment will be completed after submission.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => setCurrentStep('purpose')}
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            {lang === 'sw' ? 'Rudi' : 'Back'}
          </button>
          <button
            type="button"
            onClick={confirmSubmit}
            disabled={isLoading}
            className="flex-1 py-3 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <FileCheck className="h-5 w-5" />
                {lang === 'sw' ? 'Wasilisha Ombi' : 'Submit Application'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  if (showReview || currentStep === 'review') {
    return (
      <form className="space-y-6">
        <ReviewSection />
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <ProgressBar />

      {/* Step 1: Residence Certificate Number Entry */}
      {currentStep === 'mkazi' && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-bold text-emerald-800 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {lang === 'sw' ? 'INGIZA NAMBA YA CHETI CHA MKAZI' : 'ENTER YOUR RESIDENCE CERTIFICATE NUMBER'}
            </h3>
          </div>

          {/* Applicant Type Selector */}
          <div>
            <label className={labelClass}>
              <Users className="inline h-4 w-4 mr-1.5 text-emerald-600" />
              {lang === 'sw' ? 'Barua hii inaombwa kwa ajili ya nani?' : 'Who is this letter being applied for?'}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: 'self', sw: 'Mwenyewe', en: 'Myself' },
                { value: 'minor', sw: 'Mtoto/Mdogo', en: 'A Minor' },
                { value: 'third_party', sw: 'Mtu Mwingine', en: 'Third Party' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setApplicantType(opt.value)}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    applicantType === opt.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 text-stone-600 hover:border-emerald-300'
                  }`}
                >
                  {lang === 'sw' ? opt.sw : opt.en}
                </button>
              ))}
            </div>
          </div>

          {/* Subject Details — shown when applying for a minor or third party */}
          {(applicantType === 'minor' || applicantType === 'third_party') && (
            <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-bold text-amber-800 flex items-center gap-2">
                <User className="h-4 w-4" />
                {lang === 'sw'
                  ? (applicantType === 'minor' ? 'Taarifa za Mtoto / Mdogo' : 'Taarifa za Mtu Unayemombea')
                  : (applicantType === 'minor' ? 'Minor\'s Details' : 'Subject\'s Details')}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    {lang === 'sw' ? 'Jina Kamili la Mhusika' : 'Full Name of Subject'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('subject_full_name', { required: true })}
                    className={inputClass}
                    placeholder={lang === 'sw' ? 'Jina kamili la mhusika' : 'Subject\'s full legal name'}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    {lang === 'sw' ? 'Tarehe ya Kuzaliwa' : 'Date of Birth'}
                  </label>
                  <input
                    type="date"
                    {...register('subject_dob')}
                    className={inputClass}
                  />
                </div>

                {applicantType === 'third_party' && (
                  <div>
                    <label className={labelClass}>
                      {lang === 'sw' ? 'Namba ya NIDA (Mhusika)' : 'Subject\'s NIDA Number'}
                    </label>
                    <input
                      type="text"
                      {...register('subject_nida')}
                      className={inputClass}
                      placeholder="NIDA-XXXX-XXXX-XXXX"
                    />
                  </div>
                )}

                <div>
                  <label className={labelClass}>
                    {lang === 'sw' ? 'Uhusiano wako naye' : 'Your Relationship to Subject'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    {...register('subject_relationship', { required: true })}
                    className={inputClass}
                  >
                    <option value="">{lang === 'sw' ? 'Chagua uhusiano' : 'Select relationship'}</option>
                    <option value="parent">{lang === 'sw' ? 'Mzazi' : 'Parent'}</option>
                    <option value="guardian">{lang === 'sw' ? 'Mlezi' : 'Guardian'}</option>
                    <option value="sibling">{lang === 'sw' ? 'Ndugu/Dada' : 'Sibling'}</option>
                    <option value="spouse">{lang === 'sw' ? 'Mwenzi wa Ndoa' : 'Spouse'}</option>
                    <option value="employer">{lang === 'sw' ? 'Mwajiri' : 'Employer'}</option>
                    <option value="other">{lang === 'sw' ? 'Nyingine' : 'Other'}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>
                    {lang === 'sw' ? 'Sababu ya Kuomba kwa Niaba yake' : 'Reason for Applying on Their Behalf'}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    {...register('subject_reason', { required: true })}
                    className={inputClass}
                    rows={3}
                    placeholder={lang === 'sw'
                      ? 'Eleza kwa nini unawakilia mtu huyu...'
                      : 'Explain why you are applying on behalf of this person...'}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                {lang === 'sw' 
                  ? 'Ili kupata Barua ya Utambulisho, ni lazima uwe na namba ya Cheti cha Mkazi. Tutaitumia kuleta taarifa zako za makazi ili usijaze kila kitu upya.'
                  : 'To get an Introduction Letter, you must have a Residence Certificate number. We use it to fetch your residence details so you do not refill everything.'}
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {lang === 'sw' ? 'Namba ya Cheti cha Mkazi' : 'Residence Certificate Number'} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
                <input
                  type="text"
                  value={mkaziNumber}
                  onChange={(e) => setMkaziNumber(e.target.value.toUpperCase())}
                  placeholder="TZ-CHE-20260509-1234"
                  className="w-full p-3 pl-10 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono uppercase tracking-wider"
                />
              </div>
              <button
                type="button"
                onClick={verifyMkaziNumber}
                disabled={verifying}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold flex items-center gap-2 transition-all"
              >
                {verifying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                <span className="hidden sm:inline">
                  {lang === 'sw' ? 'Thibitisha' : 'Verify'}
                </span>
              </button>
            </div>
          </div>

          {/* Verification Result */}
          {mkaziRecord && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
                <span className="font-bold text-emerald-700 text-lg">
                  {lang === 'sw' ? 'Cheti Kimethibitishwa!' : 'Certificate Verified!'}
                </span>
              </div>
              
              <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-stone-400" />
                  <span className="font-semibold text-stone-600 w-28">{lang === 'sw' ? 'Jina:' : 'Name:'}</span>
                  <span className="font-medium">{mkaziRecord.full_name}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-stone-400" />
                  <span className="font-semibold text-stone-600 w-28">{lang === 'sw' ? 'Kata/Mtaa:' : 'Ward/Street:'}</span>
                  <span className="font-medium">{mkaziRecord.ward}, {mkaziRecord.street}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-stone-400" />
                  <span className="font-semibold text-stone-600 w-28">{lang === 'sw' ? 'Tarehe ya Usajili:' : 'Registration Date:'}</span>
                  <span className="font-medium">{new Date(mkaziRecord.registration_date).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-stone-600 w-28">{lang === 'sw' ? 'Hali:' : 'Status:'}</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase">
                    {mkaziRecord.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {verificationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 font-medium">{verificationError}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Verify Details */}
      {currentStep === 'verify' && mkaziRecord && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-bold text-emerald-800 flex items-center gap-2">
              <User className="h-5 w-5" />
              {lang === 'sw' ? 'HAKIKI TAARIFA ZAKO' : 'VERIFY YOUR DETAILS'}
            </h3>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-emerald-700">
              {lang === 'sw' 
                ? 'Taarifa zilizo hapa chini zimechukuliwa kutoka kwenye rekodi yako ya Mkazi na wasifu wako. Hakikisha zina usahihi.'
                : 'The information below is taken from your Residence Certificate and profile. Ensure it is correct.'}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2 mb-2">
            <Pencil className="h-4 w-4 shrink-0" />
            {lang === 'sw'
              ? 'Taarifa zilizojazwa kiotomatiki. Unaweza kuzihariri kama kuna makosa.'
              : 'Auto-filled from your certificate. Edit any field that needs correction.'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Jina Kamili' : 'Full Name'}
              </label>
              <input
                type="text"
                {...register('full_name')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>NIDA</label>
              <input
                type="text"
                {...register('nida_number')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Simu' : 'Phone'}
              </label>
              <input
                type="text"
                {...register('phone')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                {...register('email')}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Mkoa' : 'Region'}
              </label>
              <input
                type="text"
                {...register('region')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Wilaya' : 'District'}
              </label>
              <input
                type="text"
                {...register('district')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Kata' : 'Ward'} <span className="text-red-500">*</span>
              </label>
              <select 
                {...register('ward', { required: true })} 
                className={inputClass}
              >
                <option value="">{lang === 'sw' ? 'Chagua Kata' : 'Select Ward'}</option>
                {selectedCouncil && WARDS_BY_COUNCIL[selectedCouncil as keyof typeof WARDS_BY_COUNCIL]?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Mtaa' : 'Street'} <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                {...register('street', { required: true })} 
                className={inputClass}
                placeholder={lang === 'sw' ? 'Ingiza mtaa' : 'Enter street'}
              />
            </div>

            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Kitongoji' : 'Neighborhood'}
              </label>
              <input 
                type="text" 
                {...register('neighborhood')} 
                className={inputClass}
                placeholder={lang === 'sw' ? 'Mfano: Mnazi Mmoja' : 'E.g.: Mnazi Mmoja'}
              />
            </div>

            <div>
              <label className={labelClass}>
                {lang === 'sw' ? 'Namba ya Nyumba' : 'House Number'}
              </label>
              <input 
                type="text" 
                {...register('house_number')} 
                className={inputClass}
                placeholder="House No. 123"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Purpose */}
      {currentStep === 'purpose' && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-bold text-emerald-800 flex items-center gap-2">
              <Building className="h-5 w-5" />
              {lang === 'sw' ? 'SABABU YA MAOMBI NA LENGO' : 'PURPOSE AND DESTINATION'}
            </h3>
          </div>

          <div>
            <label className={labelClass}>
              {lang === 'sw' ? 'Halmashauri' : 'Council'} <span className="text-red-500">*</span>
            </label>
            <select 
              {...register('council', { required: true })} 
              className={inputClass}
            >
              <option value="">{t.select}</option>
              {COUNCILS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.council && <span className="text-red-500 text-sm">{t.required}</span>}
          </div>

          <div>
            <label className={labelClass}>
              {lang === 'sw' ? 'Sababu ya Maombi' : 'Purpose'} <span className="text-red-500">*</span>
            </label>
            <select 
              {...register('purpose', { required: true })} 
              className={inputClass}
            >
              <option value="">{t.select}</option>
              {PURPOSE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.purpose && <span className="text-red-500 text-sm">{t.required}</span>}
          </div>

          <div>
            <label className={labelClass}>
              {lang === 'sw' ? 'Jina la Taasisi / Ofisi' : 'Institution / Office Name'} <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              {...register('institution_name', { required: true })} 
              className={inputClass}
              placeholder={lang === 'sw' ? 'Mfano: Chuo Kikuu cha Dar es Salaam, Ofisi ya Mkoa' : 'E.g.: University of Dar es Salaam, Regional Office'}
            />
            {errors.institution_name && <span className="text-red-500 text-sm">{t.required}</span>}
          </div>

          <div>
            <label className={labelClass}>
              {lang === 'sw' ? 'Anwani ya Taasisi (Hiari)' : 'Institution Address (Optional)'}
            </label>
            <textarea 
              {...register('institution_address')} 
              className={inputClass}
              rows={3}
              placeholder={lang === 'sw' ? 'Anwani kamili ya taasisi unayoiandikia barua' : 'Full address of the institution you are writing to'}
            />
          </div>

          <div>
            <label className={labelClass}>
              {lang === 'sw' ? 'Maelezo ya Ziada (Hiari)' : 'Additional Notes (Optional)'}
            </label>
            <textarea
              {...register('additional_notes')}
              className={inputClass}
              rows={3}
              placeholder={lang === 'sw' ? 'Maelezo yoyote ya ziada kuhusu ombi lako' : 'Any additional information about your request'}
            />
          </div>

          {/* ── Custom Fields ─────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelClass + ' mb-0'}>
                <Pencil className="inline h-4 w-4 mr-1.5 text-emerald-600" />
                {lang === 'sw' ? 'Sehemu za Ziada (Maalum)' : 'Extra / Custom Fields'}
              </label>
              <button
                type="button"
                onClick={addCustomField}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                {lang === 'sw' ? 'Ongeza Sehemu' : 'Add Field'}
              </button>
            </div>

            {customFields.length === 0 && (
              <p className="text-xs text-stone-400 italic">
                {lang === 'sw'
                  ? 'Bonyeza "Ongeza Sehemu" kuongeza taarifa za ziada zinazotakiwa kwenye barua yako.'
                  : 'Click "Add Field" to include any extra information required in your letter.'}
              </p>
            )}

            {customFields.map((field, idx) => (
              <div key={field.id} className="flex gap-2 items-start">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateCustomField(field.id, 'label', e.target.value)}
                      className={inputClass + ' text-sm'}
                      placeholder={lang === 'sw' ? `Kichwa (${idx + 1})` : `Label (${idx + 1})`}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, 'value', e.target.value)}
                      className={inputClass + ' text-sm'}
                      placeholder={lang === 'sw' ? 'Thamani' : 'Value'}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCustomField(field.id)}
                  className="mt-1 p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  title={lang === 'sw' ? 'Futa sehemu hii' : 'Remove this field'}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Upload Documents & Photos */}
      {currentStep === 'documents' && (
        <div className="space-y-6">
          <div className={sectionClass}>
            <h3 className="font-bold text-emerald-800 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {lang === 'sw' ? 'PAKIA NYARAKA NA PICHA' : 'UPLOAD DOCUMENTS & PHOTOS'}
            </h3>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              {lang === 'sw'
                ? 'Pakia picha ya kitambulisho chako na nyaraka zinazohusiana. Picha zitaonekana kwenye PDF ya barua yako. Nyaraka zinahitajika ili kuthibitisha maombi yako.'
                : 'Upload a photo of your ID and related documents. Photos appear in your letter PDF. Documents are required to verify your application.'}
            </p>
          </div>

          {/* Applicant's ID photo */}
          <PhotoCapture
            label={lang === 'sw' ? 'Picha ya Kitambulisho Chako (Muombaji)' : 'Your ID / Photo (Applicant)'}
            description={lang === 'sw'
              ? 'Piga picha ya kitambulisho chako cha NIDA, pasi, au leseni. Hiari lakini inasaidia uthibitisho.'
              : 'Take a photo of your NIDA card, passport, or driving license. Optional but speeds up verification.'}
            value={applicantIdPhoto}
            onChange={setApplicantIdPhoto}
            lang={lang}
          />

          {/* Selfie / Passport size photo */}
          <PhotoCapture
            label={lang === 'sw' ? 'Picha ya Pasi / Selfie (Ukubwa wa Pasi)' : 'Passport Photo / Selfie'}
            description={lang === 'sw'
              ? 'Piga picha yako ya ukubwa wa pasi (selfie). Picha inaonekana kwenye barua yako. Uso uwe wazi na taa nzuri.'
              : 'Take a passport-size selfie. Your face should be clear with good lighting. This appears on your letter.'}
            value={selfiePhoto}
            onChange={setSelfiePhoto}
            lang={lang}
          />

          {/* ID type selector */}
          <div>
            <label className={labelClass}>
              {lang === 'sw' ? 'Aina ya Kitambulisho Kilichopakiwa' : 'Type of ID Uploaded'}
            </label>
            <select {...register('id_type')} className={inputClass}>
              <option value="">{lang === 'sw' ? 'Chagua aina (hiari)' : 'Select type (optional)'}</option>
              <option value="nida">{lang === 'sw' ? 'Kadi ya NIDA' : 'NIDA Card'}</option>
              <option value="passport">{lang === 'sw' ? 'Pasi ya Kusafiria' : 'Passport'}</option>
              <option value="voter_id">{lang === 'sw' ? 'Kadi ya Mpiga Kura' : "Voter's Card"}</option>
              <option value="driving_license">{lang === 'sw' ? 'Leseni ya Udereva' : 'Driving License'}</option>
              <option value="zanzibar_id">{lang === 'sw' ? 'Kitambulisho cha Zanzibar' : 'Zanzibar ID'}</option>
            </select>
          </div>

          {/* Subject photo — shown for minor or third party */}
          {(applicantType === 'minor' || applicantType === 'third_party') && (
            <PhotoCapture
              label={lang === 'sw'
                ? (applicantType === 'minor' ? 'Picha ya Mtoto / Mdogo' : 'Picha ya Mhusika')
                : (applicantType === 'minor' ? "Minor's Photo" : "Subject's Photo")}
              description={lang === 'sw'
                ? 'Picha ya hivi karibuni inayoonyesha uso wazi.'
                : 'Recent clear face photo of the subject.'}
              value={subjectPhoto}
              onChange={setSubjectPhoto}
              lang={lang}
            />
          )}

          {/* Supporting document */}
          <PhotoCapture
            label={lang === 'sw' ? 'Nyaraka ya Msaada (Hiari)' : 'Supporting Document (Optional)'}
            description={lang === 'sw'
              ? 'Barua ya msaada, hati ya uhusiano, au nyaraka nyingine inayohusiana na maombi yako.'
              : 'Support letter, relationship document, or any other document relevant to your application.'}
            value={supportingDocPhoto}
            onChange={setSupportingDocPhoto}
            lang={lang}
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-6 border-t border-stone-200">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={handlePrevious}
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            {lang === 'sw' ? 'Nyuma' : 'Previous'}
          </button>
        )}
        
        <button
          type="button"
          onClick={handleNext}
          className={`flex-1 py-3 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
            currentStepIndex === 0 ? 'w-full' : ''
          }`}
        >
          {currentStep === 'documents' ? (
            <>
              {lang === 'sw' ? 'Hakiki Maombi' : 'Review Application'}
              <Eye className="h-5 w-5" />
            </>
          ) : currentStep === 'purpose' ? (
            <>
              {lang === 'sw' ? 'Endelea' : 'Continue'}
              <ArrowRight className="h-5 w-5" />
            </>
          ) : (
            <>
              {lang === 'sw' ? 'Endelea' : 'Continue'}
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default BaruaUtambulishoForm;

