import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Écran de garde (garde de navigation).
 * Redirige automatiquement l'utilisateur selon son état de connexion :
 * - Non connecté → /auth/login
 * - Connecté → /(tabs)
 * Affiche un spinner pendant que la session est restaurée depuis le stockage local.
 */
export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // On attend la fin du chargement pour éviter une redirection prématuré
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // Pas de session et pas sur un écran auth → connexion requise
      router.replace('/auth/login');
    } else if (session && (inAuthGroup || segments[0] !== '(tabs)')) {
      // Session active mais pas encore sur les onglets → redirection
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});
