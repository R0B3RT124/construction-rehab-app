import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rehabops.app',
  appName: 'Mitchell Construction',
  webDir: 'public',  // Minimal — the app loads entirely from the live server
  server: {
    // The native app shell loads the live Vercel deployment directly
    url: 'https://construction-rehab-app.vercel.app',
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
