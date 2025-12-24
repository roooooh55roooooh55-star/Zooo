
import { Video } from './types';

// تأكد من صحة هذه البيانات من لوحة تحكم Cloudinary الخاصة بك
const CLOUD_NAME = 'dlrvn33p0'.trim();
const API_KEY = '392293291257757'.trim();
const API_SECRET = 'UPSWtjj8T4Vj4x6O_oE-0V3f_8c'.trim();

// استخدام بروكسي أكثر قوة في تمرير الـ Headers
const PROXY = 'https://api.allorigins.win/raw?url=';

const getAuthHeader = () => {
  try {
    // تشفير مفتاح الـ API والسر بنظام Base64 للمصادقة الأساسية
    const credentials = `${API_KEY}:${API_SECRET}`;
    return btoa(credentials);
  } catch (e) {
    console.error("Auth Encoding Failed", e);
    return '';
  }
};

export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const timestamp = new Date().getTime();
    // استخدام المسار العام للموارد لتقليل احتمالية رفض الطلب
    const targetUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/video?max_results=500&context=true&tags=true&t=${timestamp}`;
    
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
    
    if (response.status === 401) {
      console.error("خطأ 401: مفاتيح API مرفوضة. يرجى التأكد من API Key و API Secret في ملف cloudinaryClient.ts");
      return [];
    }

    if (!response.ok) {
      throw new Error(`Cloudinary Error: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.resources || !Array.isArray(data.resources)) {
      return [];
    }

    return data.resources.map((res: any) => {
      const width = res.width || 0;
      const height = res.height || 0;
      
      // تصنيف تلقائي بناءً على الأبعاد
      const videoType: 'short' | 'long' = (height > width) ? 'short' : 'long';
      
      // تحسين الرابط للأداء
      const optimizedUrl = res.secure_url.replace('/upload/', '/upload/q_auto,f_auto/');
      
      const categories = ['رعب حقيقي', 'قصص رعب', 'غموض', 'ما وراء الطبيعة', 'أرشيف المطور'];
      const categoryTag = res.tags?.find((t: string) => categories.includes(t)) || 'غموض';

      const caption = res.context?.custom?.caption || 
                      res.context?.caption || 
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
    console.error('Fetch Operation Failed:', error);
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

    await fetch(`${PROXY}${encodeURIComponent(tagUrl)}`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${getAuthHeader()}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tagParams
    });

    return true;
  } catch (error) {
    return false;
  }
};
