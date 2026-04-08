import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Comment } from '@/types/database';

type CommentsModalProps = {
  videoId: string;
  visible: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
};

export default function CommentsModal({
  videoId,
  visible,
  onClose,
  onCommentAdded,
}: CommentsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);  // Empêche le double envoi

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.comments.list(videoId);
      setComments(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des commentaires :', error);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  // Charge les commentaires à chaque ouverture de la modal
  useEffect(() => {
    if (visible) loadComments();
  }, [visible, loadComments]);

  const handleSubmit = async () => {
    // Sécurité : ne pas soumettre si vide ou non connecté
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const data = await api.comments.create(videoId, newComment.trim());
      // Ajoute le commentaire à la liste sans recharger tous les commentaires
      setComments((prev) => [...prev, data]);
      setNewComment('');
      onCommentAdded();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du commentaire :', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Commentaires</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#FF6B35"
              style={styles.loader}
            />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Aucun commentaire pour l'instant. Soyez le premier !
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.comment}>
                  <Text style={styles.commentUser}>
                    @{item.profile?.username ?? 'user'}
                  </Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
              )}
            />
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ajouter un commentaire…"
              placeholderTextColor="#64748B"
              value={newComment}
              onChangeText={setNewComment}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              maxLength={500}
              editable={!submitting}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || submitting) && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Send size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 380,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  loader: {
    marginVertical: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
    flexGrow: 1,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  comment: {
    gap: 2,
  },
  commentUser: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '700',
  },
  commentText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 20,
  },
  commentDate: {
    color: '#475569',
    fontSize: 11,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFF',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
});
