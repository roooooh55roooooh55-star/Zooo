
import React, { useRef, useEffect, useState } from 'react';
import { Video } from '../types.ts';
import { incrementViewsInDB } from '../supabaseClient.ts';

interface LongPlayerOverlayProps {
  video: Video;
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onNext: () => void;
  onPrev: () => void;
  isLiked: boolean;
  isDisliked: boolean;
  isSaved: boolean;
  onProgress: (p: number) => void;
  onEnded?: () => void;
}

const LongPlayerOverlay: React.FC<LongPlayerOverlayProps> = ({ 
  video, onClose, onLike, onDislike, onSave, onNext, onPrev, isLiked, isDisliked, isSaved, onProgress, onEnded 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    incrementViewsInDB(video.id || video.video_url);
    v.muted = isMuted;
    
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    }

    const updateTime = () => { if (v.duration) onProgress(v.currentTime / v.duration); };
    const handleEnd = () => { 
      if (isAutoPlay && onEnded) onEnded(); 
      else { 
        v.currentTime = 0; 
        v.play().catch(() => {});
      } 
    };
    v.addEventListener('timeupdate', updateTime);
    v.addEventListener('ended', handleEnd);
    return () => {
      v.removeEventListener('timeupdate', updateTime);
      v.removeEventListener('ended', handleEnd);
      v.pause();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [video.id, video.video_url, isMuted, onEnded, isAutoPlay]);

  useEffect(() => {
    if (showControls && !isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowControls(false), 4000);
    }
  }, [showControls, isPaused]);

  const handleInteraction = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!showControls) { setShowControls(true); return; }
    if (v.paused) { 
      v.play().catch(() => {}); 
      setIsPaused(false); 
    } else { 
      v.pause(); 
      setIsPaused(true); 
    }
  };

  const toggleLandscape = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLandscape(!isLandscape);
    setShowControls(true);
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col transition-all duration-500 overflow-hidden">
      <div 
        ref={containerRef}
        className={`relative bg-black flex items-center justify-center transition-all duration-500 cursor-pointer overflow-hidden fluo-portal ${
          isLandscape ? 'fixed inset-0 z-[300] w-screen h-screen' : 'flex-grow'
        }`}
        onClick={handleInteraction}
      >
        <video 
          ref={videoRef}
          src={video.video_url}
          style={isLandscape ? {
            width: '100.5dvh', 
            height: '100.5dvw',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            objectFit: 'cover', 
            backgroundColor: 'black'
          } : {}}
          className={`transition-all duration-500 pointer-events-none relative z-10 ${!isLandscape ? 'w-full aspect-video object-contain shadow-[0_0_50px_rgba(0,0,0,1)]' : ''}`}
          playsInline
        />

        {/* أزرار التحكم العلوية */}
        <div className={`absolute top-0 left-0 right-0 p-5 z-[350] flex justify-between items-start transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* زر التصغير - أعلى اليسار */}
          {isLandscape ? (
            <button 
              onClick={toggleLandscape}
              className="p-3 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/30 text-white active:scale-90 transition-all shadow-2xl flex items-center gap-2 rotate-90"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              </svg>
              <span className="text-[10px] font-black uppercase">تصغير</span>
            </button>
          ) : <div className="w-10"></div>}

          {/* زر الإغلاق - أعلى اليمين */}
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="p-3 bg-black/70 backdrop-blur-xl rounded-2xl border-2 border-red-600 text-red-600 active:scale-90 transition-all shadow-[0_0_20px_rgba(220,38,38,0.7)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {!isLandscape && (
        <div className={`p-6 pb-28 bg-[#0a0a0a] rounded-t-[2.5rem] border-t border-white/5 flex flex-col gap-6 transition-all duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] z-[350] ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between">
            <button onClick={toggleLandscape} className="p-2.5 bg-red-600/10 border border-red-500 text-red-500 rounded-xl flex items-center gap-2 active:scale-95 transition-transform shadow-[0_0_15px_rgba(220,38,38,0.3)]">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
               <span className="text-[10px] font-black uppercase">ملء الشاشة</span>
            </button>
            <h2 className="text-lg font-black text-right line-clamp-1 flex-grow pr-4">{video.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsAutoPlay(!isAutoPlay); }} 
              className={`flex-1 flex justify-center py-4 rounded-xl border transition-all text-[9px] font-black ${isAutoPlay ? 'bg-green-600/30 border-green-500 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)]' : 'bg-red-600/30 border-red-500 text-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)]'}`}
            >
              AUTO
            </button>
            <button onClick={(e) => { e.stopPropagation(); onLike(); }} className={`flex-1 flex justify-center py-4 rounded-xl border transition-all ${isLiked ? 'bg-blue-600/40 border-blue-400 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.7)]' : 'bg-white/5 border-white/10 text-white shadow-none'}`}>
              <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDislike(); }} className={`flex-1 flex justify-center py-4 rounded-xl border transition-all ${isDisliked ? 'bg-red-600/40 border-red-400 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)]' : 'bg-white/5 border-white/10 text-white'}`}>
              <svg className="w-6 h-6 rotate-180" fill={isDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onSave(); }} className={`flex-1 flex justify-center py-4 rounded-xl border transition-all ${isSaved ? 'bg-yellow-500/40 border-yellow-400 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.7)]' : 'bg-white/5 border-white/10 text-white shadow-none'}`}>
              <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className={`flex-1 flex justify-center py-4 rounded-xl border transition-all ${isMuted ? 'bg-red-600/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/5 border-white/10 text-white'}`}>
              {isMuted ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586zM17 9l4 4m0-4l-4 4"/></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586z"/></svg>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LongPlayerOverlay;
