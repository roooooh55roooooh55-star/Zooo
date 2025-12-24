
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
    const data = await fetchCloudinaryVideos();
    setVideos(data);
    setLoading(false);
  };

  useEffect(() => { loadVideos(); }, []);

  const handleDelete = async (pid: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفيديو نهائياً؟')) {
      setIsProcessing(pid);
      const ok = await deleteCloudinaryVideo(pid);
      if (ok) {
        loadVideos();
      } else {
        alert('حدث خطأ أثناء الحذف.');
      }
      setIsProcessing(null);
    }
  };

  const handleUpdate = async (v: Video, newTitle: string, newCategory: any) => {
    setIsProcessing(v.public_id);
    await updateCloudinaryMetadata(v.public_id, newTitle, newCategory);
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
      alert("خطأ: مكتبة الرفع لم تتحمل.. يرجى التحقق من اتصال الإنترنت.");
      return;
    }

    if (!uploadTitle.trim()) {
      alert("يرجى إدخال عنوان للفيديو أولاً.");
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
            window: "#050505",
            sourceBg: "#0A0A0A",
            windowBorder: "#FF0000",
            tabIcon: "#FF0000",
            inactiveTabIcon: "#555555",
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
          alert("تم الرفع بنجاح! سيتم تحديث القائمة تلقائياً.");
          setTimeout(loadVideos, 3000); // ننتظر قليلاً لمعالجة الفيديو في السحابة
        } else if (result && result.event === "close") {
          setIsUploading(false);
        } else if (error) {
          setIsUploading(false);
          console.error("Upload Error:", error);
          alert("فشل الرفع: تأكد من حجم الملف ونوعه.");
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#050505] overflow-y-auto p-6 font-sans text-right pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-8 border-b border-red-600/30 pb-4">
        <h1 className="text-2xl font-black text-red-600 italic">لوحة تحكم المطور</h1>
        <button onClick={onClose} className="bg-white/5 p-2 rounded-lg text-gray-400">إغلاق</button>
      </div>

      {/* إعدادات الأمان */}
      <div className="mb-6">
        <button 
          onClick={() => setShowPassSettings(!showPassSettings)}
          className="text-[10px] text-gray-500 font-bold border-b border-gray-800 pb-1"
        >
          {showPassSettings ? 'إغلاق الأمان' : 'تغيير رمز العبور'}
        </button>
        {showPassSettings && (
          <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-3">
            <input 
              type="text"
              value={newPassInput}
              onChange={(e) => setNewPassInput(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-red-500 outline-none"
            />
            <button onClick={handleUpdatePassword} className="bg-red-600 text-white py-2 rounded-xl text-xs font-black">حفظ الرمز الجديد</button>
          </div>
        )}
      </div>

      {/* واجهة الرفع المتطورة */}
      <div className="mb-10 bg-red-600/10 p-6 rounded-3xl border border-red-600/20 shadow-2xl relative overflow-hidden">
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
             <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <h2 className="text-lg font-bold mb-4 text-white">إضافة محتوى جديد</h2>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-400 font-bold">اسم الفيديو (سيظهر للجمهور):</label>
            <input 
              type="text"
              placeholder="مثال: ليلة مرعبة في المقبرة"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-red-600 transition-all"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-400 font-bold">القسم المناسب:</label>
            <select 
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-red-500 outline-none"
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-black text-white">{c}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={openUploadWidget}
          disabled={isUploading}
          className={`w-full py-5 text-white font-black rounded-2xl shadow-[0_0_20px_red] active:scale-95 transition-all flex items-center justify-center gap-3 ${isUploading ? 'bg-gray-800' : 'bg-red-600'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
          {isUploading ? 'جاري التحضير...' : 'اختر الفيديو للرفع'}
        </button>
        <p className="text-[9px] text-center text-gray-500 mt-4 italic font-bold">سيتم تحديد (Shorts أو Long) تلقائياً بناءً على أبعاد الفيديو المختار.</p>
      </div>

      {/* قائمة الفيديوهات المرفوعة */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">المحتوى المنشور ({videos.length})</h2>
          <button onClick={loadVideos} className="text-[10px] text-blue-500 border border-blue-500/30 px-3 py-1.5 rounded-xl active:bg-blue-500/10">تحديث القائمة ↻</button>
        </div>
        
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse text-red-500 text-[10px] font-black uppercase">جاري مزامنة المكتبة...</p>
          </div>
        ) : (
          videos.map(v => (
            <div key={v.id} className={`bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 transition-all ${isProcessing === v.public_id ? 'opacity-50 pointer-events-none scale-95' : 'opacity-100'}`}>
              <div className="flex items-center gap-4">
                <div className="w-20 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-white/5 relative">
                  <video src={v.video_url} className="w-full h-full object-cover" />
                  <div className="absolute top-1 right-1 bg-black/60 px-1 rounded text-[7px] text-white uppercase font-black">{v.type}</div>
                </div>
                <div className="flex-grow">
                  <input 
                    className="bg-transparent border-b border-white/10 w-full text-sm font-bold mb-1 focus:border-red-600 outline-none transition-colors"
                    defaultValue={v.title}
                    onBlur={(e) => handleUpdate(v, e.target.value, v.category)}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <select 
                      className="bg-black/40 text-[9px] text-red-500 outline-none rounded-md px-2 py-1"
                      defaultValue={v.category}
                      onChange={(e) => handleUpdate(v, v.title, e.target.value)}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-black text-white">{c}</option>)}
                    </select>
                    <span className="text-[8px] text-gray-500 font-bold">{v.type === 'short' ? 'فيديو قصير (Vertical)' : 'فيديو طويل (Horizontal)'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
                <button 
                  onClick={() => handleDelete(v.public_id)}
                  className="px-4 py-1.5 bg-red-900/20 text-red-500 text-[10px] font-bold rounded-lg border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
                >
                  {isProcessing === v.public_id ? 'جاري الحذف...' : 'حذف نهائي'}
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
