
export type VideoType = 'short' | 'long';

export interface Video {
  id: string;
  video_url: string;
  type: VideoType;
  likes: number;
  views: number;
  title?: string;
  thumbnail?: string;
  category?: string;
  created_at?: string;
}

export interface UserInteractions {
  likedIds: string[];
  dislikedIds: string[];
  savedIds: string[];
  watchHistory: { id: string; progress: number }[];
}

export enum AppView {
  HOME = 'home',
  TREND = 'trend',
  LIKES = 'likes',
  SAVED = 'saved',
  UNWATCHED = 'unwatched',
  HIDDEN = 'hidden',
  PRIVACY = 'privacy'
}
