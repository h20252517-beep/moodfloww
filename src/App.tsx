/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'motion/react';
import { 
  Play, 
  ChevronRight, 
  RefreshCcw, 
  Music, 
  Heart, 
  Zap, 
  Wind, 
  CloudRain, 
  Sun,
  Sparkles,
  ArrowRight,
  Infinity,
  Gauge,
  MessageSquare,
  History as HistoryIcon,
  X,
  Trash2,
  Brain
} from 'lucide-react';
import { analyzeDiary, getDetailedRecommendations, RecommendationResult } from './services/gemini';

// --- Types & Constants ---

type EmotionType = 'depressed' | 'stressed' | 'lethargic' | 'calm' | 'happy';

interface Emotion {
  id: EmotionType;
  label: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
  description: string;
}

interface HistoryItem {
  id: string;
  date: string;
  currentEmotion: EmotionType;
  targetEmotion: EmotionType;
  reason: string;
  diary: string;
  result: RecommendationResult;
}

const EMOTIONS: Emotion[] = [
  { 
    id: 'depressed', 
    label: '우울', 
    icon: <CloudRain className="w-6 h-6" />, 
    color: 'bg-blue-600', 
    glow: 'shadow-blue-500/20',
    description: '조용히 내려앉은 마음을 보드랍게 안아드릴게요.' 
  },
  { 
    id: 'stressed', 
    label: '스트레스', 
    icon: <Zap className="w-6 h-6" />, 
    color: 'bg-rose-500', 
    glow: 'shadow-rose-500/20',
    description: '날카로운 신경들을 둥글고 차분하게 다듬어 드립니다.' 
  },
  { 
    id: 'lethargic', 
    label: '무기력', 
    icon: <Wind className="w-6 h-6" />, 
    color: 'bg-slate-500', 
    glow: 'shadow-slate-500/20',
    description: '작은 불씨를 지펴 다시 일어날 수 있게 도와드릴게요.' 
  },
  { 
    id: 'calm', 
    label: '평온', 
    icon: <Heart className="w-6 h-6" />, 
    color: 'bg-emerald-500', 
    glow: 'shadow-emerald-500/20',
    description: '호수처럼 정적인 지금의 평화를 더 깊게 즐겨보세요.' 
  },
  { 
    id: 'happy', 
    label: '행복', 
    icon: <Sun className="w-6 h-6" />, 
    color: 'bg-amber-400', 
    glow: 'shadow-amber-400/20',
    description: '가슴 벅찬 에너지를 세상에서 가장 즐거운 리듬과 함께하세요.' 
  },
];

const REASONS = [
  "과제/공부", 
  "직장/업무", 
  "인간관계", 
  "건강/날씨", 
  "특별한 이유 없음", 
  "기타"
];

// --- Custom Cursor Component ---

function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const [isHovered, setIsHovered] = useState(false);

  const springConfig = { damping: 25, stiffness: 200 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button')) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-pink-500 pointer-events-none z-[9999] hidden md:block"
      style={{
        translateX: cursorXSpring,
        translateY: cursorYSpring,
        x: '-50%',
        y: '-50%',
      }}
      animate={{
        scale: isHovered ? 2 : 1,
        backgroundColor: isHovered ? 'rgba(236, 72, 153, 0.1)' : 'rgba(236, 72, 153, 0)',
        borderColor: isHovered ? 'rgba(236, 72, 153, 0.4)' : 'rgba(236, 72, 153, 0.6)',
      }}
    />
  );
}

// --- Loading Screen Component ---

function LoadingScreen({ onFinish, message }: { onFinish: () => void, message?: string }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#FDFCF0]"
    >
      <div className="text-center space-y-6">
        <div className="relative">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 border-4 border-pink-100 border-t-pink-500 rounded-full mx-auto"
          />
          <Brain className="absolute inset-0 m-auto w-8 h-8 text-pink-400 animate-pulse" />
        </div>
        <div>
          <p className="text-pink-400 font-bold tracking-widest text-[10px] uppercase mb-1">Neural Syncing</p>
          <p className="text-gray-500 text-sm">{message || "당신의 감정 주파수를 동기화하고 있습니다..."}</p>
        </div>
      </div>
    </motion.div>
  );
}

// --- Intensity Selector ---

