import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, CheckCircle2, Building2, MapPin, RefreshCw, LogOut, Camera, Loader2, 
  Upload, Edit2, X, Save, AlertCircle, Clock, Shield, Eye, EyeOff, 
  Plus, Download, Trash2, FileText, Award 
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { InfoItem } from '@/components/ui/InfoItem';
import { TANZANIA_ADDRESS_DATA } from '@/lib/addressData';

interface Document {
  id: string;
  document_category: 'id' | 'certificate' | 'support';
  document_name: string;
  document_url: string;
  file_type?: string | null;
  uploaded_at: string;
  verified: boolean;
}

// Document Categories & Types
const DOCUMENT_CATEGORIES = [
  { value: 'id', label: { en: 'ID Documents', sw: 'Vitambulisho' }, icon: FileText },
  { value: 'certificate', label: { en: 'Certificates', sw: 'Vyeti' }, icon: Award },
  { value: 'support', label: { en: 'Support Documents', sw: 'Nyaraka za Msaada' }, icon: FileText },
];

const DOCUMENT_TYPES = {
  id: ['nida_card', 'passport', 'voter_id', 'driving_license', 'zanzibar_id', 'birth_certificate'],
  certificate: ['education_certificate', 'professional_certificate', 'marriage_certificate', 'death_certificate', 'award_certificate', 'other_certificate'],
  support: ['proof_of_residence', 'employment_letter', 'bank_statement', 'utility_bill', 'recommendation_letter', 'police_clearance', 'other_document'],
};

const ALLOWED_DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

interface ProfileProps { }

