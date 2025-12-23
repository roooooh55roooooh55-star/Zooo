
import React, { useState, useRef, useEffect } from 'react';
import { Video, UserInteractions } from '../types';
import { incrementViewsInDB } from '../supabaseClient';

export const getDeterministicStats = (url: string, isTrend = false) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = url.charCodeAt(i) + ((hash << 5) - hash);
  const factor = isTrend ? 2 : 1;
  const likesSeed = (Math.abs(hash % 1500000) + 500000) * factor;
  const viewsSeed = (Math.abs(hash % 45000000) + 10000000) * factor;
  return { likes: likesSeed, views: viewsSeed };
};

export const formatBigNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

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
  initialVideo, videoList, interactions, onClose, onLike, onDislike, onSave, onProgress, onAllEnded
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = videoList.findIndex(v => (v.id === initialVideo.id && initialVideo.id !== undefined) || (v.video_url === initialVideo.video_url));
    return idx >= 0 ? idx : 0;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  useEffect(() => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      containerRef.current.scrollTo({ top: currentIndex * height, behavior: 'instant' });
    }
  }, []);

  useEffect(() => {
    const currentVideo = videoList[currentIndex];
    if (currentVideo) {
      incrementViewsInDB(currentVideo.id || currentVideo.video_url);
      const vid = videoRefs.current[currentIndex];
      if (vid) {
        vid.muted = isMuted;
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            vid.muted = true;
            vid.play().catch(() => {});
          });
        }
      }
    }
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = parseInt(key);
      const vid = videoRefs.current[idx];
      if (vid && idx !== currentIndex) {
        try {
          vid.pause();
        } catch (e) {}
      }
    });
  }, [currentIndex, isMuted, videoList]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const height = e.currentTarget.clientHeight;
    if (height === 0) return;
    const index = Math.round(e.currentTarget.scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < videoList.length) setCurrentIndex(index);
  };

  const handleVideoEnded = () => {
    if (isAutoPlay && currentIndex < videoList.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      containerRef.current?.scrollTo({ top: nextIndex * containerRef.current.clientHeight, behavior: 'smooth' });
    } else if (isAutoPlay && onAllEnded) onAllEnded();
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden">
      <div className="absolute top-6 left-6 z-[250]">
        <button onClick={onClose} className="p-3 rounded-2xl bg-black/50 backdrop-blur-md text-red-500 border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] active:scale-90 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div ref={containerRef} onScroll={handleScroll} className="flex-grow overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full w-full">
        {videoList.map((video, idx) => {
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
                className="h-full w-full object-cover"
                playsInline preload="auto"
                muted={idx !== currentIndex || isMuted}
                onEnded={idx === currentIndex ? handleVideoEnded : undefined}
                onTimeUpdate={(e) => idx === currentIndex && onProgress(videoId, e.currentTarget.currentTime / e.currentTarget.duration)}
                onClick={(e) => {
                  const v = e.currentTarget;
                  if (v.paused) {
                    const p = v.play();
                    if (p !== undefined) p.catch(() => {});
                  } else {
                    v.pause();
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />

              <div className="absolute bottom-24 left-6 flex flex-col items-center gap-5 z-30">
                <button 
                  onClick={() => setIsAutoPlay(!isAutoPlay)} 
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl border-2 transition-all text-[8px] font-black ${isAutoPlay ? 'bg-green-600/40 border-green-400 text-green-100 shadow-[0_0_20px_rgba(34,197,94,0.7)]' : 'bg-red-600/40 border-red-400 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.7)]'}`}
                >
                  AUTO
                </button>

                <button onClick={() => onLike(videoId)} className={`p-3.5 rounded-2xl border-2 transition-all ${isLiked ? 'bg-blue-600/50 border-blue-400 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.8)]' : 'bg-black/30 border-white/20 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)]'}`}>
                  <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                </button>

                <button onClick={() => onDislike(videoId)} className={`p-3.5 rounded-2xl border-2 transition-all ${isDisliked ? 'bg-red-600/50 border-red-400 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-black/30 border-white/20 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)]'}`}>
                  <svg className="w-6 h-6 rotate-180" fill={isDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                </button>

                <button onClick={() => onSave(videoId)} className={`p-3.5 rounded-2xl border-2 transition-all ${isSaved ? 'bg-yellow-500/50 border-yellow-400 text-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.8)]' : 'bg-black/30 border-white/20 text-white shadow-[0_0_10px_rgba(0,0,0,0.5)]'}`}>
                  <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                </button>

                <button onClick={() => setIsMuted(!isMuted)} className={`p-3.5 rounded-2xl border-2 transition-all ${isMuted ? 'bg-red-600/30 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-black/30 border-white/20 text-white shadow-none'}`}>
                  {isMuted ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586zM17 9l4 4m0-4l-4 4"/></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586z"/></svg>}
                </button>
              </div>

              <div className="absolute right-6 bottom-24 z-30 flex flex-col items-end gap-3 pointer-events-none text-right max-w-[65%]">
                <div className="flex items-center gap-2">
                   <span className="text-red-500 text-xs font-black italic drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">الحديقة المرعبة</span>
                   <img src="https://i.top4top.io/p_3643ksmii1.jpg" alt="Logo" className="w-10 h-10 rounded-full border-2 border-red-600 object-cover shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                </div>
                <div>
                  <h3 className="text-white text-base font-black leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">{video.title}</h3>
                  <span className="text-blue-400 text-[10px] font-black drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{formatBigNumber(stats.views)} حديقة</span>
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
