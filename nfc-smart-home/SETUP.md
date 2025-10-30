# NFC Smart Home Automation - Setup Instructions

## Quick Start for Development

Since npm network has connectivity issues in this environment, here's the manual setup guide:

### 1. Prerequisites
- Node.js 18+ installed
- Ionic CLI: `npm install -g @ionic/cli`
- Physical NFC-enabled mobile device (iOS/Android)

### 2. Install Dependencies

```bash
cd /workspace/nfc-smart-home
npm install
```

If npm continues to have network issues, use yarn or pnpm:

```bash
# Using yarn
yarn install

# Using pnpm
pnpm install
```

### 3. Backend Already Configured

The Supabase backend is fully deployed and ready:
- Database schema created with all tables
- Row Level Security (RLS) policies enabled
- 5 Edge Functions deployed and active:
  - execute-hue-action
  - discover-hue-bridge
  - create-hue-user
  - execute-meross-action
  - test-device-connection

Credentials are hardcoded in `src/services/supabase.ts` for quick testing.

### 4. Run Development Server

```bash
npm run dev
```

Access at http://localhost:3000

**Note**: NFC features require a physical device. The browser version is for UI development only.

### 5. Build for Mobile

#### iOS Setup:
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

Then in Xcode:
1. Add "Near Field Communication Tag Reading" capability
2. Add NFCReaderUsageDescription to Info.plist
3. Build to physical iOS device

#### Android Setup:
```bash
npx cap add android
npx cap sync android
npx cap open android
```

Then in Android Studio:
1. Verify NFC permissions in AndroidManifest.xml
2. Build to physical Android device

## App Features

### 1. Authentication
- Sign up with email/password
- Secure JWT-based authentication via Supabase

### 2. Device Management
- Add Philips Hue Bridge (auto-discovery + link button auth)
- Add Meross Smart Plugs (cloud credentials)
- Test device connectivity

### 3. NFC Tag Management
- Scan NFC tags
- Configure tag names and descriptions
- View all registered tags

### 4. Activity Monitoring
- View automation execution history
- Track success/failure status
- Real-time activity updates

### 5. Settings
- Configure haptic feedback
- Visual/audio confirmation preferences
- Sign out

## Testing Checklist

- [ ] User registration and login works
- [ ] Dashboard displays stats correctly
- [ ] NFC scanning detects tags (physical device required)
- [ ] Hue Bridge discovery finds local bridge
- [ ] Hue Bridge authentication works (link button flow)
- [ ] Meross credentials can be saved
- [ ] Device connection tests work
- [ ] Activity log shows triggered automations
- [ ] Settings save and persist

## Known Limitations

1. **NFC**: Requires physical device with NFC hardware
2. **Hue Bridge**: Must be on same Wi-Fi network as phone
3. **Meross**: Requires active internet connection (cloud API)
4. **Actions UI**: Action configuration UI not yet implemented (use database directly)

## Next Steps for Production

1. Complete action management UI
2. Implement tag-to-action linking interface
3. Add multiple actions per tag support
4. Time-based restrictions UI
5. Export/import configurations
6. Push notifications for automations
7. Offline mode with sync queue

## Database Schema

All tables created in Supabase:
- profiles (user profiles)
- nfc_tags (NFC tag metadata)
- devices (smart home devices)
- actions (device actions)
- tag_actions (many-to-many linking)
- activity_log (execution history)
- api_credentials (encrypted API keys)

## API Endpoints

Edge Functions:
- https://jrchntonfshqvorcfvqh.supabase.co/functions/v1/discover-hue-bridge
- https://jrchntonfshqvorcfvqh.supabase.co/functions/v1/create-hue-user
- https://jrchntonfshqvorcfvqh.supabase.co/functions/v1/execute-hue-action
- https://jrchntonfshqvorcfvqh.supabase.co/functions/v1/execute-meross-action
- https://jrchntonfshqvorcfvqh.supabase.co/functions/v1/test-device-connection

---

**Built with Ionic React, Capacitor, and Supabase**
