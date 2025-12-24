
import React, { useMemo, useState } from 'react';
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

const DraggableMarquee: React.FC<{ videos: Video[], interactions: UserInteractions, onPlay: (v: Video) => void, progressMap?: Map<string, number>, autoAnimate?: boolean, reverse?: boolean }> = ({ videos, interactions, onPlay, progressMap, autoAnimate, reverse }) => {
  const [isPaused, setIsPaused] = useState(false);

  const displayVideos = useMemo(() => {
    // في حالة عدم وجود فيديوهات، نعرض هياكل فارغة للحفاظ على شكل الواجهة
    if (!Array.isArray(videos) || videos.length === 0) return Array.from({length: 4}); 
    if (!autoAnimate) return videos;
    return [...videos, ...videos];
  }, [videos, autoAnimate]);

  const animationDuration = useMemo(() => {
    const count = Array.isArray(videos) ? videos.length : 4;
    return Math.max(8, (count / 10) * 12);
  }, [videos]);

  return (
    <div className="relative marquee-container w-full overflow-hidden" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div 
        style={{ animationDuration: `${animationDuration}s`, animationPlayState: isPaused ? 'paused' : 'running' }}
        className={`flex gap-4 pb-4 px-2 ${autoAnimate ? (reverse ? 'animate-marquee-l-to-r' : 'animate-marquee-r-to-l') : 'overflow-x-auto scrollbar-hide'}`}
      >
        {displayVideos.map((v, i) => {
          if (!v) return (
            <div key={i} className="flex-shrink-0 w-36 aspect-video rounded-2xl bg-neutral-900 border border-red-600 ring-1 ring-red-600 shadow-[0_0_8px_rgba(220,38,38,0.3)] opacity-40"></div>
          );
          
          const video = v as Video;
          const id = video.id || video.video_url;
          const progress = progressMap?.get(id) || 0;
          return (
            <div key={`${id}-${i}`} onClick={() => onPlay(video)} className="flex-shrink-0 w-36 active:scale-95 transition-all group">
              <div className="relative rounded-2xl overflow-hidden border border-red-600 bg-neutral-900 aspect-video ring-1 ring-red-600 shadow-[0_0_12px_rgba(220,38,38,0.5)] group-hover:shadow-[0_0_20px_red] transition-all">
                <video src={video.video_url} muted playsInline preload="metadata" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                {progress > 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20"><div className="h-full bg-red-600 shadow-[0_0_8px_red]" style={{ width: `${progress * 100}%` }}></div></div>}
              </div>
              <p className="text-[10px] font-black mt-2 line-clamp-1 px-1 text-gray-400 group-hover:text-white text-right">{video.title}</p>
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
  onPlayLong: (v: Video, list: Video[], autoNext?: boolean) => void;
  onViewUnwatched: () => void;
  onResetHistory: () => void;
  onTurboCache: () => void;
  cacheStatus: 'idle' | 'caching' | 'done';
  loading: boolean;
}

const MainContent: React.FC<MainContentProps> = ({ videos, categoriesList, interactions, onPlayShort, onPlayLong, onViewUnwatched, onResetHistory, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const safeVideos = Array.isArray(videos) ? videos : [];

  const filteredVideos = useMemo(() => {
    if (!searchQuery) return safeVideos;
    return safeVideos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.category.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [safeVideos, searchQuery]);

  const categoriesData: Record<string, Video[]> = useMemo(() => {
    const result: Record<string, Video[]> = {};
    categoriesList.forEach(cat => {
        const catVideos = filteredVideos.filter(v => v.category === cat);
        if (catVideos.length > 0 || !searchQuery) result[cat] = catVideos;
    });
    return result;
  }, [filteredVideos, searchQuery, categoriesList]);

  return (
    <div className="flex flex-col gap-10 pb-2" dir="rtl">
      {/* هيدر الصفحة المحدث */}
      <section className="px-1 pt-4">
        <div className="flex items-center justify-between gap-4">
          {/* الجانب الأيمن: عنوان التطبيق */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <img src={LOGO_URL} className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red] object-cover" />
              <div className="absolute inset-0 rounded-full border border-red-500 animate-pulse"></div>
            </div>
            <div className="flex flex-col text-right">
              <h2 className="text-lg font-black text-red-600 italic leading-none">الحديقة المرعبة</h2>
              <span className="text-[7px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Dark Kingdom v4</span>
            </div>
          </div>

          {/* المنتصف: زر البحث */}
          <div className="flex-grow flex justify-center">
             {isSearchOpen ? (
                <div className="w-full flex items-center bg-white/5 border border-red-600/50 rounded-2xl px-4 py-2 animate-in zoom-in duration-300">
                    <input 
                      autoFocus 
                      className="bg-transparent outline-none text-xs text-white w-full text-right" 
                      placeholder="ابحث عن روح..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      onBlur={() => !searchQuery && setIsSearchOpen(false)}
                    />
                </div>
             ) : (
                <button 
                  onClick={() => setIsSearchOpen(true)}
                  className="w-10 h-10 rounded-full bg-red-600/10 border border-red-600/30 flex items-center justify-center text-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)] active:scale-75 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </button>
             )}
          </div>

          {/* الجانب الأيسر: زر التحديث (وجه الأسد) */}
          <button 
            onClick={onResetHistory}
            className="w-12 h-12 flex items-center justify-center bg-black rounded-full border-2 border-red-600 shadow-[0_0_15px_red] active:scale-90 transition-all overflow-hidden p-1 shrink-0"
          >
            <img src={LION_URL} className="w-full h-full object-contain filter drop-shadow-[0_0_5px_red]" alt="Refresh" />
          </button>
        </div>
      </section>

      {/* عرض التصنيفات مع الإطارات الحمراء المتوهجة */}
      {Object.entries(categoriesData).map(([name, list]) => (
        <section key={name} className="mb-2 px-1">
          <div className="flex items-center gap-3 mb-4">
            <img src={LOGO_URL} className="w-6 h-6 rounded-full border-2 border-red-600 shadow-[0_0_8px_red]" />
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
      ))}
      
      {/* حالة عدم توفر فيديوهات: نحافظ على التقسيم باستخدام هياكل وهمية */}
      {safeVideos.length === 0 && !loading && (
        <div className="flex flex-col gap-10 opacity-20 px-2">
            {[1,2,3,4].map((i) => (
                <div key={i} className="flex flex-col gap-4">
                    <div className="w-32 h-4 bg-white/10 rounded-full"></div>
                    <div className="flex gap-4 overflow-hidden">
                        {[1,2,3,4].map((j) => (
                            <div key={j} className="flex-shrink-0 w-36 aspect-video bg-neutral-900 rounded-2xl ring-1 ring-red-600 shadow-[0_0_10px_red]"></div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default MainContent;
