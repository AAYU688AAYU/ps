import React, { useState } from 'react';
import { 
  Stethoscope, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  ExternalLink,
  Building2,
  Video,
  Send,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function FindSpecialistView({ hospital }) {
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const specialists = [
    {
      id: 1,
      name: 'Dr. Ananya Sharma, MD, DNB (Retina)',
      role: 'Senior Vitreoretinal Surgeon & Tele-Retina Consultant',
      hospital: 'AIIMS Apex Tele-Retina Hub',
      city: 'New Delhi',
      state: 'Delhi',
      specialty: 'VITREORETINAL',
      experience: '16 Years',
      rating: 4.9,
      availability: 'Mon - Fri • Next Slot: Today 3:30 PM',
      teleconsultAvailable: true,
      languages: 'English, Hindi',
      contact: '+91 11 26588500',
      email: 'dr.ananya.retina@aiims.edu.in'
    },
    {
      id: 2,
      name: 'Dr. Vikramaditya Kulkarni, MS, FVRS',
      role: 'Consultant Medical Retina & Diabetic Macular Edema Expert',
      hospital: 'KEM Hospital & Tele-Ophthalmology Center',
      city: 'Pune',
      state: 'Maharashtra',
      specialty: 'DME_ANTI_VEGF',
      experience: '14 Years',
      rating: 4.8,
      availability: 'Mon, Wed, Fri • Next Slot: Tomorrow 11:00 AM',
      teleconsultAvailable: true,
      languages: 'English, Marathi, Hindi',
      contact: '+91 20 26125600',
      email: 'dr.vkulkarni@kemhospital.org'
    },
    {
      id: 3,
      name: 'Dr. Priya Sundaram, MD, FRCS (Glasg)',
      role: 'Chief of Vitreoretinal Laser & Proliferative DR Clinic',
      hospital: 'Sankara Eye Hospital',
      city: 'Bengaluru',
      state: 'Karnataka',
      specialty: 'PDR_LASER',
      experience: '19 Years',
      rating: 5.0,
      availability: 'Daily 10 AM - 4 PM • Urgent On-Call',
      teleconsultAvailable: true,
      languages: 'English, Kannada, Tamil, Hindi',
      contact: '+91 80 28416490',
      email: 'dr.priya.s@sankaraeye.in'
    },
    {
      id: 4,
      name: 'Dr. Rajeshwar Patel, MS (Ophth), DNB',
      role: 'Associate Professor & Retina Specialist',
      hospital: 'Sir Sunderlal Hospital, IMS-BHU',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      specialty: 'VITREORETINAL',
      experience: '12 Years',
      rating: 4.7,
      availability: 'Tue, Thu, Sat • Next Slot: Today 5:00 PM',
      teleconsultAvailable: true,
      languages: 'English, Hindi, Bhojpuri',
      contact: '+91 542 2369001',
      email: 'dr.patel.retina@bhu.ac.in'
    },
    {
      id: 5,
      name: 'Dr. Meenakshi Sundaram, MS, Glaucoma Fellow',
      role: 'Glaucoma & Optic Nerve Specialist',
      hospital: 'Aravind Eye Care System',
      city: 'Madurai',
      state: 'Tamil Nadu',
      specialty: 'GLAUCOMA',
      experience: '15 Years',
      rating: 4.9,
      availability: 'Daily • Tele-Ophthal Ready',
      teleconsultAvailable: true,
      languages: 'English, Tamil, Hindi',
      contact: '+91 452 4356100',
      email: 'dr.meenakshi@aravind.org'
    }
  ];

  const filteredSpecialists = specialists.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.city.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedSpecialty === 'ALL') return true;
    return s.specialty === selectedSpecialty;
  });

  const handleBookTeleConsult = (specialist) => {
    setBookingSuccess(`Tele-consultation referral dispatch initiated with ${specialist.name} at ${specialist.hospital}. Clinical fundus data & ABHA records encrypted and shared.`);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      setBookingSuccess(null);
    }, 6000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Tele-Retina Specialist Directory & Referral Network
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-[#005eb8] border border-blue-200 px-2.5 py-0.5 rounded-full">
              AIIMS & National Health Mission Network
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-0.5">
            Connect Primary Health Centres with tertiary vitreoretinal surgeons, DME laser specialists, and emergency anti-VEGF centers.
          </p>
        </div>
      </div>

      {bookingSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{bookingSuccess}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Specialist Name, Hospital, or City..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#005eb8]"
          />
        </div>

        {/* Specialization Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'ALL', label: 'All Specialists' },
            { id: 'VITREORETINAL', label: 'Vitreoretinal Surgery' },
            { id: 'DME_ANTI_VEGF', label: 'DME & Anti-VEGF' },
            { id: 'PDR_LASER', label: 'Emergency PDR Laser' },
            { id: 'GLAUCOMA', label: 'Glaucoma & CDR' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedSpecialty(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSpecialty === tab.id
                  ? 'bg-[#005eb8] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Specialists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSpecialists.map((doc) => (
          <div
            key={doc.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all who-card-hover"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                    <span>{doc.name}</span>
                    <ShieldCheck className="w-4 h-4 text-[#005eb8]" />
                  </h3>
                  <p className="text-xs text-[#005eb8] font-bold mt-0.5">{doc.role}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{doc.hospital} • {doc.city}, {doc.state}</span>
                  </p>
                </div>

                <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  ★ {doc.rating}
                </span>
              </div>

              {/* Badges & Tele-Schedule */}
              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] font-semibold">Experience</span>
                  <strong className="text-slate-900">{doc.experience}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] font-semibold">Languages</span>
                  <span className="text-slate-800 font-semibold">{doc.languages}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-medium">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{doc.availability}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-200 text-xs">
              <button
                onClick={() => handleBookTeleConsult(doc)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#005eb8] hover:bg-[#003087] text-white font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Schedule Tele-Consult</span>
              </button>

              <button
                onClick={() => handleBookTeleConsult(doc)}
                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
                title="Send Emergency PDR Referral"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Urgent Referral</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
