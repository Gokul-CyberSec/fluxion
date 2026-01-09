import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authGoogle, uploadPublicKey } from '@/lib/api';
import { 
  generateKeyPair, 
  generateSigningKeyPair, 
  exportPublicKey, 
  exportPrivateKey 
} from '@/lib/crypto';
import { storeKeys, hasKeys } from '@/lib/keyStorage';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, config: {
            theme: string;
            size: string;
            width: number;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function Login() {
  const { login, setHasKeyPair } = useAuth();

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    try {
      // Authenticate with backend
      const authResult = await authGoogle(response.credential);
      login(authResult.token);

      // Check if this is a new user (needs key generation)
      if (authResult.isNewUser) {
        // Generate key pairs
        const encryptionKeyPair = await generateKeyPair();
        const signingKeyPair = await generateSigningKeyPair();

        // Export keys
        const encryptionPublicKey = await exportPublicKey(encryptionKeyPair.publicKey);
        const encryptionPrivateKey = await exportPrivateKey(encryptionKeyPair.privateKey);
        const signingPublicKey = await exportPublicKey(signingKeyPair.publicKey);
        const signingPrivateKey = await exportPrivateKey(signingKeyPair.privateKey);

        // Store only public keys locally (in IndexedDB)
        await storeKeys({
          encryptionPublicKey,
          encryptionPrivateKey: '', // Not stored
          signingPublicKey,
          signingPrivateKey: '', // Not stored
        });

        // Upload public keys to server
        const combinedPublicKey = JSON.stringify({
          encryption: encryptionPublicKey,
          signing: signingPublicKey,
        });
        await uploadPublicKey(combinedPublicKey);

        console.log('Keys stored successfully, updating state...');
        
        // Update state before download so UI updates
        setHasKeyPair(true);

        // Download private keys as a file for the user
        const privateKeyData = {
          encryptionPrivateKey,
          signingPrivateKey,
          createdAt: new Date().toISOString(),
          warning: 'Keep this file safe! You will need it to decrypt files. Never share it with anyone.',
        };

        const blob = new Blob([JSON.stringify(privateKeyData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fluxion-private-key-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show alert to user after download
        alert('🔐 IMPORTANT: Your private key has been downloaded.\n\nThis is the ONLY time you will receive this key. Store it safely!\n\nYou will need to upload this key file each time you want to decrypt files.');
      } else {
        // Existing user - check if keys exist locally
        const keysExist = await hasKeys();
        setHasKeyPair(keysExist);
        
        if (!keysExist) {
          console.warn('Existing user but no local keys found. User may need to recover keys.');
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please try again.');
    }
  }, [login, setHasKeyPair]);

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });

        const buttonDiv = document.getElementById('google-signin-button');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            width: 280,
          });
        }
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [handleCredentialResponse]);

  return (
    <div className="min-h-screen flex items-center justify-center gradient-mesh relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-ring" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse-ring" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Main card */}
        <div className="glass-card rounded-3xl p-10 hover-lift">
          {/* Logo and branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-6 shadow-lg shadow-primary/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2">Vortex</h1>
            <p className="text-muted-foreground">
              Zero-Trust Encrypted File Sharing
            </p>
          </div>
          
          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              E2E Encrypted
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              AES-256-GCM
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            {GOOGLE_CLIENT_ID ? (
              <div className="w-full">
                <div id="google-signin-button" className="flex justify-center"></div>
              </div>
            ) : (
              <div className="text-center p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium mb-1">
                  Google Client ID not configured
                </p>
                <p className="text-xs text-muted-foreground">
                  Set VITE_GOOGLE_CLIENT_ID environment variable
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-border/50">
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                End-to-end encrypted
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Zero-trust security
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
