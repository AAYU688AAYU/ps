import React, { useState } from 'react';
import { 
  Search, 
  UserPlus, 
  Eye, 
  Upload, 
  FileCheck2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldAlert,
  ArrowRight,
  Filter,
  Activity,
  Heart,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export default function PatientTriageView({
  patients,
  screenings,
  onSelectSession,
  onOpenRegisterModal,
  onOpenUploadModal,
  onViewReport
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  // Filter sessions
  const filteredSessions = screenings.filter(s => {
    const patientName = s.patient_details?.full_name?.toLowerCase() || '';
    const mrn = s.patient_details?.mrn?.toLowerCase() || '';
    const abha = s.patient_details?.abha_id?.toLowerCase() || '';
    const query = searchTerm.toLowerCase();
    
    const matchesSearch = patientName.includes(query) || mrn.includes(query) || abha.includes(query);
    
    if (!matchesSearch) return false;
    
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'REFERABLE') return s.referable_flag === true;
    if (filterSeverity === 'PENDING') return s.status === 'AI_GRADED' || s.status === 'PENDING_AI';
    if (filterSeverity === 'VERIFIED') return s.status === 'VERIFIED';
    if (filterSeverity === 'HIGH_RISK') return s.highest_icdr_grade >= 3;
    
    return true;
  });

  const getGradeBadge = (grade) => {
    switch (grade) {
      case 0:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Grade 0: Normal</span>;
      case 1:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#005eb8] border border-blue-200">Grade 1: Mild NPDR</span>;
      case 2:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">Grade 2: Mod NPDR</span>;
      case 3:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-300">Grade 3: Sev NPDR (Urgent)</span>;
      case 4:
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-600 text-white shadow-sm animate-pulse">Grade 4: PDR (Emergency)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Pending AI</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Primary Health Centre (PHC) Screening Triage
            </h2>
            <span className="bg-blue-50 text-[#005eb8] border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Field Ingestion Active
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Real-time diabetic retinopathy queue with automated IQA adequacy check and ICDR triage classification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenRegisterModal}
            className="flex items-center gap-2 bg-[#005eb8] hover:bg-[#00478f] text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-blue-900/10 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, MRN, or ABHA ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#005eb8] transition-colors placeholder:text-slate-400"
          />
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Screenings' },
            { id: 'REFERABLE', label: 'Referable DR (rDR)' },
            { id: 'HIGH_RISK', label: 'High Risk (Grade 3/4)' },
            { id: 'PENDING', label: 'Pending Review' },
            { id: 'VERIFIED', label: 'Verified' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterSeverity(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterSeverity === tab.id
                  ? 'bg-[#005eb8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Screening Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSessions.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Eye className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-800 font-bold text-base">No screening sessions found</p>
            <p className="text-slate-500 text-xs mt-1">Register a patient or click "Seed Benchmark Data" to load clinical cases.</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const p = session.patient_details || {};
            const isReferable = session.referable_flag;
            const highestGrade = session.highest_icdr_grade;
            const isVerified = session.status === 'VERIFIED';

            return (
              <div
                key={session.id}
                className={`bg-white p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between who-card-hover ${
                  highestGrade >= 3 
                    ? 'border-red-300 ring-1 ring-red-200' 
                    : (isReferable ? 'border-amber-300' : 'border-slate-200')
                }`}
              >
                <div>
                  {/* Card Header: Patient Identity & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-base">
                          {p.full_name || 'Patient'}
                        </h3>
                        <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded font-bold">
                          {p.age}y / {p.gender}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        MRN: {p.mrn} {p.abha_id ? `• ABHA: ${p.abha_id}` : ''}
                      </p>
                    </div>

                    {getGradeBadge(highestGrade)}
                  </div>

                  {/* Vitals & History Chips */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-4">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold">HbA1c</span>
                      <span className={`font-bold ${p.hba1c_level >= 8.5 ? 'text-red-700' : (p.hba1c_level >= 7.0 ? 'text-amber-700' : 'text-emerald-700')}`}>
                        {p.hba1c_level || 7.5}%
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold">Blood Pressure</span>
                      <span className="font-bold text-slate-800">
                        {p.systolic_bp || 130}/{p.diastolic_bp || 85}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold">Duration</span>
                      <span className="font-bold text-slate-800">
                        {p.diabetes_duration_years || 5} yrs
                      </span>
                    </div>
                  </div>

                  {/* Referral Urgency Notice */}
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-50 border border-slate-200 mb-4">
                    <span className="text-slate-600 font-medium">Triage Protocol:</span>
                    <span className={`font-bold ${highestGrade >= 3 ? 'text-red-700' : 'text-[#005eb8]'}`}>
                      {session.referral_recommendation ? session.referral_recommendation.replace('_', ' ') : 'Routine Annual'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-[#005eb8] hover:bg-[#00478f] text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>30-Sec Fast Review</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>

                  <button
                    onClick={() => onOpenUploadModal(session.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                    title="Upload Fundus Images"
                  >
                    <Upload className="w-4 h-4 text-[#005eb8]" />
                  </button>

                  <button
                    onClick={() => onViewReport(session.id)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
                    title="View WHO Clinical Report"
                  >
                    <FileText className="w-4 h-4 text-emerald-700" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
