import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SendFile } from './SendFile';
import { ReceiveFiles } from './ReceiveFiles';
import { Button } from '@/components/ui/button';
import { hasPrivateKeysInSession, storeKeys } from '@/lib/keyStorage';
import { useSearchParams } from 'react-router-dom';
import { revokePublicKey } from '@/lib/api';
import { 
  generateKeyPair, 
  generateSigningKeyPair, 
  exportPublicKey, 
  exportPrivateKey 
} from '@/lib/crypto';

type View = 'dashboard' | 'send' | 'receive';

export function Dashboard() {
  const { logout, isLoadingKeys } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [searchParams] = useSearchParams();
  const [isRevokingKey, setIsRevokingKey] = useState(false);
  const hasPrivateKey = hasPrivateKeysInSession();

  // Handle key revocation - generates new keys, stores them, and updates server
  const handleRevokeKey = async () => {
    if (!confirm('⚠️ WARNING: Revoking your key will generate a new key pair.\n\nYour old private key will no longer work to decrypt files encrypted with your old public key.\n\nAre you sure you want to continue?')) {
      return;
    }

    setIsRevokingKey(true);
    try {
      // Generate new key pairs
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

      // Upload new public keys to server (revoke old ones)
      const combinedPublicKey = JSON.stringify({
        encryption: encryptionPublicKey,
        signing: signingPublicKey,
      });
      await revokePublicKey(combinedPublicKey);

      console.log('Keys revoked and new keys stored successfully');

      // Download new private keys as a file for the user
      const privateKeyData = {
        encryptionPrivateKey,
        signingPrivateKey,
        createdAt: new Date().toISOString(),
        warning: 'Keep this file safe! You will need it to decrypt files. Never share it with anyone.',
        note: 'This key was generated after revoking a previous key.',
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
      alert('🔐 KEY REVOKED SUCCESSFULLY!\n\nYour new private key has been downloaded.\n\nIMPORTANT: Store this file safely! Your old private key will no longer work.\n\nYou will need to upload this new key file to decrypt any new files sent to you.');
    } catch (error) {
      console.error('Failed to revoke key:', error);
      alert('Failed to revoke key. Please try again.');
    } finally {
      setIsRevokingKey(false);
    }
  };

  // Check for mode parameter from landing page
  useEffect(() => {
    // Reserved for future mode handling
  }, [searchParams]);

  // Show loading state while checking for keys
  if (isLoadingKeys) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh-blue noise">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'send') {
    return <SendFile onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'receive') {
    return <ReceiveFiles onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen gradient-mesh-blue noise relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] orb-blue animate-blob opacity-40" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] orb-cyan animate-blob opacity-30" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] orb-blue animate-float-slow opacity-20" />
        
        {/* Floating geometric shapes */}
        <div className="absolute top-32 right-1/4 w-20 h-20 border border-primary/15 rounded-2xl rotate-12 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-16 w-14 h-14 border border-accent/15 rounded-full animate-float" style={{ animationDelay: '2.5s' }} />
      </div>

      <header className="relative z-10 liquid-glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25 hover-shine">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gradient-blue">Fluxion</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Private Key Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors liquid-glass-subtle ${
              hasPrivateKey 
                ? 'text-green-600' 
                : 'text-amber-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${hasPrivateKey ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
              {hasPrivateKey ? 'Key Loaded' : 'Key Not Loaded'}
            </div>
            <Button 
              onClick={handleRevokeKey} 
              variant="ghost" 
              size="sm" 
              disabled={isRevokingKey}
              className="rounded-xl btn-glass transition-all text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
            >
              {isRevokingKey ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Revoking...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Revoke Key
                </>
              )}
            </Button>
            <Button onClick={logout} variant="ghost" size="sm" className="rounded-xl btn-glass transition-all">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full liquid-glass-subtle text-primary text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure & Encrypted
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Welcome to <span className="text-gradient-blue">Fluxion</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Send and receive files with military-grade encryption
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <button
            onClick={() => setCurrentView('send')}
            className="group liquid-glass-card p-8 rounded-3xl text-left hover-lift hover-glow transition-all duration-300 relative overflow-hidden"
          >
            {/* Noise overlay */}
            <div className="absolute inset-0 noise pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">Send Files</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Secure</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Encrypt and send files to verified recipients
              </p>
              <div className="mt-4 flex items-center text-primary font-medium text-sm">
                Start sending
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('receive')}
            className="group liquid-glass-card p-8 rounded-3xl text-left hover-lift hover-glow transition-all duration-300 relative overflow-hidden"
          >
            {/* Noise overlay */}
            <div className="absolute inset-0 noise pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/25 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xl font-semibold group-hover:text-cyan-500 transition-colors">Receive Files</h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 text-xs font-medium">Inbox</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                View and decrypt files sent to you
              </p>
              <div className="mt-4 flex items-center text-cyan-500 font-medium text-sm">
                View inbox
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Security info */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-8 liquid-glass px-8 py-4 rounded-2xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              AES-256-GCM Encryption
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Digital Signatures
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
