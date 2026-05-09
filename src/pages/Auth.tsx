import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { TANZANIA_LOGO_URL } from '@/constants/services';
import { TANZANIA_ADDRESS_DATA } from '@/lib/addressData';
import { COUNTRIES } from '@/constants/countries';

interface AuthProps {
  mode: 'login' | 'signup';
  onClose: () => void;
  setMode: (mode: 'login' | 'signup') => void;
  isDiaspora?: boolean;
}

const ALTERNATIVE_ID_OPTIONS = [
  { value: 'INEC', label: 'INEC' },
  { value: 'PASSPORT', label: 'Passport Number' },
  { value: 'NHIF', label: 'NHIF' },
  { value: 'TRA_TIN', label: 'TRA TIN' },
  { value: 'EDUCATION_ID', label: 'Education ID' },
];

export function Auth({ mode, onClose, setMode, isDiaspora = false }: AuthProps) {
  const { fetchUserProfile } = useAuth();
  const { lang } = useLanguage();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);

  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup Form
  const [regStep, setRegStep] = useState(1);
  const [nidaVerifying, setNidaVerifying] = useState(false);
  const [nidaVerified, setNidaVerified] = useState(false);
  const [nidaError, setNidaError] = useState<string | null>(null);

  const [regForm, setRegForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    sex: 'Me',
    nationality: 'Mtanzania',
    nidaNumber: '',
    country: isDiaspora ? '' : 'Tanzania',
    region: '',
    district: '',
    ward: '',
    street: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    isDiaspora: isDiaspora,
    passportNumber: '',
    hasNida: true,
    idType: '',
    idNumber: '',
  });

  const updateRegForm = (key: string, value: any) => {
    setRegForm(prev => ({ ...prev, [key]: value }));
  };

  const normalizeEmail = (value: string) => value.trim().toLowerCase();

  const getAuthErrorMessage = (err: any, fallback: string) => {
    const message = String(err?.message || '').toLowerCase();
    const code = String(err?.code || '').toLowerCase();

    if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
      return lang === 'sw'
        ? 'Barua pepe yako bado haijathibitishwa.'
        : 'Your email address is not confirmed yet.';
    }

    if (message.includes('invalid login credentials') || code === 'invalid_credentials' || code === 'invalid_grant') {
      return lang === 'sw'
        ? 'Barua pepe au nywila si sahihi.'
        : 'Incorrect email or password.';
    }

    if (err?.status === 400) {
      return lang === 'sw'
        ? 'Taarifa za kuingia si sahihi. Hakikisha barua pepe na nywila ni sahihi.'
        : 'Login details were rejected. Check that your email and password are correct.';
    }

    return err?.message || fallback;
  };

  const handleHasNidaChange = (hasNida: boolean) => {
    setRegForm((prev) => ({
      ...prev,
      hasNida,
      nidaNumber: hasNida ? prev.nidaNumber : '',
      idType: hasNida ? '' : prev.idType,
      idNumber: hasNida ? '' : prev.idNumber,
      passportNumber: hasNida ? prev.passportNumber : prev.idType === 'PASSPORT' ? prev.idNumber : prev.passportNumber,
    }));

    setNidaVerified(false);
    setNidaError(null);
  };

  // Format NIDA with dashes
  const formatNIDA = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 20);
    return digits.replace(/(\d{4})(?=\d)/g, '$1-');
  };

  // NIDA Verification (Simulated for demo)
  const verifyNIDA = async () => {
    const cleanNida = regForm.nidaNumber.replace(/-/g, '');
    if (cleanNida.length !== 20) {
      setNidaError(lang === 'sw' ? 'Namba ya NIDA lazima iwe na tarakimu 20' : 'NIDA number must be 20 digits');
      return;
    }

    setNidaVerifying(true);
    setNidaError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      // Demo: Accept any 20-digit NIDA starting with 1
      if (!cleanNida.startsWith('1')) {
        throw new Error(lang === 'sw' ? 'Namba ya NIDA haijapatikana' : 'NIDA number not found');
      }

      setNidaVerified(true);
      updateRegForm('firstName', 'JUMA');
      updateRegForm('middleName', 'ABDALLAH');
      updateRegForm('lastName', 'MSUYA');
      updateRegForm('sex', 'Me');

      showToast(lang === 'sw' ? 'NIDA imethibitishwa' : 'NIDA verified successfully', 'success');
    } catch (err: any) {
      setNidaError(err.message);
    } finally {
      setNidaVerifying(false);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = password;

    if (!normalizedEmail || !normalizedPassword) {
      showToast(lang === 'sw' ? 'Jaza barua pepe na nywila' : 'Enter your email and password', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error) throw error;

      if (data.user) {
        await fetchUserProfile(data.user.id, data.user);
        showToast(lang === 'sw' ? 'Karibu tena!' : 'Welcome back!', 'success');
        setTimeout(onClose, 300);
      }
    } catch (err: any) {
      showToast(getAuthErrorMessage(err, 'Login failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanNida = regForm.nidaNumber.replace(/-/g, '');
    const trimmedAltId = regForm.idNumber.trim();
    const normalizedSignupEmail = normalizeEmail(regForm.email);
    const passportNumber = regForm.idType === 'PASSPORT'
      ? trimmedAltId
      : regForm.passportNumber.trim() || null;
    const profilePayload = {
      first_name: regForm.firstName.toUpperCase(),
      middle_name: regForm.middleName.toUpperCase(),
      last_name: regForm.lastName.toUpperCase(),
      email: normalizedSignupEmail,
      phone: regForm.phone,
      gender: regForm.sex,
      nationality: regForm.nationality === 'Mtanzania' ? 'Tanzanian' : 'Foreigner',
      nida_number: regForm.hasNida ? cleanNida : null,
      id_type: regForm.hasNida ? null : regForm.idType,
      id_number: regForm.hasNida ? null : trimmedAltId,
      region: regForm.region,
      district: regForm.district,
      ward: regForm.ward,
      street: regForm.street,
      is_diaspora: regForm.country !== 'Tanzania',
      country_of_residence: regForm.country,
      passport_number: passportNumber,
      role: 'citizen' as const,
      is_verified: nidaVerified || regForm.country !== 'Tanzania',
    };

    if (regForm.password !== regForm.confirmPassword) {
      showToast(lang === 'sw' ? 'Nywila hazifanani' : 'Passwords do not match', 'error');
      return;
    }

    if (regForm.nationality === 'Mtanzania' && regForm.hasNida && cleanNida.length !== 20) {
      showToast(lang === 'sw' ? 'Namba ya NIDA lazima iwe na tarakimu 20' : 'NIDA number must be 20 digits', 'error');
      return;
    }

    if (regForm.nationality === 'Mtanzania' && !regForm.hasNida && (!regForm.idType || !trimmedAltId)) {
      showToast(
        lang === 'sw' ? 'Chagua aina ya kitambulisho na ujaze namba yake' : 'Select an alternative ID type and enter its number',
        'error'
      );
      return;
    }

    if (!isValidPhoneNumber(regForm.phone)) {
      showToast(lang === 'sw' ? 'Namba ya simu si sahihi' : 'Invalid phone number', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedSignupEmail,
        password: regForm.password,
        options: {
          data: profilePayload,
        },
      });

      if (error) {
        console.error('Supabase auth signup failed:', error);
        throw error;
      }

      showToast(
        data.session
          ? (lang === 'sw' ? 'Usajili umekamilika! Unaweza kuingia sasa.' : 'Registration successful! You can now sign in.')
          : (lang === 'sw' ? 'Usajili umekamilika! Angalia barua pepe yako kwa uthibitisho.' : 'Registration successful! Please check your email to confirm.'),
        'success'
      );

      setMode('login');
    } catch (err: any) {
      console.error('Signup flow error:', err);
      if (err?.status === 429) {
        showToast(
          lang === 'sw'
            ? 'Jaribu tena baada ya muda mfupi. Mfumo umezuia maombi mengi kwa wakati mmoja.'
            : 'Try again shortly. Too many signup requests were sent in a short time.',
          'error'
        );
        return;
      }
      showToast(err.message || 'Signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={TANZANIA_LOGO_URL} 
              alt="Coat of Arms" 
              className="w-9 h-9 object-contain" 
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 className="font-bold text-2xl tracking-tight">
                {mode === 'login' ? (lang === 'sw' ? 'Ingia' : 'Login') : (lang === 'sw' ? 'Jiunge' : 'Sign Up')}
              </h2>
              <p className="text-xs text-stone-500">E-MTAA â€¢ Serikali ya Mtaa</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            title={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
            aria-label={lang === 'sw' ? 'Funga dirisha' : 'Close dialog'}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {!showForgotPassword ? (
              /* ====================== LOGIN FORM ====================== */
              mode === 'login' ? (
                <motion.form 
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin}
                  className="space-y-6"
                >
                  <div>
                    <label className="text-sm font-medium text-stone-600 mb-1.5 block">Barua Pepe / Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 text-stone-400" size={20} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-11 pr-4 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="juma@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-sm font-medium text-stone-600">Nywila / Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        {lang === 'sw' ? 'Umesahau?' : 'Forgot?'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 text-stone-400" size={20} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-11 pr-12 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-stone-400"
                        title={showPassword ? (lang === 'sw' ? 'Ficha nywila' : 'Hide password') : (lang === 'sw' ? 'Onyesha nywila' : 'Show password')}
                        aria-label={showPassword ? (lang === 'sw' ? 'Ficha nywila' : 'Hide password') : (lang === 'sw' ? 'Onyesha nywila' : 'Show password')}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" size={22} /> : (lang === 'sw' ? 'Ingia' : 'Login')}
                  </button>

                  <p className="text-center text-sm text-stone-500">
                    {lang === 'sw' ? 'Huna akaunti?' : "Don't have an account?"} {' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('signup')}
                      className="text-emerald-600 font-semibold hover:underline"
                    >
                      {lang === 'sw' ? 'Jiunge sasa' : 'Sign up'}
                    </button>
                  </p>
                </motion.form>
              ) : (
                /* ====================== SIGNUP FORM ====================== */
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Step 1: Personal Info */}
                  {regStep === 1 && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-stone-500">Jina la Kwanza</label>
                          <input
                            type="text"
                            value={regForm.firstName}
                            onChange={(e) => updateRegForm('firstName', e.target.value)}
                            className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl"
                            placeholder="Juma"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-stone-500">Kati</label>
                          <input
                            type="text"
                            value={regForm.middleName}
                            onChange={(e) => updateRegForm('middleName', e.target.value)}
                            className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl"
                            placeholder="Abdallah"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-stone-500">Mwisho</label>
                          <input
                            type="text"
                            value={regForm.lastName}
                            onChange={(e) => updateRegForm('lastName', e.target.value)}
                            className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl"
                            placeholder="Msuya"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-stone-500">Je, una NIDA?</label>
                          <div className="mt-2 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => handleHasNidaChange(true)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${regForm.hasNida ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-600'}`}
                            >
                              {lang === 'sw' ? 'Ndiyo, nina NIDA' : 'Yes, I have NIDA'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleHasNidaChange(false)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${!regForm.hasNida ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-600'}`}
                            >
                              {lang === 'sw' ? 'Hapana, sina NIDA' : 'No, I do not have NIDA'}
                            </button>
                          </div>
                        </div>

                        {regForm.hasNida ? (
                          <div>
                            <label className="text-xs font-medium text-stone-500">Namba ya NIDA</label>
                            <div className="mt-1 flex gap-3">
                              <input
                                type="text"
                                value={regForm.nidaNumber}
                                onChange={(e) => updateRegForm('nidaNumber', formatNIDA(e.target.value))}
                                maxLength={24}
                                className="flex-1 px-4 py-3 border border-stone-200 rounded-2xl font-mono"
                                placeholder="1234-5678-9012-3456-7890"
                              />
                              <button
                                type="button"
                                onClick={verifyNIDA}
                                disabled={nidaVerifying || regForm.nidaNumber.replace(/\D/g, '').length !== 20}
                                className="px-6 bg-emerald-600 text-white rounded-2xl font-medium disabled:bg-stone-300"
                              >
                                {nidaVerifying ? '...' : (lang === 'sw' ? 'Thibitisha' : 'Verify')}
                              </button>
                            </div>
                            {nidaError && <p className="text-red-500 text-xs mt-1">{nidaError}</p>}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="text-xs font-medium text-stone-500">{lang === 'sw' ? 'Aina ya Kitambulisho' : 'Alternative ID Type'}</label>
                              <select
                                value={regForm.idType}
                                onChange={(e) => {
                                  const nextType = e.target.value;
                                  updateRegForm('idType', nextType);
                                  if (nextType !== 'PASSPORT') {
                                    updateRegForm('passportNumber', '');
                                  }
                                }}
                                title={lang === 'sw' ? 'Aina ya kitambulisho mbadala' : 'Alternative ID type'}
                                aria-label={lang === 'sw' ? 'Aina ya kitambulisho mbadala' : 'Alternative ID type'}
                                className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl bg-white"
                              >
                                <option value="">{lang === 'sw' ? 'Chagua aina ya ID' : 'Select ID type'}</option>
                                {ALTERNATIVE_ID_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-stone-500">{lang === 'sw' ? 'Namba ya Kitambulisho' : 'ID Number'}</label>
                              <input
                                type="text"
                                value={regForm.idNumber}
                                onChange={(e) => {
                                  updateRegForm('idNumber', e.target.value);
                                  if (regForm.idType === 'PASSPORT') {
                                    updateRegForm('passportNumber', e.target.value);
                                  }
                                }}
                                className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl"
                                placeholder={lang === 'sw' ? 'Weka namba ya kitambulisho' : 'Enter ID number'}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setRegStep(2)}
                        disabled={!regForm.firstName || !regForm.lastName || (!regForm.hasNida && (!regForm.idType || !regForm.idNumber.trim()))}
                        className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold mt-4 disabled:opacity-50"
                      >
                        Endelea <ArrowRight className="inline ml-2" />
                      </button>
                    </div>
                  )}

                  {/* Step 2: Contact & Location */}
                  {regStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <label className="text-xs font-medium text-stone-500">Namba ya Simu</label>
                        <PhoneInput
                          international
                          defaultCountry="TZ"
                          value={regForm.phone}
                          onChange={(val) => updateRegForm('phone', val)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-stone-500">Barua Pepe</label>
                        <input
                          type="email"
                          value={regForm.email}
                          onChange={(e) => updateRegForm('email', e.target.value)}
                          className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl"
                          placeholder="juma@example.com"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setRegStep(1)}
                          className="py-4 border border-stone-200 rounded-2xl font-medium"
                        >
                          Rudi
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegStep(3)}
                          className="py-4 bg-emerald-600 text-white rounded-2xl font-bold"
                        >
                          Endelea
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Password & Final */}
                  {regStep === 3 && (
                    <form onSubmit={handleSignup} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-stone-500">Nywila</label>
                          <input
                            type="password"
                            value={regForm.password}
                            onChange={(e) => updateRegForm('password', e.target.value)}
                            className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl"
                            placeholder={lang === 'sw' ? 'Weka nywila' : 'Enter password'}
                            title={lang === 'sw' ? 'Nywila' : 'Password'}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-stone-500">Thibitisha Nywila</label>
                          <input
                            type="password"
                            value={regForm.confirmPassword}
                            onChange={(e) => updateRegForm('confirmPassword', e.target.value)}
                            className="mt-1 w-full px-4 py-3 border border-stone-200 rounded-2xl"
                            placeholder={lang === 'sw' ? 'Rudia nywila' : 'Confirm password'}
                            title={lang === 'sw' ? 'Thibitisha nywila' : 'Confirm password'}
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : (lang === 'sw' ? 'Kamilisha Usajili' : 'Complete Registration')}
                      </button>
                    </form>
                  )}
                </motion.div>
              )
            ) : (
              /* Forgot Password Flow */
              <div className="space-y-6">
                <button onClick={() => { setShowForgotPassword(false); setForgotPasswordStep(1); }} className="flex items-center gap-2 text-stone-500">
                  <ArrowLeft size={18} /> Rudi
                </button>
                <h3 className="text-xl font-bold">Rudisha Nywila</h3>
                {/* Forgot password form can be expanded later */}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}