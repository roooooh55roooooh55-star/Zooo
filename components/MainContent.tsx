
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Video, UserInteractions } from '../types.ts';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";
const LION_URL = "https://cdn-icons-png.flaticon.com/512/616/616412.png"; 

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

const LiveThumbnail: React.FC<{ url: string, isShort?: boolean, className?: string }> = ({ url, isShort, className }) => {
  return (
    <video 
      src={url} muted autoPlay loop playsInline preload="auto"
      className={`w-full h-full object-cover ${className}`}
    />
  );
};

const InteractiveMarquee: React.FC<{ 
  videos: Video[], 
  onPlay: (v: Video) => void, 
  progressMap?: Map<string, number>,
  direction: 'ltr' | 'rtl'
}> = ({ videos, onPlay, progressMap, direction }) => {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayVideos = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    return [...videos, ...videos, ...videos]; 
  }, [videos]);

  if (displayVideos.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden py-4"
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        ref={scrollRef}
        className={`flex gap-4 px-4 ${direction === 'rtl' ? 'animate-marquee-r-to-l' : 'animate-marquee-l-to-r'}`}
        style={{ 
          animationPlayState: isPaused ? 'paused' : 'running',
          animationDuration: `${Math.max(videos.length * 5, 20)}s`
        }}
      >
        {displayVideos.map((video, i) => {
          const id = video.id || video.video_url;
          const progress = progressMap?.get(id) || 0;
          return (
            <div key={`${id}-${i}`} onClick={() => onPlay(video)} className="flex-shrink-0 w-48 active:scale-95 transition-all cursor-pointer group">
              <div className="relative rounded-2xl overflow-hidden border border-red-600/40 bg-black aspect-video shadow-[0_0_15px_rgba(220,38,38,0.2)] group-hover:border-red-600 transition-colors">
                <LiveThumbnail url={video.video_url} />
                {progress > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div className="h-full bg-red-600 shadow-[0_0_8px_red]" style={{ width: `${progress * 100}%` }}></div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                   <p className="text-[10px] font-black text-white truncate w-full">{video.title}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
}

const MainContent: React.FC<MainContentProps> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onResetHistory, onHardReset, loading 
}) => {
  const [startY, setStartY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // تصفية الفيديوهات: إخفاء أي فيديو تم مشاهدة أكثر من 90% منه
  const filteredVideos = useMemo(() => {
    const watchedIds = interactions.watchHistory
      .filter(h => h.progress > 0.9)
      .map(h => h.id);
    return videos.filter(v => !watchedIds.includes(v.id || v.video_url));
  }, [videos, interactions.watchHistory]);

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

  // منطق سحب الشاشة للتحديث
  const handleTouchStart = (e: React.TouchEvent) => setStartY(e.touches[0].pageY);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && e.touches[0].pageY - startY > 150 && !refreshing) {
      setRefreshing(true);
      onResetHistory();
      setTimeout(() => setRefreshing(false), 1500);
    }
  };

  return (
    <div 
      className="flex flex-col gap-14 pb-40" 
      dir="rtl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* مؤشر التحديث */}
      {refreshing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-2 rounded-full font-black text-xs shadow-[0_0_20px_red] animate-bounce">
          جاري تجديد الرعب...
        </div>
      )}

      {/* هيدر ترحيبي */}
      <section className="flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onHardReset}>
          <img src={LOGO_URL} className="w-14 h-14 rounded-full border-2 border-red-600 shadow-[0_0_20px_red] group-active:scale-90 transition-all" />
          <div className="flex flex-col">
             <h1 className="text-2xl font-black text-white italic leading-none group-active:text-red-600">الحديقة المرعبة</h1>
             <span className="text-[9px] text-red-600 font-black uppercase tracking-[0.3em] mt-1">Horror Garden V4</span>
          </div>
        </div>
        <button onClick={onResetHistory} className="w-12 h-12 bg-black border-2 border-red-600 rounded-full p-2 animate-spin-slow shadow-[0_0_15px_rgba(220,38,38,0.3)]">
          <img src={LION_URL} className="w-full h-full object-contain" />
        </button>
      </section>

      {/* 1. أول 4 فيديوهات شورتس (2 بجانب بعض) */}
      <section className="px-4">
        <div className="flex items-center gap-2 mb-6 border-r-4 border-red-600 pr-3 mr-2">
           <h2 className="text-xl font-black text-white italic">لقطات خاطفة</h2>
           <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {shorts.slice(0, 4).map(v => (
            <div key={v.id} onClick={() => onPlayShort(v, shorts)} className="aspect-[9/16] rounded-3xl overflow-hidden border border-red-600/40 shadow-2xl bg-neutral-900 active:scale-95 transition-transform cursor-pointer relative group">
              <LiveThumbnail url={v.video_url} isShort className="group-hover:scale-110 transition-transform duration-[5s]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-[11px] font-black line-clamp-1">{v.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. كمل رعب (ماركي يمين لليسار) */}
      {unwatchedVideos.length > 0 && (
        <section className="bg-red-950/10 py-8 border-y border-red-600/20">
          <h2 className="text-lg font-black text-white mb-4 px-6 flex items-center gap-3 italic">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            كمل رعب...
          </h2>
          <InteractiveMarquee videos={unwatchedVideos} onPlay={(v) => v.type === 'short' ? onPlayShort(v, unwatchedVideos) : onPlayLong(v, unwatchedVideos)} progressMap={progressMap} direction="rtl" />
        </section>
      )}

      {/* 3. 4 فيديوهات طويلة (فوق بعض) */}
      <section className="px-4 space-y-8">
        <h2 className="text-xl font-black text-white italic border-r-4 border-red-600 pr-3 mr-2">أساطير مطولة</h2>
        <div className="flex flex-col gap-8">
          {longs.slice(0, 4).map(video => (
            <div key={video.id} onClick={() => onPlayLong(video, longs)} className="relative aspect-video rounded-[2.5rem] overflow-hidden border-2 border-red-600 ring-4 ring-red-600/10 shadow-[0_0_30px_rgba(220,38,38,0.3)] active:scale-[0.98] transition-all cursor-pointer group">
              <LiveThumbnail url={video.video_url} className="opacity-90 group-hover:scale-105 transition-transform duration-[8s]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20"></div>
              <div className="absolute bottom-6 right-6 text-right left-6">
                <span className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-red-600/30">{video.category}</span>
                <h3 className="text-white font-black text-xl mt-3 drop-shadow-[0_2px_10px_black]">{video.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. رعب حقيقي (ماركي شمال لليمين) */}
      <section className="bg-black py-4">
        <h2 className="text-lg font-black text-white mb-2 px-6 italic text-left">Real Horror / رعب حقيقي</h2>
        <InteractiveMarquee videos={videos.filter(v => v.category === 'رعب حقيقي')} onPlay={(v) => v.type === 'short' ? onPlayShort(v, videos) : onPlayLong(v, videos)} direction="ltr" />
      </section>

      {/* 5. 4 فيديوهات شورتس (2x2) */}
      <section className="px-4">
        <h2 className="text-xl font-black text-white italic mb-6 border-r-4 border-red-600 pr-3 mr-2">من الأرشيف المظلم</h2>
        <div className="grid grid-cols-2 gap-4">
          {shorts.slice(4, 8).map(v => (
            <div key={v.id} onClick={() => onPlayShort(v, shorts)} className="aspect-[9/16] rounded-3xl overflow-hidden border border-red-600/40 shadow-2xl bg-neutral-900 active:scale-95 transition-transform cursor-pointer group">
              <LiveThumbnail url={v.video_url} className="group-hover:scale-110 transition-transform duration-[5s]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 right-4 left-4 text-right">
                <p className="text-white text-[11px] font-black line-clamp-1">{v.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. 4 فيديوهات طويلة (فوق بعض) */}
      <section className="px-4 space-y-8">
        <h2 className="text-xl font-black text-white italic border-r-4 border-red-600 pr-3 mr-2">كوابيس مستمرة</h2>
        <div className="flex flex-col gap-8">
          {longs.slice(4, 8).map(video => (
            <div key={video.id} onClick={() => onPlayLong(video, longs)} className="relative aspect-video rounded-[2.5rem] overflow-hidden border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.2)] active:scale-[0.98] transition-all cursor-pointer group">
              <LiveThumbnail url={video.video_url} className="opacity-80 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="absolute bottom-6 right-6 text-right left-6">
                <h3 className="text-white font-black text-lg drop-shadow-[0_2px_10px_black]">{video.title}</h3>
                <p className="text-[10px] text-gray-400 font-bold mt-1">اضغط للمشاهدة الكاملة</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. ماركي نهائي (شمال لليمين) */}
      <section className="pb-20">
        <h2 className="text-lg font-black text-white mb-2 px-6 italic text-left">قائمة المشاهدة المختارة</h2>
        <InteractiveMarquee videos={longs.slice(8)} onPlay={(v) => onPlayLong(v, longs)} direction="ltr" />
      </section>

      {loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-red-600">
          <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin mb-4"></div>
          <p className="font-black animate-pulse text-sm italic tracking-widest">تجري الآن طقوس استحضار الفيديوهات...</p>
        </div>
      )}
    </div>
  );
};

export default MainContent;
