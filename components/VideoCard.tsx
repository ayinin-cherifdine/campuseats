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
  // Web browsers block autoplay with sound → start muted on web
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

  // Sync mute state to player
  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted]);

  // Track latest isActive in a ref so the statusChange listener can access it
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Play/pause when the active card changes
  useEffect(() => {
    if (!isRealVideo) return;
    if (isActive) {
      if (!isPausedByUserRef.current) {
        try { player.play(); } catch { /* autoplay blocked; wait for readyToPlay */ }
      }
    } else {
      try { player.pause(); } catch { /* ignore */ }
    }
  }, [isActive, isRealVideo]);

  // Also play when the player finishes loading (handles the case where
  // play() was called before the video was buffered)
  const statusEvent = useEvent(player, 'statusChange', { status: player.status, error: undefined as any });
  const playerStatus = statusEvent.status;
  const playerError = statusEvent.error;

  useEffect(() => {
    if (!isRealVideo) return;
    if (playerStatus === 'readyToPlay' && isActiveRef.current && !isPausedByUserRef.current) {
      try { player.play(); } catch { /* autoplay blocked */ }
    }
    if (playerStatus === 'error') {
      console.error('[VideoPlayer] erreur:', playerError?.message, '| URL:', video.video_url);
    }
  }, [playerStatus, isRealVideo]);

  const handleLike = async () => {
    if (isLiking || !user) return;

    setIsLiking(true);
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
      setIsLiked(!newIsLiked);
      setLikesCount(likesCount);
      console.error('Error toggling like:', error);
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
        player.play();
        setIsPausedByUser(false);
        isPausedByUserRef.current = false;
        setTapAction('play');
      } else {
        player.pause();
        setIsPausedByUser(true);
        isPausedByUserRef.current = true;
        setTapAction('pause');
      }
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
        {/* Overlay débug — visible en cas d'erreur du player */}}
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
