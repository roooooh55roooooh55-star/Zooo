
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Video, AppView, UserInteractions } from './types.ts';
import { fetchVideos, updateLikesInDB } from './supabaseClient.ts';
import AppBar from './components/AppBar.tsx';
import MainContent from './components/MainContent.tsx';
import ShortsPlayerOverlay from './components/ShortsPlayerOverlay.tsx';
import LongPlayerOverlay from './components/LongPlayerOverlay.tsx';
import TrendPage from './components/TrendPage.tsx';
import SavedPage from './components/SavedPage.tsx';
import UnwatchedPage from './components/UnwatchedPage.tsx';
import PrivacyPage from './components/PrivacyPage.tsx';
import HiddenVideosPage from './components/HiddenVideosPage.tsx';
import AIOracle from './components/AIOracle.tsx';

const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const preloadVideoFile = (url: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'video';
  link.href = url;
  document.head.appendChild(link);
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[], autoNext: boolean } | null>(null);
  
  // تتبع الفيديوهات التي تم عرضها في الواجهة خلال هذه الجلسة لمنع التكرار
  const [sessionShownIds, setSessionShownIds] = useState<Set<string>>(new Set());
  
  const touchStart = useRef<number>(0);
  const [pullDistance, setPullDistance] = useState(0);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    const saved = localStorage.getItem('al-hadiqa-interactions');
    return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  // حماية المحتوى والنسخ
  useEffect(() => {
    const preventAction = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('copy', preventAction);
    document.addEventListener('cut', preventAction);
    document.addEventListener('dragstart', preventAction);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'u', 's', 'p', 'a'].includes(e.key)) e.preventDefault();
      if (e.key === 'F12') e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', preventAction);
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('cut', preventAction);
      document.removeEventListener('dragstart', preventAction);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  const getAIKeywords = useCallback(() => {
    const history = localStorage.getItem('al-hadiqa-ai-history');
    if (!history) return [];
    try {
      const messages = JSON.parse(history);
      return messages.filter((m: any) => m.role === 'user').map((m: any) => m.text).join(' ').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    } catch (e) { return []; }
  }, []);

  const loadData = useCallback(async (mode: 'initial' | 'silent' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);

    try {
      // جلب كمية كبيرة لضمان وجود خيارات للتصفية
      const data = await fetchVideos(undefined, 300);
      if (data && data.length > 0) {
        const filtered = data.filter(v => {
          const vidId = v.id || v.video_url;
          const isLiked = interactions.likedIds.includes(vidId);
          const isDisliked = interactions.dislikedIds.includes(vidId);
          const isSeenFull = interactions.watchHistory.some(h => h.id === vidId && h.progress > 0.95);
          
          // في وضع التحديث (Refresh)، نستبعد أي فيديو ظهر من قبل في هذه الجلسة
          const isShownInSession = mode === 'refresh' ? sessionShownIds.has(vidId) : false;

          return !isLiked && !isDisliked && !isSeenFull && !isShownInSession;
        });

        const shuffled = shuffleArray(filtered);

        if (mode === 'refresh') {
          // استبدال كامل للمحتوى بفيديوهات لم تظهر من قبل
          setVideos(shuffled);
          // إضافة المعروض حالياً لذاكرة الجلسة
          setSessionShownIds(prev => {
            const next = new Set(prev);
            shuffled.forEach(v => next.add(v.id || v.video_url));
            return next;
          });
        } else {
          // في الوضع العادي أو الصامت، نقوم بدمج الجديد فقط
          setVideos(prev => {
            const prevIds = new Set(prev.map(v => v.id || v.video_url));
            const newVideos = shuffled.filter(v => !prevIds.has(v.id || v.video_url));
            
            // تحديث ذاكرة الجلسة
            if (newVideos.length > 0) {
              setSessionShownIds(p => {
                const n = new Set(p);
                newVideos.forEach(v => n.add(v.id || v.video_url));
                return n;
              });
            }

            return [...newVideos, ...prev];
          });
        }
        
        shuffled.slice(0, 15).forEach(v => preloadVideoFile(v.video_url));
      }
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [interactions, sessionShownIds]);

  // التحديث التلقائي المستمر كل 15 ثانية
  useEffect(() => {
    loadData('initial');
    const interval = setInterval(() => {
      if (!selectedShort && !selectedLong && currentView === AppView.HOME) {
        loadData('silent');
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData, selectedShort, selectedLong, currentView]);

  const handlePlayShort = (video: Video, list: Video[]) => {
    const keywords = getAIKeywords();
    const sortedList = [...list].sort((a, b) => {
      const scoreA = keywords.reduce((acc, kw) => acc + (a.title?.toLowerCase().includes(kw) ? 10 : 0), 0);
      const scoreB = keywords.reduce((acc, kw) => acc + (b.title?.toLowerCase().includes(kw) ? 10 : 0), 0);
      return scoreB - scoreA;
    });
    setSelectedShort({ video, list: sortedList });
  };

  const handleToggleLike = async (id: string) => {
    const isLiked = interactions.likedIds.includes(id);
    setInteractions(prev => ({
      ...prev,
      likedIds: isLiked ? prev.likedIds.filter(v => v !== id) : [...prev.likedIds, id],
      dislikedIds: prev.dislikedIds.filter(v => v !== id)
    }));
    try { await updateLikesInDB(id, !isLiked); } catch (e) {}
  };

  const handleToggleDislike = (id: string) => {
    setInteractions(prev => ({
      ...prev,
      dislikedIds: prev.dislikedIds.includes(id) ? prev.dislikedIds.filter(v => v !== id) : [...prev.dislikedIds, id],
      likedIds: prev.likedIds.filter(v => v !== id)
    }));
  };

  const handleToggleSave = (id: string) => {
    setInteractions(prev => {
      const isSaved = prev.savedIds.includes(id);
      return { ...prev, savedIds: isSaved ? prev.savedIds.filter(v => v !== id) : [...prev.savedIds, id] };
    });
  };

  const updateWatchHistory = (id: string, progress: number) => {
    setInteractions(prev => {
      const history = [...prev.watchHistory];
      const index = history.findIndex(h => h.id === id);
      if (index > -1) { history[index].progress = progress; } 
      else { history.push({ id, progress }); }
      return { ...prev, watchHistory: history };
    });
  };

  const renderContent = () => {
    const allAvailable = videos;
    switch (currentView) {
      case AppView.TREND:
        return <TrendPage onPlayShort={handlePlayShort} onPlayLong={(v) => setSelectedLong({ video: v, list: allAvailable.filter(vid => vid.type === 'long'), autoNext: true })} excludedIds={interactions.dislikedIds} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} allVideos={allAvailable} onPlayShort={handlePlayShort} onPlayLong={(v) => setSelectedLong({ video: v, list: allAvailable.filter(v => interactions.savedIds.includes(v.id || v.video_url)), autoNext: true })} />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} allVideos={allAvailable} onPlayShort={handlePlayShort} onPlayLong={(v) => setSelectedLong({ video: v, list: allAvailable.filter(v => interactions.likedIds.includes(v.id || v.video_url)), autoNext: true })} title="الإعجابات" />;
      case AppView.UNWATCHED:
        return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={allAvailable} onPlayShort={handlePlayShort} onPlayLong={(v) => setSelectedLong({ video: v, list: allAvailable.filter(vid => vid.type === 'long'), autoNext: true })} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={allAvailable} onRestore={handleToggleDislike} onPlayShort={handlePlayShort} onPlayLong={(v) => setSelectedLong({ video: v, list: [v], autoNext: false })} />;
      case AppView.PRIVACY:
        return <PrivacyPage />;
      default:
        return (
          <MainContent 
            videos={videos} 
            interactions={interactions}
            onPlayShort={handlePlayShort}
            onPlayLong={(v, autoNext = false) => setSelectedLong({ video: v, list: allAvailable.filter(vid => vid.type === 'long'), autoNext })}
            onViewUnwatched={() => setCurrentView(AppView.UNWATCHED)}
            loading={loading && videos.length === 0}
          />
        );
    }
  };

  return (
    <div 
      className="min-h-screen pb-20 max-w-md mx-auto relative bg-[#0f0f0f] shadow-2xl overflow-x-hidden"
      onTouchStart={(e) => { if (window.scrollY === 0) touchStart.current = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        if (window.scrollY === 0 && touchStart.current > 0) {
          const currentY = e.touches[0].clientY;
          const diff = currentY - touchStart.current;
          if (diff > 0) setPullDistance(Math.min(diff / 2, 80));
        }
      }}
      onTouchEnd={() => {
        if (pullDistance > 60) { loadData('refresh'); } else setPullDistance(0);
        touchStart.current = 0;
      }}
    >
      <AppBar onViewChange={setCurrentView} onRefresh={() => loadData('refresh')} currentView={currentView} />
      
      <div className="fixed left-0 right-0 z-40 flex justify-center transition-all pointer-events-none" style={{ top: `${pullDistance + 10}px`, opacity: pullDistance / 60 }}>
        <div className={`p-2 bg-red-600 rounded-full shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
      </div>

      <main className="pt-24 px-4">{renderContent()}</main>
      <AIOracle />
      
      {selectedShort && (
        <ShortsPlayerOverlay 
          initialVideo={selectedShort.video} 
          videoList={selectedShort.list} 
          interactions={interactions}
          onClose={() => setSelectedShort(null)} 
          onLike={handleToggleLike} 
          onDislike={handleToggleDislike} 
          onSave={handleToggleSave} 
          onProgress={updateWatchHistory}
          onAllEnded={() => setSelectedShort(null)}
        />
      )}

      {selectedLong && (
        <LongPlayerOverlay 
          video={selectedLong.video} 
          onClose={() => setSelectedLong(null)}
          onLike={() => handleToggleLike(selectedLong.video.id || selectedLong.video.video_url)}
          onDislike={() => handleToggleDislike(selectedLong.video.id || selectedLong.video.video_url)}
          onSave={() => handleToggleSave(selectedLong.video.id || selectedLong.video.video_url)}
          onNext={() => {}} 
          onPrev={() => {}} 
          isLiked={interactions.likedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isDisliked={interactions.dislikedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isSaved={interactions.savedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          onProgress={(p) => updateWatchHistory(selectedLong.video.id || selectedLong.video.video_url, p)}
          onEnded={selectedLong.autoNext ? () => {} : undefined}
        />
      )}
    </div>
  );
};

export default App;
