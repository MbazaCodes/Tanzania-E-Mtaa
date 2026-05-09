import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, UserProfile } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Search, Building2, MapPin, Shield, Mail, Phone,
  X, CheckCircle2, AlertCircle, Loader2, ArrowRight, Trash2, 
  UserPlus, Edit2, Calendar, BadgeCheck, XCircle, DatabaseZap 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Language } from '@/lib/i18n';
import { useToast } from '@/context/ToastContext';
import { INITIAL_SERVICES } from '@/constants/services';

interface VirtualOffice {
  id: string;
  name: string;
  level: 'region' | 'district';
  region: string;
  district?: string;
}

interface StaffManagementProps {
  lang: Language;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ lang }) => {
  const { showToast } = useToast();

  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [offices, setOffices] = useState<VirtualOffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: '', role: 'staff' as 'staff' | 'admin' });
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [officeLevel, setOfficeLevel] = useState<'region' | 'district'>('region');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Staff Details Modal
  const [selectedStaff, setSelectedStaff] = useState<UserProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editFormData, setEditFormData] = useState({
    role: 'staff' as 'staff' | 'admin',
    region: '',
    district: '',
    officeLevel: 'region' as 'region' | 'district'
  });

  const regions = [
    "Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Tanga", 
    "Morogoro", "Mbeya", "Kilimanjaro", "Iringa", "Kagera",
    "Tabora", "Kigoma", "Shinyanga", "Manyara", "Ruvuma"
  ];

  const getDistrictsForRegion = (region: string): string[] => {
    const districtsMap: Record<string, string[]> = {
      "Dar es Salaam": ["Ilala", "Kinondoni", "Ubungo", "Temeke", "Kigamboni"],
      "Arusha": ["Arusha CC", "Arusha DC", "Meru", "Longido", "Monduli"],
      "Dodoma": ["Dodoma CC", "Bahi", "Chamwino", "Chemba", "Kondoa"],
      "Mwanza": ["Nyamagana", "Ilemela", "Magu", "Kwimba", "Sengerema"],
      "Tanga": ["Tanga CC", "Muheza", "Korogwe", "Lushoto", "Handeni"],
      "Morogoro": ["Morogoro CC", "Morogoro DC", "Kilosa", "Ulanga", "Malinyi"],
      "Mbeya": ["Mbeya CC", "Mbeya DC", "Rungwe", "Kyela", "Mbozi"],
      "Kilimanjaro": ["Moshi CC", "Moshi DC", "Hai", "Siha", "Rombo"],
      "Iringa": ["Iringa CC", "Iringa DC", "Kilolo", "Mufindi"],
      "Kagera": ["Bukoba CC", "Bukoba DC", "Muleba", "Karagwe", "Kyerwa"],
    };
    return districtsMap[region] || ["Central", "North", "South", "East", "West"];
  };

  // Generate virtual offices
  const generateOffices = useCallback(() => {
    const generated: VirtualOffice[] = [];

    regions.forEach((region, rIndex) => {
      generated.push({
        id: `reg-${rIndex}`,
        name: `${region} ${lang === 'sw' ? 'Ofisi ya Mkoa' : 'Regional Office'}`,
        level: 'region',
        region
      });

      getDistrictsForRegion(region).forEach((district, dIndex) => {
        generated.push({
          id: `dist-${rIndex}-${dIndex}`,
          name: `${district} ${lang === 'sw' ? 'Ofisi ya Wilaya' : 'District Office'}`,
          level: 'district',
          region,
          district
        });
      });
    });

    setOffices(generated);
  }, [lang]);

  // Fetch staff
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('role', ['staff', 'admin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (err: any) {
      showToast(err.message || (lang === 'sw' ? 'Hitilafu ya kupata watumishi' : 'Failed to fetch staff'), 'error');
    } finally {
      setLoading(false);
    }
  }, [lang, showToast]);

  useEffect(() => {
    fetchStaff();
    generateOffices();
  }, [fetchStaff, generateOffices]);

  // Filtered staff (memoized for performance)
  const filteredStaff = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return staff.filter(s => 
      `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(term) ||
      (s.email || '').toLowerCase().includes(term) ||
      (s.assigned_region || '').toLowerCase().includes(term)
    );
  }, [staff, searchTerm]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newStaff.email || !/\S+@\S+\.\S+/.test(newStaff.email)) {
      newErrors.email = lang === 'sw' ? 'Barua pepe sahihi inahitajika' : 'Valid email is required';
    }
    if (!selectedRegion) {
      newErrors.region = lang === 'sw' ? 'Mkoa unahitajika' : 'Region is required';
    }
    if (officeLevel === 'district' && !selectedDistrict) {
      newErrors.district = lang === 'sw' ? 'Wilaya inahitajika' : 'District is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create / Update Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const normalizedEmail = newStaff.email.trim().toLowerCase();

      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('users')
          .update({
            role: newStaff.role,
            assigned_region: selectedRegion,
            assigned_district: officeLevel === 'district' ? selectedDistrict : null,
            is_verified: true
          })
          .eq('id', existing.id);

        if (error) throw error;

        showToast(lang === 'sw' ? `Mtumishi amesasishwa kuwa ${newStaff.role}` : `Staff updated to ${newStaff.role}`, 'success');
      } else {
        const { data, error } = await supabase.functions.invoke('create-staff-user', {
          body: {
            email: normalizedEmail,
            role: newStaff.role,
            assigned_region: selectedRegion,
            assigned_district: officeLevel === 'district' ? selectedDistrict : null,
          },
        });

        if (error) throw error;

        showToast(
          lang === 'sw'
            ? `Mtumishi amesajiliwa! Nywila ya default ni ${data.tempPassword}. Atatakiwa kubadili akishaingia.`
            : `Staff created! Default password is ${data.tempPassword}. They must change it after login.`,
          'success'
        );
      }

      setShowAddModal(false);
      resetAddForm();
      fetchStaff();
    } catch (err: any) {
      showToast(err.message || 'Hitilafu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = () => {
    setNewStaff({ email: '', role: 'staff' });
    setSelectedRegion('');
    setSelectedDistrict('');
    setOfficeLevel('region');
    setErrors({});
  };

  // Seed initial services
  const seedServices = async () => {
    if (!confirm(lang === 'sw' ? 'Ingiza huduma za awali?' : 'Seed initial services?')) return;

    setSeeding(true);
    try {
      const { error } = await supabase.from('services').upsert(INITIAL_SERVICES, { onConflict: 'name' });
      if (error) throw error;
      showToast(lang === 'sw' ? 'Huduma zimeingizwa!' : 'Services seeded successfully!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSeeding(false);
    }
  };

  // Delete staff
  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm(lang === 'sw' ? 'Futa mtumishi huyu?' : 'Delete this staff member?')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', staffId);
      if (error) throw error;

      showToast(lang === 'sw' ? 'Mtumishi amefutwa' : 'Staff deleted', 'success');
      setShowDetailsModal(false);
      setSelectedStaff(null);
      fetchStaff();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const openStaffDetails = (staffMember: UserProfile) => {
    setSelectedStaff(staffMember);
    setEditFormData({
      role: staffMember.role as 'staff' | 'admin',
      region: staffMember.assigned_region || '',
      district: staffMember.assigned_district || '',
      officeLevel: staffMember.assigned_district ? 'district' : 'region'
    });
    setEditingRole(false);
    setEditingLocation(false);
    setShowDetailsModal(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedStaff) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: editFormData.role })
        .eq('id', selectedStaff.id);

      if (error) throw error;

      showToast(lang === 'sw' ? 'Wajibu umesasishwa' : 'Role updated', 'success');
      setEditingRole(false);
      fetchStaff();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!selectedStaff) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          assigned_region: editFormData.region,
          assigned_district: editFormData.officeLevel === 'district' ? editFormData.district : null
        })
        .eq('id', selectedStaff.id);

      if (error) throw error;

      showToast(lang === 'sw' ? 'Eneo limesasishwa' : 'Location updated', 'success');
      setEditingLocation(false);
      fetchStaff();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">
            {lang === 'sw' ? 'Usimamizi wa Watumishi' : 'Staff Management'}
          </h2>
          <p className="text-stone-500 text-sm">
            {lang === 'sw' ? 'Sajili na simamia watumishi wa mikoa na wilaya' : 'Register and manage regional & district staff'}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={seedServices}
            disabled={seeding}
            className="flex items-center gap-2 px-6 py-3 bg-stone-100 hover:bg-stone-200 rounded-2xl font-semibold transition-all"
          >
            {seeding ? <Loader2 className="animate-spin" /> : <DatabaseZap size={20} />}
            {lang === 'sw' ? 'Ingiza Huduma' : 'Seed Services'}
          </button>

          <button 
            onClick={() => { resetAddForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold transition-all shadow-lg"
          >
            <Plus size={20} />
            {lang === 'sw' ? 'Ongeza Mtumishi' : 'Add Staff'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
        <input
          type="text"
          placeholder={lang === 'sw' ? 'Tafuta mtumishi au barua pepe...' : 'Search staff or email...'}
          className="w-full pl-11 pr-4 h-12 rounded-2xl border border-stone-200 focus:border-emerald-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 text-left">Mtumishi</th>
              <th className="px-6 py-4 text-left">Ofisi</th>
              <th className="px-6 py-4 text-left">Wajibu</th>
              <th className="px-6 py-4 text-left">Hali</th>
              <th className="px-6 py-4 text-right">Vitendo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin mx-auto h-8 w-8" /></td></tr>
            ) : filteredStaff.length === 0 ? (
              <tr><td colSpan={5} className="py-20 text-center text-stone-400">Hakuna mtumishi aliyepatikana</td></tr>
            ) : (
              filteredStaff.map((s) => (
                <tr 
                  key={s.id} 
                  onClick={() => openStaffDetails(s)}
                  className="hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-600">
                        {(s.first_name?.[0] || 'S')}{(s.last_name?.[0] || 'M')}
                      </div>
                      <div>
                        <p className="font-semibold">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-stone-500">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-stone-400" />
                      {s.assigned_region} {s.assigned_district && `/ ${s.assigned_district}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      s.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {s.role === 'admin' ? (lang === 'sw' ? 'Msimamizi' : 'Admin') : (lang === 'sw' ? 'Mtumishi' : 'Staff')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                      <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteStaff(s.id); }}
                      title={lang === 'sw' ? 'Futa mtumishi' : 'Delete staff member'}
                      aria-label={lang === 'sw' ? 'Futa mtumishi' : 'Delete staff member'}
                      className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col"
            >
              <div className="shrink-0 p-6 border-b flex items-center justify-between bg-stone-50">
                <h3 className="text-xl font-bold">{lang === 'sw' ? 'Sajili Mtumishi Mpya' : 'Add New Staff'}</h3>
                <button onClick={() => setShowAddModal(false)} title={lang === 'sw' ? 'Funga dirisha la usajili' : 'Close add staff dialog'} aria-label={lang === 'sw' ? 'Funga dirisha la usajili' : 'Close add staff dialog'}><X size={24} className="text-stone-400" /></button>
              </div>

              <form onSubmit={handleCreateStaff} className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Barua Pepe</label>
                  <input
                    type="email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full h-12 px-4 rounded-2xl border border-stone-200 focus:border-emerald-500 outline-none"
                    placeholder="staff@example.com"
                    required
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Region & Office Level */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Mkoa</label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => { setSelectedRegion(e.target.value); setSelectedDistrict(''); }}
                      title={lang === 'sw' ? 'Chagua mkoa' : 'Select region'}
                      aria-label={lang === 'sw' ? 'Chagua mkoa' : 'Select region'}
                      className="w-full h-12 px-4 rounded-2xl border border-stone-200 focus:border-emerald-500"
                    >
                      <option value="">Chagua Mkoa</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Ngazi</label>
                    <div className="flex gap-3 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={officeLevel === 'region'} onChange={() => setOfficeLevel('region')} />
                        <span>Mkoa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={officeLevel === 'district'} onChange={() => setOfficeLevel('district')} />
                        <span>Wilaya</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* District (conditional) */}
                {officeLevel === 'district' && selectedRegion && (
                  <div>
                    <label className="text-sm font-medium text-stone-600 block mb-1">Wilaya</label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      title={lang === 'sw' ? 'Chagua wilaya' : 'Select district'}
                      aria-label={lang === 'sw' ? 'Chagua wilaya' : 'Select district'}
                      className="w-full h-12 px-4 rounded-2xl border border-stone-200 focus:border-emerald-500"
                    >
                      <option value="">Chagua Wilaya</option>
                      {getDistrictsForRegion(selectedRegion).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Role */}
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Wajibu</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as 'staff' | 'admin' })}
                    title={lang === 'sw' ? 'Chagua wajibu' : 'Select role'}
                    aria-label={lang === 'sw' ? 'Chagua wajibu' : 'Select role'}
                    className="w-full h-12 px-4 rounded-2xl border border-stone-200 focus:border-emerald-500"
                  >
                    <option value="staff">Mtumishi</option>
                    <option value="admin">Msimamizi</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 h-12 bg-stone-100 hover:bg-stone-200 rounded-2xl font-semibold"
                  >
                    Ghairi
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <UserPlus />}
                    Sajili
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col"
            >
              {/* Header with avatar */}
              <div className="shrink-0 p-6 bg-linear-to-r from-emerald-50 to-blue-50 border-b">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold">
                    {selectedStaff.first_name?.[0]}{selectedStaff.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">{selectedStaff.first_name} {selectedStaff.last_name}</h3>
                    <p className="text-stone-500">{selectedStaff.email}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-8 overflow-y-auto flex-1">
                {/* Role Section */}
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="font-medium text-stone-600">Wajibu</span>
                    <button onClick={() => setEditingRole(!editingRole)} title={lang === 'sw' ? 'Hariri wajibu' : 'Edit role'} aria-label={lang === 'sw' ? 'Hariri wajibu' : 'Edit role'} className="text-emerald-600">
                      <Edit2 size={16} />
                    </button>
                  </div>
                  {editingRole ? (
                    <div className="flex gap-3">
                      <select
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                        title={lang === 'sw' ? 'Badili wajibu' : 'Change role'}
                        aria-label={lang === 'sw' ? 'Badili wajibu' : 'Change role'}
                        className="flex-1 h-11 rounded-2xl border px-4"
                      >
                        <option value="staff">Mtumishi</option>
                        <option value="admin">Msimamizi</option>
                      </select>
                      <button onClick={handleUpdateRole} disabled={updating} className="px-6 bg-emerald-600 text-white rounded-2xl">
                        {updating ? <Loader2 className="animate-spin" /> : 'Hifadhi'}
                      </button>
                    </div>
                  ) : (
                    <span className={cn("px-4 py-2 rounded-2xl text-sm font-bold", 
                      selectedStaff.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                    )}>
                      {selectedStaff.role === 'admin' ? 'Msimamizi' : 'Mtumishi'}
                    </span>
                  )}
                </div>

                {/* Location Section */}
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="font-medium text-stone-600">Eneo / Ofisi</span>
                    <button onClick={() => setEditingLocation(!editingLocation)} title={lang === 'sw' ? 'Hariri eneo la kazi' : 'Edit work location'} aria-label={lang === 'sw' ? 'Hariri eneo la kazi' : 'Edit work location'} className="text-emerald-600">
                      <Edit2 size={16} />
                    </button>
                  </div>
                  {editingLocation ? (
                    /* Location editing form - similar to add modal */
                    <div className="space-y-4">
                      {/* ... simplified location editor ... */}
                      <button onClick={handleUpdateLocation} className="w-full h-11 bg-emerald-600 text-white rounded-2xl">Hifadhi Eneo</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-stone-700">
                      <MapPin size={20} />
                      <span>
                        {selectedStaff.assigned_region} 
                        {selectedStaff.assigned_district && ` / ${selectedStaff.assigned_district}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 p-6 border-t flex gap-3">
                <button onClick={() => setShowDetailsModal(false)} className="flex-1 h-12 bg-stone-100 rounded-2xl font-semibold">Funga</button>
                <button onClick={() => handleDeleteStaff(selectedStaff.id)} className="flex-1 h-12 bg-red-50 text-red-600 rounded-2xl font-semibold">Futa Mtumishi</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};