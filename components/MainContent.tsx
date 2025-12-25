
import React, { useMemo, useState, useRef } from 'react';
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
      className="relative w-full overflow-hidden py-2"
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
            <div key={`${id}-${i}`} onClick={() => onPlay(video)} className="flex-shrink-0 w-44 active:scale-95 transition-all cursor-pointer">
              <div className="relative rounded-2xl overflow-hidden border border-red-600/40 bg-black aspect-video shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                <video src={video.video_url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                {progress > 0 && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div className="h-full bg-red-600" style={{ width: `${progress * 100}%` }}></div>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-black mt-2 text-gray-300 text-center line-clamp-1 px-1">{video.title}</p>
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
  loading: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ 
  videos, categoriesList, interactions, onPlayShort, onPlayLong, onResetHistory, loading 
}) => {
  const shorts = useMemo(() => videos.filter(v => v.type === 'short'), [videos]);
  const longs = useMemo(() => videos.filter(v => v.type === 'long'), [videos]);

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

  return (
    <div className="flex flex-col gap-12 pb-32" dir="rtl">
      {/* هيدر ترحيبي */}
      <section className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} className="w-12 h-12 rounded-full border-2 border-red-600 shadow-[0_0_15px_red]" />
          <h1 className="text-xl font-black text-white italic">الحديقة المرعبة</h1>
        </div>
        <button onClick={onResetHistory} className="w-12 h-12 bg-black border-2 border-red-600 rounded-full p-2 animate-spin-slow">
          <img src={LION_URL} className="w-full h-full object-contain" />
        </button>
      </section>

      {/* 1. أول 4 فيديوهات شورتس */}
      <section>
        <h2 className="text-lg font-black text-red-600 mb-4 px-4 border-r-4 border-red-600 mr-2">خطفات سريعة</h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4">
          {shorts.slice(0, 4).map(v => (
            <div key={v.id} onClick={() => onPlayShort(v, shorts)} className="flex-shrink-0 w-32 aspect-[9/16] rounded-2xl overflow-hidden border border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] bg-neutral-900 active:scale-95 transition-transform cursor-pointer">
              <video src={v.video_url} muted playsInline className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* 2. قسم لم يتم اكتمال مشاهدتها (ماركي يمين لليسار) */}
      {unwatchedVideos.length > 0 && (
        <section className="bg-red-950/20 py-6 border-y border-red-600/20">
          <h2 className="text-lg font-black text-white mb-4 px-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
            نواصل الكابوس...
          </h2>
          <InteractiveMarquee videos={unwatchedVideos} onPlay={(v) => v.type === 'short' ? onPlayShort(v, unwatchedVideos) : onPlayLong(v, unwatchedVideos)} progressMap={progressMap} direction="rtl" />
        </section>
      )}

      {/* 3. 4 فيديوهات طويلة عمودية (واحد من كل قسم) */}
      <section className="px-4 space-y-6">
        <h2 className="text-lg font-black text-red-600 border-r-4 border-red-600 mr-2 pr-2">أساطير مطولة</h2>
        <div className="flex flex-col gap-6">
          {categoriesList.slice(0, 4).map(cat => {
            const video = longs.find(v => v.category === cat);
            if (!video) return null;
            return (
              <div key={video.id} onClick={() => onPlayLong(video, longs)} className="relative aspect-video rounded-3xl overflow-hidden border border-red-600 ring-2 ring-red-600/20 shadow-2xl active:scale-95 transition-transform cursor-pointer">
                <video src={video.video_url} muted playsInline className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-4 right-4 text-right">
                  <span className="text-[10px] text-red-500 font-black uppercase tracking-widest">{cat}</span>
                  <h3 className="text-white font-black text-lg">{video.title}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. شريط رعب حقيقي (ماركي يسار لليمين) */}
      <section>
        <h2 className="text-lg font-black text-white mb-4 px-4">أحداث حقيقية</h2>
        <InteractiveMarquee videos={videos.filter(v => v.category === 'رعب حقيقي')} onPlay={(v) => v.type === 'short' ? onPlayShort(v, videos) : onPlayLong(v, videos)} direction="ltr" />
      </section>

      {/* 5. 4 فيديوهات شورتس (شبكة 2x2) */}
      <section className="px-4">
        <h2 className="text-lg font-black text-red-600 mb-4 border-r-4 border-red-600 mr-2 pr-2">أرشيف الرعب</h2>
        <div className="grid grid-cols-2 gap-4">
          {shorts.slice(4, 8).map(v => (
            <div key={v.id} onClick={() => onPlayShort(v, shorts)} className="aspect-[9/16] rounded-2xl overflow-hidden border border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.4)] active:scale-95 transition-transform cursor-pointer">
              <video src={v.video_url} muted playsInline className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* 6. شريط فيديوهات طويلة متحرك للمتبقي (يسار لليمين) */}
      <section className="pb-10">
        <h2 className="text-lg font-black text-white mb-4 px-4">سينما الحديقة</h2>
        <InteractiveMarquee videos={longs.slice(4)} onPlay={(v) => onPlayLong(v, longs)} direction="ltr" />
      </section>

      {loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-red-600">
          <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin mb-4"></div>
          <p className="font-black animate-pulse text-sm">جاري استدعاء الأرواح من المستودع...</p>
        </div>
      )}
    </div>
  );
};

export default MainContent;
