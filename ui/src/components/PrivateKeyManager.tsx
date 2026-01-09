import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { storePrivateKeyInSession } from '@/lib/keyStorage';

interface PrivateKeyManagerProps {
  onKeyLoaded: () => void;
}

export function PrivateKeyManager({ onKeyLoaded }: PrivateKeyManagerProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const keyData = JSON.parse(text);
      
      if (!keyData.encryptionPrivateKey || !keyData.signingPrivateKey) {
        throw new Error('Invalid private key file format');
      }

      setPrivateKey(JSON.stringify(keyData, null, 2));
      setError('');
    } catch (err) {
      setError('Failed to read private key file. Please ensure it\'s a valid  private key file.');
      console.error('File upload error:', err);
    }
  };

  const handleLoadKey = async () => {
    if (!privateKey.trim()) {
      setError('Please paste or upload your private key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const keyData = JSON.parse(privateKey);
      
      if (!keyData.encryptionPrivateKey || !keyData.signingPrivateKey) {
        throw new Error('Invalid private key format. Required fields: encryptionPrivateKey, signingPrivateKey');
      }

      // Store in session memory (not persisted to disk/IndexedDB)
      await storePrivateKeyInSession({
        encryptionPrivateKey: keyData.encryptionPrivateKey,
        signingPrivateKey: keyData.signingPrivateKey,
      });

      onKeyLoaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load private key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="liquid-glass-card p-8 rounded-3xl max-w-2xl mx-auto relative overflow-hidden">
      {/* Noise overlay */}
      <div className="absolute inset-0 noise pointer-events-none" />
      
      <div className="relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gradient-blue">Load Private Key</h2>
          <p className="text-muted-foreground">
            To decrypt files, you need to provide your private key.
            Your key is only stored in memory for this session.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3 text-muted-foreground">
              Upload Private Key File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 text-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer group liquid-glass-subtle">
                <div className="w-12 h-12 rounded-xl liquid-glass-subtle flex items-center justify-center mx-auto mb-3 group-hover:bg-cyan-500/20 transition-colors">
                  <svg className="w-6 h-6 text-muted-foreground group-hover:text-cyan-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-medium">Click to upload private key file</p>
                <p className="text-xs text-muted-foreground mt-1">JSON file downloaded during signup</p>
              </div>
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center">
              <div className="flex-1 border-t border-white/20"></div>
              <span className="px-4 text-xs text-muted-foreground liquid-glass-subtle rounded-full py-1">OR</span>
              <div className="flex-1 border-t border-white/20"></div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-muted-foreground">
              Paste Private Key JSON
            </label>
            <Textarea
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder='{"encryptionPrivateKey": "...", "signingPrivateKey": "..."}'
              rows={8}
              className="font-mono text-xs rounded-xl liquid-glass-subtle border-white/10 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>{error}</p>
            </div>
          )}

          <div className="liquid-glass-blue rounded-xl p-4 border border-cyan-500/20">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium mb-1 text-cyan-600 dark:text-cyan-400">Security Note</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Your private key is stored in memory only for this session and will be cleared when you close the browser or logout. Never share your private key with anyone.
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleLoadKey}
            disabled={loading || !privateKey.trim()}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/35 transition-all"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading Key...
              </div>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Load Private Key
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
