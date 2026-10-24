import React from 'react';
import { 
  Eye, 
  Activity, 
  ShieldCheck, 
  Wifi, 
  Cpu, 
  Database, 
  RefreshCw, 
  FileText,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Globe2,
  Lock,
  UserCheck,
  LogOut,
  KeyRound
} from 'lucide-react';

export default function Header({ 
  centers, 
  selectedCenter, 
  onSelectCenter, 
  stats, 
  onSeedData, 
  isSeeding,
  hospital,
  onOpenAuthModal,
  onLogoutHospital
}) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      
      {/* Top Thin WHO Blue Ribbon */}
      <div className="bg-[#003087] text-white px-6 py-1.5 text-[11px] font-medium flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-extrabold tracking-wide uppercase">
            <Globe2 className="w-3.5 h-3.5 text-sky-300" />
            World Health Organization
          </span>
          <span className="text-sky-300 hidden sm:inline">|</span>
          <span className="hidden sm:inline text-sky-100">
            Global Eye Health Programme • Ayushman Bharat Digital Health Mission (ABDM)
          </span>
        </div>

        {/* Logged-In Hospital Status / Login CTA */}
        <div className="flex items-center gap-3">
          {hospital ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-[10px] text-sky-100 font-bold">
                {hospital.name} ({hospital.hospital_id})
              </span>
              <button
                onClick={onLogoutHospital}
                className="text-sky-200 hover:text-white text-[10px] font-bold underline ml-1 cursor-pointer"
                title="Log out of hospital node"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-md transition-colors cursor-pointer border border-white/20"
            >
              <KeyRound className="w-3 h-3" />
              <span>Hospital Node Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation & Telemetry Bar */}
      <div className="px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Left: Organization Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#005eb8] flex items-center justify-center shadow-md shadow-blue-900/10 shrink-0">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                  <span>MindHue</span>
                  <span className="text-[#005eb8] font-bold text-sm">Tele-Retina AI</span>
                </h1>
                <span className="text-[10px] font-extrabold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-[#005eb8] border border-blue-200 uppercase whitespace-nowrap">
                  WHO-GDRIS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                Diabetic Retinopathy Screening & ICDR Triage System
              </p>
            </div>
          </div>

          <div className="hidden xl:block h-8 w-[1px] bg-slate-200"></div>

          {/* Active Screening Center Selector */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700">
            <Building2 className="w-4 h-4 text-[#005eb8]" />
            <span className="text-slate-500 font-medium">PHC Node:</span>
            <select
              value={selectedCenter?.id || ''}
              onChange={(e) => {
                const c = centers.find(item => item.id === e.target.value);
                if (c) onSelectCenter(c);
              }}
              className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer pr-2"
            >
              {centers.map(center => (
                <option key={center.id} value={center.id} className="bg-white text-slate-900">
                  {center.name} ({center.district}, {center.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center/Right: Live Tele-Medicine Telemetry & Key Metrics */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Hospital Account Badge */}
          {hospital ? (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#005eb8] border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              title="Hospital security details"
            >
              <ShieldCheck className="w-4 h-4 text-[#005eb8]" />
              <span className="font-mono">{hospital.hospital_id}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#005eb8]" />
              <span>Hospital Sign-In</span>
            </button>
          )}

          {/* Edge AI & Bandwidth Badge */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
              <Cpu className="w-3.5 h-3.5 text-[#005eb8]" />
              <span>Edge AI</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>{selectedCenter?.bandwidth_kbps ? `${(selectedCenter.bandwidth_kbps / 1024).toFixed(1)}M` : '2.0M'}</span>
            </div>
          </div>

          {/* Key Metric Pills */}
          {stats && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Screened: </span>
                <span className="font-bold text-slate-900">{stats.summary?.total_patients || 8}</span>
              </div>

              <div className="bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 text-xs">
                <span className="text-red-700 font-medium">Urgent PDR: </span>
                <span className="font-extrabold text-red-800">{stats.summary?.proliferative_cases || 1}</span>
              </div>
            </div>
          )}

          {/* Seed Clinical Benchmark Button */}
          <button
            onClick={onSeedData}
            disabled={isSeeding}
            className="flex items-center gap-1.5 bg-[#005eb8] hover:bg-[#003087] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            title="Populate authentic clinical benchmark cases across all 5 ICDR severity levels"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Seeding...' : 'Seed Data'}</span>
          </button>
        </div>

      </div>
    </header>
  );
}
