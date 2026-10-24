import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Building2, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

export default function HospitalAuthModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess 
}) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [loginForm, setLoginForm] = useState({
    hospital_id: 'HOSP-AIIMS-01',
    password: 'password123'
  });

  // Register State
  const [registerForm, setRegisterForm] = useState({
    hospital_id: '',
    name: '',
    email: '',
    contact_number: '+91 ',
    district: 'Pune',
    state: 'Maharashtra',
    hospital_type: 'PHC',
    password: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');

      onLoginSuccess(data.hospital, data.token);
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.errors ? Object.values(data.errors).flat().join(', ') : (data.error || 'Registration failed');
        throw new Error(err);
      }

      setSuccessMsg(`Hospital "${data.hospital.name}" registered successfully! Logging you in...`);
      setTimeout(() => {
        onLoginSuccess(data.hospital, data.token);
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (hid, pwd) => {
    setLoginForm({ hospital_id: hid, password: pwd });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Top Header */}
        <div className="bg-[#003087] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded bg-white/20 text-white uppercase">
                WHO Tele-Retina Network
              </span>
              <h3 className="text-xl font-extrabold text-white mt-0.5">
                Hospital Node Authentication
              </h3>
            </div>
          </div>
          <p className="text-xs text-blue-100">
            Secure multi-tenant access for Primary Health Centres, District Hospitals, and AIIMS Tele-Retina Hubs.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-black/20 p-1 mt-4 border border-white/10">
            <button
              onClick={() => { setAuthMode('login'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-[#003087] shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Hospital Login
            </button>
            <button
              onClick={() => { setAuthMode('register'); setErrorMsg(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-[#003087] shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              Register New Hospital
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 text-xs text-slate-800">
          
          {errorMsg && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {authMode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Hospital ID *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. HOSP-AIIMS-01 or PHC-MH-PN-01"
                    value={loginForm.hospital_id}
                    onChange={(e) => setLoginForm({ ...loginForm, hospital_id: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8] font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Institutional Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                  />
                </div>
              </div>

              {/* Quick Preset Accounts */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block mb-2">Quick Demo Accounts:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('HOSP-AIIMS-01', 'password123')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    AIIMS Apex Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('PHC-MH-PN-01', 'password123')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    PHC Shirur (Pune)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('PHC-UP-VN-04', 'password123')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    PHC Pindra (Varanasi)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#005eb8] hover:bg-[#003087] text-white font-extrabold py-3 px-4 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Authenticating Hospital...' : 'Authenticate & Enter Workstation'}</span>
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hospital ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DH-MH-05"
                    value={registerForm.hospital_id}
                    onChange={(e) => setRegisterForm({ ...registerForm, hospital_id: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Facility Type *</label>
                  <select
                    value={registerForm.hospital_type}
                    onChange={(e) => setRegisterForm({ ...registerForm, hospital_type: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                  >
                    <option value="PHC">Primary Health Centre</option>
                    <option value="CHC">Community Health Centre</option>
                    <option value="DH">District Hospital</option>
                    <option value="MED_COLLEGE">Government Medical College</option>
                    <option value="APEX_TELE">Apex Tele-Retina Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Hospital / Center Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sub-District Hospital Karad"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Official Email *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="admin@hospital.gov.in"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="w-full bg-slate-50 text-slate-900 pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Official Mobile No. *</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 9822019482"
                      value={registerForm.contact_number}
                      onChange={(e) => setRegisterForm({ ...registerForm, contact_number: e.target.value })}
                      className="w-full bg-slate-50 text-slate-900 pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Satara"
                    value={registerForm.district}
                    onChange={(e) => setRegisterForm({ ...registerForm, district: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Maharashtra"
                    value={registerForm.state}
                    onChange={(e) => setRegisterForm({ ...registerForm, state: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Create Password (Min 6 chars) *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••••••"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full bg-slate-50 text-slate-900 pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#005eb8] hover:bg-[#003087] text-white font-extrabold py-3 px-4 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Creating Account...' : 'Register Hospital & Get Token'}</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
