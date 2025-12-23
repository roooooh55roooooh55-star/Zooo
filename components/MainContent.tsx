
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Video, UserInteractions } from '../types.ts';

const getDeterministicStats = (url: string) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash);
  }
  const likesSeed = Math.abs(hash % 1500000) + 500000;
  const viewsSeed = Math.abs(hash % 45000000) + 5000000;
  return { likes: likesSeed, views: viewsSeed };
};

const formatBigNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// التحقق مما إذا كان الفيديو "جديداً" (مضاف خلال آخر 48 ساعة)
const isRecentVideo = (video: Video) => {
  if (!video.created_at) return false;
  const videoDate = new Date(video.created_at).getTime();
  const now = new Date().getTime();
  const diffHours = (now - videoDate) / (1000 * 60 * 60);
  return diffHours < 48;
};

interface VideoPreviewProps {
  video: Video;
  onClick: () => void;
  className?: string;
  isLong?: boolean;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ video, onClick, className, isLong }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stats = useMemo(() => getDeterministicStats(video.video_url), [video.video_url]);
  const isNew = useMemo(() => isRecentVideo(video), [video.created_at]);

  useEffect(() => { 
    const v = videoRef.current;
    if (!v) return;
    
    const playVideo = () => {
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // تجاهل الأخطاء الناتجة عن التغيير السريع في DOM
        });
      }
    };

    playVideo();
    
    const handleTimeUpdate = () => {
      if (v.currentTime >= 5) {
        v.currentTime = 0;
      }
    };
    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.pause();
    };
  }, [video.video_url]);

  return (
    <div onClick={onClick} className={`relative overflow-hidden cursor-pointer group bg-neutral-900 border border-white/5 transition-all active:scale-95 ${className}`}>
      <video ref={videoRef} src={video.video_url} muted autoPlay loop playsInline preload="auto" className="w-full h-full object-cover transition-transform group-hover:scale-110 relative z-10" />
      
      {/* ملصق "جديد" احترافي */}
      {isNew && (
        <div className="absolute top-2 right-2 z-30 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)] border border-red-400 animate-pulse">
          جديد
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent p-3 flex flex-col justify-end z-20">
        <p className="text-[10px] font-bold text-white line-clamp-2 text-right">{video.title || "الحديقة المرعبة"}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              {formatBigNumber(stats.likes)}
            </span>
            <span className="text-[9px] text-blue-400 font-bold flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              {formatBigNumber(stats.views)}
            </span>
          </div>
          {isLong && <span className="text-[8px] bg-red-600 px-1 py-0.5 rounded text-white font-black shadow-lg">LONG</span>}
        </div>
      </div>
    </div>
  );
};

interface DraggableMarqueeProps {
  videos: (Video & { progress: number })[];
  onPlay: (v: Video) => void;
}

const DraggableMarquee: React.FC<DraggableMarqueeProps> = ({ videos, onPlay }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const animationRef = useRef<number>(0);
  const interactionTimer = useRef<any>(null);

  const displayVideos = useMemo(() => {
    const map = new Map();
    videos.forEach(v => map.set(v.id || v.video_url, v));
    return Array.from(map.values());
  }, [videos]);

  const step = () => {
    if (!isInteracting && scrollRef.current && displayVideos.length > 1) {
      scrollRef.current.scrollLeft -= 0.6;
      const maxScroll = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
      if (Math.abs(scrollRef.current.scrollLeft) >= maxScroll) {
         scrollRef.current.scrollLeft = 0;
      }
    }
    animationRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isInteracting, displayVideos]);

  const handleInteractionStart = () => {
    setIsInteracting(true);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
  };

  const handleInteractionEnd = () => {
    interactionTimer.current = setTimeout(() => {
      setIsInteracting(false);
    }, 2000);
  };

  return (
    <div 
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto scrollbar-hide select-none cursor-grab active:cursor-grabbing px-4 pb-4"
      onPointerDown={handleInteractionStart}
      onPointerUp={handleInteractionEnd}
      onPointerLeave={handleInteractionEnd}
      style={{ direction: 'rtl' }}
    >
      {displayVideos.map((video, i) => (
        <div 
          key={`${video.id || video.video_url}-${i}`} 
          onClick={() => onPlay(video)}
          className="flex-shrink-0 w-64 pointer-events-auto"
        >
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl mb-2 aspect-video bg-black">
            <video 
              src={video.video_url} 
              muted loop playsInline autoPlay preload="auto"
              className="w-full h-full object-cover opacity-80 pointer-events-none relative z-10" 
              onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime >= 5) e.currentTarget.currentTime = 0;
              }}
              onLoadedMetadata={(e) => {
                const playPromise = e.currentTarget.play();
                if (playPromise !== undefined) playPromise.catch(() => {});
              }}
            />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
              <div className="h-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,1)]" style={{ width: `${video.progress * 100}%` }}></div>
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-300 truncate text-right px-1">{video.title}</p>
        </div>
      ))}
    </div>
  );
};

