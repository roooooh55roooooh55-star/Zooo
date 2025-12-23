
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

// وظيفة للتحميل المسبق في ذاكرة المتصفح
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
  
  const touchStart = useRef<number>(0);
  const [pullDistance, setPullDistance] = useState(0);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    const saved = localStorage.getItem('al-hadiqa-interactions');
    return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // جلب آخر 100 فيديو مضاف لضمان الحداثة
      const data = await fetchVideos(undefined, 100);
      if (data && data.length > 0) {
        // نخلطهم لضمان واجهة "حية" ومتغيرة دائماً للمستخدم
        const shuffled = shuffleArray(data);
        setVideos(shuffled);
        
        // تحميل مسبق مكثف (أول 10 فيديوهات) لضمان سرعة فائقة
        shuffled.slice(0, 10).forEach(v => preloadVideoFile(v.video_url));
      }
    } catch (err) {
      console.error("Data load error", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullDistance(0);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStart.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && touchStart.current > 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStart.current;
      if (diff > 0) {
        setPullDistance(Math.min(diff / 2, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      setRefreshing(true);
      loadData();
    } else {
      setPullDistance(0);
    }
    touchStart.current = 0;
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

  const handleNextLong = () => {
    if (!selectedLong) return;
    const { video, list, autoNext } = selectedLong;
    const currentIndex = list.findIndex(v => (v.id === video.id || v.video_url === video.video_url));
    if (currentIndex < list.length - 1) {
      setSelectedLong({ video: list[currentIndex + 1], list, autoNext });
    } else {
      setSelectedLong(null);
    }
  };

  const renderContent = () => {
    const activeVideos = videos.filter(v => !interactions.dislikedIds.includes(v.id || v.video_url));

    switch (currentView) {
      case AppView.TREND:
        return <TrendPage onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: activeVideos.filter(vid => vid.type === 'long'), autoNext: true })} excludedIds={interactions.dislikedIds} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} allVideos={activeVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: activeVideos.filter(v => interactions.savedIds.includes(v.id || v.video_url)), autoNext: true })} />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} allVideos={activeVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: activeVideos.filter(v => interactions.likedIds.includes(v.id || v.video_url)), autoNext: true })} title="الإعجابات" />;
      case AppView.UNWATCHED:
        return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={activeVideos} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: activeVideos.filter(vid => vid.type === 'long'), autoNext: true })} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={videos} onRestore={handleToggleDislike} onPlayShort={(v, list) => setSelectedShort({ video: v, list })} onPlayLong={(v) => setSelectedLong({ video: v, list: [v], autoNext: false })} />;
      case AppView.PRIVACY:
        return <PrivacyPage />;
      default:
        return (
          <MainContent 
            videos={videos} 
            interactions={interactions}
            onPlayShort={(v, list) => setSelectedShort({ video: v, list })}
            onPlayLong={(v, autoNext = false) => setSelectedLong({ video: v, list: activeVideos.filter(vid => vid.type === 'long'), autoNext })}
            onViewUnwatched={() => setCurrentView(AppView.UNWATCHED)}
            loading={loading || refreshing}
          />
        );
    }
  };

  return (
    <div 
      className="min-h-screen pb-20 max-w-md mx-auto relative bg-[#0f0f0f] shadow-2xl overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AppBar onViewChange={setCurrentView} onRefresh={loadData} currentView={currentView} />
      
      <div 
        className="fixed left-0 right-0 z-40 flex justify-center transition-all pointer-events-none" 
        style={{ top: `${pullDistance + 10}px`, opacity: pullDistance / 60 }}
      >
        <div className={`p-2 bg-red-600 rounded-full shadow-lg ${refreshing ? 'animate-spin' : ''}`}>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
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
          onNext={handleNextLong}
          onPrev={() => {}} 
          isLiked={interactions.likedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isDisliked={interactions.dislikedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isSaved={interactions.savedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          onProgress={(p) => updateWatchHistory(selectedLong.video.id || selectedLong.video.video_url, p)}
          onEnded={selectedLong.autoNext ? handleNextLong : undefined}
        />
      )}
    </div>
  );
};

export default App;
