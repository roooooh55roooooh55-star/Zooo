
import React, { useState, useRef, useEffect } from 'react';
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
  initialVideo, videoList, onClose, onLike, onDislike, onSave, onProgress
}) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = videoList.findIndex(v => v.id === initialVideo.id);
    return idx >= 0 ? idx : 0;
  });
  
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const [activeAnim, setActiveAnim] = useState<string | null>(null);

  useEffect(() => {
    const vid = videoRefs.current[currentIndex];
    if (vid) {
      vid.play().catch(() => { vid.muted = true; vid.play(); });
    }
    // إيقاف الآخرين لضمان الأداء
    Object.keys(videoRefs.current).forEach((key) => {
      const idx = parseInt(key);
      if (idx !== currentIndex) {
        videoRefs.current[idx]?.pause();
        if (videoRefs.current[idx]) videoRefs.current[idx]!.currentTime = 0;
      }
    });
  }, [currentIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const height = e.currentTarget.clientHeight;
    const index = Math.round(e.currentTarget.scrollTop / height);
    if (index !== currentIndex && index >= 0 && index < videoList.length) {
      setCurrentIndex(index);
    }
  };

  const handleAction = (type: string, id: string) => {
    setActiveAnim(type);
    if (navigator.vibrate) navigator.vibrate(50);
    setTimeout(() => setActiveAnim(null), 600);
    if (type === 'like') onLike(id);
    if (type === 'save') onSave(id);
  };

  return (
    <div className="fixed inset-0 bg-black z-[500] flex flex-col overflow-hidden">
      {/* زر الخروج العلوي */}
      <div className="absolute top-10 left-6 z-[600]">
        <button onClick={onClose} className="p-4 rounded-2xl bg-black/40 backdrop-blur-md text-red-600 border border-red-600 shadow-[0_0_20px_red] active:scale-75 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div onScroll={handleScroll} className="flex-grow overflow-y-scroll snap-y snap-mandatory scrollbar-hide h-full w-full">
        {videoList.map((video, idx) => {
          const stats = getDeterministicStats(video.video_url);
          return (
            <div key={`${video.id}-${idx}`} className="h-full w-full snap-start relative bg-black">
              <video 
                  ref={el => { videoRefs.current[idx] = el; }}
                  src={video.video_url} 
                  className="h-full w-full object-cover"
                  playsInline loop preload="auto" // تحميل مسبق لضمان الجاهزية
                  onTimeUpdate={(e) => idx === currentIndex && onProgress(video.id, e.currentTarget.currentTime / e.currentTarget.duration)}
              />
              
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

              {/* تأثير النقر (لايك) */}
              {activeAnim === 'like' && idx === currentIndex && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 animate-ping">
                  <svg className="w-40 h-40 text-red-600 drop-shadow-[0_0_50px_red]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
              )}

              {/* الأزرار الجانبية */}
              <div className="absolute bottom-32 left-8 flex flex-col items-center gap-8 z-40">
                <button onClick={() => handleAction('like', video.id)} className="flex flex-col items-center group">
                  <div className="p-4 rounded-full bg-red-600/20 border border-red-600 text-red-600 shadow-[0_0_15px_red] group-active:scale-150 transition-all">
                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  </div>
                  <span className="text-[10px] font-black text-white mt-2">{formatBigNumber(stats.likes)}</span>
                </button>
                
                <button onClick={() => handleAction('save', video.id)} className="flex flex-col items-center group">
                   <div className="p-4 rounded-full bg-blue-600/20 border border-blue-600 text-blue-600 shadow-[0_0_15px_blue] group-active:scale-150 transition-all">
                     <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
                   </div>
                   <span className="text-[10px] font-black text-white mt-2">حفظ</span>
                </button>
              </div>

              {/* تفاصيل الفيديو */}
              <div className="absolute bottom-32 right-8 left-24 z-40 text-right">
                <div className="inline-block bg-red-600/40 backdrop-blur-md px-3 py-1 rounded-lg border border-red-600 mb-3">
                  <span className="text-[10px] font-black text-white tracking-widest uppercase">{video.category}</span>
                </div>
                <h3 className="text-white text-xl font-black drop-shadow-[0_2px_10px_black] line-clamp-2 leading-tight">{video.title}</h3>
                <div className="flex items-center justify-end gap-2 mt-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <span className="text-[11px] font-bold">{formatBigNumber(stats.views)} شاهدوا هذا</span>
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