interface MainContentProps {
  videos: Video[];
  interactions: UserInteractions;
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video, autoNext?: boolean) => void;
  onViewUnwatched: () => void;
  loading: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ videos, interactions, onPlayShort, onPlayLong, onViewUnwatched, loading }) => {
  const unwatchedVideos = useMemo(() => {
    const uniqueMap = new Map();
    [...interactions.watchHistory].forEach(h => {
      const video = videos.find(v => (v.id === h.id || v.video_url === h.id));
      if (video && h.progress > 0.05 && h.progress < 0.95) {
        uniqueMap.set(video.id || video.video_url, { ...video, progress: h.progress });
      }
    });
    return Array.from(uniqueMap.values()).reverse() as (Video & { progress: number })[];
  }, [videos, interactions.watchHistory]);

  const dislikedIds = useMemo(() => new Set(interactions.dislikedIds), [interactions.dislikedIds]);

  // استخراج الفيديوهات وتقسيمها لمجموعات بناءً على الطلب:
  // 1. 4 شورتس
  // 2. مكمل رعب (إذا وجد)
  // 3. 4 فيديوهات طويلة
  // 4. 4 شورتس إضافية
  // 5. 4 فيديوهات طويلة إضافية
  const allShorts = useMemo(() => videos.filter(v => v.type === 'short' && !dislikedIds.has(v.id || v.video_url)), [videos, dislikedIds]);
  const allLongs = useMemo(() => videos.filter(v => v.type === 'long' && !dislikedIds.has(v.id || v.video_url)), [videos, dislikedIds]);

  const shortGroups = [allShorts.slice(0, 4), allShorts.slice(4, 8)];
  const longGroups = [allLongs.slice(0, 4), allLongs.slice(4, 8)];

  if (loading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-bold animate-pulse text-center text-sm">تفتح أبواب الحديقة...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pb-32">
      {/* 1. المجموعة الأولى من الشورتس */}
      <section className="mt-2">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className="relative">
            <div className="absolute inset-0 bg-red-600 rounded-full blur-[8px] opacity-40"></div>
            <img src="https://i.top4top.io/p_3643ksmii1.jpg" alt="Logo" className="relative w-8 h-8 rounded-full border border-red-600 object-cover" />
          </div>
          <h2 className="text-xl font-black text-red-600 italic tracking-tighter">الحديقة المرعبة</h2>
          <div className="flex-grow h-[1px] bg-gradient-to-l from-red-600/30 to-transparent"></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {shortGroups[0].map((video) => (
            <VideoPreview key={video.id || video.video_url} video={video} onClick={() => onPlayShort(video, allShorts)} className="aspect-[9/16] rounded-2xl shadow-lg shadow-black/50" />
          ))}
        </div>
      </section>

      {/* 2. قسم مكمل رعب */}
      {unwatchedVideos.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]"></div>
              <h2 className="text-lg font-black text-white italic">مكمل رعب</h2>
            </div>
            <button onClick={onViewUnwatched} className="text-[10px] font-bold text-yellow-500/60 hover:text-yellow-500 transition-colors">عرض الكل</button>
          </div>
          <DraggableMarquee videos={unwatchedVideos} onPlay={(video) => video.type === 'short' ? onPlayShort(video, allShorts) : onPlayLong(video, true)} />
        </section>
      )}

      {/* 3. المجموعة الأولى من الفيديوهات الطويلة */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-6 px-1">
          <div className="w-1.5 h-6 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]"></div>
          <h2 className="text-xl font-black text-white">سلاسل الحديقة</h2>
        </div>
        <div className="flex flex-col gap-6">
          {longGroups[0].map((video) => (
             <div key={video.id || video.video_url} onClick={() => onPlayLong(video, true)} className="bg-neutral-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden active:scale-[0.98] transition-all shadow-2xl">
              <div className="relative aspect-video w-full bg-black">
                <video src={video.video_url} muted autoPlay loop playsInline preload="auto" className="w-full h-full object-cover relative z-10" />
                
                {/* ملصق "جديد" احترافي للطويل */}
                {isRecentVideo(video) && (
                   <div className="absolute top-5 left-5 bg-red-600/90 backdrop-blur-lg text-[10px] px-3 py-1 rounded-full font-black text-white shadow-xl z-20 border border-red-400">جديد</div>
                )}
              </div>
              <div className="p-6 flex items-center justify-between z-20 bg-[#0f0f0f]/80 backdrop-blur-sm">
                <h3 className="text-base font-bold line-clamp-1 text-right">{video.title}</h3>
                <div className="flex items-center gap-4 text-[11px] font-black">
                   {(() => {
                      const stats = getDeterministicStats(video.video_url);
                      return (
                        <>
                          <span className="flex items-center gap-1.5 text-red-500"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>{formatBigNumber(stats.likes)}</span>
                          <span className="flex items-center gap-1.5 text-blue-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>{formatBigNumber(stats.views)}</span>
                        </>
                      );
                   })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. المجموعة الثانية من الشورتس */}
      {shortGroups[1].length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-6 px-1">
            <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]"></div>
            <h2 className="text-xl font-black text-white italic">لقطات إضافية</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {shortGroups[1].map((video) => (
              <VideoPreview key={video.id || video.video_url} video={video} onClick={() => onPlayShort(video, allShorts)} className="aspect-[9/16] rounded-2xl shadow-lg shadow-black/50" />
            ))}
          </div>
        </section>
      )}

      {/* 5. المجموعة الثانية من الفيديوهات الطويلة */}
      {longGroups[1].length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-6 px-1">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"></div>
            <h2 className="text-xl font-black text-white italic">سلاسل غامضة</h2>
          </div>
          <div className="flex flex-col gap-6">
            {longGroups[1].map((video) => (
               <div key={video.id || video.video_url} onClick={() => onPlayLong(video, true)} className="bg-neutral-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden active:scale-[0.98] transition-all shadow-2xl">
                <div className="relative aspect-video w-full bg-black">
                  <video src={video.video_url} muted autoPlay loop playsInline preload="auto" className="w-full h-full object-cover relative z-10" />
                  {isRecentVideo(video) && (
                   <div className="absolute top-5 left-5 bg-red-600/90 backdrop-blur-lg text-[10px] px-3 py-1 rounded-full font-black text-white shadow-xl z-20 border border-red-400">جديد</div>
                  )}
                </div>
                <div className="p-6 flex items-center justify-between z-20 bg-[#0f0f0f]/80 backdrop-blur-sm">
                  <h3 className="text-base font-bold line-clamp-1 text-right">{video.title}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MainContent;
