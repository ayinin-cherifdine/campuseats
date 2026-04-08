import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { VideoCard } from '@/components/VideoCard';
import { VideoWithProfile } from '@/types/database';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const { height } = Dimensions.get('window');

export default function FeedScreen() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  // Index de la carte vidéo actuellement visible à l'écran
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Recharge le fil à chaque fois que cet onglet revient au premier plan
  // (pour afficher immédiatement les nouvelles vidéos publiées)
  useFocusEffect(
    useCallback(() => {
      loadVideos();
    }, [])
  );

  const loadVideos = async () => {
    try {
      const videosData: VideoWithProfile[] = await api.videos.feed();
      setVideos(videosData ?? []);
    } catch (error) {
      console.error('Erreur lors du chargement du fil :', error);
    } finally {
      setLoading(false);
    }
  };

  // Propage la mise à jour du like d'une vidéo dans la liste sans recharger toute la page
  const handleLikeUpdate = (
    videoId: string,
    isLiked: boolean,
    newCount: number
  ) => {
    setVideos((prev) =>
      prev.map((video) =>
        video.id === videoId
          ? { ...video, is_liked: isLiked, likes_count: newCount }
          : video
      )
    );
  };

  // Détecte quelle carte est visible (seuil : 60% de la surface visible)
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
    []
  );

  const viewabilityConfig = useRef<{ viewAreaCoveragePercentThreshold: number }>({
    viewAreaCoveragePercentThreshold: 60,
  }).current;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={({ item, index }) => (
          <VideoCard
            video={item}
            isActive={index === activeIndex}
            onLikeUpdate={handleLikeUpdate}
          />
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});