function IntensitySelector({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 mt-4 bg-white p-2 rounded-2xl border border-pink-100 shadow-sm">
      <span className="text-[10px] font-bold text-pink-400 uppercase ml-2 mr-auto">Intensity</span>
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          onClick={() => onChange(level)}
          className={`
            w-8 h-8 rounded-lg text-xs font-bold transition-all
            ${value === level 
              ? 'bg-pink-400 text-white shadow-lg shadow-pink-200' 
              : 'bg-pink-50 text-pink-300 hover:text-pink-400'}
          `}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType | null>(null);
  const [currentIntensity, setCurrentIntensity] = useState(3);
  const [targetEmotion, setTargetEmotion] = useState<EmotionType | null>(null);
  const [targetIntensity, setTargetIntensity] = useState(3);
  const [reason, setReason] = useState("");
  const [diary, setDiary] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [view, setView] = useState<'selection' | 'loading' | 'result' | 'history'>('selection');
  const [recommendationResult, setRecommendationResult] = useState<RecommendationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('moodflow_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('moodflow_history', JSON.stringify(history));
  }, [history]);

  const handleDiaryAnalysis = async () => {
    if (!diary.trim()) return;
    setIsAnalyzing(true);
    const result = await analyzeDiary(diary);
    if (result) {
      setCurrentEmotion(result as EmotionType);
    }
    setIsAnalyzing(false);
  };

  const handleStartFlow = async () => {
    if (!currentEmotion || !targetEmotion) return;
    
    setView('loading');
    const result = await getDetailedRecommendations(
      currentEmotion,
      targetEmotion,
      currentIntensity,
      reason,
      diary
    );

    if (result) {
      setRecommendationResult(result);
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleString(),
        currentEmotion,
        targetEmotion,
        reason,
        diary,
        result
      };
      setHistory(prev => [newItem, ...prev].slice(0, 20));
      setView('result');
    } else {
      // Fallback or error handling
      alert("추천을 생성하는 중 오류가 발생했습니다. Vercel 환경 설정에서 GEMINI_API_KEY가 등록되어 있는지 확인해주세요.");
      setView('selection');
    }
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const handleReset = () => {
    setCurrentEmotion(null);
    setTargetEmotion(null);
    setReason("");
    setDiary("");
    setRecommendationResult(null);
    setView('selection');
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-gray-800 font-sans p-4 md:p-8 overflow-x-hidden relative selection:bg-pink-100 cursor-none">
      <CustomCursor />
      
      {/* Playful Background blobs */}
      <div className="fixed top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-pink-100/50 blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px] pointer-events-none"></div>
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-yellow-100/40 blur-[100px] pointer-events-none"></div>

      <AnimatePresence>
        {view === 'loading' && (
          <LoadingScreen 
            onFinish={() => {}} 
            message={isAnalyzing ? "일기에서 반짝이는 감정을 찾고 있어요..." : "당신만을 위한 달콤한 음악 리스트를 만들고 있어요..."}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-5xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col pt-4">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3 group cursor-pointer"
            onClick={handleReset}
          >
            <div className="w-12 h-12 bg-gradient-to-tr from-pink-400 to-rose-400 rounded-2xl shadow-xl shadow-pink-200 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Music className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-gray-900 uppercase italic">MoodFlow</span>
          </motion.div>
          <nav className="hidden md:flex items-center space-x-10 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
            <button 
              onClick={() => setView('history')}
              className={`hover:text-pink-500 transition-colors flex items-center gap-2 ${view === 'history' ? 'text-pink-600 font-bold' : ''}`}
            >
              <HistoryIcon size={14} />
              Records
            </button>
            <button 
              onClick={handleReset}
              className={`transition-colors ${view === 'selection' ? 'text-pink-600 border-b-2 border-pink-400 pb-1' : 'hover:text-pink-500'}`}
            >
              Sweet Journey
            </button>
          </nav>
        </header>

        <main className="flex-1">
          <AnimatePresence mode="wait">
            {view === 'selection' && (
              <motion.section
                key="selection"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
              >
                {/* Hero Title */}
                <div className="lg:col-span-12">
                  <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold text-gray-900 mb-4 leading-[1.1] tracking-tight"
                  >
                    Color Your <br />
                    <span className="font-black italic tracking-tighter text-pink-500">Every Moment</span>
                  </motion.h1>
                </div>

                {/* Left: Input Sidebar */}
                <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Diary & Context Sidebar */}
                  <div className="space-y-8">
                    {/* Diary Input */}
                    <div className="bg-white border border-pink-100 rounded-[3rem] p-8 shadow-xl shadow-pink-100/50 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] flex items-center gap-2">
                          <MessageSquare size={14} />
                          Today's Diary
                        </span>
                      </div>
                      <div className="space-y-4">
                        <textarea
                          placeholder="오늘 무슨 일이 있었나요? 소중한 일상을 들려주세요."
                          value={diary}
                          onChange={(e) => setDiary(e.target.value)}
                          className="w-full bg-pink-50/30 border border-pink-100 rounded-2xl p-4 text-sm text-gray-700 placeholder:text-pink-200 focus:outline-none focus:border-pink-400 transition-colors min-h-[100px] resize-none"
                        />
                        <button
                          onClick={handleDiaryAnalysis}
                          disabled={!diary.trim() || isAnalyzing}
                          className="w-full py-3 rounded-xl bg-pink-400 text-white text-xs font-bold uppercase tracking-widest hover:bg-pink-500 shadow-lg shadow-pink-200 transition-all disabled:opacity-30"
                        >
                          {isAnalyzing ? "감정 읽는 중..." : "AI 마음 읽기 ✨"}
                        </button>
                      </div>
                    </div>

                    {/* Reason Context */}
                    <div className="bg-white border border-blue-100 rounded-[3rem] p-8 shadow-xl shadow-blue-100/50 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">The Reason</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {REASONS.map((r) => (
                          <button
                            key={r}
                            onClick={() => setReason(r)}
                            className={`
                              px-4 py-2 rounded-full text-[10px] font-bold transition-all
                              ${reason === r 
                                ? 'bg-blue-400 text-white shadow-lg shadow-blue-200' 
                                : 'bg-blue-50 text-blue-400 hover:bg-blue-100 border border-blue-100'}
                            `}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Emotion Selectors */}
                  <div className="space-y-8">
                    {/* Current Emotion Card */}
                    <div className="bg-white border border-rose-100 rounded-[3rem] p-8 shadow-xl shadow-rose-100/50 space-y-6">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em]">How I Feel Now</span>
                      <div className="grid grid-cols-5 gap-2">
                        {EMOTIONS.map((emotion) => (
                          <button
                            key={`curr-${emotion.id}`}
                            onClick={() => setCurrentEmotion(emotion.id)}
                            className={`
                              flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 gap-2
                              ${currentEmotion === emotion.id 
                                ? `${emotion.color} text-white shadow-xl ${emotion.glow} scale-105` 
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}
                            `}
                          >
                            {emotion.icon}
                            <span className={`text-[10px] font-bold ${currentEmotion === emotion.id ? 'text-white' : 'text-gray-400'}`}>
                              {emotion.label}
                            </span>
                          </button>
                        ))}
                      </div>
                      {currentEmotion && (
                        <IntensitySelector value={currentIntensity} onChange={setCurrentIntensity} />
                      )}
                    </div>

                    {/* Target Emotion Card */}
                    <div className={`transition-all duration-700 ${!currentEmotion ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
                      <div className="bg-white border border-amber-100 rounded-[3rem] p-8 shadow-xl shadow-amber-100/50 space-y-6">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Where I Want to Go</span>
                        <div className="grid grid-cols-5 gap-2">
                          {EMOTIONS.map((emotion) => (
                            <button
                              key={`target-${emotion.id}`}
                              onClick={() => setTargetEmotion(emotion.id)}
                              className={`
                                flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 gap-2
                                ${targetEmotion === emotion.id 
                                  ? `${emotion.color} text-white shadow-xl ${emotion.glow} scale-105` 
                                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}
                              `}
                            >
                              {emotion.icon}
                              <span className={`text-[10px] font-bold ${targetEmotion === emotion.id ? 'text-white' : 'text-gray-400'}`}>
                                {emotion.label}
                              </span>
                            </button>
                          ))}
                        </div>
                        {targetEmotion && (
                          <IntensitySelector value={targetIntensity} onChange={setTargetIntensity} />
                        )}
                      </div>
                    </div>

                    <button
                      disabled={!currentEmotion || !targetEmotion}
                      onClick={handleStartFlow}
                      className={`
                        w-full py-6 rounded-3xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-500
                        ${currentEmotion && targetEmotion 
                          ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-amber-400 text-white shadow-2xl shadow-pink-100 hover:scale-[1.02]' 
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
                      `}
                    >
                      Start Sweet Flow 🍭
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {view === 'result' && recommendationResult && (
              <motion.section
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, filter: 'blur(20px)' }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-24"
              >
                {/* Result Title */}
                <div className="lg:col-span-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-pink-100 pb-12">
                   <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
                      Atmospheric <span className="font-black italic tracking-tighter text-pink-500 underline decoration-pink-200 underline-offset-8">Drift</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-[11px] font-bold text-blue-500 uppercase tracking-widest">
                        Reason: {reason || "Not Specified"}
                      </div>
                      {diary && (
                         <div className="px-4 py-2 bg-pink-50 border border-pink-100 rounded-full text-[11px] font-bold text-pink-500 uppercase tracking-widest flex items-center gap-2">
                           <Sparkles size={12} /> Diary Synced
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Staggered Path View */}
                <div className="lg:col-span-8 flex flex-col space-y-16 pt-8">
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.5 } }
                    }}
                    className="relative space-y-24"
                  >
                    {/* Visual Connector - dotted pink line */}
                    <div className="absolute left-[2.5rem] top-12 bottom-12 w-[2px] border-l-2 border-dotted border-pink-200 opacity-50"></div>

                    {recommendationResult.path.map((step, index) => (
                      <motion.div
                        key={`step-${index}`}
                        variants={{
                          hidden: { opacity: 0, y: 30 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        className="relative flex gap-8 group"
                      >
                        {/* Phase Circle */}
                        <div className="flex-shrink-0 w-20 h-20 rounded-[2rem] bg-white border-2 border-pink-100 shadow-xl shadow-pink-50 flex items-center justify-center relative z-10">
                          <span className="text-xl font-black italic text-pink-500">0{index + 1}</span>
                        </div>

                        {/* Phase Content */}
                        <div className="flex-1 space-y-6">
                          <div className="space-y-1">
                             <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{step.emotion}</h3>
                             <p className="text-gray-500 text-sm italic font-medium">"{step.description}"</p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {step.songs.map((song, sIdx) => (
                              <motion.div 
                                key={sIdx}
                                whileHover={{ y: -5, scale: 1.02 }}
                                className="p-6 rounded-[2rem] border border-pink-50 bg-white shadow-lg shadow-pink-50/50 transition-all duration-500"
                              >
                                <div className="flex justify-between items-start mb-4">
                                  <Music size={18} className="text-pink-400" />
                                  <button className="text-gray-300 hover:text-pink-400 transition-colors">
                                    <Play size={14} fill="currentColor" />
                                  </button>
                                </div>
                                <div className="space-y-0.5 mb-4">
                                  <h4 className="text-base font-bold tracking-tight text-gray-900">{song.title}</h4>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{song.artist}</p>
                                </div>
                                <div className="pt-4 border-t border-pink-50 text-[10px] text-gray-500 font-medium leading-relaxed">
                                  {song.reason}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {/* Sidebar Info */}
                <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-8 self-start pt-8">
                  <div className="bg-white border-2 border-pink-100 rounded-[3rem] p-8 shadow-2xl shadow-pink-100/30 space-y-8">
                    <h3 className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em]">AI Loving Advice</h3>
                    <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100">
                      <p className="text-[11px] text-pink-700 leading-relaxed font-bold italic">
                        "{recommendationResult.advice}"
                      </p>
                    </div>
                    
                    <button
                      onClick={handleReset}
                      className="w-full py-5 rounded-2xl bg-pink-400 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-pink-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-pink-200"
                    >
                      <RefreshCcw size={12} />
                      Start Again
                    </button>
                  </div>
                </aside>
              </motion.section>
            )}

            {view === 'history' && (
              <motion.section
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12 pb-24"
              >
                <div className="flex items-center justify-between border-b border-pink-100 pb-8">
                  <h1 className="text-4xl font-bold text-gray-900 tracking-tight italic">
                    Sweet <span className="font-black italic tracking-tighter text-pink-500">Archive</span>
                  </h1>
                  <button onClick={() => setView('selection')} className="p-4 rounded-full border border-pink-100 bg-white text-gray-400 hover:text-pink-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-400 italic">아직 기록이 없어요. 첫 번째 여정을 시작해볼까요?</div>
                  ) : (
                    history.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-pink-50 rounded-[2.5rem] p-8 flex flex-col gap-4 group relative shadow-md hover:shadow-xl transition-shadow"
                      >
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          className="absolute top-4 right-4 p-2 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.date}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{item.currentEmotion}</span>
                          <ArrowRight size={10} className="text-gray-300" />
                          <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{item.targetEmotion}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 italic mb-4">"{item.diary || "No description"}"</p>
                        <button 
                          onClick={() => {
                            setRecommendationResult(item.result);
                            setView('result');
                          }}
                          className="mt-auto w-full py-4 rounded-xl border border-pink-50 bg-pink-50/50 text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] hover:bg-pink-100 transition-all underline decoration-pink-200 underline-offset-4"
                        >
                          Replay Journey
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        <footer className="mt-auto py-12 border-t border-pink-50 flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-300">
             <span>© 2024 MoodFlow Studio</span>
           </div>
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl border border-pink-50 flex items-center justify-center hover:bg-pink-50 transition-all text-pink-300 hover:text-pink-500">
                <span className="text-[10px] font-black">FB</span>
              </div>
              <div className="w-10 h-10 rounded-2xl border border-pink-50 flex items-center justify-center hover:bg-pink-50 transition-all text-pink-300 hover:text-pink-500">
                <span className="text-[10px] font-black">TK</span>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
}
