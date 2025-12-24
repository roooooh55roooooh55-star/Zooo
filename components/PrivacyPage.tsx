
import React from 'react';

const PrivacyPage: React.FC<{ onOpenAdmin: () => void }> = ({ onOpenAdmin }) => {
  const LOGO_URL = "https://i.top4top.io/p_3643ksmii1.jpg";

  return (
    <div className="flex flex-col gap-8 pb-32 animate-in fade-in duration-500">
      <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-black border border-white/5 flex items-center justify-between">
        <div className="flex flex-col text-right">
          <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.4em]">Core Configuration</p>
          <div className="h-1 w-12 bg-red-900/30 mt-1"></div>
        </div>
        <img src={LOGO_URL} className="w-10 h-10 rounded-full grayscale opacity-20" />
      </div>

      <div className="bg-neutral-900/20 rounded-[2.5rem] p-10 border border-white/5 flex flex-col gap-10 text-right shadow-xl">
        <p className="text-[10px] text-gray-600 font-bold leading-relaxed">
          نظام الحماية المشفر v4.0.2 مفعل حالياً. لا يتم مشاركة بيانات الجلسة مع خوادم الطرف الثالث. جميع التفاعلات محفوظة محلياً.
        </p>
        
        <div className="flex flex-col items-center gap-12">
          <div className="w-full h-[1px] bg-white/5"></div>
          
          {/* المنطقة السرية خلف زر الخصوصية */}
          <div className="group relative">
            <div 
              onClick={onOpenAdmin}
              className="text-[6px] text-white/0 hover:text-white/5 cursor-pointer p-20 transition-all duration-700"
            >
              AL_HADIQA_SYSTEM_OVERRIDE_AUTH_REQUIRED_506070
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-1 h-1 bg-red-600/10 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
