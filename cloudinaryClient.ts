
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();

// استخدام بروكسي موثوق يدعم HTTPS و CORS بشكل كامل
const PROXY_URL = 'https://corsproxy.io/?';

const getAuthHeader = () => {
  try {
    // تشفير المفاتيح بنظام Base64 للمصادقة
    const credentials = btoa(`${API_KEY}:${API_SECRET}`);
    return `Basic ${credentials}`;
  } catch (e) {
    return '';
  }
};

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const timestamp = new Date().getTime();
    // استخدام Resources API مع تحديد المجلد (prefix) لضمان جلب الفيديوهات من app_videos
    // تم إضافة prefix=app_videos/ لضمان جلب الملفات من المجلد الصحيح
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true&prefix=app_videos/&t=${timestamp}`;
    
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'GET',
      mode: 'cors', // تفعيل نمط CORS لتجنب حظر المتصفح
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      // إذا فشل جلب المجلد، نحاول جلب كافة الفيديوهات كخطة بديلة
      return await fetchAllVideosFallback();
    }

    const data = await response.json();
    return mapCloudinaryData(data.resources || []);
  } catch (error) {
    console.error('Fetch Error:', error);
    return await fetchAllVideosFallback();
  }
};

const fetchAllVideosFallback = async (): Promise<Video[]> => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Authorization': getAuthHeader() }
    });
    const data = await response.json();
    return mapCloudinaryData(data.resources || []);
  } catch (e) {
    const cached = localStorage.getItem('app_videos_cache');
    return cached ? JSON.parse(cached) : [];
  }
};

const mapCloudinaryData = (resources: any[]): Video[] => {
  const mapped = resources.map((res: any) => {
    const videoType: 'short' | 'long' = (res.height > res.width) ? 'short' : 'long';
    
    // إجبار الرابط على استخدام HTTPS
    const secureUrl = (res.secure_url || res.url).replace('http://', 'https://');
    
    // تحسين الرابط للأداء العالي (Auto Quality & Format)
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
    // تحديث التاغات (Category)
    const tagUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/tags`;
    const tagParams = new URLSearchParams();
    tagParams.set('tags', category);
    tagParams.set('public_ids', publicId);
    tagParams.set('command', 'replace');

    await fetch(`${PROXY_URL}${encodeURIComponent(tagUrl)}`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Authorization': getAuthHeader() },
      body: tagParams
    });

    return true;
  } catch (error) {
    return false;
  }
};
