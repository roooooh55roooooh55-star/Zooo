
import React, { useState, useEffect } from 'react';
import { Video } from '../types';
import { fetchCloudinaryVideos, deleteCloudinaryVideo, updateCloudinaryMetadata } from '../cloudinaryClient';

const CATEGORIES = ['رعب حقيقي', 'قصص رعب', 'غموض', 'ما وراء الطبيعة', 'أرشيف المطور'];

interface AdminDashboardProps {
  onClose: () => void;
  currentPassword: string;
  onUpdatePassword: (pass: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, currentPassword, onUpdatePassword }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPassInput, setNewPassInput] = useState(currentPassword);
  const [showPassSettings, setShowPassSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const data = await fetchCloudinaryVideos();
      setVideos(data);
    } catch (e) {
      console.error("Failed to load admin videos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVideos(); }, []);

  const handleDelete = async (pid: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو نهائياً من السحابة؟')) {
      setIsProcessing(pid);
      const ok = await deleteCloudinaryVideo(pid);
      if (ok) {
        alert('تم الحذف بنجاح');
        loadVideos();
      } else {
        alert('فشل الحذف. يرجى المحاولة لاحقاً.');
      }
      setIsProcessing(null);
    }
  };

  const handleUpdate = async (v: Video, newTitle: string, newCategory: any) => {
    setIsProcessing(v.public_id);
    const ok = await updateCloudinaryMetadata(v.public_id, newTitle, newCategory);
    if (ok) {
      // لا نحتاج لإعادة التحميل هنا لتوفير البيانات، فقط نحدث الحالة المحلية
      setVideos(prev => prev.map(vid => vid.public_id === v.public_id ? {...vid, title: newTitle, category: newCategory} : vid));
    }
    setIsProcessing(null);
  };

  const handleUpdatePassword = () => {
    if (newPassInput.length < 4) {
      alert("الرمز قصير جداً!");
      return;
    }
    onUpdatePassword(newPassInput);
    alert("تم تحديث رمز العبور.");
    setShowPassSettings(false);
  };

  const openUploadWidget = () => {
    const cloudinary = (window as any).cloudinary;
    if (!cloudinary) {
      alert("مكتبة الرفع لم تتحمل بعد، يرجى الانتظار ثانية.");
      return;
    }

    if (!uploadTitle.trim()) {
      alert("يجب كتابة اسم للفيديو قبل الرفع.");
      return;
    }

    setIsUploading(true);

    cloudinary.openUploadWidget(
      {
        cloudName: 'dlrvn33p0',
        uploadPreset: 'Good.zooo',
        sources: ['local', 'url', 'camera'],
        resourceType: 'video',
        clientAllowedFormats: ['mp4', 'mov', 'avi', 'mkv'],
        context: { caption: uploadTitle },
        tags: [uploadCategory],
        maxFiles: 1,
        styles: {
          palette: {
            window: "#000000",
            sourceBg: "#050505",
            windowBorder: "#FF0000",
            tabIcon: "#FF0000",
            inactiveTabIcon: "#444444",
            menuIcons: "#FF0000",
            link: "#FF0000",
            action: "#FF0000",
            inProgress: "#FF0000",
            complete: "#22C55E",
            error: "#EF4444",
            textDark: "#000000",
            textLight: "#FFFFFF"
          }
        }
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setIsUploading(false);
          setUploadTitle('');
          console.log("Upload Success:", result.info);
          alert("تم الرفع! الأرواح تعالج الفيديو الآن.. سيظهر خلال لحظات.");
          
          // ننتظر 5 ثوانٍ قبل التحديث لضمان أن Cloudinary أتم الفهرسة
          setTimeout(() => {
            loadVideos();
          }, 5000);
        } else if (result && result.event === "close") {
          setIsUploading(false);
        } else if (error) {
          setIsUploading(false);
          alert("فشل الرفع. تأكد من حجم الملف.");
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] overflow-y-auto p-6 font-sans text-right pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-4">
        <h1 className="text-2xl font-black text-red-600 italic">بوابة التحكم</h1>
        <button onClick={onClose} className="bg-white/10 px-4 py-2 rounded-xl text-gray-300 font-bold active:scale-95 transition-all">خروج</button>
      </div>

      <div className="mb-6 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div>
          <p className="text-xs text-gray-500 font-bold">إدارة الدخول</p>
          <button 
            onClick={() => setShowPassSettings(!showPassSettings)}
            className="text-[10px] text-red-500 font-black mt-1"
          >
            {showPassSettings ? 'إخفاء الإعدادات' : 'تغيير الرمز السري'}
          </button>
        </div>
        <button onClick={loadVideos} className="bg-blue-600/20 text-blue-500 text-[10px] font-black px-4 py-2 rounded-xl border border-blue-500/30 active:scale-95">تحديث المكتبة ↻</button>
      </div>

      {showPassSettings && (
        <div className="mb-6 p-4 bg-red-600/5 rounded-2xl border border-red-600/20 flex flex-col gap-3 animate-in slide-in-from-top-2">
          <input 
            type="text"
            value={newPassInput}
            onChange={(e) => setNewPassInput(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-red-500 outline-none"
          />
          <button onClick={handleUpdatePassword} className="bg-red-600 text-white py-2 rounded-xl text-xs font-black">تثبيت الرمز</button>
        </div>
      )}

      {/* واجهة الرفع */}
      <div className="mb-10 bg-gradient-to-br from-red-600/20 to-transparent p-6 rounded-[2rem] border border-red-600/30 relative">
        {isUploading && (
          <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center rounded-[2rem]">
             <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-red-500 text-xs font-black animate-pulse">جاري نقل الملف للسحابة...</p>
          </div>
        )}
        <h2 className="text-xl font-black mb-5 text-white">إضافة محتوى مرعب</h2>
        
        <div className="flex flex-col gap-4 mb-6">
          <input 
            type="text"
            placeholder="اسم الفيديو (هام جداً لظهوره)"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-red-600 transition-all"
          />
          
          <select 
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-sm text-red-500 outline-none"
          >
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-black text-white">{c}</option>)}
          </select>
        </div>

        <button 
          onClick={openUploadWidget}
          disabled={isUploading}
          className="w-full py-5 bg-red-600 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
          رفع الملف الآن
        </button>
        <p className="text-[8px] text-center text-gray-500 mt-4 font-bold">سيقوم النظام بتصنيف الفيديو (طويل/قصير) تلقائياً فور اكتمال الرفع.</p>
      </div>

      {/* المكتبة */}
      <div className="space-y-4">
        <h2 className="text-lg font-black pr-2">المكتبة الحالية ({videos.length})</h2>
        
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600 text-[10px] font-bold">جاري مزامنة السحابة...</p>
          </div>
        ) : videos.length === 0 ? (
          <p className="text-center py-20 text-gray-600 text-xs font-bold">المكتبة فارغة.. ابدأ برفع أول فيديو.</p>
        ) : (
          videos.map(v => (
            <div key={v.public_id} className={`bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col gap-4 transition-all ${isProcessing === v.public_id ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-4">
                <div className="w-24 aspect-video bg-black rounded-2xl overflow-hidden shrink-0 border border-white/5 relative group">
                  <video src={v.video_url} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[8px] font-black bg-red-600 px-2 py-1 rounded-full">{v.type.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex-grow">
                  <input 
                    className="bg-transparent border-b border-white/10 w-full text-sm font-black mb-2 focus:border-red-600 outline-none transition-colors"
                    defaultValue={v.title}
                    onBlur={(e) => handleUpdate(v, e.target.value, v.category)}
                  />
                  <select 
                    className="bg-black/60 text-[10px] text-red-500 outline-none rounded-lg px-3 py-1.5 border border-white/5"
                    defaultValue={v.category}
                    onChange={(e) => handleUpdate(v, v.title, e.target.value)}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-black text-white">{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={() => handleDelete(v.public_id)}
                  className="px-6 py-2 bg-red-600/10 text-red-500 text-[10px] font-black rounded-xl border border-red-600/20 active:bg-red-600 active:text-white transition-all"
                >
                  {isProcessing === v.public_id ? 'جاري...' : 'حذف الفيديو'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
