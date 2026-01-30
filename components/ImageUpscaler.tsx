
import React, { useState, useRef } from 'react';
import { Home, Download, Upload, Maximize, Loader2, RefreshCw, Zap, Sparkles, AlertCircle, Eye } from 'lucide-react';
import { processImageEditing } from '../services/geminiService';

interface ImageUpscalerProps {
  onGoHome: () => void;
}

export const ImageUpscaler: React.FC<ImageUpscalerProps> = ({ onGoHome }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOriginalImage(ev.target?.result as string);
        setEnhancedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const upscaleImage = async () => {
    if (!originalImage) return;
    setIsProcessing(true);
    const result = await processImageEditing(
      originalImage, 
      `Upscale this image by ${scaleFactor}x. Sharpen all edges, remove compression artifacts, and reconstruct missing high-frequency details. Return a high-definition version of this exact image.`
    );
    if (result) {
      setEnhancedImage(result);
    }
    setIsProcessing(false);
  };

  const downloadResult = () => {
    if (!enhancedImage) return;
    const link = document.createElement('a');
    link.href = enhancedImage;
    link.download = `zayyan_upscaled_${Date.now()}.png`;
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
            <div className="p-1 bg-sky-600 rounded shadow-lg shadow-sky-600/20">
              <Maximize size={14} className="text-white"/>
            </div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-white">AI Upscaler</h1>
          </div>
        </div>
        
        {enhancedImage && (
          <button 
            onClick={downloadResult}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download size={12}/> Download 4K
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-6">
        {!originalImage ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-white">Generative Detail Upscaler</h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                Take low-res, blurry, or old photos and enhance them to high fidelity using Gemini's advanced image reconstruction.
              </p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group w-full max-w-md aspect-video border-2 border-dashed border-slate-800 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all cursor-pointer bg-slate-900/40"
            >
              <div className="p-5 bg-slate-800 rounded-2xl text-slate-400 group-hover:scale-110 group-hover:text-sky-400 transition-all">
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-300">Select Image to Enhance</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">AI reconstruction works best on faces and textures</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col gap-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
              
              {/* Image Previews */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                   <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Original (Low-Res)</h3>
                      <div className="aspect-square bg-slate-900 rounded-[32px] border border-white/5 overflow-hidden flex items-center justify-center p-4">
                        <img src={originalImage} className="max-w-full max-h-full object-contain rounded-xl" alt="Source" />
                      </div>
                   </div>
                   <div className="space-y-3 relative">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-400 ml-2 flex items-center gap-2">
                        AI Enhanced {enhancedImage && <Sparkles size={12} className="text-amber-400"/>}
                      </h3>
                      <div className="aspect-square bg-slate-900 rounded-[32px] border border-sky-500/20 overflow-hidden flex items-center justify-center p-4 shadow-2xl shadow-sky-500/5">
                        {enhancedImage ? (
                          <img src={enhancedImage} className="max-w-full max-h-full object-contain animate-in fade-in duration-700" alt="Enhanced" />
                        ) : (
                          <div className="text-center opacity-20 flex flex-col items-center gap-4">
                            <Maximize size={48} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Enhanced view</p>
                          </div>
                        )}
                        {isProcessing && (
                          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-20">
                             <div className="w-16 h-16 relative">
                                <Loader2 size={64} className="text-sky-500 animate-spin opacity-20"/>
                                <Zap size={24} className="absolute inset-0 m-auto text-sky-400 animate-pulse"/>
                             </div>
                             <div className="text-center space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-white">Reconstructing Pixels...</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Gemini is re-imagining texture details</p>
                             </div>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
                
                {enhancedImage && (
                  <div className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-2">
                     <AlertCircle size={18} className="text-sky-400 shrink-0"/>
                     <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-tighter">
                       Generative upscaling might subtly change fine features as it reconstructs lost data. Always verify textures for critical work.
                     </p>
                  </div>
                )}
              </div>

              {/* Sidebar Controls */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-slate-900/40 border border-white/5 rounded-[32px] p-6 space-y-8 h-full flex flex-col shadow-xl">
                  <div className="space-y-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-400">Enhancement Tuning</h3>
                    <p className="text-[10px] text-slate-600 font-bold uppercase">Configure AI Intensity</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                       <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Upscale Factor</label>
                       <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-1 rounded-xl">
                          <button 
                            onClick={() => setScaleFactor(2)}
                            className={`py-3 text-[10px] font-black uppercase rounded-lg transition-all ${scaleFactor === 2 ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            2x High Def
                          </button>
                          <button 
                            onClick={() => setScaleFactor(4)}
                            className={`py-3 text-[10px] font-black uppercase rounded-lg transition-all ${scaleFactor === 4 ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            4x Ultra HD
                          </button>
                       </div>
                    </div>

                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 space-y-4">
                       <div className="flex items-center gap-2 text-sky-400">
                          <Eye size={14}/>
                          <span className="text-[9px] font-black uppercase">Detail Check</span>
                       </div>
                       <ul className="space-y-2">
                          <li className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-1.5 h-1.5 bg-sky-500 rounded-full"/> Edge Sharpening: ON</li>
                          <li className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-1.5 h-1.5 bg-sky-500 rounded-full"/> Noise Reduction: HIGH</li>
                          <li className="flex items-center gap-2 text-[10px] text-slate-500"><span className="w-1.5 h-1.5 bg-sky-500 rounded-full"/> Facial Fix: AUTO</li>
                       </ul>
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    <button 
                      onClick={upscaleImage}
                      disabled={isProcessing}
                      className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] ${!enhancedImage ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/30' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18} className="text-amber-400 fill-amber-400"/>}
                      {enhancedImage ? 'Enhance Again' : 'Boost Resolution'}
                    </button>
                    
                    <button 
                      onClick={downloadResult}
                      disabled={!enhancedImage || isProcessing}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-20"
                    >
                      <Download size={18}/> Download Enhanced
                    </button>
                    
                    <button onClick={() => setOriginalImage(null)} className="w-full py-2 text-slate-600 hover:text-red-400 text-[10px] font-black uppercase transition-colors">
                      Start Over
                    </button>
                  </div>
                </div>
              </div>

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
    </div>
  );
};