export function Profile() {
  const { user, signOut, refreshProfile } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'documents'>('personal');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedDocCategory, setSelectedDocCategory] = useState<'id' | 'certificate' | 'support'>('id');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [documentUploading, setDocumentUploading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    phone: '',
    alternative_phone: '',
    region: '',
    district: '',
    ward: '',
    street: '',
    house_number: '',
    // Add other fields as needed from your original form
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile & documents
  const fetchProfileData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          middle_name: data.middle_name || '',
          last_name: data.last_name || '',
          gender: data.gender || '',
          date_of_birth: data.date_of_birth || '',
          phone: data.phone || '',
          alternative_phone: data.alternative_phone || '',
          region: data.region || '',
          district: data.district || '',
          ward: data.ward || '',
          street: data.street || '',
          house_number: data.house_number || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      showToast(lang === 'sw' ? 'Hitilafu kupata wasifu' : 'Failed to load profile', 'error');
    }
  }, [user?.id, lang, showToast]);

  const fetchDocuments = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfileData();
    fetchDocuments();
  }, [fetchProfileData, fetchDocuments]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchProfileData(), fetchDocuments()]);
    setTimeout(() => setIsRefreshing(false), 600);
    showToast(lang === 'sw' ? 'Wasifu umesasishwa' : 'Profile refreshed', 'success');
  }, [fetchProfileData, fetchDocuments, lang, showToast]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setIsEditing(false);
      showToast(lang === 'sw' ? 'Wasifu umehifadhiwa' : 'Profile saved successfully', 'success');
    } catch (err) {
      console.error('Save error:', err);
      showToast(lang === 'sw' ? 'Imeshindwa kuhifadhi' : 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocType) return;

    if (file.size > MAX_DOCUMENT_SIZE) {
      showToast(lang === 'sw' ? 'Faili ni kubwa sana. Kiwango cha juu ni 10MB' : 'File is too large. Max 10MB', 'error');
      return;
    }

    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      showToast(lang === 'sw' ? 'Aina ya faili hairuhusiwi' : 'File type not allowed', 'error');
      return;
    }

    setDocumentUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('user_documents').insert({
        user_id: user?.id,
        document_type: selectedDocType,
        document_category: selectedDocCategory,
        document_name: file.name,
        document_url: publicUrl,
        file_type: file.type,
        verified: false,
      });

      if (dbError) throw dbError;

      showToast(lang === 'sw' ? 'Nyaraka imepakiwa' : 'Document uploaded successfully', 'success');
      fetchDocuments();
      setShowDocumentUpload(false);
      setSelectedDocType('');
    } catch (err) {
      console.error('Upload error:', err);
      showToast(lang === 'sw' ? 'Imeshindwa kupakia nyaraka' : 'Failed to upload document', 'error');
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm(lang === 'sw' ? 'Futa nyaraka hii?' : 'Delete this document?')) return;

    try {
      const { error } = await supabase
        .from('user_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== docId));
      showToast(lang === 'sw' ? 'Nyaraka imefutwa' : 'Document deleted', 'success');
    } catch (err) {
      showToast(lang === 'sw' ? 'Imeshindwa kufuta' : 'Failed to delete', 'error');
    }
  };

  const districts = useMemo(() => {
    if (!formData.region) return [];
    return TANZANIA_ADDRESS_DATA.find(r => r.name === formData.region)?.districts.map(d => d.name) || [];
  }, [formData.region]);

  const wards = useMemo(() => {
    if (!formData.region || !formData.district) return [];
    return TANZANIA_ADDRESS_DATA
      .find(r => r.name === formData.region)
      ?.districts.find(d => d.name === formData.district)?.wards || [];
  }, [formData.region, formData.district]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            {lang === 'sw' ? 'Wasifu Wangu' : 'My Profile'}
          </h1>
          <p className="text-stone-500 mt-1">
            {lang === 'sw' ? 'Dhibiti taarifa zako za kibinafsi' : 'Manage your personal information'}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-stone-200 rounded-xl font-medium hover:bg-stone-50 transition-all disabled:opacity-70"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            {lang === 'sw' ? 'Sasisha' : 'Refresh'}
          </button>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all"
            >
              <Edit2 size={18} />
              {lang === 'sw' ? 'Hariri' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        {(['personal', 'address', 'documents'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-4 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab === 'personal' && (lang === 'sw' ? 'Taarifa za Kibinafsi' : 'Personal Info')}
            {tab === 'address' && (lang === 'sw' ? 'Anwani' : 'Address')}
            {tab === 'documents' && (lang === 'sw' ? 'Nyaraka' : 'Documents')}
          </button>
        ))}
      </div>

      {/* Personal Info Tab */}
      {activeTab === 'personal' && (
        <div className="bg-white rounded-3xl p-8 border border-stone-100">
          {/* Form fields here - simplified for brevity, add all your fields similarly */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-2">Jina la Kwanza</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                disabled={!isEditing}
                aria-label={lang === 'sw' ? 'Jina la kwanza' : 'First name'}
                className="w-full h-12 px-4 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50"
                placeholder={lang === 'sw' ? 'Andika jina la kwanza' : 'Enter first name'}
                title={lang === 'sw' ? 'Jina la kwanza' : 'First name'}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 block mb-2">
                {lang === 'sw' ? 'Barua Pepe' : 'Email'}
              </label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                aria-label={lang === 'sw' ? 'Barua pepe ya mtumiaji' : 'User email'}
                className="w-full h-12 px-4 border border-stone-200 rounded-2xl bg-stone-50 text-stone-600"
                placeholder={lang === 'sw' ? 'Hakuna barua pepe' : 'No email available'}
                title={lang === 'sw' ? 'Barua pepe ya mtumiaji' : 'User email'}
              />
            </div>
            {/* Add other fields similarly */}
          </div>

          {isEditing && (
            <div className="flex gap-4 mt-10">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-70"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {lang === 'sw' ? 'Hifadhi Mabadiliko' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-stone-100 text-stone-700 py-4 rounded-2xl font-bold hover:bg-stone-200"
              >
                {lang === 'sw' ? 'Ghairi' : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <FileText className="text-emerald-600" />
              {lang === 'sw' ? 'Nyaraka Zangu' : 'My Documents'}
            </h3>
            <button
              onClick={() => setShowDocumentUpload(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700"
            >
              <Plus size={20} />
              {lang === 'sw' ? 'Pakia Nyaraka' : 'Upload Document'}
            </button>
          </div>

          {/* Upload Form */}
          <AnimatePresence>
            {showDocumentUpload && (
              <motion.div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-8">
                {/* Document upload UI - category, type, file input */}
                <input
                  ref={documentInputRef}
                  type="file"
                  accept={ALLOWED_DOCUMENT_TYPES.join(',')}
                  onChange={handleDocumentUpload}
                  className="hidden"
                  title={lang === 'sw' ? 'Chagua nyaraka ya kupakia' : 'Choose a document to upload'}
                />
                {/* ... rest of upload form ... */}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Documents List */}
          {DOCUMENT_CATEGORIES.map((category) => {
            const catDocs = documents.filter(d => d.document_category === category.value);
            const Icon = category.icon;

            return (
              <div key={category.value} className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2 text-lg">
                  <Icon size={22} className="text-emerald-600" />
                  {category.label[lang === 'sw' ? 'sw' : 'en']}
                  <span className="text-sm text-stone-400">({catDocs.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catDocs.map(doc => (
                    <div key={doc.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex gap-4">
                      <div className="w-14 h-14 bg-stone-100 rounded-xl shrink-0 flex items-center justify-center">
                        {doc.file_type?.includes('pdf') ? 'ðŸ“„' : 'ðŸ–¼ï¸'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.document_name}</p>
                        <p className="text-xs text-stone-500 mt-1">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                        {doc.verified ? (
                          <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">Imethibitishwa</span>
                        ) : (
                          <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">Inasubiri</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                          title={lang === 'sw' ? 'Fungua au pakua nyaraka' : 'Open or download document'}
                          aria-label={lang === 'sw' ? 'Fungua au pakua nyaraka' : 'Open or download document'}
                        >
                          <Download size={20} />
                        </a>
                        {!doc.verified && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-red-500 hover:text-red-600"
                            title={lang === 'sw' ? 'Futa nyaraka' : 'Delete document'}
                            aria-label={lang === 'sw' ? 'Futa nyaraka' : 'Delete document'}
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logout Button */}
      <div className="pt-8 border-t border-stone-200">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-600 hover:bg-red-100 py-4 rounded-2xl font-medium transition-colors"
        >
          <LogOut size={22} />
          {lang === 'sw' ? 'Ondoka' : 'Sign Out'}
        </button>
      </div>
    </motion.div>
  );
}