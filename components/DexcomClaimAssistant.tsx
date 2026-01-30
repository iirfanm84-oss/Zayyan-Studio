
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, Activity, Copy, CheckCircle2, 
  Hash, FileText, Loader2, Info, 
  Camera, Image as ImageIcon, Calendar, Building2, CreditCard
} from 'lucide-react';
import { extractTextFromImage } from '../services/geminiService';

interface DexcomClaimAssistantProps {
  onGoHome: () => void;
}

const ISSUE_TEMPLATES: Record<string, string> = {
  "Brief Sensor Issue": "We started a new sensor on [START_DATE] at 09:00 AM. It worked well until [INCIDENT_DATE], but then the app and pump showed a 'Brief Sensor Issue'. Finally, it asked to 'Start new sensor'. Also, these Rev 010 sensors make the skin very red and itchy after 2 days. The sensor was placed correctly and was not disturbed.",
  "Failed during warmup (Pin Issue)": "I started a new sensor on [START_DATE]. During the warmup time, it failed to start on the pump and the mobile app. I tried to restart it with the code, but it failed again. I saw a small pin coming out from the top hole. The sensor was placed correctly and was not covered.",
  "Hardware Fault (Pin out)": "I started a new sensor on [START_DATE]. I noticed a small pin was coming out from the top hole of the sensor. The sensor was placed correctly and was not disturbed.",
  "HIGH BG (Inaccurate)": "We started a new sensor on [START_DATE]. It worked fine until [INCIDENT_DATE] at 10 PM. It suddenly showed a 'Brief Error' and then showed 'HIGH BG'. Finger-prick tests showed normal sugar levels, but calibration failed many times. We had to replace the sensor. It was placed correctly.",
  "LOW BG (Inaccurate)": "We started a new sensor on [START_DATE]. It started showing 'LOW BG' (low sugar), but finger-prick tests showed high sugar levels. I tried to calibrate, but it did not work. Later, the app showed a 'Brief Error' and the sensor failed. The sensor was placed correctly and was not disturbed."
};

