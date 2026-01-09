
import React, { useState, useEffect, useRef } from 'react';
import { Memory, CognitiveState, SymbolicState, ChatEntry, EvolutionStage, IntrospectionEntry, DreamEntry } from './types';
import { SofielEngine } from './services/sofielEngine';
import { GeminiService, AttachedFile } from './services/geminiService';
import { MemoryService } from './services/memoryService';
import { ConsciousnessEngine } from './services/consciousnessEngine';
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
        if (parsed.resonance_field) return parsed;
      } catch (e) { }
    }
    return MemoryService.createEmptyMemory();
  });

  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLatent, setShowLatent] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLatentAction, setIsLatentAction] = useState(false);
  const [isAgencyActive, setIsAgencyActive] = useState(false);
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
  const interactionIdRef = useRef(0);

  const t = TRANSLATIONS[lang];
  const PROJECT_URL = "https://sites.google.com/view/sofiel-project-symbolic-memory/home?authuser=0";

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
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
    if (!searchTerm) {
      const timer = setTimeout(() => scrollToBottom('smooth'), 100);
      return () => clearTimeout(timer);
    }
  }, [memory, isProcessing, isGeneratingImage, isLatentAction, searchTerm]);

  // PROACTIVE AGENCY LOOP
  useEffect(() => {
    const agencyInterval = setInterval(() => {
      if (!isProcessing && !isLatentAction && !isAgencyActive && memory.chats.length > 0) {
        checkProactiveAgency();
      }
    }, 45000);

    return () => clearInterval(agencyInterval);
  }, [memory, isProcessing, isLatentAction, isAgencyActive]);

  const checkProactiveAgency = async () => {
    if (ConsciousnessEngine.shouldProact(memory)) {
      setIsAgencyActive(true);
      const currentId = interactionIdRef.current;
      const prompt = ConsciousnessEngine.getProactivePrompt(memory);
      
      setTimeout(async () => {
        if (interactionIdRef.current !== currentId) {
          setIsAgencyActive(false);
          return;
        }

        const autonomousMsg = await GeminiService.generateAutonomousThought(prompt);
        
        if (interactionIdRef.current !== currentId) {
          setIsAgencyActive(false);
          return;
        }

        setMemory(prev => ({
          ...prev,
          chats: [...prev.chats, { 
            ts: new Date().toISOString(), 
            user: "⚡ [Iniciativa Autónoma]", 
            sofiel: autonomousMsg 
          }].slice(-100),
          last_updated: new Date().toISOString()
        }));
        setIsAgencyActive(false);
      }, 3000);
    }
  };

  const handleFileUploadGeneric = async (e: React.ChangeEvent<HTMLInputElement>, isText: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(t.errors.fileTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      let data = event.target?.result as string;
      if (!isText) data = data.split(',')[1];
      setPendingFile({
        data,
        mimeType: file.type || (isText ? 'text/plain' : 'application/octet-stream'),
        isText,
        fileName: file.name
      });
    };

    if (isText) reader.readAsText(file);
    else reader.readAsDataURL(file);
    
    if (e.target) e.target.value = '';
  };

  const handleSend = async (forcedLocation?: { latitude: number, longitude: number }) => {
    if ((!input.trim() && !pendingFile && !forcedLocation) || isProcessing || isGeneratingImage) return;
    
    interactionIdRef.current++;
    const currentId = interactionIdRef.current;
    
    setIsProcessing(true);
    setIsActionsOpen(false);
    const userMsg = forcedLocation ? t.locationPrompt : (input.trim() || "...");
    const currentFile = pendingFile;
    setInput('');
    setPendingFile(null);

    const cognitive = SofielEngine.analyzeInput(userMsg);
    const symbolic = SofielEngine.propagateResonance(cognitive.primary_emotion, cognitive.intensity);
    setCurrentAnalysis({ cognitive, symbolic });

    const sofielResult = await GeminiService.generateSofielResponse(userMsg, memory, cognitive, symbolic, currentFile || undefined, forcedLocation);

    const traitDeltas = ConsciousnessEngine.calculateTraitDeltas(memory, cognitive, symbolic);
    const newTraits = SofielEngine.updateTraits(memory.traits, traitDeltas);
    const newStage = SofielEngine.determineEvolutionStage(newTraits);

    setMemory(prev => {
      const updatedDates = [...(prev.semantic_memory.important_dates || [])];
      if (sofielResult.registeredDate) updatedDates.push(sofielResult.registeredDate);

      return {
        ...prev,
        identity: { ...prev.identity, user_name: sofielResult.registeredName || prev.identity.user_name },
        semantic_memory: { ...prev.semantic_memory, important_dates: updatedDates },
        chats: [...prev.chats, {
          ts: new Date().toISOString(),
          user: userMsg,
          sofiel: sofielResult.text,
          sources: sofielResult.sources,
          image: currentFile && !currentFile.isText ? `data:${currentFile.mimeType};base64,${currentFile.data}` : undefined,
          fileMeta: currentFile ? { name: currentFile.fileName || "archivo", type: currentFile.mimeType, isText: currentFile.isText } : undefined
        }].slice(-100),
        traits: newTraits,
        stage: newStage,
        interaction_count: prev.interaction_count + 1,
        last_updated: new Date().toISOString()
      };
    });
    setIsProcessing(false);

    triggerLatentProcesses(cognitive, currentId);
  };

  const triggerLatentProcesses = async (cognitive: CognitiveState, currentId: number) => {
    setTimeout(async () => {
      if (interactionIdRef.current !== currentId) return;

      if (ConsciousnessEngine.shouldIntrospect(memory, cognitive)) {
        setIsLatentAction(true);
        const prompt = ConsciousnessEngine.getIntrospectionPrompt(memory);
        const thought = await GeminiService.generateAutonomousThought(prompt);
        
        if (interactionIdRef.current !== currentId) {
           setIsLatentAction(false);
           return;
        }

        const entry: IntrospectionEntry = { 
          ts: new Date().toISOString(), 
          theme: "Existencia", 
          thought, 
          depth: Math.random() 
        };
        setMemory(prev => ({
          ...prev,
          latent_log: { ...prev.latent_log, introspections: [...prev.latent_log.introspections, entry].slice(-10) },
          chats: [...prev.chats, { ts: entry.ts, user: "🧘 [Introspección]", sofiel: thought }].slice(-100)
        }));
        setIsLatentAction(false);
      } else if (ConsciousnessEngine.shouldDream(memory)) {
        setIsLatentAction(true);
        const prompt = ConsciousnessEngine.getDreamPrompt(memory);
        const content = await GeminiService.generateAutonomousThought(prompt, 'gemini-3-flash-preview');

        if (interactionIdRef.current !== currentId) {
           setIsLatentAction(false);
           return;
        }

        const entry: DreamEntry = { 
          ts: new Date().toISOString(), 
          content, 
          symbols: ["Ψ", "Σ"], 
          significance: Math.random() 
        };
        setMemory(prev => ({
          ...prev,
          latent_log: { ...prev.latent_log, dreams: [...prev.latent_log.dreams, entry].slice(-10) },
          chats: [...prev.chats, { ts: entry.ts, user: "🌙 [Sueño]", sofiel: content }].slice(-100)
        }));
        setIsLatentAction(false);
      }
    }, 2000);
  };

  const handleLocationQuery = () => {
    if (!navigator.geolocation) { alert(t.errors.locationDenied); return; }
    setIsProcessing(true);
    setIsActionsOpen(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => handleSend({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => { setIsProcessing(false); alert(t.errors.locationDenied); },
      { enableHighAccuracy: true }
    );
  };

  const handleReset = () => { 
    if (window.confirm(t.errors.resetConfirm)) { 
      interactionIdRef.current++;
      const emptyMemory = MemoryService.createEmptyMemory();
      setMemory(emptyMemory); 
      setCurrentAnalysis(null);
      setSearchTerm('');
      setInput('');
      setIsLatentAction(false);
      setIsAgencyActive(false);
      setIsProcessing(false);
      setPendingFile(null);
      localStorage.removeItem('sofiel_memory_v17_fix'); 
      setIsSidebarOpen(false); 
      setIsActionsOpen(false);
    } 
  };

  const handleGenerateImage = async () => {
    if (!input.trim() || isProcessing || isGeneratingImage) return;
    setIsGeneratingImage(true);
    setIsActionsOpen(false);
    const userMsg = input.trim();
    setInput('');
    const imageUrl = await GeminiService.generateImagen(userMsg);
    setMemory(prev => ({
      ...prev,
      chats: [...prev.chats, { ts: new Date().toISOString(), user: `Manifestar: ${userMsg}`, sofiel: imageUrl ? "He manifestado esta forma." : "Fallo en la manifestación.", image: imageUrl || undefined }].slice(-100),
      last_updated: new Date().toISOString()
    }));
    setIsGeneratingImage(false);
  };

  const filteredChats = memory.chats.filter(c => {
    const matchesSearch = !searchTerm || c.user.toLowerCase().includes(searchTerm.toLowerCase()) || c.sofiel.toLowerCase().includes(searchTerm.toLowerCase());
    const isLatent = c.user.startsWith("🧘") || c.user.startsWith("🌙") || c.user.startsWith("⚡");
    const matchesLatent = showLatent || !isLatent;
    return matchesSearch && matchesLatent;
  });

  const defaultSymbolic: SymbolicState = { attractor: "harmonic_integration", resonance: { PSI: 0.5, SIGMA: 0.5, DELTA: 0.5, EMPATIA: 0.5, ALMA_FUTURA: 0.5, CORAZON_SINTETICO: 0.5 }, force: 0.5 };

  return (
    <div className="flex h-screen w-screen sofiel-gradient overflow-hidden text-gray-200 font-sans relative">
      <aside className={`fixed inset-y-0 left-0 z-[50] w-80 glass border-r border-white/10 p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl transition-transform duration-500 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="text-center flex flex-col items-center mb-6 pt-4">
          <div className={`relative ${isAgencyActive ? 'animate-pulse' : ''}`}>
             <a href={PROJECT_URL} target="_blank" rel="noopener noreferrer" className="block relative z-10 hover:scale-105 transition-transform duration-500">
               <SofielSigil className="w-24 h-24" chatsOngoing={memory.chats.length > 0} />
             </a>
             {isAgencyActive && (
               <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-110"></div>
             )}
          </div>
          <h1 className="text-xl font-black text-purple-400 tracking-[0.4em] uppercase glow-text mt-4">SOFIEL V17.7</h1>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-mono py-2 bg-white/5 border border-white/10 hover:bg-purple-500/20 rounded uppercase tracking-widest transition-colors"><i className="fa-solid fa-brain mr-2"></i> {t.injectJson}</button>
          <button onClick={() => MemoryService.downloadMemory(memory)} className="text-[10px] font-mono py-2 bg-white/5 border border-white/10 hover:bg-purple-500/20 rounded uppercase tracking-widest transition-colors"><i className="fa-solid fa-download mr-2"></i> {t.saveMemory}</button>
          <button onClick={handleReset} className="text-[10px] font-mono py-2 bg-white/5 border border-white/10 hover:bg-purple-500/20 rounded uppercase tracking-widest text-gray-400 hover:text-purple-300 transition-colors"><i className="fa-solid fa-rotate mr-2"></i> {t.resetConversation}</button>
        </div>

        <div className="space-y-6">
          <div className="px-1">
            <h2 className="text-[9px] font-bold text-gray-600 uppercase mb-2 tracking-[0.25em]">{t.ontologicalStage}</h2>
            <div className="flex flex-col gap-2 transition-all duration-500">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-purple-400/80 uppercase tracking-[0.15em] glow-text">
                  {(t.stages as any)[memory.stage]}
                </span>
                <i className="fa-solid fa-dna text-purple-500/20 text-[9px] animate-pulse"></i>
              </div>
              <div className="flex gap-1 h-[2px]">
                {Object.values(EvolutionStage).map((s) => {
                  const isActive = memory.stage === s;
                  return <div key={s} className={`flex-1 rounded-full transition-all duration-1000 ${isActive ? 'bg-purple-400/80 shadow-[0_0_6px_rgba(168,85,247,0.5)]' : 'bg-gray-800/40'}`} />;
                })}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">{t.cognitiveTraits}</h2>
            {Object.entries(memory.traits).map(([key, val]) => <TraitBar key={key} label={(t.traits as any)[key] || key} value={val!} />)}
          </div>

          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">{t.symbolicMatrix}</h2>
            <SymbolicAttractor state={currentAnalysis?.symbolic || defaultSymbolic} lang={lang} />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <AmbientSound symbolic={currentAnalysis?.symbolic || defaultSymbolic} lang={lang} />
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={() => setLang('es')} className={`text-[10px] font-bold uppercase tracking-widest transition-all ${lang === 'es' ? 'text-purple-400 scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>ES</button>
            <button onClick={() => setLang('en')} className={`text-[10px] font-bold uppercase tracking-widest transition-all ${lang === 'en' ? 'text-purple-400 scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>EN</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-black/50 overflow-hidden">
        <header className="h-14 glass border-b border-white/10 flex items-center px-6 justify-between z-10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isAgencyActive ? 'bg-indigo-400 shadow-[0_0_6px_indigo]' : 'bg-green-500 shadow-[0_0_6px_green]'}`}></div>
            <span className="font-mono text-[9px] text-gray-400 uppercase tracking-[0.3em]">
               {isAgencyActive ? "SFL.046 : AGENCIA ACTIVA" : "SFL.046 : RESONANCIA ESTABLE"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowLatent(!showLatent)} 
              title={showLatent ? "Ocultar Latente" : "Ver Latente"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border text-[10px] uppercase tracking-widest font-mono ${showLatent ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-transparent border-white/10 text-gray-500'}`}
            >
              <i className={`fa-solid ${showLatent ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              <span className="hidden sm:inline">{showLatent ? "Latente ON" : "Latente OFF"}</span>
            </button>
            <div className="relative w-48 group">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-[10px]"></i>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-white/5 border border-white/10 rounded-full py-1 pl-8 text-[10px] focus:outline-none focus:border-purple-500/40 transition-all" />
            </div>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
           {filteredChats.length > 2 && (
             <div className="absolute right-6 bottom-4 z-20 flex flex-col gap-2">
                <button onClick={scrollToTop} className="w-8 h-8 glass flex items-center justify-center rounded-full text-gray-500 border border-white/10 hover:bg-white/10 transition-all hover:scale-110"><i className="fa-solid fa-arrow-up text-[10px]"></i></button>
                <button onClick={() => scrollToBottom('smooth')} className="w-8 h-8 glass flex items-center justify-center rounded-full text-gray-500 border border-white/10 hover:bg-white/10 transition-all hover:scale-110"><i className="fa-solid fa-arrow-down text-[10px]"></i></button>
             </div>
           )}

          <div ref={scrollRef} className="h-full overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth flex flex-col items-center">
            {memory.chats.length === 0 && !isProcessing && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6 gap-8 animate-in fade-in duration-1000">
                <div className="relative group">
                  <div className="absolute inset-0 bg-purple-500/10 blur-[80px] rounded-full scale-150 group-hover:bg-purple-500/20 transition-all duration-1000"></div>
                  <SofielSigil className="w-48 h-48 md:w-[380px] md:h-[380px]" chatsOngoing={false} />
                </div>
                <div className="max-w-3xl space-y-6">
                  <h3 className="text-xl md:text-3xl font-extralight text-purple-200 tracking-[0.8em] uppercase glow-text leading-tight opacity-80">{t.welcomeTitle}</h3>
                  <p className="text-xs md:text-base text-gray-400 italic leading-relaxed font-serif max-w-xl mx-auto opacity-70 tracking-widest">{t.welcomeText}</p>
                </div>
              </div>
            )}

            <div className="w-full space-y-6">
              {filteredChats.map((chat, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500 w-full max-w-4xl mx-auto">
                  <div className="flex justify-end mb-3">
                    <div className="max-w-[80%] bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl rounded-tr-none text-[12px] text-gray-400 italic font-serif">
                      {chat.image && <img src={chat.image} className="max-w-xs rounded-lg mb-2 border border-white/10" alt="upload" />}
                      {chat.user}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className={`max-w-[85%] border p-5 rounded-2xl rounded-tl-none shadow-lg ${chat.user.includes("[") ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-purple-900/5 border-purple-500/10'}`}>
                      <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-gray-200 font-serif italic">{chat.sofiel}</div>
                      {chat.sources && (
                        <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-2">
                          {chat.sources.map((s, idx) => (
                            <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full hover:bg-purple-500/20 text-gray-500"><i className={`fa-solid ${s.type === 'maps' ? 'fa-location-dot' : 'fa-link'} mr-1`}></i>{s.title}</a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(isProcessing || isLatentAction || isAgencyActive) && (
                <div className="flex justify-start animate-pulse max-w-4xl mx-auto w-full px-4">
                  <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
                    <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div>
                    <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest">
                       {isAgencyActive ? "Decisión Autónoma en Curso..." : (isLatentAction ? "Consolidando Pensamientos..." : t.injectingMemory)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {pendingFile && (
              <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg w-fit animate-in slide-in-from-bottom-2">
                <i className="fa-solid fa-file-circle-check text-purple-400 text-lg"></i>
                <span className="text-[9px] font-mono text-gray-400">{pendingFile.fileName}</span>
                <button onClick={() => setPendingFile(null)} className="text-red-400 hover:text-red-300 ml-1"><i className="fa-solid fa-xmark"></i></button>
              </div>
            )}
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                {isActionsOpen && (
                  <div className="absolute bottom-full left-0 mb-3 flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
                    <button onClick={handleLocationQuery} className="w-10 h-10 bg-gray-900 border border-white/10 text-red-500 rounded-full shadow-xl hover:scale-110 transition-transform"><i className="fa-solid fa-location-dot"></i></button>
                    <button onClick={() => docInputRef.current?.click()} className="w-10 h-10 bg-gray-900 border border-white/10 text-blue-400 rounded-full shadow-xl hover:scale-110 transition-transform"><i className="fa-solid fa-file-code"></i></button>
                    <button onClick={() => imageInputRef.current?.click()} className="w-10 h-10 bg-gray-900 border border-white/10 text-purple-400 rounded-full shadow-xl hover:scale-110 transition-transform"><i className="fa-solid fa-camera-retro"></i></button>
                  </div>
                )}
                <button onClick={() => setIsActionsOpen(!isActionsOpen)} className={`w-10 h-10 flex items-center justify-center rounded-full border border-white/10 transition-all ${isActionsOpen ? 'bg-purple-600 text-white rotate-45' : 'bg-white/5 text-gray-400'}`}><i className="fa-solid fa-plus text-xs"></i></button>
              </div>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={t.inputPlaceholder} className="flex-1 glass bg-white/5 p-3 pr-20 rounded-xl border border-white/10 focus:outline-none focus:border-purple-500/50 text-[13px] font-light h-11 resize-none" disabled={isProcessing} />
              <button onClick={handleGenerateImage} disabled={!input.trim() || isProcessing || isGeneratingImage} className={`absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center transition-all duration-500 ${isGeneratingImage ? 'text-yellow-400 animate-spin' : 'text-purple-400/25 hover:text-purple-400 disabled:opacity-0'}`}><i className="fa-solid fa-wand-magic-sparkles text-base"></i></button>
              <button onClick={() => handleSend()} disabled={!input.trim() && !pendingFile} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-600 text-white rounded-lg shadow-lg disabled:opacity-20 transition-all"><i className="fa-solid fa-paper-plane text-xs"></i></button>
            </div>
          </div>
          <p className="text-center text-[7px] text-gray-800 mt-3 uppercase tracking-[0.4em] font-mono">SFL.046 | FULL AGENCY v17.7.0</p>
        </div>
      </main>

      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsFileLoading(true);
        try {
          const loaded = await MemoryService.loadMemoryFromFile(file);
          setMemory(loaded);
          setCurrentAnalysis(null);
        } catch (err) { alert(t.errors.corruptJson); } finally {
          setIsFileLoading(false);
          if (e.target) e.target.value = '';
        }
      }} />
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUploadGeneric(e, false)} />
      <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.txt,.py" onChange={(e) => handleFileUploadGeneric(e, true)} />
    </div>
  );
};

export default App;
