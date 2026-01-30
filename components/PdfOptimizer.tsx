
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, Download, FileType, Loader2, Trash2, 
  Sliders, ShieldCheck, FileText, 
  Contrast, Eye, Info, RefreshCw, AlertCircle
} from 'lucide-react';
// @ts-ignore
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import { jsPDF } from 'jspdf';

// Setup PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PdfOptimizerProps {
  onGoHome: () => void;
}

export const PdfOptimizer: React.FC<PdfOptimizerProps> = ({ onGoHome }) => {
  const [originalFile, setOriginalFile] = useState<{src: ArrayBuffer, size: number, name: string} | null>(null);
  const [optimizedPdfUrl, setOptimizedPdfUrl] = useState<string | null>(null);
  const [optimizedSize, setOptimizedSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState(50);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [processedPages, setProcessedPages] = useState(0);
  const [isDirty, setIsDirty] = useState(false); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastRunId = useRef<number>(0);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setOriginalFile({
          src: ev.target?.result as ArrayBuffer,
          size: file.size,
          name: file.name
        });
        setOptimizedPdfUrl(null);
        setOptimizedSize(0);
        setIsDirty(true);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const optimizePdf = async () => {
    if (!originalFile) return;
    
    // CRITICAL: Prevent "detached ArrayBuffer" error by cloning the source data.
    // PDF.js often transfers the ArrayBuffer to its worker, making it unusable for next calls.
    const freshData = originalFile.src.slice(0);
    
    lastRunId.current += 1;
    const runId = lastRunId.current;
    
    setIsProcessing(true);
    setProcessedPages(0);
    
    try {
      const loadingTask = pdfjs.getDocument({ data: freshData });
      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);
      
      const doc = new jsPDF({
        compress: true,
        unit: 'pt'
      });

      // Aggressive resolution scaling based on quality
      // Lower quality = lower internal resolution (dpi) = much smaller files
      const renderScale = 0.4 + (quality / 100) * 1.4;

      for (let i = 1; i <= pdf.numPages; i++) {
        if (runId !== lastRunId.current) return;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: renderScale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d', { alpha: false });
        
        if (!context) continue;

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: context, viewport }).promise;

        if (isGrayscale) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let j = 0; j < data.length; j += 4) {
            const lum = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
            data[j] = lum;
            data[j + 1] = lum;
            data[j + 2] = lum;
          }
          context.putImageData(imageData, 0, 0);
        }

        // WebP is often better, but JPEG quality slider is more predictable for PDF size
        const jpegQuality = quality / 100;
        const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
        
        const pdfWidth = viewport.width / renderScale;
        const pdfHeight = viewport.height / renderScale;

        if (i > 1) {
          doc.addPage([pdfWidth, pdfHeight]);
        } else {
          doc.internal.pageSize.width = pdfWidth;
          doc.internal.pageSize.height = pdfHeight;
        }

        // Using 'FAST' instead of 'NONE' to ensure jsPDF processes the new stream effectively
        // No explicit alias used here to prevent potential caching of previous versions of the page
        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        
        setProcessedPages(i);
        
        // Immediate cleanup
        canvas.width = 0;
        canvas.height = 0;
      }

      if (runId === lastRunId.current) {
        const pdfBlob = doc.output('blob');
        if (optimizedPdfUrl) URL.revokeObjectURL(optimizedPdfUrl);
        setOptimizedSize(pdfBlob.size);
        setOptimizedPdfUrl(URL.createObjectURL(pdfBlob));
        setIsDirty(false);
      }
    } catch (err) {
      console.error("PDF Optimization error:", err);
      alert("Error processing PDF. Please try a different file.");
    } finally {
      if (runId === lastRunId.current) setIsProcessing(false);
    }
  };

  // Initial auto-run on upload
  useEffect(() => {
    if (originalFile && !optimizedPdfUrl && !isProcessing) {
      optimizePdf();
    }
  }, [originalFile]);

  // Handle settings changes
  const updateQuality = (val: number) => {
    setQuality(val);
    setIsDirty(true);
  };

  const updateGrayscale = (val: boolean) => {
    setIsGrayscale(val);
    setIsDirty(true);
  };

  const downloadOptimized = () => {
    if (!optimizedPdfUrl || !originalFile) return;
    const link = document.createElement('a');
    link.href = optimizedPdfUrl;
    link.download = `slim_${quality}q_${originalFile.name}`;
    link.click();
  };

  const reduction = originalFile && optimizedSize
    ? Math.max(0, ((originalFile.size - optimizedSize) / originalFile.size) * 100).toFixed(1)
    : 0;

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onGoHome} className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-white/5 transition-all text-slate-400">
            <Home size={16}/>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-red-500 rounded shadow-lg shadow-red-500/20">
              <FileText size={14} className="text-white"/>
            </div>
            <h1 className="text-[10px] font-black uppercase tracking-widest text-white">Zayyan PDF Slim</h1>
          </div>
        </div>
        
        {optimizedPdfUrl && (
          <button 
            onClick={downloadOptimized}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download size={12}/> Download PDF
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        {!originalFile ? (
          <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-black text-white">Shrink Your PDF</h2>
              <p className="text-slate-400 text-sm max-w-sm">Compress documents, reduce image size within pages, and convert to professional grayscale.</p>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group w-full max-w-md aspect-video border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 hover:border-red-500/40 hover:bg-red-500/5 transition-all cursor-pointer bg-slate-900/40"
            >
              <div className="p-4 bg-slate-800 rounded-2xl text-slate-400 group-hover:scale-110 group-hover:text-red-400 transition-all">
                <FileType size={32} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-300">Select PDF File</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-1">Multi-page support enabled</p>
              </div>
            </div>

            <div className="flex items-center gap-8 text-slate-500">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500/50"/> <span className="text-[10px] font-bold uppercase tracking-widest">Local Privacy</span></div>
              <div className="flex items-center gap-2"><Contrast size={16} className="text-red-500/50"/> <span className="text-[10px] font-bold uppercase tracking-widest">Grayscale Mode</span></div>
            </div>
          </div>
        ) : (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Previews and Processing */}
            <div className="lg:col-span-8 p-4 sm:p-6 overflow-y-auto no-scrollbar space-y-6">
              <div className="flex items-center justify-between mb-2">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Overview</h3>
                 <div className="flex items-center gap-4">
                   <div className="flex flex-col items-end">
                     <span className="text-[9px] font-bold uppercase text-slate-600">Original Size</span>
                     <span className="text-xs font-mono text-slate-300">{formatSize(originalFile.size)}</span>
                   </div>
                   <div className="flex flex-col items-end">
                     <span className={`text-[9px] font-bold uppercase transition-colors ${isDirty ? 'text-amber-500 animate-pulse' : 'text-red-500'}`}>
                       {isDirty ? 'Action Required' : 'Optimized Size'}
                     </span>
                     <span className={`text-xs font-mono transition-colors ${isDirty ? 'text-slate-600 italic' : 'text-red-400 font-bold'}`}>
                       {optimizedSize && !isDirty ? formatSize(optimizedSize) : '--'}
                     </span>
                   </div>
                 </div>
              </div>

              {isProcessing ? (
                <div className="flex flex-col items-center justify-center h-[60vh] gap-6 bg-slate-900/40 rounded-3xl border border-white/5">
                  <div className="relative">
                    <Loader2 size={64} className="animate-spin text-red-500 opacity-20"/>
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-xl">
                      {totalPages > 0 ? Math.round((processedPages / totalPages) * 100) : 0}%
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-bold text-white">Generating Slim PDF...</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rebuilding page {processedPages} of {totalPages}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/60 rounded-3xl border border-white/5 p-8 flex flex-col items-center justify-center gap-6 min-h-[50vh] animate-in fade-in duration-300">
                  {optimizedPdfUrl && !isDirty ? (
                    <>
                      <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/5">
                        <ShieldCheck size={48} className="text-emerald-500"/>
                      </div>
                      <div className="text-center">
                        <h2 className="text-2xl font-black text-white">Success!</h2>
                        <p className="text-slate-400 text-sm mt-2">Reduction: <span className="text-emerald-400 font-bold">-{reduction}%</span> ({formatSize(originalFile.size - optimizedSize)} saved)</p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3">
                         <div className="px-4 py-2 bg-slate-950 rounded-xl border border-white/5 flex flex-col items-center min-w-[100px]">
                            <span className="text-[8px] font-black uppercase text-slate-600">New File Size</span>
                            <span className="text-sm font-black text-emerald-400">{formatSize(optimizedSize)}</span>
                         </div>
                         <div className="px-4 py-2 bg-slate-950 rounded-xl border border-white/5 flex flex-col items-center min-w-[100px]">
                            <span className="text-[8px] font-black uppercase text-slate-600">Pages Slimmed</span>
                            <span className="text-sm font-black text-slate-200">{totalPages}</span>
                         </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-6 text-slate-500 text-center max-w-sm">
                      <div className="p-5 bg-amber-500/10 rounded-full">
                        <RefreshCw size={40} className={`text-amber-500 opacity-60 ${isProcessing ? 'animate-spin' : ''}`}/>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-200">Re-optimization Required</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-relaxed">
                          Settings have changed. Click <span className="text-indigo-400 font-bold italic">"Apply Optimization"</span> below to update the file and see the new size.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <aside className="lg:col-span-4 bg-slate-900/40 border-l border-slate-800/50 p-6 space-y-8 flex flex-col h-full overflow-y-auto no-scrollbar">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-red-400"/>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">PDF Parameters</h3>
                </div>
                <p className="text-[10px] text-slate-600 font-medium">Configure compression levels</p>
              </div>

              <div className="space-y-6">
                {/* Grayscale Toggle */}
                <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Color Mode</label>
                   <div className="grid grid-cols-2 gap-2 bg-slate-950/50 p-1 rounded-xl border border-white/5">
                      <button 
                        onClick={() => updateGrayscale(false)}
                        className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${!isGrayscale ? 'bg-red-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        Keep Color
                      </button>
                      <button 
                        onClick={() => updateGrayscale(true)}
                        className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all ${isGrayscale ? 'bg-red-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        Black & White
                      </button>
                   </div>
                </div>

                {/* Quality Slider */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black uppercase text-slate-500">Quality Factor</label>
                    <span className={`text-xs font-mono font-bold ${isDirty ? 'text-amber-400 underline underline-offset-4' : 'text-red-400'}`}>{quality}%</span>
                  </div>
                  <div className="relative pt-1">
                    <input 
                      type="range" 
                      min="1" 
                      max="95" 
                      value={quality}
                      onChange={(e) => updateQuality(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500 transition-all hover:accent-red-400"
                    />
                    <div className="flex justify-between text-[8px] font-black text-slate-700 mt-2 uppercase tracking-tighter">
                      <span>Maximum Slimming</span>
                      <span>High Fidelity</span>
                    </div>
                  </div>
                </div>

                {/* Re-optimize Button */}
                <button 
                  onClick={optimizePdf}
                  disabled={!isDirty || isProcessing}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed ${isDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 ring-2 ring-indigo-400/20' : 'bg-slate-800 text-slate-500'}`}
                >
                  <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''}/>
                  {isProcessing ? 'Processing...' : 'Apply Optimization'}
                </button>

                <div className="h-px bg-slate-800/50" />

                <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10 space-y-2">
                   <div className="flex items-center gap-2 text-red-400">
                     <Eye size={14}/>
                     <span className="text-[9px] font-black uppercase">Engine Status</span>
                   </div>
                   <div className="space-y-1">
                      <AnalysisRow label="Source" value={originalFile?.name || 'N/A'} />
                      <AnalysisRow label="Page Count" value={`${totalPages} pgs`} />
                      <AnalysisRow label="Scale Factor" value={`${(0.4 + (quality / 100) * 1.4).toFixed(2)}x`} />
                   </div>
                </div>
              </div>

              <div className="mt-auto pt-6 space-y-3">
                <button 
                  onClick={downloadOptimized}
                  disabled={!optimizedPdfUrl || isProcessing || isDirty}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-20 disabled:grayscale"
                >
                  <Download size={18}/> Save Slim PDF
                </button>
                <button 
                  onClick={() => {
                    setOriginalFile(null);
                    setOptimizedPdfUrl(null);
                    setOptimizedSize(0);
                    setIsDirty(false);
                  }}
                  className="w-full py-2 text-red-400/50 hover:text-red-400 text-[10px] font-black uppercase transition-colors"
                >
                  Discard and Start Over
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
        accept="application/pdf" 
        onChange={handleUpload} 
      />
    </div>
  );
};

const AnalysisRow: React.FC<{label: string, value: string}> = ({label, value}) => (
  <div className="flex items-center justify-between py-1 border-b border-red-500/10 last:border-0">
    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{label}</span>
    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{value}</span>
  </div>
);