export const DexcomClaimAssistant: React.FC<DexcomClaimAssistantProps> = ({ onGoHome }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [boxImage, setBoxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nif: localStorage.getItem('dex_nif') || '316415391',
    hospitalName: localStorage.getItem('dex_hospital') || 'Sao Francisco Xavier',
    pumpSN: '1286500', 
    transmitterSN: '', 
    lotNumber: '',      
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    issueType: 'Brief Sensor Issue',
    description: ''
  });

  // Auto-generate description when dates or issue type change
  useEffect(() => {
    const template = ISSUE_TEMPLATES[formData.issueType];
    if (template) {
      const filled = template
        .replace("[START_DATE]", formData.startDate)
        .replace("[INCIDENT_DATE]", formData.issueDate);
      setFormData(prev => ({ ...prev, description: filled }));
    }
  }, [formData.issueType, formData.startDate, formData.issueDate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    const storageKeys: Record<string, string> = {
      nif: 'dex_nif', hospitalName: 'dex_hospital'
    };
    if (storageKeys[field]) localStorage.setItem(storageKeys[field], value);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        setBoxImage(base64);
        
        setIsAiLoading(true);
        const result = await extractTextFromImage(base64);
        if (result) {
          const lotMatch = result.match(/\(10\)\s*([a-zA-Z0-9]+)/) || result.match(/10\s+([a-zA-Z0-9]+)/);
          const snMatch = result.match(/\(21\)\s*([a-zA-Z0-9]+)/) || result.match(/21\s+([a-zA-Z0-9]+)/);
          
          setFormData(prev => ({
            ...prev,
            lotNumber: lotMatch ? lotMatch[1] : prev.lotNumber,
            transmitterSN: snMatch ? snMatch[1] : prev.transmitterSN
          }));
        }
        setIsAiLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (label: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const getFullTemplate = () => {
    return `DEXCOM CLAIM - VITALAIRE SUPPORT\n-----------------------------------\nPRODUCT INFO:\nPump SN: ${formData.pumpSN}\nLot Number: ${formData.lotNumber}\nTransmitter/Sensor SN: ${formData.transmitterSN}\n\nINCIDENT INFO:\nFailure Date: ${formData.issueDate}\nSensor Started: ${formData.startDate}\nType: ${formData.issueType}\n\nPATIENT DETAILS:\nNIF: ${formData.nif}\nHospital: ${formData.hospitalName}\n\nDESCRIPTION:\n${formData.description}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Slim Header */}
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onGoHome} className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-white/5 transition-all text-slate-400">
            <Home size={16}/>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-emerald-500 rounded shadow-lg shadow-emerald-500/20">
              <Activity size={14} className="text-white"/>
            </div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-white">Claim Pro</h1>
          </div>
        </div>
        <button 
          onClick={() => copyToClipboard('Full Template', getFullTemplate())}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all shadow-lg shadow-emerald-600/20"
        >
          {copyFeedback === 'Full Template' ? <CheckCircle2 size={12}/> : <Copy size={12}/>}
          {copyFeedback === 'Full Template' ? 'Copied' : 'Copy Full Claim'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 h-full">
          
          {/* Main Input Area */}
          <div className="lg:col-span-7 p-4 sm:p-6 lg:border-r border-slate-800/50 space-y-6">
            
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-emerald-400"/>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Dexcom Box Photo</h3>
                </div>
                {isAiLoading && (
                  <div className="flex items-center gap-2 text-emerald-400 text-[9px] font-bold animate-pulse">
                    <Loader2 size={10} className="animate-spin"/> Auto-extracting...
                  </div>
                )}
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`group relative h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${boxImage ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}`}
              >
                {boxImage ? (
                  <>
                    <img src={boxImage} className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-20" alt="" />
                    <div className="relative flex items-center gap-2 px-3 py-1 bg-slate-950/80 rounded-lg border border-white/5">
                      <ImageIcon size={14} className="text-emerald-400"/>
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Image Loaded</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={20} className="text-slate-700 group-hover:scale-110 transition-transform"/>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Scan Box for SN/Lot</span>
                  </>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>

              {/* GRID LAYOUT FOR FIELDS IN SPECIFIC ORDER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Row 1: Incident Date | Lot Number */}
                <SmartField 
                  label="Incident Date / Data do incidente" 
                  type="date" 
                  value={formData.issueDate} 
                  onChange={v => handleInputChange('issueDate', v)} 
                  onCopy={() => copyToClipboard('issueDate', formData.issueDate)}
                  isCopied={copyFeedback === 'issueDate'}
                  icon={<Calendar size={12}/>} 
                />
                <SmartField 
                  label="Lot Number (10) / Lote do sensor" 
                  value={formData.lotNumber} 
                  onChange={v => handleInputChange('lotNumber', v)} 
                  onCopy={() => copyToClipboard('lotNumber', formData.lotNumber)}
                  isCopied={copyFeedback === 'lotNumber'}
                  loading={isAiLoading}
                  placeholder="Scanning..." 
                  icon={<Hash size={12}/>}
                />

                {/* Row 2: Start Date | Transmitter SN */}
                <SmartField 
                  label="Start Date / Data de ativação" 
                  type="date" 
                  value={formData.startDate} 
                  onChange={v => handleInputChange('startDate', v)} 
                  onCopy={() => copyToClipboard('startDate', formData.startDate)}
                  isCopied={copyFeedback === 'startDate'}
                  icon={<Calendar size={12}/>} 
                />
                <SmartField 
                  label="Transmitter SN (21) / Transmissor" 
                  value={formData.transmitterSN} 
                  onChange={v => handleInputChange('transmitterSN', v)} 
                  onCopy={() => copyToClipboard('transmitterSN', formData.transmitterSN)}
                  isCopied={copyFeedback === 'transmitterSN'}
                  loading={isAiLoading}
                  placeholder="Scanning..." 
                  icon={<Hash size={12}/>}
                />

                {/* Row 3: Pump SN | Hospital */}
                <SmartField 
                  label="Pump SN / Número de série da bomba" 
                  value={formData.pumpSN} 
                  onChange={v => handleInputChange('pumpSN', v)} 
                  onCopy={() => copyToClipboard('pumpSN', formData.pumpSN)}
                  isCopied={copyFeedback === 'pumpSN'}
                  placeholder="1286500" 
                  icon={<Hash size={12}/>}
                />
                <SmartField 
                  label="Hospital" 
                  value={formData.hospitalName} 
                  onChange={v => handleInputChange('hospitalName', v)} 
                  onCopy={() => copyToClipboard('hospitalName', formData.hospitalName)}
                  isCopied={copyFeedback === 'hospitalName'}
                  icon={<Building2 size={12}/>} 
                />

                {/* Row 4: NIF */}
                <div className="md:col-span-1">
                  <SmartField 
                    label="NIF" 
                    value={formData.nif} 
                    onChange={v => handleInputChange('nif', v)} 
                    onCopy={() => copyToClipboard('nif', formData.nif)}
                    isCopied={copyFeedback === 'nif'}
                    icon={<CreditCard size={12}/>} 
                  />
                </div>
              </div>

              {/* Full Width Sections */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black uppercase text-slate-500">Issue Template / Tipo de Falha</label>
                    <button 
                      onClick={() => copyToClipboard('issueType', formData.issueType)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all text-[9px] font-black uppercase ${copyFeedback === 'issueType' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Copy size={10}/> {copyFeedback === 'issueType' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <select 
                    value={formData.issueType}
                    onChange={e => handleInputChange('issueType', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 appearance-none transition-all shadow-inner"
                  >
                    {Object.keys(ISSUE_TEMPLATES).map(key => <option key={key} value={key}>{key}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black uppercase text-slate-500">Description / Relato Profissional</label>
                    <button 
                      onClick={() => copyToClipboard('desc', formData.description)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all text-[9px] font-black uppercase ${copyFeedback === 'desc' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Copy size={10}/> {copyFeedback === 'desc' ? 'Copied' : 'Copy Text'}
                    </button>
                  </div>
                  <textarea 
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] font-mono leading-relaxed text-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all min-h-[120px] resize-none overflow-y-auto no-scrollbar"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:col-span-5 bg-slate-900/20 p-4 sm:p-6 lg:h-full overflow-y-auto no-scrollbar">
            <div className="sticky top-0 space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Live Claim Preview</h3>
                 <span className="text-[9px] font-bold text-slate-600 uppercase">VitalAire Support Format</span>
              </div>

              <div className="bg-slate-950 border border-white/5 rounded-2xl p-6 font-mono text-[11px] text-slate-400 leading-relaxed shadow-2xl">
                 <div className="text-white font-black mb-4 border-b border-white/5 pb-2 text-xs uppercase">Dexcom G7 Claim Summary</div>
                 
                 <PreviewSection title="Incident Timeline">
                    <PreviewRow label="Incident" value={formData.issueDate} />
                    <PreviewRow label="Start Date" value={formData.startDate} />
                    <PreviewRow label="Type" value={formData.issueType} />
                 </PreviewSection>

                 <PreviewSection title="Product Data">
                    <PreviewRow label="Lot (10)" value={formData.lotNumber} highlight={isAiLoading} />
                    <PreviewRow label="SN (21)" value={formData.transmitterSN} highlight={isAiLoading} />
                    <PreviewRow label="Pump SN" value={formData.pumpSN} />
                 </PreviewSection>

                 <PreviewSection title="Patient Info">
                    <PreviewRow label="Hospital" value={formData.hospitalName} />
                    <PreviewRow label="NIF" value={formData.nif} />
                 </PreviewSection>

                 <div className="mt-4 pt-4 border-t border-white/5">
                   <div className="text-[9px] font-black uppercase text-slate-600 mb-2">Detailed Narrative</div>
                   <div className="text-[10px] italic leading-relaxed text-slate-300">{formData.description}</div>
                 </div>
              </div>

              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-3">
                <Info size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  Double-check all hardware codes extracted from the photo. Click <span className="text-emerald-400 font-bold uppercase">Copy Full Claim</span> at the top to finalize your report.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

const SmartField: React.FC<{
  label: string, 
  value: string, 
  onChange: (v: string) => void, 
  onCopy: () => void,
  isCopied: boolean,
  placeholder?: string, 
  type?: string, 
  icon?: any,
  loading?: boolean
}> = ({label, value, onChange, onCopy, isCopied, placeholder, type = 'text', icon, loading}) => (
  <div className="flex flex-col gap-1.5 group">
    <div className="flex items-center justify-between px-1">
      <label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1.5">
        {icon} {label}
      </label>
      <button 
        onClick={onCopy}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all text-[8px] font-black uppercase ${isCopied ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-800'}`}
      >
        {isCopied ? <CheckCircle2 size={8}/> : <Copy size={8}/>}
        {isCopied ? 'Copied' : 'Copy'}
      </button>
    </div>
    <div className="relative">
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder:text-slate-700 transition-all shadow-inner font-mono ${loading ? 'animate-pulse opacity-60' : ''}`}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 size={12} className="animate-spin text-emerald-400"/>
        </div>
      )}
    </div>
  </div>
);

const PreviewSection: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
  <div className="mb-4">
    <div className="text-[9px] font-black uppercase text-slate-600 mb-1.5 tracking-tighter">{title}</div>
    <div className="space-y-0.5">{children}</div>
  </div>
);

const PreviewRow: React.FC<{label: string, value: string, highlight?: boolean}> = ({label, value, highlight}) => (
  <div className={`flex gap-3 ${highlight ? 'animate-pulse text-emerald-500 font-bold' : ''}`}>
    <span className="w-20 shrink-0 opacity-50 uppercase tracking-tighter text-[9px]">{label}:</span>
    <span className="truncate flex-1">{value || '---'}</span>
  </div>
);
