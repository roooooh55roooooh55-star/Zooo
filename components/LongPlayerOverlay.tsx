
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Video } from '../types.ts';
import { incrementViewsInDB } from '../supabaseClient.ts';
import { getDeterministicStats, formatBigNumber } from './MainContent.tsx';

interface LongPlayerOverlayProps {
  video: Video;
  allLongVideos: Video[];
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onSave: () => void;
  onSwitchVideo: (v: Video) => void;
  isLiked: boolean;
  isDisliked: boolean;
  isSaved: boolean;
  onProgress: (p: number) => void;
}

const LongPlayerOverlay: React.FC<LongPlayerOverlayProps> = ({ 
  video, allLongVideos, onClose, onLike, onDislike, onSave, onSwitchVideo, isLiked, isDisliked, isSaved, onProgress 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const suggestions = useMemo(() => {
    return allLongVideos.filter(v => (v.id || v.video_url) !== (video.id || video.video_url));
  }, [allLongVideos, video]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    incrementViewsInDB(video.id || video.video_url);
    v.muted = isMuted;
    
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });

    const updateTime = () => { if (v.duration) onProgress(v.currentTime / v.duration); };
    
    const handleEnd = () => { 
      if (suggestions.length > 0) {
        onSwitchVideo(suggestions[0]);
      } else {
        v.currentTime = 0;
        v.play().catch(() => {});
      }
    };

    v.addEventListener('timeupdate', updateTime);
    v.addEventListener('ended', handleEnd);
    return () => {
      v.removeEventListener('timeupdate', updateTime);
      v.removeEventListener('ended', handleEnd);
    };
  }, [video, suggestions, onSwitchVideo]);

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullScreen(!isFullScreen);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const stats = useMemo(() => getDeterministicStats(video.video_url), [video.video_url]);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-[#050505] z-[200] flex flex-col transition-all duration-500 overflow-hidden ${isFullScreen ? 'z-[400]' : ''}`}
    >
      
      {/* قسم الفيديو الرئيسي */}
      <div className={`relative flex flex-col transition-all duration-500 ${isFullScreen ? 'h-full w-full bg-black' : 'h-[40vh] mt-4'}`}>
        
        {/* أزرار التحكم العلوية - موضعها يتغير في وضع ملء الشاشة لتناسب العرض الأفقي */}
        <div className={`absolute px-6 flex justify-between items-center z-[220] transition-all duration-500 ${
          isFullScreen 
          ? 'top-0 bottom-0 right-6 flex-col py-6' 
          : 'top-4 left-0 right-0'
        }`}>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className={`p-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 text-red-600 shadow-2xl active:scale-90 transition-all ${isFullScreen ? 'rotate-90' : ''}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <button 
            onClick={toggleFullScreen}
            className={`p-3 bg-red-600/80 backdrop-blur-xl rounded-2xl border border-red-400 text-white shadow-2xl active:scale-90 transition-all ${isFullScreen ? 'rotate-90' : ''}`}
          >
            {isFullScreen ? (
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                 <path d="M9 9L4 4m0 0h4m-4 0v4m11 1l5 5m0 0h-4m4 0v-4" />
               </svg>
            ) : (
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                 <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
               </svg>
            )}
          </button>
        </div>

        {/* الحاوية الدورانية للفيديو (YouTube Mobile Style) */}
        <div 
          className="relative w-full h-full bg-black flex items-center justify-center cursor-pointer overflow-hidden"
          onClick={() => setIsPaused(!isPaused)}
        >
          <video 
            ref={videoRef}
            src={video.video_url}
            style={isFullScreen ? {
              width: '100dvh', // عرض الفيديو يتناسب مع طول الشاشة
              height: '100dvw', // الطول يتناسب مع عرض الشاشة
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(90deg)', // تدوير 90 درجة للوضع الأفقي
              objectFit: 'cover', // ملء الشاشة بالكامل ويصل إلى الأطراف (Edge-to-Edge)
              backgroundColor: 'black'
            } : {
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            playsInline
            preload="auto"
            muted={isMuted}
            autoPlay
          />

          {isPaused && !isFullScreen && (
            <div className="absolute inset-0 flex items-center justify-center z-[215] bg-black/20">
               <div className="w-16 h-16 rounded-full bg-red-600/50 backdrop-blur-md flex items-center justify-center border border-red-500 shadow-[0_0_20px_red]">
                  <svg className="w-8 h-8 text-white translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* قسم التفاعل والمقترحات */}
      {!isFullScreen && (
        <div className="flex-grow flex flex-col p-6 gap-6 overflow-hidden">
          
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-black text-right leading-tight text-white line-clamp-2">{video.title}</h2>
            <div className="flex items-center justify-between text-[11px] font-black opacity-70">
              <span className="text-blue-400">{formatBigNumber(stats.views)} مشاهدة حديقة</span>
              <span className="text-red-500">{formatBigNumber(stats.likes)} إعجاب رعب</span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <button onClick={onLike} className={`py-4 rounded-2xl border transition-all flex justify-center items-center ${isLiked ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_blue]' : 'bg-white/5 border-white/10 text-white'}`}>
                <svg className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              </button>
              <button onClick={onDislike} className={`py-4 rounded-2xl border transition-all flex justify-center items-center ${isDisliked ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_15px_red]' : 'bg-white/5 border-white/10 text-white'}`}>
                <svg className="w-6 h-6 rotate-180" fill={isDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              </button>
              <button onClick={onSave} className={`py-4 rounded-2xl border transition-all flex justify-center items-center ${isSaved ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-[0_0_15px_yellow]' : 'bg-white/5 border-white/10 text-white'}`}>
                <svg className="w-6 h-6" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              </button>
              <button onClick={() => setIsMuted(!isMuted)} className={`py-4 rounded-2xl border transition-all flex justify-center items-center ${isMuted ? 'bg-red-600/20 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-white'}`}>
                {isMuted ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586zM17 9l4 4m0-4l-4 4"/></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15L4 16.586V7.414L5.586 9H10l5-5v16l-5-5H5.586z"/></svg>}
              </button>
            </div>
          </div>

          {/* شريط المقترحات المخصص: فيديوهات صامتة وثابتة لضمان تشغيل الفيديو الرئيسي بدون تقطيع */}
          <div className="mt-auto mb-8">
            <h3 className="text-[11px] font-black text-gray-500 mb-4 text-right pr-2 italic">رحلات الرعب القادمة...</h3>
            <div className="relative overflow-hidden w-full h-28 flex items-center">
              <div className="flex gap-4 animate-marquee-lr hover:pause-animation">
                {[...suggestions, ...suggestions].map((s, i) => (
                  <div 
                    key={`${s.id || s.video_url}-${i}`}
                    onClick={() => onSwitchVideo(s)}
                    className="flex-shrink-0 w-44 aspect-video rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl active:scale-95 transition-all group/item cursor-pointer bg-neutral-900"
                  >
                    {/* استخدام الفيديو كصورة مصغرة (لا يعمل تلقائياً لتوفير البيانات والسرعة) */}
                    <video 
                      src={s.video_url} 
                      muted 
                      playsInline 
                      preload="metadata" 
                      className="w-full h-full object-cover opacity-60 group-hover/item:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                    <p className="absolute bottom-2 right-2 left-2 text-[9px] font-bold text-white text-right line-clamp-1">{s.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      <style>{`
        @keyframes marquee-lr {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        .animate-marquee-lr {
          display: flex;
          width: max-content;
          animation: marquee-lr 25s linear infinite;
        }
        .hover\\:pause-animation:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default LongPlayerOverlay;
