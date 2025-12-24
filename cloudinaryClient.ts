
import { Video } from './types';

const CLOUD_NAME = 'dlrvn33p0'.trim();
// ملاحظة: تم الانتقال لاستخدام قائمة الـ JSON العامة لتجنب أخطاء المصادقة 401
// يجب تفعيل "Resource List" في إعدادات Security في Cloudinary ليعمل هذا الرابط
const COMMON_TAG = 'hadiqa_v4';

/**
 * جلب الفيديوهات باستخدام القائمة العامة (JSON) لتجنب أخطاء الـ API Secret
 */
export const fetchCloudinaryVideos = async (): Promise<Video[]> => {
  try {
    const timestamp = new Date().getTime();
    // الرابط المباشر للقائمة (يعمل فقط إذا تم تفعيل Resource List في الإعدادات)
    const targetUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/list/${COMMON_TAG}.json?t=${timestamp}`;
    
    const response = await fetch(targetUrl, {
      method: 'GET',
      mode: 'cors' // إضافة mode cors لتجنب حظر المتصفح
    });

    if (!response.ok) {
      console.warn("Public JSON list failed (check Resource List setting). Falling back to local cache.");
      const cached = localStorage.getItem('app_videos_cache');
      return cached ? JSON.parse(cached) : [];
    }

    const data = await response.json();
    const resources = data.resources || [];
    
    return mapCloudinaryData(resources);
  } catch (error) {
    console.error('Fetch Error:', error);
    const cached = localStorage.getItem('app_videos_cache');
    return cached ? JSON.parse(cached) : [];
  }
};

const mapCloudinaryData = (resources: any[]): Video[] => {
  const mapped = resources.map((res: any) => {
    const videoType: 'short' | 'long' = (res.height > res.width) ? 'short' : 'long';
    
    // بناء رابط HTTPS آمن ومحسن
    const baseUrl = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload`;
    const optimizedUrl = `${baseUrl}/q_auto,f_auto/v${res.version}/${res.public_id}.${res.format}`;
    
    // استخراج التصنيف والعنوان من سياق البيانات أو التاغات
    const categoryTag = res.context?.custom?.caption || 'غموض';
    const title = res.context?.custom?.caption || 'فيديو مرعب';

    return {
      id: res.public_id,
      public_id: res.public_id,
      video_url: optimizedUrl,
      type: videoType,
      title: title,
      likes: 0,
      views: 0,
      category: categoryTag,
      created_at: res.created_at
    } as Video;
  });

  // حفظ نسخة في التخزين المحلي لضمان الديمومة
  localStorage.setItem('app_videos_cache', JSON.stringify(mapped));
  return mapped;
};

export const deleteCloudinaryVideo = async (publicId: string) => {
  console.warn("Delete requires Admin API credentials.");
  return false;
};

export const updateCloudinaryMetadata = async (publicId: string, title: string, category: string) => {
  console.warn("Update requires Admin API credentials.");
  return false;
};
