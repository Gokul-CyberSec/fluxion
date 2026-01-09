import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getInbox, downloadFile, InboxFile } from '@/lib/api';
import { getKeys, hasPrivateKeysInSession } from '@/lib/keyStorage';
import { PrivateKeyManager } from '@/components/PrivateKeyManager';
import {
  verifySignature,
  decryptAESKey,
  decryptFile,
  hashData,
  concatenateBuffers,
  base64ToArrayBuffer,
  importSigningPublicKey,
  importPrivateKey,
} from '@/lib/crypto';

interface ReceiveFilesProps {
  onBack: () => void;
}

type ReceiveState = 'list' | 'needKey' | 'downloading' | 'success' | 'error';

export function ReceiveFiles({ onBack }: ReceiveFilesProps) {
  const [state, setState] = useState<ReceiveState>('list');
  const [files, setFiles] = useState<InboxFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState<InboxFile | null>(null);

  useEffect(() => {
    fetchInbox();
  }, []);

  const fetchInbox = async () => {
    setLoading(true);
    setError('');
    try {
      const inboxFiles = await getInbox();
      setFiles(inboxFiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: InboxFile) => {
    // Check if private key is loaded in session
    if (!hasPrivateKeysInSession()) {
      setSelectedFile(file);
      setState('needKey');
      return;
    }

    setSelectedFile(file);
    setState('downloading');
    setError('');

    try {
      // Get local keys
      const keys = await getKeys();
      if (!keys) {
        throw new Error('Private key not loaded. Please load your private key first.');
      }

      setProgress('Downloading encrypted file...');
      const downloadedFile = await downloadFile(file.fileId);

      setProgress('Verifying sender signature...');
      // Parse sender's signing public key
      let senderSigningKey: string;
      try {
        const parsed = JSON.parse(downloadedFile.senderPublicKey);
        senderSigningKey = parsed.signing;
      } catch {
        senderSigningKey = downloadedFile.senderPublicKey;
      }

      // Import sender's signing public key
      const signingPublicKey = await importSigningPublicKey(senderSigningKey);

      // Get encrypted file as ArrayBuffer
      const encryptedFileBuffer = await downloadedFile.encryptedFile.arrayBuffer();
      const nonce = base64ToArrayBuffer(downloadedFile.nonce);
      const authTag = base64ToArrayBuffer(downloadedFile.authTag);

      // Recreate the data that was signed
      const dataToVerify = concatenateBuffers(
        encryptedFileBuffer,
        nonce,
        authTag
      );
      const hash = await hashData(dataToVerify);

      // Verify signature
      const signature = base64ToArrayBuffer(downloadedFile.signature);
      const isValid = await verifySignature(signature, hash, signingPublicKey);

      if (!isValid) {
        throw new Error('Signature verification failed - file may be tampered or not from claimed sender');
      }

      setProgress('Decrypting file...');
      // Decrypt AES key with receiver's private key
      const encryptedAESKey = base64ToArrayBuffer(downloadedFile.encryptedAESKey);
      const privateKey = await importPrivateKey(keys.encryptionPrivateKey);
      const aesKey = await decryptAESKey(encryptedAESKey, privateKey);

      // Combine ciphertext and auth tag for AES-GCM decryption
      const ciphertextWithTag = new Uint8Array(encryptedFileBuffer.byteLength + authTag.byteLength);
      ciphertextWithTag.set(new Uint8Array(encryptedFileBuffer), 0);
      ciphertextWithTag.set(new Uint8Array(authTag), encryptedFileBuffer.byteLength);

      // Decrypt file
      const decryptedBuffer = await decryptFile(
        ciphertextWithTag.buffer,
        aesKey,
        new Uint8Array(nonce)
      );

      setProgress('Saving file...');
      // Create blob and download
      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadedFile.fileName || file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState('success');
      setProgress('');
    } catch (err) {
      console.error('Download failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to download file');
      setState('error');
      setProgress('');
    }
  };

  const handleReset = () => {
    setState('list');
    setSelectedFile(null);
    setError('');
    setProgress('');
  };

  const handleKeyLoaded = () => {
    // Key has been loaded, attempt download again
    if (selectedFile) {
      handleDownload(selectedFile);
    } else {
      setState('list');
    }
  };

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Inbox</h1>
          </div>
          <Button onClick={onBack} variant="ghost" size="sm" className="rounded-xl hover:bg-white/10 transition-all">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {state === 'list' && (
          <div className="glass-card p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold">Your Files</h2>
                <p className="text-muted-foreground text-sm mt-1">Securely encrypted files sent to you</p>
              </div>
              <Button onClick={fetchInbox} variant="outline" size="sm" disabled={loading} className="rounded-xl">
                <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>

            {loading && (
              <div className="text-center py-16">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-muted-foreground">Loading your inbox...</p>
              </div>
            )}

            {!loading && error && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-destructive font-medium">{error}</p>
                <Button onClick={fetchInbox} variant="outline" className="mt-4 rounded-xl">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && files.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-1">Inbox Empty</h3>
                <p className="text-muted-foreground">No files have been sent to you yet</p>
              </div>
            )}

            {!loading && !error && files.length > 0 && (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.fileId}
                    className="group p-5 bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-teal-500/20 rounded-2xl flex justify-between items-center transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400/20 to-cyan-500/20 flex items-center justify-center group-hover:from-teal-400/30 group-hover:to-cyan-500/30 transition-colors">
                        <svg className="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold">{file.fileName}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {file.senderEmail || file.senderId}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => handleDownload(file)} size="sm" className="rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 transition-all">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {state === 'needKey' && (
          <div>
            <PrivateKeyManager onKeyLoaded={handleKeyLoaded} />
            <div className="mt-6 text-center">
              <Button onClick={() => setState('list')} variant="outline" className="rounded-xl">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {state === 'downloading' && (
          <div className="glass-card p-8 rounded-3xl">
            <div className="text-center space-y-6 py-8">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="font-medium">{progress}</p>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFile.fileName}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verifying signature & decrypting
              </div>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div className="glass-card p-8 rounded-3xl">
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-green-500/30 animate-float">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-green-500">Download Complete</h3>
                <p className="text-muted-foreground mt-2">
                  File decrypted and saved successfully
                </p>
              </div>
              <div className="p-4 bg-green-500/10 rounded-2xl space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Signature verified
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  File authentic & untampered
                </div>
              </div>
              <Button onClick={handleReset} className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-white shadow-lg shadow-teal-500/20">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Inbox
              </Button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="glass-card p-8 rounded-3xl">
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-red-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-destructive">Download Failed</h3>
                <p className="text-muted-foreground mt-2">{error}</p>
              </div>
              {error.includes('Signature') && (
                <div className="p-4 bg-amber-500/10 rounded-2xl text-sm text-amber-600 dark:text-amber-400">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Security warning: File integrity compromised
                  </div>
                </div>
              )}
              <Button onClick={handleReset} className="w-full h-12 rounded-xl" variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Inbox
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
