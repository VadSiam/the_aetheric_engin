// AI-Assisted
'use client';

import { AlertTriangle, Clock, Shield, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

interface TcpStats {
  isConnected: boolean;
  isAuthenticated: boolean;
  messagesReceived: number;
  asciiMessages: number;
  binaryMessages: number;
  errors: string[];
  startTime?: string;
  endTime?: string;
  bufferSize: number;
}

interface ClientEventData {
  message?: string;
  error?: string;
  connectionId?: string;
  bufferSize?: number;
  messageType?: 'ascii' | 'binary';
  messageCount?: number;
  status?: {
    connected: boolean;
    authenticated: boolean;
  };
}

interface ClientStatus {
  isRunning: boolean;
  stats: TcpStats | null;
  events: Array<{ timestamp: string; event: string; data?: ClientEventData }>;
}

interface ConnectionStatusProps {
  status: ClientStatus;
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  const { isRunning, stats } = status;

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);
    return `${diffMinutes}m ${diffSeconds}s`;
  };

  return (
    <div className="space-y-4">
      {/* Engine Status */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-blue-800">Engine Status:</span>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-700 font-bold">ACTIVE</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600 font-bold">DORMANT</span>
            </>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-blue-800">Aether Link:</span>
        <div className="flex items-center gap-2">
          {stats?.isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-bold">CONNECTED</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-600" />
              <span className="text-red-600 font-bold">DISCONNECTED</span>
            </>
          )}
        </div>
      </div>

      {/* Authentication Status */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-blue-800">Dream Keys:</span>
        <div className="flex items-center gap-2">
          {stats?.isAuthenticated ? (
            <>
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-green-700 font-bold">AUTHENTICATED</span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-amber-600 font-bold">PENDING</span>
            </>
          )}
        </div>
      </div>

      {/* Runtime Duration */}
      {stats?.startTime && (
        <div className="flex items-center justify-between">
          <span className="font-medium text-blue-800">Engine Uptime:</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700 font-bold">
              {formatDuration(stats.startTime)}
            </span>
          </div>
        </div>
      )}

      {/* System Error Count */}
      {stats && stats.errors.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="font-medium text-blue-800">System Errors:</span>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-red-600 font-bold">{stats.errors.length}</span>
          </div>
        </div>
      )}


      {/* Recent System Errors */}
      {stats && stats.errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-300 rounded-r-lg">
          <h4 className="font-bold text-red-800 mb-2">System Errors:</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {stats.errors.slice(-3).map((error, index) => (
              <div key={index} className="text-sm text-red-700 p-2 bg-red-100 rounded">
                {error}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Connection Info */}
      {!isRunning && (
        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-300 rounded-r-lg">
          <p className="text-sm text-blue-700 italic">
            The Aetheric Engine slumbers in the brass chambers of Oshikai,
            waiting for the dreams of the curious to awaken its mystical powers...
          </p>
        </div>
      )}
    </div>
  );
}