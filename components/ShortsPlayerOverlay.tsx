
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
  // تصفية القائمة لاستبعاد المحبوبات والمحفوظات من التدفق الرئيسي للشورتس
  const filteredList = useMemo(() => {
    return videoList.filter(v => {
      const vidId = v.id || v.video_url;
      const isInitial = vidId === (initialVideo.id || initialVideo.video_url);
      if (isInitial) return true; // يجب دائماً عرض الفيديو الذي نقر عليه المستخدم
      
      const isLiked = interactions.likedIds.includes(vidId);
      const isSaved = interactions.savedIds.includes(vidId);
      return !isLiked && !isSaved;
    });
  }, [videoList, interactions.likedIds, interactions.savedIds, initialVideo]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = filteredList.findIndex(v => (v.id === initialVideo.id || v.video_url === initialVideo.video_url));
    return idx >= 0 ? idx : 0;
  });
  
  const [isMuted, setIsMuted] = useState(false);
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
    if (currentIndex < filteredList.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      containerRef.current?.scrollTo({ top: nextIndex * containerRef.current.clientHeight, behavior: 'smooth' });
    } else {
      // العودة للبداية (دورة لا نهائية)
      setCurrentIndex(0);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden">
      <div className="absolute top-8 left-6 z-[250]">
        <button onClick={onClose} className="p-4 rounded-full bg-black/60 backdrop-blur-xl text-red-500 border border-red-500 shadow-[0_0_15px_red] active:scale-90 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="flex-grow overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full w-full">
        {filteredList.map((video, idx) => {
          const videoId = video.id || video.video_url;
          const stats = getDeterministicStats(video.video_url);
          const isLiked = interactions.likedIds.includes(videoId);

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
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none z-20" />

              <div className="absolute bottom-32 left-6 flex flex-col items-center gap-6 z-30">
                <button onClick={() => onLike(videoId)} className={`p-4 rounded-full border-2 transition-all ${isLiked ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_blue]' : 'bg-black/40 border-white/20 text-white'}`}><svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg></button>
                <button onClick={() => onDislike(videoId)} className="p-4 rounded-full border-2 border-white/20 bg-black/40 text-white"><svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg></button>
                <button onClick={() => setIsMuted(!isMuted)} className="p-4 rounded-full border-2 border-white/20 bg-black/40 text-white">{isMuted ? '🔇' : '🔊'}</button>
              </div>

              <div className="absolute right-6 bottom-32 z-30 flex flex-col items-end gap-3 pointer-events-none text-right max-w-[70%]">
                <div className="flex items-center gap-2">
                   <span className="text-red-500 text-[10px] font-black italic drop-shadow-[0_0_5px_red]">الحديقة المرعبة</span>
                   <img src="https://i.top4top.io/p_3643ksmii1.jpg" alt="Logo" className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red] object-cover" />
                </div>
                <h3 className="text-white text-lg font-black leading-tight drop-shadow-[0_2px_10px_black]">{video.title}</h3>
                <span className="text-blue-400 text-[11px] font-black tracking-widest">{formatBigNumber(stats.views)} حديقة</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShortsPlayerOverlay;
