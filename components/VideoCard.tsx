import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Heart, MessageCircle, Share2, MapPin, Volume2, VolumeX, Play, Pause } from 'lucide-react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { VideoWithProfile } from '@/types/database';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import CommentsModal from './CommentsModal';

const { width, height } = Dimensions.get('window');
const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv|webm|m4v)(\?.*)?$/i;

type VideoCardProps = {
  video: VideoWithProfile;
  isActive: boolean;
  onLikeUpdate: (videoId: string, isLiked: boolean, newCount: number) => void;
};

export function VideoCard({ video, isActive, onLikeUpdate }: VideoCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(video.is_liked);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(video.comments_count);
  // Sur les navigateurs web, l'autoplay avec le son est bloqué par défaut.
  // On commence donc en mode muet sur web, avec un bouton pour activer le son.
  const [isMuted, setIsMuted] = useState(Platform.OS === 'web');
  const isActiveRef = useRef(isActive);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const isPausedByUserRef = useRef(false);
  const [showTapIndicator, setShowTapIndicator] = useState(false);
  const [tapAction, setTapAction] = useState<'play' | 'pause'>('pause');

  const isRealVideo = VIDEO_EXTENSIONS.test(video.video_url);

  const player = useVideoPlayer(isRealVideo ? video.video_url : null, (p) => {
    p.loop = true;
    p.muted = Platform.OS === 'web';
  });

  // Synchronise l'état du son avec le lecteur vidéo pour une lecture en boucle
  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted]);

  // Garde la valeur de isActive accessible dans le listener statusChange
  // (les useEffect fermant sur des valeurs obsolètes, on utilise une ref)
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Lance ou met en pause la vidéo quand la carte active change
  useEffect(() => {
    if (!isRealVideo) return;
    if (isActive) {
      // On joue seulement si l'utilisateur n'a pas mis en pause manuellement
      if (!isPausedByUserRef.current) {
        try { player.play(); } catch { /* autoplay bloqué ; attente du readyToPlay */ }
      }
    } else {
      try { player.pause(); } catch { /* ignorer */ }
    }
  }, [isActive, isRealVideo]);

  // Joue également quand le joueur finit de mettre en mémoire tampon
  // (gère le cas où play() est appelé avant que la vidéo soit prête)
  const statusEvent = useEvent(player, 'statusChange', { status: player.status, error: undefined as any });
  const playerStatus = statusEvent.status;
  const playerError = statusEvent.error;

  useEffect(() => {
    if (!isRealVideo) return;
    // Dès que la vidéo est prête ET que la carte est active ET que l'utilisateur n'a pas mis en pause
    if (playerStatus === 'readyToPlay' && isActiveRef.current && !isPausedByUserRef.current) {
      try { player.play(); } catch { /* autoplay bloqué */ }
    }
    if (playerStatus === 'error') {
      console.error('[VideoPlayer] erreur:', playerError?.message, '| URL:', video.video_url);
    }
  }, [playerStatus, isRealVideo]);

  const handleLike = async () => {
    if (isLiking || !user) return;

    setIsLiking(true);
    // Optimistic update : on met à jour l'UI avant la réponse du serveur
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likesCount + 1 : likesCount - 1;

    setIsLiked(newIsLiked);
    setLikesCount(newCount);
    onLikeUpdate(video.id, newIsLiked, newCount);

    try {
      if (newIsLiked) {
        await api.videos.like(video.id);
      } else {
        await api.videos.unlike(video.id);
      }
    } catch (error) {
      // En cas d'échec réseau, on annule la mise à jour optimiste
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      console.error('Erreur lors du like :', error);
    } finally {
      setIsLiking(false);
    }
  };

  const avatarUri =
    video.profile.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(video.profile.username)}&background=FF6B35&color=fff`;

  const handleVideoTap = () => {
    if (!isRealVideo || !isActive) return;
    try {
      if (isPausedByUserRef.current) {
        // État actuel : en pause → on reprend la lecture
        player.play();
        setIsPausedByUser(false);
        isPausedByUserRef.current = false;
        setTapAction('play');
      } else {
        // État actuel : en lecture → on met en pause
        player.pause();
        setIsPausedByUser(true);
        isPausedByUserRef.current = true;
        setTapAction('pause');
      }
      // Affiche l'icône pendant 700ms puis la cache
      setShowTapIndicator(true);
      setTimeout(() => setShowTapIndicator(false), 700);
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {isRealVideo ? (
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />
        ) : (
          <Image
            source={{
              uri: video.thumbnail_url || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
            }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}
        <TouchableOpacity
          style={styles.overlay}
          onPress={handleVideoTap}
          activeOpacity={1}
        />
        {showTapIndicator && (
          <View style={styles.tapIndicator} pointerEvents="none">
            {tapAction === 'pause'
              ? <Pause fill="rgba(255,255,255,0.85)" size={72} color="rgba(255,255,255,0.85)" />
              : <Play fill="rgba(255,255,255,0.85)" size={72} color="rgba(255,255,255,0.85)" />
            }
          </View>
        )}
        {/* Overlay débug — visible en cas d'erreur du player */}
        {playerStatus === 'error' && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>⚠️ Vidéo inaccessible</Text>
            <Text style={styles.errorMsg} selectable>
              {playerError?.message ?? 'Erreur inconnue'}
            </Text>
            <Text style={styles.errorUrl} selectable>
              {video.video_url}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rightActions}>
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.avatar}>
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLike}
            disabled={isLiking}
          >
            <Heart
              size={32}
              color={isLiked ? '#FF6B35' : '#FFF'}
              fill={isLiked ? '#FF6B35' : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <Text style={styles.actionText}>{likesCount}</Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setCommentsOpen(true)}
          >
            <MessageCircle size={32} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.actionText}>{commentsCount}</Text>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={32} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {isRealVideo && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsMuted((m) => !m)}
            >
              {isMuted
                ? <VolumeX size={28} color="#FFF" strokeWidth={2} />
                : <Volume2 size={28} color="#FFF" strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.bottomInfo}>
        <Text style={styles.username}>@{video.profile.username}</Text>
        <Text style={styles.caption} numberOfLines={2}>
          {video.caption}
        </Text>
        {video.restaurant && (
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#FF6B35" />
            <Text style={styles.locationText}>{video.restaurant.name}</Text>
          </View>
        )}
        {video.is_food_hack && (
          <View style={styles.hackBadge}>
            <Text style={styles.hackBadgeText}>🍕 Astuce Culinaire</Text>
          </View>
        )}
      </View>

      <CommentsModal
        videoId={video.id}
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => setCommentsCount((c) => c + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tapIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMsg: {
    color: '#FFF',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorUrl: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    gap: 24,
  },
  actionContainer: {
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 80,
  },
  username: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  caption: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hackBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  hackBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
