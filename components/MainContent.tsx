
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Video, UserInteractions } from '../types.ts';

export const getDeterministicStats = (url: string) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = url.charCodeAt(i) + ((hash << 5) - hash);
  const viewsSeed = (Math.abs(hash % 85) + 10) * 1000000 + (Math.abs(hash % 900) * 1000);
  const likesSeed = (Math.abs(hash % 8) + 1) * 1000000 + (Math.abs(hash % 800) * 1000);
  return { likes: likesSeed, views: viewsSeed };
};

export const formatBigNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const checkStatus = (video: Video, interactions: UserInteractions) => {
  const vidId = video.id || video.video_url;
  const isWatched = interactions.watchHistory.some(h => h.id === vidId && h.progress > 0.1);
  const isRecent = video.created_at ? (new Date().getTime() - new Date(video.created_at).getTime()) / (1000 * 60 * 60) < 48 : false;
  return { isNew: !isWatched || isRecent };
};

interface VideoPreviewProps {
  video: Video;
  interactions: UserInteractions;
  onClick: () => void;
  className?: string;
  isLong?: boolean;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ video, interactions, onClick, className, isLong }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stats = useMemo(() => getDeterministicStats(video.video_url), [video.video_url]);
  const { isNew } = useMemo(() => checkStatus(video, interactions), [video, interactions.watchHistory]);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          timerRef.current = window.setTimeout(() => setShouldPlay(true), 600);
        } else {
          if (timerRef.current) clearTimeout(timerRef.current);
          setShouldPlay(false);
        }
      },
      { threshold: 0.6 }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => { 
    const v = videoRef.current;
    if (!v) return;
    v.muted = true; v.playsInline = true;
    if (shouldPlay && isVisible) v.play().catch(() => {});
    else { v.pause(); if (!isVisible) v.currentTime = 0; }
    
    const handleReady = () => setIsReady(true);
    v.addEventListener('loadeddata', handleReady);
    return () => v.removeEventListener('loadeddata', handleReady);
  }, [shouldPlay, isVisible]);

  return (
    <div onClick={onClick} className={`relative overflow-hidden cursor-pointer group bg-neutral-900 border border-white/5 transition-all active:scale-95 duration-500 animate-in fade-in zoom-in-95 ${className}`}>
      <video ref={videoRef} src={video.video_url} muted playsInline preload="metadata" className={`w-full h-full object-cover relative z-10 transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-40'}`} />
      
      {isNew && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1 animate-pulse">
           <div className="bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-[0_0_15px_#ff0000] border border-red-400/50 uppercase tracking-tighter">جديد</div>
           <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_10px_red]"></div>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent p-3 flex flex-col justify-end z-20">
        <p className={`font-bold text-white line-clamp-1 text-right ${isLong ? 'text-sm' : 'text-[10px]'}`}>{video.title}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-red-500 font-black">{formatBigNumber(stats.likes)}</span>
            <span className="text-[9px] text-blue-400 font-black">{formatBigNumber(stats.views)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScaryNeonLion = ({ colorClass }: { colorClass: string }) => (
  <svg viewBox="0 0 100 100" className={`w-12 h-12 filter drop-shadow-[0_0_12px_rgba(var(--neon-rgb),0.8)] ${colorClass}`}>
    <path d="M50 5 L65 20 L85 15 L80 35 L95 50 L80 65 L85 85 L65 80 L50 95 L35 80 L15 85 L20 65 L5 50 L20 35 L15 15 L35 20 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M35 40 Q50 30 65 40 Q70 60 50 75 Q30 60 35 40" fill="rgba(0,0,0,0.5)" stroke="currentColor" strokeWidth="2" />
    <circle cx="42" cy="50" r="3" fill="currentColor" className="animate-pulse" />
    <circle cx="58" cy="50" r="3" fill="currentColor" className="animate-pulse" />
    <path d="M40 75 Q50 85 60 75" fill="none" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);

const DraggableMarquee: React.FC<{ videos: Video[], interactions: UserInteractions, onPlay: (v: Video) => void, progressMap?: Map<string, number>, autoAnimate?: boolean, reverse?: boolean }> = ({ videos, interactions, onPlay, progressMap, autoAnimate, reverse }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const displayVideos = useMemo(() => {
    if (videos.length === 0) return [];
    if (!autoAnimate) return videos;
    return [...videos, ...videos];
  }, [videos, autoAnimate]);

  const animationDuration = useMemo(() => {
    const baseDuration = 12;
    const count = videos.length || 1;
    return Math.max(8, (count / 10) * baseDuration);
  }, [videos.length]);

  return (
    <div 
      className={`relative marquee-container w-full overflow-hidden scroll-smooth`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div 
        ref={scrollRef}
        style={{ animationDuration: `${animationDuration}s`, animationPlayState: isPaused ? 'paused' : 'running' }}
        className={`flex gap-4 pb-4 px-2 ${autoAnimate ? (reverse ? 'animate-marquee-l-to-r' : 'animate-marquee-r-to-l') : 'overflow-x-auto scrollbar-hide'}`}
      >
        {displayVideos.map((v, i) => {
          const id = v.id || v.video_url;
          const progress = progressMap?.get(id) || 0;
          const { isNew } = checkStatus(v, interactions);
          return (
            <div key={`${id}-${i}`} onClick={() => onPlay(v)} className="flex-shrink-0 w-36 active:scale-95 transition-all group relative">
              <div className={`relative rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 aspect-video shadow-[0_0_15px_rgba(255,255,255,0.05)]`}>
                <video src={v.video_url} muted playsInline preload="metadata" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                {isNew && <div className="absolute top-2 right-2 z-30 w-2 h-2 bg-red-600 rounded-full shadow-[0_0_8px_red] animate-pulse"></div>}
                {progress > 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20"><div className="h-full bg-red-600 shadow-[0_0_8px_red]" style={{ width: `${progress * 100}%` }}></div></div>}
              </div>
              <p className="text-[10px] font-black mt-2 line-clamp-1 px-1 text-gray-400 group-hover:text-white transition-colors text-right">{v.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface MainContentProps {
  videos: Video[];
  interactions: UserInteractions;
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video, list: Video[], autoNext?: boolean) => void;
  onViewUnwatched: () => void;
  onResetHistory: () => void;
  onTurboCache: () => void;
  cacheStatus: 'idle' | 'caching' | 'done';
  loading: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ videos, interactions, onPlayShort, onPlayLong, onViewUnwatched, onResetHistory, onTurboCache, cacheStatus, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // تصفية الفيديوهات بناءً على البحث
  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    return videos.filter(v => 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.category.includes(searchQuery)
    );
  }, [videos, searchQuery]);

  const categories = useMemo(() => {
    return {
      'رعب حقيقي': filteredVideos.filter(v => v.category === 'رعب حقيقي'),
      'قصص رعب': filteredVideos.filter(v => v.category === 'قصص رعب'),
      'غموض': filteredVideos.filter(v => v.category === 'غموض'),
      'ما وراء الطبيعة': filteredVideos.filter(v => v.category === 'ما وراء الطبيعة'),
      'أرشيف المطور': filteredVideos.filter(v => v.category === 'أرشيف المطور'),
    };
  }, [filteredVideos]);

  const unwatchedHistoryMap = useMemo(() => {
    const map = new Map<string, number>();
    interactions.watchHistory.forEach(h => { if (h.progress > 0.05 && h.progress < 0.95) map.set(h.id, h.progress); });
    return map;
  }, [interactions.watchHistory]);

  const continueWatchingVideos = useMemo(() => {
    const list: Video[] = [];
    unwatchedHistoryMap.forEach((_, id) => {
      const v = videos.find(vid => (vid.id === id || vid.video_url === id));
      if (v) list.push(v);
    });
    return list.reverse();
  }, [videos, unwatchedHistoryMap]);

  if (loading && videos.length === 0) return (
    <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_red]"></div>
      <p className="text-gray-500 font-bold mt-6 text-xs animate-pulse italic tracking-widest">تتجسد الأرواح...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 pb-2">
      {/* 1. رأس الصفحة والبحث */}
      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <div onClick={onResetHistory} className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-all">
            <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red] object-cover" />
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-red-600 italic leading-none">الحديقة المرعبة</h2>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Shuffle The Spirits</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isSearchOpen ? (
              <div className="flex items-center bg-white/5 border border-red-600/30 rounded-xl px-3 py-1 animate-in slide-in-from-left-4 duration-300">
                <input 
                  autoFocus
                  className="bg-transparent outline-none text-xs text-white w-24 text-right"
                  placeholder="ابحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => !searchQuery && setIsSearchOpen(false)}
                />
                <button onClick={() => setIsSearchOpen(false)} className="text-gray-500 mr-2">✕</button>
              </div>
            ) : (
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-red-500 shadow-[0_0_10px_rgba(220,38,38,0.2)] active:scale-75 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </button>
            )}
            
            <button onClick={onTurboCache} className="relative group transition-all active:scale-75 flex flex-col items-center">
               <ScaryNeonLion colorClass={cacheStatus === 'done' ? 'text-green-500' : 'text-red-600'} />
            </button>
          </div>
        </div>
      </section>

      {/* 2. واصل الارتعاش */}
      {continueWatchingVideos.length > 0 && !searchQuery && (
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-black text-white italic leading-none">واصل الارتعاش</h2>
            <button onClick={onViewUnwatched} className="text-[10px] text-yellow-500 font-black">عرض الكل</button>
          </div>
          <DraggableMarquee 
            videos={continueWatchingVideos} 
            interactions={interactions} 
            onPlay={(v) => v.type === 'short' ? onPlayShort(v, videos) : onPlayLong(v, videos, true)} 
            progressMap={unwatchedHistoryMap}
            autoAnimate={true}
            reverse={true} 
          />
        </section>
      )}

      {/* 3. الأقسام المخصصة */}
      {Object.entries(categories).map(([name, list]) => (
        list.length > 0 && (
          <section key={name}>
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className={`w-2.5 h-8 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] ${
                name === 'رعب حقيقي' ? 'bg-red-600' : 
                name === 'قصص رعب' ? 'bg-purple-600' :
                name === 'غموض' ? 'bg-blue-600' :
                name === 'ما وراء الطبيعة' ? 'bg-green-600' : 'bg-orange-600'
              }`}></div>
              <h2 className="text-xl font-black text-white italic leading-none">{name}</h2>
            </div>
            <DraggableMarquee 
              videos={list} 
              interactions={interactions} 
              onPlay={(v) => v.type === 'short' ? onPlayShort(v, list) : onPlayLong(v, list, true)} 
              autoAnimate={true}
              reverse={name.length % 2 === 0}
            />
          </section>
        )
      ))}

      <div className="h-[80px] w-full bg-transparent mb-12"></div>
    </div>
  );
};

export default MainContent;
