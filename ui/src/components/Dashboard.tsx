import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SendFile } from './SendFile';
import { ReceiveFiles } from './ReceiveFiles';
import { Button } from '@/components/ui/button';
import { hasPrivateKeysInSession } from '@/lib/keyStorage';

type View = 'dashboard' | 'send' | 'receive';

export function Dashboard() {
  const { logout, isLoadingKeys } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const hasPrivateKey = hasPrivateKeysInSession();

  // Show loading state while checking for keys
  if (isLoadingKeys) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
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
    <div className="min-h-screen gradient-mesh relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-ring" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-ring" style={{ animationDelay: '1s' }} />
      </div>

      <header className="relative z-10 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gradient">FLUXION</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Private Key Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              hasPrivateKey 
                ? 'bg-green-500/10 text-green-500' 
                : 'bg-amber-500/10 text-amber-500'
            }`}>
              <div className={`w-2 h-2 rounded-full ${hasPrivateKey ? 'bg-green-500' : 'bg-amber-500'}`} />
              {hasPrivateKey ? 'Key Loaded' : 'Key Not Loaded'}
            </div>
            <Button onClick={logout} variant="ghost" size="sm" className="rounded-xl hover:bg-white/10 transition-all">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Secure & Encrypted
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Welcome to <span className="text-gradient">Vortex</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Send and receive files with military-grade encryption
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <button
            onClick={() => setCurrentView('send')}
            className="group glass-card p-8 rounded-3xl text-left hover-lift hover-glow transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3 group-hover:text-primary transition-colors">Send Files</h3>
            <p className="text-muted-foreground leading-relaxed">
              Encrypt and send files to another user with end-to-end encryption
            </p>
            <div className="mt-6 flex items-center text-primary font-medium">
              Start sending
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('receive')}
            className="group glass-card p-8 rounded-3xl text-left hover-lift hover-glow transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold mb-3 group-hover:text-teal-500 transition-colors">Receive Files</h3>
            <p className="text-muted-foreground leading-relaxed">
              View and decrypt files that have been securely sent to you
            </p>
            <div className="mt-6 flex items-center text-teal-500 font-medium">
              View inbox
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>
        </div>

        {/* Security info */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-8 glass px-8 py-4 rounded-2xl">
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
