# NFC Smart Home Automation App

A comprehensive NFC-triggered smart home automation app built with Ionic/Capacitor and Supabase, supporting Philips Hue lights and Meross smart plugs.

## Features

- **NFC Tag Management**: Scan and configure NFC tags to trigger automations
- **Smart Device Integration**: 
  - Philips Hue Bridge (local HTTP API)
  - Meross Smart Plugs (cloud API)
- **Action Configuration**: Assign multiple actions per NFC tag
- **Activity Logging**: Track all automation triggers and their results
- **User Authentication**: Secure login via Supabase Auth
- **Realtime Updates**: Live device status and activity updates
- **Cross-Platform**: Works on iOS and Android

## Tech Stack

- **Frontend**: Ionic React + TypeScript + Capacitor
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **NFC**: Capawesome NFC Plugin
- **Smart Home APIs**:
  - Philips Hue Bridge (local network HTTP API)
  - Meross Cloud API (HTTP/MQTT)

## Prerequisites

- Node.js 18+ and npm
- Ionic CLI: `npm install -g @ionic/cli`
- Capacitor CLI (included in project dependencies)
- For iOS development: Xcode 14+
- For Android development: Android Studio with SDK 33+
- NFC-enabled mobile device for testing

## Installation

### 1. Install Dependencies

```bash
cd nfc-smart-home
npm install
```

### 2. Supabase Setup

The backend is already deployed at:
- **Supabase URL**: `https://jrchntonfshqvorcfvqh.supabase.co`
- **Anon Key**: Already configured in `src/services/supabase.ts`

Database tables and Edge Functions are pre-deployed:
- Tables: `profiles`, `nfc_tags`, `devices`, `actions`, `tag_actions`, `activity_log`, `api_credentials`
- Edge Functions:
  - `execute-hue-action`: Execute Philips Hue light control
  - `discover-hue-bridge`: Discover Hue bridges on network
  - `create-hue-user`: Authenticate with Hue Bridge
  - `execute-meross-action`: Control Meross smart plugs
  - `test-device-connection`: Test device connectivity

### 3. Run in Browser (PWA)

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

**Note**: NFC functionality requires a physical device. Use browser for UI development only.

### 4. Build for Mobile

#### iOS

```bash
# Add iOS platform
npx cap add ios

# Sync web assets
npx cap sync ios

# Open in Xcode
npx cap open ios
```

**iOS Configuration**:
1. Open `ios/App/App/Info.plist` and add:
   ```xml
   <key>NFCReaderUsageDescription</key>
   <string>This app needs NFC to scan tags for smart home automation</string>
   ```
