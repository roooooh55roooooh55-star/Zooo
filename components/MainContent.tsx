
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Video, UserInteractions } from '../types.ts';

const getDeterministicStats = (url: string) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = url.charCodeAt(i) + ((hash << 5) - hash);
  const likesSeed = Math.abs(hash % 1500000) + 500000;
  const viewsSeed = Math.abs(hash % 45000000) + 5000000;
  return { likes: likesSeed, views: viewsSeed };
};

const formatBigNumber = (num: number) => {
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

  useEffect(() => { 
    const v = videoRef.current;
    if (!v) return;
    // تحسين التشغيل التلقائي للمعاينة
    v.play().catch(() => {});
    const handleTimeUpdate = () => { if (v.currentTime >= 6) v.currentTime = 0; };
    v.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.pause();
    };
  }, [video.video_url]);

  return (
    <div onClick={onClick} className={`relative overflow-hidden cursor-pointer group bg-black border border-white/5 transition-all active:scale-95 duration-300 ${className}`}>
      <video 
        ref={videoRef} 
        src={video.video_url} 
        muted autoPlay loop playsInline 
        preload="metadata" 
        className="w-full h-full object-cover relative z-10" 
      />
      
      {isNew && (
        <div className="absolute top-2 right-2 z-30 bg-red-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-[0_0_10px_red]">
          جديد
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent p-3 flex flex-col justify-end z-20">
        <p className="text-[10px] font-bold text-white line-clamp-1 text-right">{video.title}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] text-red-500 font-black">{formatBigNumber(stats.likes)}</span>
            <span className="text-[8px] text-blue-400 font-black">{formatBigNumber(stats.views)}</span>
          </div>
          {isLong && <span className="text-[7px] bg-red-600 px-1 rounded text-white font-black">LONG</span>}
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
  return (
    <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4" style={{ direction: 'rtl' }}>
      {videos.map((video, i) => (
        <div key={`${video.id}-${i}`} onClick={() => onPlay(video)} className="flex-shrink-0 w-48">
          <div className="relative rounded-xl overflow-hidden aspect-video bg-neutral-900 border border-white/10">
            <video src={video.video_url} muted loop playsInline autoPlay className="w-full h-full object-cover opacity-60" />
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
              <div className="h-full bg-red-600" style={{ width: `${video.progress * 100}%` }}></div>
            </div>
          </div>
          <p className="text-[9px] font-bold text-gray-400 truncate mt-1 text-right px-1">{video.title}</p>
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
    const map = new Map();
    interactions.watchHistory.forEach(h => {
      const video = videos.find(v => (v.id === h.id || v.video_url === h.id));
      if (video && h.progress > 0.05 && h.progress < 0.95) map.set(video.id || video.video_url, { ...video, progress: h.progress });
    });
    return Array.from(map.values()).reverse() as (Video & { progress: number })[];
  }, [videos, interactions.watchHistory]);

  const allShorts = useMemo(() => videos.filter(v => v.type === 'short'), [videos]);
  const allLongs = useMemo(() => videos.filter(v => v.type === 'long'), [videos]);

  const topShorts = useMemo(() => allShorts.slice(0, 4), [allShorts]);
  const extraShorts = useMemo(() => allShorts.slice(4, 8), [allShorts]);
  const remainingShorts = useMemo(() => allShorts.slice(8), [allShorts]);

  const topLongs = useMemo(() => allLongs.slice(0, 4), [allLongs]);
  const extraLongs = useMemo(() => allLongs.slice(4, 8), [allLongs]);

  if (loading && videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-bold mt-4 text-xs italic">جاري استحضار الفيديوهات...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-32">
      {/* 1. الحديقة المرعبة (4 شورتس) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-7 h-7 rounded-full border border-red-600" />
          <h2 className="text-lg font-black text-red-600 italic">الحديقة المرعبة</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {topShorts.map((v) => <VideoPreview key={v.id || v.video_url} video={v} onClick={() => onPlayShort(v, allShorts)} className="aspect-[9/16] rounded-2xl shadow-xl" />)}
        </div>
      </section>

      {/* 2. مكمل رعب */}
      {unwatchedVideos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-md font-black text-white italic">مكمل رعب</h2>
            <button onClick={onViewUnwatched} className="text-[9px] text-yellow-500 font-bold">عرض الكل</button>
          </div>
          <DraggableMarquee videos={unwatchedVideos} onPlay={(v) => v.type === 'short' ? onPlayShort(v, allShorts) : onPlayLong(v, true)} />
        </section>
      )}

      {/* 3. سلاسل الحديقة (4 طويلة) */}
      <section>
        <h2 className="text-lg font-black text-white mb-4 pr-2 border-r-4 border-green-500">سلاسل الحديقة</h2>
        <div className="flex flex-col gap-6">
          {topLongs.map((v) => (
            <div key={v.id || v.video_url} onClick={() => onPlayLong(v, true)} className="bg-neutral-900 rounded-[2rem] overflow-hidden border border-white/5 active:scale-95 transition-all">
              <div className="relative aspect-video">
                <video src={v.video_url} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                {isRecentVideo(v) && <div className="absolute top-4 left-4 bg-red-600 text-[9px] px-2 py-1 rounded-full font-black text-white">جديد</div>}
              </div>
              <div className="p-4 bg-black/40"><h3 className="text-sm font-bold text-right">{v.title}</h3></div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. لقطات إضافية (4 شورتس تالية) */}
      {extraShorts.length > 0 && (
        <section>
          <h2 className="text-lg font-black text-white mb-4 pr-2 border-r-4 border-red-600">لقطات إضافية</h2>
          <div className="grid grid-cols-2 gap-3">
            {extraShorts.map((v) => <VideoPreview key={v.id || v.video_url} video={v} onClick={() => onPlayShort(v, allShorts)} className="aspect-[9/16] rounded-2xl shadow-xl" />)}
          </div>
        </section>
      )}

      {/* 5. فيديوهات طويلة (4 طويلة تالية) */}
      {extraLongs.length > 0 && (
        <section>
          <h2 className="text-lg font-black text-white mb-4 pr-2 border-r-4 border-blue-600">فيديوهات طويلة</h2>
          <div className="flex flex-col gap-6">
            {extraLongs.map((v) => (
              <div key={v.id || v.video_url} onClick={() => onPlayLong(v, true)} className="bg-neutral-900 rounded-[2rem] overflow-hidden border border-white/5 active:scale-95 transition-all">
                <div className="relative aspect-video"><video src={v.video_url} muted autoPlay loop playsInline className="w-full h-full object-cover" /></div>
                <div className="p-4 bg-black/40"><h3 className="text-sm font-bold text-right">{v.title}</h3></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. شورتس (باقي الشورتس) */}
      {remainingShorts.length > 0 && (
        <section>
          <h2 className="text-lg font-black text-white mb-4 pr-2 border-r-4 border-yellow-600">شورتس</h2>
          <div className="grid grid-cols-2 gap-3">
            {remainingShorts.map((v) => <VideoPreview key={v.id || v.video_url} video={v} onClick={() => onPlayShort(v, allShorts)} className="aspect-[9/16] rounded-2xl shadow-xl" />)}
          </div>
        </section>
      )}
    </div>
  );
};

export default MainContent;
