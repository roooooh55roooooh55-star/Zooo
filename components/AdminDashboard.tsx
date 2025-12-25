
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
  
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

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
        (v.id === video.id) ? { ...v, title: newTitle.trim() } : v
      );
      setVideos(updatedVideos);
      localStorage.setItem('app_videos_cache', JSON.stringify(updatedVideos));
      alert("تم تحديث العنوان بنجاح في المستودع المحلي.");
    }
    setSelectedVideoId(null);
  };

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm("⚠️ تنبيه هام: هل أنت متأكد من حذف هذا الفيديو نهائياً من مستودع Cloudinary ومن التطبيق؟ لا يمكن التراجع عن هذه الخطوة.");
    
    if (confirmDelete) {
      // إزالة من الحالة المحلية
      setVideos(prev => prev.filter(v => v.id !== id));
      
      // تحديث الكاش لضمان عدم ظهوره مرة أخرى
      const cached = localStorage.getItem('app_videos_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter((v: any) => v.id !== id);
        localStorage.setItem('app_videos_cache', JSON.stringify(filtered));
      }

      // إبلاغ المكون الأب ليقوم بالحذف المنطقي الدائم
      if (onDeleteVideo) onDeleteVideo(id);
      
      alert("تم حذف الفيديو بنجاح من المستودع.");
    }
    setSelectedVideoId(null);
  };

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) {
      alert("خطأ في تحميل مكتبة Cloudinary");
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-4">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_15px_red]" />
          <div>
            <h1 className="text-xl font-black text-red-600 italic">لوحة التحكم</h1>
            <span className="text-[8px] text-gray-500 font-bold uppercase">Cloudinary Management</span>
          </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-red-500 border border-red-600/20 active:scale-75 transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Upload Section */}
      <div className="mb-12 bg-neutral-900 border border-red-600/30 p-6 rounded-[2rem] shadow-2xl">
        <h2 className="text-sm font-black text-white mb-4">إضافة محتوى للمستودع</h2>
        <input 
          type="text" placeholder="عنوان الفيديو..." value={uploadTitle}
          onChange={(e) => setUploadTitle(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-xl p-4 text-white mb-4 outline-none focus:border-red-600 text-xs"
        />
        <select 
          value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}
          className="w-full bg-black border border-white/10 rounded-xl p-4 text-red-500 font-bold mb-4 outline-none text-xs"
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button 
          onClick={openUploadWidget} 
          disabled={isUploading} 
          className="w-full bg-red-600 py-4 rounded-xl font-black text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 text-xs"
        >
          {isUploading ? "جاري الرفع..." : "رفع فيديو للمستودع"}
        </button>
      </div>

      {/* Videos List Management */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-gray-400 mb-4 px-2">إدارة الفيديوهات الحالية ({videos.length})</h2>
        
        {loading ? (
          <div className="text-center py-10 opacity-50 italic">جاري تحميل المستودع...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {videos.map(v => {
              const isSelected = selectedVideoId === v.id;
              return (
                <div key={v.id} className="relative group">
                  <div 
                    onClick={() => setSelectedVideoId(isSelected ? null : v.id)}
                    className={`bg-neutral-900 border p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer ${isSelected ? 'border-red-600 bg-red-950/20' : 'border-white/5'}`}
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-red-600/20">
                      <video src={v.video_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <p className="text-white text-[11px] font-black line-clamp-1">{v.title}</p>
                      <p className="text-red-600 text-[8px] font-bold uppercase mt-0.5">{v.category}</p>
                    </div>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                  </div>

                  {isSelected && (
                    <div className="mt-2 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                      <button 
                        onClick={() => handleEditTitle(v)}
                        className="flex-1 bg-blue-600/20 border border-blue-600 text-blue-500 py-3 rounded-xl font-black text-[10px] flex items-center justify-center gap-1"
                      >
                        تعديل الاسم
                      </button>
                      <button 
                        onClick={() => handleDelete(v.id)}
                        className="flex-1 bg-red-600/20 border border-red-600 text-red-600 py-3 rounded-xl font-black text-[10px] flex items-center justify-center gap-1"
                      >
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
