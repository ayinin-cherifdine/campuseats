import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Search, MapPin, Star, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Restaurant } from '@/types/database';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';

type Coords = { latitude: number; longitude: number };

/**
 * Calcule la distance en kilomètres entre deux coordonnées GPS.
 * Utilise la formule de Haversine (distance sur une sphère).
 */
function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function DiscoverScreen() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Position GPS de l'utilisateur (null si non autorisée ou non demandée)
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      const data: Restaurant[] = await api.restaurants.list();
      setRestaurants(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des restaurants :', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNearMe = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
        'Localisation requise',
        'Veuillez autoriser l\'accès à votre localisation pour trouver des restaurants près de vous.'
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position. Veuillez réessayer.');
    } finally {
      setLocating(false);
    }
  };

  // Filtre les restaurants en temps réel selon la saisie de l'utilisateur
  const filteredRestaurants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return restaurants.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.cuisine_type.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q)
    );
  }, [searchQuery, restaurants]);

  // Si la localisation est disponible, trie les restaurants par distance croissante
  const displayRestaurants = useMemo(() => {
    if (!userLocation) return filteredRestaurants;
    return [...filteredRestaurants].sort(
      (a, b) =>
        haversineKm(userLocation, { latitude: a.latitude, longitude: a.longitude }) -
        haversineKm(userLocation, { latitude: b.latitude, longitude: b.longitude })
    );
  }, [filteredRestaurants, userLocation]);

  const renderRestaurantCard = ({ item }: { item: Restaurant }) => {
    const dist = userLocation
      ? haversineKm(userLocation, {
          latitude: item.latitude,
          longitude: item.longitude,
        })
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/restaurant/${item.id}`)}
      >
        <Image
          source={{
            uri:
              item.photo_url ||
              'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
          }}
          style={styles.cardImage}
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardCuisine}>{item.cuisine_type}</Text>

          <View style={styles.cardMeta}>
            <View style={styles.ratingContainer}>
              <Star size={16} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>
                {item.average_rating > 0
                  ? item.average_rating.toFixed(1)
                  : 'Nouveau'}
              </Text>
              <Text style={styles.reviewCount}>
                ({item.total_reviews} avis)
              </Text>
            </View>
            <Text style={styles.priceText}>{'€'.repeat(item.price_range)}</Text>
          </View>

          <View style={styles.locationContainer}>
            <MapPin size={14} color="#64748B" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.address}
            </Text>
            {dist !== null && (
              <Text style={styles.distanceText}>{dist.toFixed(1)} km</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Découvrir</Text>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher restaurants, cuisine…"
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.nearMeButton, userLocation && styles.nearMeActive]}
          onPress={handleNearMe}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Navigation
              size={16}
              color="#FFF"
              fill={userLocation ? '#FFF' : 'transparent'}
            />
          )}
          <Text style={styles.nearMeText}>
            {userLocation ? 'Près de moi ✓' : 'Près de moi'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayRestaurants}
        renderItem={renderRestaurantCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  nearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  nearMeActive: {
    backgroundColor: '#FF6B35',
  },
  nearMeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  cardCuisine: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  reviewCount: {
    fontSize: 14,
    color: '#64748B',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  distanceText: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
    marginLeft: 4,
  },
});
