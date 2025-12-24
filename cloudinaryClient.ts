
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();
const PROXY = 'https://api.allorigins.win/raw?url=';

const getAuthHeader = () => {
  try {
    const credentials = `${API_KEY}:${API_SECRET}`;
    return btoa(credentials);
  } catch (e) {
    return '';
  }
};

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const timestamp = new Date().getTime();
    // استخدام Search API لاسترجاع أدق للمحتوى المرفوع حديثاً
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/search?expression=resource_type:video&with_field=context&with_field=tags&max_results=500&sort_by=created_at:desc&t=${timestamp}`;
    
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
    
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    
    const data = await response.json();
    const resources = data.resources || [];

    return resources.map((res: any) => {
      const videoType: 'short' | 'long' = (res.height > res.width) ? 'short' : 'long';
      const optimizedUrl = res.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      
      const categories = ['رعب حقيقي', 'قصص رعب', 'غموض', 'ما وراء الطبيعة', 'أرشيف المطور'];
      const categoryTag = res.tags?.find((t: string) => categories.includes(t)) || 'غموض';
      
      const caption = res.context?.caption || 
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
  } catch (error) {
    console.error('Fetch Error:', error);
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

    await fetch(`${PROXY}${encodeURIComponent(contextUrl)}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${getAuthHeader()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: contextParams
    });

    const tagUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/tags`;
    const tagParams = new URLSearchParams();
    tagParams.append('tags', category);
    tagParams.append('public_ids', publicId);
    tagParams.append('command', 'replace');

    await fetch(`${PROXY}${encodeURIComponent(tagUrl)}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${getAuthHeader()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tagParams
    });

    return true;
  } catch (error) {
    return false;
  }
};
