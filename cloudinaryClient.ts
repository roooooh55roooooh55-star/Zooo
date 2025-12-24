
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();

// استخدام بروكسي متطور يدعم كافة أنواع الطلبات ويهرب من قيود CORS
const PROXY_URL = 'https://corsproxy.io/?';

const getAuthHeader = () => {
  try {
    const credentials = btoa(`${API_KEY}:${API_SECRET}`);
    return `Basic ${credentials}`;
  } catch (e) {
    return '';
  }
};

/**
 * جلب الفيديوهات باستخدام Resources API مع التركيز على مجلد app_videos
 */
export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const timestamp = new Date().getTime();
    // استخدام Resources API (Admin API) لجلب الملفات من مجلد محدد
    // تم إضافة prefix=app_videos لضمان أننا لا نجلب إلا ما هو داخل المجلد المطلوب
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true&prefix=app_videos/&type=upload&t=${timestamp}`;
    
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Cloudinary API returned ${response.status}`);
    }

    const data = await response.json();
    const resources = data.resources || [];
    
    return mapCloudinaryData(resources);
  } catch (error) {
    console.error('Fetch Error:', error);
    // محاولة استعادة البيانات من الكاش المحلي في حال فشل الشبكة تماماً
    const cached = localStorage.getItem('app_videos_cache');
    return cached ? JSON.parse(cached) : [];
  }
};

const mapCloudinaryData = (resources: any[]): Video[] => {
  const mapped = resources.map((res: any) => {
    const videoType: 'short' | 'long' = (res.height > res.width) ? 'short' : 'long';
    
    // ضمان استخدام HTTPS في كل الروابط
    const secureUrl = (res.secure_url || res.url).replace('http://', 'https://');
    
    // تحسين الأداء عبر التحويل التلقائي للجودة والصيغة
    const optimizedUrl = secureUrl.replace('/upload/', '/upload/q_auto,f_auto/');
    
    const categoryTag = res.tags?.[0] || 'غموض';
    const caption = res.context?.custom?.caption || res.context?.caption || 
                    res.public_id.split('/').pop()?.replace(/_/g, ' ') || 
                    'فيديو مرعب';

    return {
      id: res.public_id,
      public_id: res.public_id,
      video_url: optimizedUrl,
      type: videoType,
      title: caption,
      likes: 0,
      views: 0,
      category: categoryTag,
      created_at: res.created_at
    } as Video;
  });

  // تحديث الكاش المحلي لضمان استمرارية العرض دون انقطاع
  localStorage.setItem('app_videos_cache', JSON.stringify(mapped));
  return mapped;
};

export const deleteCloudinaryVideo = async (publicId: string) => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/upload?public_ids[]=${encodeURIComponent(publicId)}`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'DELETE',
      mode: 'cors',
      headers: { 'Authorization': getAuthHeader() }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const updateCloudinaryMetadata = async (publicId: string, title: string, category: string) => {
  try {
    const tagUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/tags`;
    const tagParams = new URLSearchParams();
    tagParams.set('tags', category);
    tagParams.set('public_ids', publicId);
    tagParams.set('command', 'replace');

    const response = await fetch(`${PROXY_URL}${encodeURIComponent(tagUrl)}`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Authorization': getAuthHeader() },
      body: tagParams
    });

    return response.ok;
  } catch (error) {
    return false;
  }
};
