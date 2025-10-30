import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nfcsmarthome.app',
  appName: 'NFC Smart Home',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Nfc: {
      enabled: true
    }
  }
};

export default config;
