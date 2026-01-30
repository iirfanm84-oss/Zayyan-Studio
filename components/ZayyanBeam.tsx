
import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Radio, Smartphone, Monitor,
  ArrowUp, Download, Loader2, X, CheckCircle2,
  Sparkles, Maximize, Eraser, Layout,
  Zap, Camera, RefreshCw, Wifi, AlertTriangle,
  Signal, DownloadCloud, ShieldCheck, Link2
} from 'lucide-react';
// @ts-ignore
import Peer from 'peerjs';
// @ts-ignore
import QRCode from 'qrcode';
// @ts-ignore
import { Html5Qrcode } from 'html5-qrcode';
import { analyzeReceivedImage } from '../services/geminiService';

interface IncomingFile {
  id: string;
  name: string;
  data: string; // base64
  size: number;
  analysis?: { summary: string; suggestion: string };
  isAnalyzing: boolean;
}

interface PeerFileData {
  type: 'file';
  name: string;
  payload: string;
  size: number;
}

interface ZayyanBeamProps {
  onGoHome: () => void;
  onLaunchApp: (appId: string) => void;
}

export const ZayyanBeam: React.FC<ZayyanBeamProps> = ({ onGoHome, onLaunchApp }) => {
  const [peerId, setPeerId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [peer, setPeer] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [receivedFiles, setReceivedFiles] = useState<IncomingFile[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [studioName, setStudioName] = useState(localStorage.getItem('zayyan_studio_name') || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    let p: any = null;

    const initPeer = () => {
      const suffix = Math.floor(Math.random() * 1000);
      const myId = studioName 
        ? `ZAYYAN-${studioName.toUpperCase()}-${isMobile ? 'REMOTE' : 'HOST'}`
        : `ZAYYAN-T-${suffix}`;
      
      const target = studioName 
        ? `ZAYYAN-${studioName.toUpperCase()}-${isMobile ? 'HOST' : 'REMOTE'}`
        : '';

      setTargetId(target);

      p = new Peer(myId, {
        config: {
          'iceServers': [
            { url: 'stun:stun.l.google.com:19302' },
            { url: 'stun:stun1.l.google.com:19302' },
            { url: 'stun:stun2.l.google.com:19302' },
          ]
        },
        debug: 1
      });

      p.on('open', async (id: string) => {
        setPeerId(id);
        setPeer(p);
        setStatus('idle');
        setErrorMessage(null);

        const cleanOrigin = window.location.origin.replace(/\/$/, "");
        const absoluteUrl = `${cleanOrigin}/?beam=${id}`;
        
        try {
          const qr = await QRCode.toDataURL(absoluteUrl, {
            margin: 2,
            width: 800,
            color: { dark: '#000000', light: '#ffffff' }
          });
          setQrCodeUrl(qr);
        } catch (err) {
          console.error("QR Generation error", err);
        }

        // Auto-bridge if target exists
        if (target && target !== id) {
          attemptAutoConnect(p, target);
        }
      });

      p.on('connection', (conn: any) => {
        setupConnection(conn);
      });

      p.on('error', (err: any) => {
        if (err.type === 'peer-unavailable') {
          // This happens when the other side isn't open yet. 
          // We handle this silently in the background but update status if manual.
          if (status === 'connecting') {
            setStatus('idle');
            setErrorMessage(`Waiting for ${isMobile ? 'Host' : 'Remote'} to join Studio...`);
          }
        } else if (err.type === 'unavailable-id') {
          setErrorMessage("Studio Name Conflict. Try adding a number to your name.");
          setStatus('error');
        } else {
          setErrorMessage("Link Node Error. Check connection.");
          setStatus('error');
        }
      });
    };

    const attemptAutoConnect = (pInstance: any, tId: string) => {
      if (!pInstance || pInstance.destroyed) return;
      
      const conn = pInstance.connect(tId, { reliable: true });
      setupConnection(conn);
    };

    initPeer();

    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (p) {
        p.off('open');
        p.off('connection');
        p.off('error');
        p.destroy();
      }
    };
  }, [studioName, isMobile]);

  const updateStudioName = (name: string) => {
    const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-');
    setStudioName(cleaned);
    if (cleaned) {
      localStorage.setItem('zayyan_studio_name', cleaned);
    } else {
      localStorage.removeItem('zayyan_studio_name');
    }
  };

  const resetAll = () => {
    localStorage.removeItem('zayyan_studio_name');
    setStudioName('');
    setConnections([]);
    setReceivedFiles([]);
    setStatus('idle');
    setErrorMessage(null);
    if (peer) {
      peer.destroy();
      setPeer(null);
    }
  };

  const handleManualConnect = (tId: string = targetId) => {
    if (!tId || !peer || peer.destroyed) return;
    setStatus('connecting');
    setErrorMessage(null);
    
    const conn = peer.connect(tId, { reliable: true });
    setupConnection(conn);
    
    // Safety timeout for UI feedback
    setTimeout(() => {
      if (status === 'connecting' && connections.length === 0) {
        setStatus('idle');
        setErrorMessage("Studio Link Timeout. Is the other device online?");
      }
    }, 10000);
  };

  const setupConnection = (conn: any) => {
    conn.on('open', () => {
      setConnections(prev => {
        if (prev.find(c => c.peer === conn.peer)) return prev;
        return [...prev, conn];
      });
      setStatus('connected');
      setErrorMessage(null);
    });

    conn.on('data', async (incoming: any) => {
      if (incoming && typeof incoming === 'object' && incoming.type === 'file') {
        const fileData = incoming as PeerFileData;
        
        const newFile: IncomingFile = {
          id: `file-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: fileData.name || 'received-asset',
          data: fileData.payload,
          size: fileData.size,
          isAnalyzing: true
        };
        setReceivedFiles(prev => [newFile, ...prev]);
        
        const analysis = await analyzeReceivedImage(fileData.payload);
        setReceivedFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, analysis: analysis || undefined, isAnalyzing: false } : f));
      }
    });

    conn.on('close', () => {
      setConnections(prev => prev.filter(c => c.peer !== conn.peer));
      if (connections.length <= 1) setStatus('idle');
    });

    conn.on('error', () => {
      setStatus('error');
      setErrorMessage("Link Interrupted.");
    });
  };

  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (decodedText.includes('beam=')) {
              const url = new URL(decodedText);
              const target = url.searchParams.get('beam');
              if (target) handleManualConnect(target);
            } else {
              handleManualConnect(decodedText);
            }
            stopScanner();
          },
          () => {}
        );
      } catch (err) {
        setIsScanning(false);
        setErrorMessage("Camera initialization failed.");
      }
    }, 400);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
        scannerRef.current = null;
      }).catch(console.error);
    } else {
      setIsScanning(false);
    }
  };

  const sendFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0 && connections.length > 0) {
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const payload = ev.target?.result as string;
          connections.forEach(conn => {
            if (conn.open) {
              conn.send({ 
                type: 'file', 
                name: file.name, 
                size: file.size, 
                payload
              });
            }
          });
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <header className="h-14 border-b border-slate-800/50 flex items-center justify-between px-4 bg-slate-900/40 backdrop-blur-xl shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={onGoHome} className="p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-white/5 transition-all text-slate-400">
            <Home size={16}/>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-500 rounded-lg shadow-lg shadow-cyan-500/20">
              <Radio size={16} className="text-white"/>
            </div>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Zayyan Beam</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-lg border border-white/5">
             <div className={`w-1.5 h-1.5 rounded-full ${connections.length > 0 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500 animate-pulse'}`}></div>
             <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">{isMobile ? 'Remote' : 'Host'}</span>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={connections.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-cyan-600/30 disabled:opacity-20"
          >
            <ArrowUp size={14}/> Beam Assets
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="lg:w-1/2 p-6 lg:p-12 relative flex flex-col items-center justify-center border-r border-white/5 overflow-hidden">
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className={`radar-circle w-40 h-40 border-cyan-500/40 ${status === 'connected' ? 'animate-none scale-150' : ''}`}></div>
              <div className="radar-circle w-80 h-80 border-cyan-500/30"></div>
           </div>

           <div className="relative z-10 w-full max-w-sm space-y-8 flex flex-col items-center">
              <div className="text-center space-y-2">
                 <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                   {connections.length > 0 ? 'Beam Established' : status === 'connecting' ? 'Handshaking...' : 'Signal Ready'}
                 </h2>
                 <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">
                   {connections.length > 0 ? 'Synchronized Stream Active' : 'Scan or Join Studio to Bridge'}
                 </p>
              </div>

              {errorMessage && (
                <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                   <AlertTriangle className="text-red-500 shrink-0" size={16}/>
                   <p className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">{errorMessage}</p>
                </div>
              )}

              <div className="w-full flex flex-col items-center gap-6">
                <div className="relative group qr-container bg-white p-4 rounded-[48px] shadow-2xl transition-all hover:scale-[1.02]">
                   {qrCodeUrl ? (
                      <img src={qrCodeUrl} className="w-52 h-52 rounded-3xl" alt="Bridge QR" />
                    ) : (
                      <div className="w-52 h-52 flex items-center justify-center"><Loader2 className="animate-spin text-cyan-500" size={32} /></div>
                    )}
                    {connections.length > 0 && (
                      <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[2px] rounded-[48px] flex items-center justify-center border-4 border-emerald-500/50">
                         <div className="bg-emerald-500 text-slate-950 p-4 rounded-full shadow-2xl">
                            <CheckCircle2 size={48} />
                         </div>
                      </div>
                    )}
                </div>

                <div className="w-full grid grid-cols-2 gap-3">
                  <button onClick={startScanner} className="flex flex-col items-center gap-3 p-5 bg-slate-900 hover:bg-slate-800 rounded-[32px] transition-all border border-white/5 group">
                    <Camera size={24} className="text-cyan-400 group-hover:scale-110 transition-transform"/>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Scan Studio</span>
                  </button>
                  <button onClick={() => handleManualConnect()} disabled={status === 'connecting' || connections.length > 0} className={`flex flex-col items-center gap-3 p-5 rounded-[32px] transition-all border border-white/5 shadow-xl ${status === 'connecting' ? 'bg-cyan-500/20' : connections.length > 0 ? 'bg-emerald-500/20 border-emerald-500/20' : 'bg-cyan-600 hover:bg-cyan-500'}`}>
                    {status === 'connecting' ? <Loader2 size={24} className="animate-spin text-white"/> : connections.length > 0 ? <Wifi size={24} className="text-emerald-400"/> : <Zap size={24} className="text-white"/>}
                    <span className="text-[8px] font-black uppercase tracking-widest text-white">{status === 'connecting' ? 'Linking...' : connections.length > 0 ? 'Linked' : 'Manual Sync'}</span>
                  </button>
                </div>
              </div>

              <div className="w-full p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-[32px] space-y-4">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400/80">Persistent Studio</h4>
                    <button onClick={resetAll} className="text-[9px] text-slate-600 hover:text-red-400 uppercase font-black transition-colors flex items-center gap-1">
                      <RefreshCw size={10}/> Wipe
                    </button>
                 </div>
                 {studioName ? (
                   <div className="flex items-center justify-between gap-3 p-4 bg-slate-900/80 rounded-2xl border border-white/10 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
                          <Signal size={20}/>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Frequency</span>
                          <span className="text-lg font-black text-white">{studioName}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono font-bold text-cyan-400">{peerId.split('-').pop()}</span>
                        <span className="text-[7px] text-slate-600 uppercase font-black tracking-widest">Node</span>
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-3">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="ASSIGN STUDIO NAME..." 
                          onKeyDown={(e) => { if (e.key === 'Enter') updateStudioName((e.target as HTMLInputElement).value); }} 
                          className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-center text-xs font-black uppercase tracking-[0.3em] text-cyan-400 focus:outline-none focus:border-cyan-500/40" 
                        />
                        <Zap size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-800"/>
                      </div>
                      <p className="text-[8px] text-slate-600 text-center font-bold uppercase tracking-widest">Connect PC & Phone via shared name</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        <div className="flex-1 bg-slate-950/30 p-6 overflow-y-auto no-scrollbar flex flex-col">
           <div className="max-w-2xl mx-auto w-full space-y-6 flex-1">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Incoming Assets</h3>
                    <div className="px-2 py-0.5 bg-slate-900 rounded-full text-[8px] font-black text-slate-400">{receivedFiles.length}</div>
                </div>
                {receivedFiles.length > 0 && <button onClick={() => setReceivedFiles([])} className="text-[9px] font-bold text-slate-700 hover:text-red-400 uppercase transition-colors">Clear</button>}
              </div>

              <div className="grid grid-cols-1 gap-6 pb-20">
                {receivedFiles.map(file => (
                  <div key={file.id} className="group bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in slide-in-from-right-4 duration-500">
                     <div className="w-full md:w-48 aspect-square bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden shrink-0">
                        <img src={file.data} className="max-w-full max-h-full object-contain rounded-2xl shadow-lg transition-transform duration-500 group-hover:scale-110" alt="" />
                     </div>
                     <div className="flex-1 p-8 flex flex-col justify-center gap-6">
                        <div className="space-y-2">
                           <h4 className="text-lg font-black text-white truncate tracking-tight">{file.name}</h4>
                           {file.isAnalyzing ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 size={12} className="animate-spin text-cyan-400"/>
                                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest animate-pulse">Analyzing...</span>
                                </div>
                              ) : file.analysis && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20 w-fit">
                                  <Sparkles size={10} className="text-amber-400"/>
                                  <span className="text-[10px] font-black text-slate-300 uppercase">{file.analysis.summary}</span>
                                </div>
                              )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                           <ActionBtn icon={<Download size={16}/>} label="Save" onClick={() => { const link = document.createElement('a'); link.href = file.data; link.download = file.name; link.click(); }} />
                           {file.analysis?.suggestion === 'upscale' && <ActionBtn icon={<Maximize size={16}/>} label="Upscale" primary onClick={() => onLaunchApp('upscaler')}/>}
                           {file.analysis?.suggestion === 'bg-eraser' && <ActionBtn icon={<Eraser size={16}/>} label="Cutout" primary onClick={() => onLaunchApp('bg-eraser')}/>}
                           {file.analysis?.suggestion === 'collage' && <ActionBtn icon={<Layout size={16}/>} label="Open in Studio" primary onClick={() => onLaunchApp('collage')}/>}
                        </div>
                     </div>
                  </div>
                ))}
                {receivedFiles.length === 0 && (
                  <div className="h-96 border-4 border-dashed border-white/5 rounded-[60px] flex flex-col items-center justify-center gap-6 text-slate-800">
                     <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center animate-pulse"><Signal size={32} className="opacity-10"/></div>
                     <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-700">Awaiting Signal</p>
                  </div>
                )}
              </div>
           </div>

           <div className="mt-auto py-8 flex flex-col items-center gap-2 border-t border-white/5">
             <div className="flex items-center gap-3 px-5 py-2 bg-cyan-500/5 rounded-full">
                <ShieldCheck size={14} className="text-cyan-400" />
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-400">
                  Secure P2P Channel: No cloud storage used.
                </p>
             </div>
           </div>
        </div>
      </main>

      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in">
          <div className="p-8 flex items-center justify-between border-b border-white/10 bg-slate-950">
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-cyan-400">Scanner</h3>
            <button onClick={stopScanner} className="p-3 bg-white/10 rounded-full text-white"><X size={28}/></button>
          </div>
          <div className="flex-1 relative bg-black flex items-center justify-center">
            <div id="qr-reader" className="w-full h-full"></div>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-64 h-64 border-4 border-cyan-500 rounded-[64px] shadow-[0_0_100px_rgba(6,182,212,0.3)]"></div>
            </div>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*" onChange={sendFile} />
    </div>
  );
};

const ActionBtn: React.FC<{icon: any, label: string, primary?: boolean, onClick: () => void}> = ({icon, label, primary, onClick}) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${primary ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{icon} {label}</button>
);
