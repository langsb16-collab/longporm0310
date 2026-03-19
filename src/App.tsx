import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Video, 
  TrendingUp, 
  MessageSquare, 
  Plus, 
  Settings, 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  Globe,
  Send,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateScript, generateThumbnailPrompt, generateImage, generateAudio, getTrendingTopics } from './services/geminiService';
import { translations, Language } from './translations';
import { getFAQItems } from './faqData';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';
import { translateMessage } from './services/geminiService';

type Project = {
  id: number;
  title: string;
  topic: string;
  duration: number;
  show_source: number;
  caption_enabled: number;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  script?: string;
  voice_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  created_at: string;
};

type Message = {
  id?: number;
  user_id: string;
  text: string;
  type: string;
  created_at?: string;
  translatedText?: string;
  image_url?: string;
  voice_url?: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create' | 'trends' | 'comments' | 'chat' | 'faq'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ sentiment: string, suggestions: string[] } | null>(null);
  const [trends, setTrends] = useState<{ topic: string, growth: string, reason: string }[]>([]);
  const [isFetchingTrends, setIsFetchingTrends] = useState(false);
  const [topic, setTopic] = useState('');

  // PeerJS State
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isCalling, setIsCalling] = useState(false);
  const peerRef = useRef<Peer | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected'>('idle');

  // Floating Window States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIFAQOpen, setIsAIFAQOpen] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'viewer'>('owner'); // Simulated role
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleAnalyzeComments = async () => {
    setIsAnalyzing(true);
    try {
      const mockComments = [
        "Could you explain more about the hardware requirements for this?",
        "Amazing content! Please do a video on AI ethics next.",
        "The visuals are stunning. What AI did you use for the images?",
        "I'd love to see a tutorial on how to set this up.",
        "Is this available for mobile devices?"
      ];
      const { analyzeComments } = await import('./services/geminiService');
      const result = await analyzeComments(mockComments);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(5);
  const [showSource, setShowSource] = useState(true);
  const [captionEnabled, setCaptionEnabled] = useState(true);

  const t = translations[language];

  useEffect(() => {
    fetchProjects();
    initSocket();
    fetchMessages();
    initPeer();
    // Don't fetch trends on initial load to avoid API key prompt
    // Trends will be fetched when user clicks on Trends tab

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  // Fetch trends when trends tab is opened
  useEffect(() => {
    if (activeTab === 'trends' && trends.length === 0 && !isFetchingTrends) {
      fetchTrends();
    }
  }, [activeTab]);

  const initPeer = () => {
    const peer = new Peer();
    peer.on('open', (id) => {
      setPeerId(id);
      console.log('My peer ID is: ' + id);
    });

    peer.on('call', (call) => {
      // Auto-answer for demo purposes
      // In a real app, you'd show an incoming call UI
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        call.answer(stream);
        setCallStatus('connected');
        call.on('stream', (remoteStream) => {
          // Handle remote stream
          console.log('Received remote stream');
        });
      });
    });

    peerRef.current = peer;
  };

  const startCall = () => {
    if (!remotePeerId || !peerRef.current) return;
    setCallStatus('calling');
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      const call = peerRef.current!.call(remotePeerId, stream);
      call.on('stream', (remoteStream) => {
        setCallStatus('connected');
        console.log('Connected to remote stream');
      });
    });
  };

  const fetchTrends = async () => {
    setIsFetchingTrends(true);
    try {
      const data = await getTrendingTopics();
      setTrends(data);
    } catch (err) {
      console.error("Failed to fetch trends", err);
    } finally {
      setIsFetchingTrends(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initSocket = () => {
    // Socket.io not available in Cloudflare Pages
    // Use localStorage for demo purposes
    try {
      const storedMessages = localStorage.getItem('tubeforge_messages');
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const fetchMessages = async () => {
    try {
      const storedMessages = localStorage.getItem('tubeforge_messages');
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: Date.now(),
      user_id: userId,
      text: newMessage,
      type: 'text',
      created_at: new Date().toISOString()
    };

    const updatedMessages = [...messages, msg];
    setMessages(updatedMessages);
    localStorage.setItem('tubeforge_messages', JSON.stringify(updatedMessages));
    setNewMessage('');
  };

  const handleTranslate = async (msgId: number, text: string) => {
    try {
      const translated = await translateMessage(text, language);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, translatedText: translated } : m));
    } catch (err) {
      console.error("Translation failed", err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const msg: Message = {
            id: Date.now(),
            user_id: userId,
            text: '[Voice Message]',
            type: 'voice',
            voice_url: base64data,
            created_at: new Date().toISOString()
          };
          const updatedMessages = [...messages, msg];
          setMessages(updatedMessages);
          localStorage.setItem('tubeforge_messages', JSON.stringify(updatedMessages));
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            clearInterval(interval);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Recording failed", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      const msg: Message = {
        id: Date.now(),
        user_id: userId,
        text: '[Image]',
        type: 'image',
        image_url: base64data,
        created_at: new Date().toISOString()
      };
      const updatedMessages = [...messages, msg];
      setMessages(updatedMessages);
      localStorage.setItem('tubeforge_messages', JSON.stringify(updatedMessages));
    };
  };

  const fetchProjects = async () => {
    try {
      // Load projects from localStorage
      const storedProjects = localStorage.getItem('tubeforge_projects');
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const saveProjects = (projectsData: Project[]) => {
    localStorage.setItem('tubeforge_projects', JSON.stringify(projectsData));
    setProjects(projectsData);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      setGenerationStep('Initializing project...');
      
      // Create new project
      const newProject: Project = {
        id: Date.now(),
        title: title || `Video about ${topic}`,
        topic,
        duration,
        show_source: showSource ? 1 : 0,
        caption_enabled: captionEnabled ? 1 : 0,
        status: 'generating',
        created_at: new Date().toISOString()
      };
      
      const updatedProjects = [newProject, ...projects];
      saveProjects(updatedProjects);

      setGenerationStep('Generating AI script...');
      const script = await generateScript(topic, duration, showSource);
      newProject.script = script;
      newProject.status = 'generating';
      saveProjects([...updatedProjects]);

      setGenerationStep('Designing thumbnail...');
      const thumbPrompt = await generateThumbnailPrompt(script);
      const thumbUrl = await generateImage(thumbPrompt);
      if (thumbUrl) {
        newProject.thumbnail_url = thumbUrl;
        saveProjects([...updatedProjects]);
      }

      setGenerationStep('Generating AI voiceover...');
      const voiceUrl = await generateAudio(script.substring(0, 500)); // Demo limit
      if (voiceUrl) {
        newProject.voice_url = voiceUrl;
        saveProjects([...updatedProjects]);
      }

      setGenerationStep('Finalizing video...');
      newProject.status = 'completed';
      saveProjects([...updatedProjects]);
      
      setTopic('');
      setTitle('');
      setActiveTab('dashboard');
      fetchProjects();
    } catch (error) {
      console.error(error);
      setGenerationStep('Generation failed. ' + (error as Error).message);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStep(''), 3000);
    }
  };

  const updateProject = (id: number, data: Partial<Project>) => {
    const updatedProjects = projects.map(p => 
      p.id === id ? { ...p, ...data } : p
    );
    saveProjects(updatedProjects);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1E35] to-[#1A2942] text-white font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-[#0F1935]/80 to-[#0A1628]/90 backdrop-blur-xl border-r border-blue-500/10 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#1428A0] to-[#2563EB] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/50">
            <Video size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">{t.header.title}</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label={t.header.dashboard}
          />
          <NavItem 
            active={activeTab === 'create'} 
            onClick={() => setActiveTab('create')}
            icon={<Plus size={20} />}
            label={t.header.create}
          />
          <NavItem 
            active={activeTab === 'trends'} 
            onClick={() => setActiveTab('trends')}
            icon={<TrendingUp size={20} />}
            label={t.header.trends}
          />
          <NavItem 
            active={activeTab === 'comments'} 
            onClick={() => setActiveTab('comments')}
            icon={<MessageSquare size={20} />}
            label={t.header.comments}
          />
        </nav>

        <div className="p-4 border-t border-black/5">
          <NavItem 
            active={false}
            onClick={() => {}}
            icon={<Settings size={20} />}
            label="Settings"
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="h-20 bg-[#0F1935]/60 backdrop-blur-xl border-b border-blue-500/20 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-lg font-semibold capitalize text-white">
            {activeTab === 'dashboard' && t.header.dashboard}
            {activeTab === 'create' && t.header.create}
            {activeTab === 'trends' && t.header.trends}
            {activeTab === 'comments' && t.header.comments}
            {activeTab === 'chat' && t.chat.title}
            {activeTab === 'faq' && "FAQ"}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium text-gray-300 hover:text-white"
              >
                <Globe size={18} />
                {language.toUpperCase()}
              </button>
              {isLangOpen && (
                <div className="absolute right-0 top-full mt-1 bg-[#1A2942] border border-blue-500/20 rounded-xl shadow-2xl shadow-blue-500/20 z-50 py-2 w-32">
                  {(Object.keys(translations) as Language[]).map((lang) => (
                    <button 
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLangOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#2563EB]/20 hover:text-[#60A5FA] transition-colors ${language === lang ? 'text-[#60A5FA] font-bold' : 'text-gray-400'}`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={() => setActiveTab('create')}
              className="bg-gradient-to-r from-[#FF7A00] to-[#FF8C1A] text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> {t.header.create}
            </button>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-gradient-to-br from-[#1428A0] to-[#2563EB] rounded-3xl p-12 text-white relative overflow-hidden shadow-xl">
                  <div className="relative z-10 max-w-2xl">
                    <h2 className="text-4xl font-bold mb-4">AI가 당신의 유튜브 채널을 자동으로 성장시킵니다</h2>
                    <p className="text-blue-100 text-lg mb-8">대본 · 영상 · 쇼츠 · 업로드까지 한 번에 자동화</p>
                    <div className="flex items-center gap-4">
                      <button className="bg-[#FF7A00] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#FF8C1A] transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2">
                        <Sparkles size={20} /> 영상 만들기
                      </button>
                      <button className="bg-white/15 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-white/25 transition-all border border-white/30 flex items-center gap-2">
                        <Play size={18} /> 데모 보기
                      </button>
                    </div>
                  </div>
                  <div className="absolute right-[-10%] top-[-20%] w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
                  <div className="absolute right-[10%] bottom-[-30%] w-64 h-64 bg-blue-300/15 rounded-full blur-2xl" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard label="Total Videos" value={projects.length.toString()} icon={<Video className="text-[#1428A0]" />} />
                  <StatCard label="Avg. Views (Est.)" value="12.4K" icon={<TrendingUp className="text-[#10B981]" />} />
                  <StatCard label="Active Channels" value="1" icon={<LayoutDashboard className="text-[#8B5CF6]" />} />
                </div>

                <div className="bg-[#0F1935]/40 backdrop-blur-xl rounded-2xl border border-blue-500/20 overflow-hidden shadow-xl shadow-blue-500/5">
                  <div className="p-6 border-b border-blue-500/20 flex items-center justify-between">
                    <h3 className="font-bold text-white">Recent Projects</h3>
                    <button className="text-sm text-[#60A5FA] font-bold hover:text-[#93C5FD] transition-colors">View All</button>
                  </div>
                  <div className="divide-y divide-blue-500/10">
                    {projects.map((project) => (
                      <div key={project.id} className="p-6 flex items-center gap-4 hover:bg-white/5 transition-colors">
                        <div className="w-32 h-20 bg-[#1A2942]/60 rounded-lg overflow-hidden flex-shrink-0 border border-blue-500/20">
                          {project.thumbnail_url ? (
                            <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              <ImageIcon size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-white">{project.title}</h4>
                          <p className="text-sm text-gray-400 line-clamp-1">{project.topic}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} /> {project.duration} min
                            </span>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                              project.status === 'completed' ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' :
                              project.status === 'generating' ? 'bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30' :
                              'bg-gray-700/50 text-gray-400 border border-gray-600/30'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="p-12 text-center text-gray-500">
                        No projects yet. Start by creating your first video!
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'create' && (
              <motion.div 
                key="create"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-[#0F1935]/40 backdrop-blur-xl rounded-3xl p-8 border border-blue-500/20 shadow-xl shadow-blue-500/5">
                  <h3 className="text-2xl font-bold mb-6 text-white">{t.create.title}</h3>
                  <form onSubmit={handleCreateProject} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-300">{t.create.pTitle}</label>
                      <input 
                        type="text" 
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., The Future of AI in Medicine"
                        className="w-full px-4 py-3 rounded-xl bg-[#1A2942]/60 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#60A5FA]/50 focus:border-[#60A5FA] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-300">{t.create.topic}</label>
                      <textarea 
                        required
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="What is this video about? Provide context or keywords..."
                        className="w-full px-4 py-3 rounded-xl bg-[#1A2942]/60 border border-blue-500/20 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#60A5FA]/50 focus:border-[#60A5FA] transition-all h-32"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">{t.create.duration}</label>
                        <select 
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl bg-[#1A2942]/60 border border-blue-500/20 text-white focus:outline-none focus:ring-2 focus:ring-[#60A5FA]/50 focus:border-[#60A5FA] transition-all"
                        >
                          {[1, 2, 3, 5, 10, 15, 20, 30, 60].map(m => (
                            <option key={m} value={m}>{m} Minutes</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col justify-end gap-3 pb-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={showSource}
                            onChange={() => setShowSource(!showSource)}
                            className="w-5 h-5 rounded border-blue-500/30 bg-[#1A2942]/60 text-[#60A5FA] focus:ring-[#60A5FA]"
                          />
                          <span className="text-sm font-medium text-gray-300 group-hover:text-[#60A5FA] transition-colors">{t.create.source}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={captionEnabled}
                            onChange={() => setCaptionEnabled(!captionEnabled)}
                            className="w-5 h-5 rounded border-blue-500/30 bg-[#1A2942]/60 text-[#60A5FA] focus:ring-[#60A5FA]"
                          />
                          <span className="text-sm font-medium text-gray-300 group-hover:text-[#60A5FA] transition-colors">{t.create.caption}</span>
                        </label>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isGenerating}
                      className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                        isGenerating 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-[#FF7A00] to-[#FF8C1A] text-white hover:shadow-xl hover:shadow-orange-500/50'
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#FF7A00] rounded-full animate-spin" />
                          {generationStep}
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} /> {t.create.generate}
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'trends' && (
              <motion.div 
                key="trends"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-[#0F1935]/40 backdrop-blur-xl rounded-3xl p-8 border border-blue-500/20 shadow-xl shadow-blue-500/5">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Global YouTube Trends</h3>
                    <button 
                      onClick={fetchTrends}
                      disabled={isFetchingTrends}
                      className="flex items-center gap-2 px-4 py-2 bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30 rounded-lg text-sm font-bold hover:bg-[#60A5FA]/30 transition-colors"
                    >
                      {isFetchingTrends ? <div className="w-4 h-4 border-2 border-[#60A5FA]/30 border-t-[#60A5FA] rounded-full animate-spin" /> : <Sparkles size={16} />}
                      Refresh Trends
                    </button>
                  </div>
                  <div className="space-y-4">
                    {trends.length > 0 ? (
                      trends.map((trend, idx) => {
                        const { topic: tName, growth, reason } = trend;
                        return (
                          <TrendItem 
                            key={idx} 
                            rank={idx + 1} 
                            topic={tName} 
                            growth={growth} 
                            reason={reason}
                          />
                        );
                      })
                    ) : (
                      <>
                        <TrendItem rank={1} topic="AI Agents in 2026" growth="+450%" />
                        <TrendItem rank={2} topic="Sustainable Living Tech" growth="+210%" />
                        <TrendItem rank={3} topic="Space Tourism Updates" growth="+180%" />
                        <TrendItem rank={4} topic="Quantum Computing Basics" growth="+120%" />
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'comments' && (
              <motion.div 
                key="comments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-[#0F1935]/40 backdrop-blur-xl rounded-3xl p-8 border border-blue-500/20 shadow-xl shadow-blue-500/5">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-white">{t.header.comments}</h3>
                    <div className="flex items-center gap-3">
                      {analysisResult && (
                        <div className="px-4 py-2 bg-[#60A5FA]/20 text-[#60A5FA] border border-[#60A5FA]/30 rounded-lg text-sm font-bold">
                          Sentiment: {analysisResult.sentiment}
                        </div>
                      )}
                      <button 
                        onClick={handleAnalyzeComments}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF7A00] to-[#FF8C1A] text-white rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles size={16} />}
                        Analyze with AI
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Recent Comments</h4>
                      <CommentItem author="TechEnthusiast" text="Could you explain more about the hardware requirements for this?" />
                      <CommentItem author="FutureSeeker" text="Amazing content! Please do a video on AI ethics next." />
                      <CommentItem author="DevLife" text="The visuals are stunning. What AI did you use for the images?" />
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">AI Recommendations</h4>
                      <div className="p-6 bg-[#60A5FA]/10 backdrop-blur-sm rounded-2xl border border-[#60A5FA]/30 space-y-4">
                        <div className="flex items-center gap-2 text-[#60A5FA] font-bold">
                          <Sparkles size={18} /> Next Video Ideas
                        </div>
                        {analysisResult ? (
                          <ul className="space-y-3 text-sm text-gray-300">
                            {analysisResult.suggestions.map((s, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle2 size={14} className="mt-1 flex-shrink-0 text-[#10B981]" /> 
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-400 italic">
                            Click "Analyze with AI" to generate content recommendations based on viewer feedback.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Chat Window */}
      <AnimatePresence>
        {isChatOpen && (userRole === 'owner' || userRole === 'manager') && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 left-8 w-[400px] h-[50vh] bg-[#0F1935]/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-blue-500/20 border border-blue-500/30 flex flex-col z-[100] overflow-hidden"
          >
            <div className="p-4 border-b border-blue-500/30 flex items-center justify-between bg-gradient-to-r from-[#1428A0] to-[#2563EB] text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{t.chat.title}</h3>
                  <p className="text-[10px] opacity-80">ID: {peerId}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={startCall} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Video size={16} />
                </button>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronRight className="rotate-90" size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#E7EBF0]">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.user_id === userId ? 'items-end' : 'items-start'}`}>
                  <div className={`group relative max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.user_id === userId 
                    ? 'bg-[#EEFFDE] text-gray-800 rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none'
                  }`}>
                    {msg.type === 'image' ? (
                      <img src={msg.image_url} className="rounded-lg max-w-full" referrerPolicy="no-referrer" />
                    ) : msg.type === 'voice' ? (
                      <audio controls src={msg.voice_url} className="h-8 max-w-[200px]" />
                    ) : (
                      <>
                        <p>{msg.text}</p>
                        {msg.translatedText && (
                          <p className="mt-2 pt-2 border-t border-black/5 text-xs text-emerald-600 italic">
                            {msg.translatedText}
                          </p>
                        )}
                      </>
                    )}
                    <button 
                      onClick={() => handleTranslate(msg.id!, msg.text)}
                      className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-600 font-bold bg-white px-1.5 py-0.5 rounded border border-black/5"
                    >
                      {t.chat.translate}
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1 px-1">
                    {msg.user_id === userId ? 'You' : msg.user_id}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-black/5 bg-white space-y-3">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Remote Peer ID"
                  value={remotePeerId}
                  onChange={(e) => setRemotePeerId(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-black/10 focus:outline-none focus:ring-1 focus:ring-[#1428A0]"
                />
              </div>
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <label className="p-2 hover:bg-black/5 rounded-full cursor-pointer transition-colors text-gray-400">
                  <ImageIcon size={20} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
                <button 
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-500 animate-pulse' : 'hover:bg-black/5 text-gray-400'}`}
                >
                  <MessageSquare size={20} />
                </button>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t.chat.placeholder}
                  className="flex-1 px-4 py-2 text-sm rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-[#1428A0]/20 transition-all"
                />
                <button type="submit" className="text-[#1428A0] p-2 hover:bg-blue-50 rounded-full transition-colors">
                  <Send size={20} />
                </button>
              </form>
              {isRecording && (
                <div className="text-[10px] text-red-500 font-bold text-center">
                  Recording: {recordingTime}s / 30s
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating AI FAQ Window */}
      <AnimatePresence>
        {isAIFAQOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-8 w-[400px] h-[50vh] bg-white rounded-3xl shadow-2xl border border-black/5 flex flex-col z-[100] overflow-hidden"
          >
            <div className="p-4 border-b border-black/5 flex items-center justify-between bg-[#FF7A00] text-white">
              <div className="flex items-center gap-3">
                <HelpCircle size={20} />
                <h3 className="font-bold text-sm">AI FAQ Guide</h3>
              </div>
              <button onClick={() => setIsAIFAQOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="rotate-90" size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {getFAQItems(language).map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-black/5">
                  <h4 className="font-bold text-xs text-[#FF7A00] mb-1">Q: {item.q}</h4>
                  <p className="text-xs text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 left-8 flex items-center gap-4 z-[110]">
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-xl shadow-xl flex items-center justify-center transition-all ${
            isChatOpen ? 'bg-red-500 text-white rotate-45' : 'bg-[#1428A0] text-white hover:scale-110'
          }`}
        >
          <MessageSquare size={24} />
        </button>
        {(userRole === 'owner' || userRole === 'manager') && (
          <div className="px-3 py-1 bg-white rounded-full border border-black/5 text-[10px] font-bold text-gray-400 shadow-sm">
            {userRole.toUpperCase()}
          </div>
        )}
      </div>

      <div className="fixed bottom-8 right-8 z-[110]">
        <button 
          onClick={() => setIsAIFAQOpen(!isAIFAQOpen)}
          className={`w-14 h-14 rounded-xl shadow-xl flex items-center justify-center transition-all ${
            isAIFAQOpen ? 'bg-red-500 text-white rotate-45' : 'bg-[#FF7A00] text-white hover:scale-110'
          }`}
        >
          <HelpCircle size={24} />
        </button>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
        ? 'bg-gradient-to-r from-[#1428A0] to-[#2563EB] text-white shadow-lg shadow-blue-500/30' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#0F1935]/40 backdrop-blur-xl p-6 rounded-2xl border border-blue-500/20 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-gray-400">{label}</span>
        <div className="p-2 bg-[#1A2942]/60 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function TrendItem({ rank, topic, growth, reason }: { rank: number, topic: string, growth: string, reason?: string }) {
  return (
    <div className="p-4 hover:bg-white/5 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-500/30">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-gray-700 w-8">{rank}</span>
          <span className="font-bold text-white">{topic}</span>
        </div>
        <span className="text-[#10B981] font-bold text-sm">{growth}</span>
      </div>
      {reason && <p className="text-xs text-gray-400 pl-12">{reason}</p>}
    </div>
  );
}

function CommentItem({ author, text }: { author: string, text: string }) {
  return (
    <div className="p-4 bg-[#1A2942]/40 rounded-xl border border-blue-500/20">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] rounded-full" />
        <span className="text-xs font-bold text-gray-300">{author}</span>
      </div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
