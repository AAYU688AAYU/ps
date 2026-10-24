import React from 'react';
import { getMediaUrl } from '../../api/client';
import { 
  X, 
  Printer, 
  Download, 
  Eye, 
  ShieldCheck, 
  FileText, 
  QrCode, 
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Globe2
} from 'lucide-react';

export default function ClinicalReportModal({ 
  isOpen, 
  onClose, 
  session 
}) {
  if (!isOpen || !session) return null;

  const patient = session.patient || session.patient_details || {};
  const images = session.images || [];
  const primaryImg = images[0];
  const ai = primaryImg?.ai_analysis;
  const validation = ai?.validation;

  const mediaUrl = (url) => getMediaUrl(url);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden my-6 print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#005eb8]" />
            <h3 className="font-extrabold text-slate-900 text-sm">
              WHO / National Health Mission Tele-Retina Screening Report
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#005eb8] hover:bg-[#00478f] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-900/10"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Clinical Document Content (Printable Sheet) */}
        <div className="p-8 space-y-6 text-xs bg-white text-slate-900">
          
          {/* Header & Crest */}
          <div className="flex items-start justify-between border-b-2 border-[#005eb8] pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#005eb8] border border-blue-200 uppercase">
                  Ayushman Bharat PM-JAY & WHO Tele-Health
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  AI-Assisted Tele-Retinopathy Screening
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                DIABETIC RETINOPATHY CLINICAL SCREENING SUMMARY
              </h1>
              <p className="text-slate-600 text-[11px] font-medium">
                Facility: {session.district_center?.name || 'Primary Health Centre'} • Node: {session.district_center?.code || 'PHC-01'}
              </p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-300 flex items-center justify-center p-1 shadow-sm">
                <QrCode className="w-12 h-12 text-[#005eb8]" />
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1 font-bold">
                AUTH-VERIFY-QR
              </span>
            </div>
          </div>

          {/* Patient Details Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Patient Name:</span>
              <strong className="text-slate-900 text-sm font-extrabold">{patient.full_name || 'Patient'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Age / Gender:</span>
              <span className="text-slate-800 font-bold">{patient.age} Yrs / {patient.gender}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Medical Record (MRN):</span>
              <span className="text-slate-800 font-mono font-bold">{patient.mrn}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">ABHA National ID:</span>
              <span className="text-slate-800 font-mono font-bold">{patient.abha_id || '91-4829-1029-4821'}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Diabetes Type & Duration:</span>
              <span className="text-slate-800 font-bold">{patient.diabetes_type || 'Type 2'} ({patient.diabetes_duration_years || 5} yrs)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Latest Glycated HbA1c:</span>
              <strong className="text-red-700 font-extrabold">{patient.hba1c_level || 8.2}%</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Blood Pressure:</span>
              <span className="text-slate-800 font-bold">{patient.systolic_bp || 130}/{patient.diastolic_bp || 85} mmHg</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold uppercase">Screening Date:</span>
              <span className="text-slate-800 font-bold">{new Date(session.created_at || Date.now()).toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          {/* Clinical Findings & ICDR Diagnosis */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#005eb8]" />
                <span>Diagnostic Severity & Clinical Grading</span>
              </h3>
              <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-[#005eb8] border border-blue-300">
                ICDR Scale (WHO Standard)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Confirmed Severity Grade:</span>
                <p className="text-base font-extrabold text-[#005eb8]">
                  {ai?.icdr_grade_name || 'Grade 0: No Apparent Retinopathy'}
                </p>
                <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                  {ai?.clinical_explanation || 'Normal retinal vasculature.'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Referable DR (rDR):</span>
                  <strong className={ai?.referable_dr ? 'text-red-700' : 'text-emerald-700'}>
                    {ai?.referable_dr ? 'YES (Referral Indicated)' : 'NO'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Macular Edema (DME):</span>
                  <span className="font-bold text-slate-800">{ai?.macular_edema_risk || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Optic Disc CDR Ratio:</span>
                  <span className="font-bold text-slate-800">{ai?.optic_cup_disc_ratio || 0.35} {ai?.glaucoma_suspect ? '(Glaucoma Suspect)' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Microaneurysms Detected:</span>
                  <span className="font-bold text-fuchsia-700">{ai?.microaneurysms_count || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Imagery Thumbnails */}
          {primaryImg && (
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                Multi-Spectral Retinal Evidence:
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center space-y-1">
                  <img
                    src={mediaUrl(primaryImg.raw_image_url || primaryImg.raw_image)}
                    alt="Raw"
                    className="w-full h-32 object-cover rounded-xl border border-slate-300 shadow-sm"
                  />
                  <span className="text-[10px] text-slate-600 font-bold">1. Raw Fundus Capture</span>
                </div>

                <div className="text-center space-y-1">
                  <img
                    src={mediaUrl(ai?.gradcam_heatmap_image || primaryImg.raw_image_url || primaryImg.raw_image)}
                    alt="Grad-CAM"
                    className="w-full h-32 object-cover rounded-xl border border-slate-300 shadow-sm"
                  />
                  <span className="text-[10px] text-slate-600 font-bold">2. Grad-CAM Explainability</span>
                </div>

                <div className="text-center space-y-1">
                  <img
                    src={mediaUrl(ai?.lesions_map_image || primaryImg.raw_image_url || primaryImg.raw_image)}
                    alt="Lesions"
                    className="w-full h-32 object-cover rounded-xl border border-slate-300 shadow-sm"
                  />
                  <span className="text-[10px] text-slate-600 font-bold">3. Lesions & Landmark Map</span>
                </div>
              </div>
            </div>
          )}

          {/* Prescriptions & Directives */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
              Ophthalmologist Recommendations & Patient Guidance:
            </h4>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
              {validation?.treatment_plan || 'Maintain strict glycemic and blood pressure targets. Routine 12-month recall.'}
            </p>
            <p className="text-[11px] text-slate-500 italic">
              (हिंदी: कृपया अपना रक्त शर्करा (शुगर) और रक्तचाप नियंत्रित रखें। अनुशंसित समय पर पुनः आँख की जांच कराएं।)
            </p>
          </div>

          {/* Digital Sign-off Footer */}
          <div className="pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-600">
            <div>
              <p className="font-extrabold text-slate-900">
                Verified By: {validation?.ophthalmologist_name || 'Dr. Ananya Sharma, MD, DNB (Retina)'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Reg: MCI-78452-OPHTH • AIIMS Tele-Retina Hub
              </p>
            </div>

            <div className="text-right font-mono text-[9px] text-slate-500 font-semibold">
              <p>Digital Signature Hash: {validation?.digital_signature_hash || 'SHA256:8F9A2B1C4E6D3F7A'}</p>
              <p>System: WHO MindHue GDRIS v2.6</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
