
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Video, AppView, UserInteractions } from './types.ts';
import { fetchCloudinaryVideos } from './cloudinaryClient.ts';
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
import AdminDashboard from './components/AdminDashboard.tsx';

const DEFAULT_CATEGORIES = ['رعب حقيقي', 'قصص رعب', 'غموض', 'ما وراء الطبيعة', 'أرشيف المطور'];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [rawVideos, setRawVideos] = useState<Video[]>([]); 
  const [loading, setLoading] = useState(true);
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);

  const [deletedByAdmin, setDeletedByAdmin] = useState<string[]>(() => {
    const saved = localStorage.getItem('al-hadiqa-deleted-ids');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('al-hadiqa-categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [adminPassword, setAdminPassword] = useState('506070');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInput, setAuthInput] = useState('');

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    try {
      const saved = localStorage.getItem('al-hadiqa-interactions');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCloudinaryVideos();
      // خلط الفيديوهات عشوائياً عند التحميل لضمان التغيير المستمر
      const shuffled = data.sort(() => Math.random() - 0.5);
      const filtered = shuffled.filter(v => !deletedByAdmin.includes(v.id || v.video_url));
      setRawVideos(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [deletedByAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // وظيفة إعادة التشغيل الكامل ومسح الذاكرة
  const handleHardReset = useCallback(() => {
    if (window.confirm("هل تريد إعادة ضبط الحديقة ومسح الذاكرة المؤقتة؟")) {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  const updateWatchHistory = (id: string, progress: number) => {
    setInteractions(prev => {
      const history = [...prev.watchHistory];
      const index = history.findIndex(h => h.id === id);
      if (index > -1) {
        if (progress > history[index].progress) history[index].progress = progress;
      } else {
        history.push({ id, progress });
      }
      return { ...prev, watchHistory: history };
    });
  };

  const renderContent = () => {
    if (currentView === AppView.ADMIN) {
      return (
        <AdminDashboard 
          onClose={() => setCurrentView(AppView.HOME)} 
          currentPassword={adminPassword} 
          onUpdatePassword={setAdminPassword}
          categories={categories}
          onUpdateCategories={setCategories}
          onNewVideo={(v) => setRawVideos(prev => [v, ...prev])}
          onDeleteVideo={(id) => {
             setDeletedByAdmin(p => [...p, id]);
             setRawVideos(v => v.filter(x => (x.id || x.video_url) !== id));
          }}
        />
      );
    }

    switch (currentView) {
      case AppView.TREND: return <TrendPage onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} excludedIds={interactions.dislikedIds} />;
      case AppView.SAVED: return <SavedPage savedIds={interactions.savedIds} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} />;
      case AppView.UNWATCHED: return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} />;
      case AppView.PRIVACY: return <PrivacyPage onOpenAdmin={() => setIsAuthModalOpen(true)} />;
      case AppView.HIDDEN: return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(p => ({...p, dislikedIds: p.dislikedIds.filter(x => x !== id)}))} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} />;
      default:
        return (
          <MainContent 
            videos={rawVideos} 
            categoriesList={categories}
            interactions={interactions}
            onPlayShort={(v, l) => setSelectedShort({video:v, list:l})}
            onPlayLong={(v, l) => setSelectedLong({video:v, list:l})}
            onResetHistory={loadData}
            onHardReset={handleHardReset}
            loading={loading}
          />
        );
    }
  };

  return (
    <div className="min-h-screen pb-4 max-w-md mx-auto relative bg-[#050505] overflow-x-hidden">
      <AppBar onViewChange={setCurrentView} onRefresh={loadData} currentView={currentView} />
      <main className="pt-24">{renderContent()}</main>
      <AIOracle />
      
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-6 backdrop-blur-xl">
          <div className="w-full bg-neutral-900 border-2 border-red-600/30 rounded-[3rem] p-10 shadow-[0_0_50px_red]">
            <h2 className="text-2xl font-black text-red-600 mb-6 text-right">إذن المطور</h2>
            <input 
              type="password" autoFocus value={authInput}
              onChange={(e) => setAuthInput(e.target.value)}
              className="w-full bg-black border-2 border-white/10 rounded-2xl py-4 px-6 text-center text-xl text-white outline-none focus:border-red-600 mb-6"
              placeholder="الرمز السري"
            />
            <div className="flex gap-4">
              <button onClick={() => {
                if(authInput === adminPassword) { setIsAuthModalOpen(false); setCurrentView(AppView.ADMIN); setAuthInput(''); }
                else { setAuthInput(''); alert('رمز غير صحيح'); }
              }} className="flex-1 bg-red-600 py-4 rounded-xl font-black text-white shadow-[0_0_20px_red]">دخول</button>
              <button onClick={() => setIsAuthModalOpen(false)} className="px-6 bg-white/10 text-gray-400 py-4 rounded-xl font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {selectedShort && (
        <ShortsPlayerOverlay 
          initialVideo={selectedShort.video} 
          videoList={selectedShort.list} 
          interactions={interactions}
          onClose={() => setSelectedShort(null)} 
          onLike={(id) => setInteractions(p => ({...p, likedIds: p.likedIds.includes(id) ? p.likedIds.filter(x => x !== id) : [...p.likedIds, id], dislikedIds: p.dislikedIds.filter(x => x !== id)}))} 
          onDislike={(id) => setInteractions(p => ({...p, dislikedIds: p.dislikedIds.includes(id) ? p.dislikedIds.filter(x => x !== id) : [...p.dislikedIds, id], likedIds: p.likedIds.filter(x => x !== id)}))} 
          onSave={(id) => setInteractions(p => ({...p, savedIds: p.savedIds.includes(id) ? p.savedIds.filter(x => x !== id) : [...p.savedIds, id]}))} 
          onProgress={updateWatchHistory}
        />
      )}

      {selectedLong && (
        <LongPlayerOverlay 
          video={selectedLong.video} 
          allLongVideos={selectedLong.list}
          onClose={() => setSelectedLong(null)}
          onLike={() => setInteractions(p => ({...p, likedIds: p.likedIds.includes(selectedLong.video.id) ? p.likedIds.filter(x => x !== selectedLong.video.id) : [...p.likedIds, selectedLong.video.id], dislikedIds: p.dislikedIds.filter(x => x !== selectedLong.video.id)}))}
          onDislike={() => setInteractions(p => ({...p, dislikedIds: p.dislikedIds.includes(selectedLong.video.id) ? p.dislikedIds.filter(x => x !== selectedLong.video.id) : [...p.dislikedIds, selectedLong.video.id], likedIds: p.likedIds.filter(x => x !== selectedLong.video.id)}))}
          onSave={() => setInteractions(p => ({...p, savedIds: p.savedIds.includes(selectedLong.video.id) ? p.savedIds.filter(x => x !== selectedLong.video.id) : [...p.savedIds, selectedLong.video.id]}))}
          onSwitchVideo={(v) => setSelectedLong({ video: v, list: selectedLong.list })}
          isLiked={interactions.likedIds.includes(selectedLong.video.id)} 
          isDisliked={interactions.dislikedIds.includes(selectedLong.video.id)} 
          isSaved={interactions.savedIds.includes(selectedLong.video.id)}
          onProgress={(p) => updateWatchHistory(selectedLong.video.id, p)}
        />
      )}
    </div>
  );
};

export default App;
