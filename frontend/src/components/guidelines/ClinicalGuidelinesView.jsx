import React from 'react';
import { 
  BookOpen, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Activity, 
  FileText,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Eye
} from 'lucide-react';

export default function ClinicalGuidelinesView() {
  const icdrLevels = [
    {
      grade: 0,
      name: 'No Apparent DR (Normal)',
      findings: 'No retinal abnormalities or microvascular lesions present.',
      referral: 'Routine Annual Screening (12 Months)',
      urgency: 'Low Risk',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800'
    },
    {
      grade: 1,
      name: 'Mild Non-Proliferative DR (Mild NPDR)',
      findings: 'Microaneurysms only (small red circular capillary outpouchings).',
      referral: 'Early Follow-up Screening (6 Months)',
      urgency: 'Mild Risk',
      color: 'border-blue-200 bg-blue-50 text-blue-900',
      badge: 'bg-blue-100 text-[#005eb8]'
    },
    {
      grade: 2,
      name: 'Moderate Non-Proliferative DR (Mod NPDR)',
      findings: 'More than microaneurysms but less than Severe NPDR (hard exudates, isolated blot hemorrhages, cotton wool spots).',
      referral: 'Priority Retina Specialist Review (3 Months)',
      urgency: 'Referable DR',
      color: 'border-amber-300 bg-amber-50 text-amber-900',
      badge: 'bg-amber-100 text-amber-800'
    },
    {
      grade: 3,
      name: 'Severe Non-Proliferative DR (Sev NPDR)',
      findings: 'Meets ICDR 4-2-1 Rule: >20 intraretinal hemorrhages in all 4 quadrants, OR definite venous beading in 2+ quadrants, OR prominent IRMA in 1+ quadrant.',
      referral: 'Urgent Vitreoretinal Consultation (1 Month)',
      urgency: 'High Risk (Pre-Proliferative)',
      color: 'border-red-300 bg-red-50 text-red-900',
      badge: 'bg-red-100 text-red-800'
    },
    {
      grade: 4,
      name: 'Proliferative Diabetic Retinopathy (PDR)',
      findings: 'Neovascularization of the disc (NVD) or elsewhere (NVE), preretinal/vitreous hemorrhage, or fibrovascular traction.',
      referral: 'Emergency Panretinal Photocoagulation (PRP) / Anti-VEGF (48-72 Hours)',
      urgency: 'Sight-Threatening Emergency',
      color: 'border-red-500 bg-red-600 text-white shadow-md animate-pulse',
      badge: 'bg-white text-red-700 font-extrabold'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              International Clinical Diabetic Retinopathy (ICDR) Protocols
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-[#005eb8] border border-blue-200 px-2.5 py-0.5 rounded-full">
              WHO & AIIMS Guidelines
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Standard diagnostic criteria, the 4-2-1 severe staging rule, CSME macular edema, and referral timelines.
          </p>
        </div>
      </div>

      {/* 5-Grade Severity Table Card */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#005eb8]" />
          <span>ICDR Classification & Actionable Referral Matrix</span>
        </h3>

        <div className="grid grid-cols-1 gap-3.5">
          {icdrLevels.map(level => (
            <div
              key={level.grade}
              className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${level.color}`}
            >
              <div className="space-y-1 md:max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base">
                    Grade {level.grade}: {level.name}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${level.badge}`}>
                    {level.urgency}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {level.findings}
                </p>
              </div>

              <div className="text-left md:text-right shrink-0 bg-white/90 p-3 rounded-xl border border-slate-200 text-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Triage Protocol</span>
                <span className="font-bold text-xs text-[#005eb8] flex items-center gap-1.5 md:justify-end mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-[#005eb8]" />
                  {level.referral}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4-2-1 Rule & Macular Edema Focus Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 4-2-1 Rule */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            <span>The Diagnostic 4-2-1 Rule (Severe NPDR)</span>
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            Severe NPDR carries a <strong>50% risk of progressing to Proliferative DR within 12 months</strong>. It is diagnosed when any ONE of the following three criteria is met:
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <strong className="text-red-700 font-mono font-bold">4:</strong>
              <span>Definite intraretinal hemorrhages (&gt;20 per quadrant) in all <strong>4 quadrants</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <strong className="text-amber-700 font-mono font-bold">2:</strong>
              <span>Definite venous beading in <strong>2 or more quadrants</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <strong className="text-[#005eb8] font-mono font-bold">1:</strong>
              <span>Prominent Intraretinal Microvascular Abnormalities (IRMA) in <strong>1 or more quadrants</strong>.</span>
            </li>
          </ul>
        </div>

        {/* CSME Definition */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#005eb8]" />
            <span>Clinically Significant Macular Edema (CSME)</span>
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            ETDRS definition for immediate laser / anti-VEGF intervention:
          </p>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#005eb8] shrink-0 mt-0.5" />
              <span>Retinal thickening at or within <strong>500 µm of the center of the fovea</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#005eb8] shrink-0 mt-0.5" />
              <span>Hard exudates at or within <strong>500 µm of the foveal center</strong> if associated with adjacent thickening.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#005eb8] shrink-0 mt-0.5" />
              <span>A zone of retinal thickening <strong>1 disc area or larger</strong>, any part of which is within 1 disc diameter of foveal center.</span>
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
}
