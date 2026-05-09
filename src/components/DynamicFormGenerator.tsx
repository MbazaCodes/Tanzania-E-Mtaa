import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Upload, X, FileText, Loader2, ArrowRight, User, Users, UserPlus, AlertCircle } from 'lucide-react';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'tel' | 'number' | 'file' | 'checkbox' | 'header' | 'time' | 'url' | 'datetime-local';
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  disabled?: boolean;
  showIf?: { field: string; value?: any; values?: any[] };
}

interface UserProfile {
  id: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  nida_number?: string;
  region?: string;
  district?: string;
  ward?: string;
  street?: string;
}

interface DynamicFormProps {
  schema: FormField[];
  onSubmit: (data: any, attachments: string[], applicantType: string, representativeName?: string) => void;
  initialData?: any;
  isLoading?: boolean;
  lang?: 'sw' | 'en';
  userProfile?: UserProfile | null;
}

type ApplicantType = 'self' | 'minor' | 'representative';

export const DynamicFormGenerator: React.FC<DynamicFormProps> = ({
  schema,
  onSubmit,
  initialData,
  isLoading = false,
  lang = 'sw',
  userProfile,
}) => {
  const [attachments, setAttachments] = useState<string[]>([]);
  const [applicantType, setApplicantType] = useState<ApplicantType>('self');
  const [representativeName, setRepresentativeName] = useState('');
  const [useProfileData, setUseProfileData] = useState(false);

  // Minor fields
  const [minorRelationType, setMinorRelationType] = useState<'own_child' | 'other'>('own_child');
  const [minorIdType, setMinorIdType] = useState<'birth_certificate' | 'school_registration'>('birth_certificate');
  const [minorName, setMinorName] = useState('');
  const [minorIdNumber, setMinorIdNumber] = useState('');
  const [guardianIdType, setGuardianIdType] = useState('');
  const [guardianIdNumber, setGuardianIdNumber] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');

  const [fieldFiles, setFieldFiles] = useState<Record<string, File[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Build Zod schema dynamically
  const formSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};

    schema.forEach((field) => {
      if (field.type === 'header' || field.disabled || field.type === 'file') return;

      const isRequired = field.required && !field.showIf;
      let validator: z.ZodTypeAny;

      if (['text', 'textarea', 'tel'].includes(field.type)) {
        validator = isRequired
          ? z.string().min(1, `${field.label} is required`)
          : z.string().optional();
      } else if (field.type === 'number') {
        validator = z.number().optional();
      } else if (field.type === 'date' || field.type === 'select') {
        validator = isRequired ? z.string().min(1) : z.string().optional();
      } else if (field.type === 'checkbox') {
        validator = isRequired
          ? z.boolean().refine((value) => value === true, { message: `${field.label} is required` })
          : z.boolean().optional();
      } else {
        validator = z.any();
      }

      shape[field.name] = validator;
    });

    return z.object(shape).passthrough();
  }, [schema]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {},
  });

  // Watch relevant fields for auto-calculation
  const tenantIsSelf = watch('tenant_is_self');
  const buyerIsSelf = watch('buyer_is_self');

  // Auto-fill self fields
  useEffect(() => {
    if (tenantIsSelf === 'SELF' && userProfile) {
      const fullName = [userProfile.first_name, userProfile.middle_name, userProfile.last_name]
        .filter(Boolean)
        .join(' ');
      setValue('tenant_name', fullName);
      setValue('tenant_nida', userProfile.nida_number || '');
    }
  }, [tenantIsSelf, userProfile, setValue]);

  useEffect(() => {
    if (buyerIsSelf === 'SELF' && userProfile) {
      const fullName = [userProfile.first_name, userProfile.middle_name, userProfile.last_name]
        .filter(Boolean)
        .join(' ');
      setValue('buyer_name', fullName);
      setValue('buyer_nida', userProfile.nida_number || '');
    }
  }, [buyerIsSelf, userProfile, setValue]);

  // Reset when profile toggle changes
  useEffect(() => {
    if (useProfileData && userProfile) {
      const mapped: any = {
        first_name: userProfile.first_name,
        middle_name: userProfile.middle_name,
        last_name: userProfile.last_name,
        email: userProfile.email,
        phone: userProfile.phone,
        nida_number: userProfile.nida_number,
        region: userProfile.region,
        district: userProfile.district,
        ward: userProfile.ward,
        street: userProfile.street,
      };
      reset({ ...initialData, ...mapped });
    }
  }, [useProfileData, userProfile, initialData, reset]);

  // File handlers
  const handleGeneralFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map(f => f.name);
      setAttachments(prev => [...prev, ...names]);
    }
  }, []);

  const handleFieldFileChange = useCallback((fieldName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFieldFiles(prev => ({
        ...prev,
        [fieldName]: Array.from(e.target.files!),
      }));
    }
  }, []);

  const removeFieldFile = useCallback((fieldName: string, fileName: string) => {
    setFieldFiles(prev => ({
      ...prev,
      [fieldName]: (prev[fieldName] || []).filter(f => f.name !== fileName),
    }));
  }, []);

  const removeAttachment = useCallback((name: string) => {
    setAttachments(prev => prev.filter(a => a !== name));
  }, []);

  const onFormSubmit = (data: any) => {
    const enrichedData = {
      ...data,
      ...Object.keys(fieldFiles).reduce((acc, key) => {
        acc[key] = fieldFiles[key].map(f => f.name).join(', ');
        return acc;
      }, {} as Record<string, string>),
      ...(applicantType === 'minor' && {
        minor_relation_type: minorRelationType,
        minor_id_type: minorIdType,
        minor_name: minorName || representativeName,
        minor_id_number: minorIdNumber,
        ...(minorRelationType === 'other' && {
          guardian_id_type: guardianIdType,
          guardian_id_number: guardianIdNumber,
          guardian_relationship: guardianRelationship,
        }),
      }),
    };

    const allAttachments = [
      ...attachments,
      ...Object.values(fieldFiles).flat().map(f => f.name),
    ];

    onSubmit(enrichedData, allAttachments, applicantType, applicantType !== 'self' ? representativeName : undefined);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Applicant Type */}
      <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
        <h3 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-600" />
          {lang === 'sw' ? 'Unatuma maombi kwa ajili ya nani?' : 'Who are you applying for?'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['self', 'minor', 'representative'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setApplicantType(type)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                applicantType === type ? "border-emerald-500 bg-emerald-50" : "border-stone-200 hover:border-stone-300"
              )}
            >
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", applicantType === type ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-500")}>
                {type === 'self' && <User className="h-5 w-5" />}
                {type === 'minor' && <Users className="h-5 w-5" />}
                {type === 'representative' && <UserPlus className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <p className="font-bold text-stone-800">
                  {type === 'self' ? (lang === 'sw' ? 'Mimi mwenyewe' : 'Myself') :
                   type === 'minor' ? (lang === 'sw' ? 'Mtoto mdogo' : 'Minor') :
                   (lang === 'sw' ? 'Mtu mwingine' : 'Someone else')}
                </p>
                <p className="text-xs text-stone-500">
                  {type === 'self' ? (lang === 'sw' ? 'Ninaomba kwa niaba yangu' : 'Applying for myself') :
                   type === 'minor' ? (lang === 'sw' ? 'Kwa ajili ya mtoto' : 'For a child under 18') :
                   (lang === 'sw' ? 'Ninaomba kwa niaba ya mtu mwingine' : 'On behalf of someone')}
                </p>
              </div>
            </button>
          ))}
        </div>

        {applicantType !== 'self' && (
          <div className="mt-6 p-4 bg-white rounded-xl border border-stone-200">
            <label className="block text-sm font-bold text-stone-700 mb-2">
              {applicantType === 'minor' 
                ? (lang === 'sw' ? 'Jina la Mtoto' : 'Child Name')
                : (lang === 'sw' ? 'Jina la Mtu Unayemwakilisha' : 'Person You Represent')}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder={lang === 'sw' ? 'Ingiza jina kamili' : 'Enter full name'}
              className="w-full h-12 px-4 rounded-xl border border-stone-200 focus:border-emerald-500 outline-none"
              required
            />
          </div>
        )}
      </div>

      {/* Dynamic Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schema.map((field) => {
          if (field.type === 'header') {
            return <h4 key={field.name} className="col-span-full text-lg font-bold text-stone-800 mt-4">{field.label}</h4>;
          }

          return (
            <div key={field.name} className={cn("flex flex-col gap-2", field.type === 'textarea' && "md:col-span-2")}>
              <label className="text-sm font-semibold text-stone-700">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>

              <Controller
                name={field.name}
                control={control}
                render={({ field: { onChange, value } }) => {
                  if (field.type === 'textarea') {
                    return <textarea onChange={onChange} value={value || ''} placeholder={field.placeholder} title={field.label} aria-label={field.label} className="p-3 border border-stone-200 rounded-xl min-h-24" />;
                  }
                  if (field.type === 'select') {
                    return (
                      <select onChange={onChange} value={value || ''} title={field.label} aria-label={field.label} className="p-3 border border-stone-200 rounded-xl bg-white">
                        <option value="">{lang === 'sw' ? 'Chagua...' : 'Select...'}</option>
                        {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    );
                  }
                  if (field.type === 'checkbox') {
                    return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} title={field.label} aria-label={field.label} className="w-5 h-5" />;
                  }
                  if (field.type === 'file') {
                    return (
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={el => fieldFileRefs.current[field.name] = el}
                          onChange={e => handleFieldFileChange(field.name, e)}
                          className="hidden"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          title={field.label}
                          aria-label={field.label}
                        />
                        <button
                          type="button"
                          onClick={() => fieldFileRefs.current[field.name]?.click()}
                          className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl hover:border-emerald-500 transition-all flex items-center justify-center gap-2"
                        >
                          <Upload className="h-5 w-5" />
                          <span>{lang === 'sw' ? 'Pakia nyaraka' : 'Upload documents'}</span>
                        </button>
                        {(fieldFiles[field.name] || []).map(f => (
                          <div key={f.name} className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg">
                            <span className="truncate">{f.name}</span>
                            <button type="button" onClick={() => removeFieldFile(field.name, f.name)} title={lang === 'sw' ? 'Ondoa faili' : 'Remove file'} aria-label={lang === 'sw' ? 'Ondoa faili' : 'Remove file'} className="text-red-500">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  // Default input
                  return (
                    <input
                      type={field.type}
                      onChange={e => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
                      value={value || ''}
                      placeholder={field.placeholder}
                      title={field.label}
                      aria-label={field.label}
                      disabled={field.disabled}
                      className="p-3 border border-stone-200 rounded-xl focus:border-emerald-500 outline-none"
                    />
                  );
                }}
              />
              {errors[field.name] && <p className="text-xs text-red-500">{(errors[field.name] as any)?.message}</p>}
            </div>
          );
        })}
      </div>

      {/* General Attachments */}
      <div className="pt-6 border-t border-stone-100">
        <label className="text-sm font-bold text-stone-700 mb-3 block">
          {lang === 'sw' ? 'Viambatisho' : 'Attachments'}
        </label>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleGeneralFileChange} title={lang === 'sw' ? 'Ambatisha nyaraka' : 'Attach documents'} aria-label={lang === 'sw' ? 'Ambatisha nyaraka' : 'Attach documents'} />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-stone-300 rounded-2xl hover:border-emerald-500 transition-all flex items-center justify-center gap-2">
          <Upload className="h-5 w-5" />
          <span className="font-semibold">{lang === 'sw' ? 'Ambatisha Nyaraka' : 'Attach Documents'}</span>
        </button>

        {attachments.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((name, i) => (
              <div key={i} className="flex items-center justify-between bg-stone-50 px-4 py-2.5 rounded-xl">
                <span className="truncate text-sm">{name}</span>
                <button type="button" onClick={() => removeAttachment(name)} title={lang === 'sw' ? 'Ondoa kiambatisho' : 'Remove attachment'} aria-label={lang === 'sw' ? 'Ondoa kiambatisho' : 'Remove attachment'} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || (applicantType !== 'self' && !representativeName)}
        className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-400 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all mt-8"
      >
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
          <>
            {lang === 'sw' ? 'Wasilisha Maombi' : 'Submit Application'}
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </button>
    </form>
  );
};