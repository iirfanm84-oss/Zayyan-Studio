
import React, { useState, useRef } from 'react';
import { Home, Download, Upload, Wand2, Loader2, RefreshCw, Eraser, Image as ImageIcon, Sparkles } from 'lucide-react';
import { processImageEditing } from '../services/geminiService';

interface BackgroundEraserProps {
  onGoHome: () => void;
}

export const BackgroundEraser: React.FC<BackgroundEraserProps> = ({ onGoHome }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOriginalImage(ev.target?.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    const result = await processImageEditing(
      originalImage, 
      "Remove the background from this image completely. Isolate the main subject and return only the subject. Ensure the background is removed or pure transparent if possible."
    );
    if (result) {
      setResultImage(result);
    }
    setIsProcessing(false);
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `zayyan_cutout_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onGoHome} className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-white/5 transition-all text-slate-400">
            <Home size={16}/>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-violet-600 rounded shadow-lg shadow-violet-600/20">
              <Eraser size={14} className="text-white"/>
            </div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-white">Magic Eraser</h1>
          </div>
        </div>
        
        {resultImage && (
          <button 
            onClick={downloadResult}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download size={12}/> Download Cutout
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-6">
        {!originalImage ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-white">AI Background Remover</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                Powered by Gemini Vision. Perfect for isolating products, portraits, or objects for your studio projects.
              </p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group w-full max-w-md aspect-video border-2 border-dashed border-slate-800 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-pointer bg-slate-900/40"
            >
              <div className="p-5 bg-slate-800 rounded-2xl text-slate-400 group-hover:scale-110 group-hover:text-violet-400 transition-all">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-300">Choose Image to Isolate</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">PNG, JPG, WebP supported</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col gap-6 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 items-center">
              {/* Original Image */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source Image</h3>
                </div>
                <div className="aspect-square bg-slate-900 rounded-[32px] border border-white/5 overflow-hidden flex items-center justify-center p-4">
                  <img src={originalImage} className="max-w-full max-h-full object-contain rounded-xl" alt="Source" />
                </div>
              </div>

              {/* Result Area */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-violet-400">Isolated Subject</h3>
                   {isProcessing && <Loader2 size={14} className="animate-spin text-violet-500"/>}
                </div>
                <div className="aspect-square bg-slate-950 rounded-[32px] border border-violet-500/20 overflow-hidden flex items-center justify-center p-4 relative shadow-2xl shadow-violet-500/5 checkerboard">
                  {resultImage ? (
                    <img src={resultImage} className="max-w-full max-h-full object-contain animate-in zoom-in duration-500" alt="Result" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-600">
                       <ImageIcon size={48} className="opacity-20"/>
                       <p className="text-[10px] font-black uppercase tracking-widest">Result will appear here</p>
                    </div>
                  )}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                       <div className="relative">
                          <Wand2 size={40} className="text-violet-500 animate-bounce"/>
                          <Sparkles size={20} className="absolute -top-2 -right-2 text-amber-400 animate-pulse"/>
                       </div>
                       <p className="text-xs font-black uppercase tracking-widest text-white">Gemini is cutting out subject...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="p-6 bg-slate-900/60 border border-white/5 rounded-[32px] flex items-center justify-between gap-4 shadow-xl">
               <button 
                onClick={() => setOriginalImage(null)} 
                className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-all text-[10px] font-black uppercase"
               >
                 <RefreshCw size={14}/> Discard
               </button>
               
               <button 
                onClick={removeBackground}
                disabled={isProcessing}
                className={`flex-1 max-w-md flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 ${!resultImage ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30' : 'bg-slate-800 text-slate-400'}`}
               >
                 {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Wand2 size={18}/>}
                 {resultImage ? 'Redo Extraction' : 'Magic Cut Background'}
               </button>

               <button 
                onClick={downloadResult}
                disabled={!resultImage}
                className="flex items-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-20"
               >
                 <Download size={18}/> Save PNG
               </button>
            </div>
          </div>
        )}
      </main>

      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        accept="image/*" 
        onChange={handleUpload} 
      />
      
      <style>{`
        .checkerboard {
          background-image: 
            linear-gradient(45deg, #101827 25%, transparent 25%), 
            linear-gradient(-45deg, #101827 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #101827 75%), 
            linear-gradient(-45deg, transparent 75%, #101827 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          background-color: #0f172a;
        }
      `}</style>
    </div>
  );
};
