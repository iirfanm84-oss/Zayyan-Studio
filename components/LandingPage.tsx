
import React from 'react';
import { Layout, Box, ChevronRight, Zap, Activity, FileType, Maximize, Eraser, Pin, Signal, Sparkles, Smartphone, Monitor } from 'lucide-react';

interface LandingPageProps {
  onLaunchApp: (appId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-200 overflow-y-auto px-6 py-12 sm:px-12 sm:py-16 flex flex-col items-center selection:bg-indigo-500/30 no-scrollbar">
      {/* Hero Section with Dynamic Animated Logo */}
      <div className="max-w-4xl w-full text-center space-y-6 mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">
          <Zap size={12} fill="currentColor" className="animate-pulse"/> AI-Powered Creative Suite
        </div>
        
        {/* THE ANIMATED LOGO ENGINE */}
        <div className="relative h-24 sm:h-32 flex items-center justify-center select-none cursor-default py-4 overflow-visible">
          <div className="flex items-center text-4xl sm:text-7xl font-black tracking-tight h-[1.2em]">
            
            {/* WORD 1: Zayyan / Rayyan */}
            <div className="relative flex items-center h-full">
              <div className="relative w-[1.1ch] h-full">
                <span className="absolute inset-0 flex items-center animate-z-kick text-white">Z</span>
                <span className="absolute inset-0 flex items-center animate-r-kick text-indigo-500 opacity-0">R</span>
              </div>
              <span className="bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">ayyan</span>
            </div>
            
            {/* SPACING */}
            <span className="w-[0.4em]" />
            
            {/* WORD 2: Studi + Egg O */}
            <div className="relative flex items-center h-full">
              <span className="bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">Studi</span>
              
              {/* THE EGG SHELL O (The final letter of Studio) */}
              <div className="relative w-[1ch] h-full flex items-center justify-center">
                 {/* Invisible base O to maintain layout width and fallback visibility */}
                 <span className="opacity-10 text-white select-none">O</span>
                 
                 {/* Top and Bottom Shells */}
                 <div className="absolute inset-0 flex flex-col pointer-events-none overflow-visible">
                    <div className="h-1/2 overflow-hidden animate-o-top">
                       <div className="h-[200%] flex items-center justify-center text-white text-4xl sm:text-7xl font-black">O</div>
                    </div>
                    <div className="h-1/2 overflow-hidden animate-o-bottom">
                       <div className="h-[200%] flex items-center justify-center -translate-y-1/2 text-white text-4xl sm:text-7xl font-black">O</div>
                    </div>
                 </div>

                 {/* The "Chick" R that hatches and kicks */}
                 <div className="absolute inset-0 flex items-center justify-center animate-r-emerge text-indigo-500 opacity-0 font-black z-50">
                   R
                 </div>
              </div>
            </div>

          </div>
        </div>

        <p className="text-slate-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Automated workflows, high-end design, and smart content transformation.
        </p>
      </div>

      <div className="max-w-7xl w-full space-y-20">
        {/* Pinned Section */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <Pin size={16} className="text-indigo-500 fill-indigo-500/20" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Flagship Network Tools</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent ml-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 delay-300 duration-700">
            <AppTile 
              title="Zayyan Beam"
              desc="Instant P2P image sharing on your local network. No cloud needed."
              label="Network Share"
              color="cyan"
              icon={<BeamAnimation />}
              onClick={() => onLaunchApp('beam')}
            />
            <AppTile 
              title="Studio Editor"
              desc="Pro collage maker with AI layouts and smart OCR extraction."
              label="Pinned Flagship"
              color="indigo"
              icon={<LayoutAnimation />}
              onClick={() => onLaunchApp('collage')}
            />
            <AppTile 
              title="Claim Helper"
              desc="Automated sensor claim assistant. Scans hardware codes instantly."
              label="Claim Priority"
              color="emerald"
              icon={<ClaimAnimation />}
              onClick={() => onLaunchApp('dexcom-claim')}
            />
          </div>
        </section>

        {/* Secondary Tools Section */}
        <section className="space-y-8 pb-20">
          <div className="flex items-center gap-3 px-2">
            <Zap size={16} className="text-slate-600" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">AI Creative Utilities</h2>
            <div className="h-px flex-1 bg-slate-900 ml-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UtilityTile 
              title="AI Upscaler"
              desc="Enhance to 4K"
              icon={<UpscaleAnimation />}
              color="sky"
              onClick={() => onLaunchApp('upscaler')}
            />
            <UtilityTile 
              title="Magic Eraser"
              desc="Isolate Subjects"
              icon={<EraserAnimation />}
              color="violet"
              onClick={() => onLaunchApp('bg-eraser')}
            />
            <UtilityTile 
              title="PDF Slimmer"
              desc="Size Optimization"
              icon={<SlimmerAnimation />}
              color="red"
              onClick={() => onLaunchApp('pdf-optimizer')}
            />
          </div>
        </section>
      </div>

      <footer className="mt-auto py-12 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
           <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-2xl shadow-emerald-500/5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.05em] text-emerald-400">
                Privacy Guard: All processing is local/in-memory. Refreshing wipes all history.
              </p>
           </div>
           <div className="flex items-center gap-2 text-slate-700">
            <Box size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Zayyan Studio Engine v3.0.0</span>
          </div>
        </div>
      </footer>

      <style>{`
        /* The Shell splitting apart */
        @keyframes o-top {
          0%, 15%, 85%, 100% { transform: translateY(0); }
          20%, 80% { transform: translateY(-12px); }
        }
        @keyframes o-bottom {
          0%, 15%, 85%, 100% { transform: translateY(0); }
          20%, 80% { transform: translateY(12px); }
        }
        .animate-o-top { animation: o-top 8s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .animate-o-bottom { animation: o-bottom 8s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        /* The R hatching and flying across the screen to kick Z */
        @keyframes r-emerge {
          0%, 15% { transform: scale(0) translate(0, 0); opacity: 0; }
          20% { transform: scale(1.1) translate(0, 0); opacity: 1; }
          25% { transform: scale(1) translate(-2ch, -5px); opacity: 1; } 
          29.9% { transform: scale(1.1) translate(-11.5ch, 0); opacity: 1; } /* IMPACT: Corrected distance to 11.5ch */
          30%, 100% { transform: scale(1) translate(-11.5ch, 0); opacity: 0; } /* Immediate vanish to avoid overlap */
        }
        .animate-r-emerge {
          animation: r-emerge 8s infinite cubic-bezier(0.6, -0.28, 0.735, 0.045);
        }

        /* The static R that stays after the kick */
        @keyframes r-kick {
          0%, 30% { opacity: 0; transform: scale(0); }
          30.1%, 79.5% { opacity: 1; transform: scale(1); }
          80%, 100% { opacity: 0; transform: translateY(200px) rotate(45deg); } /* Z crushes it */
        }
        .animate-r-kick {
          animation: r-kick 8s infinite ease-in-out;
        }

        /* The Z being kicked and then jumping from the sky to reclaim its spot */
        @keyframes z-kick {
          0%, 29.9% { transform: translateY(0) rotate(0); opacity: 1; }
          30% { transform: translateY(200px) rotate(90deg); opacity: 0; } /* Kicked out */
          75% { transform: translateY(-500px) rotate(0); opacity: 0; } /* Drop prep */
          80% { transform: translateY(0) rotate(0); opacity: 1; } /* LANDING */
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-z-kick {
          animation: z-kick 8s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
};

/* --- ANIMATION HELPER COMPONENTS --- */

const BeamAnimation = () => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    <div className="flex items-center gap-4 relative z-10">
       <Smartphone size={18} className="text-white animate-beam-pulse-1" />
       <div className="w-8 h-[1px] bg-white/20 relative">
          <div className="absolute top-[-2px] left-0 w-1 h-1 bg-cyan-400 rounded-full animate-beam-packet shadow-[0_0_8px_#22d3ee]" />
          <div className="absolute top-[-2px] right-0 w-1 h-1 bg-indigo-400 rounded-full animate-beam-packet-reverse shadow-[0_0_8px_#818cf8]" />
       </div>
       <Monitor size={18} className="text-white animate-beam-pulse-2" />
    </div>
    <style>{`
      @keyframes beam-packet { 0% { left: 0; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
      @keyframes beam-packet-reverse { 0% { right: 0; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { right: 100%; opacity: 0; } }
      @keyframes beam-pulse-1 { 0%, 100% { transform: scale(1); color: #22d3ee; } 50% { transform: scale(1.1); color: #fff; } }
      @keyframes beam-pulse-2 { 0%, 100% { transform: scale(1.1); color: #fff; } 50% { transform: scale(1); color: #818cf8; } }
      .animate-beam-packet { animation: beam-packet 2s infinite linear; }
      .animate-beam-packet-reverse { animation: beam-packet-reverse 2s infinite linear; animation-delay: 1s; }
      .animate-beam-pulse-1 { animation: beam-pulse-1 3s infinite ease-in-out; }
      .animate-beam-pulse-2 { animation: beam-pulse-2 3s infinite ease-in-out; }
    `}</style>
  </div>
);

const LayoutAnimation = () => (
  <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-2">
    {[0,1,2,3].map(i => (
      <div 
        key={i} 
        className="bg-white/20 rounded-[4px] animate-grid-breathe" 
        style={{ animationDelay: `${i * 0.4}s` }} 
      />
    ))}
    <style>{`
      @keyframes grid-breathe { 0%, 100% { transform: scale(1); background-color: rgba(255,255,255,0.1); } 50% { transform: scale(0.92); background-color: rgba(255,255,255,0.4); } }
      .animate-grid-breathe { animation: grid-breathe 2.5s infinite ease-in-out; }
    `}</style>
  </div>
);

const ClaimAnimation = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <Activity className="text-white/20" size={24} />
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
      <path d="M0,50 L30,50 L35,30 L45,70 L50,50 L100,50" fill="none" stroke="white" strokeWidth="2" className="animate-pulse-path" style={{ strokeDasharray: 200, strokeDashoffset: 200 }} />
    </svg>
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent h-1/4 w-full animate-claim-scan" />
    <style>{`
      @keyframes pulse-path { 0% { stroke-dashoffset: 200; opacity: 0; } 50% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: -200; opacity: 0; } }
      @keyframes claim-scan { 0% { top: -20%; } 100% { top: 120%; } }
      .animate-pulse-path { animation: pulse-path 3s infinite linear; }
      .animate-claim-scan { animation: claim-scan 2s infinite linear; }
    `}</style>
  </div>
);

const UpscaleAnimation = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="relative">
       <Maximize size={20} className="text-white/10" />
       <Maximize size={20} className="text-white absolute inset-0 animate-upscale-shimmer blur-[1px]" />
    </div>
    <Sparkles size={10} className="absolute top-2 right-2 text-amber-400 animate-bounce" />
    <style>{`
      @keyframes upscale-shimmer { 0%, 100% { opacity: 0.2; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }
      .animate-upscale-shimmer { animation: upscale-shimmer 2s infinite ease-in-out; }
    `}</style>
  </div>
);

const EraserAnimation = () => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
    <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-eraser-wipe" />
    <Eraser size={18} className="text-white absolute z-10 animate-eraser-move" />
    <style>{`
      @keyframes eraser-wipe { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      @keyframes eraser-move { 0% { transform: translate(-10px, -5px) rotate(0deg); } 50% { transform: translate(10px, 5px) rotate(20deg); } 100% { transform: translate(-10px, -5px) rotate(0deg); } }
      .animate-eraser-wipe { animation: eraser-wipe 2s infinite ease-in-out; }
      .animate-eraser-move { animation: eraser-move 3s infinite ease-in-out; }
    `}</style>
  </div>
);

const SlimmerAnimation = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <FileType size={22} className="text-white animate-slim-compress" />
    <style>{`
      @keyframes slim-compress { 0%, 100% { transform: scaleX(1) scaleY(1); opacity: 0.5; } 50% { transform: scaleX(1.3) scaleY(0.7); opacity: 1; } }
      .animate-slim-compress { animation: slim-compress 2s infinite ease-in-out; }
    `}</style>
  </div>
);

const ShieldCheck = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const AppTile: React.FC<{title: string, desc: string, label: string, color: string, icon: React.ReactNode, onClick: () => void}> = ({title, desc, label, color, icon, onClick}) => (
  <button onClick={onClick} className={`group relative flex flex-col p-8 rounded-[40px] bg-slate-900/50 border border-${color}-500/30 hover:bg-slate-900/80 transition-all duration-500 text-left overflow-hidden shadow-2xl ring-1 ring-${color}-500/10 active:scale-[0.98]`}>
    <div className={`absolute top-4 left-6 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-${color}-500/20 border border-${color}-500/30 text-${color}-400 text-[8px] font-black uppercase tracking-widest z-20`}>{label}</div>
    <div className="relative z-10 space-y-6 mt-4">
      <div className={`w-16 h-16 rounded-3xl bg-${color}-600/90 flex items-center justify-center shadow-lg shadow-${color}-600/20 transition-transform group-hover:scale-110 group-hover:rotate-3 overflow-hidden`}>{icon}</div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">{title} <ChevronRight size={16} className={`text-${color}-400 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0`} /></h3>
        <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  </button>
);

const UtilityTile: React.FC<{title: string, desc: string, icon: React.ReactNode, color: string, onClick: () => void}> = ({title, desc, icon, color, onClick}) => (
  <button onClick={onClick} className={`group relative flex items-center gap-6 p-6 rounded-[32px] bg-slate-900/30 border border-white/5 hover:border-${color}-500/20 hover:bg-slate-900/60 transition-all duration-300 text-left active:scale-[0.98]`}>
    <div className={`w-14 h-14 shrink-0 rounded-2xl bg-${color}-600/10 flex items-center justify-center text-${color}-400 group-hover:scale-110 transition-transform overflow-hidden`}>{icon}</div>
    <div className="flex-1"><h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">{title}</h3><p className={`text-[10px] text-slate-500 uppercase font-bold tracking-tight`}>{desc}</p></div>
    <ChevronRight size={16} className={`text-slate-700 group-hover:text-${color}-400 transition-colors`} />
  </button>
);
