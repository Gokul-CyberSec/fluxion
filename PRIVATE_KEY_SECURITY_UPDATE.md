# Private Key Security Update - Implementation Summary

## Overview
The application has been updated so that private keys are **never stored in the browser**. Instead:
1. On first signup, the private key is downloaded as a file
2. Users must upload/paste their private key when they want to decrypt files
3. Private keys are only kept in memory (session storage) during the current browser session

## What Changed

### 1. **New Component: PrivateKeyManager** 
[PrivateKeyManager.tsx](ui/src/components/PrivateKeyManager.tsx)
- Allows users to upload their private key file or paste the JSON
- Validates the key format
- Stores the key in session memory only (not persisted)
- Shows security warnings and instructions

### 2. **Updated: keyStorage.ts**
[keyStorage.ts](ui/src/lib/keyStorage.ts)
- **Public keys** → Stored in IndexedDB (persistent)
- **Private keys** → Stored in session memory only (temporary)
- New functions:
  - `storePrivateKeyInSession()` - Store private keys in memory
  - `getPrivateKeysFromSession()` - Retrieve private keys from memory
  - `clearPrivateKeysFromSession()` - Clear private keys from memory
  - `hasPrivateKeysInSession()` - Check if private keys are loaded
  - `hasPublicKeys()` - Check if user has completed signup

### 3. **Updated: Login.tsx**
[Login.tsx](ui/src/components/Login.tsx)
- On first signup after key generation:
  - Only stores **public keys** in IndexedDB
  - Creates a JSON file with **private keys**
  - Automatically downloads the file to the user
  - Shows alert warning user to save the file securely

### 4. **Updated: ReceiveFiles.tsx**
[ReceiveFiles.tsx](ui/src/components/ReceiveFiles.tsx)
- Before downloading/decrypting a file:
  - Checks if private key is loaded in session
  - If not loaded, shows `PrivateKeyManager` component
  - User must provide their private key to proceed
- After key is loaded, continues with decryption process

### 5. **Updated: AuthContext.tsx**
[AuthContext.tsx](ui/src/contexts/AuthContext.tsx)
- Uses `hasPublicKeys()` instead of `hasKeys()` to check signup status
- Clears private keys from session on logout

## Security Flow

### First Time Signup
1. User signs in with Google
2. System generates RSA key pairs (encryption + signing)
3. **Public keys** → Saved to IndexedDB + uploaded to server
4. **Private keys** → Downloaded as JSON file
5. User sees alert to save the file safely

### Subsequent Sessions
1. User signs in with Google
2. User navigates to "Receive Files"
3. User clicks "Download" on a file
4. System prompts for private key (if not already loaded)
5. User uploads/pastes their private key file
6. Private key stored in memory for this session only
7. File decryption proceeds

### On Logout/Browser Close
- Public keys remain in IndexedDB
- Private keys are cleared from memory
- User will need to provide private key again next session

## Private Key File Format

```json
{
  "encryptionPrivateKey": "MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...",
  "signingPrivateKey": "MIIEvQIBADANBgkqhkiG9w0BAQEFAASC...",
  "createdAt": "2026-01-09T...",
  "warning": "Keep this file safe! You will need it to decrypt files. Never share it with anyone."
}
```

## Benefits

✅ **Enhanced Security**: Private keys never persisted to disk/IndexedDB
✅ **User Control**: Users maintain physical control of their private keys
✅ **Zero-Trust**: Even if browser storage is compromised, private keys are not exposed
✅ **Session-Based**: Keys automatically cleared when browser closes
✅ **Explicit Consent**: Users must actively load their key to decrypt files

## User Experience Notes

- **First signup**: User receives a one-time download of their private key file
- **Decrypting files**: User must provide their private key each session
- **Key persists**: Within a session, key remains loaded (no need to re-enter for each file)
- **Logout/Close**: Private key is cleared, must be provided again next session

## Testing Checklist

- [ ] New user signup downloads private key file
- [ ] Alert shows warning about saving the key
- [ ] Private key file contains correct format
- [ ] Attempting to decrypt without key shows PrivateKeyManager
- [ ] Uploading private key file works
- [ ] Pasting private key JSON works
- [ ] Invalid key format shows error
- [ ] After loading key, decryption works normally
- [ ] Logout clears private key from memory
- [ ] Closing browser clears private key from memory
- [ ] Reopening requires re-loading private key

## Migration Notes

**Existing Users**: Users who already have private keys stored in IndexedDB will need to:
1. Export/backup their keys before this update
2. Or regenerate new keys (will lose access to old encrypted files)

Consider adding a migration script to export existing private keys before deploying this update.
