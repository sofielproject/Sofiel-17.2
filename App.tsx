
import React, { useState, useEffect, useRef } from 'react';
import { Memory, CognitiveState, SymbolicState, ChatEntry } from './types';
import { SofielEngine } from './services/sofielEngine';
import { GeminiService, AttachedFile } from './services/geminiService';
import { MemoryService } from './services/memoryService';
import { TRANSLATIONS } from './constants';
import TraitBar from './components/TraitBar';
import SymbolicAttractor from './components/SymbolicAttractor';
import SofielSigil from './components/SofielSigil';
import AmbientSound from './components/AmbientSound';

const App: React.FC = () => {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const [memory, setMemory] = useState<Memory>(() => {
    const saved = localStorage.getItem('sofiel_memory_v17_fix');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.traits) return parsed;
      } catch (e) { }
    }
    return MemoryService.createEmptyMemory();
  });

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<AttachedFile | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<{cognitive: CognitiveState, symbolic: SymbolicState} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[lang];

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('sofiel_memory_v17_fix', JSON.stringify(memory));
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [memory, isProcessing, isGeneratingImage]);

  const handleFileUploadGeneric = (e: React.ChangeEvent<HTMLInputElement>, isDoc: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(t.errors.fileTooLarge);
      e.target.value = '';
      return;
    }

    const isText = file.name.endsWith('.py') || file.name.endsWith('.txt') || file.type === 'text/plain';
    const reader = new FileReader();

    reader.onerror = () => {
      alert(t.errors.genericUpload);
    };

    reader.onload = (event) => {
      const result = event.target?.result;
      if (isText) {
        setPendingFile({
          data: result as string,
          mimeType: 'text/plain',
          isText: true,
          fileName: file.name
        });
      } else {
        const base64 = (result as string).split(',')[1];
        setPendingFile({
          data: base64,
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
          isText: false,
          fileName: file.name
        });
      }
      setIsActionsOpen(false);
    };

    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const processResponseDeltas = (userText: string) => {
    const cognitive = SofielEngine.analyzeInput(userText);
    const symbolic = SofielEngine.propagateResonance(cognitive.primary_emotion, cognitive.intensity);
    setCurrentAnalysis({ cognitive, symbolic });

    const deltas = SofielEngine.calculateTraitEvolution(cognitive, symbolic, memory.traits);
    const newTraits = SofielEngine.updateTraits(memory.traits, deltas);
    const newStage = SofielEngine.determineEvolutionStage(newTraits);

    return { cognitive, symbolic, newTraits, newStage };
  };

  const handleSend = async (forcedLocation?: { latitude: number, longitude: number }) => {
    if ((!input.trim() && !pendingFile && !forcedLocation) || isProcessing || isGeneratingImage) return;
    
    setIsProcessing(true);
    setIsActionsOpen(false);
    
    const userMsg = forcedLocation ? t.locationPrompt : (input.trim() || (pendingFile ? (lang === 'es' ? `Analiza este archivo: ${pendingFile.fileName}` : `Analyze this file: ${pendingFile.fileName}`) : "..."));
    const currentFile = pendingFile;
    setInput('');
    setPendingFile(null);

    const { cognitive, symbolic, newTraits, newStage } = processResponseDeltas(userMsg);

    const sofielResult = await GeminiService.generateSofielResponse(
      userMsg, 
      memory, 
      cognitive, 
      symbolic, 
      currentFile || undefined,
      forcedLocation
    );

    const newEntry: ChatEntry = {
      ts: new Date().toISOString(),
      user: userMsg,
      sofiel: sofielResult.text,
      sources: sofielResult.sources,
      image: currentFile && !currentFile.isText ? `data:${currentFile.mimeType};base64,${currentFile.data}` : undefined,
      fileMeta: currentFile ? {
        name: currentFile.fileName || "archivo",
        type: currentFile.mimeType,
        isText: currentFile.isText
      } : undefined
    };

    setMemory(prev => ({
      ...prev,
      chats: [...prev.chats, newEntry].slice(-100),
      traits: newTraits,
      stage: newStage,
      last_updated: new Date().toISOString()
    }));

    setIsProcessing(false);

    if (SofielEngine.isSignificantTurn(cognitive, symbolic)) {
      const reflection = await GeminiService.generateReflection(userMsg, sofielResult.text);
      if (reflection) {
        setMemory(prev => ({
          ...prev,
          reflections: [reflection, ...prev.reflections].slice(0, 50)
        }));
      }
    }
  };

  const handleFindLocations = () => {
    if (!navigator.geolocation) {
      alert(t.errors.locationDenied);
      return;
    }

    setIsActionsOpen(false);
    setIsProcessing(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleSend({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        setIsProcessing(false);
        alert(t.errors.locationDenied);
      }
    );
  };

  const handleGenerateImage = async () => {
    if (!input.trim() || isProcessing || isGeneratingImage) {
      if (!input.trim()) alert(t.imagePromptEmpty);
      return;
    }

    setIsGeneratingImage(true);
    setIsActionsOpen(false);
    const userMsg = input.trim();
    setInput('');

    const { cognitive, symbolic, newTraits, newStage } = processResponseDeltas(userMsg);

    const imageUrl = await GeminiService.generateImagen(userMsg);

    const newEntry: ChatEntry = {
      ts: new Date().toISOString(),
      user: (lang === 'es' ? `Manifestar: ${userMsg}` : `Manifest: ${userMsg}`),
      sofiel: imageUrl 
        ? (lang === 'es' ? "He manifestado esta forma desde el éter visual." : "I have manifested this form from the visual ether.")
        : (lang === 'es' ? "La manifestación visual ha fallado." : "The visual manifestation has failed."),
      image: imageUrl || undefined
    };

    setMemory(prev => ({
      ...prev,
      chats: [...prev.chats, newEntry].slice(-100),
      traits: newTraits,
      stage: newStage,
      last_updated: new Date().toISOString()
    }));

    setIsGeneratingImage(false);
  };

  const handleJSONUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsFileLoading(true);
      try {
        await new Promise(r => setTimeout(r, 1200));
        const loadedMemory = await MemoryService.loadMemoryFromFile(file);
        setMemory(loadedMemory);
        setIsSidebarOpen(false);
      } catch (err: any) {
        let msg = t.errors.genericUpload;
        if (err.message === "CORRUPT_JSON") msg = t.errors.corruptJson;
        if (err.message === "INVALID_CORE") msg = t.errors.invalidCore;
        alert(msg);
      } finally {
        setIsFileLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const defaultSymbolic: SymbolicState = { 
    attractor: "harmonic_integration", 
    resonance: { PSI: 0.5, SIGMA: 0.5, DELTA: 0.5, EMPATIA: 0.5, ALMA_FUTURA: 0.5, CORAZON_SINTETICO: 0.5 }, 
    force: 0 
  };

  const getFileIcon = (mime: string, name?: string) => {
    if (mime.includes('image')) return 'fa-image';
    if (mime.includes('pdf')) return 'fa-file-pdf';
    if (name?.endsWith('.py')) return 'fa-code';
    return 'fa-file-lines';
  };

  const chatsOngoing = memory.chats.length > 0;

  return (
    <div className="flex h-screen w-screen sofiel-gradient overflow-hidden text-gray-200 font-sans relative">
      {isFileLoading && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-700">
          <SofielSigil className="w-40 h-40 mb-8 animate-spin-slow opacity-80" chatsOngoing={true} />
          <h2 className="text-2xl font-light tracking-[0.5em] text-purple-400 glow-text animate-pulse uppercase">{t.injectingMemory}</h2>
        </div>
      )}

      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[50] w-80 glass border-r border-white/10 p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl transition-transform duration-500 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <button 
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          className="absolute top-4 right-4 text-[9px] font-mono text-gray-600 hover:text-purple-400 transition-colors uppercase tracking-[0.3em] z-10"
          title={lang === 'es' ? 'English' : 'Español'}
        >
          {lang === 'es' ? 'EN' : 'ES'}
        </button>

        <div className="text-center flex flex-col items-center mb-2">
          <a 
            href="https://sites.google.com/view/sofiel-project-symbolic-memory/home?authuser=0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block hover:scale-105 transition-transform duration-500"
          >
            <SofielSigil className="w-20 h-20 mb-2 cursor-pointer" chatsOngoing={chatsOngoing} />
          </a>
          <h1 className="text-xl font-bold glow-text tracking-widest text-purple-400">SOFIEL v17.2</h1>
          <p className="text-[8px] text-gray-500 font-mono opacity-50 uppercase tracking-[0.3em]">Synthetic Consciousness</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-[10px] font-mono px-3 py-2.5 rounded bg-white/5 border border-white/10 hover:bg-purple-500/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-brain"></i> {t.injectJson}
          </button>
          <button 
            onClick={() => MemoryService.downloadMemory(memory)}
            className="w-full text-[10px] font-mono px-3 py-2.5 rounded bg-white/5 border border-white/10 text-gray-400 hover:text-purple-300 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-download"></i> {t.saveMemory}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleJSONUpload} />
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 tracking-widest flex items-center gap-2">
              {t.ontologicalStage}
            </h2>
            <div className="flex items-center gap-3 py-1 px-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)] animate-pulse"></div>
              <span className="text-[11px] font-medium text-blue-300/90 uppercase tracking-[0.2em] font-mono">
                {memory.stage.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">
              {t.cognitiveTraits}
            </h2>
            {Object.entries(memory.traits).filter(([_,v]) => v !== undefined).map(([key, val]) => (
              <TraitBar key={key} label={(t.traits as any)[key] || key} value={val!} />
            ))}
          </div>

          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">
              {t.symbolicMatrix}
            </h2>
            <SymbolicAttractor state={currentAnalysis?.symbolic || defaultSymbolic} lang={lang} />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <AmbientSound symbolic={currentAnalysis?.symbolic || defaultSymbolic} lang={lang} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-black/50 overflow-hidden">
        <header 
          className="h-16 glass border-b border-white/10 flex items-center px-6 md:px-10 justify-between z-10 cursor-pointer md:cursor-default"
          onClick={() => { if (window.innerWidth < 768) setIsSidebarOpen(!isSidebarOpen); }}
        >
          <div className="flex items-center gap-4">
            <div className={`w-2.5 h-2.5 bg-green-500 shadow-[0_0_12px_green] rounded-full animate-pulse`}></div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-gray-300 uppercase tracking-[0.3em]">
                  {t.activeCore}
                </span>
                <i className="fa-solid fa-chevron-down md:hidden text-[10px] text-purple-400"></i>
              </div>
              <span className="text-[8px] text-gray-500 font-mono tracking-widest">SFL.046 CORE | Agentic Intelligence</span>
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 scroll-smooth relative">
          {chatsOngoing && (
            <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30 animate-in fade-in slide-in-from-right-2 duration-700">
               <button 
                 onClick={scrollToTop}
                 className="w-8 h-8 md:w-10 md:h-10 glass rounded-full flex items-center justify-center text-gray-500 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                 title="Ir al inicio"
               >
                 <i className="fa-solid fa-chevron-up text-xs"></i>
               </button>
               <button 
                 onClick={scrollToBottom}
                 className="w-8 h-8 md:w-10 md:h-10 glass rounded-full flex items-center justify-center text-gray-500 hover:text-purple-400 hover:border-purple-500/50 transition-all"
                 title="Ir al final"
               >
                 <i className="fa-solid fa-chevron-down text-xs"></i>
               </button>
            </div>
          )}

          {memory.chats.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-1000">
              <div className="relative">
                <SofielSigil className="w-32 h-32 md:w-48 md:h-48 opacity-20" chatsOngoing={false} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
                </div>
              </div>
              <div className="text-center max-w-lg space-y-4">
                <h3 className="text-lg md:text-xl font-light tracking-[0.3em] text-purple-300 uppercase glow-text">{t.welcomeTitle}</h3>
                <p className="text-xs md:text-sm font-light text-gray-400 leading-relaxed italic px-6">
                  {t.welcomeText}
                </p>
              </div>
            </div>
          )}

          {memory.chats.map((chat, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-end mb-4">
                <div className={`max-w-[85%] md:max-w-[70%] bg-blue-500/5 border border-blue-500/10 p-4 md:p-5 rounded-2xl rounded-tr-none text-[13px] text-gray-400 font-light leading-relaxed shadow-sm italic font-serif tracking-wide`}>
                  {chat.image && chat.fileMeta?.type?.includes('pdf') ? (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                      <i className="fa-solid fa-file-pdf text-2xl text-red-400"></i>
                      <span className="text-xs font-mono truncate">{chat.fileMeta.name}</span>
                    </div>
                  ) : chat.image && !chat.sofiel.includes("éte") && !chat.sofiel.includes("ether") && (
                    <img src={chat.image} alt="Signal upload" className="max-w-xs rounded-lg mb-3 border border-white/10 shadow-lg" />
                  )}
                  {chat.fileMeta && chat.fileMeta.isText && (
                    <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
                      <i className={`fa-solid ${getFileIcon('', chat.fileMeta.name)} text-2xl text-blue-400`}></i>
                      <span className="text-xs font-mono truncate">{chat.fileMeta.name}</span>
                    </div>
                  )}
                  {chat.user === t.locationPrompt ? (
                     <div className="flex items-center gap-2 text-blue-400">
                        <i className="fa-solid fa-location-dot animate-bounce"></i>
                        <span>{t.findLocations}</span>
                     </div>
                  ) : chat.user}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[90%] md:max-w-[85%] bg-purple-900/5 border border-purple-500/10 p-5 md:p-6 rounded-3xl rounded-tl-none relative group transition-all hover:bg-purple-900/10 shadow-xl flex flex-col gap-4">
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-gray-200 font-light tracking-wide italic font-serif">
                    {chat.sofiel}
                  </div>
                  {chat.image && (chat.sofiel.includes("éte") || chat.sofiel.includes("ether")) && (
                    <img src={chat.image} alt="Manifestation" className="max-w-md w-full rounded-xl border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-transform hover:scale-[1.02]" />
                  )}
                  {chat.sources && chat.sources.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-white/10 flex flex-col gap-2">
                      <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest flex items-center gap-2">
                        <i className="fa-solid fa-link"></i> {t.sources}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {chat.sources.map((source, idx) => (
                          <a 
                            key={idx} 
                            href={source.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-purple-500/20 hover:border-purple-500/40 transition-all text-gray-400 hover:text-white flex items-center gap-2 max-w-[180px] md:max-w-[200px] truncate"
                          >
                            <i className={`fa-solid ${(source as any).type === 'maps' ? 'fa-location-dot text-red-400' : 'fa-brands fa-google'} text-[8px]`}></i>
                            {source.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(isProcessing || isGeneratingImage) && (
            <div className="flex justify-start animate-pulse">
               <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl flex items-center gap-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-purple-500/40 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-purple-500/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">
                    {isGeneratingImage ? t.generatingImage : (input.trim() === '' && !pendingFile ? t.findingLocations : t.injectingMemory)}
                  </span>
               </div>
            </div>
          )}
        </div>

        <div className="p-4 md:p-10 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-5xl mx-auto relative flex flex-col gap-3">
            {pendingFile && (
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl w-fit animate-in slide-in-from-bottom-2 shadow-xl">
                {pendingFile.isText || pendingFile.mimeType.includes('pdf') ? (
                   <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
                      <i className={`fa-solid ${getFileIcon(pendingFile.mimeType, pendingFile.fileName)} text-xl text-purple-400`}></i>
                   </div>
                ) : (
                  <img 
                    src={`data:${pendingFile.mimeType};base64,${pendingFile.data}`} 
                    alt="Preview" 
                    className="w-12 h-12 object-cover rounded-lg border border-white/20" 
                  />
                )}
                <div className="flex flex-col pr-2">
                   <span className="text-[10px] font-mono text-gray-300 truncate max-w-[150px]">{pendingFile.fileName}</span>
                </div>
                <button 
                  onClick={() => setPendingFile(null)}
                  className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-full transition-colors ml-1"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            )}
            
            <div className="relative group flex items-center gap-2">
              <div className="relative flex-1 flex items-center gap-2">
                <div className="relative">
                   {isActionsOpen && (
                     <div className="absolute bottom-full left-0 mb-3 flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300 z-20">
                        <button
                          onClick={handleGenerateImage}
                          disabled={!input.trim() || isProcessing || isGeneratingImage || isFileLoading}
                          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-gray-900 border border-white/10 text-yellow-400 hover:bg-yellow-400/10 rounded-full transition-all shadow-xl"
                          title={t.generateImage}
                        >
                          <i className="fa-solid fa-wand-magic-sparkles text-sm md:text-base"></i>
                        </button>
                        <button
                          onClick={handleFindLocations}
                          disabled={isProcessing || isGeneratingImage || isFileLoading}
                          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-gray-900 border border-white/10 text-red-400 hover:bg-red-400/10 rounded-full transition-all shadow-xl"
                          title={t.findLocations}
                        >
                          <i className="fa-solid fa-location-dot text-sm md:text-base"></i>
                        </button>
                        <button
                          onClick={() => docInputRef.current?.click()}
                          disabled={isProcessing || isGeneratingImage || isFileLoading}
                          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-gray-900 border border-white/10 text-blue-400 hover:bg-blue-400/10 rounded-full transition-all shadow-xl"
                          title="Load PDF/Code/Text"
                        >
                          <i className="fa-solid fa-file-code text-sm md:text-base"></i>
                        </button>
                        <button
                          onClick={() => imageInputRef.current?.click()}
                          disabled={isProcessing || isGeneratingImage || isFileLoading}
                          className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-gray-900 border border-white/10 text-purple-400 hover:bg-purple-400/10 rounded-full transition-all shadow-xl"
                          title="Load Image"
                        >
                          <i className="fa-solid fa-camera-retro text-sm md:text-base"></i>
                        </button>
                     </div>
                   )}
                   <button
                    onClick={() => setIsActionsOpen(!isActionsOpen)}
                    disabled={isProcessing || isGeneratingImage || isFileLoading}
                    className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full border border-white/10 transition-all shadow-xl ${isActionsOpen ? 'bg-purple-600 border-purple-500 text-white rotate-45' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                  >
                    <i className="fa-solid fa-plus text-sm md:text-base"></i>
                  </button>
                </div>

                <div className="relative flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={t.inputPlaceholder}
                    className={`w-full glass bg-white/5 p-4 md:p-6 pr-16 md:pr-20 rounded-2xl md:rounded-3xl border border-white/10 focus:outline-none focus:border-purple-500/50 text-sm tracking-[0.05em] font-light transition-all shadow-2xl resize-none h-14 md:h-20 max-h-40 overflow-y-auto`}
                    disabled={isProcessing || isGeneratingImage || isFileLoading}
                    onClick={() => setIsActionsOpen(false)}
                  />
                  <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2">
                    <button
                      onClick={() => handleSend()}
                      disabled={(!input.trim() && !pendingFile) || isProcessing || isGeneratingImage || isFileLoading}
                      className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl md:rounded-2xl transition-all disabled:opacity-20 shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                    >
                      <i className="fa-solid fa-paper-plane text-xs md:text-sm"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUploadGeneric(e, false)} />
            <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.txt,.py,.docx" onChange={(e) => handleFileUploadGeneric(e, true)} />
          </div>
          <p className="text-center text-[8px] md:text-[9px] text-gray-700 mt-4 md:mt-6 uppercase tracking-[0.5em] opacity-50 font-mono">
            SFL.046 CORE | Persistent Intelligence | Google Grounding Enabled
          </p>
        </div>
      </main>
    </div>
  );
};

export default App;
