import React, { useState } from 'react';
import { 
  Sparkles, 
  Zap, 
  Layers, 
  Database, 
  Sliders, 
  Eye, 
  CheckCircle2, 
  Activity, 
  Cpu 
} from 'lucide-react';
import FastReviewStudio from '../workstation/FastReviewStudio';
import RetinalInspector from '../workstation/RetinalInspector';
import SimulinkSimulatorView from '../simulator/SimulinkSimulatorView';

export default function AIAgentWorkstationView({
  session,
  onBack,
  onValidate,
  onViewReport,
  onRunSimulation
}) {
  const [activeSubTab, setActiveSubTab] = useState('fast-review'); // 'fast-review' | 'inspector' | 'district-sim'

  return (
    <div className="space-y-5">
      
      {/* Top AI Agent Sub-Navigation Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">
              MindHue AI Analysis Agent Workstation
            </h2>
            <p className="text-[11px] text-slate-500">
              Multi-task deep learning intelligence suite: Fast Review, Sub-Pixel Inspector, and District Simulation
            </p>
          </div>
        </div>

        {/* Sub-Mode Switcher */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('fast-review')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'fast-review'
                ? 'bg-[#005eb8] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>30-Sec Fast Review</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inspector')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'inspector'
                ? 'bg-[#005eb8] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Retinal Inspector</span>
          </button>

          <button
            onClick={() => setActiveSubTab('district-sim')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'district-sim'
                ? 'bg-[#005eb8] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>District 100k Simulator</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab View Rendering */}
      <div>
        {activeSubTab === 'fast-review' && (
          <FastReviewStudio
            session={session}
            onBack={onBack}
            onValidate={onValidate}
            onViewReport={onViewReport}
          />
        )}

        {activeSubTab === 'inspector' && (
          <RetinalInspector
            session={session}
          />
        )}

        {activeSubTab === 'district-sim' && (
          <SimulinkSimulatorView
            onRunSimulation={onRunSimulation}
          />
        )}
      </div>

    </div>
  );
}
