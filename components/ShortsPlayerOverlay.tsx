
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Video, UserInteractions } from '../types';
import { incrementViewsInDB } from '../supabaseClient';
import { getDeterministicStats, formatBigNumber } from './MainContent';

interface ShortsPlayerOverlayProps {
  initialVideo: Video;
  videoList: Video[];
  interactions: UserInteractions;
  onClose: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onSave: (id: string) => void;
  onProgress: (id: string, progress: number) => void;
  onAllEnded?: () => void;
}

const ShortsPlayerOverlay: React.FC<ShortsPlayerOverlayProps> = ({ 
  initialVideo, videoList, interactions, onClose, onLike, onDislike, onSave, onProgress
}) => {
  const [autoPlay, setAutoPlay] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const filteredList = useMemo(() => {
    return videoList.filter(v => {
      const vidId = v.id || v.video_url;
      const isInitial = vidId === (initialVideo.id || initialVideo.video_url);
      if (isInitial) return true;
      
      const isDisliked = interactions.dislikedIds.includes(vidId);
      return !isDisliked;
    });
  }, [videoList, interactions.dislikedIds, initialVideo]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = filteredList.findIndex(v => (v.id === initialVideo.id || v.video_url === initialVideo.video_url));
    return idx >= 0 ? idx : 0;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      containerRef.current.scrollTo({ top: currentIndex * height, behavior: 'instant' });
    }
  }, []);

  useEffect(() => {
    const currentVideo = filteredList[currentIndex];
    if (currentVideo) {
      incrementViewsInDB(currentVideo.id || currentVideo.video_url);
      const vid = videoRefs.current[currentIndex];
      if (vid) {
        vid.muted = isMuted;
        vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
      }
    }
    
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = parseInt(key);
      const vid = videoRefs.current[idx];
      if (vid && Math.abs(idx - currentIndex) > 1) {
        vid.pause();
        vid.currentTime = 0;
      }
    });
  }, [currentIndex, isMuted, filteredList]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const height = e.currentTarget.clientHeight;
    if (height === 0) return;
    const index = Math.round(e.currentTarget.scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < filteredList.length) {
      setCurrentIndex(index);
    }
  };

  const handleVideoEnded = () => {
    if (autoPlay) {
      if (currentIndex < filteredList.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        containerRef.current?.scrollTo({ top: nextIndex * containerRef.current.clientHeight, behavior: 'smooth' });
      } else {
        setCurrentIndex(0);
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden">
      <div className="absolute top-8 left-6 z-[250]">
        <button onClick={onClose} className="p-4 rounded-2xl bg-black/60 backdrop-blur-xl text-red-500 border-2 border-red-500 shadow-[0_0_30px_red] active:scale-90 transition-all flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="flex-grow overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full w-full">
        {filteredList.map((video, idx) => {
          const videoId = video.id || video.video_url;
          const stats = getDeterministicStats(video.video_url);
          const isLiked = interactions.likedIds.includes(videoId);
          const isDisliked = interactions.dislikedIds.includes(videoId);
          const isSaved = interactions.savedIds.includes(videoId);

          return (
            <div key={`${videoId}-${idx}`} className="h-full w-full snap-start relative bg-black flex items-center justify-center overflow-hidden">
              <video 
                ref={el => { videoRefs.current[idx] = el; }}
                src={video.video_url} 
                className="h-full w-full object-cover relative z-10"
                playsInline 
                preload={Math.abs(idx - currentIndex) <= 1 ? "auto" : "metadata"}
                muted={idx !== currentIndex || isMuted}
                onEnded={idx === currentIndex ? handleVideoEnded : undefined}
                onTimeUpdate={(e) => idx === currentIndex && onProgress(videoId, e.currentTarget.currentTime / e.currentTarget.duration)}
                onClick={(e) => {
                  const v = e.currentTarget;
                  v.paused ? v.play().catch(() => {}) : v.pause();
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none z-20" />

              {/* أزرار التفاعل الجانبية - ستايل نيون فائق السطوع وموحد الحجم */}
              <div className="absolute bottom-24 left-6 flex flex-col items-center gap-6 z-30">
                
                {/* 1. زر الإعجاب - نيون أزرق عالي الضوء */}
                <button 
                  onClick={() => onLike(videoId)} 
                  className={`p-4 w-16 h-16 rounded-3xl border-2 transition-all flex justify-center items-center group relative overflow-hidden ${isLiked ? 'neon-btn-blue bg-blue-600/40 neon-active-shine scale-110' : 'bg-black/60 border-white/20 text-white hover:neon-btn-blue'}`}
                >
                  <svg className="w-7 h-7 relative z-10" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                </button>
                
                {/* 2. زر الديسك لايك - نيون أحمر عالي الضوء */}
                <button 
                  onClick={() => onDislike(videoId)} 
                  className={`p-4 w-16 h-16 rounded-3xl border-2 transition-all flex justify-center items-center group relative overflow-hidden ${isDisliked ? 'neon-btn-red bg-red-600/40 neon-active-shine scale-110' : 'bg-black/60 border-white/20 text-white hover:neon-btn-red'}`}
                >
                  <svg className="w-7 h-7 rotate-180 relative z-10" fill={isDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                </button>

                {/* 3. زر الحفظ - نيون أصفر عالي الضوء */}
                <button 
                  onClick={() => onSave(videoId)} 
                  className={`p-4 w-16 h-16 rounded-3xl border-2 transition-all flex justify-center items-center group relative overflow-hidden ${isSaved ? 'neon-btn-yellow bg-yellow-500/40 neon-active-shine scale-110' : 'bg-black/60 border-white/20 text-white hover:neon-btn-yellow'}`}
                >
                   <svg className="w-7 h-7 relative z-10" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </button>

                {/* 4. زر التشغيل التلقائي المطور - نيون أخضر مذهل (نفس حجم باقي الزراير) */}
                <button 
                  onClick={() => setAutoPlay(!autoPlay)} 
                  className={`p-4 w-16 h-16 rounded-3xl border-2 transition-all flex justify-center items-center relative group overflow-hidden ${autoPlay ? 'neon-btn-green bg-green-500/50 scale-110' : 'bg-black/60 border-white/20 text-white/50'}`}
                >
                   {autoPlay && (
                     <div className="absolute inset-0 bg-gradient-to-tr from-green-300/30 to-transparent animate-spin-slow"></div>
                   )}
                   <svg className={`w-8 h-8 relative z-10 ${autoPlay ? 'animate-pulse-fast text-white' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                   </svg>
                </button>

                {/* 5. زر كتم الصوت - نيون أرجواني */}
                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  className={`p-4 w-16 h-16 rounded-3xl border-2 transition-all flex justify-center items-center group relative overflow-hidden ${isMuted ? 'neon-btn-red bg-red-600/40' : 'bg-black/60 border-white/20 text-white hover:neon-btn-purple'}`}
                >
                  {isMuted ? <svg className="w-7 h-7 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 3.12-2.04 5.75-4.83 6.6l.72 1.45C18.67 19 21 15.78 21 12s-2.33-7-6.11-8.05l-.72 1.45c2.79.85 4.83 3.48 4.83 6.6zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.38.29-.8.53-1.25.71v1.54c.89-.2 1.7-.58 2.42-1.1l2.31 2.31L21 19.73l-16.73-16.73zM12 4L9.91 6.09 12 8.18V4z"/></svg> : <svg className="w-7 h-7 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v1.54c2.78.86 4.83 3.48 4.83 6.6s-2.05 5.74-4.83 6.6v1.54c3.61-.9 6.33-4.14 6.33-7.94s-2.72-7.04-6.33-7.94z"/></svg>}
                </button>
              </div>

              <div className="absolute right-6 bottom-24 z-30 flex flex-col items-end gap-3 pointer-events-none text-right max-w-[70%]">
                <div className="flex items-center gap-2">
                   <span className="text-red-500 text-[10px] font-black italic drop-shadow-[0_0_8px_red]">الحديقة المرعبة</span>
                   <img src="https://i.top4top.io/p_3643ksmii1.jpg" alt="Logo" className="w-11 h-11 rounded-full border-2 border-red-600 shadow-[0_0_20px_red] object-cover" />
                </div>
                <h3 className="text-white text-xl font-black leading-tight drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">{video.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 text-[12px] font-black tracking-widest drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{formatBigNumber(stats.views)} حديقة</span>
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                  <span className="text-red-500 text-[12px] font-black tracking-widest drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{formatBigNumber(stats.likes)} رعب</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShortsPlayerOverlay;
