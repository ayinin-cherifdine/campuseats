/*
  # Seed Demo Data for CampusEats

  ## Overview
  Adds sample data for testing and demonstration purposes

  ## Data Added
  
  ### Restaurants (10 sample restaurants)
  - Various cuisine types (Italian, Mexican, Asian, American, etc.)
  - Different price ranges
  - Campus locations around coordinates
  
  ## Notes
  - This migration is idempotent - it checks if data exists before inserting
  - Uses realistic sample data for food places near a typical campus
*/

-- Insert sample restaurants
INSERT INTO restaurants (name, description, address, latitude, longitude, cuisine_type, price_range, photo_url, average_rating, total_reviews)
SELECT * FROM (VALUES
  (
    'Campus Burger Joint',
    'Best burgers near campus with student discounts',
    '123 University Ave',
    40.7128,
    -74.0060,
    'American',
    2,
    'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg',
    4.5,
    0
  ),
  (
    'Taco Express',
    'Quick and delicious tacos, perfect for students on a budget',
    '456 College St',
    40.7138,
    -74.0070,
    'Mexican',
    1,
    'https://images.pexels.com/photos/4958792/pexels-photo-4958792.jpeg',
    4.2,
    0
  ),
  (
    'Pasta Paradise',
    'Authentic Italian pasta made fresh daily',
    '789 Campus Rd',
    40.7148,
    -74.0080,
    'Italian',
    3,
    'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg',
    4.7,
    0
  ),
  (
    'Sushi Station',
    'Fresh sushi and poke bowls',
    '321 Student Way',
    40.7118,
    -74.0050,
    'Japanese',
    2,
    'https://images.pexels.com/photos/357756/pexels-photo-357756.jpeg',
    4.4,
    0
  ),
  (
    'The Coffee Lab',
    'Artisan coffee and study-friendly atmosphere',
    '654 Library Lane',
    40.7158,
    -74.0090,
    'Cafe',
    2,
    'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg',
    4.6,
    0
  ),
  (
    'Noodle House',
    'Asian fusion noodles and bowls',
    '987 Dormitory Dr',
    40.7108,
    -74.0040,
    'Asian',
    1,
    'https://images.pexels.com/photos/1907244/pexels-photo-1907244.jpeg',
    4.3,
    0
  ),
  (
    'Pizza Palace',
    'New York style pizza by the slice',
    '147 Campus Circle',
    40.7168,
    -74.0100,
    'Italian',
    1,
    'https://images.pexels.com/photos/1653877/pexels-photo-1653877.jpeg',
    4.1,
    0
  ),
  (
    'Smoothie Station',
    'Healthy smoothies and acai bowls',
    '258 Gym Avenue',
    40.7098,
    -74.0030,
    'Healthy',
    2,
    'https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg',
    4.8,
    0
  ),
  (
    'BBQ Spot',
    'Smoked meats and southern comfort food',
    '369 Food Court Blvd',
    40.7178,
    -74.0110,
    'BBQ',
    3,
    'https://images.pexels.com/photos/1633525/pexels-photo-1633525.jpeg',
    4.5,
    0
  ),
  (
    'Vegan Garden',
    'Plant-based comfort food',
    '741 Green Street',
    40.7088,
    -74.0020,
    'Vegan',
    2,
    'https://images.pexels.com/photos/1640770/pexels-photo-1640770.jpeg',
    4.6,
    0
  )
) AS sample_data(name, description, address, latitude, longitude, cuisine_type, price_range, photo_url, average_rating, total_reviews)
WHERE NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1);