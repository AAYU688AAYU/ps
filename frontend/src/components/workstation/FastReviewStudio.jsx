import React, { useState, useEffect } from 'react';
import { getMediaUrl } from '../../api/client';
import { 
  Eye, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  FileText, 
  Send, 
  ArrowLeft,
  Info,
  ChevronRight,
  Activity,
  AlertOctagon,
  Sparkles,
  Sliders,
  Share2,
  Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FastReviewStudio({
  session,
  onBack,
  onValidate,
  onViewReport
}) {
  const [selectedEye, setSelectedEye] = useState('OD');
  const [activeOverlays, setActiveOverlays] = useState({
    raw: false,
    enhanced: false,
    gradcam: true,
    vessels: false,
    microaneurysms: true,
    exudates: true,
    hemorrhages: true,
    landmarks: true
  });

  const [heatmapOpacity, setHeatmapOpacity] = useState(0.65);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 30-Second Timer
  const [reviewSeconds, setReviewSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Validation Form State
  const [confirmedGrade, setConfirmedGrade] = useState(0);
  const [doctorName, setDoctorName] = useState('Dr. Ananya Sharma, MD, DNB (Retina)');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get active image and AI analysis
  const images = session?.images || [];
  const currentImage = images.find(img => img.eye === selectedEye) || images[0];
  const ai = currentImage?.ai_analysis;
  const patient = session?.patient || {};

  const mediaUrl = (url) => getMediaUrl(url);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setReviewSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (ai) {
      setConfirmedGrade(ai.icdr_grade);
      if (ai.icdr_grade === 0) {
        setClinicalNotes('Normal retinal vasculature and clear macula. Follow annual routine screening.');
        setTreatmentPlan('Maintain strict glycemic and blood pressure targets. Routine 12-month recall.');
      } else if (ai.icdr_grade === 1) {
        setClinicalNotes('Mild NPDR with isolated microaneurysms. No macular edema or urgent proliferative signs.');
        setTreatmentPlan('Intensify metabolic control. Early 6-month fundus screening recall.');
      } else if (ai.icdr_grade === 2) {
        setClinicalNotes('Moderate NPDR with hard exudates and microaneurysms. Macula monitored for DME progression.');
        setTreatmentPlan('Referral to district retina clinic for OCT scan. 3-month follow-up.');
      } else if (ai.icdr_grade === 3) {
        setClinicalNotes('Severe NPDR meeting ICDR 4-2-1 criteria. Quadrant hemorrhages and venous beading noted.');
        setTreatmentPlan('Urgent tele-retina consultation for anti-VEGF / Panretinal Photocoagulation (PRP) evaluation within 30 days.');
      } else if (ai.icdr_grade === 4) {
        setClinicalNotes('EMERGENCY: High-risk Proliferative Diabetic Retinopathy with neovascularization.');
        setTreatmentPlan('Immediate vitreoretinal surgical / laser intervention within 48-72 hours.');
      }
    }
  }, [ai]);

  const toggleOverlay = (key) => {
    setActiveOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanPos({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomLevel(1.0);
    setPanPos({ x: 0, y: 0 });
  };

  const handleSubmitValidation = async () => {
    setIsSubmitting(true);
    setIsTimerRunning(false);

    try {
      await onValidate(session.id, {
        ophthalmologist_name: doctorName,
        confirmed_icdr_grade: confirmedGrade,
        clinical_notes: clinicalNotes,
        treatment_plan: treatmentPlan,
        validation_duration_seconds: reviewSeconds
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimerColor = () => {
    if (reviewSeconds <= 20) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (reviewSeconds <= 30) return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-red-700 bg-red-50 border-red-300 font-bold';
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900">
                {patient.full_name || 'Patient'} ({patient.mrn})
              </h2>
              <span className="text-xs text-[#005eb8] font-bold px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                {patient.age}y / {patient.gender} • HbA1c: {patient.hba1c_level}%
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Session Code: {session?.session_code} • Center: {session?.district_center?.name}
            </p>
          </div>
        </div>

        {/* 30-Second Countdown & Eye Switcher */}
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

          {/* Under-30s Review Latency Timer */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs ${getTimerColor()}`}>
            <Clock className="w-4 h-4" />
            <div className="text-right">
              <span className="font-bold text-sm">{reviewSeconds}s</span>
              <span className="text-[10px] text-slate-500 ml-1">/ 30s Target</span>
            </div>
          </div>

          <button
            onClick={() => onViewReport(session?.id)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#005eb8]" />
            <span>WHO Report</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Retinal Inspector + Clinical Verification Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left / Center (7 Cols): Multi-Layer Retinal Canvas */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          
          {/* Layer Overlay Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-700 font-bold mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#005eb8]" /> Overlays:
              </span>

              {[
                { id: 'gradcam', label: 'Grad-CAM', activeClass: 'bg-blue-100 text-[#005eb8] border-blue-300' },
                { id: 'vessels', label: 'Vessels', activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                { id: 'microaneurysms', label: 'Microaneurysms', activeClass: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300' },
                { id: 'exudates', label: 'Hard Exudates', activeClass: 'bg-amber-100 text-amber-800 border-amber-300' },
                { id: 'hemorrhages', label: 'Hemorrhages', activeClass: 'bg-red-100 text-red-800 border-red-300 font-bold' },
                { id: 'enhanced', label: 'CLAHE Mode', activeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300' }
              ].map(layer => (
                <button
                  key={layer.id}
                  onClick={() => toggleOverlay(layer.id)}
                  className={`px-2.5 py-1 rounded-lg font-semibold border transition-all cursor-pointer ${
                    activeOverlays[layer.id]
                      ? `${layer.activeClass} shadow-sm`
                      : 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-800'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setZoomLevel(prev => Math.max(0.8, prev - 0.2))}
                className="p-1 text-slate-600 hover:text-slate-900"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-700 w-8 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(3.0, prev + 0.2))}
                className="p-1 text-slate-600 hover:text-slate-900"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetView}
                className="p-1 text-slate-600 hover:text-slate-900 ml-1 border-l border-slate-300 pl-1.5"
                title="Reset View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Retinal Interactive Viewport */}
          <div 
            className="relative h-[520px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none shadow-xl"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Viewport Background Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>

            {currentImage ? (
              <div
                className="relative transition-transform duration-75 origin-center"
                style={{
                  transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoomLevel})`
                }}
              >
                {/* Base Fundus Image (Raw or Enhanced) */}
                <img
                  src={mediaUrl(activeOverlays.enhanced && (currentImage.enhanced_image_url || currentImage.enhanced_image) ? (currentImage.enhanced_image_url || currentImage.enhanced_image) : (currentImage.raw_image_url || currentImage.raw_image))}
                  alt="Retinal Fundus"
                  className="w-[460px] h-[460px] object-cover rounded-full shadow-2xl ring-4 ring-slate-800/80"
                  draggable={false}
                />

                {/* Layer: Vessel Tree Overlay */}
                {activeOverlays.vessels && ai?.vessel_map_image && (
                  <img
                    src={mediaUrl(ai.vessel_map_image)}
                    alt="Vessel Map"
                    className="absolute inset-0 w-[460px] h-[460px] object-cover rounded-full pointer-events-none mix-blend-screen opacity-70"
                    draggable={false}
                  />
                )}

                {/* Layer: Lesions Overlay (Microaneurysms, Exudates, Hemorrhages) */}
                {(activeOverlays.microaneurysms || activeOverlays.exudates || activeOverlays.hemorrhages) && ai?.lesions_map_image && (
                  <img
                    src={mediaUrl(ai.lesions_map_image)}
                    alt="Lesions Overlay"
                    className="absolute inset-0 w-[460px] h-[460px] object-cover rounded-full pointer-events-none opacity-85"
                    draggable={false}
                  />
                )}

                {/* Layer: Grad-CAM Explainability Attention Map */}
                {activeOverlays.gradcam && ai?.gradcam_heatmap_image && (
                  <img
                    src={mediaUrl(ai.gradcam_heatmap_image)}
                    alt="Grad-CAM Heatmap"
                    className="absolute inset-0 w-[460px] h-[460px] object-cover rounded-full pointer-events-none mix-blend-screen"
                    style={{ opacity: heatmapOpacity }}
                    draggable={false}
                  />
                )}
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No retinal image available for {selectedEye}</p>
              </div>
            )}

            {/* Quality Score HUD Overlay */}
            {currentImage && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 text-xs shadow-md space-y-1 text-slate-900">
                <div className="flex items-center justify-between gap-3 font-bold">
                  <span className="text-slate-600">IQA Quality:</span>
                  <span className="text-emerald-700">{currentImage.iqa_overall_score || 88}%</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-500">Focus Score:</span>
                  <span className="font-semibold text-slate-800">{currentImage.iqa_focus_score || 85}%</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-slate-500">Illumination:</span>
                  <span className="font-semibold text-slate-800">{currentImage.iqa_illumination_score || 90}%</span>
                </div>
              </div>
            )}

            {/* Grad-CAM Opacity Slider HUD */}
            {activeOverlays.gradcam && (
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 text-xs flex items-center gap-2 shadow-md">
                <span className="text-slate-600 text-[11px] font-semibold">Heatmap Alpha:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={heatmapOpacity}
                  onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                  className="w-20 accent-[#005eb8] cursor-pointer"
                />
                <span className="font-mono text-slate-800 font-bold text-[11px] w-6">
                  {Math.round(heatmapOpacity * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right (5 Cols): AI Biomarkers & 1-Click Ophthalmologist Verification */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          
          {/* AI Diagnostic Decision Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#005eb8]" />
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  Clinical AI Biomarkers
                </h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#005eb8] border border-blue-200">
                AI Confidence: {Math.round((ai?.referable_confidence || 0.94) * 100)}%
              </span>
            </div>

            {/* Primary Severity Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              (ai?.icdr_grade || 0) >= 3
                ? 'bg-red-50 border-red-300 text-red-900'
                : ((ai?.icdr_grade || 0) >= 2 
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900')
            }`}>
              <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                (ai?.icdr_grade || 0) >= 3 ? 'text-red-600' : ((ai?.icdr_grade || 0) >= 2 ? 'text-amber-600' : 'text-emerald-600')
              }`} />
              <div>
                <h4 className="font-extrabold text-base">
                  {ai?.icdr_grade_name || 'Grade 0: Normal'}
                </h4>
                <p className="text-xs mt-1 leading-relaxed">
                  {ai?.clinical_explanation || 'No retinopathy detected.'}
                </p>
              </div>
            </div>

            {/* Quantitative Lesions Grid */}
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">Microaneurysms</span>
                <span className="font-extrabold text-base text-fuchsia-700">
                  {ai?.microaneurysms_count || 0}
                </span>
                <span className="text-[10px] text-slate-500 block">Sub-pixel Hessian</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">Hard Exudates</span>
                <span className="font-extrabold text-base text-amber-700">
                  {ai?.hard_exudates_count || 0}
                </span>
                <span className="text-[10px] text-slate-500 block">DME: {ai?.macular_edema_risk || 'None'}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block text-[10px] font-semibold">Hemorrhages</span>
                <span className="font-extrabold text-base text-red-700">
                  {ai?.hemorrhages_count || 0}
                </span>
                <span className="text-[10px] text-slate-500 block">{ai?.quadrant_4_2_1_rule_met ? '4-2-1 Met' : 'Isolated'}</span>
              </div>
            </div>

            {/* Secondary Suspect Biomarkers */}
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Cup-to-Disc (CDR):</span>
                <span className="font-bold text-slate-900">{ai?.optic_cup_disc_ratio || 0.35}</span>
                {ai?.glaucoma_suspect && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                    Glaucoma Suspect
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Neovascularization:</span>
                <span className={`font-bold ${ai?.neovascularization_detected ? 'text-red-700' : 'text-emerald-700'}`}>
                  {ai?.neovascularization_detected ? 'Detected (PDR)' : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* 1-Click Ophthalmologist Validation Box */}
          <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#005eb8]" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Ophthalmologist Clinical Sign-Off
                </h3>
              </div>
              <span className="text-xs text-slate-600 font-mono font-semibold">
                {doctorName}
              </span>
            </div>

            {/* ICDR Grade Confirmation Radio Buttons */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Confirm / Override ICDR Severity Level:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { grade: 0, label: '0: Normal' },
                  { grade: 1, label: '1: Mild' },
                  { grade: 2, label: '2: Mod' },
                  { grade: 3, label: '3: Sev' },
                  { grade: 4, label: '4: PDR' }
                ].map(item => (
                  <button
                    key={item.grade}
                    onClick={() => setConfirmedGrade(item.grade)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      confirmedGrade === item.grade
                        ? 'bg-[#005eb8] text-white border-[#005eb8] shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Prescriptions & Plan */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Clinical Directives & Treatment Plan:
              </label>
              <textarea
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 text-xs text-slate-900 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#005eb8] transition-colors"
                placeholder="Prescription / tele-referral directives..."
              />
            </div>

            {/* 1-Click Verification CTA */}
            <button
              onClick={handleSubmitValidation}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-[#005eb8] hover:bg-[#00478f] text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Validation...' : '1-Click Clinical Sign-Off & Generate Referral'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
