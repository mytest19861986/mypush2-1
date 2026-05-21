import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.hamikart.app',
  appName: 'حامی کارت',
  webDir: 'public',
  server: {
    // آدرس سرور لینوکس
    url: 'http://107.173.47.76',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff',
  },
  // اجازه دسترسی HTTP بدون SSL
  hostnameAllowlist: ['107.173.47.76', 'localhost'],
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#059669',
      showSpinner: false,
    },
  },
};

export default config;
