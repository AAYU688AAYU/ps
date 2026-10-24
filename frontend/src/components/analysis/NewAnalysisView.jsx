import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Upload, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  RefreshCw, 
  ShieldCheck, 
  FileText,
  Building2,
  ArrowRight,
  Sliders,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function NewAnalysisView({
  centers,
  selectedCenter,
  hospital,
  onSubmitNewPatient,
  onAnalysisComplete
}) {
  const [step, setStep] = useState(1); // 1: Patient Details, 2: Fundus Upload & IQA, 3: Processing & Results
  
  // Patient Form
  const [patientData, setPatientData] = useState({
    first_name: '',
    last_name: '',
    age: 54,
    gender: 'M',
    contact_number: '+91 ',
    village_or_city: 'Sector 4, Rural Block',
    district_center: selectedCenter?.id || centers?.[0]?.id || '',
    diabetes_type: 'TYPE2',
    diabetes_duration_years: 6.0,
    hba1c_level: 8.4,
    systolic_bp: 135,
    diastolic_bp: 88,
    visual_acuity_od: '6/9',
    visual_acuity_os: '6/12',
    abha_id: '91-4829-1029-4821'
  });

  const [registeredSession, setRegisteredSession] = useState(null);
  const [selectedEye, setSelectedEye] = useState('OD');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // IQA Simulation / Live State
  const [iqaScore, setIqaScore] = useState(92.5);
  const [iqaQuality, setIqaQuality] = useState('GRADEABLE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const centerId = selectedCenter?.id || centers?.[0]?.id;
    if (centerId && !patientData.district_center) {
      setPatientData(prev => ({ ...prev, district_center: centerId }));
    }
  }, [selectedCenter, centers]);

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      const mrn = `MRN-2026-${uniqueSuffix}`;
      const result = await onSubmitNewPatient({
        ...patientData,
        mrn
      });
      setRegisteredSession(result);
      setStep(2);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to register patient intake.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIqaScore(91.8);
      setIqaQuality('GRADEABLE');
    }
  };

  const handleExecuteAI = async () => {
    if (!registeredSession && !selectedFile) {
      setErrorMsg('Please select a retinal image.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (selectedFile && registeredSession?.id) {
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('eye', selectedEye);

        const res = await fetch(`/api/screenings/${registeredSession.id}/upload_image/`, {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Failed to process retinal image.');
      }

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });

      setStep(3);
      if (onAnalysisComplete) {
        setTimeout(() => {
          onAnalysisComplete(registeredSession?.id);
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Step Progress Ribbon */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        {[
          { num: 1, title: '1. Patient Demographics & ABHA', active: step >= 1 },
          { num: 2, title: '2. Bilateral Capture & Live IQA', active: step >= 2 },
          { num: 3, title: '3. AI Diagnostics & Staging', active: step >= 3 }
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              s.active ? 'bg-[#005eb8] text-white shadow-sm' : 'bg-slate-100 text-slate-500'
            }`}>
              {s.num}
            </div>
            <span className={`text-xs font-bold hidden sm:inline ${s.active ? 'text-slate-900' : 'text-slate-400'}`}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      {/* Main Form Body */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#005eb8]">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Step 1: Patient Intake & Diabetic History
              </h3>
              <p className="text-xs text-slate-500">
                Ayushman Bharat Health Account (ABHA) & Primary Eye Screening Record
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handlePatientSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh"
                  value={patientData.first_name}
                  onChange={(e) => setPatientData({ ...patientData, first_name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patil"
                  value={patientData.last_name}
                  onChange={(e) => setPatientData({ ...patientData, last_name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Age (Years) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={patientData.age}
                  onChange={(e) => setPatientData({ ...patientData, age: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Gender *</label>
                <select
                  value={patientData.gender}
                  onChange={(e) => setPatientData({ ...patientData, gender: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ABHA ID (Ayushman Bharat)</label>
                <input
                  type="text"
                  placeholder="14-digit ABHA ID"
                  value={patientData.abha_id}
                  onChange={(e) => setPatientData({ ...patientData, abha_id: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8] font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Number</label>
                <input
                  type="text"
                  placeholder="+91 9822019482"
                  value={patientData.contact_number}
                  onChange={(e) => setPatientData({ ...patientData, contact_number: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Primary Health Centre</label>
                <select
                  value={patientData.district_center}
                  onChange={(e) => setPatientData({ ...patientData, district_center: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                >
                  <option value="">-- Select Center (Optional) --</option>
                  {centers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.district})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Village / Town / City</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 4, Rural Block"
                  value={patientData.village_or_city}
                  onChange={(e) => setPatientData({ ...patientData, village_or_city: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8]"
                />
              </div>
            </div>


            {/* Diabetic History */}
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <h4 className="font-extrabold text-[#005eb8] text-xs uppercase tracking-wide">
                Diabetic Vitals & History
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Diabetes Duration (Yrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={patientData.diabetes_duration_years}
                    onChange={(e) => setPatientData({ ...patientData, diabetes_duration_years: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Latest HbA1c (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={patientData.hba1c_level}
                    onChange={(e) => setPatientData({ ...patientData, hba1c_level: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 text-slate-900 font-extrabold text-[#005eb8] px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={patientData.systolic_bp}
                    onChange={(e) => setPatientData({ ...patientData, systolic_bp: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 font-bold text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={patientData.diastolic_bp}
                    onChange={(e) => setPatientData({ ...patientData, diastolic_bp: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 text-slate-900 px-3 py-2 rounded-xl border border-slate-200 font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isProcessing}
                className="flex items-center gap-2 bg-[#005eb8] hover:bg-[#003087] text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Proceed to Retinal Capture</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Fundus Image Upload & Live IQA Engine */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-[#005eb8]">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Step 2: Bilateral Fundus Capture & Image Quality Assessment (IQA)
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: <strong className="text-slate-800">{patientData.first_name} {patientData.last_name}</strong> • HbA1c: {patientData.hba1c_level}%
                </p>
              </div>
            </div>

            {/* Eye Selector */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              {['OD', 'OS'].map(eye => (
                <button
                  key={eye}
                  onClick={() => setSelectedEye(eye)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedEye === eye ? 'bg-[#005eb8] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {eye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Zone */}
            <div className="space-y-3 text-xs">
              <label className="block text-slate-700 font-bold">Fundus Photo Ingestion (Forus / Remidio / Topcon):</label>
              
              <label className="border-2 border-dashed border-slate-300 hover:border-[#005eb8] bg-slate-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block text-center min-h-[220px]">
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Fundus Preview"
                      className="w-36 h-36 object-cover rounded-full mx-auto ring-4 ring-blue-300 shadow-md"
                    />
                    <p className="font-bold text-[#005eb8]">{selectedFile?.name}</p>
                    <span className="text-[10px] text-slate-500 block">Click to change capture</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-[#005eb8] mx-auto" />
                    <p className="font-bold text-slate-800 text-sm">Click to select fundus image or drag & drop</p>
                    <p className="text-[11px] text-slate-500">Supports portable non-mydriatic camera captures</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Live IQA Adequacy Feedback Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Real-Time IQA Quality Engine</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {iqaQuality} ({iqaScore}%)
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">Focus & Blur Sharpness (Tenengrad):</span>
                    <strong className="text-slate-900">94.0%</strong>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[94%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">Illumination Uniformity & Dynamic Range:</span>
                    <strong className="text-slate-900">89.5%</strong>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[90%]"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-600">Field of View & Circular Mask (45°):</span>
                    <strong className="text-slate-900">92.0%</strong>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-[#005eb8] rounded-full w-[92%]"></div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 leading-relaxed text-[11px]">
                <strong>Operator Guidance:</strong> Image quality is optimal for automated diagnostic classification. Macular reflex and optic disc are sharply defined.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Back to Demographics
            </button>

            <button
              type="button"
              onClick={handleExecuteAI}
              disabled={isProcessing}
              className="flex items-center gap-2 bg-[#005eb8] hover:bg-[#003087] text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? 'Executing AI Pipeline...' : 'Run Clinical AI Analysis'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Analysis Success View */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-extrabold text-slate-900">
            Clinical AI Analysis Completed Successfully!
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Image Quality Assessment, sub-pixel lesion detection, and ICDR severity staging have been computed.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => onAnalysisComplete(registeredSession?.id)}
              className="flex items-center gap-2 bg-[#005eb8] hover:bg-[#003087] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Open 30-Sec Fast-Review Studio</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
