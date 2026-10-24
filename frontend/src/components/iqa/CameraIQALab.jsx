import React, { useState } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  HelpCircle,
  Sliders,
  Eye,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function CameraIQALab() {
  const [testImageMode, setTestImageMode] = useState('NORMAL');

  const iqaData = {
    NORMAL: {
      name: 'Adequate Quality Fundus (Gradeable)',
      overall: 92.5,
      focus: 94.0,
      illum: 91.0,
      fov: 93.0,
      status: 'GRADEABLE',
      color: 'text-emerald-700 border-emerald-300 bg-emerald-50',
      feedback: 'Image quality is optimal. Optic disc and macular reflex are well-focused with balanced illumination. Ready for automated ICDR classification.'
    },
    BLUR: {
      name: 'Defocus / Motion Blur Defect (Borderline)',
      overall: 54.2,
      focus: 38.0,
      illum: 72.0,
      fov: 82.0,
      status: 'BORDERLINE',
      color: 'text-amber-800 border-amber-300 bg-amber-50',
      feedback: 'Significant optical blur detected (Laplacian Var < 60). Adaptive multi-scale CLAHE and edge sharpening applied. Guidance: Ask patient to blink twice, adjust camera diopter focus knob, and re-stabilize chin rest.'
    },
    DARK: {
      name: 'Underexposed / Small Pupil (Ungradeable)',
      overall: 38.0,
      focus: 45.0,
      illum: 22.0,
      fov: 65.0,
      status: 'UNGRADEABLE',
      color: 'text-red-700 border-red-300 bg-red-50',
      feedback: 'UNGRADEABLE: Severe underexposure. Mean green intensity &lt; 40. Guidance: Pupil diameter may be &lt;3.5mm. Move to a darker room, wait 3 minutes for physiological dilation or administer 0.5% Tropicamide if permitted, and increase LED flash intensity.'
    },
    GLARE: {
      name: 'Corneal Flash Glare Artifact',
      overall: 48.0,
      focus: 70.0,
      illum: 35.0,
      fov: 75.0,
      status: 'BORDERLINE',
      color: 'text-amber-800 border-amber-300 bg-amber-50',
      feedback: 'Central corneal reflection artifact detected in macular zone. Guidance: Adjust camera alignment angle slightly (5° off-axis) to shift corneal reflex away from optical axis.'
    }
  };

  const current = iqaData[testImageMode];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Field Camera Image Quality Assessment (IQA) Lab
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-[#005eb8] border border-blue-200 px-2.5 py-0.5 rounded-full">
              Automated Adequacy Engine
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Real-time optical focus, illumination uniformity, and field-of-view adequacy evaluator with operator feedback.
          </p>
        </div>
      </div>

      {/* Preset Test Case Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { id: 'NORMAL', label: '1. Optimal Quality', sub: 'Laplacian > 180' },
          { id: 'BLUR', label: '2. Defocus Blur', sub: 'Laplacian < 60' },
          { id: 'DARK', label: '3. Underexposed', sub: 'Luminance < 40' },
          { id: 'GLARE', label: '4. Flash Glare', sub: 'Corneal Reflex' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTestImageMode(item.id)}
            className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
              testImageMode === item.id
                ? 'bg-blue-50 border-[#005eb8] text-[#005eb8] shadow-sm'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="font-extrabold text-xs block text-slate-900">{item.label}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">{item.sub}</span>
          </button>
        ))}
      </div>

      {/* Diagnostic Evaluation Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Quality Metric Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">
              Quality Assessment Telemetry
            </h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${current.color}`}>
              {current.status}
            </span>
          </div>

          <div className="space-y-3">
            {/* Overall Score */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-700 font-bold">Overall Quality Index:</span>
                <span className="font-extrabold text-slate-900">{current.overall}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    current.overall >= 70 ? 'bg-emerald-500' : (current.overall >= 50 ? 'bg-amber-500' : 'bg-red-500')
                  }`}
                  style={{ width: `${current.overall}%` }}
                ></div>
              </div>
            </div>

            {/* Focus Sharpness */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">Focus & Blur Sharpness (Tenengrad):</span>
                <span className="font-bold text-slate-900">{current.focus}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    current.focus >= 60 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${current.focus}%` }}
                ></div>
              </div>
            </div>

            {/* Illumination */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">Illumination Uniformity & Entropy:</span>
                <span className="font-bold text-slate-900">{current.illum}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    current.illum >= 60 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${current.illum}%` }}
                ></div>
              </div>
            </div>

            {/* FOV */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">Field of View & Circular Mask (45°):</span>
                <span className="font-bold text-slate-900">{current.fov}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="h-full bg-[#005eb8] rounded-full transition-all duration-500"
                  style={{ width: `${current.fov}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Step-by-Step Operator Recapture Feedback (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#005eb8]" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Health Worker Recapture Guidance Protocol
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs leading-relaxed space-y-3">
            <p className="font-bold text-sm text-[#005eb8]">
              {current.feedback}
            </p>

            <div className="pt-3 border-t border-slate-200 space-y-2">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                Standard Field Operating Checklist:
              </h4>
              <ul className="space-y-1.5 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Ensure patient foreheads firmly rests against upper bar before capture.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Target internal fixation green LED for optic disc & foveal alignment.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>If image is borderline, automatic CLAHE pipeline enhances vascular clarity.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
