
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();
const UPLOAD_PRESET = 'Good.zooo'.trim();

const PROXY = 'https://corsproxy.io/?';

const getAuthHeader = () => {
  try {
    return btoa(`${API_KEY}:${API_SECRET}`);
  } catch (e) {
    return '';
  }
};

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    // نطلب البيانات مع تفاصيل الأبعاد (width, height) لضمان التصنيف الصحيح
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true&metadata=true`;
    
    const response = await fetch(
      `${PROXY}${encodeURIComponent(targetUrl)}`,
      { 
        method: 'GET',
        headers: { 
          'Authorization': `Basic ${getAuthHeader()}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Cloudinary Fetch Error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.resources) return [];

    return data.resources.map((res: any) => {
      // تحديد النوع بناءً على الأبعاد: إذا كان الارتفاع أكبر من العرض فهو فيديو قصير (Short)
      const width = res.width || 0;
      const height = res.height || 0;
      const isPortrait = height > width;
      
      const optimizedUrl = res.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      
      const categories = ['رعب حقيقي', 'قصص رعب', 'غموض', 'ما وراء الطبيعة', 'أرشيف المطور'];
      const categoryTag = res.tags?.find((t: string) => categories.includes(t)) || 'غموض';

      return {
        id: res.public_id,
        public_id: res.public_id,
        video_url: optimizedUrl,
        type: isPortrait ? 'short' : 'long',
        title: res.context?.custom?.caption || res.public_id.split('/').pop()?.replace(/_/g, ' ') || 'فيديو مرعب',
        likes: 0,
        views: 0,
        category: categoryTag,
        created_at: res.created_at
      } as Video;
    });
  } catch (error) {
    console.error('Cloudinary Sync Failed:', error);
    return [];
  }
};

export const deleteCloudinaryVideo = async (publicId: string) => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/upload?public_ids[]=${encodeURIComponent(publicId)}`;
    const response = await fetch(
      `${PROXY}${encodeURIComponent(targetUrl)}`,
      {
        method: 'DELETE',
        headers: { 
          'Authorization': `Basic ${getAuthHeader()}`,
          'Accept': 'application/json'
        }
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
    contextParams.append('context', `caption=${title}`);
    contextParams.append('public_ids', publicId);
    contextParams.append('command', 'add');

    const contextRes = await fetch(`${PROXY}${encodeURIComponent(contextUrl)}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${getAuthHeader()}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: contextParams
    });

    const tagUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/tags`;
    const tagParams = new URLSearchParams();
    tagParams.append('tags', category);
    tagParams.append('public_ids', publicId);
    tagParams.append('command', 'replace');

    const tagRes = await fetch(`${PROXY}${encodeURIComponent(tagUrl)}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${getAuthHeader()}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tagParams
    });

    return contextRes.ok && tagRes.ok;
  } catch (error) {
    return false;
  }
};
