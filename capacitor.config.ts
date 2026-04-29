import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wiigit.whiteboard',
  appName: 'Walli',
  webDir: 'dist',
  server: {
    url: 'https://walli.wiigit.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
