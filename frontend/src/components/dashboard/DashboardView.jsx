import React from 'react';
import { 
  Users, 
  Eye, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  TrendingUp, 
  ArrowRight, 
  PlusCircle, 
  Sparkles, 
  FileText, 
  Stethoscope, 
  Bot, 
  Clock, 
  Building2, 
  CheckCircle2, 
  Globe2,
  Calendar,
  AlertOctagon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';

export default function DashboardView({
  stats,
  screenings,
  hospital,
  onNavigate,
  onSelectSession,
  onOpenReport
}) {
  const summary = stats?.summary || {};
  const icdrDist = stats?.icdr_distribution || [
    { grade: 'Grade 0: Normal', count: 74, pct: 74.0, color: '#10b981' },
    { grade: 'Grade 1: Mild NPDR', count: 8, pct: 8.0, color: '#005eb8' },
    { grade: 'Grade 2: Mod NPDR', count: 12, pct: 12.0, color: '#f59e0b' },
    { grade: 'Grade 3: Sev NPDR', count: 4, pct: 4.0, color: '#dc2626' },
    { grade: 'Grade 4: PDR', count: 2, pct: 2.0, color: '#991b1b' },
  ];

  const recentScreenings = screenings.slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-[#005eb8] border border-blue-200">
              WHO-GDRIS Protocol Active
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Node: <strong className="text-slate-800">{hospital?.name || 'AIIMS Tele-Retina Hub'}</strong>
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Diabetic Retinopathy Clinical Surveillance Dashboard
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Real-time multi-spectral AI diagnostic screening, automated IQA triage, and district specialist referral dispatch.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('new-analysis')}
            className="flex items-center gap-2 bg-[#005eb8] hover:bg-[#003087] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New Analysis</span>
          </button>

          <button
            onClick={() => onNavigate('ai-agent')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#005eb8]" />
            <span>AI Agent Studio</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Screened */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Patients Screened</span>
            <Users className="w-4 h-4 text-[#005eb8]" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {summary.total_patients || screenings.length || 10}
          </p>
          <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Target: 100,000 / district / yr</span>
          </p>
        </div>

        {/* Referable DR Prevalence */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Referable DR (rDR) Rate</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-600">
            {summary.referable_dr_rate_pct || 18.2}%
          </p>
          <p className="text-[11px] text-slate-500">
            National Avg: ~18.0% in diabetic cohort
          </p>
        </div>

        {/* High Risk Proliferative Cases */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Urgent PDR / Severe Cases</span>
            <AlertOctagon className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-3xl font-extrabold text-red-600">
            {summary.proliferative_cases || 1}
          </p>
          <p className="text-[11px] text-red-700 font-bold">
            Immediate 48-72h surgical triage
          </p>
        </div>

        {/* Camera Quality Compliance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Camera IQA Pass Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700">
            {stats?.quality_control?.gradeable_percentage || 92.5}%
          </p>
          <p className="text-[11px] text-slate-500">
            Avg Quality: {stats?.quality_control?.avg_overall_quality || 86}%
          </p>
        </div>

      </div>

      {/* Main Grid: ICDR Breakdown Chart (7 Cols) + Quick Navigation Modules (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: ICDR Severity Distribution Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                International ICDR 5-Grade Severity Staging
              </h3>
              <p className="text-xs text-slate-500">WHO & AIIMS Clinical Severity Distribution</p>
            </div>
            <span className="text-xs font-bold text-[#005eb8] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              Live Field Data
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={icdrDist} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="grade" stroke="#64748b" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                />
                <Bar dataKey="pct" name="Prevalence (%)" radius={[6, 6, 0, 0]}>
                  {icdrDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Quick Module Shortcuts & Hospital Node Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Quick Shortcuts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#005eb8]" />
              <span>Clinical Operations Suite</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={() => onNavigate('new-analysis')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-left transition-all cursor-pointer group"
              >
                <PlusCircle className="w-5 h-5 text-[#005eb8] mb-1.5" />
                <span className="font-bold text-slate-900 block group-hover:text-[#005eb8]">New Analysis</span>
                <span className="text-[10px] text-slate-500">Capture & IQA Check</span>
              </button>

              <button
                onClick={() => onNavigate('patient-reports')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-left transition-all cursor-pointer group"
              >
                <FileText className="w-5 h-5 text-emerald-600 mb-1.5" />
                <span className="font-bold text-slate-900 block group-hover:text-emerald-700">Patient Reports</span>
                <span className="text-[10px] text-slate-500">Printable WHO Slips</span>
              </button>

              <button
                onClick={() => onNavigate('ai-agent')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 text-left transition-all cursor-pointer group"
              >
                <Sparkles className="w-5 h-5 text-purple-600 mb-1.5" />
                <span className="font-bold text-slate-900 block group-hover:text-purple-700">AI Analysis Agent</span>
                <span className="text-[10px] text-slate-500">30s Review & Kaggle Hub</span>
              </button>

              <button
                onClick={() => onNavigate('find-specialist')}
                className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 text-left transition-all cursor-pointer group"
              >
                <Stethoscope className="w-5 h-5 text-amber-600 mb-1.5" />
                <span className="font-bold text-slate-900 block group-hover:text-amber-700">Find Specialist</span>
                <span className="text-[10px] text-slate-500">Tele-Retina Network</span>
              </button>
            </div>
          </div>

          {/* AI Clinical Assistant Teaser */}
          <div className="bg-gradient-to-br from-blue-50 to-sky-50/50 p-4 rounded-2xl border border-blue-200 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#005eb8]">
                <Bot className="w-4 h-4" />
                <span>MindHue AI Clinical Co-Pilot</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Instant guidance on ICDR 4-2-1 rule, CSME criteria, and tele-triage protocols.
              </p>
            </div>

            <button
              onClick={() => onNavigate('ai-assistant')}
              className="bg-[#005eb8] hover:bg-[#003087] text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0 transition-colors cursor-pointer shadow-sm"
            >
              Ask AI
            </button>
          </div>

        </div>

      </div>

      {/* Recent Screening Queue Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#005eb8]" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Recent Field Screening Sessions & AI Triage
            </h3>
          </div>

          <button
            onClick={() => onNavigate('patient-reports')}
            className="text-xs font-bold text-[#005eb8] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Patient Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="py-2.5 pl-3">Patient Name / MRN</th>
                <th className="py-2.5">Age/Sex</th>
                <th className="py-2.5">ABHA ID</th>
                <th className="py-2.5">HbA1c / BP</th>
                <th className="py-2.5">AI ICDR Severity</th>
                <th className="py-2.5">Triage Urgency</th>
                <th className="py-2.5 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentScreenings.map((session) => {
                const p = session.patient_details || session.patient || {};
                const grade = session.highest_icdr_grade || 0;
                return (
                  <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pl-3">
                      <strong className="text-slate-900 block">{p.full_name || 'Patient'}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">{p.mrn}</span>
                    </td>
                    <td className="py-3 text-slate-700">{p.age}y / {p.gender}</td>
                    <td className="py-3 font-mono text-slate-600">{p.abha_id || '91-4829-1029-4821'}</td>
                    <td className="py-3 text-slate-700 font-bold">{p.hba1c_level || 7.5}% • {p.systolic_bp || 130}/{p.diastolic_bp || 85}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        grade >= 3 ? 'bg-red-50 text-red-700 border-red-300' :
                        (grade >= 2 ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        (grade === 1 ? 'bg-blue-50 text-[#005eb8] border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'))
                      }`}>
                        Grade {grade}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[11px] font-bold ${grade >= 3 ? 'text-red-700' : 'text-slate-700'}`}>
                        {session.referral_recommendation ? session.referral_recommendation.replace('_', ' ') : 'Routine Annual'}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <button
                        onClick={() => {
                          onSelectSession(session.id);
                          onNavigate('ai-agent');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#005eb8] hover:bg-[#003087] text-white text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Fast Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
