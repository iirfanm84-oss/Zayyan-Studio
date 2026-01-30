
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, Download, Upload, Image as ImageIcon, 
  Loader2, Zap, Trash2, Sliders, ChevronLeft,
  ArrowRight, ShieldCheck, Scale
} from 'lucide-react';

interface LuminaSquooshProps {
  onGoHome: () => void;
}

export const LuminaSquoosh: React.FC<LuminaSquooshProps> = ({ onGoHome }) => {
  const [originalFile, setOriginalFile] = useState<{src: string, size: number, name: string} | null>(null);
  const [compressedFile, setCompressedFile] = useState<{src: string, size: number} | null>(null);
  const [quality, setQuality] = useState(75);
  const [format, setFormat] = useState<'image/webp' | 'image/jpeg'>('image/webp');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOriginalFile({
          src: ev.target?.result as string,
          size: file.size,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const compressImage = async () => {
    if (!originalFile) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = originalFile.src;
    
    await new Promise((resolve) => { img.onload = resolve; });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCompressedFile({
            src: url,
            size: blob.size
          });
          setIsProcessing(false);
        }
      },
      format,
      quality / 100
    );
  };

  useEffect(() => {
    if (originalFile) {
      const timer = setTimeout(compressImage, 150);
      return () => clearTimeout(timer);
    }
  }, [originalFile, quality, format]);

  const downloadCompressed = () => {
    if (!compressedFile || !originalFile) return;
    const link = document.createElement('a');
    const ext = format === 'image/webp' ? '.webp' : '.jpg';
    link.href = compressedFile.src;
    link.download = `optimized_${originalFile.name.split('.')[0]}${ext}`;
    link.click();
  };

  const reduction = originalFile && compressedFile 
    ? Math.max(0, ((originalFile.size - compressedFile.size) / originalFile.size) * 100).toFixed(1) 
    : 0;

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      {/* Slim Header */}
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onGoHome} className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-white/5 transition-all text-slate-400">
            <Home size={16}/>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-500 rounded shadow-lg shadow-amber-500/20">
              <Zap size={14} className="text-white"/>
            </div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-white">LuminaSquoosh</h1>
          </div>
        </div>
        
        {originalFile && (
          <button 
            onClick={downloadCompressed}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download size={12}/> Download Optimized
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        {!originalFile ? (
          <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-white">Optimize Your Images</h2>
              <p className="text-slate-400 text-sm max-w-sm">Dramatically reduce file sizes with professional-grade compression in your browser.</p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group w-full max-w-md aspect-video border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all cursor-pointer bg-slate-900/40"
            >
              <div className="p-4 bg-slate-800 rounded-2xl text-slate-400 group-hover:scale-110 group-hover:text-amber-400 transition-all">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-300">Drop image here or click</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">Supports JPG, PNG, WebP</p>
              </div>
            </div>

            <div className="flex items-center gap-8 text-slate-500">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500/50"/> <span className="text-[10px] font-bold uppercase tracking-widest">100% Local</span></div>
              <div className="flex items-center gap-2"><Zap size={16} className="text-amber-500/50"/> <span className="text-[10px] font-bold uppercase tracking-widest">Instant</span></div>
            </div>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left: Previews */}
            <div className="lg:col-span-8 p-4 sm:p-6 overflow-y-auto no-scrollbar space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                {/* Original View */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Original File</span>
                    <span className="text-[10px] font-mono text-slate-500">{formatSize(originalFile.size)}</span>
                  </div>
                  <div className="aspect-square bg-slate-900 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
                    <img src={originalFile.src} className="max-w-full max-h-full object-contain" alt="Original" />
                  </div>
                </div>

                {/* Optimized View */}
                <div className="space-y-3 relative">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Optimized</span>
                    <div className="flex items-center gap-3">
                      {isProcessing && <Loader2 size={10} className="animate-spin text-amber-500"/>}
                      <span className="text-[10px] font-mono text-amber-400">{compressedFile ? formatSize(compressedFile.size) : '...'}</span>
                    </div>
                  </div>
                  <div className="aspect-square bg-slate-900 rounded-2xl border border-amber-500/20 overflow-hidden flex items-center justify-center relative shadow-2xl shadow-amber-500/5">
                    {compressedFile && (
                      <img src={compressedFile.src} className="max-w-full max-h-full object-contain" alt="Optimized" />
                    )}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center">
                         <Loader2 size={24} className="animate-spin text-amber-400"/>
                      </div>
                    )}
                  </div>
                  
                  {compressedFile && originalFile.size > compressedFile.size && (
                    <div className="absolute -bottom-2 -right-2 px-3 py-1.5 bg-emerald-500 rounded-full text-slate-950 text-[10px] font-black uppercase shadow-xl animate-in zoom-in">
                       Reduced by {reduction}%
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Bar */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-slate-600">Savings</span>
                      <span className="text-xl font-black text-emerald-400 tracking-tighter">
                        {compressedFile ? formatSize(originalFile.size - compressedFile.size) : '0 KB'}
                      </span>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-slate-600">Format</span>
                      <span className="text-xs font-black text-white uppercase tracking-widest">{format.split('/')[1]}</span>
                    </div>
                 </div>
                 <button onClick={() => setOriginalFile(null)} className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-all text-[10px] font-black uppercase">
                   <Trash2 size={14}/> Clear All
                 </button>
              </div>
            </div>

            {/* Right: Controls */}
            <aside className="lg:col-span-4 bg-slate-900/40 border-l border-slate-800/50 p-6 space-y-8 flex flex-col h-full overflow-y-auto no-scrollbar">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-amber-400"/>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settings</h3>
                </div>
                <p className="text-[10px] text-slate-600 font-medium">Fine-tune your optimization</p>
              </div>

              <div className="space-y-6">
                {/* Format Toggle */}
                <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Target Format</label>
                   <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-1 rounded-xl border border-white/5">
                      <button 
                        onClick={() => setFormat('image/webp')}
                        className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${format === 'image/webp' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        WebP (Pro)
                      </button>
                      <button 
                        onClick={() => setFormat('image/jpeg')}
                        className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${format === 'image/jpeg' ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        JPEG
                      </button>
                   </div>
                </div>

                {/* Quality Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black uppercase text-slate-500">Quality Level</label>
                    <span className="text-xs font-mono text-amber-400 font-bold">{quality}%</span>
                  </div>
                  <div className="relative pt-1">
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={quality}
                      onChange={(e) => setQuality(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-all hover:accent-amber-400"
                    />
                    <div className="flex justify-between text-[8px] font-black text-slate-700 mt-2 uppercase tracking-tighter">
                      <span>Smallest Size</span>
                      <span>Best Quality</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-800/50" />

                <div className="space-y-3">
                   <h4 className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                     <Scale size={12}/> Analysis
                   </h4>
                   <div className="space-y-2">
                      <AnalysisRow label="Dimensions" value="Original Size" />
                      <AnalysisRow label="Processing" value="Browser-Native" />
                      <AnalysisRow label="Privacy" value="100% Client-Side" />
                   </div>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <button 
                  onClick={downloadCompressed}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98]"
                >
                  <Download size={18}/> Download Optimized
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>

      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp" 
        onChange={handleUpload} 
      />
    </div>
  );
};

const AnalysisRow: React.FC<{label: string, value: string}> = ({label, value}) => (
  <div className="flex items-center justify-between py-1 border-b border-slate-800/30">
    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{label}</span>
    <span className="text-[10px] text-slate-400 font-medium">{value}</span>
  </div>
);
