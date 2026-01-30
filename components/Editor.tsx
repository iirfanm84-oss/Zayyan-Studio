
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Download, Highlighter, Droplet, 
  RotateCw, Crop as CropIcon, Sparkles, Layers, MousePointer2, 
  Undo, ChevronLeft, ChevronRight, PenTool, Square, Grid3x3, X, Loader2,
  SlidersHorizontal,
  Scan,
  Copy,
  CheckCircle2,
  Home,
  Zap,
  RefreshCw,
  AlertTriangle,
  Image as ImageIcon,
  Maximize2,
  ArrowUp,
  ArrowDown,
  Trash,
  FileText
} from 'lucide-react';
import { Page, CollageImage, Orientation, Crop } from '../types';
import { CanvasPage } from './CanvasPage';
import { suggestLayout, extractTextFromImage } from '../services/geminiService';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';

interface EditorProps {
  pages: Page[];
  setPages: any;
  currentPageIndex: number;
  setCurrentPageIndex: any;
  onGoHome?: () => void;
}

const A4_DIMENSIONS = { 
  portrait: { width: 794, height: 1123 }, 
  landscape: { width: 1123, height: 794 } 
};

const optimizeForStudio = (base64: string, maxWidth = 1600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = base64;
  });
};

export const Editor: React.FC<EditorProps> = ({ pages, setPages, currentPageIndex, setCurrentPageIndex, onGoHome }) => {
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.8);
  const [activeTool, setActiveTool] = useState<'select' | 'highlight' | 'blur' | 'crop' | 'scan' | null>('select');
  const [toolSettings, setToolSettings] = useState({ 
    blurIntensity: 50, 
    highlightMode: 'box' as 'box' | 'pen',
    gridRows: 2,
    gridCols: 2 
  });
  const [extractedTexts, setExtractedTexts] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showGridPicker, setShowGridPicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    format: 'image/png' as 'image/png' | 'image/jpeg' | 'pdf',
    quality: 90,
    scale: 2
  });
  
  const [hoverGrid, setHoverGrid] = useState<{r: number, c: number} | null>(null);
  const [history, setHistory] = useState<Page[][]>([]);
  const [copyFeedback, setCopyFeedback] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setZoom(0.35);
      else if (w < 1024) setZoom(0.55);
      else setZoom(0.75);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentPage = pages[currentPageIndex] || pages[0];
  const safeOrientation = (currentPage.orientation || 'portrait') as Orientation;
  const dim = A4_DIMENSIONS[safeOrientation] || A4_DIMENSIONS.portrait;

  const saveToHistory = () => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(pages))].slice(-30));
  };

  const handleUndo = () => {
    if(history.length > 0) { 
      const last = history[history.length-1]; 
      setPages(last); 
      setHistory(prev => prev.slice(0,-1)); 
    }
  };

  const deleteCurrentPage = () => {
    saveToHistory();
    if (pages.length > 1) {
      const newPages = pages.filter((_, i) => i !== currentPageIndex);
      setPages(newPages);
      setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
    } else {
      setPages([{
        id: `page-${Date.now()}`,
        images: [],
        orientation: 'portrait'
      }]);
    }
    setSelectedImageIds([]);
  };

  const clearAllPages = () => {
    saveToHistory();
    setPages([{
      id: `page-${Date.now()}`,
      images: [],
      orientation: 'portrait'
    }]);
    setCurrentPageIndex(0);
    setSelectedImageIds([]);
    setShowClearConfirm(false);
  };

  const applyAiLayout = async () => {
    if (currentPage.images.length === 0) return;
    setIsAiLoading(true);
    const layout = await suggestLayout(currentPage.images.length, safeOrientation);
    if (layout && Array.isArray(layout)) {
      saveToHistory();
      setPages((prev: Page[]) => {
        const updated = [...prev];
        const page = updated[currentPageIndex];
        page.images = page.images.map((img, i) => {
          const l = layout[i % layout.length];
          return {
            ...img,
            x: l.x * dim.width,
            y: l.y * dim.height,
            width: l.width * dim.width,
            height: l.height * dim.height,
            rotation: 0,
            zIndex: i
          };
        });
        return updated;
      });
    }
    setIsAiLoading(false);
  };

  const bringToFront = () => {
    if (selectedImageIds.length === 0) return;
    saveToHistory();
    setPages((prev: Page[]) => {
      const updated = [...prev];
      const page = updated[currentPageIndex];
      const maxZ = Math.max(...page.images.map(i => i.zIndex), 0);
      page.images = page.images.map(img => 
        selectedImageIds.includes(img.id) ? { ...img, zIndex: maxZ + 1 } : img
      );
      return updated;
    });
  };

  const sendToBack = () => {
    if (selectedImageIds.length === 0) return;
    saveToHistory();
    setPages((prev: Page[]) => {
      const updated = [...prev];
      const page = updated[currentPageIndex];
      const minZ = Math.min(...page.images.map(i => i.zIndex), 0);
      page.images = page.images.map(img => 
        selectedImageIds.includes(img.id) ? { ...img, zIndex: minZ - 1 } : img
      );
      return updated;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setShowExportModal(false);
    setSelectedImageIds([]);
    
    try {
      if (exportConfig.format === 'pdf') {
        const pdf = new jsPDF({
          orientation: safeOrientation,
          unit: 'pt',
          format: 'a4'
        });

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const pageEl = document.getElementById(`canvas-page-${page.id}`);
          if (!pageEl) continue;

          // Focus current page for capture if needed, but we rely on IDs
          const canvas = await html2canvas(pageEl, {
            scale: exportConfig.scale,
            useCORS: true,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/jpeg', exportConfig.quality / 100);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(`Zayyan_Studio_${Date.now()}.pdf`);
      } else {
        const pageEl = document.getElementById(`canvas-page-${currentPage.id}`);
        if (!pageEl) throw new Error("Canvas not found");

        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(pageEl, {
          scale: exportConfig.scale,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const extension = exportConfig.format === 'image/png' ? 'png' : 'jpg';
        const imgData = canvas.toDataURL(exportConfig.format, exportConfig.quality / 100);
        
        const link = document.createElement('a');
        link.href = imgData;
        link.download = `Zayyan_Export_${Date.now()}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error("Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleScanText = async (base64Snippet: string) => {
    setIsAiLoading(true);
    const text = await extractTextFromImage(base64Snippet);
    if (text) {
      setExtractedTexts(prev => [...prev, text]);
    }
    setIsAiLoading(false);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(index);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    
    saveToHistory();
    setIsAiLoading(true);
    setUploadProgress({ current: 0, total: files.length });

    const newImagesToAdd: CollageImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length });
      const file = files[i];
      try {
        const rawBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });

        const optimizedBase64 = await optimizeForStudio(rawBase64);
        const img = new Image();
        await new Promise((res) => {
          img.onload = res;
          img.src = optimizedBase64;
        });

        const currentImgCount = (currentPage.images?.length || 0) + i;
        const ratio = img.width / img.height || 1;

        newImagesToAdd.push({
          id: `img-${Date.now()}-${i}`,
          src: optimizedBase64,
          x: (100 + i * 20), 
          y: (100 + i * 20),
          width: 300, 
          height: 300 / ratio,
          aspectRatio: ratio,
          rotation: 0, 
          zIndex: currentImgCount,
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
          highlights: [], 
          blurs: []
        });
      } catch (err) {
        console.error("Upload Failure:", err);
      }
    }

    setPages((prev: Page[]) => {
      const updated = [...prev];
      updated[currentPageIndex].images = [...updated[currentPageIndex].images, ...newImagesToAdd];
      return updated;
    });

    setIsAiLoading(false);
    setUploadProgress(null);
    setShowGridPicker(true);
  };

  const applyGridLayout = (rows: number, cols: number) => {
    const allImages = pages.flatMap(p => p.images || []);
    if (allImages.length === 0) {
      setShowGridPicker(false);
      return;
    }
    
    saveToHistory();
    const padding = 50;
    const gap = 20;
    const cellW = (dim.width - padding * 2 - (cols - 1) * gap) / cols;
    const cellH = (dim.height - padding * 2 - (rows - 1) * gap) / rows;
    const capacity = rows * cols;

    const pageChunks: CollageImage[][] = [];
    for (let i = 0; i < allImages.length; i += capacity) {
      pageChunks.push(allImages.slice(i, i + capacity));
    }

    setPages(pageChunks.map((chunk, pageIdx) => ({
      id: `page-${Date.now()}-${pageIdx}`,
      images: chunk.map((img, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        let finalW = cellW;
        let finalH = finalW / img.aspectRatio;
        if (finalH > cellH) {
          finalH = cellH;
          finalW = finalH * img.aspectRatio;
        }
        return {
          ...img,
          x: padding + c * (cellW + gap) + (cellW - finalW) / 2,
          y: padding + r * (cellH + gap) + (cellH - finalH) / 2,
          width: finalW,
          height: finalH,
          rotation: 0,
          crop: { top: 0, right: 0, bottom: 0, left: 0 },
          highlights: [], 
          blurs: [],
          zIndex: i
        };
      }),
      orientation: safeOrientation
    })));

    setCurrentPageIndex(0);
    setShowGridPicker(false);
    setSelectedImageIds([]);
  };

  const deleteSelected = () => {
    if (selectedImageIds.length === 0) return;
    saveToHistory();
    setPages((prev: Page[]) => {
      const updated = [...prev];
      updated[currentPageIndex].images = updated[currentPageIndex].images.filter(
        img => !selectedImageIds.includes(img.id)
      );
      return updated;
    });
    setSelectedImageIds([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 overflow-hidden relative">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 bg-slate-900/80 backdrop-blur-xl z-50 shadow-xl shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={onGoHome} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/5 text-slate-400 transition-all">
            <Home size={18}/>
          </button>
          
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-xl p-1 border border-white/5">
            <button onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))} className="p-1.5 hover:bg-slate-700 rounded-lg" disabled={currentPageIndex === 0}>
              <ChevronLeft size={18}/>
            </button>
            <span className="text-[10px] font-black px-2 tracking-tighter text-slate-400 uppercase">PG {currentPageIndex + 1} / {pages.length}</span>
            <button onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))} className="p-1.5 hover:bg-slate-700 rounded-lg" disabled={currentPageIndex === pages.length - 1}>
              <ChevronRight size={18}/>
            </button>
            <button 
              onClick={deleteCurrentPage} 
              title="Delete current page"
              className="p-1.5 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 rounded-lg transition-colors ml-1"
            >
              <Trash size={16}/>
            </button>
          </div>

          <div className="hidden lg:flex gap-1 bg-slate-800/50 p-1 rounded-xl border border-white/5">
             <ToolBtn icon={<MousePointer2 size={18}/>} active={activeTool === 'select'} onClick={() => { setActiveTool('select'); }} />
             <ToolBtn icon={<Highlighter size={18}/>} active={activeTool === 'highlight'} onClick={() => setActiveTool('highlight')} />
             <ToolBtn icon={<Droplet size={18}/>} active={activeTool === 'blur'} onClick={() => setActiveTool('blur')} />
             <ToolBtn icon={<Scan size={18}/>} active={activeTool === 'scan'} onClick={() => setActiveTool('scan')} />
             <ToolBtn icon={<CropIcon size={18}/>} active={activeTool === 'crop'} onClick={() => setActiveTool('crop')} />
             <div className="w-px h-6 bg-slate-700 mx-1 self-center" />
             <ToolBtn icon={<Undo size={18}/>} onClick={handleUndo} disabled={history.length === 0} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowGridPicker(!showGridPicker)} title="Reflow Grid" className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/5 text-slate-300">
            <Grid3x3 size={20}/>
          </button>
          <button onClick={applyAiLayout} title="Magic AI Layout" className="p-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/20 transition-all">
            <Sparkles size={20}/>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/30">
            <Plus size={18} /> <span className="hidden sm:inline">Add Photos</span>
          </button>
          <button onClick={() => setShowExportModal(true)} className="p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl border border-emerald-500/20 transition-all">
            <Download size={20}/>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Grid Picker Overlay */}
        {showGridPicker && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 w-48">
               <div className="flex items-center justify-between">
                 <h2 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Select Grid</h2>
                 <button onClick={() => setShowGridPicker(false)} className="text-slate-500 hover:text-white"><X size={14}/></button>
               </div>
               <div className="grid grid-cols-6 gap-1 p-1 bg-slate-800/50 rounded-lg">
                 {Array.from({length: 36}).map((_, i) => {
                   const r = Math.floor(i / 6) + 1;
                   const c = (i % 6) + 1;
                   const isActive = hoverGrid ? (r <= hoverGrid.r && c <= hoverGrid.c) : false;
                   return (
                     <div key={i} onMouseEnter={() => setHoverGrid({r, c})} onMouseLeave={() => setHoverGrid(null)} onClick={() => applyGridLayout(r, c)}
                       className={`aspect-square rounded-[2px] border transition-all cursor-pointer ${isActive ? 'bg-indigo-500 border-indigo-300' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`} />
                   )
                 })}
               </div>
               <div className="text-center text-[9px] font-mono text-indigo-400">{hoverGrid ? `${hoverGrid.r}x${hoverGrid.c}` : 'Pick Size'}</div>
            </div>
          </div>
        )}

        {showExportModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
             <div className="bg-slate-900 border border-white/10 p-8 rounded-[40px] shadow-2xl max-w-sm w-full space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Export Studio</h2>
                   <button onClick={() => setShowExportModal(false)}><X size={20}/></button>
                </div>
                <div className="space-y-4">
                   <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-1 rounded-xl">
                      <button onClick={() => setExportConfig({...exportConfig, format: 'image/png'})} className={`py-3 text-[9px] font-black uppercase rounded-lg ${exportConfig.format === 'image/png' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>PNG</button>
                      <button onClick={() => setExportConfig({...exportConfig, format: 'image/jpeg'})} className={`py-3 text-[9px] font-black uppercase rounded-lg ${exportConfig.format === 'image/jpeg' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>JPG</button>
                      <button onClick={() => setExportConfig({...exportConfig, format: 'pdf'})} className={`py-3 text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-1 ${exportConfig.format === 'pdf' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><FileText size={10}/> PDF</button>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase">Quality Scaling ({exportConfig.scale}x)</label>
                      <input type="range" min="1" max="4" step="1" value={exportConfig.scale} onChange={(e) => setExportConfig({...exportConfig, scale: parseInt(e.target.value)})} className="w-full accent-indigo-500" />
                   </div>
                   <button onClick={handleExport} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg flex items-center justify-center gap-2">
                     <Download size={16}/> {exportConfig.format === 'pdf' ? 'Generate Studio PDF' : 'Save Current Page'}
                   </button>
                </div>
             </div>
          </div>
        )}

        <aside className="hidden md:flex w-80 bg-slate-900/50 border-l border-slate-800 flex-col p-6 gap-6 no-print overflow-y-auto z-40 order-last">
           {selectedImageIds.length > 0 ? (
             <div className="space-y-6 animate-in slide-in-from-right-2">
                <div className="space-y-3">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Transform Layer</h3>
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={bringToFront} className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-white/5">
                         <ArrowUp size={20} className="text-indigo-400"/>
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Front</span>
                      </button>
                      <button onClick={sendToBack} className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-white/5">
                         <ArrowDown size={20} className="text-indigo-400"/>
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">Back</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-3">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Edit</h3>
                   <button onClick={() => {
                      saveToHistory();
                      setPages((p: any) => {
                        const updated = [...p];
                        updated[currentPageIndex].images = updated[currentPageIndex].images.map((img: any) => 
                          selectedImageIds.includes(img.id) ? { ...img, rotation: (img.rotation + 90) % 360 } : img
                        );
                        return updated;
                      });
                   }} className="w-full flex items-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl border border-white/5 text-xs font-bold transition-all">
                      <RotateCw size={18} className="text-indigo-400"/> Rotate 90°
                   </button>
                   <button onClick={deleteSelected} className="w-full py-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-500/20">
                      <Trash2 size={18} className="inline mr-2"/> Delete Asset
                   </button>
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center h-full opacity-20 text-center gap-4">
                <MousePointer2 size={48} />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select an object<br/>to edit layer</p>
             </div>
           )}

           <div className="mt-auto space-y-6">
              {extractedTexts.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-800">
                  <h3 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Extracted Text</h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 no-scrollbar">
                    {extractedTexts.map((txt, i) => (
                      <div key={i} className="group relative bg-slate-950 p-3 rounded-xl border border-white/5">
                          <p className="text-[10px] font-mono text-slate-400 line-clamp-3">{txt}</p>
                          <button onClick={() => copyToClipboard(txt, i)} className="absolute top-2 right-2 p-1 bg-slate-800 rounded opacity-0 group-hover:opacity-100">
                            {copyFeedback === i ? <CheckCircle2 size={12} className="text-emerald-500"/> : <Copy size={12}/>}
                          </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-slate-800">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600">Studio Cleanup</h3>
                 {!showClearConfirm ? (
                   <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-3 bg-red-500/5 hover:bg-red-500/10 text-red-500/40 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/10 transition-all"
                   >
                     Reset Studio (Wipe All)
                   </button>
                 ) : (
                   <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2">
                     <p className="text-[9px] font-black text-red-400 text-center uppercase">Wipe everything?</p>
                     <div className="grid grid-cols-2 gap-2">
                        <button onClick={clearAllPages} className="py-2 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase">Yes, Wipe</button>
                        <button onClick={() => setShowClearConfirm(false)} className="py-2 bg-slate-800 text-slate-400 rounded-lg text-[9px] font-black uppercase">Cancel</button>
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </aside>

        <main className="flex-1 bg-[#020617] overflow-auto flex justify-center items-start p-10 no-scrollbar relative">
           {isAiLoading && (
             <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                   <Loader2 size={48} className="animate-spin text-indigo-500 drop-shadow-[0_0_15px_#6366f1]"/>
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Streaming Pixels...</p>
                      {uploadProgress && <p className="text-[8px] font-mono text-slate-500 mt-1">{uploadProgress.current}/{uploadProgress.total}</p>}
                   </div>
                </div>
             </div>
           )}
           <div id={`canvas-page-${currentPage.id}`} style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
              <CanvasPage 
                page={currentPage} 
                setPage={(p) => setPages((prev: Page[]) => { const n = [...prev]; n[currentPageIndex] = p; return n; })} 
                activeTool={activeTool} 
                selectedImageIds={selectedImageIds} 
                setSelectedImageIds={setSelectedImageIds} 
                zoom={zoom} 
                saveHistory={saveToHistory} 
                toolSettings={toolSettings} 
                onScanResult={handleScanText} 
              />
           </div>
        </main>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleAddImage} className="hidden" />
    </div>
  );
};

const ToolBtn: React.FC<{icon: any, active?: boolean, onClick: () => void, label?: string, disabled?: boolean}> = ({icon, active, onClick, label, disabled}) => (
  <button onClick={onClick} disabled={disabled} title={label} className={`p-2.5 rounded-xl transition-all ${disabled ? 'opacity-20 cursor-not-allowed' : active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
    {icon}
  </button>
);
