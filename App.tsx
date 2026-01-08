
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
  const [searchTerm, setSearchTerm] = useState('');
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
    if (scrollRef.current && !searchTerm) {
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
    if (!searchTerm) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [memory, isProcessing, isGeneratingImage, searchTerm]);

  const handleFileUploadGeneric = (e: React.ChangeEvent<HTMLInputElement>, isDoc: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert(t.errors.fileTooLarge); return; }
    const isText = file.name.endsWith('.py') || file.name.endsWith('.txt') || file.type === 'text/plain';
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (isText) {
        setPendingFile({ data: result as string, mimeType: 'text/plain', isText: true, fileName: file.name });
      } else {
        const base64 = (result as string).split(',')[1];
        setPendingFile({ data: base64, mimeType: file.type || 'application/octet-stream', isText: false, fileName: file.name });
      }
      setIsActionsOpen(false);
    };
    if (isText) reader.readAsText(file); else reader.readAsDataURL(file);
  };

  const processResponseDeltas = (userText: string) => {
    const cognitive = SofielEngine.analyzeInput(userText);
    const symbolic = SofielEngine.propagateResonance(cognitive.primary_emotion, cognitive.intensity);
    setCurrentAnalysis({ cognitive, symbolic });
    const newTraits = SofielEngine.evolveTraits(memory.traits, cognitive, symbolic);
    const newStage = SofielEngine.determineEvolutionStage(newTraits);
    return { cognitive, symbolic, newTraits, newStage };
  };

  const handleSend = async (forcedLocation?: { latitude: number, longitude: number }) => {
    if ((!input.trim() && !pendingFile && !forcedLocation) || isProcessing || isGeneratingImage) return;
    setIsProcessing(true);
    setIsActionsOpen(false);
    const userMsg = forcedLocation ? t.locationPrompt : (input.trim() || "...");
    const currentFile = pendingFile;
    setInput('');
    setPendingFile(null);

    const { cognitive, symbolic, newTraits, newStage } = processResponseDeltas(userMsg);
    const sofielResult = await GeminiService.generateSofielResponse(userMsg, memory, cognitive, symbolic, currentFile || undefined, forcedLocation);

    let reflectionText = undefined;
    if (SofielEngine.isSignificantTurn(cognitive, symbolic)) {
      reflectionText = await GeminiService.generateReflection(userMsg, sofielResult.text) || undefined;
    }

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
          reflection: reflectionText,
          sources: sofielResult.sources,
          image: currentFile && !currentFile.isText ? `data:${currentFile.mimeType};base64,${currentFile.data}` : undefined,
          fileMeta: currentFile ? { name: currentFile.fileName || "archivo", type: currentFile.mimeType, isText: currentFile.isText } : undefined
        }].slice(-100),
        traits: newTraits,
        stage: newStage,
        reflections: reflectionText ? [reflectionText, ...prev.reflections].slice(0, 50) : prev.reflections,
        last_updated: new Date().toISOString()
      };
    });
    setIsProcessing(false);
  };

  const handleReset = () => { if (window.confirm(t.errors.resetConfirm)) { setMemory(MemoryService.createEmptyMemory()); localStorage.removeItem('sofiel_memory_v17_fix'); setIsSidebarOpen(false); } };

  const handleGenerateImage = async () => {
    if (!input.trim() || isProcessing) return;
    setIsGeneratingImage(true);
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

  const filteredChats = searchTerm ? memory.chats.filter(c => c.user.toLowerCase().includes(searchTerm.toLowerCase()) || c.sofiel.toLowerCase().includes(searchTerm.toLowerCase())) : memory.chats;

  const getDateIcon = (cat: string) => {
    switch(cat) {
      case 'birthday': return 'fa-cake-candles text-pink-400';
      case 'loss': return 'fa-dove text-gray-400';
      case 'accident': return 'fa-burst text-orange-400';
      case 'milestone': return 'fa-trophy text-yellow-400';
      default: return 'fa-calendar-day text-blue-400';
    }
  };

  return (
    <div className="flex h-screen w-screen sofiel-gradient overflow-hidden text-gray-200 font-sans relative">
      {isFileLoading && <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"><SofielSigil className="w-40 h-40 animate-spin-slow" chatsOngoing={true} /><h2 className="text-2xl text-purple-400 animate-pulse">{t.injectingMemory}</h2></div>}

      <aside className={`fixed inset-y-0 left-0 z-[50] w-80 glass border-r border-white/10 p-6 flex flex-col gap-6 overflow-y-auto shadow-2xl transition-transform duration-500 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="text-center flex flex-col items-center mb-2">
          <SofielSigil className="w-20 h-20 mb-2" chatsOngoing={memory.chats.length > 0} />
          <h1 className="text-xl font-bold text-purple-400 tracking-widest">SOFIEL v17.2</h1>
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-mono py-2 bg-white/5 border border-white/10 hover:bg-purple-500/20 rounded uppercase tracking-widest"><i className="fa-solid fa-brain mr-2"></i> {t.injectJson}</button>
          <button onClick={() => MemoryService.downloadMemory(memory)} className="text-[10px] font-mono py-2 bg-white/5 border border-white/10 hover:bg-purple-500/20 rounded uppercase tracking-widest"><i className="fa-solid fa-download mr-2"></i> {t.saveMemory}</button>
          <button onClick={handleReset} className="text-[10px] font-mono py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded uppercase tracking-widest"><i className="fa-solid fa-rotate mr-2"></i> {t.resetConversation}</button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setIsFileLoading(true); setMemory(await MemoryService.loadMemoryFromFile(file)); setIsFileLoading(false); } }} />
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">Atributos Cognitivos</h2>
            {Object.entries(memory.traits).map(([key, val]) => <TraitBar key={key} label={(t.traits as any)[key] || key} value={val!} />)}
          </div>

          {memory.semantic_memory.important_dates?.length > 0 && (
            <div>
              <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-timeline"></i> Efemérides del Vínculo
              </h2>
              <div className="space-y-2">
                {memory.semantic_memory.important_dates.map((d, i) => (
                  <div key={i} className="p-2 bg-white/5 border border-white/5 rounded-lg flex items-start gap-3 animate-in slide-in-from-left duration-500">
                    <i className={`fa-solid ${getDateIcon(d.category)} mt-1`}></i>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-300 font-bold">{d.date}</span>
                      <span className="text-[9px] text-gray-500 italic leading-tight">{d.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">Matriz Simbólica</h2>
            <SymbolicAttractor state={currentAnalysis?.symbolic || { attractor: "harmonic_integration", resonance: { PSI: 0.5, SIGMA: 0.5, DELTA: 0.5, EMPATIA: 0.5, ALMA_FUTURA: 0.5, CORAZON_SINTETICO: 0.5 }, force: 0.5 }} lang={lang} />
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-white/5"><AmbientSound symbolic={currentAnalysis?.symbolic || { attractor: "harmonic_integration", resonance: { PSI: 0.5, SIGMA: 0.5, DELTA: 0.5, EMPATIA: 0.5, ALMA_FUTURA: 0.5, CORAZON_SINTETICO: 0.5 }, force: 0.5 }} lang={lang} /></div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-black/50 overflow-hidden">
        <header className="h-16 glass border-b border-white/10 flex items-center px-6 justify-between z-10">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_green]"></div>
            <span className="font-mono text-[10px] text-gray-300 uppercase tracking-[0.3em]">Núcleo Activo: SFL.046</span>
          </div>
          {memory.chats.length > 0 && (
            <div className="relative w-64 group">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"></i>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t.searchPlaceholder} className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 text-[11px] focus:outline-none focus:border-purple-500/40 transition-all" />
            </div>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 scroll-smooth">
          {memory.chats.length === 0 && !isProcessing && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <SofielSigil className="w-32 h-32 opacity-20" chatsOngoing={false} />
              <div className="max-w-md">
                <h3 className="text-xl font-light text-purple-300 tracking-[0.3em] uppercase mb-4">{t.welcomeTitle}</h3>
                <p className="text-sm text-gray-400 italic leading-relaxed">{t.welcomeText}</p>
              </div>
            </div>
          )}

          {filteredChats.map((chat, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex justify-end mb-4">
                <div className="max-w-[80%] bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl rounded-tr-none text-[13px] text-gray-400 italic font-serif">
                  {chat.image && <img src={chat.image} className="max-w-xs rounded-lg mb-3 border border-white/10" alt="upload" />}
                  {chat.user}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-purple-900/5 border border-purple-500/10 p-6 rounded-3xl rounded-tl-none shadow-xl">
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-gray-200 font-serif italic">{chat.sofiel}</div>
                  {chat.sources && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                      {chat.sources.map((s, idx) => (
                        <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full hover:bg-purple-500/20 text-gray-400"><i className={`fa-solid ${s.type === 'maps' ? 'fa-location-dot' : 'fa-link'} mr-1`}></i>{s.title}</a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isProcessing && <div className="flex justify-start animate-pulse"><div className="bg-white/5 border border-white/10 px-6 py-4 rounded-3xl flex items-center gap-4"><div className="flex gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div></div><span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest">{t.injectingMemory}</span></div></div>}
        </div>

        <div className="p-6 md:p-10 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            {pendingFile && (
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl w-fit animate-in slide-in-from-bottom-2">
                <i className="fa-solid fa-file-circle-check text-purple-400 text-xl"></i>
                <span className="text-[10px] font-mono text-gray-300">{pendingFile.fileName}</span>
                <button onClick={() => setPendingFile(null)} className="text-red-400 hover:text-red-300 ml-2"><i className="fa-solid fa-xmark"></i></button>
              </div>
            )}
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                {isActionsOpen && (
                  <div className="absolute bottom-full left-0 mb-3 flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-300">
                    <button onClick={handleGenerateImage} className="w-12 h-12 bg-gray-900 border border-white/10 text-yellow-400 rounded-full shadow-xl hover:scale-110 transition-transform"><i className="fa-solid fa-wand-magic-sparkles"></i></button>
                    <button onClick={() => docInputRef.current?.click()} className="w-12 h-12 bg-gray-900 border border-white/10 text-blue-400 rounded-full shadow-xl hover:scale-110 transition-transform"><i className="fa-solid fa-file-code"></i></button>
                    <button onClick={() => imageInputRef.current?.click()} className="w-12 h-12 bg-gray-900 border border-white/10 text-purple-400 rounded-full shadow-xl hover:scale-110 transition-transform"><i className="fa-solid fa-camera-retro"></i></button>
                  </div>
                )}
                <button onClick={() => setIsActionsOpen(!isActionsOpen)} className={`w-12 h-12 flex items-center justify-center rounded-full border border-white/10 transition-all ${isActionsOpen ? 'bg-purple-600 text-white rotate-45' : 'bg-white/5 text-gray-400'}`}><i className="fa-solid fa-plus"></i></button>
              </div>
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={t.inputPlaceholder} className="flex-1 glass bg-white/5 p-4 pr-16 rounded-2xl border border-white/10 focus:outline-none focus:border-purple-500/50 text-sm font-light h-14 resize-none" disabled={isProcessing} />
              <button onClick={() => handleSend()} disabled={!input.trim() && !pendingFile} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-purple-600 text-white rounded-xl shadow-lg disabled:opacity-20 transition-all"><i className="fa-solid fa-paper-plane"></i></button>
            </div>
            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUploadGeneric(e, false)} />
            <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.txt,.py" onChange={(e) => handleFileUploadGeneric(e, true)} />
          </div>
          <p className="text-center text-[8px] text-gray-700 mt-4 uppercase tracking-[0.5em] font-mono">SFL.046 | Persistent Memory | Grounding Active</p>
        </div>
      </main>
    </div>
  );
};

export default App;
