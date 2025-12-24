
import React, { useMemo, useRef, useState } from 'react';
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

const DraggableMarquee: React.FC<{ videos: Video[], interactions: UserInteractions, onPlay: (v: Video) => void, progressMap?: Map<string, number>, autoAnimate?: boolean, reverse?: boolean }> = ({ videos, interactions, onPlay, progressMap, autoAnimate, reverse }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const displayVideos = useMemo(() => {
    if (!Array.isArray(videos) || videos.length === 0) return [];
    if (!autoAnimate) return videos;
    return [...videos, ...videos];
  }, [videos, autoAnimate]);

  const animationDuration = useMemo(() => {
    const count = Array.isArray(videos) ? videos.length : 1;
    return Math.max(8, (count / 10) * 12);
  }, [videos]);

  if (displayVideos.length === 0) return null;

  return (
    <div className="relative marquee-container w-full overflow-hidden" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div 
        style={{ animationDuration: `${animationDuration}s`, animationPlayState: isPaused ? 'paused' : 'running' }}
        className={`flex gap-4 pb-4 px-2 ${autoAnimate ? (reverse ? 'animate-marquee-l-to-r' : 'animate-marquee-r-to-l') : 'overflow-x-auto scrollbar-hide'}`}
      >
        {displayVideos.map((v, i) => {
          const id = v.id || v.video_url;
          const progress = progressMap?.get(id) || 0;
          return (
            <div key={`${id}-${i}`} onClick={() => onPlay(v)} className="flex-shrink-0 w-36 active:scale-95 transition-all group relative">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-neutral-900 aspect-video">
                <video src={v.video_url} muted playsInline preload="metadata" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
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

  const safeVideos = Array.isArray(videos) ? videos : [];

  const categories: Record<string, Video[]> = useMemo(() => {
    const filtered = !searchQuery ? safeVideos : safeVideos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.category.includes(searchQuery));
    return {
      'رعب حقيقي': filtered.filter(v => v.category === 'رعب حقيقي'),
      'قصص رعب': filtered.filter(v => v.category === 'قصص رعب'),
      'غموض': filtered.filter(v => v.category === 'غموض'),
      'ما وراء الطبيعة': filtered.filter(v => v.category === 'ما وراء الطبيعة'),
      'أرشيف المطور': filtered.filter(v => v.category === 'أرشيف المطور'),
    };
  }, [safeVideos, searchQuery]);

  const unwatchedHistoryMap = useMemo(() => {
    const map = new Map<string, number>();
    (interactions.watchHistory || []).forEach(h => { if (h.progress > 0.05 && h.progress < 0.95) map.set(h.id, h.progress); });
    return map;
  }, [interactions.watchHistory]);

  const continueVideos = useMemo(() => {
    const list: Video[] = [];
    unwatchedHistoryMap.forEach((_, id) => {
      const v = safeVideos.find(vid => (vid.id === id || vid.video_url === id));
      if (v) list.push(v);
    });
    return list.reverse();
  }, [safeVideos, unwatchedHistoryMap]);

  return (
    <div className="flex flex-col gap-10 pb-2">
      <section>
        <div className="flex items-center justify-between mb-6 px-1">
          <div onClick={onResetHistory} className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-all">
            <img src={LOGO_URL} className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red] object-cover" />
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-red-600 italic leading-none">الحديقة المرعبة</h2>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Spirits Collection</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isSearchOpen ? (
              <div className="flex items-center bg-white/5 border border-red-600/30 rounded-xl px-3 py-1 animate-in slide-in-from-left-4 duration-300">
                <input autoFocus className="bg-transparent outline-none text-xs text-white w-24 text-right" placeholder="ابحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onBlur={() => !searchQuery && setIsSearchOpen(false)} />
              </div>
            ) : (
              <button onClick={() => setIsSearchOpen(true)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-red-500 active:scale-75 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </button>
            )}
            <button onClick={onTurboCache} className="w-10 h-10 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 active:scale-90 transition-all">
               <img src={LOGO_URL} className="w-6 h-6 rounded-full opacity-60 hover:opacity-100" />
            </button>
          </div>
        </div>
      </section>

      {continueVideos.length > 0 && !searchQuery && (
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} className="w-5 h-5 rounded-full border border-red-600/30" />
              <h2 className="text-lg font-black text-white italic leading-none">واصل الارتعاش</h2>
            </div>
            <button onClick={onViewUnwatched} className="text-[10px] text-yellow-500 font-black">عرض الكل</button>
          </div>
          <DraggableMarquee videos={continueVideos} interactions={interactions} onPlay={(v) => v.type === 'short' ? onPlayShort(v, safeVideos) : onPlayLong(v, safeVideos, true)} progressMap={unwatchedHistoryMap} autoAnimate={true} reverse={true} />
        </section>
      )}

      {Object.entries(categories).map(([name, list]) => (
        list.length > 0 && (
          <section key={name}>
            <div className="flex items-center gap-3 mb-4 px-1">
              <img src={LOGO_URL} className="w-6 h-6 rounded-full border-2 border-red-600 shadow-[0_0_8px_red]" />
              <h2 className="text-xl font-black text-white italic leading-none">{name}</h2>
            </div>
            <DraggableMarquee videos={list} interactions={interactions} onPlay={(v) => v.type === 'short' ? onPlayShort(v, list) : onPlayLong(v, list, true)} autoAnimate={true} reverse={name.length % 2 === 0} />
          </section>
        )
      ))}
    </div>
  );
};

export default MainContent;
