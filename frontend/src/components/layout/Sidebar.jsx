import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Sparkles, 
  Stethoscope, 
  Bot, 
  Info,
  ShieldCheck, 
  Lock,
  Building2
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  onSelectTab, 
  pendingReviewCount = 0,
  hospital,
  onOpenAuthModal
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      desc: 'Clinical surveillance & live metrics'
    },
    {
      id: 'new-analysis',
      label: 'New Analysis',
      icon: PlusCircle,
      badge: 'Intake',
      badgeColor: 'bg-blue-100 text-[#005eb8] border-blue-200 font-bold',
      desc: 'Patient ABHA & retinal capture'
    },
    {
      id: 'patient-reports',
      label: 'Patient Reports',
      icon: FileText,
      badge: null,
      desc: 'Search archives & printable slips'
    },
    {
      id: 'ai-agent',
      label: 'AI Analysis Agent',
      icon: Sparkles,
      badge: pendingReviewCount > 0 ? `${pendingReviewCount} Urgent` : '30s Studio',
      badgeColor: pendingReviewCount > 0 ? 'bg-red-100 text-red-700 border-red-300 font-bold' : 'bg-purple-100 text-purple-700 border-purple-200',
      desc: 'Fast review, inspector & Kaggle hub'
    },
    {
      id: 'find-specialist',
      label: 'Find Specialization',
      icon: Stethoscope,
      badge: 'Tele-Network',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      desc: 'Vitreoretinal doctors & tele-referral'
    },
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      icon: Bot,
      badge: 'Co-Pilot',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      desc: 'Clinical Q&A, CSME & 4-2-1 rule'
    },
    {
      id: 'about',
      label: 'About',
      icon: Info,
      badge: 'WHO / SIH',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      desc: 'Project mission & standards'
    }
  ];

  return (
    <aside className="w-full lg:w-72 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 shadow-sm">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Clinical Modules</span>
          <span className="text-[10px] font-bold text-[#005eb8] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
            WHO v2.6
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full text-left p-2.5 rounded-xl transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                isActive 
                  ? 'bg-blue-50 text-[#005eb8] border border-blue-200 shadow-sm font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                isActive ? 'bg-[#005eb8] text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className={`text-sm font-bold truncate ${isActive ? 'text-[#005eb8]' : 'text-slate-900'}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Hospital Identity & Security Box */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        {hospital ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[#005eb8] font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">{hospital.name}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              ID: <strong className="text-slate-800">{hospital.hospital_id}</strong> • {hospital.district}
            </p>
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Encrypted Node
              </span>
              <button
                onClick={onOpenAuthModal}
                className="text-[#005eb8] hover:underline font-semibold cursor-pointer"
              >
                Switch
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-slate-700 font-bold">
              <Lock className="w-4 h-4 text-[#005eb8]" />
              <span>Hospital Node Login</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Sign in with your Hospital ID to secure screening sessions.
            </p>
            <button
              onClick={onOpenAuthModal}
              className="w-full bg-[#005eb8] hover:bg-[#003087] text-white font-bold py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Authenticate Hospital
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
