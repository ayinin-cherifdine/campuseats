export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  bio: string;
  campus_location: string;
  followers_count: number;
  following_count: number;
  created_at: string;
};

export type Restaurant = {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisine_type: string;
  price_range: number;    // 1=€ | 2=€€ | 3=€€€
  photo_url: string;
  average_rating: number;
  total_reviews: number;
  created_by: string | null;
  created_at: string;
  /** Renvoyé uniquement par l'endpoint de détail : vrai si l'utilisateur a sauvegardé ce lieu. */
  is_saved?: boolean;
};

export type Video = {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  video_url: string;
  thumbnail_url: string;
  caption: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  views_count: number;
  duration: number;
  is_food_hack: boolean;
  created_at: string;
};

export type Review = {
  id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  comment: string;
  photos: string[];
  created_at: string;
};

export type Like = {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
};

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type SavedPlace = {
  id: string;
  user_id: string;
  restaurant_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  user_id: string;
  video_id: string;
  text: string;
  created_at: string;
  profile?: Profile;
};

export type VideoWithProfile = Video & {
  profile: Profile;
  restaurant: Restaurant | null;
  is_liked: boolean;
};
