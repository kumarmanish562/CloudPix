# CloudPix Mobile (React Native / Expo)

Cross-platform iOS and Android mobile app for CloudPix built with React Native and Expo Router.

## Features
- **Authentication**: JWT login & register with persistent secure storage (`expo-secure-store`).
- **Email Verification**: In-app 6-digit code verification and resend capability.
- **Photo Feed**: High-performance grid gallery with caching (`expo-image`) and pull-to-refresh.
- **Camera Roll Upload**: Direct image upload from iOS Photos / Android Gallery with ImageKit cloud integration (`expo-image-picker`).
- **Collections & Albums**: Browse user albums and cover previews.
- **Live Metrics Dashboard**: Visual cloud storage meter, format statistics, and count KPIs.
- **Detail Viewer**: Full-screen photo viewer with metadata and favorite toggles.

---

## Getting Started

### 1. Install Dependencies
Inside the `cloudpixmobile` directory:

```bash
cd cloudpixmobile
npm install
```

### 2. Configure Backend URL
By default:
- **Android Emulator**: connects to `http://10.0.2.2:8080/api` (standard host loopback).
- **iOS Simulator**: connects to `http://localhost:8080/api`.
- **Physical Phone**: set your computer's local Wi-Fi IP address (e.g. `http://192.168.1.50:8080/api`).

You can override the API URL by creating a `.env` file in `cloudpixmobile`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.50:8080/api
```

### 3. Launch Development Server
```bash
npx expo start
```

- Press **`a`** to open on Android Emulator.
- Press **`i`** to open on iOS Simulator.
- Or scan the terminal QR code with **Expo Go** (available on App Store & Google Play) on your physical phone.

