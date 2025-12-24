
import React from 'react';

const PrivacyPage: React.FC<{ onOpenAdmin: () => void }> = ({ onOpenAdmin }) => {
  const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-gray-800/40 to-transparent border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex flex-col text-right">
          <h1 className="text-2xl font-black italic mb-1 text-white">إعدادات الخصوصية</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-60">System Security & Core</p>
        </div>
        <img src={LOGO_URL} className="w-12 h-12 rounded-full border-2 border-red-600 shadow-[0_0_15px_red]" />
      </div>

      <div className="bg-neutral-900/50 rounded-[2.5rem] p-8 border border-white/5 flex flex-col gap-6 text-right leading-relaxed shadow-xl">
        <p className="text-gray-400 text-sm">يتم تأمين كافة تفاعلاتك في الحديقة بنظام تشفير محلي. لا يتم نقل بيانات المشاهدة إلى أي خادم خارجي.</p>
        
        <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-6">
          <button className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 font-black text-center rounded-2xl">
            شروط الاستخدام
          </button>
          
          <div className="mt-20 opacity-0 hover:opacity-10 transition-opacity">
            <span 
              onClick={onOpenAdmin}
              className="text-[6px] text-white cursor-pointer p-10"
            >
              ADMIN_ACCESS_V4_KEY_506070
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
