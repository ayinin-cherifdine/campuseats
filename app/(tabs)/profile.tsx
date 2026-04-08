import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { MapPin, Settings, LogOut, Play, Trash2, X } from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Video } from '@/types/database';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - 40 - 16) / 3; // 3 colonnes, padding 20 + gaps 8

// ── Lecteur plein écran ──────────────────────────────────────────────────────
function VideoPlayerModal({
  video,
  onClose,
}: {
  video: Video | null;
  onClose: () => void;
}) {
  // Crée un lecteur dédié pour la vidéo sélectionnée, avec boucle et son activé
  const player = useVideoPlayer(video?.video_url ?? null, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (video?.video_url) {
      try { player.play(); } catch { /* ignorer si autoplay bloqué */ }
    }
  }, [video?.video_url]);

  if (!video) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={playerStyles.container}>
        <VideoView
          player={player}
          style={playerStyles.video}
          contentFit="contain"
          nativeControls
        />
        <TouchableOpacity style={playerStyles.closeBtn} onPress={onClose}>
          <X size={28} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={playerStyles.captionBar}>
          <Text style={playerStyles.caption} numberOfLines={2}>
            {video.caption}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const playerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  closeBtn: {
    position: 'absolute',
    top: 54,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionBar: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 12,
  },
  caption: { color: '#FFF', fontSize: 14 },
});

// ── Écran Profil ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (profile) loadUserVideos();
  }, [profile]);

  const loadUserVideos = async () => {
    if (!profile) return;
    try {
      const data: Video[] = await api.videos.userVideos(profile.id);
      setVideos(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des vidéos :', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (video: Video) => {
    Alert.alert(
      'Supprimer la vidéo',
      'Cette vidéo sera supprimée définitivement. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.videos.delete(video.id);
              setVideos((prev) => prev.filter((v) => v.id !== video.id));
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de supprimer la vidéo.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Après la déconnexion, redirige forcément vers l'écran de connexion
      router.replace('/auth/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion :', error);
    }
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.settingsButton}>
            <Settings size={24} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.profileImageContainer}>
            <Image
              {/* Avatar : image personnalisée ou générée par ui-avatars.com avec initiales */}
              source={{ uri: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username)}&background=FF6B35&color=fff&size=120&bold=true` }}
              style={styles.profileImage}
            />
          </View>

          <Text style={styles.username}>@{profile.username}</Text>
          <Text style={styles.fullName}>{profile.full_name}</Text>

          {profile.campus_location && (
            <View style={styles.locationContainer}>
              <MapPin size={16} color="#64748B" />
              <Text style={styles.locationText}>{profile.campus_location}</Text>
            </View>
          )}

          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{videos.length}</Text>
              <Text style={styles.statLabel}>Vidéos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.followers_count}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.following_count}</Text>
              <Text style={styles.statLabel}>Abonnements</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#FFF" />
            <Text style={styles.signOutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.videosSection}>
          <Text style={styles.sectionTitle}>Mes vidéos</Text>

          {loading ? (
            <ActivityIndicator size="small" color="#FF6B35" />
          ) : videos.length === 0 ? (
            <Text style={styles.emptyText}>Aucune vidéo pour l'instant</Text>
          ) : (
            <View style={styles.videoGrid}>
              {videos.map((video) => (
                <View key={video.id} style={styles.videoThumb}>
                  {/* Miniature ou fond sombre si pas de thumbnail */}
                  {video.thumbnail_url ? (
                    <Image
                      source={{ uri: video.thumbnail_url }}
                      style={styles.videoThumbImage}
                    />
                  ) : (
                    <View style={styles.videoThumbPlaceholder} />
                  )}

                  {/* Infos bas de vignette */}
                  <View style={styles.videoOverlay}>
                    <Text style={styles.videoLikes}>{video.likes_count} ❤️</Text>
                  </View>

                  {/* Bouton lecture au centre */}
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={() => setPlayingVideo(video)}
                  >
                    <Play size={28} color="#FFF" fill="#FFF" />
                  </TouchableOpacity>

                  {/* Bouton supprimer en haut à droite */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(video)}
                  >
                    <Trash2 size={16} color="#FFF" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Lecteur plein écran */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </>
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
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1E293B',
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FF6B35',
    marginBottom: 16,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  fullName: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
  },
  bio: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  signOutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  videosSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 40,
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  videoThumb: {
    width: THUMB_SIZE,
    aspectRatio: 9 / 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  videoThumbImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  videoLikes: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239,68,68,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
