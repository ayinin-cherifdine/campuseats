import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  Star,
  Bookmark,
  Phone,
  Clock,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Restaurant, Review } from '@/types/database';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams();  // UUID du restaurant dans l'URL
  const router = useRouter();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);  // Indique si l'utilisateur a mis en favori
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    loadRestaurantData();
  }, [id]);

  const loadRestaurantData = async () => {
    try {
      // Charge le détail et les avis en parallèle avec Promise.all
      const [restaurantData, reviewsData] = await Promise.all([
        api.restaurants.get(id as string),
        api.restaurants.reviews(id as string),
      ]);
      setRestaurant(restaurantData);
      setReviews(reviewsData || []);
      setIsSaved(restaurantData?.is_saved ?? false);
    } catch (error) {
      console.error('Erreur lors du chargement du restaurant :', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant) return;
    try {
      // Bascule entre sauvegarder et retirer des favoris
      if (isSaved) {
        await api.restaurants.unsave(restaurant.id);
        setIsSaved(false);
      } else {
        await api.restaurants.save(restaurant.id);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde :', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!restaurant || !newReview.comment.trim()) {
      Alert.alert('Erreur', 'Veuillez écrire un commentaire');
      return;
    }

    try {
      await api.restaurants.addReview(restaurant.id, {
        rating: newReview.rating,
        comment: newReview.comment,
      });
      Alert.alert('Succès', 'Avis soumis !');
      setShowReviewForm(false);
      setNewReview({ rating: 5, comment: '' });
      loadRestaurantData();  // Recharge pour mettre à jour la note moyenne
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Échec de la soumission de l\'avis');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Restaurant introuvable</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: restaurant.photo_url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
            }}
            style={styles.image}
          />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Bookmark
              size={24}
              color={isSaved ? '#FF6B35' : '#FFF'}
              fill={isSaved ? '#FF6B35' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.cuisine}>{restaurant.cuisine_type}</Text>

          <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
              <Star size={20} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>
                {restaurant.average_rating > 0
                  ? restaurant.average_rating.toFixed(1)
                  : 'Aucune note'}
              </Text>
              <Text style={styles.reviewCount}>
                ({restaurant.total_reviews} avis)
              </Text>
            </View>

          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MapPin size={20} color="#64748B" />
              <Text style={styles.infoText}>{restaurant.address}</Text>
            </View>
          </View>

          {restaurant.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.description}>{restaurant.description}</Text>
            </View>
          )}

          <View style={styles.reviewsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Avis</Text>
              <TouchableOpacity
                style={styles.addReviewButton}
                onPress={() => setShowReviewForm(!showReviewForm)}
              >
                <Text style={styles.addReviewButtonText}>
                  {showReviewForm ? 'Annuler' : 'Rédiger un avis'}
                </Text>
              </TouchableOpacity>
            </View>

            {showReviewForm && (
              <View style={styles.reviewForm}>
                <Text style={styles.formLabel}>Note</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() =>
                        setNewReview({ ...newReview, rating: star })
                      }
                    >
                      <Star
                        size={32}
                        color="#FFB800"
                        fill={star <= newReview.rating ? '#FFB800' : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Votre avis</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Partagez votre expérience..."
                  placeholderTextColor="#64748B"
                  value={newReview.comment}
                  onChangeText={(text) =>
                    setNewReview({ ...newReview, comment: text })
                  }
                  multiline
                  numberOfLines={4}
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmitReview}
                >
                  <Text style={styles.submitButtonText}>Soumettre l'avis</Text>
                </TouchableOpacity>
              </View>
            )}

            {reviews.length === 0 ? (
              <Text style={styles.noReviews}>Aucun avis pour l'instant</Text>
            ) : (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          color="#FFB800"
                          fill={star <= review.rating ? '#FFB800' : 'transparent'}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  reviewCount: {
    fontSize: 14,
    color: '#64748B',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  infoSection: {
    gap: 12,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E1',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  reviewsSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addReviewButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewForm: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  reviewInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#FFF',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noReviews: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 20,
  },
  reviewCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewComment: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
  },
});
