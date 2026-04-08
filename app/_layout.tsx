import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Layout racine de l'application : enveloppe tout le contenu dans AuthProvider
 * pour que n'importe quel écran puisse accéder à la session utilisateur via useAuth().
 * La barre de statut est forcée en mode clair (texte blanc) pour s'adapter
 * au thème sombre de l'application.
 */
export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      {/* Stack navigator : gère la navigation entre les écrans */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />          {/* Garde de navigation (redirection auto) */}
        <Stack.Screen name="auth/login" />     {/* Écran de connexion */}
        <Stack.Screen name="auth/signup" />    {/* Écran d'inscription */}
        <Stack.Screen name="(tabs)" />         {/* Onglets principaux */}
        <Stack.Screen name="restaurant/[id]" />{/* Fiche détail restaurant */}
        <Stack.Screen name="+not-found" />     {/* Page 404 */}
      </Stack>
      <StatusBar style="light" />
    </AuthProvider>
  );
}
