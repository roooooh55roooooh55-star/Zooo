
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

const CACHE_NAME = 'hadiqa-deep-cache-v1';

const cacheVideoContent = async (url: string) => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(url);
    if (!cachedResponse) {
      const response = await fetch(url, { mode: 'no-cors' });
      if (response.ok || response.type === 'opaque') {
        await cache.put(url, response.clone());
        return true;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [rawVideos, setRawVideos] = useState<Video[]>([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [pullDistance, setPullDistance] = useState(0);
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'caching' | 'done'>('idle');
  const touchStart = useRef<number>(0);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    const saved = localStorage.getItem('al-hadiqa-interactions');
    return saved ? JSON.parse(saved) : { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const data = await fetchVideos(undefined, 800);
      if (data && data.length > 0) {
        setRawVideos(data);
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullDistance(0);
    }
  }, []);

  const handleTurboCache = async () => {
    if (cacheStatus !== 'idle') return;
    setCacheStatus('caching');
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
    const pool = rawVideos.slice(0, 50);
    const promises = pool.map(v => cacheVideoContent(v.video_url));
    await Promise.all(promises);
    setCacheStatus('done');
    if (navigator.vibrate) navigator.vibrate(150);
    setTimeout(() => setCacheStatus('idle'), 5000);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateWatchHistory = (id: string, progress: number) => {
    setInteractions(prev => {
      const history = [...prev.watchHistory];
      const index = history.findIndex(h => h.id === id);
      if (index > -1) { 
        if (progress > history[index].progress) history[index].progress = progress; 
      } 
      else { history.push({ id, progress }); }
      return { ...prev, watchHistory: history };
    });
  };

  const handleRefreshFeed = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    if (navigator.vibrate) navigator.vibrate(50);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePlayShort = (v: Video, list: Video[]) => {
    updateWatchHistory(v.id || v.video_url, 0.01);
    setSelectedShort({ video: v, list });
  };

  const handlePlayLong = (v: Video, list: Video[]) => {
    updateWatchHistory(v.id || v.video_url, 0.01);
    setSelectedLong({ video: v, list });
  };

  const homeVideos = useMemo(() => {
    if (rawVideos.length === 0) return [];
    const watchedIds = new Set(interactions.watchHistory.filter(h => h.progress > 0.8).map(h => h.id));
    const savedIdsSet = new Set(interactions.savedIds);
    
    // تصفية الفيديوهات: استبعاد المخفية واستبعاد المحفوظة (خاصة الشورتس)
    let pool = rawVideos.filter(v => {
      const id = v.id || v.video_url;
      // استبعاد الفيديوهات المستبعدة يدوياً
      if (interactions.dislikedIds.includes(id)) return false;
      // استبعاد الفيديوهات المحفوظة لضمان عدم تكرارها في الصفحة الرئيسية
      if (savedIdsSet.has(id)) return false;
      return true;
    });

    const unwatched = pool.filter(v => !watchedIds.has(v.id || v.video_url));
    const watched = pool.filter(v => watchedIds.has(v.id || v.video_url));

    const shuffle = (array: Video[]) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    return [...shuffle(unwatched), ...shuffle(watched)];
  }, [rawVideos, interactions.dislikedIds, interactions.savedIds, interactions.watchHistory, refreshTrigger]);

  const allLongsPool = useMemo(() => rawVideos.filter(v => v.type === 'long'), [rawVideos]);

  const handleToggleLike = async (id: string) => {
    const isLiked = interactions.likedIds.includes(id);
    setInteractions(prev => ({
      ...prev,
      likedIds: isLiked ? prev.likedIds.filter(v => v !== id) : [...prev.likedIds, id]
    }));
    try { await updateLikesInDB(id, !isLiked); } catch (e) {}
  };

  const handleToggleSave = (id: string) => {
    setInteractions(prev => ({
      ...prev,
      savedIds: prev.savedIds.includes(id) ? prev.savedIds.filter(v => v !== id) : [...prev.savedIds, id]
    }));
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.TREND:
        return <TrendPage onPlayShort={handlePlayShort} onPlayLong={(v) => handlePlayLong(v, allLongsPool)} excludedIds={interactions.dislikedIds} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} allVideos={rawVideos} onPlayShort={handlePlayShort} onPlayLong={(v) => handlePlayLong(v, allLongsPool)} title="المحفوظات" />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} allVideos={rawVideos} onPlayShort={handlePlayShort} onPlayLong={(v) => handlePlayLong(v, allLongsPool)} title="الإعجابات" />;
      case AppView.UNWATCHED:
        return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={rawVideos} onPlayShort={handlePlayShort} onPlayLong={(v) => handlePlayLong(v, allLongsPool)} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(p => ({ ...p, dislikedIds: p.dislikedIds.filter(v => v !== id) }))} onPlayShort={handlePlayShort} onPlayLong={(v) => handlePlayLong(v, allLongsPool)} />;
      case AppView.PRIVACY:
        return <PrivacyPage />;
      default:
        return (
          <MainContent 
            key={refreshTrigger} 
            videos={homeVideos} 
            interactions={interactions}
            onPlayShort={handlePlayShort}
            onPlayLong={(v, list) => handlePlayLong(v, list)}
            onViewUnwatched={() => setCurrentView(AppView.UNWATCHED)}
            onResetHistory={handleRefreshFeed}
            onTurboCache={handleTurboCache}
            cacheStatus={cacheStatus}
            loading={loading && rawVideos.length === 0}
          />
        );
    }
  };

  return (
    <div 
      className="min-h-screen pb-4 max-w-md mx-auto relative bg-[#050505] touch-pan-y"
      onTouchStart={(e) => { 
        if (window.scrollY <= 1) touchStart.current = e.touches[0].clientY; 
      } }
      onTouchMove={(e) => {
        if (window.scrollY <= 1 && touchStart.current > 0) {
          const diff = e.touches[0].clientY - touchStart.current;
          if (diff > 10) { 
            setPullDistance(Math.min(diff / 2, 70));
          }
        } else {
          // إذا لم نكن في الأعلى، نقوم بتصفير touchStart للسماح بالتمرير الطبيعي
          touchStart.current = 0;
        }
      }}
      onTouchEnd={() => {
        if (pullDistance > 55) {
          setRefreshing(true);
          handleRefreshFeed();
          // تختفي علامة التحميل فوراً لبدء التحديث
          setPullDistance(0);
          setTimeout(() => setRefreshing(false), 800);
        } else {
          setPullDistance(0);
        }
        touchStart.current = 0;
      }}
    >
      <AppBar onViewChange={setCurrentView} onRefresh={handleRefreshFeed} currentView={currentView} />
      
      {/* علامة التحميل تظهر فقط أثناء السحب وتختفي فوراً عند الإفلات */}
      <div className="fixed left-0 right-0 z-[60] flex justify-center transition-all pointer-events-none" style={{ top: `${pullDistance + 10}px`, opacity: pullDistance / 55 }}>
        <div className={`p-2 bg-red-600 rounded-full shadow-[0_0_25px_red] ${refreshing || pullDistance < 10 ? 'scale-0' : 'scale-100'}`}>
          <svg className="w-5 h-5 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M19 9l-7 7-7-7" /></svg>
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
          onDislike={(id) => setInteractions(prev => ({ ...prev, dislikedIds: [...prev.dislikedIds, id] }))} 
          onSave={handleToggleSave} 
          onProgress={updateWatchHistory}
          onAllEnded={() => setSelectedShort(null)}
        />
      )}

      {selectedLong && (
        <LongPlayerOverlay 
          video={selectedLong.video} 
          allLongVideos={selectedLong.list}
          onClose={() => setSelectedLong(null)}
          onLike={() => handleToggleLike(selectedLong.video.id || selectedLong.video.video_url)}
          onDislike={() => setInteractions(prev => ({ ...prev, dislikedIds: [...prev.dislikedIds, (selectedLong.video.id || selectedLong.video.video_url)] }))}
          onSave={() => handleToggleSave(selectedLong.video.id || selectedLong.video.video_url)}
          onSwitchVideo={(v) => {
            updateWatchHistory(v.id || v.video_url, 0.01);
            setSelectedLong({ video: v, list: selectedLong.list });
          }}
          isLiked={interactions.likedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isDisliked={interactions.dislikedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          isSaved={interactions.savedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          onProgress={(p) => updateWatchHistory(selectedLong.video.id || selectedLong.video.video_url, p)}
        />
      )}
    </div>
  );
};

export default App;
