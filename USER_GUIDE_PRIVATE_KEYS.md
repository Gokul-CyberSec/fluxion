# 🔐 Vortex Private Key Guide

## What Changed?

Your **private key is no longer stored in your browser**. This significantly enhances security by giving you full control of your encryption keys.

---

## For New Users (First Signup)

### What Happens:
1. ✅ Sign in with Google
2. 🔑 System generates your encryption keys
3. 💾 **A JSON file will automatically download** - this is your private key
4. ⚠️ **SAVE THIS FILE SAFELY** - you'll need it to decrypt files

### Important:
- This is the **ONLY time** you'll receive this key
- Store it in a secure location (password manager, encrypted drive, etc.)
- **Never share it** with anyone
- If you lose it, you won't be able to decrypt files sent to you

---

## For Returning Users (Decrypting Files)

### To Decrypt a File:
1. 📥 Go to "Receive Files"
2. 📂 Click "Download" on any file
3. 🔓 You'll be prompted to load your private key
4. 📁 Upload your private key JSON file OR paste the JSON content
5. ✅ File will decrypt and download

### Key Points:
- You'll need to provide your key **once per session**
- The key is stored in memory only (not saved to disk)
- When you close the browser or logout, the key is cleared
- Next session, you'll need to load it again

---

## Security Benefits

✅ **Zero Browser Storage**: Private keys never stored in IndexedDB/LocalStorage  
✅ **Session-Only**: Keys cleared automatically when you close the browser  
✅ **Physical Control**: You have the file, you control access  
✅ **Audit Trail**: You know exactly when and where your key is used  
✅ **Compromise Resistant**: Even if your browser is hacked, keys aren't persisted  

---

## Private Key File Format

Your private key file looks like this:

```json
{
  "encryptionPrivateKey": "MIIEvgIBADANBgkqhki...",
  "signingPrivateKey": "MIIEvQIBADANBgkqhki...",
  "createdAt": "2026-01-09T12:34:56.789Z",
  "warning": "Keep this file safe! You will need it to decrypt files. Never share it with anyone."
}
```

---

## FAQ

### Q: Where should I store my private key?
**A:** Best practices:
- Password manager (1Password, Bitwarden, etc.)
- Encrypted USB drive
- Encrypted cloud storage (with strong password)
- Physical safe (printed backup)

### Q: What if I lose my private key?
**A:** You will **permanently lose access** to any encrypted files. There is no recovery mechanism (by design - this is what makes it truly secure).

### Q: Can I have multiple devices?
**A:** Yes! Copy your private key file to each device. When you want to decrypt files on that device, upload the key file.

### Q: Is it safe to copy my private key?
**A:** Yes, but store each copy securely. The more copies you make, the more important it is to secure each location.

### Q: What happens when I logout?
**A:** Your private key is cleared from memory. You'll need to load it again next time you want to decrypt files.

### Q: Do I need the key to send files?
**A:** No! You only need your private key to **decrypt files sent TO you**. Sending files only requires being logged in.

---

## Key Status Indicator

Look at the top-right corner of your dashboard:

- 🟢 **Key Loaded** - You can decrypt files  
- 🟡 **Key Not Loaded** - You'll be prompted when trying to decrypt

---

## Troubleshooting

### "Invalid private key format"
- Make sure you're uploading the correct JSON file
- Check that the file wasn't corrupted
- Ensure you have both `encryptionPrivateKey` and `signingPrivateKey` fields

### "Private key not found"
- You need to load your private key file first
- Click on any file to decrypt, and you'll see the key upload screen

### "Signature verification failed"
- This means the file was tampered with or corrupted
- Do NOT use the file - contact the sender

---

## Best Practices

1. 🔒 **Backup your key** immediately after download
2. 🔐 **Encrypt your backup** with a strong password
3. 🚫 **Never email** your private key
4. 📱 **Use secure transfer** methods if moving between devices
5. 🗑️ **Secure delete** old keys if you regenerate them
6. 💾 **Multiple backups** in different secure locations

---

## Need Help?

If you have questions or need assistance:
- Check the console for detailed error messages
- Ensure your private key file is valid JSON
- Try re-downloading your key file backup

---

**Remember: Your security is in your hands! 🛡️**
