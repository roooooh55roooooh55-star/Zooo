
import { Video } from './types';

// Trimmed credentials to prevent hidden space or newline issues from copy-pasting
const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();
const UPLOAD_PRESET = 'Good.zooo'.trim();

// Use a reliable CORS proxy prefix
const PROXY = 'https://corsproxy.io/?';

const getAuthHeader = () => {
  try {
    // Basic Auth: base64(api_key:api_secret)
    return btoa(`${API_KEY}:${API_SECRET}`);
  } catch (e) {
    console.error('Error encoding auth header:', e);
    return '';
  }
};

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true`;
    
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
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary API Error Details:', errorData);
      throw new Error(`Cloudinary API Error: ${response.status} ${errorData.error?.message || 'Unauthorized'}`);
    }
    
    const data = await response.json();
    if (!data.resources) return [];

    return data.resources.map((res: any) => {
      const isPortrait = res.height > res.width;
      // High speed mobile playback with q_auto,f_auto
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
    console.error('Cloudinary Fetch Error:', error);
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
    console.error('Delete Error:', error);
    return false;
  }
};

export const updateCloudinaryMetadata = async (publicId: string, title: string, category: string) => {
  try {
    // 1. Update Context (Title/Caption)
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

    // 2. Update Tags (Category)
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
    console.error('Update Error:', error);
    return false;
  }
};
