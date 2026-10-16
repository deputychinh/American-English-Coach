import type { CapacitorConfig } from '@capacitor/cli';

// The iOS app is the static web export inside a WKWebView. The API runs on the learner's Mac;
// its address is set in the app (Tiến độ → Cài đặt → Địa chỉ máy chấm) and stored on the phone.
const config: CapacitorConfig = {
  appId: 'com.deputychinh.americanenglishcoach',
  appName: 'American English Coach',
  webDir: 'out',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#F5F5F4',
    allowsLinkPreview: false,
  },
};

export default config;
