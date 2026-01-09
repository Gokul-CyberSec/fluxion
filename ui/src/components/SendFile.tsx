import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getReceiverPublicKey, sendFile } from '@/lib/api';
import { getKeys, hasPrivateKeysInSession } from '@/lib/keyStorage';
import { PrivateKeyManager } from '@/components/PrivateKeyManager';
import {
  generateAESKey,
  generateNonce,
  encryptFile,
  encryptAESKey,
  signData,
  hashData,
  concatenateBuffers,
  arrayBufferToBase64,
  importPublicKey,
  importSigningPrivateKey,
} from '@/lib/crypto';

interface SendFileProps {
  onBack: () => void;
}

type SendState = 'lookup' | 'select' | 'needKey' | 'sending' | 'success' | 'error';

export function SendFile({ onBack }: SendFileProps) {
  const [state, setState] = useState<SendState>('lookup');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverData, setReceiverData] = useState<{ userId: string; publicKey: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLookupReceiver = async () => {
    if (!receiverEmail.trim()) {
      setError('Please enter receiver email');
      return;
    }

    setError('');
    setProgress('Looking up receiver...');

    try {
      const data = await getReceiverPublicKey(receiverEmail.trim());
      setReceiverData(data);
      setState('select');
      setProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User not found');
      setProgress('');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSend = async () => {
    if (!selectedFile || !receiverData) return;

    // Check if private key is loaded in session
    if (!hasPrivateKeysInSession()) {
      setState('needKey');
      return;
    }

    setState('sending');
    setError('');

    try {
      // Get local keys
      const keys = await getKeys();
      if (!keys) {
        throw new Error('Private key not loaded. Please load your private key first.');
      }

      setProgress('Reading file...');
      const fileBuffer = await selectedFile.arrayBuffer();

      setProgress('Generating encryption key...');
      // Generate AES key and nonce
      const aesKey = await generateAESKey();
      const nonce = generateNonce();

      setProgress('Encrypting file...');
      // Encrypt file with AES-256-GCM
      const encryptedFileBuffer = await encryptFile(fileBuffer, aesKey, nonce);

      // AES-GCM produces ciphertext + auth tag appended
      // Auth tag is last 16 bytes
      const encryptedFile = new Uint8Array(encryptedFileBuffer);
      const authTagLength = 16;
      const ciphertext = encryptedFile.slice(0, encryptedFile.length - authTagLength);
      const authTag = encryptedFile.slice(encryptedFile.length - authTagLength);

      setProgress('Encrypting key for receiver...');
      // Parse receiver's public key (it's stored as JSON with encryption and signing keys)
      let receiverEncryptionKey: string;
      try {
        const parsed = JSON.parse(receiverData.publicKey);
        receiverEncryptionKey = parsed.encryption;
      } catch {
        // Fallback: use the key directly if not JSON
        receiverEncryptionKey = receiverData.publicKey;
      }

      // Import receiver's public key and encrypt AES key
      const receiverPublicKey = await importPublicKey(receiverEncryptionKey);
      const encryptedAESKey = await encryptAESKey(aesKey, receiverPublicKey);

      setProgress('Creating digital signature...');
      // Create hash of encrypted data + metadata for signing
      const dataToSign = concatenateBuffers(
        ciphertext.buffer as ArrayBuffer,
        nonce.buffer as ArrayBuffer,
        authTag.buffer as ArrayBuffer
      );
      const hash = await hashData(dataToSign);

      // Sign the hash with sender's private signing key
      const signingPrivateKey = await importSigningPrivateKey(keys.signingPrivateKey);
      const signature = await signData(hash, signingPrivateKey);

      setProgress('Uploading encrypted file...');
      // Send to server
      const result = await sendFile({
        receiverId: receiverData.userId,
        encryptedAESKey: arrayBufferToBase64(encryptedAESKey),
        nonce: arrayBufferToBase64(nonce.buffer as ArrayBuffer),
        authTag: arrayBufferToBase64(authTag.buffer as ArrayBuffer),
        signature: arrayBufferToBase64(signature),
        senderPublicKey: keys.signingPublicKey,
        file: new Blob([ciphertext]),
        fileName: selectedFile.name,
      });

      console.log('File sent:', result);
      setState('success');
      setProgress('');
    } catch (err) {
      console.error('Send failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to send file');
      setState('error');
      setProgress('');
    }
  };

  const handleReset = () => {
    setState('lookup');
    setReceiverEmail('');
    setReceiverData(null);
    setSelectedFile(null);
    setError('');
    setProgress('');
  };

  const handleKeyLoaded = () => {
    // Key has been loaded, go back to select state to send
    setState('select');
  };

  return (
    <div className="min-h-screen gradient-mesh-blue noise relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[450px] h-[450px] orb-blue animate-blob opacity-40" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] orb-cyan animate-blob opacity-30" style={{ animationDelay: '2s' }} />
        
        {/* Floating geometric shapes */}
        <div className="absolute top-32 left-20 w-16 h-16 border border-primary/15 rounded-2xl rotate-12 animate-float" />
        <div className="absolute bottom-40 right-16 w-12 h-12 border border-accent/15 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <header className="relative z-10 liquid-glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25 hover-shine">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gradient-blue">Send File</h1>
          </div>
          <Button onClick={onBack} variant="ghost" size="sm" className="rounded-xl btn-glass transition-all">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-6 py-12">
        <div className="liquid-glass-card p-8 rounded-3xl relative overflow-hidden">
          {/* Noise overlay */}
          <div className="absolute inset-0 noise pointer-events-none" />
          
          <div className="relative z-10">
          {state === 'lookup' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Find Recipient</h2>
                <p className="text-muted-foreground text-sm mt-1">Enter the email of who you want to send to</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  Receiver Email
                </label>
                <Input
                  type="email"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  placeholder="receiver@email.com"
                  className="h-12 rounded-xl liquid-glass-subtle border-0 focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <Button 
                onClick={handleLookupReceiver} 
                className="w-full h-12 rounded-xl btn-liquid text-white font-medium"
                disabled={!!progress}
              >
                {progress ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {progress}
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Look Up Receiver
                  </>
                )}
              </Button>
            </div>
          )}

          {state === 'select' && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4 ring-glow">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold">Recipient Found</h2>
              </div>

              <div className="p-4 liquid-glass-subtle rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-medium text-sm shadow-lg shadow-primary/25">
                  {receiverEmail.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{receiverEmail}</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Encryption key verified
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  Select File to Send
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative border-2 border-dashed border-primary/20 rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group liquid-glass-subtle"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl liquid-glass flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/10 transition-colors">
                    <svg className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Click to select a file</p>
                  <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                </div>
              </div>

              {selectedFile && (
                <div className="p-4 liquid-glass-blue rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)} 
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={handleReset} variant="outline" className="flex-1 h-12 rounded-xl btn-glass">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSend} 
                  className="flex-1 h-12 rounded-xl btn-liquid text-white"
                  disabled={!selectedFile}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Encrypt & Send
                </Button>
              </div>
            </div>
          )}
          {state === 'needKey' && (
            <div>
              <PrivateKeyManager onKeyLoaded={handleKeyLoaded} />
              <div className="mt-6 flex gap-3">
                <Button onClick={() => setState('select')} variant="outline" className="flex-1 rounded-xl btn-glass">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </Button>
              </div>
            </div>
          )}
        {state === 'sending' && (
          <div className="text-center space-y-6 py-8">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              <div className="absolute inset-3 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="font-medium">{progress}</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait while we secure your file</p>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30 animate-float">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-green-500">File Sent!</h3>
              <p className="text-muted-foreground mt-2">
                Your file has been encrypted and sent securely
              </p>
            </div>
            <div className="p-4 liquid-glass-subtle rounded-2xl text-sm text-green-600 dark:text-green-400">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                End-to-end encrypted with AES-256-GCM
              </div>
            </div>
            <Button onClick={handleReset} className="w-full h-12 rounded-xl btn-liquid text-white">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Send Another File
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center space-y-6 py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-destructive">Failed to Send</h3>
              <p className="text-muted-foreground mt-2">{error}</p>
            </div>
            <Button onClick={handleReset} className="w-full h-12 rounded-xl btn-glass">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </Button>
          </div>
        )}
        </div>
        </div>
      </main>
    </div>
  );
}
