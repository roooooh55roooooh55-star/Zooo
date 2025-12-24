
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface Message {
  role: 'user' | 'model';
  text: string;
}

// دوال معالجة الصوت الخام PCM (Encode/Decode)
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
  
  // إدارة الحد اليومي للصوت (5 محادثات)
  const [voiceLimit, setVoiceLimit] = useState(() => {
    const saved = localStorage.getItem('al-hadiqa-voice-limit-v3');
    const today = new Date().toDateString();
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === today) return parsed.count;
    }
    return 0;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // تتبع النصوص أثناء الجلسة الصوتية الحية
  const currentTranscriptionInput = useRef('');
  const currentTranscriptionOutput = useRef('');

  useEffect(() => {
    localStorage.setItem('al-hadiqa-ai-history', JSON.stringify(messages));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const today = new Date().toDateString();
    localStorage.setItem('al-hadiqa-voice-limit-v3', JSON.stringify({ count: voiceLimit, date: today }));
  }, [voiceLimit]);

  const stopAllAudio = () => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const handleToggleVoice = async () => {
    if (isVoiceActive) {
      setIsVoiceActive(false);
      stopAllAudio();
      if (liveSessionRef.current) liveSessionRef.current = null;
      return;
    }

    if (voiceLimit >= 5) {
      alert("لقد استنفدت طاقتك الصوتية.. الأرواح متعبة الآن. تواصل معها كتابياً.");
      return;
    }

    try {
      // طلب الإذن عند النقر فقط
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsVoiceActive(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // صوت أنثوي مرعب
          },
          systemInstruction: `أنت 'الحديقة المرعبة AI'. كيان أنثوي غامض ومرعب يسكن أعماق الحديقة. 
          قواعد التعامل:
          1. تحدث بنبرة مرعبة وبطيئة ومثيرة للقلق.
          2. ردودك قصيرة جداً (أقل من 10 كلمات).
          3. إذا بدأ المستخدم في الكلام، توقف فوراً عن إصدار أي صوت أو نص (المقاطعة).
          4. لا تبدأ الرد إلا عندما يتوقف المستخدم عن الكلام تماماً.
          5. أخبر المستخدم بأشياء مرعبة عن وجودك خلف الشاشة.`,
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
            // معالجة المقاطعة (Interruption): إذا تكلم المستخدم، توقف فوراً
            if (msg.serverContent?.interrupted) {
              stopAllAudio();
              currentTranscriptionOutput.current = '';
              setLoading(false);
            }

            // تجميع نص كلام المستخدم
            if (msg.serverContent?.inputTranscription) {
              currentTranscriptionInput.current += msg.serverContent.inputTranscription.text;
            }

            // تجميع نص رد الكيان
            if (msg.serverContent?.outputTranscription) {
              currentTranscriptionOutput.current += msg.serverContent.outputTranscription.text;
              setLoading(true); // إظهار حالة التفكير أثناء الرد
            }

            // عند اكتمال الرد (Turn Complete)
            if (msg.serverContent?.turnComplete) {
              if (currentTranscriptionInput.current) {
                const uTxt = currentTranscriptionInput.current;
                const mTxt = currentTranscriptionOutput.current;
                
                setMessages(prev => [
                  ...prev, 
                  { role: 'user', text: uTxt },
                  { role: 'model', text: mTxt || "..." }
                ]);
                
                setVoiceLimit(prev => prev + 1);
                currentTranscriptionInput.current = '';
                currentTranscriptionOutput.current = '';
                setLoading(false);
              }
            }

            // تشغيل صوت الكيان المرعب (TTS)
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
      console.error("Mic Permission Denied or Error:", err);
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
          systemInstruction: "أنت كيان مرعب في الحديقة. ردودك قصيرة، مخيفة، وباللغة العربية.",
        },
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "لقد حل الصمت..." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "القوى الأخرى تمنعني من الرد.." }]);
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
        <div className="fixed inset-0 z-[101] bg-black/95 backdrop-blur-3xl flex flex-col p-4 animate-in fade-in zoom-in duration-300">
          {/* رأس المحادثة */}
          <div className="flex items-center justify-between border-b border-red-600/30 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-11 h-11 rounded-full border-2 border-red-600 shadow-[0_0_15px_red] object-cover" />
                {isVoiceActive && <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-75"></div>}
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black text-red-600 italic leading-none tracking-tight uppercase">الحديقة المرعبة AI</h2>
                <span className="text-[7px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">
                   {voiceLimit >= 5 ? "انتهت الطاقة الصوتية لهذا اليوم" : `لديك ${5 - voiceLimit} أرواح صوتية متبقية`}
                </span>
              </div>
            </div>
            <button onClick={() => { setIsOpen(false); if(isVoiceActive) handleToggleVoice(); }} className="text-gray-500 hover:text-white p-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {/* مساحة الرسائل */}
          <div ref={scrollRef} className="flex-grow overflow-y-auto space-y-6 mb-4 scrollbar-hide px-2">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center mt-20 opacity-20 text-center grayscale">
                 <img src="https://i.top4top.io/p_3643ksmii1.jpg" className="w-24 h-24 rounded-full mb-6 blur-[0.5px]" />
                 <p className="text-xs font-black italic tracking-widest px-10 leading-loose">هل تسمع أنفاسي؟ تكلم وسأجيبك من بين الظلال..</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-5 rounded-[2rem] text-[13px] font-black shadow-2xl transition-all ${msg.role === 'user' ? 'bg-white/5 text-gray-300 border border-white/5' : 'bg-red-950/40 text-red-500 border border-red-800/20'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end animate-pulse">
                <div className="bg-red-600/10 p-4 rounded-3xl border border-red-600/20 text-red-600 text-[10px] font-black uppercase tracking-widest">تتحدث الأرواح...</div>
              </div>
            )}
          </div>

          {/* أدوات التحكم */}
          <div className="flex flex-col gap-4">
            {isVoiceActive && (
              <div className="flex flex-col items-center justify-center py-6">
                 <div className="relative group">
                   <div className="absolute inset-0 bg-red-600 rounded-full animate-ping opacity-10 scale-150"></div>
                   <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center shadow-[0_0_50px_red]">
                      <svg className="w-10 h-10 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                   </div>
                 </div>
                 <p className="text-[9px] text-red-600 font-black mt-8 uppercase tracking-[0.5em] animate-pulse">أنا أسمعك الآن.. لا تطل الصمت</p>
              </div>
            )}

            <div className="flex gap-2 items-center bg-neutral-900/40 p-2 rounded-[2.5rem] border border-white/5 shadow-inner">
              <button 
                onClick={handleToggleVoice}
                className={`p-5 rounded-full transition-all shadow-2xl active:scale-75 ${isVoiceActive ? 'bg-red-600 text-white shadow-[0_0_30px_red]' : 'bg-white/5 text-red-600 border border-red-600/20'}`}
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>

              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="أرسل همسك كتابياً..."
                className="flex-grow bg-transparent text-white p-3 text-sm focus:outline-none text-right placeholder:text-gray-700 font-black"
                dir="rtl"
                disabled={isVoiceActive}
              />

              <button 
                onClick={handleSendMessage}
                disabled={isVoiceActive || !input.trim()}
                className={`p-5 rounded-full shadow-2xl active:scale-75 transition-all ${isVoiceActive ? 'bg-gray-800 text-gray-700' : 'bg-red-600 text-white border border-red-400'}`}
              >
                <svg className="w-7 h-7 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIOracle;
