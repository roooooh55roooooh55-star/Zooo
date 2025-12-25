
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Video, UserInteractions } from '../types.ts';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

export const getDeterministicStats = (url: string) => {
  let hash = 0;
  if (!url) return { likes: 0, views: 0 };
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

const LiveThumbnail: React.FC<{ url: string, isShort?: boolean, className?: string, isGlobalPlayerOpen?: boolean }> = ({ url, isShort, className, isGlobalPlayerOpen }) => {
  // إذا كان هناك فيديو يعمل حالياً، نمنع تحميل أي مصغرات تماماً لتوفير الأداء للفيديو النشط
  if (isGlobalPlayerOpen) return <div className={`bg-black/40 ${className}`} />;

  return (
    <video 
      src={url} muted autoPlay loop playsInline preload="none"
      className={`w-full h-full object-cover bg-black ${className}`}
    />
  );
};

const InteractiveMarquee: React.FC<{ 
  videos: Video[], 
  onPlay: (v: Video) => void, 
  progressMap?: Map<string, number>,
  direction: 'ltr' | 'rtl',
  isGlobalPlayerOpen?: boolean
}> = ({ videos, onPlay, progressMap, direction, isGlobalPlayerOpen }) => {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return [...videos, ...videos, ...videos]; 
  }, [videos]);

  if (displayVideos.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden py-2"
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        ref={scrollRef}
        className={`flex gap-3 px-2 ${direction === 'rtl' ? 'animate-marquee-r-to-l' : 'animate-marquee-l-to-r'}`}
        style={{ 
          animationPlayState: isPaused ? 'paused' : 'running',
          animationDuration: `${Math.max(videos.length * 6, 25)}s`
        }}
      >
        {displayVideos.map((video, i) => {
          const id = video.id || video.video_url;
          const progress = progressMap?.get(id) || 0;
          return (
            <div key={`${id}-${i}`} onClick={() => onPlay(video)} className="flex-shrink-0 w-40 active:scale-95 transition-all cursor-pointer group">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-lg ring-1 ring-white/5 group-hover:ring-red-600/30 transition-all">
                <LiveThumbnail url={video.video_url} isGlobalPlayerOpen={isGlobalPlayerOpen} />
                {progress > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                    <div className="h-full bg-red-600 shadow-[0_0_5px_red]" style={{ width: `${progress * 100}%` }}></div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const LionNeonIcon: React.FC<{ status: 'idle' | 'downloading' | 'cached', onClick: () => void }> = ({ status, onClick }) => {
  const color = status === 'cached' ? '#22c55e' : (status === 'downloading' ? '#eab308' : '#ef4444');
  const shadow = status === 'cached' ? 'rgba(34,197,94,0.6)' : (status === 'downloading' ? 'rgba(234,179,8,0.6)' : 'rgba(239,68,68,0.6)');

  return (
    <button 
      onClick={onClick}
      className={`w-10 h-10 bg-black border-2 rounded-full p-2 transition-all duration-700 active:scale-75 shadow-[0_0_15px_var(--shadow)] ${status === 'downloading' ? 'animate-pulse' : ''}`}
      style={{ borderColor: color, '--shadow': shadow } as any}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" opacity="0.1"/>
        <path d="M7 10c0-2.5 1-4 5-4s5 1.5 5 4"/>
        <path d="M9 13c-1.5 0-2 1-2 2.5s1 2.5 2 2.5h6c1.5 0 2-1 2-2.5s-1-2.5-2-2.5"/>
        <path d="M12 11v2"/>
        <circle cx="10" cy="9" r="0.5" fill={color}/>
        <circle cx="14" cy="9" r="0.5" fill={color}/>
      </svg>
    </button>
  );
};

interface MainContentProps {
  videos: Video[];
  categoriesList: string[];
  interactions: UserInteractions;
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video, list: Video[]) => void;
  onResetHistory: () => void;
  onHardReset?: () => void;
  loading: boolean;
  onShowToast?: (msg: string) => void;
  isGlobalPlayerOpen?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onResetHistory, onHardReset, loading, onShowToast, isGlobalPlayerOpen
}) => {
  const [startY, setStartY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'downloading' | 'cached'>(() => {
    return localStorage.getItem('al-hadiqa-offline-ready') === 'true' ? 'cached' : 'idle';
  });

  const filteredVideos = useMemo(() => {
    // استبعاد الفيديوهات التي تم التفاعل معها (إعجاب أو ديسكلايك) من الصفحة الرئيسية
    const excludedIds = [...interactions.dislikedIds, ...interactions.likedIds];
    return videos.filter(v => !excludedIds.includes(v.id || v.video_url));
  }, [videos, interactions.dislikedIds, interactions.likedIds]);

  const shorts = useMemo(() => filteredVideos.filter(v => v.type === 'short'), [filteredVideos]);
  const longs = useMemo(() => filteredVideos.filter(v => v.type === 'long'), [filteredVideos]);

  const unwatchedVideos = useMemo(() => {
    return interactions.watchHistory
      .filter(h => h.progress > 0.05 && h.progress < 0.9)
      .map(h => videos.find(v => (v.id === h.id || v.video_url === h.id)))
      .filter(Boolean) as Video[];
  }, [interactions.watchHistory, videos]);

  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    interactions.watchHistory.forEach(h => map.set(h.id, h.progress));
    return map;
  }, [interactions.watchHistory]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [searchQuery, videos]);

  const handleTouchStart = (e: React.TouchEvent) => setStartY(e.touches[0].pageY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && e.touches[0].pageY - startY > 150 && !refreshing) {
      setRefreshing(true);
      onResetHistory();
      if (onShowToast) onShowToast("استحضار أرواح جديدة...");
      setTimeout(() => setRefreshing(false), 1500);
    }
  };

  const triggerHardReset = () => {
    setIsFlashing(true);
    // مسح الكاش وتحديث القائمة
    if (onHardReset) onHardReset();
    if (onShowToast) onShowToast("تم مسح الكاش وتجديد الرعب");
    setTimeout(() => setIsFlashing(false), 800);
  };

  const toggleOfflineCache = async () => {
    if (cacheStatus === 'cached') {
      const cache = await caches.open('hadiqa-video-cache');
      const keys = await cache.keys();
      for (const key of keys) await cache.delete(key);
      setCacheStatus('idle');
      localStorage.removeItem('al-hadiqa-offline-ready');
      if (onShowToast) onShowToast("تم مسح الكاش");
      return;
    }

    setCacheStatus('downloading');
    if (onShowToast) onShowToast("جاري التحميل...");
    try {
      const cache = await caches.open('hadiqa-video-cache');
      const videosToCache = videos.slice(0, 10);
      for (const v of videosToCache) {
        try { await cache.add(v.video_url); } catch (e) {}
      }
      setCacheStatus('cached');
      localStorage.setItem('al-hadiqa-offline-ready', 'true');
      if (onShowToast) onShowToast("جاهز بدون إنترنت");
    } catch (err) {
      setCacheStatus('idle');
    }
  };

  return (
    <div 
      className="flex flex-col gap-6 pb-40 pt-1" 
      dir="rtl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {refreshing && <div className="loading-indicator"></div>}

      <section className="flex items-center justify-between px-6 pb-2 -mt-6 border-b border-white/5">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={triggerHardReset}
        >
          <div className={`relative rounded-full p-0.5 border-2 transition-all duration-500 ${isFlashing ? 'border-yellow-500 shadow-[0_0_20px_#eab308]' : 'border-red-600 shadow-[0_0_10px_red]'}`}>
            <img src={LOGO_URL} className="w-10 h-10 rounded-full object-cover" />
          </div>
          <div className="flex flex-col">
             <h1 className={`text-[15px] font-black italic whitespace-nowrap leading-tight transition-all duration-500 ${isFlashing ? 'text-yellow-500 scale-105' : 'text-red-600'}`}>الحديقة المرعبة</h1>
             <span className="text-[6px] text-gray-600 font-bold uppercase tracking-[0.2em]">Horror Garden Collection</span>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
           <button 
             onClick={() => setIsSearchOpen(true)}
             className="w-10 h-10 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-gray-400 active:scale-75 transition-all hover:border-red-600 hover:text-red-600"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
           </button>
        </div>
        
        <LionNeonIcon status={cacheStatus} onClick={toggleOfflineCache} />
      </section>

      {isSearchOpen && (
        <div className="fixed inset-0 z-[1200] bg-black/98 backdrop-blur-3xl flex flex-col p-6 animate-in fade-in duration-300">
           <div className="flex items-center gap-4 mb-8">
              <input 
                type="text" autoFocus placeholder="ابحث عن كابوس..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-red-600"
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-red-600 font-black">إغلاق</button>
           </div>
           <div className="flex-grow overflow-y-auto space-y-3">
              {searchResults.map(v => (
                <div key={v.id} onClick={() => { v.type === 'short' ? onPlayShort(v, videos) : onPlayLong(v, videos); setIsSearchOpen(false); }} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl active:bg-red-600/20 transition-all border border-transparent hover:border-red-600/20">
                   <div className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                      <video src={v.video_url} className="w-full h-full object-cover opacity-60" />
                   </div>
                   <p className="text-sm font-bold text-white line-clamp-2">{v.title}</p>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* قسم الشورتس فقط */}
      <section className="px-4 -mt-2">
        <h2 className="text-sm font-black text-gray-400 mb-4 pr-3 border-r-2 border-red-600">كوابيس خاطفة (Shorts)</h2>
        <div className="grid grid-cols-2 gap-3">
          {shorts.slice(0, 4).map(v => (
            <div key={v.id} onClick={() => onPlayShort(v, shorts)} className="aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 shadow-lg bg-neutral-900 active:scale-95 transition-all cursor-pointer relative group">
              <LiveThumbnail url={v.video_url} isShort isGlobalPlayerOpen={isGlobalPlayerOpen} className="group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 right-3 left-3 text-right">
                <p className="text-white text-[10px] font-black line-clamp-1">{v.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {unwatchedVideos.length > 0 && (
        <section className="-mt-1">
          <div className="px-6 mb-1 flex items-center gap-2">
             <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></span>
             <h2 className="text-[9px] font-black text-white/40 italic uppercase tracking-widest">متابعة المشاهدة</h2>
          </div>
          <InteractiveMarquee videos={unwatchedVideos} onPlay={(v) => v.type === 'short' ? onPlayShort(v, unwatchedVideos) : onPlayLong(v, unwatchedVideos)} progressMap={progressMap} direction="rtl" isGlobalPlayerOpen={isGlobalPlayerOpen} />
        </section>
      )}

      {/* قسم مخصص للأفلام الطويلة فقط */}
      <section className="px-4 space-y-6 pt-6 border-t border-white/5 bg-gradient-to-b from-red-600/5 to-transparent rounded-t-[3rem]">
        <div className="flex flex-col items-center mb-8">
           <h2 className="text-xl font-black text-white italic tracking-tighter">أفلام الرعب الكاملة</h2>
           <div className="h-0.5 w-16 bg-red-600 mt-2 rounded-full shadow-[0_0_15px_red]"></div>
        </div>
        <div className="flex flex-col gap-6">
          {longs.slice(0, 12).map(video => (
            <div key={video.id} onClick={() => onPlayLong(video, longs)} className="relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl active:scale-[0.98] transition-all cursor-pointer group bg-black">
              <LiveThumbnail url={video.video_url} isGlobalPlayerOpen={isGlobalPlayerOpen} className="opacity-90 group-hover:scale-105 transition-transform duration-[12s]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10"></div>
              <div className="absolute bottom-6 right-6 text-right left-6">
                <span className="text-[7px] text-red-500 font-black uppercase tracking-[0.2em] bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-red-600/20 mb-2 inline-block">{video.category}</span>
                <h3 className="text-white font-black text-lg drop-shadow-[0_2px_5px_black] leading-tight">{video.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* أرشيف اللقطات الخاطفة (إضافي) */}
      <section className="px-4 py-8 bg-black/30 border-t border-white/5">
        <h2 className="text-lg font-black text-white italic mb-4 border-r-4 border-red-600 pr-3 mr-2 opacity-80">أرشيف اللقطات الخاطفة</h2>
        <div className="grid grid-cols-2 gap-3">
          {shorts.slice(4, 12).map(v => (
            <div key={v.id} onClick={() => onPlayShort(v, shorts)} className="aspect-[9/16] rounded-3xl overflow-hidden border border-white/5 bg-neutral-950 active:scale-95 transition-all cursor-pointer relative group">
              <LiveThumbnail url={v.video_url} isGlobalPlayerOpen={isGlobalPlayerOpen} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 right-3 left-3">
                <p className="text-white text-[9px] font-bold line-clamp-1">{v.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default MainContent;
