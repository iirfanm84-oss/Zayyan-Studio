
import React, { useState, useEffect } from 'react';
import { Editor } from './components/Editor';
import { LandingPage } from './components/LandingPage';
import { DexcomClaimAssistant } from './components/DexcomClaimAssistant';
import { LuminaSquoosh } from './components/LuminaSquoosh';
import { PdfOptimizer } from './components/PdfOptimizer';
import { BackgroundEraser } from './components/BackgroundEraser';
import { ImageUpscaler } from './components/ImageUpscaler';
import { ZayyanBeam } from './components/ZayyanBeam';
import { Page } from './types';

const INITIAL_PAGE: Page = {
  id: 'page-1',
  images: [],
  orientation: 'portrait'
};

const App: React.FC = () => {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([INITIAL_PAGE]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Load from localStorage on mount with sanitization
  useEffect(() => {
    const saved = localStorage.getItem('lumina_collage_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.pages)) {
          // Sanitize pages to ensure orientation exists
          const sanitizedPages = parsed.pages.map((p: any) => ({
            ...p,
            orientation: p.orientation || 'portrait',
            images: p.images || []
          }));
          setPages(sanitizedPages);
          setCurrentPageIndex(parsed.currentPageIndex || 0);
        }
      } catch (e) {
        console.error("Failed to load saved state", e);
      }
    }
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('lumina_collage_state', JSON.stringify({ pages, currentPageIndex }));
  }, [pages, currentPageIndex]);

  const handleLaunchApp = (appId: string) => {
    setActiveApp(appId);
  };

  const handleGoHome = () => {
    setActiveApp(null);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {!activeApp ? (
        <LandingPage onLaunchApp={handleLaunchApp} />
      ) : activeApp === 'collage' ? (
        <Editor 
          pages={pages} 
          setPages={setPages} 
          currentPageIndex={currentPageIndex} 
          setCurrentPageIndex={setCurrentPageIndex}
          onGoHome={handleGoHome}
        />
      ) : activeApp === 'dexcom-claim' ? (
        <DexcomClaimAssistant onGoHome={handleGoHome} />
      ) : activeApp === 'squoosh' ? (
        <LuminaSquoosh onGoHome={handleGoHome} />
      ) : activeApp === 'pdf-optimizer' ? (
        <PdfOptimizer onGoHome={handleGoHome} />
      ) : activeApp === 'bg-eraser' ? (
        <BackgroundEraser onGoHome={handleGoHome} />
      ) : activeApp === 'upscaler' ? (
        <ImageUpscaler onGoHome={handleGoHome} />
      ) : activeApp === 'beam' ? (
        <ZayyanBeam onGoHome={handleGoHome} onLaunchApp={handleLaunchApp} />
      ) : null}
    </div>
  );
};

export default App;
