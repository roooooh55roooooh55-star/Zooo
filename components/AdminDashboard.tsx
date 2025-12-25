
import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { fetchCloudinaryVideos } from '../cloudinaryClient';

const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

interface AdminDashboardProps {
  onClose: () => void;
  currentPassword: string;
  onUpdatePassword: (pass: string) => void;
  categories: string[];
  onUpdateCategories: (cats: string[]) => void;
  onNewVideo?: (v: Video) => void;
  onDeleteVideo?: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, currentPassword, categories, onUpdateCategories, onNewVideo, onDeleteVideo 
}) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(categories[0] || '');
  
  // حالة الفيديو المفتوح للخيارات
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await fetchCloudinaryVideos();
      setVideos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVideos(); }, []);

  const handleEditTitle = (video: Video) => {
    const newTitle = window.prompt("تعديل عنوان الفيديو:", video.title);
    if (newTitle !== null && newTitle.trim() !== "") {
      const updatedVideos = videos.map(v => 
        (v.id === video.id || v.video_url === video.video_url) ? { ...v, title: newTitle.trim() } : v
      );
      setVideos(updatedVideos);
      // تحديث الكاش المحلي لضمان ظهور الاسم الجديد فوراً
      localStorage.setItem('app_videos_cache', JSON.stringify(updatedVideos));
      alert("تم تحديث العنوان بنجاح.");
    }
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm("⚠️ تحذير: هل أنت متأكد من حذف هذا الفيديو نهائياً من مستودع Cloudinary ومن التطبيق؟ لا يمكن استعادة الفيديو بعد الحذف.");
    if (confirmed) {
      setVideos(prev => prev.filter(v => (v.id || v.video_url) !== id));
      
      // إزالة من الكاش
      const cached = localStorage.getItem('app_videos_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter((v: any) => (v.id || v.video_url) !== id);
        localStorage.setItem('app_videos_cache', JSON.stringify(filtered));
      }

      if (onDeleteVideo) onDeleteVideo(id);
      alert("تم حذف الفيديو من النظام بنجاح.");
    }
    setActiveMenuId(null);
  };

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) {
      alert("مكتبة Cloudinary لم يتم تحميلها بعد.");
      return;
    }

    setIsUploading(true);
    cloudinary.openUploadWidget(
      {
        cloudName: 'dlrvn33p0',
        uploadPreset: 'Good.zooo',
        folder: 'app_videos',
        tags: ['hadiqa_v4', uploadCategory],
        context: { custom: { caption: uploadTitle || "بدون عنوان" } },
        resourceType: 'video'
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setIsUploading(false);
          const newVideo: Video = {
            id: result.info.public_id,
            public_id: result.info.public_id,
            video_url: result.info.secure_url,
            title: uploadTitle || "فيديو جديد",
            category: uploadCategory,
            type: result.info.height > result.info.width ? 'short' : 'long',
            likes: 0,
            views: 0
          };
          setVideos(prev => [newVideo, ...prev]);
          if (onNewVideo) onNewVideo(newVideo);
          setUploadTitle('');
        } else if (result && result.event === "close") {
          setIsUploading(false);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] overflow-y-auto p-6 text-right pb-40" dir="rtl">
      {/* هيدر اللوحة */}
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-6">
        <div className="flex items-center gap-4">
          <img src={LOGO_URL} className="w-12 h-12 rounded-full border-2 border-red-600 shadow-[0_0_20px_red]" />
          <div>
            <h1 className="text-xl font-black text-red-600 italic leading-none">إدارة المستودع</h1>
            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Master Control Center</p>
          </div>
        </div>
        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-red-500 border border-red-600/20 active:scale-75 transition-all shadow-inner">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* نموذج الرفع */}
      <div className="mb-12 bg-neutral-900/50 border border-red-600/30 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 opacity-20 group-hover:opacity-100 transition-opacity"></div>
        <h2 className="text-lg font-black text-white mb-6 flex items-center gap-3">
           <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
           إضافة فيديو جديد للمستودع
        </h2>
        <input 
          type="text" placeholder="ما هو عنوان الكابوس؟" value={uploadTitle}
          onChange={(e) => setUploadTitle(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-2xl p-5 text-white mb-4 outline-none focus:border-red-600 transition-all text-sm font-bold shadow-inner"
        />
        <select 
          value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-2xl p-5 text-red-500 font-black mb-6 outline-none appearance-none text-sm shadow-inner"
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button 
          onClick={openUploadWidget} 
          disabled={isUploading} 
          className="w-full bg-red-600 py-5 rounded-2xl font-black text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M12 4v16m8-8H4"/></svg>
          )}
          <span>{isUploading ? "جاري استحضار الفيديو..." : "رفع فيديو إلى Cloudinary"}</span>
        </button>
      </div>

      {/* قائمة الفيديوهات للإدارة */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-xl font-black text-white italic">إدارة المحتوى ({videos.length})</h2>
           <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Repository</span>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 italic">
             <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p>جاري سحب القائمة من المستودع...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {videos.map(v => {
              const videoId = v.id || v.video_url;
              const isOpen = activeMenuId === videoId;
              return (
                <div key={videoId} className="relative group">
                  <div 
                    onClick={() => setActiveMenuId(isOpen ? null : videoId)}
                    className={`bg-neutral-900 border p-4 rounded-3xl flex items-center gap-4 transition-all cursor-pointer ${isOpen ? 'border-red-600 bg-red-950/20 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'border-white/5 hover:border-white/20'}`}
                  >
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black shrink-0 border border-white/5">
                      <video src={v.video_url} className="w-full h-full object-cover opacity-60" />
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <p className="text-white text-sm font-black line-clamp-1 leading-tight">{v.title}</p>
                      <p className="text-red-600 text-[9px] font-black uppercase mt-1 tracking-widest">{v.category} • {v.type.toUpperCase()}</p>
                    </div>
                    <svg className={`w-5 h-5 text-gray-700 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                  </div>

                  {/* منيو الخيارات */}
                  {isOpen && (
                    <div className="mt-2 flex gap-2 animate-in slide-in-from-top-3 duration-300">
                      <button 
                        onClick={() => handleEditTitle(v)}
                        className="flex-1 bg-blue-600/20 border border-blue-600/50 text-blue-500 py-4 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        تعديل العنوان
                      </button>
                      <button 
                        onClick={() => handleDelete(videoId)}
                        className="flex-1 bg-red-600/20 border border-red-600/50 text-red-600 py-4 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        حذف نهائي
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
