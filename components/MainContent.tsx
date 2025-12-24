
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

const isRecentVideo = (video: Video) => {
  if (!video.created_at) return false;
  const videoDate = new Date(video.created_at).getTime();
  return (new Date().getTime() - videoDate) / (1000 * 60 * 60) < 48;
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
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          // الحفاظ على الانترنت: لا يتم تشغيل الفيديو فوراً بل بعد 600ms من التوقف أمامه
          timerRef.current = window.setTimeout(() => {
            setShouldPlay(true);
          }, 600);
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
    v.muted = true; 
    v.playsInline = true;
    
    if (shouldPlay && isVisible) {
      v.play().catch(() => {});
    } else {
      v.pause();
      if (!isVisible) v.currentTime = 0;
    }

    const handleReady = () => setIsReady(true);
    const handleTimeUpdate = () => { if (v.currentTime >= 8) v.currentTime = 0; };
    
    v.addEventListener('loadeddata', handleReady);
    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      v.removeEventListener('loadeddata', handleReady);
      v.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [shouldPlay, isVisible, video.video_url]);

  return (
    <div onClick={onClick} className={`relative overflow-hidden cursor-pointer group bg-neutral-900 border border-white/5 transition-all active:scale-95 duration-500 animate-in fade-in zoom-in-95 ${className}`}>
      {/* عرض الصورة المصغرة (أول إطار) لتوفير البيانات والسرعة */}
      <video 
        ref={videoRef} 
        src={video.video_url} 
        muted 
        playsInline 
        preload="metadata" 
        className={`w-full h-full object-cover relative z-10 transition-opacity duration-700 ${isReady ? 'opacity-100' : 'opacity-40'}`} 
      />
      {!isReady && <div className="absolute inset-0 flex items-center justify-center z-0 bg-neutral-900 animate-pulse"><div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>}
      
      {isNew && (
        <div className="absolute top-3 right-3 z-30 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_red]">جديد</div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent p-3 flex flex-col justify-end z-20">
        <p className={`font-bold text-white line-clamp-1 text-right ${isLong ? 'text-sm' : 'text-[10px]'}`}>{video.title}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-red-500 font-black">{formatBigNumber(stats.likes)}</span>
            <span className="text-[9px] text-blue-400 font-black">{formatBigNumber(stats.views)}</span>
          </div>
          {isLong && <span className="text-[7px] bg-red-600 px-1 rounded text-white font-black">LONG</span>}
        </div>
      </div>
    </div>
  );
};

interface DraggableMarqueeProps {
  videos: Video[];
  onPlay: (v: Video) => void;
  progressMap?: Map<string, number>;
  autoAnimate?: boolean;
}

const DraggableMarquee: React.FC<DraggableMarqueeProps> = ({ videos, onPlay, progressMap, autoAnimate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const marqueeList = useMemo(() => autoAnimate ? [...videos, ...videos] : videos, [videos, autoAnimate]);

  return (
    <div className={`relative ${autoAnimate ? 'marquee-container overflow-hidden' : 'overflow-x-auto px-4'} pb-2`} style={{ direction: 'rtl' }}>
      <div 
        ref={scrollRef} 
        className={`flex gap-4 ${autoAnimate ? 'animate-marquee' : 'scrollbar-hide'}`}
      >
        {marqueeList.map((video, i) => {
          const prog = progressMap?.get(video.id || video.video_url) || 0;
          return (
            <div key={`${video.id || video.video_url}-${i}`} onClick={() => onPlay(video)} className="flex-shrink-0 w-56 group cursor-pointer">
              <div className="relative rounded-[2rem] overflow-hidden aspect-video bg-neutral-900 border border-white/10 shadow-xl transition-all group-active:scale-95 group-hover:border-red-500/30">
                {/* استخدام الفيديو كصورة مصغرة صامتة وغير متحركة لتوفير البيانات ومنع تقطيع الفيديو الرئيسي */}
                <video 
                  src={video.video_url} 
                  muted 
                  playsInline 
                  preload="metadata" 
                  className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                {prog > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div className="h-full bg-red-600 shadow-[0_0_8px_red]" style={{ width: `${prog * 100}%` }}></div>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-black text-gray-300 truncate mt-2 text-right px-2 group-hover:text-white transition-colors">{video.title}</p>
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

const MainContent: React.FC<MainContentProps> = ({ 
  videos, interactions, onPlayShort, onPlayLong, onViewUnwatched, onResetHistory, onTurboCache, cacheStatus, loading 
}) => {
  const watchedIds = useMemo(() => new Set(interactions.watchHistory.map(h => h.id)), [interactions.watchHistory]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  };

  const getSmartFilledListRandom = (pool: Video[], count: number) => {
    const unwatched = pool.filter(v => !watchedIds.has(v.id || v.video_url));
    const shuffledUnwatched = shuffleArray(unwatched);
    if (shuffledUnwatched.length >= count) return shuffledUnwatched.slice(0, count);
    const watched = pool.filter(v => watchedIds.has(v.id || v.video_url));
    const shuffledWatched = shuffleArray(watched);
    return [...shuffledUnwatched, ...shuffledWatched.slice(0, count - shuffledUnwatched.length)];
  };

  const unwatchedHistoryMap = useMemo(() => {
    const map = new Map<string, number>();
    interactions.watchHistory.forEach(h => {
      if (h.progress > 0.05 && h.progress < 0.95) map.set(h.id, h.progress);
    });
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

  const allShorts = useMemo(() => videos.filter(v => v.type === 'short'), [videos]);
  const allLongs = useMemo(() => videos.filter(v => v.type === 'long'), [videos]);

  const latestShorts = useMemo(() => getSmartFilledListRandom(allShorts, 4), [allShorts, watchedIds]);
  const featuredLongs = useMemo(() => getSmartFilledListRandom(allLongs, 4), [allLongs, watchedIds]);

  const undiscoveredShorts = useMemo(() => {
    const latestIds = new Set(latestShorts.map(v => v.id || v.video_url));
    const pool = allShorts.filter(v => !latestIds.has(v.id || v.video_url));
    return getSmartFilledListRandom(pool, 4);
  }, [allShorts, latestShorts, watchedIds]);

  const remainingLongs = useMemo(() => {
    const featuredIds = new Set(featuredLongs.map(v => v.id || v.video_url));
    return shuffleArray(allLongs.filter(v => !featuredIds.has(v.id || v.video_url)));
  }, [allLongs, featuredLongs]);

  if (loading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold mt-4 text-sm animate-pulse italic">جاري جرد الحديقة...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-14 pb-4">
      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <div onClick={onResetHistory} className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-all">
            <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red] object-cover group-hover:shadow-[0_0_25px_red] transition-shadow" />
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-red-600 italic leading-none group-hover:text-red-500">الحديقة المرعبة</h2>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Tap to Sync Feed</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center pr-2">
            <button 
              onClick={onTurboCache}
              className="relative group transition-all active:scale-75"
              aria-label="Turbo Cache Orb"
            >
               <div className={`absolute -inset-3 rounded-full blur-xl transition-all duration-1000 opacity-70 ${
                 cacheStatus === 'done' ? 'bg-green-500 shadow-[0_0_40px_#22c55e]' :
                 cacheStatus === 'caching' ? 'bg-amber-400 animate-pulse shadow-[0_0_50px_#facc15]' :
                 'bg-red-600 shadow-[0_0_25px_#dc2626]'
               }`}></div>

               <div className={`relative w-9 h-9 rounded-full border-2 transition-all duration-700 flex items-center justify-center shadow-inner ${
                 cacheStatus === 'done' ? 'bg-green-600 border-green-300' :
                 cacheStatus === 'caching' ? 'bg-amber-500 border-amber-200 animate-bounce' :
                 'bg-red-700 border-red-400'
               }`}>
                  <div className={`w-3.5 h-3.5 rounded-full blur-[0.5px] ${
                    cacheStatus === 'done' ? 'bg-green-100' :
                    cacheStatus === 'caching' ? 'bg-white' :
                    'bg-red-200'
                  }`}></div>
               </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {latestShorts.map((v) => <VideoPreview key={v.id || v.video_url} video={v} onClick={() => onPlayShort(v, allShorts)} className="aspect-[9/16] rounded-[2rem] shadow-2xl" />)}
        </div>
      </section>

      {continueWatchingVideos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex flex-col">
               <h2 className="text-lg font-black text-white italic leading-none">مكمل رعب</h2>
               <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Continue Watching</span>
            </div>
            <button onClick={onViewUnwatched} className="text-[10px] text-yellow-500 font-black border-b border-yellow-500/20">عرض الكل</button>
          </div>
          <DraggableMarquee videos={continueWatchingVideos} onPlay={(v) => v.type === 'short' ? onPlayShort(v, videos) : onPlayLong(v, allLongs, true)} progressMap={unwatchedHistoryMap} />
        </section>
      )}

      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-2.5 h-8 bg-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-white italic leading-none">سلاسل الحديقة</h2>
            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Featured Series</span>
          </div>
        </div>
        <div className="flex flex-col gap-8">
          {featuredLongs.map((v) => (
            <div key={v.id || v.video_url} className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/5 active:scale-95 transition-all shadow-2xl group">
              <VideoPreview video={v} onClick={() => onPlayLong(v, allLongs, true)} className="w-full h-full" isLong />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-red-600/30 backdrop-blur-md border border-red-500/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none">
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="w-2.5 h-8 bg-yellow-600 rounded-full shadow-[0_0_15px_yellow]"></div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-white italic leading-none">اكتشافات جديدة</h2>
            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Unwatched Shorts</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {undiscoveredShorts.map((v) => <VideoPreview key={v.id || v.video_url} video={v} onClick={() => onPlayShort(v, allShorts)} className="aspect-[9/16] rounded-[2rem] shadow-2xl" />)}
        </div>
      </section>

      {remainingLongs.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center gap-3 mb-6 px-1">
            <div className="w-2.5 h-8 bg-blue-600 rounded-full shadow-[0_0_15px_blue]"></div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-white italic leading-none">سلاسل إضافية</h2>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Explore More Series</span>
            </div>
          </div>
          <DraggableMarquee videos={remainingLongs} onPlay={(v) => onPlayLong(v, allLongs, true)} autoAnimate={true} />
        </section>
      )}
    </div>
  );
};

export default MainContent;
