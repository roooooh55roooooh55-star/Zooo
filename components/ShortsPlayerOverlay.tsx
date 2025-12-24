
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Video, UserInteractions } from '../types';
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
}

const ShortsPlayerOverlay: React.FC<ShortsPlayerOverlayProps> = ({ 
  initialVideo, videoList, interactions, onClose, onLike, onDislike, onSave, onProgress
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = videoList.findIndex(v => v.id === initialVideo.id);
    return idx >= 0 ? idx : 0;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  useEffect(() => {
    const currentVideo = videoList[currentIndex];
    const vid = videoRefs.current[currentIndex];
    if (vid) {
      vid.play().catch(() => { vid.muted = true; vid.play(); });
    }
    
    // إيقاف الفيديوهات الأخرى لتوفير الباندويث
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = parseInt(key);
      if (idx !== currentIndex) videoRefs.current[idx]?.pause();
    });
  }, [currentIndex, videoList]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const height = e.currentTarget.clientHeight;
    const index = Math.round(e.currentTarget.scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < videoList.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden">
      <div className="absolute top-8 left-6 z-[250]">
        <button onClick={onClose} className="p-4 rounded-2xl bg-black/60 backdrop-blur-xl text-red-500 border-2 border-red-500 shadow-[0_0_30px_red]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div 
        ref={containerRef} 
        onScroll={handleScroll} 
        className="flex-grow overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full w-full"
      >
        {videoList.map((video, idx) => {
          const stats = getDeterministicStats(video.video_url);
          return (
            <div key={`${video.id}-${idx}`} className="h-full w-full snap-start relative bg-black flex items-center justify-center">
              <video 
                ref={el => { videoRefs.current[idx] = el; }}
                src={video.video_url} 
                className="h-full w-full object-cover"
                playsInline 
                loop
                preload="auto"
                onTimeUpdate={(e) => idx === currentIndex && onProgress(video.id, e.currentTarget.currentTime / e.currentTarget.duration)}
              />
              
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-20" />

              <div className="absolute bottom-24 left-6 flex flex-col items-center gap-6 z-30">
                <button onClick={() => onLike(video.id)} className="p-4 w-16 h-16 rounded-3xl border-2 neon-btn-blue bg-blue-600/20 text-white">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                </button>
                <button onClick={() => onDislike(video.id)} className="p-4 w-16 h-16 rounded-3xl border-2 neon-btn-red bg-red-600/20 text-white">
                  <svg className="w-7 h-7 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                </button>
                <button onClick={() => onSave(video.id)} className="p-4 w-16 h-16 rounded-3xl border-2 neon-btn-yellow bg-yellow-500/20 text-white">
                   <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </button>
              </div>

              <div className="absolute right-6 bottom-24 z-30 flex flex-col items-end gap-3 text-right max-w-[70%]">
                <div className="flex items-center gap-2">
                   <span className="text-red-500 text-[10px] font-black italic shadow-red-500/50 shadow-sm">الحديقة المرعبة</span>
                   <div className="w-10 h-10 rounded-full border-2 border-red-600 overflow-hidden"><img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-full h-full object-cover" /></div>
                </div>
                <h3 className="text-white text-lg font-black leading-tight drop-shadow-lg">{video.title}</h3>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-blue-400">{formatBigNumber(stats.views)} حديقة</span>
                  <span className="text-red-500">{formatBigNumber(stats.likes)} رعب</span>
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
