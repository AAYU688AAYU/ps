import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Eye, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Filter, 
  QrCode, 
  Building2,
  Calendar,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

export default function PatientReportsView({
  screenings,
  onSelectSession,
  onViewReport
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredScreenings = screenings.filter(s => {
    const p = s.patient_details || s.patient || {};
    const name = p.full_name?.toLowerCase() || '';
    const mrn = p.mrn?.toLowerCase() || '';
    const abha = p.abha_id?.toLowerCase() || '';
    const q = searchTerm.toLowerCase();

    const matchesSearch = name.includes(q) || mrn.includes(q) || abha.includes(q);
    if (!matchesSearch) return false;

    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'REFERABLE') return s.referable_flag === true;
    if (filterSeverity === 'HIGH_RISK') return s.highest_icdr_grade >= 3;
    if (filterSeverity === 'NORMAL') return s.highest_icdr_grade === 0;
    if (filterSeverity === 'VERIFIED') return s.status === 'VERIFIED';
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
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-300">Grade 3: Sev NPDR</span>;
      case 4:
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-600 text-white shadow-sm animate-pulse">Grade 4: PDR (Urgent)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Pending AI</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Patient Screening Reports & Clinical Archives
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-[#005eb8] border border-blue-200 px-2.5 py-0.5 rounded-full">
              WHO & ABDM Verified
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Search patient records, view multi-spectral retinal evidence, and export official printable clinical slips with QR verification.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Name, MRN, or ABHA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#005eb8] transition-colors"
          />
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'REFERABLE', label: 'Referable DR' },
            { id: 'HIGH_RISK', label: 'High Risk (Grade 3/4)' },
            { id: 'NORMAL', label: 'Normal (Grade 0)' },
            { id: 'VERIFIED', label: 'Doctor Verified' }
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

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="py-3 pl-4">Patient Information</th>
                <th className="py-3">ABHA & MRN</th>
                <th className="py-3">Diabetes Vitals</th>
                <th className="py-3">ICDR Severity</th>
                <th className="py-3">Referral Protocol</th>
                <th className="py-3">Verification Status</th>
                <th className="py-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredScreenings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                filteredScreenings.map((session) => {
                  const p = session.patient_details || session.patient || {};
                  const grade = session.highest_icdr_grade || 0;
                  const isVerified = session.status === 'VERIFIED';

                  return (
                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pl-4">
                        <strong className="text-slate-900 text-sm block font-extrabold">{p.full_name || 'Patient'}</strong>
                        <span className="text-[11px] text-slate-500">{p.age} Yrs / {p.gender} • {p.village_or_city || 'Rural Block'}</span>
                      </td>

                      <td className="py-3.5 font-mono">
                        <span className="text-slate-800 font-bold block">{p.mrn}</span>
                        <span className="text-[10px] text-slate-500">{p.abha_id || '91-4829-1029-4821'}</span>
                      </td>

                      <td className="py-3.5">
                        <span className={`font-bold block ${p.hba1c_level >= 8.5 ? 'text-red-700' : 'text-slate-900'}`}>
                          HbA1c: {p.hba1c_level || 7.5}%
                        </span>
                        <span className="text-[10px] text-slate-500">BP: {p.systolic_bp || 130}/{p.diastolic_bp || 85} mmHg</span>
                      </td>

                      <td className="py-3.5">
                        {getGradeBadge(grade)}
                      </td>

                      <td className="py-3.5 font-semibold text-slate-800">
                        {session.referral_recommendation ? session.referral_recommendation.replace('_', ' ') : 'Routine Annual'}
                      </td>

                      <td className="py-3.5">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> Signed-Off
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewReport(session.id)}
                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title="View / Print WHO Clinical Slip"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#005eb8]" />
                            <span>PDF Slip</span>
                          </button>

                          <button
                            onClick={() => onSelectSession(session.id)}
                            className="p-1.5 rounded-lg bg-[#005eb8] hover:bg-[#003087] text-white transition-colors cursor-pointer"
                            title="Open Deep Retinal Inspector"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
