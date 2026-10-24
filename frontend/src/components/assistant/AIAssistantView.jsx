import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  User, 
  Clock,
  Lightbulb,
  ShieldCheck
} from 'lucide-react';

export default function AIAssistantView() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am MindHue Clinical AI Assistant, calibrated on WHO Global Eye Health & International Clinical Diabetic Retinopathy (ICDR) guidelines. How can I assist you with clinical triage, lesion interpretation, or patient counseling today?'
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const quickPrompts = [
    { label: 'Explain ICDR 4-2-1 Rule', query: 'What is the ICDR 4-2-1 rule for diagnosing Severe NPDR?' },
    { label: 'CSME Macular Edema Criteria', query: 'What are the diagnostic criteria for Clinically Significant Macular Edema (CSME)?' },
    { label: 'Recall Interval for Mild vs Mod NPDR', query: 'What are the recommended screening recall intervals for Grade 1 Mild NPDR vs Grade 2 Moderate NPDR?' },
    { label: 'Guidance for Blurry / Dark Fundus', query: 'How should a health worker handle a small pupil or blurry fundus capture at a rural PHC?' },
    { label: 'Hindi Patient Diet Advice', query: 'कृपया डायबिटिक रेटिनोपैथी मरीज के लिए सरल हिंदी में आहार और देखभाल संबंधी सलाह दें।' }
  ];

  const handleSend = (textToSend = inputText) => {
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponseText = '';
      const q = textToSend.toLowerCase();

      if (q.includes('4-2-1') || q.includes('severe npdr')) {
        aiResponseText = `The **ICDR 4-2-1 Rule** defines **Severe Non-Proliferative Diabetic Retinopathy (Grade 3)**. Severe NPDR carries a **50% risk of progressing to high-risk Proliferative DR (PDR) within 12 months** if left unmonitored.

It is diagnosed when **ANY ONE** of the following three criteria is present:
1. **"4"**: Definite intraretinal hemorrhages / microaneurysms (>20 per quadrant) in all **4 quadrants**.
2. **"2"**: Definite venous beading in **2 or more quadrants**.
3. **"1"**: Prominent Intraretinal Microvascular Abnormalities (IRMA) in **1 or more quadrants**.

**Action**: Urgent vitreoretinal tele-consultation within 30 days for FFA / Anti-VEGF / Laser evaluation.`;
      } else if (q.includes('csme') || q.includes('macular edema')) {
        aiResponseText = `**Clinically Significant Macular Edema (CSME)** according to the Early Treatment Diabetic Retinopathy Study (ETDRS) standard:

CSME is present if **ANY** of the following is true:
1. Retinal thickening at or within **500 µm (1/3 disc diameter)** of the foveal center.
2. Hard exudates at or within **500 µm** of the foveal center, if associated with adjacent retinal thickening.
3. A zone of retinal thickening **1 disc area (1500 µm) or larger**, any part of which is within 1 disc diameter of the foveal center.

**Clinical Recommendation**: Immediate referral for Optical Coherence Tomography (OCT) and intravitreal anti-VEGF therapy.`;
      } else if (q.includes('recall') || q.includes('interval') || q.includes('mild')) {
        aiResponseText = `**WHO & AIIMS Recommended Follow-up Screening Intervals**:
- **Grade 0 (No DR)**: Routine annual fundus screening (12 months).
- **Grade 1 (Mild NPDR)**: Early follow-up screening in **6 months**; intensify glycemic control.
- **Grade 2 (Moderate NPDR)**: Priority specialist review in **3 months**; OCT scan for DME.
- **Grade 3 (Severe NPDR)**: Urgent retina referral within **1 month** (high risk of neovascularization).
- **Grade 4 (Proliferative DR)**: **Emergency referral within 48 to 72 hours** for Panretinal Photocoagulation (PRP) or surgical vitrectomy.`;
      } else if (q.includes('blurry') || q.includes('dark') || q.includes('pupil') || q.includes('iqa')) {
        aiResponseText = `**Rural PHC Operator Protocol for Borderline / Ungradeable Captures**:
1. **Defocus Blur**: Ask the patient to blink twice. Adjust the camera diopter focus knob to match the refractive error. Re-stabilize patient forehead against the upper bar.
2. **Underexposure / Small Pupil (<3.5mm)**:
   - Dim all room ambient lights for 3-5 minutes to allow physiological dark adaptation.
   - If non-mydriatic capture fails and permitted under medical protocol, administer 1 drop of **0.5% Tropicamide**.
3. **Corneal Flash Reflection**: Shift the camera fixation target angle by ~5° off-axis.`;
      } else if (q.includes('hindi') || q.includes('हिंदी') || q.includes('आहार')) {
        aiResponseText = `**डायबिटिक रेटिनोपैथी मरीज के लिए सरल हिंदी परामर्श (Patient Advice in Hindi)**:

1. **रक्त शर्करा (शुगर) नियंत्रण**: अपना HbA1c स्तर 7.0% से नीचे रखने का प्रयास करें।
2. **रक्तचाप (BP) और कोलेस्ट्रॉल**: BP को 130/80 mmHg के करीब रखें।
3. **नियमित आँख की जांच**: साल में कम से कम एक बार रेटिना (आँख के परदे) की फोटो अवश्य कराएं।
4. **खान-पान**: हरी पत्तेदार सब्जियां, गाजर, पपीता खाएं; मीठा, तला-भुना और अत्यधिक नमक कम करें।
5. **चेतावनी लक्षण**: यदि अचानक आँखों के आगे काले धब्बे (फ्लोटर्स), धुंधलापन या चमक दिखाई दे, तो तुरंत 48 घंटे के भीतर नेत्र विशेषज्ञ से संपर्क करें।`;
      } else {
        aiResponseText = `Based on WHO Global Eye Health standards: Retinal microvascular changes in diabetes require early detection before irreversible visual acuity loss. MindHue automatically flags microaneurysms, hard exudates, and 4-quadrant hemorrhages to support clinical decision-making. Would you like detailed guidance on a specific ICDR grade, medication, or referral workflow?`;
      }

      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: aiResponseText }]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#005eb8] text-white shadow-md shadow-blue-900/10">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              MindHue Clinical AI Co-Pilot & Decision Support
            </h2>
            <p className="text-xs text-slate-500">
              Evidence-based assistant for ICDR 0-4 staging, CSME guidelines, operator tips, and bilingual patient advice.
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-[#005eb8] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          WHO Protocol Calibrated
        </span>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p.query)}
            className="flex items-center gap-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-[#005eb8] text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-sm"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
        
        {/* Messages List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-[#005eb8] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[80%] whitespace-pre-line ${
                m.sender === 'user'
                  ? 'bg-[#005eb8] text-white rounded-tr-none'
                  : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-tl-none'
              }`}>
                {m.text}
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
              <span className="w-2 h-2 rounded-full bg-[#005eb8] animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-[#005eb8] animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-[#005eb8] animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-[11px] text-slate-500 font-medium ml-1">Consulting clinical guidelines...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask a clinical question (e.g. ICDR 4-2-1 criteria, CSME macular edema, recall schedule)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-white text-xs text-slate-900 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#005eb8]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-[#005eb8] hover:bg-[#003087] text-white transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}
