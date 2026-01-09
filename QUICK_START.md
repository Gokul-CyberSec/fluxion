# 🚀 Quick Start - Updated Private Key System

## Summary of Changes

Vortex now uses a **more secure key management system** where private keys are:
- ❌ **NOT stored in browser** (no IndexedDB/LocalStorage)  
- ✅ **Downloaded as a file** on first signup
- ✅ **Loaded into memory** only when needed
- ✅ **Automatically cleared** on logout/browser close

---

## Testing the New System

### 1️⃣ Test New User Signup
```
1. Clear browser data (or use incognito)
2. Go to Vortex app
3. Sign in with Google (new account or cleared account)
4. ✅ A JSON file should auto-download
5. ✅ Alert should show warning to save the file
6. ✅ You should be logged into dashboard
7. ✅ Top-right shows "Key Not Loaded" (amber)
```

### 2️⃣ Test File Decryption Without Key
```
1. Go to "Receive Files"
2. Click "Download" on any file
3. ✅ Should show "Load Private Key" screen
4. ✅ Can upload file or paste JSON
5. Upload the downloaded private key file
6. ✅ File should decrypt successfully
7. ✅ Dashboard shows "Key Loaded" (green)
```

### 3️⃣ Test Session Persistence
```
1. After loading key, go to dashboard
2. Go back to "Receive Files"
3. Download another file
4. ✅ Should NOT ask for key again (already in session)
5. ✅ File decrypts immediately
```

### 4️⃣ Test Logout Clears Key
```
1. With key loaded, click "Logout"
2. Sign back in
3. Try to decrypt a file
4. ✅ Should prompt for private key again
5. ✅ Dashboard shows "Key Not Loaded"
```

### 5️⃣ Test Browser Close Clears Key
```
1. Load private key
2. Close browser completely
3. Reopen and sign in
4. Try to decrypt file
5. ✅ Should prompt for private key
```

### 6️⃣ Test Sending Files (No Key Required)
```
1. Go to "Send Files"
2. Enter receiver email
3. Select a file
4. ✅ Should work WITHOUT needing private key
5. ✅ Only public keys are needed for sending
```

### 7️⃣ Test Invalid Key Format
```
1. Try to decrypt a file
2. Paste invalid JSON: { "wrong": "format" }
3. ✅ Should show error: "Invalid private key format"
```

### 8️⃣ Test File Upload
```
1. Try to decrypt a file
2. Upload the private key JSON file
3. ✅ Should auto-populate the textarea
4. ✅ Click "Load Private Key" should work
```

---

## File Structure Changes

### New Files:
- `ui/src/components/PrivateKeyManager.tsx` - UI for loading private keys
- `PRIVATE_KEY_SECURITY_UPDATE.md` - Technical documentation
- `USER_GUIDE_PRIVATE_KEYS.md` - User-facing guide

### Modified Files:
- `ui/src/lib/keyStorage.ts` - Session-based private key storage
- `ui/src/components/Login.tsx` - Downloads private key on signup
- `ui/src/components/ReceiveFiles.tsx` - Prompts for key when needed
- `ui/src/components/Dashboard.tsx` - Shows key status indicator
- `ui/src/contexts/AuthContext.tsx` - Updated key checking logic

---

## Key Functions

### Session Storage:
```typescript
storePrivateKeyInSession(privateKeys) // Store in memory
getPrivateKeysFromSession() // Retrieve from memory
hasPrivateKeysInSession() // Check if loaded
clearPrivateKeysFromSession() // Clear from memory
```

### Persistent Storage:
```typescript
storeKeys(keys) // Store PUBLIC keys only
hasPublicKeys() // Check if user has done signup
```

---

## Development Commands

```bash
# Start the UI (if not already running)
cd ui
bun install
bun run dev

# Start backend (if not already running)
cd backend-hybrid
npm install
npm start
```

---

## Expected User Flow

### First Time:
```
Sign In → Keys Generated → Private Key Downloads → Dashboard
```

### Returning (Sending):
```
Sign In → Dashboard → Send Files → Works Immediately
```

### Returning (Receiving):
```
Sign In → Dashboard → Receive Files → Click Download
  → Load Private Key Screen → Upload Key → File Decrypts
```

---

## Security Verification Checklist

- [ ] Private key file contains both encryption and signing keys
- [ ] Private key NOT in IndexedDB (check DevTools → Application)
- [ ] Private key clears on logout
- [ ] Private key clears on browser close
- [ ] Can decrypt files after loading key
- [ ] Key persists within session (don't need to reload for each file)
- [ ] Key status indicator shows correct state
- [ ] Can send files without private key
- [ ] Public keys are persistent (sending doesn't require key)

---

## Migration Notes

⚠️ **For Existing Users**: 
If you already have users with private keys stored in IndexedDB, you need a migration plan:

### Option 1: Export Before Update
```typescript
// Run this before deploying the update
async function exportExistingKeys() {
  const keys = await getKeys(); // old function
  if (keys) {
    const blob = new Blob([JSON.stringify({
      encryptionPrivateKey: keys.encryptionPrivateKey,
      signingPrivateKey: keys.signingPrivateKey
    })], { type: 'application/json' });
    // Download for user
  }
}
```

### Option 2: Add Migration Screen
Show existing users a one-time screen to download their keys before clearing IndexedDB.

---

## Troubleshooting

### Keys not clearing on logout?
- Check that `clearPrivateKeysFromSession()` is called in logout
- Verify `sessionPrivateKeys = null` is executed

### File decryption fails?
- Check console for specific error
- Verify private key JSON has both required fields
- Ensure key format is valid base64

### Download not triggering?
- Check browser popup blocker settings
- Verify `authResult.isNewUser` is true
- Check console for errors

---

## Next Steps

1. ✅ All code is implemented
2. 🧪 Test the flows above
3. 📝 Update any user documentation
4. 🚀 Deploy to production
5. 📣 Notify users about the security enhancement

---

**Ready to test! 🎉**
