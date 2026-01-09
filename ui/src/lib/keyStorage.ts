// Secure browser-based key storage
// Public keys stored in IndexedDB, private keys stored in session memory only

const DB_NAME = 'vortex-keys';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

interface StoredKeys {
  encryptionPublicKey: string;
  encryptionPrivateKey: string;
  signingPublicKey: string;
  signingPrivateKey: string;
}

interface PrivateKeys {
  encryptionPrivateKey: string;
  signingPrivateKey: string;
}

// Session-only private key storage (not persisted)
let sessionPrivateKeys: PrivateKeys | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function storeKeys(keys: StoredKeys): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Only store public keys in IndexedDB
    store.put(keys.encryptionPublicKey, 'encryptionPublicKey');
    store.put(keys.signingPublicKey, 'signingPublicKey');
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Store private keys in session memory only (not persisted)
export function storePrivateKeyInSession(privateKeys: PrivateKeys): Promise<void> {
  sessionPrivateKeys = privateKeys;
  return Promise.resolve();
}

// Get private keys from session memory
export function getPrivateKeysFromSession(): PrivateKeys | null {
  return sessionPrivateKeys;
}

// Clear private keys from session
export function clearPrivateKeysFromSession(): void {
  sessionPrivateKeys = null;
}

// Check if private keys exist in session
export function hasPrivateKeysInSession(): boolean {
  return sessionPrivateKeys !== null;
}

export async function getKeys(): Promise<StoredKeys | null> {
  // Get public keys from IndexedDB
  const db = await openDB();
  const publicKeys = await new Promise<{ encryptionPublicKey?: string; signingPublicKey?: string }>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const keys: { encryptionPublicKey?: string; signingPublicKey?: string } = {};
    
    const encPubRequest = store.get('encryptionPublicKey');
    const sigPubRequest = store.get('signingPublicKey');
    
    transaction.oncomplete = () => {
      keys.encryptionPublicKey = encPubRequest.result;
      keys.signingPublicKey = sigPubRequest.result;
      resolve(keys);
    };
    
    transaction.onerror = () => reject(transaction.error);
  });

  // Get private keys from session
  const privateKeys = getPrivateKeysFromSession();

  if (!publicKeys.encryptionPublicKey || !publicKeys.signingPublicKey || !privateKeys) {
    return null;
  }

  return {
    encryptionPublicKey: publicKeys.encryptionPublicKey,
    encryptionPrivateKey: privateKeys.encryptionPrivateKey,
    signingPublicKey: publicKeys.signingPublicKey,
    signingPrivateKey: privateKeys.signingPrivateKey,
  };
}

export async function clearKeys(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  
  // Also clear session private keys
  clearPrivateKeysFromSession();
}

export async function hasKeys(): Promise<boolean> {
  const keys = await getKeys();
  return keys !== null;
}

// Check if public keys exist (for determining if user has completed signup)
export async function hasPublicKeys(): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const encPubRequest = store.get('encryptionPublicKey');
    const sigPubRequest = store.get('signingPublicKey');
    
    transaction.oncomplete = () => {
      resolve(!!encPubRequest.result && !!sigPubRequest.result);
    };
    
    transaction.onerror = () => reject(transaction.error);
  });
}
