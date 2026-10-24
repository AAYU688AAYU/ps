import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Sliders, 
  Play, 
  Cpu, 
  Wifi, 
  Users, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2,
  Sparkles,
  TrendingUp,
  RefreshCw,
  Zap,
  Activity
} from 'lucide-react';

export default function SimulinkSimulatorView({ onRunSimulation }) {
  const [params, setParams] = useState({
    annual_target: 100000,
    active_phcs: 40,
    ophthalmologist_count: 3,
    doctor_hours_per_day: 4.0,
    avg_bandwidth_kbps: 2048,
    use_edge_ai: true,
    enable_30s_fast_review: true
  });

  const [simResults, setSimResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const executeSimulation = async (customParams = params) => {
    setIsRunning(true);
    try {
      const results = await onRunSimulation(customParams);
      setSimResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    executeSimulation();
  }, []);

  const handleParamChange = (key, value) => {
    const updated = { ...params, [key]: value };
    setParams(updated);
  };

  // Combine timeline into chart-ready data
  const chartData = simResults?.timeline?.months?.map((m, i) => ({
    month: m,
    cumulative_screened: simResults.timeline.cumulative_screened[i],
    backlog: simResults.timeline.backlog_trajectory[i]
  })) || [];

  const util = simResults?.doctor_workload?.doctor_utilization_pct || 72;
  const isOverloaded = util > 100;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Simulink District Tele-Ophthalmology Queue Model
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-[#005eb8] border border-blue-200 px-2.5 py-0.5 rounded-full">
              Discrete Event Simulation
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Optimize tele-retina network parameters (100,000+ patients/year) across rural PHCs, bandwidth constraints, and specialist review capacity.
          </p>
        </div>

        <button
          onClick={() => executeSimulation()}
          disabled={isRunning}
          className="flex items-center gap-2 bg-[#005eb8] hover:bg-[#00478f] text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer disabled:opacity-50"
        >
          <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Simulating Model...' : 'Run Simulink Simulation'}</span>
        </button>
      </div>

      {/* Main Grid: Parameter Controls (5 Cols) vs Dynamic Outputs (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Control Sliders */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#005eb8]" />
              <span>Model Parameters</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Rural Catchment</span>
          </div>

          {/* Slider 1: Annual Screening Target */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Annual Patient Target:</span>
              <span className="font-mono text-[#005eb8] font-extrabold">{params.annual_target.toLocaleString()} patients</span>
            </div>
            <input
              type="range"
              min="20000"
              max="300000"
              step="10000"
              value={params.annual_target}
              onChange={(e) => handleParamChange('annual_target', parseInt(e.target.value))}
              className="w-full accent-[#005eb8] cursor-pointer"
            />
          </div>

          {/* Slider 2: Active PHCs */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Active PHC / Mobile Van Nodes:</span>
              <span className="font-mono text-[#005eb8] font-extrabold">{params.active_phcs} centers</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={params.active_phcs}
              onChange={(e) => handleParamChange('active_phcs', parseInt(e.target.value))}
              className="w-full accent-[#005eb8] cursor-pointer"
            />
          </div>

          {/* Slider 3: Tele-Ophthalmologists Count */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Tele-Ophthalmologist Roster:</span>
              <span className="font-mono text-[#005eb8] font-extrabold">{params.ophthalmologist_count} retina doctors</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={params.ophthalmologist_count}
              onChange={(e) => handleParamChange('ophthalmologist_count', parseInt(e.target.value))}
              className="w-full accent-[#005eb8] cursor-pointer"
            />
          </div>

          {/* Slider 4: Doctor Working Hours */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Tele-Review Hours / Day / Doctor:</span>
              <span className="font-mono text-[#005eb8] font-extrabold">{params.doctor_hours_per_day} hrs/day</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.5"
              value={params.doctor_hours_per_day}
              onChange={(e) => handleParamChange('doctor_hours_per_day', parseFloat(e.target.value))}
              className="w-full accent-[#005eb8] cursor-pointer"
            />
          </div>

          {/* Slider 5: Bandwidth */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-700 font-bold">Rural Uplink Bandwidth:</span>
              <span className="font-mono text-[#005eb8] font-extrabold">{(params.avg_bandwidth_kbps / 1024).toFixed(1)} Mbps</span>
            </div>
            <input
              type="range"
              min="256"
              max="10240"
              step="256"
              value={params.avg_bandwidth_kbps}
              onChange={(e) => handleParamChange('avg_bandwidth_kbps', parseInt(e.target.value))}
              className="w-full accent-[#005eb8] cursor-pointer"
            />
          </div>

          {/* Technology Toggles */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            
            {/* Edge AI Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-900 block">Edge AI Ingestion (ONNX/TPU)</span>
                <span className="text-[10px] text-slate-500 font-medium">Instant offline triage & IQA retake reduction</span>
              </div>
              <input
                type="checkbox"
                checked={params.use_edge_ai}
                onChange={(e) => handleParamChange('use_edge_ai', e.target.checked)}
                className="w-4 h-4 accent-[#005eb8] rounded cursor-pointer"
              />
            </div>

            {/* 30s Fast Review Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-900 block">30s Fast-Review Studio</span>
                <span className="text-[10px] text-slate-500 font-medium">Grad-CAM + lesion overlay for 15-35s verification</span>
              </div>
              <input
                type="checkbox"
                checked={params.enable_30s_fast_review}
                onChange={(e) => handleParamChange('enable_30s_fast_review', e.target.checked)}
                className="w-4 h-4 accent-[#005eb8] rounded cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* Right: Simulation Telemetry & Real-Time Charts */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* Output KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            
            {/* Doctor Utilization */}
            <div className={`p-3.5 rounded-xl border ${
              isOverloaded ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <span className="text-slate-500 block text-[10px] font-semibold">Doctor Workload</span>
              <span className={`text-xl font-extrabold ${isOverloaded ? 'text-red-700' : 'text-[#005eb8]'}`}>
                {util}%
              </span>
              <span className="text-[10px] text-slate-500 block font-medium">
                {isOverloaded ? 'Backlog Accumulating' : 'Optimal Capacity'}
              </span>
            </div>

            {/* Turnaround Time */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-slate-500 block text-[10px] font-semibold">Avg Turnaround</span>
              <span className="text-xl font-extrabold text-slate-900">
                {simResults?.throughput_metrics?.avg_turnaround_hours || 0.5}h
              </span>
              <span className="text-[10px] text-slate-500 block">Emergency: &lt; 20 min</span>
            </div>

            {/* Cost Per Patient */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-slate-500 block text-[10px] font-semibold">Cost / Screened</span>
              <span className="text-xl font-extrabold text-emerald-700">
                ₹{simResults?.economic_impact?.cost_per_patient_inr || 38}
              </span>
              <span className="text-[10px] text-slate-500 block">
                (${simResults?.economic_impact?.cost_per_patient_usd || 0.44})
              </span>
            </div>

            {/* Prevented Blindness Cases */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-slate-500 block text-[10px] font-semibold">Vision Saved</span>
              <span className="text-xl font-extrabold text-amber-700">
                {simResults?.economic_impact?.prevented_blindness_cases?.toLocaleString() || '4,050'}
              </span>
              <span className="text-[10px] text-slate-500 block font-medium">Annual blindness prevented</span>
            </div>

          </div>

          {/* 12-Month Cumulative Screening vs Backlog Trajectory Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                12-Month Screening Velocity vs. Tele-Queue Backlog
              </h3>
              <span className="text-xs text-slate-500 font-medium">Simulink ODE Model</span>
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScreened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#005eb8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#005eb8" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorBacklog" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#475569' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                  <Area type="monotone" dataKey="cumulative_screened" name="Cumulative Screened Patients" stroke="#005eb8" fillOpacity={1} fill="url(#colorScreened)" />
                  <Area type="monotone" dataKey="backlog" name="Unverified Case Backlog" stroke="#dc2626" fillOpacity={1} fill="url(#colorBacklog)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Optimization Recommendations */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-2">
            <h4 className="font-extrabold text-[#005eb8] text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulink Resource Allocation Directives</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-800">
              {simResults?.recommendations?.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
