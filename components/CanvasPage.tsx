
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Page, CollageImage, Point, Highlight, Blur, Crop, Orientation } from '../types';
import { Crop as CropIcon, Scan } from 'lucide-react';

interface CanvasPageProps {
  page: Page;
  setPage: (page: Page) => void;
  activeTool: string | null;
  selectedImageIds: string[];
  setSelectedImageIds: React.Dispatch<React.SetStateAction<string[]>>;
  zoom: number;
  saveHistory: () => void;
  toolSettings: {
    blurIntensity: number;
    highlightMode: 'box' | 'pen';
  };
  onScanResult: (base64Snippet: string) => void;
}

type InteractionMode = 'none' | 'move' | 'resize' | 'draw';

const A4_DIMENSIONS = {
  portrait: { width: 794, height: 1123 },
  landscape: { width: 1123, height: 794 }
};

export const CanvasPage: React.FC<CanvasPageProps> = ({ 
  page, setPage, activeTool, selectedImageIds, setSelectedImageIds, zoom, saveHistory, toolSettings, onScanResult 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none');
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ 
    x: number, 
    y: number, 
    imgX: number, 
    imgY: number, 
    imgW: number, 
    imgH: number, 
    crop: Crop,
    handle?: string 
  } | null>(null);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [drawPreview, setDrawPreview] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  const safeOrientation = (page.orientation || 'portrait') as Orientation;
  const { width, height } = A4_DIMENSIONS[safeOrientation] || A4_DIMENSIONS.portrait;

  const sortedImages = useMemo(() => {
    return [...(page.images || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  }, [page.images]);

  const getCanvasCoords = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  }, [zoom]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const { x, y } = getCanvasCoords(e);
    
    if ((activeTool === 'highlight' || activeTool === 'blur' || activeTool === 'crop' || activeTool === 'scan') && selectedImageIds.length > 0) {
      e.stopPropagation();
      setInteractionMode('draw');
      setDragStart({ x, y, imgX: 0, imgY: 0, imgW: 0, imgH: 0, crop: {top:0,right:0,bottom:0,left:0} });
      
      if (activeTool === 'highlight' && toolSettings.highlightMode === 'pen') {
        setCurrentPath([{ x, y }]);
      } else {
        setDrawPreview({ x, y, w: 0, h: 0 });
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (activeHandle && selectedImageIds.length > 0 && activeTool === 'select') {
      const img = page.images.find(i => i.id === selectedImageIds[0]);
      if (img) {
        setInteractionMode('resize');
        setDragStart({ 
          x, y, 
          imgX: img.x, imgY: img.y, 
          imgW: img.width, imgH: img.height, 
          crop: { ...img.crop },
          handle: activeHandle 
        });
        e.stopPropagation();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }

    const clickedImage = [...sortedImages].reverse().find(img => {
      return x >= img.x && x <= img.x + img.width && y >= img.y && y <= img.y + img.height;
    });

    if (clickedImage) {
      if (!selectedImageIds.includes(clickedImage.id)) {
        setSelectedImageIds([clickedImage.id]);
      }
      setInteractionMode('move');
      setDragStart({ x, y, imgX: clickedImage.x, imgY: clickedImage.y, imgW: clickedImage.width, imgH: clickedImage.height, crop: clickedImage.crop });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      setSelectedImageIds([]);
      setInteractionMode('none');
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interactionMode === 'none') return;
    const { x, y } = getCanvasCoords(e);

    if (interactionMode === 'move' && dragStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setPage({
        ...page,
        images: page.images.map(img => 
          selectedImageIds.includes(img.id) ? { ...img, x: dragStart.imgX + dx, y: dragStart.imgY + dy } : img
        )
      });
    }

    if (interactionMode === 'resize' && dragStart && dragStart.handle) {
      const imgId = selectedImageIds[0];
      const img = page.images.find(i => i.id === imgId);
      if (!img) return;

      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const handle = dragStart.handle;

      let newW = dragStart.imgW;
      let newH = dragStart.imgH;
      let newX = dragStart.imgX;
      let newY = dragStart.imgY;

      if (handle.includes('e')) newW = dragStart.imgW + dx;
      if (handle.includes('w')) newW = dragStart.imgW - dx;
      if (handle.includes('s')) newH = dragStart.imgH + dy;
      if (handle.includes('n')) newH = dragStart.imgH - dy;

      const shouldPreserveAspect = e.shiftKey || handle.length === 2;

      if (shouldPreserveAspect) {
        const targetRatio = img.aspectRatio;
        if (handle.length === 2) {
          // Corner handle: always lock
          const actualDx = Math.abs(newW - dragStart.imgW);
          const actualDy = Math.abs(newH - dragStart.imgH);
          if (actualDx > actualDy) {
            newH = newW / targetRatio;
          } else {
            newW = newH * targetRatio;
          }
        } else {
          // Side handle with shift
          if (handle === 'e' || handle === 'w') {
            newH = newW / targetRatio;
          } else {
            newW = newH * targetRatio;
          }
        }
      }

      newW = Math.max(20, newW);
      newH = Math.max(20, newH);

      if (handle.includes('w')) {
        newX = dragStart.imgX + (dragStart.imgW - newW);
      }
      if (handle.includes('n')) {
        newY = dragStart.imgY + (dragStart.imgH - newH);
      }

      setPage({
        ...page,
        images: page.images.map(i => i.id === imgId ? { ...i, width: newW, height: newH, x: newX, y: newY } : i)
      });
    }

    if (interactionMode === 'draw' && dragStart) {
      if (activeTool === 'highlight' && toolSettings.highlightMode === 'pen') {
        setCurrentPath(prev => [...prev, { x, y }]);
      } else {
        setDrawPreview({
          x: Math.min(x, dragStart.x),
          y: Math.min(y, dragStart.y),
          w: Math.max(2, Math.abs(x - dragStart.x)),
          h: Math.max(2, Math.abs(y - dragStart.y))
        });
      }
    }
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (interactionMode === 'none') return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    if (interactionMode === 'draw' && selectedImageIds.length > 0) {
       const imgId = selectedImageIds[0];
       const img = page.images.find(i => i.id === imgId);
       
       if (img) {
         if (activeTool === 'highlight' && toolSettings.highlightMode === 'pen' && currentPath.length > 2) {
           saveHistory();
           const relPath = currentPath.map(p => ({ x: p.x - img.x, y: p.y - img.y }));
           const newH: Highlight = {
             id: `h-pen-${Date.now()}`,
             x: 0, y: 0, width: 0, height: 0,
             color: '#fbbf2488', mode: 'pen', path: relPath
           };
           setPage({ ...page, images: page.images.map(i => i.id === imgId ? { ...i, highlights: [...i.highlights, newH]} : i)});
         } else if (drawPreview && drawPreview.w >= 10 && drawPreview.h >= 10) {
           if (activeTool === 'scan') {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const sourceImg = new Image();
              sourceImg.crossOrigin = "anonymous";
              sourceImg.src = img.src;
              
              await new Promise(resolve => { sourceImg.onload = resolve; });
              
              const scaleX = sourceImg.width / img.width;
              const scaleY = sourceImg.height / img.height;
              const sX = (drawPreview.x - img.x) * scaleX;
              const sY = (drawPreview.y - img.y) * scaleY;
              const sW = drawPreview.w * scaleX;
              const sH = drawPreview.h * scaleY;
              
              canvas.width = sW;
              canvas.height = sH;
              ctx?.drawImage(sourceImg, sX, sY, sW, sH, 0, 0, sW, sH);
              onScanResult(canvas.toDataURL('image/jpeg', 0.8));
           } else {
             saveHistory();
             if (activeTool === 'crop') {
               const relX = ((drawPreview.x - img.x) / img.width) * 100;
               const relY = ((drawPreview.y - img.y) / img.height) * 100;
               const relW = (drawPreview.w / img.width) * 100;
               const relH = (drawPreview.h / img.height) * 100;

               setPage({
                 ...page,
                 images: page.images.map(i => i.id === imgId ? { 
                   ...i, 
                   crop: {
                     left: Math.max(0, relX),
                     top: Math.max(0, relY),
                     right: Math.max(0, 100 - (relX + relW)),
                     bottom: Math.max(0, 100 - (relY + relH))
                   } 
                 } : i)
               });
             } else if (activeTool === 'highlight') {
                const newH: Highlight = {
                  id: `h-box-${Date.now()}`,
                  x: drawPreview.x, y: drawPreview.y, width: drawPreview.w, height: drawPreview.h,
                  color: '#fbbf2466', mode: 'box'
                };
                setPage({ ...page, images: page.images.map(i => i.id === imgId ? { ...i, highlights: [...i.highlights, newH]} : i)});
             } else if (activeTool === 'blur') {
                const newB: Blur = {
                  id: `b-${Date.now()}`,
                  x: drawPreview.x, y: drawPreview.y, width: drawPreview.w, height: drawPreview.h,
                  intensity: toolSettings.blurIntensity
                };
                setPage({ ...page, images: page.images.map(i => i.id === imgId ? { ...i, blurs: [...i.blurs, newB]} : i)});
             }
           }
         }
       }
    } else {
      saveHistory();
    }
    
    setInteractionMode('none');
    setDragStart(null);
    setCurrentPath([]);
    setDrawPreview(null);
  };

  return (
    <div 
      ref={containerRef}
      className="bg-white shadow-2xl relative overflow-hidden select-none touch-none"
      style={{ width, height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {sortedImages.map((img) => {
        const isSelected = selectedImageIds.includes(img.id);
        const safeCrop = img.crop || { top: 0, right: 0, bottom: 0, left: 0 };
        return (
          <div 
            key={img.id}
            className={`absolute ${isSelected ? 'z-30' : ''}`}
            style={{ 
              left: img.x, 
              top: img.y, 
              width: img.width, 
              height: img.height, 
              zIndex: img.zIndex || 0,
              transform: `rotate(${img.rotation || 0}deg)`,
              transition: interactionMode === 'none' ? 'all 0.15s cubic-bezier(0.23, 1, 0.32, 1)' : 'none',
              willChange: 'transform, left, top, width, height'
            }}
          >
            <div className="relative w-full h-full">
              <img 
                src={img.src} 
                crossOrigin="anonymous"
                className="w-full h-full object-cover rounded-[1px]" 
                style={{ clipPath: `inset(${safeCrop.top}% ${safeCrop.right}% ${safeCrop.bottom}% ${safeCrop.left}%)` }} 
                alt="" draggable={false}
              />
              {(img.blurs || []).map(b => (
                <div key={b.id} className="absolute overflow-hidden" style={{ left: b.x - img.x, top: b.y - img.y, width: b.width, height: b.height, backdropFilter: `blur(${b.intensity / 5}px)` }} />
              ))}
              <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
                {(img.highlights || []).map(h => {
                  if (h.mode === 'pen' && h.path) {
                    const points = h.path.map(p => `${p.x},${p.y}`).join(' ');
                    return (
                      <polyline key={h.id} points={points} fill="none" stroke={h.color} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }} />
                    );
                  }
                  return (
                    <rect key={h.id} x={h.x - img.x} y={h.y - img.y} width={h.width} height={h.height} fill={h.color} rx="2" />
                  );
                })}
              </svg>
              {isSelected && !drawPreview && interactionMode !== 'draw' && (
                <>
                  <div className="absolute inset-[-4px] border-2 border-indigo-500 pointer-events-none shadow-[0_0_0_2px_rgba(255,255,255,0.8)]" />
                  {activeTool === 'select' && ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map(h => (
                    <div key={h} className={`absolute w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full z-40 shadow-sm -translate-x-1/2 -translate-y-1/2 cursor-${h}-resize pointer-events-auto hover:scale-125 transition-transform`}
                      style={{ 
                        left: h.includes('w') ? '0%' : h.includes('e') ? '100%' : '50%', 
                        top: h.includes('n') ? '0%' : h.includes('s') ? '100%' : '50%' 
                      }}
                      onPointerEnter={() => { if (interactionMode !== 'resize') setActiveHandle(h); }} 
                      onPointerLeave={() => { if (interactionMode !== 'resize') setActiveHandle(null); }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        );
      })}

      {interactionMode === 'draw' && drawPreview && (
        <div 
          className={`absolute border-2 border-dashed z-[100] pointer-events-none ${activeTool === 'crop' ? 'bg-indigo-500/10 border-indigo-400' : activeTool === 'scan' ? 'bg-emerald-500/10 border-emerald-400' : 'bg-amber-400/10 border-amber-500'}`}
          style={{ left: drawPreview.x, top: drawPreview.y, width: drawPreview.w, height: drawPreview.h }}
        >
          <div className="absolute -top-6 left-0 flex items-center gap-1 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-md shadow-lg font-black uppercase tracking-tighter">
             {activeTool?.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
};
