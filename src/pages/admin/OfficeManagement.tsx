import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Search, Loader2, Plus, Edit2, Trash2, X, MapPin, 
  Phone, Mail, Clock, Users, Globe 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

interface VirtualOffice {
  id: string;
  name_en: string;
  name_sw: string;
  region_id: string;
  district_id: string;
  ward_id?: string;
  address: string;
  phone: string;
  email: string;
  working_hours: string;
  capacity: number;
  is_active: boolean;
  created_at?: string;
  // Joined data
  region?: { name_en: string; name_sw: string };
  district?: { name_en: string; name_sw: string };
  ward?: { name_en: string; name_sw: string };
}

export function OfficeManagement() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [offices, setOffices] = useState<VirtualOffice[]>([]);
  const [locations, setLocations] = useState<any[]>([]); // For region/district/ward dropdowns
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<string>('all');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<VirtualOffice | null>(null);

  const [formData, setFormData] = useState({
    name_en: '',
    name_sw: '',
    region_id: '',
    district_id: '',
    ward_id: '',
    address: '',
    phone: '',
    email: '',
    working_hours: 'Monday - Friday: 08:00 - 16:00',
    capacity: 50,
    is_active: true,
  });

  const isSupabaseConfigured = !import.meta.env.VITE_SUPABASE_URL?.includes('YOUR_SUPABASE_URL');

  const fetchOffices = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        // Demo data
        const demoOffices: VirtualOffice[] = [
          {
            id: '1',
            name_en: 'Kinondoni Municipal Office',
            name_sw: 'Ofisi ya Manispaa ya Kinondoni',
            region_id: '1',
            district_id: '2',
            address: 'Bagamoyo Road, Dar es Salaam',
            phone: '+255 22 123 4567',
            email: 'kinondoni@emtaa.go.tz',
            working_hours: 'Mon-Fri: 08:00-16:00',
            capacity: 120,
            is_active: true,
            region: { name_en: 'Dar es Salaam', name_sw: 'Dar es Salaam' },
            district: { name_en: 'Kinondoni', name_sw: 'Kinondoni' },
          },
        ];
        setOffices(demoOffices);
        return;
      }

      const { data, error } = await supabase
        .from('virtual_offices')
        .select(`
          *,
          region:region_id (name_en, name_sw),
          district:district_id (name_en, name_sw),
          ward:ward_id (name_en, name_sw)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffices(data || []);
    } catch (error) {
      console.error('Failed to fetch offices:', error);
      showToast(lang === 'sw' ? 'Hitilafu kupata ofisi' : 'Error fetching offices', 'error');
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, lang, showToast]);

  const fetchLocations = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) return;

      const { data } = await supabase
        .from('locations')
        .select('id, level, name_en, name_sw')
        .in('level', ['region', 'district', 'ward']);

      setLocations(data || []);
    } catch (e) {
      console.error(e);
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    fetchOffices();
    fetchLocations();
  }, [fetchOffices, fetchLocations]);

  const filteredOffices = useMemo(() => {
    return offices.filter(office => {
      const matchesSearch = 
        office.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        office.name_sw.toLowerCase().includes(searchTerm.toLowerCase()) ||
        office.address.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRegion = filterRegion === 'all' || office.region_id === filterRegion;

      return matchesSearch && matchesRegion;
    });
  }, [offices, searchTerm, filterRegion]);

  const availableRegions = useMemo(() => 
    locations.filter(l => l.level === 'region'), [locations]
  );

  const availableDistricts = useMemo(() => 
    locations.filter(l => l.level === 'district' && 
      (!formData.region_id || l.parent_id === formData.region_id)
    ), [locations, formData.region_id]
  );

  const resetForm = () => {
    setFormData({
      name_en: '',
      name_sw: '',
      region_id: '',
      district_id: '',
      ward_id: '',
      address: '',
      phone: '',
      email: '',
      working_hours: 'Monday - Friday: 08:00 - 16:00',
      capacity: 50,
      is_active: true,
    });
    setEditingOffice(null);
  };

  const openModal = (office?: VirtualOffice) => {
    if (office) {
      setEditingOffice(office);
      setFormData({
        name_en: office.name_en,
        name_sw: office.name_sw,
        region_id: office.region_id,
        district_id: office.district_id,
        ward_id: office.ward_id || '',
        address: office.address,
        phone: office.phone,
        email: office.email,
        working_hours: office.working_hours,
        capacity: office.capacity,
        is_active: office.is_active,
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name_en || !formData.name_sw || !formData.region_id || !formData.district_id) {
      showToast(lang === 'sw' ? 'Tafadhali jaza maelezo muhimu' : 'Please fill required fields', 'error');
      return;
    }

    try {
      const payload = {
        name_en: formData.name_en.trim(),
        name_sw: formData.name_sw.trim(),
        region_id: formData.region_id,
        district_id: formData.district_id,
        ward_id: formData.ward_id || null,
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        working_hours: formData.working_hours,
        capacity: formData.capacity,
        is_active: formData.is_active,
      };

      const { error } = editingOffice
        ? await supabase.from('virtual_offices').update(payload).eq('id', editingOffice.id)
        : await supabase.from('virtual_offices').insert([payload]);

      if (error) throw error;

      showToast(
        editingOffice 
          ? (lang === 'sw' ? 'Ofisi imehaririwa' : 'Office updated successfully')
          : (lang === 'sw' ? 'Ofisi imeongezwa' : 'Office added successfully'),
        'success'
      );

      setShowModal(false);
      resetForm();
      fetchOffices();
    } catch (err: any) {
      showToast(err.message || 'Save failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'sw' ? 'Unataka kufuta ofisi hii?' : 'Delete this office?')) return;

    try {
      const { error } = await supabase.from('virtual_offices').delete().eq('id', id);
      if (error) throw error;

      setOffices(prev => prev.filter(o => o.id !== id));
      showToast(lang === 'sw' ? 'Ofisi imefutwa' : 'Office deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const toggleActive = async (office: VirtualOffice) => {
    try {
      const newStatus = !office.is_active;
      const { error } = await supabase
        .from('virtual_offices')
        .update({ is_active: newStatus })
        .eq('id', office.id);

      if (error) throw error;

      setOffices(prev => prev.map(o => 
        o.id === office.id ? { ...o, is_active: newStatus } : o
      ));

      showToast(
        newStatus 
          ? (lang === 'sw' ? 'Ofisi imewezeshwa' : 'Office activated')
          : (lang === 'sw' ? 'Ofisi imezimwa' : 'Office deactivated'),
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
            {lang === 'sw' ? 'Usimamizi wa Ofisi za Mtandaoni' : 'Virtual Office Management'}
          </h1>
          <p className="text-stone-500">
            {lang === 'sw' ? 'Dhibiti ofisi za serikali za mtandaoni' : 'Manage virtual government offices'}
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-12 rounded-2xl font-bold transition-all"
        >
          <Plus size={20} />
          {lang === 'sw' ? 'Ongeza Ofisi' : 'Add New Office'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input
            type="text"
            placeholder={lang === 'sw' ? 'Tafuta ofisi...' : 'Search offices...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 h-12 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          title={lang === 'sw' ? 'Chuja kwa mkoa' : 'Filter by region'}
          aria-label={lang === 'sw' ? 'Chuja kwa mkoa' : 'Filter by region'}
          className="h-12 px-5 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">{lang === 'sw' ? 'Mikoa Yote' : 'All Regions'}</option>
          {availableRegions.map(r => (
            <option key={r.id} value={r.id}>
              {r.name_en} / {r.name_sw}
            </option>
          ))}
        </select>
      </div>

      {/* Offices Grid / Table */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
          </div>
        ) : filteredOffices.length === 0 ? (
          <div className="py-24 text-center text-stone-400">
            {lang === 'sw' ? 'Hakuna ofisi zinazolingana' : 'No matching offices found'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredOffices.map((office) => (
              <motion.div
                key={office.id}
                whileHover={{ scale: 1.02 }}
                className="bg-white border border-stone-200 rounded-3xl p-6 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{office.name_en}</h3>
                    <p className="text-sm text-stone-500">{office.name_sw}</p>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-xs font-bold ${office.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {office.is_active ? (lang === 'sw' ? 'Inayofanya kazi' : 'Active') : (lang === 'sw' ? 'Imezimwa' : 'Inactive')}
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <MapPin size={18} className="text-stone-400" />
                    <span>{office.address}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-stone-400" />
                    <span>{office.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-stone-400" />
                    <span>{office.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-stone-400" />
                    <span>{office.working_hours}</span>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => toggleActive(office)}
                    className={`flex-1 h-11 rounded-2xl font-bold text-sm transition-all ${office.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                  >
                    {office.is_active ? (lang === 'sw' ? 'Zima' : 'Deactivate') : (lang === 'sw' ? 'Wezesha' : 'Activate')}
                  </button>
                  <button
                    onClick={() => openModal(office)}
                    className="flex-1 h-11 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold text-sm transition-all"
                  >
                    {lang === 'sw' ? 'Hariri' : 'Edit'}
                  </button>
                  <button
                    onClick={() => handleDelete(office.id)}
                    className="h-11 w-11 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl flex items-center justify-center transition-all"
                    title={lang === 'sw' ? 'Futa ofisi' : 'Delete office'}
                    aria-label={lang === 'sw' ? 'Futa ofisi' : 'Delete office'}
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
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between mb-8">
                  <h2 className="text-2xl font-bold">
                    {editingOffice 
                      ? (lang === 'sw' ? 'Hariri Ofisi' : 'Edit Office')
                      : (lang === 'sw' ? 'Ongeza Ofisi Mpya' : 'Add New Office')}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Name (English)</label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter office name in English"
                      title="Office name in English"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Jina (Kiswahili)</label>
                    <input
                      type="text"
                      value={formData.name_sw}
                      onChange={(e) => setFormData({ ...formData, name_sw: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Andika jina la ofisi kwa Kiswahili"
                      title="Jina la ofisi kwa Kiswahili"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Region</label>
                    <select
                      value={formData.region_id}
                      onChange={(e) => setFormData({ ...formData, region_id: e.target.value, district_id: '' })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      title="Select region"
                    >
                      <option value="">Select Region</option>
                      {availableRegions.map(r => (
                        <option key={r.id} value={r.id}>{r.name_en} / {r.name_sw}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">District</label>
                    <select
                      value={formData.district_id}
                      onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      disabled={!formData.region_id}
                      title="Select district"
                    >
                      <option value="">Select District</option>
                      {availableDistricts.map(d => (
                        <option key={d.id} value={d.id}>{d.name_en} / {d.name_sw}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-600 mb-2">Physical Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter physical address"
                      title="Physical address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter phone number"
                      title="Phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter email address"
                      title="Email address"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-600 mb-2">Working Hours</label>
                    <input
                      type="text"
                      value={formData.working_hours}
                      onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. 08:00 - 17:00"
                      title="Working hours"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-600 mb-2">Capacity</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter office capacity"
                      title="Office capacity"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 accent-emerald-600"
                      title="Active Office"
                      aria-label="Active Office"
                    />
                    <span className="font-medium">Active Office</span>
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1 h-14 bg-stone-100 hover:bg-stone-200 rounded-2xl font-bold"
                  >
                    {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold"
                  >
                    {editingOffice ? (lang === 'sw' ? 'Hifadhi Mabadiliko' : 'Save Changes') : (lang === 'sw' ? 'Ongeza Ofisi' : 'Add Office')}
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