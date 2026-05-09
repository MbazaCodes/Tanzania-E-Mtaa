import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Search, Loader2, Plus, Edit2, Trash2, X, Clock, 
  DollarSign, FileText, ToggleLeft, ToggleRight 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

interface Service {
  id: string;
  name_en: string;
  name_sw: string;
  category: string;
  description_en: string;
  description_sw: string;
  fee: number;
  processing_time_days: number;
  is_active: boolean;
  required_documents: string[];           // JSON array in DB
  form_schema: any;                       // JSON schema for dynamic form
  created_at?: string;
}

const ALLOWED_SERVICE_NAMES = new Set([
  'Residency Certificate',
  'Introduction Letter',
  'Event Permit',
  'Burial Permit',
  'Cheti cha Mkazi',
  'Barua ya Utambulisho',
  'Kibali cha Tukio',
  'Kibali cha Mazishi',
]);

const SERVICE_CATEGORIES = [
  'Residency & Identity', 'Event Permits', 'Burial Services'
];

export function ServiceManagement() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [formData, setFormData] = useState({
    name_en: '',
    name_sw: '',
    category: 'Residency & Identity',
    description_en: '',
    description_sw: '',
    fee: 0,
    processing_time_days: 7,
    is_active: true,
    required_documents: ['National ID', 'Passport Photo'] as string[],
    form_schema: {} as any,
  });

  const isSupabaseConfigured = !import.meta.env.VITE_SUPABASE_URL?.includes('YOUR_SUPABASE_URL');

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Rich demo data based on real Tanzanian services
        const demoServices: Service[] = [
          {
            id: '1',
            name_en: 'Residency Certificate',
            name_sw: 'Cheti cha Mkazi',
            category: 'Residency & Identity',
            description_en: 'Official confirmation of residence for local civic services.',
            description_sw: 'Uthibitisho rasmi wa makazi kwa huduma za kiraia.',
            fee: 5000,
            processing_time_days: 7,
            is_active: true,
            required_documents: ['National ID', 'Proof of Residence'],
            form_schema: { fields: [{ type: 'text', label: 'Occupation', required: true }] },
          },
          {
            id: '2',
            name_en: 'Introduction Letter',
            name_sw: 'Barua ya Utambulisho',
            category: 'Residency & Identity',
            description_en: 'Official introduction letter for schools, banks, and institutions.',
            description_sw: 'Barua rasmi ya utambulisho kwa shule, benki na taasisi.',
            fee: 3000,
            processing_time_days: 3,
            is_active: true,
            required_documents: ['National ID', 'Residency Certificate Number'],
            form_schema: { fields: [{ type: 'select', label: 'Purpose', options: ['Bank', 'School'] }] },
          },
          {
            id: '3',
            name_en: 'Event Permit',
            name_sw: 'Kibali cha Tukio',
            category: 'Event Permits',
            description_en: 'Permit for community events and celebrations.',
            description_sw: 'Kibali cha matukio ya jamii na sherehe.',
            fee: 10000,
            processing_time_days: 5,
            is_active: true,
            required_documents: ['Event Details', 'Venue Information'],
            form_schema: {},
          },
          {
            id: '4',
            name_en: 'Burial Permit',
            name_sw: 'Kibali cha Mazishi',
            category: 'Burial Services',
            description_en: 'Official burial permit for family coordination and notification.',
            description_sw: 'Kibali rasmi cha mazishi kwa uratibu wa familia na taarifa.',
            fee: 2000,
            processing_time_days: 1,
            is_active: true,
            required_documents: ['Death Information', 'Burial Location'],
            form_schema: {},
          },
        ];
        setServices(demoServices);
        return;
      }

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category')
        .order('name_en');

      if (error) throw error;
      setServices((data || []).filter((service) => ALLOWED_SERVICE_NAMES.has(service.name_en) || ALLOWED_SERVICE_NAMES.has(service.name_sw)));
    } catch (error) {
      console.error('Failed to fetch services:', error);
      showToast(lang === 'sw' ? 'Hitilafu kupata huduma' : 'Error fetching services', 'error');
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, lang, showToast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = 
        service.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.name_sw.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description_en.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
      const matchesStatus = 
        filterStatus === 'all' || 
        (filterStatus === 'active' && service.is_active) ||
        (filterStatus === 'inactive' && !service.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [services, searchTerm, filterCategory, filterStatus]);

  const resetForm = () => {
    setFormData({
      name_en: '',
      name_sw: '',
      category: 'Residency & Identity',
      description_en: '',
      description_sw: '',
      fee: 0,
      processing_time_days: 7,
      is_active: true,
      required_documents: ['National ID', 'Passport Photo'],
      form_schema: {},
    });
    setEditingService(null);
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name_en: service.name_en,
        name_sw: service.name_sw,
        category: service.category,
        description_en: service.description_en,
        description_sw: service.description_sw,
        fee: service.fee,
        processing_time_days: service.processing_time_days,
        is_active: service.is_active,
        required_documents: service.required_documents || [],
        form_schema: service.form_schema || {},
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name_en.trim() || !formData.name_sw.trim()) {
      showToast(lang === 'sw' ? 'Jina la huduma linahitajika' : 'Service name is required', 'error');
      return;
    }

    try {
      const payload = {
        name_en: formData.name_en.trim(),
        name_sw: formData.name_sw.trim(),
        category: formData.category,
        description_en: formData.description_en.trim(),
        description_sw: formData.description_sw.trim(),
        fee: formData.fee,
        processing_time_days: formData.processing_time_days,
        is_active: formData.is_active,
        required_documents: formData.required_documents,
        form_schema: formData.form_schema,
      };

      const { error } = editingService
        ? await supabase.from('services').update(payload).eq('id', editingService.id)
        : await supabase.from('services').insert([payload]);

      if (error) throw error;

      showToast(
        editingService 
          ? (lang === 'sw' ? 'Huduma imehaririwa' : 'Service updated successfully')
          : (lang === 'sw' ? 'Huduma imeongezwa' : 'Service added successfully'),
        'success'
      );

      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (err: any) {
      showToast(err.message || 'Save failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'sw' ? 'Unataka kufuta huduma hii?' : 'Delete this service?')) return;

    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;

      setServices(prev => prev.filter(s => s.id !== id));
      showToast(lang === 'sw' ? 'Huduma imefutwa' : 'Service deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const newStatus = !service.is_active;
      const { error } = await supabase
        .from('services')
        .update({ is_active: newStatus })
        .eq('id', service.id);

      if (error) throw error;

      setServices(prev => prev.map(s => 
        s.id === service.id ? { ...s, is_active: newStatus } : s
      ));

      showToast(
        newStatus 
          ? (lang === 'sw' ? 'Huduma imewezeshwa' : 'Service activated')
          : (lang === 'sw' ? 'Huduma imezimwa' : 'Service deactivated'),
        'success'
      );
    } catch (err: any) {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">
            {lang === 'sw' ? 'Usimamizi wa Huduma' : 'Service Management'}
          </h1>
          <p className="text-stone-500">
            {lang === 'sw' ? 'Dhibiti huduma za serikali za mtandaoni' : 'Manage digital government services'}
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-12 rounded-2xl font-bold transition-all"
        >
          <Plus size={20} />
          {lang === 'sw' ? 'Ongeza Huduma' : 'Add New Service'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder={lang === 'sw' ? 'Tafuta huduma...' : 'Search services...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 h-12 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          title={lang === 'sw' ? 'Chuja kwa kategoria' : 'Filter by category'}
          aria-label={lang === 'sw' ? 'Chuja kwa kategoria' : 'Filter by category'}
          className="h-12 px-5 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">{lang === 'sw' ? 'Kategoria Zote' : 'All Categories'}</option>
          {SERVICE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          title={lang === 'sw' ? 'Chuja kwa hali' : 'Filter by status'}
          aria-label={lang === 'sw' ? 'Chuja kwa hali' : 'Filter by status'}
          className="h-12 px-5 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">{lang === 'sw' ? 'Hali Zote' : 'All Status'}</option>
          <option value="active">{lang === 'sw' ? 'Inayofanya kazi' : 'Active'}</option>
          <option value="inactive">{lang === 'sw' ? 'Imezimwa' : 'Inactive'}</option>
        </select>
      </div>

      {/* Services Grid */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-24 text-center text-stone-400">
            {lang === 'sw' ? 'Hakuna huduma zinazolingana' : 'No matching services found'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredServices.map((service) => (
              <motion.div
                key={service.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-lg transition-all flex flex-col"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{service.name_en}</h3>
                    <p className="text-sm text-stone-500 mt-1">{service.name_sw}</p>
                  </div>
                  <div className={`px-3 py-1 text-xs font-bold rounded-full ${service.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {service.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <p className="text-sm text-stone-600 mt-4 line-clamp-2">
                  {lang === 'sw' ? service.description_sw : service.description_en}
                </p>

                <div className="mt-auto pt-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <DollarSign size={16} />
                      <span className="font-bold">TZS {service.fee.toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-amber-600">
                      <Clock size={16} />
                      <span>{service.processing_time_days} {lang === 'sw' ? 'siku' : 'days'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => toggleActive(service)}
                    className={`flex-1 h-11 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${service.is_active ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                  >
                    {service.is_active ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                    {service.is_active ? (lang === 'sw' ? 'Zima' : 'Deactivate') : (lang === 'sw' ? 'Wezesha' : 'Activate')}
                  </button>

                  <button
                    onClick={() => openModal(service)}
                    className="flex-1 h-11 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold text-sm transition-all"
                  >
                    {lang === 'sw' ? 'Hariri' : 'Edit'}
                  </button>

                  <button
                    onClick={() => handleDelete(service.id)}
                    className="h-11 w-11 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl flex items-center justify-center transition-all"
                    title={lang === 'sw' ? 'Futa huduma' : 'Delete service'}
                    aria-label={lang === 'sw' ? 'Futa huduma' : 'Delete service'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">
                    {editingService 
                      ? (lang === 'sw' ? 'Hariri Huduma' : 'Edit Service')
                      : (lang === 'sw' ? 'Ongeza Huduma Mpya' : 'Add New Service')}
                  </h2>
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="text-stone-400 hover:text-stone-600"
                    title={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                    aria-label={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                  >
                    <X size={28} />
                  </button>
                </div>

                {/* Form fields - simplified for brevity but fully functional */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-600 mb-2">Name (English)</label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter service name in English"
                      title="Service name in English"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-600 mb-2">Jina (Kiswahili)</label>
                    <input
                      type="text"
                      value={formData.name_sw}
                      onChange={(e) => setFormData({ ...formData, name_sw: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Andika jina la huduma kwa Kiswahili"
                      title="Jina la huduma kwa Kiswahili"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      title="Service category"
                    >
                      {SERVICE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Fee (TZS)</label>
                    <input
                      type="number"
                      value={formData.fee}
                      onChange={(e) => setFormData({ ...formData, fee: parseInt(e.target.value) || 0 })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter service fee"
                      title="Service fee"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Processing Time (Days)</label>
                    <input
                      type="number"
                      value={formData.processing_time_days}
                      onChange={(e) => setFormData({ ...formData, processing_time_days: parseInt(e.target.value) || 0 })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter processing days"
                      title="Processing time in days"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-600 mb-2">Description (English)</label>
                    <textarea
                      value={formData.description_en}
                      onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                      className="w-full h-24 px-5 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 resize-y"
                      placeholder="Enter service description in English"
                      title="Service description in English"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-600 mb-2">Maelezo (Kiswahili)</label>
                    <textarea
                      value={formData.description_sw}
                      onChange={(e) => setFormData({ ...formData, description_sw: e.target.value })}
                      className="w-full h-24 px-5 py-3 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 resize-y"
                      placeholder="Andika maelezo ya huduma kwa Kiswahili"
                      title="Maelezo ya huduma kwa Kiswahili"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 accent-emerald-600"
                      title="Service is Active"
                      aria-label="Service is Active"
                    />
                    <span className="font-medium">Service is Active</span>
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 h-14 bg-stone-100 hover:bg-stone-200 rounded-2xl font-bold transition-all"
                  >
                    {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all"
                  >
                    {editingService ? (lang === 'sw' ? 'Hifadhi Mabadiliko' : 'Save Changes') : (lang === 'sw' ? 'Ongeza Huduma' : 'Add Service')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}