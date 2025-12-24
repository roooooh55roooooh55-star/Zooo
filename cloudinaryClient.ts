
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0';
const API_KEY = '392293291257757';
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c';
const UPLOAD_PRESET = 'Good.zooo';

const getAuthHeader = () => btoa(`${API_KEY}:${API_SECRET}`);

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true`,
      { headers: { Authorization: `Basic ${getAuthHeader()}` } }
    );
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    
    return data.resources.map((res: any) => {
      const isPortrait = res.height > res.width;
      const optimizedUrl = res.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      
      // محاولة استخراج القسم من التاغات أو السياق
      const categoryTag = res.tags?.find((t: string) => 
        ['رعب حقيقي', 'قصص رعب', 'غموض', 'ما وراء الطبيعة', 'أرشيف المطور'].includes(t)
      ) || 'غموض';

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
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video/upload?public_ids[]=${publicId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Basic ${getAuthHeader()}` }
      }
    );
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const updateCloudinaryMetadata = async (publicId: string, title: string, category: string) => {
  const formData = new FormData();
  formData.append('context', `caption=${title}`);
  formData.append('tags', category);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/context`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${getAuthHeader()}` },
        body: formData
      }
    );
    return response.ok;
  } catch (error) {
    return false;
  }
};
