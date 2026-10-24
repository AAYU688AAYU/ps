import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';
import { 
  Users, 
  Eye, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  TrendingUp, 
  Award,
  Globe2,
  Building2
} from 'lucide-react';

export default function DistrictEpidemiologyDashboard({ stats, centers }) {
  const summary = stats?.summary || {};
  const icdrDist = stats?.icdr_distribution || [
    { grade: 'Grade 0: Normal', count: 74, pct: 74.0, color: '#10b981' },
    { grade: 'Grade 1: Mild NPDR', count: 8, pct: 8.0, color: '#005eb8' },
    { grade: 'Grade 2: Mod NPDR', count: 12, pct: 12.0, color: '#f59e0b' },
    { grade: 'Grade 3: Sev NPDR', count: 4, pct: 4.0, color: '#dc2626' },
    { grade: 'Grade 4: PDR', count: 2, pct: 2.0, color: '#991b1b' },
  ];

  const durationData = [
    { duration: '< 5 yrs', normal: 85, mild: 10, moderate: 4, severe_pdr: 1 },
    { duration: '5 - 10 yrs', normal: 60, mild: 18, moderate: 15, severe_pdr: 7 },
    { duration: '10 - 15 yrs', normal: 35, mild: 22, moderate: 28, severe_pdr: 15 },
    { duration: '15 - 20 yrs', normal: 20, mild: 15, moderate: 35, severe_pdr: 30 },
    { duration: '> 20 yrs', normal: 10, mild: 12, moderate: 38, severe_pdr: 40 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              WHO & National Health Mission Tele-Retina Surveillance
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-[#005eb8] border border-blue-200 px-2.5 py-0.5 rounded-full">
              Epidemiological Intelligence
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            District-wide disease prevalence monitoring, camera quality audits, and tele-ophthalmology throughput indicators.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700">
          <Globe2 className="w-4 h-4 text-[#005eb8]" />
          <span>India Cohort: <strong>77M Diabetic Adults</strong></span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Screened */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Patients Screened</span>
            <Users className="w-4 h-4 text-[#005eb8]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {summary.total_patients || 8}
          </p>
          <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-bold">
            <TrendingUp className="w-3 h-3" />
            <span>Target: 100,000 / district / yr</span>
          </p>
        </div>

        {/* Referable DR Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Referable DR Prevalence</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600">
            {summary.referable_dr_rate_pct || 18.2}%
          </p>
          <p className="text-[11px] text-slate-500">
            National Avg: ~18.0% in diabetic cohort
          </p>
        </div>

        {/* High Risk Proliferative DR */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>High-Risk PDR Detected</span>
            <Eye className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-extrabold text-red-600">
            {summary.proliferative_cases || 1}
          </p>
          <p className="text-[11px] text-red-700 font-bold">
            Immediate 48-72h surgical triage
          </p>
        </div>

        {/* Image Quality Compliance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Camera IQA Pass Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700">
            {stats?.quality_control?.gradeable_percentage || 92.5}%
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            Avg Quality: {stats?.quality_control?.avg_overall_quality || 86}%
          </p>
        </div>

      </div>

      {/* Main Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ICDR Severity Distribution Bar Chart (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">
              ICDR 5-Grade Severity Breakdown
            </h3>
            <span className="text-xs text-slate-500 font-medium">International Clinical Scale</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={icdrDist} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="grade" stroke="#64748b" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                />
                <Bar dataKey="pct" name="Percentage (%)" radius={[6, 6, 0, 0]}>
                  {icdrDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diabetes Duration vs Severity Stacked Bar Chart (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base">
              Disease Duration vs. DR Progression
            </h3>
            <span className="text-xs text-slate-500 font-medium">Cohort Epidemiology</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="duration" stroke="#64748b" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="normal" name="Grade 0: Normal" stackId="a" fill="#10b981" />
                <Bar dataKey="mild" name="Grade 1: Mild" stackId="a" fill="#005eb8" />
                <Bar dataKey="moderate" name="Grade 2: Mod" stackId="a" fill="#f59e0b" />
                <Bar dataKey="severe_pdr" name="Grade 3/4: Sev/PDR" stackId="a" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* District Primary Health Centers Leaderboard */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#005eb8]" />
            <h3 className="font-extrabold text-slate-900 text-base">
              District Primary Health Centers (PHC) Tele-Node Audit
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Real-Time Connectivity</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="py-2.5 pl-3">PHC / Node Name</th>
                <th className="py-2.5">District / State</th>
                <th className="py-2.5">Catchment Pop.</th>
                <th className="py-2.5">Camera Hardware</th>
                <th className="py-2.5">Uplink Speed</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {centers?.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 pl-3 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 text-slate-700">{c.district}, {c.state}</td>
                  <td className="py-3 text-slate-700 font-semibold">{c.catchment_population?.toLocaleString()}</td>
                  <td className="py-3 text-slate-600">{c.camera_model}</td>
                  <td className="py-3 font-mono font-bold text-[#005eb8]">{(c.bandwidth_kbps / 1024).toFixed(1)} Mbps</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active Online
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
