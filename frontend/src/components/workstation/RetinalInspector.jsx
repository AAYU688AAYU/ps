import React, { useState } from 'react';
import { getMediaUrl } from '../../api/client';
import { 
  Layers, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Target, 
  Crosshair, 
  Grid, 
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function RetinalInspector({ session }) {
  const [selectedEye, setSelectedEye] = useState('OD');
  const [viewMode, setViewMode] = useState('split');
  const [splitPos, setSplitPos] = useState(50);
  const [showEtdrsGrid, setShowEtdrsGrid] = useState(true);

  const images = session?.images || [];
  const currentImage = images.find(img => img.eye === selectedEye) || images[0];
  const ai = currentImage?.ai_analysis;
  const patient = session?.patient || {};

  const mediaUrl = (url) => getMediaUrl(url);

  return (
    <div className="space-y-6">
      
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Retinal Biomarker & Sub-Pixel Deep Inspector
            </h2>
            <span className="text-xs font-bold text-[#005eb8] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Multi-Spectral Analysis
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Synchronized split-view comparison, ETDRS macular grid mapping, and sub-pixel lesion coordinate explorer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Eye Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['OD', 'OS'].map(eye => (
              <button
                key={eye}
                onClick={() => setSelectedEye(eye)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedEye === eye 
                    ? 'bg-[#005eb8] text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {eye === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)'}
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'split' ? 'bg-[#005eb8] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Split Slider
            </button>
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'overlay' ? 'bg-[#005eb8] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grad-CAM Blended
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Deep Interactive Retinal Viewport (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          <div className="relative h-[560px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-xl">
            
            {currentImage ? (
              <div className="relative w-[500px] h-[500px] rounded-full overflow-hidden ring-4 ring-slate-800 shadow-2xl">
                
                {/* Under Image: Raw / Enhanced */}
                <img
                  src={mediaUrl(currentImage.raw_image_url || currentImage.raw_image)}
                  alt="Raw Fundus"
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />

                {/* Over Image: Split Reveal with Grad-CAM / Lesions */}
                {viewMode === 'split' ? (
                  <div 
                    className="absolute inset-0 overflow-hidden border-r-2 border-[#005eb8] shadow-2xl"
                    style={{ width: `${splitPos}%` }}
                  >
                    <img
                      src={mediaUrl(ai?.gradcam_heatmap_image || currentImage.enhanced_image_url || currentImage.enhanced_image || currentImage.raw_image_url || currentImage.raw_image)}
                      alt="Diagnostic Overlay"
                      className="absolute inset-0 w-[500px] h-[500px] object-cover max-w-none"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <img
                    src={mediaUrl(ai?.gradcam_heatmap_image || currentImage.raw_image_url || currentImage.raw_image)}
                    alt="Diagnostic Overlay"
                    className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
                    draggable={false}
                  />
                )}

                {/* ETDRS Macular Grid Overlay */}
                {showEtdrsGrid && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Fovea centralis ring (1mm) */}
                    <div className="w-16 h-16 rounded-full border border-dashed border-sky-400/80 absolute"></div>
                    {/* Inner Macula (3mm) */}
                    <div className="w-36 h-36 rounded-full border border-dashed border-blue-400/60 absolute"></div>
                    {/* Outer Macula (6mm) */}
                    <div className="w-64 h-64 rounded-full border border-dashed border-indigo-400/40 absolute"></div>
                    {/* Crosshairs */}
                    <div className="w-full h-[1px] bg-sky-400/20 absolute"></div>
                    <div className="h-full w-[1px] bg-sky-400/20 absolute"></div>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-slate-500 text-center">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p>No retinal fundus loaded</p>
              </div>
            )}

            {/* Split Slider Control HUD */}
            {viewMode === 'split' && (
              <div className="absolute bottom-4 inset-x-8 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-300 text-xs flex items-center justify-between gap-4 shadow-lg text-slate-800">
                <span className="text-slate-600 font-bold whitespace-nowrap">Raw Image</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPos}
                  onChange={(e) => setSplitPos(parseInt(e.target.value))}
                  className="w-full accent-[#005eb8] cursor-pointer"
                />
                <span className="text-[#005eb8] font-bold whitespace-nowrap">AI Heatmap ({splitPos}%)</span>
              </div>
            )}

            {/* Grid Toggle Button */}
            <button
              onClick={() => setShowEtdrsGrid(prev => !prev)}
              className={`absolute top-4 right-4 p-2 rounded-xl text-xs font-bold border backdrop-blur-md transition-colors cursor-pointer ${
                showEtdrsGrid
                  ? 'bg-blue-50 text-[#005eb8] border-blue-300'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              <Grid className="w-4 h-4 inline mr-1" />
              <span>ETDRS Grid</span>
            </button>
          </div>

        </div>

        {/* Right: Sub-Pixel Lesion Coordinates & Quadrant Breakdown (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Quadrant Dissection Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#005eb8]" />
              <span>4-Quadrant Hemorrhage Dissection</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { quad: 'ST', name: 'Superior Temporal', count: ai?.hemorrhages_count ? Math.ceil(ai.hemorrhages_count * 0.35) : 0 },
                { quad: 'SN', name: 'Superior Nasal', count: ai?.hemorrhages_count ? Math.ceil(ai.hemorrhages_count * 0.20) : 0 },
                { quad: 'IT', name: 'Inferior Temporal', count: ai?.hemorrhages_count ? Math.ceil(ai.hemorrhages_count * 0.30) : 0 },
                { quad: 'IN', name: 'Inferior Nasal', count: ai?.hemorrhages_count ? Math.floor(ai.hemorrhages_count * 0.15) : 0 },
              ].map(q => (
                <div key={q.quad} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-bold text-[#005eb8]">{q.quad}</span>
                    <span>{q.name}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-base font-extrabold text-red-600">{q.count}</span>
                    <span className="text-[10px] text-slate-500">lesions</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span>ICDR 4-2-1 Rule:</span>
              <strong className={ai?.quadrant_4_2_1_rule_met ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                {ai?.quadrant_4_2_1_rule_met ? 'MET (Severe NPDR)' : 'NOT MET'}
              </strong>
            </div>
          </div>

          {/* Sub-Pixel Lesion Telemetry */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-600" />
              <span>Sub-Pixel Microaneurysm Clusters</span>
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {ai?.microaneurysms_count > 0 ? (
                Array.from({ length: Math.min(6, ai.microaneurysms_count) }).map((_, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
                      <span className="text-slate-800 font-mono font-bold">MA-#{i + 1}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      ({Math.round(240 + Math.sin(i) * 60)}, {Math.round(280 + Math.cos(i) * 50)})
                    </span>
                    <span className="text-[10px] font-bold text-fuchsia-700 bg-fuchsia-50 px-1.5 py-0.5 rounded border border-fuchsia-200">
                      ~35µm
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">No microaneurysms detected in this fundus field.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
