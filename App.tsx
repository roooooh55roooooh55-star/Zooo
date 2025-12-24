
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
  const [refreshTrigger, setRefreshTrigger] = useState(0); 
  const [selectedShort, setSelectedShort] = useState<{ video: Video, list: Video[] } | null>(null);
  const [selectedLong, setSelectedLong] = useState<{ video: Video, list: Video[] } | null>(null);

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('al-hadiqa-categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });

  const [adminPassword, setAdminPassword] = useState(() => {
    try {
      return localStorage.getItem('al-hadiqa-admin-pass') || '506070';
    } catch (e) { return '506070'; }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [interactions, setInteractions] = useState<UserInteractions>(() => {
    try {
      const saved = localStorage.getItem('al-hadiqa-interactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds : [],
          dislikedIds: Array.isArray(parsed.dislikedIds) ? parsed.dislikedIds : [],
          savedIds: Array.isArray(parsed.savedIds) ? parsed.savedIds : [],
          watchHistory: Array.isArray(parsed.watchHistory) ? parsed.watchHistory : []
        };
      }
    } catch (e) { console.error("Error loading interactions", e); }
    return { likedIds: [], dislikedIds: [], savedIds: [], watchHistory: [] };
  });

  useEffect(() => {
    localStorage.setItem('al-hadiqa-interactions', JSON.stringify(interactions));
  }, [interactions]);

  useEffect(() => {
    localStorage.setItem('al-hadiqa-categories', JSON.stringify(categories));
  }, [categories]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCloudinaryVideos();
      setRawVideos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Critical Sync Error:", err);
      setRawVideos([]);
    } finally {
      // إطالة وقت التحميل قليلاً لضمان استقرار الواجهة
      setTimeout(() => setLoading(false), 800);
    }
  }, []);

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
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadData]);

  const handleVerifySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (authInput === adminPassword) {
      setIsAuthModalOpen(false);
      setAuthInput('');
      setAuthError(false);
      setCurrentView(AppView.ADMIN);
    } else {
      setAuthError(true);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const updateAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    localStorage.setItem('al-hadiqa-admin-pass', newPass);
  };

  const homeVideos = useMemo(() => {
    return rawVideos.filter(v => !interactions.dislikedIds.includes(v.id || v.video_url));
  }, [rawVideos, interactions.dislikedIds]);

  const renderContent = () => {
    if (currentView === AppView.ADMIN) {
      return (
        <AdminDashboard 
          onClose={() => setCurrentView(AppView.HOME)} 
          currentPassword={adminPassword} 
          onUpdatePassword={updateAdminPassword}
          categories={categories}
          onUpdateCategories={setCategories}
        />
      );
    }
    
    if (currentView === AppView.PRIVACY) {
      return <PrivacyPage onOpenAdmin={() => setIsAuthModalOpen(true)} />;
    }

    if (loading) return (
      <div className="flex flex-col items-center justify-center p-20 min-h-[60vh] animate-in fade-in duration-500">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-red-600 rounded-full animate-pulse opacity-50"></div>
            </div>
        </div>
        <p className="text-red-500 font-black mt-10 text-[9px] animate-pulse tracking-[0.4em] uppercase text-center">
            جاري فتح أرشيف الأرواح...<br/><span className="text-gray-700 text-[7px] mt-2 block">Synchronizing with Cloud Edge</span>
        </p>
      </div>
    );

    if (rawVideos.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-20 text-center gap-6 min-h-[50vh]">
          <div className="w-16 h-16 border-2 border-dashed border-red-600/30 rounded-full flex items-center justify-center opacity-50">
             <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <p className="text-gray-500 font-bold text-sm">الحديقة فارغة حالياً.. الأرواح في راحة.</p>
          <div className="flex gap-4">
            <button onClick={loadData} className="text-red-600 font-black text-xs border border-red-600/30 px-6 py-3 rounded-2xl bg-red-600/5 active:scale-95 transition-all">تحديث ↻</button>
            <button onClick={() => setCurrentView(AppView.PRIVACY)} className="text-gray-500 font-black text-xs border border-white/10 px-6 py-3 rounded-2xl bg-white/5 active:scale-95 transition-all">النظام</button>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case AppView.TREND:
        return <TrendPage onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} excludedIds={interactions.dislikedIds} />;
      case AppView.SAVED:
        return <SavedPage savedIds={interactions.savedIds} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} title="المحفوظات" />;
      case AppView.LIKES:
        return <SavedPage savedIds={interactions.likedIds} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} title="الإعجابات" />;
      case AppView.UNWATCHED:
        return <UnwatchedPage watchHistory={interactions.watchHistory} allVideos={rawVideos} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} />;
      case AppView.HIDDEN:
        return <HiddenVideosPage interactions={interactions} allVideos={rawVideos} onRestore={(id) => setInteractions(p=>({...p, dislikedIds: p.dislikedIds.filter(d=>d!==id)}))} onPlayShort={(v, l) => setSelectedShort({video:v, list:l})} onPlayLong={(v) => setSelectedLong({video:v, list:rawVideos})} />;
      default:
        return (
          <MainContent 
            key={refreshTrigger} 
            videos={homeVideos} 
            categoriesList={categories}
            interactions={interactions}
            onPlayShort={(v, l) => setSelectedShort({video:v, list:l})}
            onPlayLong={(v, l) => setSelectedLong({video:v, list:l})}
            onViewUnwatched={() => setCurrentView(AppView.UNWATCHED)}
            onResetHistory={handleRefreshFeed}
            onTurboCache={handleRefreshFeed}
            cacheStatus="idle"
            loading={loading}
          />
        );
    }
  };

  return (
    <div className="min-h-screen pb-4 max-w-md mx-auto relative bg-[#050505] overflow-x-hidden">
      <AppBar onViewChange={setCurrentView} onRefresh={handleRefreshFeed} currentView={currentView} />
      <main className="pt-24 px-4">{renderContent()}</main>
      <AIOracle />
      
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className={`w-full bg-[#0a0a0a] border-2 rounded-[3rem] p-10 transition-all duration-300 ${authError ? 'border-red-600 shadow-[0_0_60px_red]' : 'border-white/10 shadow-2xl'}`}>
            <h2 className="text-2xl font-black text-red-600 italic mb-2 text-right">مصادقة المطور</h2>
            <p className="text-xs text-gray-600 mb-10 text-right font-bold uppercase tracking-widest">Security Clearance Required</p>
            
            <form onSubmit={handleVerifySubmit} className="flex flex-col gap-6">
              <input 
                type="password"
                autoFocus
                value={authInput}
                onChange={(e) => setAuthInput(e.target.value)}
                placeholder="رمز الوصول"
                className={`w-full bg-white/5 border-2 rounded-2xl py-5 px-6 text-center text-2xl font-black outline-none transition-all ${authError ? 'border-red-600 text-red-500 animate-shake' : 'border-white/10 text-white focus:border-red-600'}`}
              />
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-red-600 text-white font-black py-5 rounded-2xl shadow-[0_0_25px_red] active:scale-95 transition-all">دخول</button>
                <button type="button" onClick={() => { setIsAuthModalOpen(false); setAuthInput(''); setAuthError(false); }} className="px-8 bg-white/5 text-gray-500 font-bold py-5 rounded-2xl border border-white/10 active:scale-95 transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedShort && (
        <ShortsPlayerOverlay 
          initialVideo={selectedShort.video} 
          videoList={selectedShort.list} 
          interactions={interactions}
          onClose={() => setSelectedShort(null)} 
          onLike={(id) => setInteractions(p => ({...p, likedIds: Array.from(new Set([...p.likedIds, id]))}))} 
          onDislike={(id) => setInteractions(p => ({...p, dislikedIds: Array.from(new Set([...p.dislikedIds, id]))}))} 
          onSave={(id) => setInteractions(p => ({...p, savedIds: Array.from(new Set([...p.savedIds, id]))}))} 
          onProgress={updateWatchHistory}
        />
      )}

      {selectedLong && (
        <LongPlayerOverlay 
          video={selectedLong.video} 
          allLongVideos={selectedLong.list}
          onClose={() => setSelectedLong(null)}
          onLike={() => setInteractions(p => ({...p, likedIds: Array.from(new Set([...p.likedIds, selectedLong.video.id || selectedLong.video.video_url]))}))}
          onDislike={() => setInteractions(p => ({...p, dislikedIds: Array.from(new Set([...p.dislikedIds, selectedLong.video.id || selectedLong.video.video_url]))}))}
          onSave={() => setInteractions(p => ({...p, savedIds: Array.from(new Set([...p.savedIds, selectedLong.video.id || selectedLong.video.video_url]))}))}
          onSwitchVideo={(v) => setSelectedLong({ video: v, list: selectedLong.list })}
          isLiked={interactions.likedIds.includes(selectedLong.video.id || selectedLong.video.video_url)} 
          isDisliked={interactions.dislikedIds.includes(selectedLong.video.id || selectedLong.video.video_url)} 
          isSaved={interactions.savedIds.includes(selectedLong.video.id || selectedLong.video.video_url)}
          onProgress={(p) => updateWatchHistory(selectedLong.video.id || selectedLong.video.video_url, p)}
        />
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default App;
