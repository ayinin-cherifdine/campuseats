/*
  # CampusEats Database Schema

  ## Overview
  Complete database schema for CampusEats - a TikTok-style food sharing app for students

  ## New Tables
  
  ### `profiles`
  User profiles extending auth.users
  - `id` (uuid, references auth.users)
  - `username` (text, unique)
  - `full_name` (text)
  - `avatar_url` (text)
  - `bio` (text)
  - `campus_location` (text)
  - `followers_count` (integer, default 0)
  - `following_count` (integer, default 0)
  - `created_at` (timestamptz)

  ### `restaurants`
  Restaurant/food place information
  - `id` (uuid, primary key)
  - `name` (text)
  - `description` (text)
  - `address` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `cuisine_type` (text)
  - `price_range` (integer, 1-4)
  - `photo_url` (text)
  - `average_rating` (numeric, default 0)
  - `total_reviews` (integer, default 0)
  - `created_by` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### `videos`
  Video posts (food content)
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `restaurant_id` (uuid, references restaurants, nullable)
  - `video_url` (text)
  - `thumbnail_url` (text)
  - `caption` (text)
  - `tags` (text array)
  - `likes_count` (integer, default 0)
  - `comments_count` (integer, default 0)
  - `views_count` (integer, default 0)
  - `duration` (integer, in seconds)
  - `is_food_hack` (boolean, default false)
  - `created_at` (timestamptz)

  ### `reviews`
  Restaurant reviews with media
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `restaurant_id` (uuid, references restaurants)
  - `rating` (integer, 1-5)
  - `comment` (text)
  - `photos` (text array)
  - `created_at` (timestamptz)

  ### `likes`
  Video likes
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `video_id` (uuid, references videos)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, video_id)

  ### `follows`
  User follow relationships
  - `id` (uuid, primary key)
  - `follower_id` (uuid, references profiles)
  - `following_id` (uuid, references profiles)
  - `created_at` (timestamptz)
  - Unique constraint on (follower_id, following_id)

  ### `saved_places`
  User's saved restaurants
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `restaurant_id` (uuid, references restaurants)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, restaurant_id)

  ## Security
  - Row Level Security enabled on all tables
  - Authenticated users can read most public data
  - Users can only modify their own content
  - Reviews and videos are publicly readable
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  campus_location text DEFAULT '',
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  address text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  cuisine_type text DEFAULT '',
  price_range integer DEFAULT 2,
  photo_url text DEFAULT '',
  average_rating numeric DEFAULT 0,
  total_reviews integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants are viewable by everyone"
  ON restaurants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create restaurants"
  ON restaurants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own restaurants"
  ON restaurants FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
  video_url text NOT NULL,
  thumbnail_url text DEFAULT '',
  caption text DEFAULT '',
  tags text[] DEFAULT '{}',
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  duration integer DEFAULT 0,
  is_food_hack boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Videos are viewable by everyone"
  ON videos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  photos text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create follows"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create saved_places table
CREATE TABLE IF NOT EXISTS saved_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved places"
  ON saved_places FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save places"
  ON saved_places FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved places"
  ON saved_places FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_restaurant_id ON videos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON likes(video_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);