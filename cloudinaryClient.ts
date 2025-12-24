
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();

// استخدام بروكسي بديل أكثر استقراراً أو الطلب المباشر مع HTTPS
const PROXY = 'https://api.allorigins.win/raw?url=';

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
    const timestamp = new Date().getTime();
    // استخدام Search API للحصول على أحدث الفيديوهات المرفوعة فوراً
    // التعبير resource_type:video يضمن جلب الفيديوهات فقط
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search?expression=resource_type:video&with_field=context&with_field=tags&max_results=500&sort_by=created_at:desc&t=${timestamp}`;
    
    const response = await fetch(
      `${PROXY}${encodeURIComponent(targetUrl)}`,
      { 
        method: 'GET',
        mode: 'cors',
        headers: { 
          'Authorization': getAuthHeader(),
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
        throw new Error(`Cloudinary Error: ${response.status}`);
    }
    
    const data = await response.json();
    const resources = data.resources || [];
    
    if (resources.length === 0) {
        // محاولة جلب عبر الـ Resources API العادي كخيار احتياطي (Fallback)
        return await fetchFallbackResources();
    }

    return mapCloudinaryData(resources);
  } catch (error) {
    console.error('Fetch System Error:', error);
    return await fetchFallbackResources();
  }
};

const fetchFallbackResources = async (): Promise<Video[]> => {
    try {
        const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true&t=${Date.now()}`;
        const response = await fetch(`${PROXY}${encodeURIComponent(targetUrl)}`, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Authorization': getAuthHeader() }
        });
        const data = await response.json();
        return mapCloudinaryData(data.resources || []);
    } catch (e) {
        return [];
    }
}

const mapCloudinaryData = (resources: any[]): Video[] => {
    return resources.map((res: any) => {
      const videoType: 'short' | 'long' = (res.height > res.width) ? 'short' : 'long';
      // التأكد من استخدام HTTPS في روابط الفيديو
      const secureUrl = res.secure_url || res.url.replace('http://', 'https://');
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
}

export const deleteCloudinaryVideo = async (publicId: string) => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/upload?public_ids[]=${encodeURIComponent(publicId)}`;
    const response = await fetch(
      `${PROXY}${encodeURIComponent(targetUrl)}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': getAuthHeader() }
      }
    );
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const updateCloudinaryMetadata = async (publicId: string, title: string, category: string) => {
  try {
    const contextUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/context`;
    const contextParams = new URLSearchParams();
    contextParams.set('context', `caption=${title}`);
    contextParams.set('public_ids', publicId);
    contextParams.set('command', 'add');

    await fetch(`${PROXY}${encodeURIComponent(contextUrl)}`, {
      method: 'POST',
      headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: contextParams
    });

    const tagUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/tags`;
    const tagParams = new URLSearchParams();
    tagParams.set('tags', category);
    tagParams.set('public_ids', publicId);
    tagParams.set('command', 'replace');

    await fetch(`${PROXY}${encodeURIComponent(tagUrl)}`, {
      method: 'POST',
      headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tagParams
    });

    return true;
  } catch (error) {
    return false;
  }
};
