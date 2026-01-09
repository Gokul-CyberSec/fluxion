import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Peer, { DataConnection } from 'peerjs';

interface TemporaryShareProps {
  onBack: () => void;
}

type Role = 'sender' | 'receiver' | null;
type StatusType = 'info' | 'success' | 'error' | 'warning' | '';

interface Status {
  type: StatusType;
  message: string;
}

interface FileData {
  dataType: 'FILE';
  file: Blob;
  fileName: string;
  fileType: string;
}

export function TemporaryShare({ onBack }: TemporaryShareProps) {
  // State
  const [role, setRole] = useState<Role>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerStarted, setIsPeerStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ type: '', message: '' });
  const [progress, setProgress] = useState(0);
  const [connections, setConnections] = useState<string[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');

  // Refs
  const peerRef = useRef<Peer | null>(null);
  const connectionMapRef = useRef<Map<string, DataConnection>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up peer on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  // Start peer session
  const startPeerSession = useCallback(async () => {
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Starting peer session...' });

    try {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('My Peer ID:', id);
        setPeerId(id);
        setIsPeerStarted(true);
        setIsLoading(false);
        setStatus({ type: 'success', message: 'Session started! Share your ID with the receiver.' });
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        setStatus({ type: 'error', message: `Error: ${err.message}` });
        setIsLoading(false);
      });

      // Handle incoming connections
      peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        handleNewConnection(conn);
      });

    } catch (err) {
      console.error('Failed to start peer:', err);
      setStatus({ type: 'error', message: 'Failed to start peer session' });
      setIsLoading(false);
    }
  }, []);

  // Handle new connection (both incoming and outgoing)
  const handleNewConnection = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      console.log('Connection opened with:', conn.peer);
      connectionMapRef.current.set(conn.peer, conn);
      setConnections(prev => [...prev, conn.peer]);
      setIsConnected(true);
      setStatus({ type: 'success', message: `Connected to ${conn.peer.substring(0, 8)}...` });

      // Auto-select first connection
      if (!selectedConnection) {
        setSelectedConnection(conn.peer);
      }
    });

    conn.on('data', (data) => {
      console.log('Received data from:', conn.peer);
      handleReceiveData(data as FileData);
    });

    conn.on('close', () => {
      console.log('Connection closed:', conn.peer);
      connectionMapRef.current.delete(conn.peer);
      setConnections(prev => prev.filter(id => id !== conn.peer));
      if (connectionMapRef.current.size === 0) {
        setIsConnected(false);
        setSelectedConnection('');
      }
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      setStatus({ type: 'error', message: `Connection error: ${err.message}` });
    });
  }, [selectedConnection]);

  // Connect to another peer
  const connectToPeer = useCallback(async () => {
    if (!peerRef.current) {
      setStatus({ type: 'error', message: 'Please start your session first' });
      return;
    }

    if (!remotePeerId.trim()) {
      setStatus({ type: 'warning', message: 'Please enter a Peer ID' });
      return;
    }

    if (connectionMapRef.current.has(remotePeerId)) {
      setStatus({ type: 'warning', message: 'Already connected to this peer' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'info', message: 'Connecting...' });

    try {
      const conn = peerRef.current.connect(remotePeerId, { reliable: true });
      
      if (!conn) {
        throw new Error("Connection can't be established");
      }

      handleNewConnection(conn);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to connect:', err);
      setStatus({ type: 'error', message: 'Failed to connect to peer' });
      setIsLoading(false);
    }
  }, [remotePeerId, handleNewConnection]);

  // Handle receiving file data
  const handleReceiveData = useCallback((data: FileData) => {
    if (data.dataType === 'FILE' && data.file) {
      setStatus({ type: 'success', message: `Receiving: ${data.fileName}` });
      setProgress(100);

      // Download the file
      const blob = new Blob([data.file], { type: data.fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus({ type: 'success', message: `File "${data.fileName}" downloaded successfully!` });
      setTimeout(() => setProgress(0), 2000);
    }
  }, []);

  // Send file
  const sendFile = useCallback(async () => {
    if (!selectedFile) {
      setStatus({ type: 'warning', message: 'Please select a file first' });
      return;
    }

    if (!selectedConnection || !connectionMapRef.current.has(selectedConnection)) {
      setStatus({ type: 'warning', message: 'Please select a connection' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'info', message: 'Sending file...' });
    setProgress(10);

    try {
      const conn = connectionMapRef.current.get(selectedConnection);
      if (!conn) {
        throw new Error('Connection not found');
      }

      const blob = new Blob([selectedFile], { type: selectedFile.type });

      setProgress(50);

      conn.send({
        dataType: 'FILE',
        file: blob,
        fileName: selectedFile.name,
        fileType: selectedFile.type
      } as FileData);

      setProgress(100);
      setStatus({ type: 'success', message: 'File sent successfully!' });
      setIsLoading(false);
      
      setTimeout(() => setProgress(0), 2000);
    } catch (err) {
      console.error('Failed to send file:', err);
      setStatus({ type: 'error', message: 'Failed to send file' });
      setIsLoading(false);
      setProgress(0);
    }
  }, [selectedFile, selectedConnection]);

  // Stop peer session
  const stopSession = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    connectionMapRef.current.clear();
    setPeerId('');
    setIsPeerStarted(false);
    setIsConnected(false);
    setConnections([]);
    setSelectedConnection('');
    setStatus({ type: 'info', message: 'Session ended' });
  }, []);

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ type: 'success', message: 'Copied to clipboard!' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to copy' });
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus({ type: 'info', message: `Selected: ${file.name} (${formatFileSize(file.size)})` });
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Role Selection View
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="noise-texture" />
        
        <div className="liquid-glass rounded-3xl p-8 max-w-md w-full">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl liquid-glass-strong flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Quick Share</h1>
            <p className="text-gray-600">P2P File Transfer - No login required</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setRole('sender')}
              className="w-full p-4 rounded-xl liquid-glass-button hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800">Send Files</h3>
                  <p className="text-sm text-gray-500">Share files with others</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setRole('receiver')}
              className="w-full p-4 rounded-xl liquid-glass-button hover:bg-green-50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-800">Receive Files</h3>
                  <p className="text-sm text-gray-500">Get files from someone</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <p className="text-sm text-blue-700 text-center">
              <strong>Direct P2P transfer</strong> - Files go directly between devices, not through any server!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Transfer View
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="noise-texture" />
      
      <div className="liquid-glass rounded-3xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              stopSession();
              setRole(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            role === 'sender' 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-green-100 text-green-700'
          }`}>
            {role === 'sender' ? '📤 Sender' : '📥 Receiver'}
          </div>
        </div>

        {/* Status */}
        {status.message && (
          <div className={`mb-6 p-3 rounded-xl text-sm ${
            status.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            status.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            status.type === 'warning' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {status.message}
          </div>
        )}

        {/* Progress Bar */}
        {progress > 0 && (
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">{progress}%</p>
          </div>
        )}

        {/* Step 1: Start Session */}
        {!isPeerStarted ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl liquid-glass-strong flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Start Your Session</h2>
            <p className="text-gray-600 mb-6">
              {role === 'sender' 
                ? 'Start a session to get your unique ID for sharing'
                : 'Start a session to connect with the sender'
              }
            </p>
            <Button
              onClick={startPeerSession}
              disabled={isLoading}
              className="w-full py-6 text-lg rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Starting...
                </span>
              ) : (
                'Start Session'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Your ID */}
            <div className="p-4 rounded-xl liquid-glass-strong">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Peer ID</label>
              <div className="flex gap-2">
                <Input
                  value={peerId}
                  readOnly
                  className="flex-1 font-mono text-sm bg-white/50"
                />
                <Button
                  onClick={() => copyToClipboard(peerId)}
                  variant="outline"
                  className="px-4"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {role === 'sender' ? 'Share this ID with the receiver' : 'Share this ID with the sender'}
              </p>
            </div>

            {/* Connect to Peer */}
            <div className="p-4 rounded-xl liquid-glass-strong">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connect to {role === 'sender' ? 'Receiver' : 'Sender'}
              </label>
              <div className="flex gap-2">
                <Input
                  value={remotePeerId}
                  onChange={(e) => setRemotePeerId(e.target.value)}
                  placeholder="Enter Peer ID"
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  onClick={connectToPeer}
                  disabled={isLoading || !remotePeerId.trim()}
                  className="px-6"
                >
                  Connect
                </Button>
              </div>
            </div>

            {/* Connected Peers */}
            {connections.length > 0 && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <label className="block text-sm font-medium text-green-700 mb-2">
                  Connected Peers ({connections.length})
                </label>
                <div className="space-y-2">
                  {connections.map((connId) => (
                    <div
                      key={connId}
                      onClick={() => setSelectedConnection(connId)}
                      className={`p-2 rounded-lg cursor-pointer transition-all ${
                        selectedConnection === connId
                          ? 'bg-green-200 border-2 border-green-400'
                          : 'bg-white/50 hover:bg-green-100'
                      }`}
                    >
                      <span className="font-mono text-sm">{connId}</span>
                      {selectedConnection === connId && (
                        <span className="ml-2 text-xs text-green-600">✓ Selected</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Selection & Send (for sender) */}
            {role === 'sender' && isConnected && (
              <div className="p-4 rounded-xl liquid-glass-strong">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select File to Send</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex-1"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Choose File
                  </Button>
                </div>
                {selectedFile && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
                    <p className="text-sm font-medium text-blue-800">{selectedFile.name}</p>
                    <p className="text-xs text-blue-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                )}
                <Button
                  onClick={sendFile}
                  disabled={!selectedFile || isLoading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {isLoading ? 'Sending...' : 'Send File'}
                </Button>
              </div>
            )}

            {/* Waiting for files (for receiver) */}
            {role === 'receiver' && isConnected && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                <svg className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <p className="text-green-700 font-medium">Ready to receive files!</p>
                <p className="text-sm text-green-600">Files will be downloaded automatically</p>
              </div>
            )}

            {/* Stop Session */}
            <Button
              onClick={stopSession}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
            >
              Stop Session
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 rounded-xl bg-gray-50/50 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">How it works:</h4>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Both users click "Start Session"</li>
            <li>Share your Peer ID with the other person</li>
            <li>Enter their Peer ID and click "Connect"</li>
            <li>Sender selects a file and clicks "Send"</li>
            <li>Receiver's file downloads automatically</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default TemporaryShare;
