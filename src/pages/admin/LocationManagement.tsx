import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Search, Loader2, Plus, Edit2, Trash2, X, Check, Globe 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';

interface Location {
  id: string;
  level: 'region' | 'district' | 'ward' | 'street';
  name_en: string;
  name_sw: string;
  parent_id: string | null;
  code?: string;
  created_at?: string;
}

const TZ_GEO_API = 'https://tzgeodata.vercel.app';
const LEVEL_LABELS: Record<string, { en: string; sw: string }> = {
  region: { en: 'Regions', sw: 'Mikoa' },
  district: { en: 'Districts', sw: 'Wilaya' },
  ward: { en: 'Wards', sw: 'Kata' },
  street: { en: 'Streets', sw: 'Mtaa' }
};

export function LocationManagement() {
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState<any[]>([]);
  const [apiSearching, setApiSearching] = useState(false);

  const [selectedLevel, setSelectedLevel] = useState<'region' | 'district' | 'ward' | 'street'>('region');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [formData, setFormData] = useState({ name_en: '', name_sw: '', code: '' });

  const isSupabaseConfigured = !import.meta.env.VITE_SUPABASE_URL?.includes('YOUR_SUPABASE_URL');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Real API Search
  const searchApi = useCallback(async (query: string) => {
    if (query.length < 2) {
      setApiSearchResults([]);
      return;
    }

    setApiSearching(true);
    try {
      const responses = await Promise.allSettled([
        fetch(`${TZ_GEO_API}/regions?search=${encodeURIComponent(query)}`),
        fetch(`${TZ_GEO_API}/districts?search=${encodeURIComponent(query)}`),
        fetch(`${TZ_GEO_API}/wards?search=${encodeURIComponent(query)}`)
      ]);

      let combined: any[] = [];

      responses.forEach((res, index) => {
        if (res.status === 'fulfilled' && res.value.ok) {
          const level = index === 0 ? 'region' : index === 1 ? 'district' : 'ward';
          res.value.json().then((data: any[]) => {
            combined = [
              ...combined,
              ...data.map(item => ({
                ...item,
                level,
                name_en: item.name || item.name_en,
                name_sw: item.name_sw || item.name
              }))
            ];
          });
        }
      });

      // Wait a bit for promises and limit results
      setTimeout(() => {
        setApiSearchResults(combined.slice(0, 12));
      }, 100);
    } catch (err) {
      console.warn('TZ Geo API unavailable, falling back to local data');
      setApiSearchResults([]);
    } finally {
      setApiSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearch) searchApi(debouncedSearch);
    else setApiSearchResults([]);
  }, [debouncedSearch, searchApi]);

  // Fetch local locations
  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        const demo: Location[] = [
          { id: '1', level: 'region', name_en: 'Dar es Salaam', name_sw: 'Dar es Salaam', parent_id: null, code: 'DSM' },
          { id: '2', level: 'district', name_en: 'Kinondoni', name_sw: 'Kinondoni', parent_id: '1', code: 'KND' },
          { id: '3', level: 'ward', name_en: 'Mbezi', name_sw: 'Mbezi', parent_id: '2', code: 'MBZ' },
          { id: '4', level: 'street', name_en: 'Mbezi Beach', name_sw: 'Mbezi Beach', parent_id: '3', code: 'MBB' },
        ];
        setLocations(demo);
        return;
      }

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('level', { ascending: true })
        .order('name_en');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error(error);
      showToast(lang === 'sw' ? 'Hitilafu kupata maeneo' : 'Error loading locations', 'error');
    } finally {
      setLoading(false);
    }
  }, [isSupabaseConfigured, lang, showToast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const filteredLocations = useMemo(() => {
    return locations
      .filter(l => l.level === selectedLevel)
      .filter(l => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return l.name_en.toLowerCase().includes(q) || 
               l.name_sw.toLowerCase().includes(q) || 
               (l.code && l.code.toLowerCase().includes(q));
      });
  }, [locations, selectedLevel, searchTerm]);

  const availableParents = useMemo(() => {
    const map: Record<string, string> = { district: 'region', ward: 'district', street: 'ward' };
    const pLevel = map[selectedLevel];
    return pLevel ? locations.filter(l => l.level === pLevel) : [];
  }, [locations, selectedLevel]);

  const resetForm = () => {
    setFormData({ name_en: '', name_sw: '', code: '' });
    setEditingLocation(null);
  };

  const openAddModal = () => { resetForm(); setShowAddModal(true); };

  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setFormData({ name_en: loc.name_en, name_sw: loc.name_sw, code: loc.code || '' });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.name_en.trim() || !formData.name_sw.trim()) {
      showToast(lang === 'sw' ? 'Jina linahitajika kwa Kiingereza na Kiswahili' : 'Both names are required', 'error');
      return;
    }

    try {
      const payload = {
        level: selectedLevel,
        name_en: formData.name_en.trim(),
        name_sw: formData.name_sw.trim(),
        code: formData.code.trim() || null,
        parent_id: selectedParentId || null,
      };

      const { error } = editingLocation 
        ? await supabase.from('locations').update(payload).eq('id', editingLocation.id)
        : await supabase.from('locations').insert([payload]);

      if (error) throw error;

      showToast(
        editingLocation 
          ? (lang === 'sw' ? 'Eneo limehaririwa kikamilifu' : 'Location updated successfully')
          : (lang === 'sw' ? 'Eneo limeongezwa' : 'Location added successfully'),
        'success'
      );

      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      fetchLocations();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'sw' ? 'Unataka kufuta eneo hili?' : 'Delete this location permanently?')) return;

    try {
      const { error } = await supabase.from('locations').delete().eq('id', id);
      if (error) throw error;

      setLocations(prev => prev.filter(l => l.id !== id));
      showToast(lang === 'sw' ? 'Eneo limefutwa' : 'Location deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const importFromApi = async (item: any) => {
    try {
      const payload = {
        level: item.level as any,
        name_en: item.name_en || item.name,
        name_sw: item.name_sw || item.name,
        code: item.code || null,
        parent_id: null,
      };

      const { error } = await supabase.from('locations').insert([payload]);
      if (error) throw error;

      showToast('âœ… Imported from Tanzania Geo API', 'success');
      fetchLocations();
      setApiSearchResults([]);
      setSearchTerm('');
    } catch (err: any) {
      showToast('Import failed (may already exist)', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-stone-900">
            {lang === 'sw' ? 'Usimamizi wa Maeneo' : 'Location Management'}
          </h1>
          <p className="text-stone-500 flex items-center gap-2">
            <Globe size={18} /> Real-time search powered by Tanzania Geo API
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-6 h-12 rounded-2xl font-bold transition-all"
        >
          <Plus size={20} /> {lang === 'sw' ? 'Ongeza Eneo' : 'Add New Location'}
        </button>
      </div>

      {/* Level Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-4">
        {(['region', 'district', 'ward', 'street'] as const).map((level) => (
          <button
            key={level}
            onClick={() => { setSelectedLevel(level); setSelectedParentId(null); }}
            className={`px-6 py-3 rounded-2xl font-bold transition-all ${
              selectedLevel === level 
                ? 'bg-emerald-600 text-white shadow' 
                : 'bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {LEVEL_LABELS[level][lang as 'en' | 'sw']}
          </button>
        ))}
      </div>

      {/* Search Bar with Live API Results */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400" size={22} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === 'sw' ? 'Tafuta mkoa, wilaya au kata...' : 'Search regions, districts, wards... (TZ Geo API)'}
            className="w-full pl-14 pr-5 h-14 bg-white border border-stone-200 rounded-3xl text-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {apiSearching && <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-emerald-600" size={22} />}
        </div>

        <AnimatePresence>
          {apiSearchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute z-50 mt-3 w-full bg-white rounded-3xl shadow-2xl border border-stone-100 max-h-105 overflow-auto py-2"
            >
              {apiSearchResults.map((item, i) => (
                <div
                  key={i}
                  onClick={() => importFromApi(item)}
                  className="px-6 py-4 hover:bg-emerald-50 cursor-pointer flex justify-between items-center border-b last:border-0"
                >
                  <div>
                    <div className="font-bold text-stone-900">{item.name_en || item.name}</div>
                    <div className="text-sm text-stone-500">{item.name_sw || ''} â€¢ {item.level?.toUpperCase()}</div>
                  </div>
                  <div className="text-emerald-600 font-bold flex items-center gap-1 text-sm">
                    <Globe size={16} /> Import
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Parent Filter (for sub-levels) */}
      {selectedLevel !== 'region' && availableParents.length > 0 && (
        <select
          value={selectedParentId || ''}
          onChange={(e) => setSelectedParentId(e.target.value || null)}
          title={lang === 'sw' ? 'Chuja kwa mzazi' : 'Filter by parent location'}
          aria-label={lang === 'sw' ? 'Chuja kwa mzazi' : 'Filter by parent location'}
          className="w-full sm:w-auto h-12 px-5 bg-white border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{lang === 'sw' ? 'Maeneo yote ya mzazi' : 'All Parents'}</option>
          {availableParents.map(p => (
            <option key={p.id} value={p.id}>
              {p.name_en} / {p.name_sw}
            </option>
          ))}
        </select>
      )}

      {/* Locations Table */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="py-24 text-center text-stone-400">
            {lang === 'sw' ? 'Hakuna maeneo yanayolingana' : 'No matching locations found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-bold uppercase text-stone-500">Name (EN / SW)</th>
                  <th className="px-8 py-5 text-left text-xs font-bold uppercase text-stone-500">Code</th>
                  <th className="px-8 py-5 text-left text-xs font-bold uppercase text-stone-500">Parent</th>
                  <th className="px-8 py-5 text-right text-xs font-bold uppercase text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredLocations.map((loc) => {
                  const parent = locations.find(l => l.id === loc.parent_id);
                  return (
                    <tr key={loc.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold">{loc.name_en}</div>
                        <div className="text-sm text-stone-500">{loc.name_sw}</div>
                      </td>
                      <td className="px-8 py-6 font-mono text-stone-600">{loc.code || 'â€”'}</td>
                      <td className="px-8 py-6 text-sm text-stone-600">
                        {parent ? `${parent.name_en} / ${parent.name_sw}` : 'â€”'}
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(loc)}
                          className="p-3 hover:bg-emerald-50 text-emerald-600 rounded-2xl transition-colors"
                          title={lang === 'sw' ? 'Hariri eneo' : 'Edit location'}
                          aria-label={lang === 'sw' ? 'Hariri eneo' : 'Edit location'}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(loc.id)}
                          className="p-3 hover:bg-red-50 text-red-600 rounded-2xl transition-colors"
                          title={lang === 'sw' ? 'Futa eneo' : 'Delete location'}
                          aria-label={lang === 'sw' ? 'Futa eneo' : 'Delete location'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">
                    {showEditModal 
                      ? (lang === 'sw' ? 'Hariri Eneo' : 'Edit Location')
                      : (lang === 'sw' ? 'Ongeza Eneo Jipya' : 'Add New Location')}
                  </h2>
                  <button
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                    className="text-stone-400 hover:text-stone-700"
                    title={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                    aria-label={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
                  >
                    <X size={28} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600">Name in English</label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter English name"
                      title="Name in English"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600">Jina kwa Kiswahili</label>
                    <input
                      type="text"
                      value={formData.name_sw}
                      onChange={(e) => setFormData({ ...formData, name_sw: e.target.value })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Andika jina kwa Kiswahili"
                      title="Jina kwa Kiswahili"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-stone-600">Code (Optional)</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full h-12 px-5 border border-stone-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-mono"
                      placeholder="DSM"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button
                    onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }}
                    className="flex-1 h-14 bg-stone-100 hover:bg-stone-200 rounded-2xl font-bold transition-all"
                  >
                    {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all"
                  >
                    {showEditModal ? (lang === 'sw' ? 'Hifadhi' : 'Save Changes') : (lang === 'sw' ? 'Ongeza' : 'Add Location')}
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