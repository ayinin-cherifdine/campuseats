import { useEffect } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

/**
 * Hook utilitaire requis par Expo sur le web.
 * Il signale au framework Expo que le rendu initial est terminé.
 */
export function useFrameworkReady() {
  useEffect(() => {
    window.frameworkReady?.();
  });
}
