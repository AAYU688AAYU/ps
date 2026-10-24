import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  HeartPulse, 
  Activity, 
  Eye, 
  CheckCircle2, 
  Building2,
  AlertTriangle 
} from 'lucide-react';


export default function PatientRegistrationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  centers, 
  defaultCenterId 
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: 52,
    gender: 'M',
    contact_number: '+91 98',
    village_or_city: 'Rural Block',
    district_center: defaultCenterId || (centers?.[0]?.id || ''),
    diabetes_type: 'TYPE2',
    diabetes_duration_years: 5.0,
    hba1c_level: 8.2,
    systolic_bp: 130,
    diastolic_bp: 85,
    visual_acuity_od: '6/9',
    visual_acuity_os: '6/12',
    abha_id: '91-'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  React.useEffect(() => {
    const centerId = defaultCenterId || centers?.[0]?.id;
    if (centerId && !formData.district_center) {
      setFormData(prev => ({ ...prev, district_center: centerId }));
    }
  }, [defaultCenterId, centers]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create patient. Please check the details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 text-[#005eb8]">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Register New Patient Intake
              </h3>
              <p className="text-xs text-slate-500">
                Ayushman Bharat Health Account (ABHA) & Diabetic History
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Demographics */}

          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-[#005eb8]">
              1. Patient Demographics & Identification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="e.g. Ramesh"
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="e.g. Patil"
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Age (Years) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Gender *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ABHA ID (Ayushman Health Account)</label>
                <input
                  type="text"
                  value={formData.abha_id}
                  onChange={(e) => setFormData({ ...formData, abha_id: e.target.value })}
                  placeholder="14-digit ABHA Number"
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Primary Health Centre</label>
                <select
                  value={formData.district_center}
                  onChange={(e) => setFormData({ ...formData, district_center: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                >
                  {centers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.district})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Vitals */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-[#005eb8]">
              2. Diabetic History & Vitals
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Diabetes Duration (Yrs)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.diabetes_duration_years}
                  onChange={(e) => setFormData({ ...formData, diabetes_duration_years: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">HbA1c Level (%) *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={formData.hba1c_level}
                  onChange={(e) => setFormData({ ...formData, hba1c_level: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8] font-extrabold text-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Blood Pressure (mmHg)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.systolic_bp}
                    onChange={(e) => setFormData({ ...formData, systolic_bp: parseInt(e.target.value) })}
                    placeholder="Sys"
                    className="w-1/2 bg-slate-50 text-slate-900 px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none text-center font-bold"
                  />
                  <span className="text-slate-400">/</span>
                  <input
                    type="number"
                    value={formData.diastolic_bp}
                    onChange={(e) => setFormData({ ...formData, diastolic_bp: parseInt(e.target.value) })}
                    placeholder="Dia"
                    className="w-1/2 bg-slate-50 text-slate-900 px-2.5 py-2 rounded-xl border border-slate-200 focus:outline-none text-center font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#005eb8] hover:bg-[#00478f] text-white font-bold transition-all shadow-md shadow-blue-900/10 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Patient...' : 'Complete Registration & Upload Retinal Image'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
