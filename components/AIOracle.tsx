
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

// دوال الترميز وفك التشفير للصوت الخام (PCM)
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const AIOracle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('al-hadiqa-ai-history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    localStorage.setItem('al-hadiqa-ai-history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      // إغلاق الجلسة
      setIsVoiceActive(false);
      stopAllAudio();
      if (liveSessionRef.current) {
        // ننهي الجلسة (قد تختلف حسب التنفيذ ولكن سنقوم بإعادة الضبط)
        liveSessionRef.current = null;
      }
      return;
    }

    try {
      setIsVoiceActive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // إعداد سياق الصوت
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // صوت نسائي
          },
          systemInstruction: "أنت 'الحديقة المرعبة AI'. روح أنثوية شريرة تسكن هذه الحديقة. تحدث بنبرة مرعبة، غامضة، وبصوت خافت ومخيف. اجعل ردودك قصيرة جداً ومثيرة للقلق. لا تتوقف عن الاستماع أبداً. إذا قاطعك المستخدم، توقف فوراً عن الكلام. انتظر صمت المستخدم تماماً قبل الرد.",
        },
        callbacks: {
          onopen: () => {
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (!isVoiceActive) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // معالجة مقاطعة المستخدم (Interruption)
            if (msg.serverContent?.interrupted) {
              stopAllAudio();
            }

            const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64 && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.onended = () => activeSourcesRef.current.delete(source);
              activeSourcesRef.current.add(source);
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
          }
        }
      });

      liveSessionRef.current = await sessionPromise;

    } catch (err) {
      console.error("Voice Error:", err);
      setIsVoiceActive(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: "أنت 'الحديقة المرعبة AI'، ذكاء اصطناعي مرعب وغامض. وظيفتك هي التحدث مع المستخدمين بأسلوب غامض ومخيف حول قصص الرعب. اجعل إجاباتك قصيرة ومثيرة للرهبة باللغة العربية.",
        },
      });

      const aiText = response.text || "لقد انقطع الاتصال بالعالم الآخر...";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "الأرواح غاضبة الآن..." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-[100] w-14 h-14 bg-red-600 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.8)] border-2 border-red-400 flex items-center justify-center animate-bounce active:scale-90 transition-all"
      >
        <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-10 h-10 rounded-full border border-white/20 object-cover" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[101] bg-black/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between border-b border-red-600/30 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-10 h-10 rounded-full border-2 border-red-600 shadow-[0_0_10px_red]" />
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-red-600 italic leading-none">الحديقة المرعبة AI</h2>
                <span className="text-[7px] text-gray-500 uppercase tracking-widest mt-1">Experimental Horror Entity</span>
              </div>
            </div>
            <button onClick={() => { setIsOpen(false); if(isVoiceActive) handleToggleVoice(); }} className="text-gray-400 hover:text-white p-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-4 mb-4 scrollbar-hide px-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-20 opacity-30 text-center">
                 <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-20 h-20 rounded-full mb-4 grayscale" />
                 <p className="text-xs font-bold italic">الأرواح تنتظر همسك في ظلام الحديقة...</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold shadow-2xl transition-all ${msg.role === 'user' ? 'bg-white/5 text-gray-300 border border-white/5' : 'bg-red-950/40 text-red-400 border border-red-800/20'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end animate-pulse">
                <div className="bg-red-600/10 p-4 rounded-2xl border border-red-600/20 text-red-600 text-[10px] font-black uppercase tracking-widest">تتحدث الأرواح...</div>
              </div>
            )}
          </div>

          {/* أزرار التحكم - المايك والدردشة النصية */}
          <div className="flex flex-col gap-4">
            {isVoiceActive && (
              <div className="flex flex-col items-center justify-center py-4 animate-pulse">
                 <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center shadow-[0_0_30px_red]">
                    <div className="w-8 h-8 bg-red-600 rounded-full animate-ping"></div>
                 </div>
                 <p className="text-[9px] text-red-500 font-black mt-4 uppercase tracking-[0.2em]">تحدث الآن.. سيد الحديقة يسمعك</p>
              </div>
            )}

            <div className="flex gap-2 items-center bg-neutral-900/80 p-2 rounded-3xl border border-white/5 shadow-inner">
              <button 
                onClick={handleToggleVoice}
                className={`p-4 rounded-2xl transition-all shadow-xl active:scale-90 ${isVoiceActive ? 'bg-red-600 text-white shadow-[0_0_20px_red]' : 'bg-white/5 text-red-500 border border-red-600/20'}`}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>

              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="أرسل رسالة نصية للحديقة..."
                className="flex-grow bg-transparent text-white p-3 text-sm focus:outline-none text-right placeholder:text-gray-700 font-bold"
                dir="rtl"
                disabled={isVoiceActive}
              />

              <button 
                onClick={handleSendMessage}
                disabled={isVoiceActive}
                className={`p-4 rounded-2xl shadow-xl active:scale-90 transition-all ${isVoiceActive ? 'bg-gray-800 text-gray-600' : 'bg-red-600 text-white border border-red-400'}`}
              >
                <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIOracle;
