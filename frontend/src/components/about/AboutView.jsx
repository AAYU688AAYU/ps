import React from 'react';
import { 
  Globe2, 
  ShieldCheck, 
  Award, 
  Database, 
  Cpu, 
  CheckCircle2, 
  Building2, 
  HeartHandshake, 
  ExternalLink,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';

export default function AboutView() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto text-slate-800">
      
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#003087] to-[#005eb8] text-white p-8 rounded-3xl shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
            Smart India Hackathon (SIH) Edition
          </span>
          <span className="text-xs text-sky-200">
            WHO Global Eye Health 2030 Aligned
          </span>
        </div>

        <h1 className="text-3xl font-black tracking-tight">
          MindHue: AI-Powered Retinal Tele-Ophthalmology
        </h1>

        <p className="text-sm text-blue-100 max-w-3xl leading-relaxed">
          India has over <strong>77 million diabetic adults</strong> — the second highest globally. Diabetic Retinopathy affects ~18% of this population and is a leading cause of preventable blindness. With only <strong>~1 ophthalmologist per 100,000 rural population</strong>, mass manual screening is impossible without explainable, multi-tenant AI.
        </p>
      </div>

      {/* Dual Implementation Flow Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#005eb8]" />
          <span>Dual Core Implementation Architecture</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Flow A */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[#005eb8] text-sm">Flow A: Clinical Tele-Screening</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#005eb8]">Field Ready</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Designed for Primary Health Centres (PHCs) and mobile vans:
            </p>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Hospital Multi-Tenant Authentication (Hospital ID + Password)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Real-Time Automated Image Quality Assessment (IQA)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>30-Second Fast-Review Workstation & SHA-256 Sign-Off</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Bilingual (English + Hindi) WHO Clinical Report with QR code</span>
              </li>
            </ul>
          </div>

          {/* Flow B */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-purple-700 text-sm">Flow B: Kaggle DR Model Hub</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">37k+ Images</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Trained on official international clinical benchmarks:
            </p>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Ingestion of <strong>abdallahhassan22/drdata</strong> (2.7k images)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Ingestion of <strong>sachinkumar413/dataset</strong> (35.1k images)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>EfficientNet-B4 + Spatial Attention & ResNet-50 backbones</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>ROC-AUC &gt;0.96, Quadratic Kappa κ = 0.892, 0.45s Edge TPU</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Standards & Compliance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <Globe2 className="w-6 h-6 text-[#005eb8]" />
          <h3 className="font-extrabold text-slate-900 text-sm">WHO-GDRIS Standard</h3>
          <p className="text-slate-500">
            Adheres strictly to the Global Diabetic Retinopathy Screening protocols and ICDR 5-grade staging.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <h3 className="font-extrabold text-slate-900 text-sm">ABDM & Ayushman Bharat</h3>
          <p className="text-slate-500">
            Interoperable 14-digit ABHA ID integration and tele-referral dispatch compliant with PM-JAY.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <Award className="w-6 h-6 text-purple-600" />
          <h3 className="font-extrabold text-slate-900 text-sm">Explainable Clinical AI</h3>
          <p className="text-slate-500">
            Grad-CAM heatmap attention attribution eliminates "black box" concerns for retina specialists.
          </p>
        </div>
      </div>

    </div>
  );
}
