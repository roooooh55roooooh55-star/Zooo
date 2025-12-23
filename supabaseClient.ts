
import { createClient } from '@supabase/supabase-js';
import { Video } from './types';

const SUPABASE_URL = 'https://frskpswjwtbazcrunxgh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyc2twc3dqd3RiYXpjcnVueGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTk1OTAsImV4cCI6MjA4MTkzNTU5MH0.QTA_oax4QDR-pD2ZowczGlbCkbI5YFyW3wjO2KXtV6E'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const fetchVideos = async (type?: 'short' | 'long', limit = 100) => {
  try {
    let query = supabase.from('الحديقة').select('*').limit(limit);
    if (type) query = query.eq('type', type);

    const { data, error } = await query.order('id', { ascending: false });
    
    if (error) {
      const { data: fallbackData } = await supabase.from('الحديقة').select('*').limit(limit);
      return (fallbackData || []).map(v => ({ ...v, likes: v.likes || 0, views: v.views || 0 }));
    }
    
    return (data || []).map(v => ({ ...v, likes: v.likes || 0, views: v.views || 0 }));
  } catch (err) {
    return [];
  }
};

export const fetchTrendingVideos = async (limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('الحديقة')
      .select('*')
      .order('views', { ascending: false }) // الترند يعتمد على المشاهدات
      .limit(limit);
    
    if (error) {
      const { data: basicData } = await supabase.from('الحديقة').select('*').limit(limit);
      return (basicData || []).map(v => ({ ...v, likes: v.likes || 0, views: v.views || 0 }));
    }
    return (data || []).map(v => ({ ...v, likes: v.likes || 0, views: v.views || 0 }));
  } catch (err) {
    return [];
  }
};

export const updateLikesInDB = async (id: string, increment: boolean) => {
  try {
    const { data } = await supabase
      .from('الحديقة')
      .select('likes, views')
      .or(`id.eq."${id}",video_url.eq."${id}"`)
      .single();

    if (!data) return;

    const newLikes = increment ? (data.likes + 1) : Math.max(0, data.likes - 1);
    // عند الإعجاب، نزيد المشاهدات أيضاً كما طلب المستخدم
    const newViews = increment ? (data.views + 1) : data.views;

    await supabase
      .from('الحديقة')
      .update({ likes: newLikes, views: newViews })
      .or(`id.eq."${id}",video_url.eq."${id}"`);
  } catch (err) {
    console.error("Update Stats Error:", err);
  }
};

export const incrementViewsInDB = async (id: string) => {
  try {
    const { data } = await supabase
      .from('الحديقة')
      .select('views')
      .or(`id.eq."${id}",video_url.eq."${id}"`)
      .single();

    if (!data) return;

    await supabase
      .from('الحديقة')
      .update({ views: data.views + 1 })
      .or(`id.eq."${id}",video_url.eq."${id}"`);
  } catch (err) {}
};
