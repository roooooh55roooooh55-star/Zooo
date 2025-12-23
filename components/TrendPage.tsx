
import React, { useEffect, useState, useMemo } from 'react';
import { Video } from '../types';
import { fetchTrendingVideos } from '../supabaseClient';
import { getDeterministicStats, formatBigNumber } from './ShortsPlayerOverlay';

interface TrendPageProps {
  onPlayShort: (v: Video, list: Video[]) => void;
  onPlayLong: (v: Video) => void;
  excludedIds: string[];
}

const TrendPage: React.FC<TrendPageProps> = ({ onPlayShort, onPlayLong, excludedIds }) => {
  const [trends, setTrends] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchTrendingVideos();
        setTrends(data || []);
      } catch (err) {
        setTrends([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredTrends = useMemo(() => {
    return trends.filter(v => !excludedIds.includes(v.id || v.video_url));
  }, [trends, excludedIds]);

  if (loading) return <div className="p-10 text-center text-gray-500 animate-pulse">جاري تحليل بيانات الترند العالمي...</div>;

  return (
    <div className="flex flex-col gap-8 pb-32">
      <div className="flex items-center justify-between border-b border-red-600/20 pb-4">
        <h1 className="text-3xl font-black text-red-600 italic tracking-tighter">الرائج عالمياً</h1>
        <div className="flex gap-1.5 items-center">
           <span className="text-[10px] text-red-600 font-black animate-pulse">LIVE</span>
           <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_10px_red]"></div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {filteredTrends.map((video, idx) => {
          const stats = getDeterministicStats(video.video_url, true);
          return (
            <div 
              key={video.id || video.video_url}
              onClick={() => video.type === 'short' ? onPlayShort(video, filteredTrends.filter(v => v.type === 'short')) : onPlayLong(video)}
              className="group relative bg-[#1a1a1a]/50 border border-white/5 rounded-[2.5rem] overflow-hidden cursor-pointer shadow-2xl transition-all active:scale-[0.97]"
            >
              <div className="aspect-video relative bg-black overflow-hidden">
                <video 
                  src={video.video_url} 
                  muted autoPlay loop playsInline 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-[3s]" 
                  onTimeUpdate={(e) => {
                    if (e.currentTarget.currentTime >= 5) e.currentTarget.currentTime = 0;
                  }}
                />
                <div className="absolute top-5 right-5 bg-red-600 text-white text-sm font-black w-10 h-10 flex items-center justify-center rounded-2xl shadow-xl ring-2 ring-red-400/20">
                  {idx + 1}
                </div>
                <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] text-white border border-white/10 font-black uppercase tracking-widest">
                  {video.type === 'short' ? 'Short' : 'Viral'}
                </div>
              </div>
              <div className="p-7 flex flex-col gap-4">
                <h3 className="font-black text-xl line-clamp-1 leading-tight tracking-tight text-right">{video.title}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <span className="flex items-center gap-2 text-sm text-red-500 font-black">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                      {formatBigNumber(stats.likes)}
                    </span>
                    <span className="flex items-center gap-2 text-sm text-blue-400 font-black">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      {formatBigNumber(stats.views)}
                    </span>
                  </div>
                  <div className="w-1.5 h-6 bg-red-600/30 rounded-full blur-[1px]"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrendPage;
