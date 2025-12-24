
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();

// استخدام بروكسي corsproxy.io يدعم طلبات POST و HTTPS بشكل مستقر
const PROXY_URL = 'https://corsproxy.io/?';

const getAuthHeader = () => {
  try {
    const credentials = btoa(`${API_KEY}:${API_SECRET}`);
    return `Basic ${credentials}`;
  } catch (e) {
    return '';
  }
};

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search`;
    
    // إعداد جسم الطلب لـ Search API لضمان جلب أدق النتائج
    const searchBody = {
      expression: 'resource_type:video',
      with_field: ['context', 'tags', 'metadata'],
      max_results: 500,
      sort_by: [{ created_at: 'desc' }]
    };

    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
      console.warn('Search API failed, trying Resources API fallback...');
      return await fetchFallbackResources();
    }

    const data = await response.json();
    return mapCloudinaryData(data.resources || []);
  } catch (error) {
    console.error('Fetch Error:', error);
    return await fetchFallbackResources();
  }
};

const fetchFallbackResources = async (): Promise<Video[]> => {
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
    console.error('Fallback Fetch Error:', e);
    // استرجاع الفيديوهات من التخزين المحلي في حال الفشل التام
    const cached = localStorage.getItem('app_videos_cache');
    return cached ? JSON.parse(cached) : [];
  }
};

const mapCloudinaryData = (resources: any[]): Video[] => {
  const mapped = resources.map((res: any) => {
    const videoType: 'short' | 'long' = (res.height > res.width) ? 'short' : 'long';
    // التأكد من أن الرابط يبدأ بـ HTTPS
    const secureUrl = (res.secure_url || res.url).replace('http://', 'https://');
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

  // حفظ نسخة في التخزين المحلي للطوارئ
  localStorage.setItem('app_videos_cache', JSON.stringify(mapped));
  return mapped;
};

export const deleteCloudinaryVideo = async (publicId: string) => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/upload?public_ids[]=${encodeURIComponent(publicId)}`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'DELETE',
      headers: { 'Authorization': getAuthHeader() }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const updateCloudinaryMetadata = async (publicId: string, title: string, category: string) => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/tags`;
    const params = new URLSearchParams();
    params.set('tags', category);
    params.set('public_ids', publicId);
    params.set('command', 'replace');

    await fetch(`${PROXY_URL}${encodeURIComponent(targetUrl)}`, {
      method: 'POST',
      headers: { 'Authorization': getAuthHeader() },
      body: params
    });

    return true;
  } catch (error) {
    return false;
  }
};
