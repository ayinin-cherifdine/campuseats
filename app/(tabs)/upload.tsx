import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Camera, Upload, X, Video } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';

export default function UploadScreen() {
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [isFoodHack, setIsFoodHack] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Asset vidéo sélectionné depuis la médiathèque ou la caméra
  const [videoAsset, setVideoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const router = useRouter();

  // Ouvre la médiathèque pour choisir une vidéo
  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l\'accès à votre médiathèque pour sélectionner des vidéos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'videos',
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoAsset(result.assets[0]);
    }
  };

  // Ouvre la caméra pour enregistrer une vidéo directement
  const recordVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l\'accès à la caméra pour enregistrer des vidéos.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      allowsEditing: true,
      videoMaxDuration: 60,
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setVideoAsset(result.assets[0]);
    }
  };

  const handleUpload = async () => {
    if (!caption.trim()) {
      Alert.alert('Légende manquante', 'Veuillez ajouter une légende à votre vidéo.');
      return;
    }
    if (!videoAsset) {
      Alert.alert('Aucune vidéo', 'Veuillez d\'abord sélectionner ou enregistrer une vidéo.');
      return;
    }

    setUploading(true);
    try {
      // Convertit la liste de tags (séparés par virgule) en tableau de chaînes
      const tagsArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);

      await api.videos.upload(videoAsset.uri, {
        caption: caption.trim(),
        tags: tagsArray,
        isFoodHack,
        duration: videoAsset.duration ? Math.round(videoAsset.duration / 1000) : 0,
      });

      Alert.alert('Publié !', 'Votre vidéo est maintenant visible dans le fil d\'actualité.', [
        { text: 'OK', onPress: () => router.push('/(tabs)') },
      ]);

      setCaption('');
      setTags('');
      setIsFoodHack(false);
      setVideoAsset(null);
    } catch (error: any) {
      Alert.alert('Échec du téléversement', error.message || 'Veuillez réessayer.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Téléverser une vidéo</Text>
      </View>

      <View style={styles.content}>
        {videoAsset ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: videoAsset.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => setVideoAsset(null)}
            >
              <X size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.videoBadge}>
              <Video size={14} color="#FFF" />
              <Text style={styles.videoBadgeText}>
                {videoAsset.duration
                  ? `${Math.round(videoAsset.duration / 1000)}s`
                  : 'Vidéo sélectionnée'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.videoPlaceholder}>
            <Camera size={64} color="#64748B" strokeWidth={1.5} />
            <Text style={styles.placeholderText}>Sélectionner ou enregistrer une vidéo</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.selectButton} onPress={pickVideo}>
                <Upload size={20} color="#FFF" />
                <Text style={styles.selectButtonText}>Choisir une vidéo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recordButton}
                onPress={recordVideo}
              >
                <Camera size={20} color="#FFF" />
                <Text style={styles.recordButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Légende</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Partagez votre expérience culinaire…"
              placeholderTextColor="#64748B"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tags (séparés par des virgules)</Text>
            <TextInput
              style={styles.input}
              placeholder="ex. burger, déjeuner, économique"
              placeholderTextColor="#64748B"
              value={tags}
              onChangeText={setTags}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsFoodHack(!isFoodHack)}
          >
            <View
              style={[styles.checkbox, isFoodHack && styles.checkboxChecked]}
            >
              {isFoodHack && <View style={styles.checkboxInner} />}
            </View>
            <Text style={styles.checkboxLabel}>
              C'est un Food Hack (astuces étudiant, recettes économiques, etc.)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.uploadButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.uploadButtonText}>Publier la vidéo</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Conseils pour un bon contenu :</Text>
          <Text style={styles.tipItem}>• Gardez les vidéos sous 60 secondes</Text>
          <Text style={styles.tipItem}>
            • Filmez la nourriture avec une bonne lumière naturelle
          </Text>
          <Text style={styles.tipItem}>• Indiquez l'emplacement du restaurant</Text>
          <Text style={styles.tipItem}>
            • Partagez des avis honnêtes et des astuces économiques
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },
  content: {
    padding: 20,
  },
  videoPlaceholder: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  selectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  recordButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#000',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  videoBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#334155',
  },
  textArea: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E1',
  },
  uploadButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tips: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 20,
  },
});