2. In Xcode, enable the "Near Field Communication Tag Reading" capability
3. Build and run on a physical iOS device (NFC doesn't work in simulator)

#### Android

```bash
# Add Android platform
npx cap add android

# Sync web assets
npx cap sync android

# Open in Android Studio
npx cap open android
```

**Android Configuration**:
1. Open `android/app/src/main/AndroidManifest.xml` and verify:
   ```xml
   <uses-permission android:name="android.permission.NFC" />
   <uses-feature android:name="android.hardware.nfc" android:required="false" />
   ```
2. Build and run on a physical Android device

## Usage Guide

### 1. Sign Up / Login
- Create account with email/password
- Authentication is handled by Supabase Auth

### 2. Add Smart Home Devices

#### Philips Hue Bridge:
1. Go to "Devices" tab
2. Tap "+" button
3. Select "Philips Hue Bridge"
4. Tap "Discover Bridge" (automatically finds bridge on network)
5. Press the physical link button on your Hue Bridge
6. Tap "Authenticate" in the app
7. Save the device

#### Meross Smart Plug:
1. Go to "Devices" tab
2. Tap "+" button
3. Select "Meross Smart Plug"
4. Enter your Meross account email and password
5. Save the device

### 3. Scan NFC Tags
1. Go to "NFC Tags" tab
2. Tap the scan button (floating action button)
3. Hold your phone near an NFC tag
4. Enter a name and description for the tag
5. Save the tag

### 4. Assign Actions (Future Enhancement)
Currently, actions are managed through the database. Future versions will include a UI for:
- Creating actions (turn on/off lights, set brightness, change color, etc.)
- Linking actions to NFC tags
- Setting time restrictions
- Configuring execution order

### 5. Trigger Automation
1. Scan a configured NFC tag
2. Actions will execute automatically
3. View results in "Activity" tab

## Database Schema

- **profiles**: User profiles extending Supabase auth.users
- **nfc_tags**: NFC tag metadata (tag_id, name, description, status)
- **devices**: Smart home devices (type, connection details, online status)
- **actions**: Device actions (device_id, action_type, parameters)
- **tag_actions**: Many-to-many link between tags and actions
- **activity_log**: Automation execution history
- **api_credentials**: Encrypted storage for API keys

## Security

- All user data is protected by Row Level Security (RLS) policies
- API credentials are stored encrypted in Supabase
- Edge Functions handle sensitive operations (no API keys in client)
- HTTPS/TLS for all network communications
- JWT-based authentication

## Development

### Project Structure

```
nfc-smart-home/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Main app pages
│   │   ├── Dashboard.tsx
│   │   ├── TagsPage.tsx
│   │   ├── DevicesPage.tsx
│   │   ├── ActivityPage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/            # Business logic
│   │   ├── supabase.ts      # Supabase client
│   │   └── nfc.service.ts   # NFC operations
│   ├── types/               # TypeScript types
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── supabase/
│   └── functions/           # Edge Functions (pre-deployed)
├── android/                 # Android platform
├── ios/                     # iOS platform
└── capacitor.config.ts      # Capacitor configuration
```

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint
- `npx cap sync`: Sync web assets to native platforms
- `npx cap open ios`: Open iOS project in Xcode
- `npx cap open android`: Open Android project in Android Studio

## Troubleshooting

### NFC Not Working
- Ensure you're testing on a physical device (NFC doesn't work in simulators/emulators)
- Check that NFC is enabled in device settings
- Verify NFC permissions are granted
- On iOS, ensure "Near Field Communication Tag Reading" capability is enabled

### Hue Bridge Not Discovered
- Ensure bridge and phone are on the same Wi-Fi network
- Check that bridge is powered on and connected
- Try manual IP entry if discovery fails

### Meross Connection Issues
- Verify credentials are correct
- Check internet connection (Meross uses cloud API)
- Ensure Meross account has devices paired

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Capacitor cache: `npx cap sync --clean`
- For iOS: Clean build folder in Xcode (Product → Clean Build Folder)
- For Android: Clean project in Android Studio (Build → Clean Project)

## API Documentation

### Edge Functions

All Edge Functions are deployed at: `https://jrchntonfshqvorcfvqh.supabase.co/functions/v1/`

#### discover-hue-bridge
- **Method**: GET/POST
- **Body**: None
- **Response**: List of discovered Hue bridges with IP addresses

#### create-hue-user
- **Method**: POST
- **Body**: `{ bridgeIp: string, devicetype?: string }`
- **Response**: Username/token for bridge authentication

#### execute-hue-action
- **Method**: POST
- **Body**: `{ bridgeIp, username, actionType, actionParams, deviceId }`
- **Action Types**: `light_on`, `light_off`, `set_brightness`, `set_color`, `set_color_temp`, `activate_scene`, `group_on`, `group_off`

#### execute-meross-action
- **Method**: POST
- **Body**: `{ email, password, deviceUuid, actionType, actionParams, region }`
- **Action Types**: `turn_on`, `turn_off`

#### test-device-connection
- **Method**: POST
- **Body**: `{ deviceType, connectionDetails }`
- **Response**: Connection status and device details

## Future Enhancements

- [ ] UI for creating and managing actions
- [ ] Scenes and automation groups
- [ ] Time-based restrictions and scheduling
- [ ] Conditional logic (if-then rules)
- [ ] Export/import tag configurations
- [ ] Widget for quick access
- [ ] Multiple actions per tag with sequencing
- [ ] Support for additional smart home platforms (HomeKit, Matter, etc.)

## License

MIT License - Built by MiniMax Agent

## Support

For issues or questions, please check:
- Ionic Documentation: https://ionicframework.com/docs
- Capacitor Documentation: https://capacitorjs.com/docs
- Supabase Documentation: https://supabase.com/docs
- Capawesome NFC Plugin: https://capawesome.io/plugins/nfc/

---

**Note**: This app requires NFC-enabled devices and compatible smart home hardware (Philips Hue Bridge, Meross smart plugs) to function fully.
