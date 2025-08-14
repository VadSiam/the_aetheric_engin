// AI-Assisted
'use client';

import { aethericDecoder } from '@/lib/client-decoder';
import { Activity, Cpu, Database, Gauge, Play, Settings, Square, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConnectionStatus from './ConnectionStatus';
import DecoderResults from './DecoderResults';
import MessageTable from './MessageTable';

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

interface ClientEvent {
  timestamp: string;
  event: string;
  data?: ClientEventData;
}

interface ClientStatus {
  isRunning: boolean;
  stats: TcpStats | null;
  events: ClientEvent[];
}

interface EthereumAddressData {
  address: string;
  messageId: number;
  timestamp: string;
}

interface DecoderResults {
  ethereumAddresses: EthereumAddressData[];
  seedPhrases: string[];
  bip39Words: Array<{
    word: string;
    timestamp: string;
    messageId: number;
    position: number;
  }>;
  technicalSummary: string;
}

export default function Dashboard() {
  const [status, setStatus] = useState<ClientStatus>({ isRunning: false, stats: null, events: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [decoderResults, setDecoderResults] = useState<DecoderResults | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  useEffect(() => {
    fetchStatus();

    // Smart auto-refresh: only when enabled AND engine is running
    if (autoRefresh && status.isRunning) {
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, status.isRunning]);

  // Auto-disable refresh when engine stops and trigger decoder if 600 messages reached
  useEffect(() => {
    if (autoRefresh && !status.isRunning && status.stats) {
      // Engine stopped, disable auto-refresh
      setAutoRefresh(false);

      // Auto-trigger decoder if we reached 600 messages
      if (status.stats.messagesReceived >= 600 && !decoderResults && !isDecoding) {
        console.log('Auto-triggering decoder after collecting 600 messages');
        runDecoder();
      }
    }
  }, [status.isRunning, autoRefresh, status.stats, decoderResults, isDecoding]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/tcp-client');
      const data = await response.json();

      if (response.ok) {
        setStatus(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch {
      setError('Network error while fetching status');
    }
  };

  const handleAction = async (action: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tcp-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (response.ok) {
        await fetchStatus();
      } else {
        setError(data.error || `Failed to ${action}`);
      }
    } catch {
      setError(`Network error during ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const runDecoder = async () => {
    if (isDecoding) return;

    setIsDecoding(true);
    setError(null);

    try {
      console.log('Running Aetheric Decoder...');
      const results = await aethericDecoder.decodeMessages();
      setDecoderResults(results);
      console.log('Decoder completed successfully:', results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown decoder error';
      setError(`Decoder failed: ${errorMsg}`);
      console.error('Decoder error:', error);
    } finally {
      setIsDecoding(false);
    }
  };

  const clearMessages = async () => {
    if (!confirm('Are you sure you want to clear all messages from the database?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/messages', { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        await fetchStatus();
        // Clear decoder results when messages are cleared
        setDecoderResults(null);
        // Trigger MessageTable refresh by updating the trigger
        setRefreshTrigger(prev => prev + 1);
      } else {
        setError(data.error || 'Failed to clear messages');
      }
    } catch {
      setError('Network error while clearing messages');
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = status.stats ?
    Math.min((status.stats.messagesReceived / 600) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 via-orange-200/20 to-red-200/20 blur-3xl"></div>
          <div className="relative">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-800 via-orange-800 to-red-800 mb-4">
              ⚙️ The Aetheric Engine ⚙️
            </h1>
            <p className="text-xl text-amber-700 max-w-4xl mx-auto leading-relaxed">
              In the smog-choked skies of Oshikai, the mystical contraption hums with ethereal energy,
              parsing dreams through crystal aether coils and brass machinery from the forgotten year 2000.
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-lg">
            <div className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              <strong>Engine Malfunction:</strong> {error}
            </div>
          </div>
        )}

        {/* Control Panel */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl shadow-2xl border-4 border-amber-300 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-800 to-orange-800 text-white p-4">
            <h2 className="text-2xl font-bold flex items-center">
              <Settings className="w-6 h-6 mr-2" />
              Engine Control Panel
            </h2>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap gap-4 items-center justify-center">
              <button
                onClick={() => handleAction('start')}
                disabled={loading || status.isRunning}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Play className="w-5 h-5" />
                Ignite Engine
              </button>

              <button
                onClick={() => handleAction('stop')}
                disabled={loading || !status.isRunning}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Square className="w-5 h-5" />
                Halt Engine
              </button>

              <button
                onClick={clearMessages}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Database className="w-5 h-5" />
                Purge Memory
              </button>


              <label className="flex items-center gap-2 text-amber-800 font-medium">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                Auto-Monitor
              </label>
            </div>

            {/* Progress Bar */}
            {status.stats && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-amber-800 font-bold">Dream Collection Progress</span>
                  <span className="text-amber-700">{status.stats.messagesReceived} / 600 messages</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-right text-sm text-amber-600 mt-1">
                  {progressPercentage.toFixed(1)}% Complete
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Connection Status */}
          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl shadow-xl border-4 border-blue-300 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-800 to-cyan-800 text-white p-4">
              <h3 className="text-xl font-bold flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Aetheric Connection
              </h3>
            </div>
            <div className="p-6">
              <ConnectionStatus status={status} />
            </div>
          </div>

          {/* Engine Statistics */}
          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl shadow-xl border-4 border-purple-300 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-4">
              <h3 className="text-xl font-bold flex items-center">
                <Gauge className="w-5 h-5 mr-2" />
                Engine Metrics
              </h3>
            </div>
            <div className="p-6">
              {status.stats ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-md border-2 border-blue-200">
                    <div className="text-2xl font-bold text-blue-800">{status.stats.asciiMessages}</div>
                    <div className="text-blue-600">ASCII Messages</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-200">
                    <div className="text-2xl font-bold text-purple-800">{status.stats.binaryMessages}</div>
                    <div className="text-purple-600">Binary Messages</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-md border-2 border-red-200">
                    <div className="text-2xl font-bold text-red-800">{status.stats.errors.length}</div>
                    <div className="text-red-600">System Errors</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-purple-600 italic">
                  Engine dormant - awaiting ignition...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decoder Results */}
        <DecoderResults
          results={decoderResults}
          isDecoding={isDecoding}
          onDecode={runDecoder}
          hasMessages={(status.stats?.messagesReceived || 0) > 0}
        />

        {/* Recent Events */}
        {status.events.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl shadow-xl border-4 border-emerald-300 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-4">
              <h3 className="text-xl font-bold flex items-center">
                <Cpu className="w-5 h-5 mr-2" />
                Recent Engine Activity
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {status.events.slice().reverse().map((event, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 shadow-md border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-emerald-800">{event.event}</span>
                        {event.data && (
                          <div className="text-sm text-emerald-600 mt-1">
                            {typeof event.data === 'string' ? event.data : JSON.stringify(event.data)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-emerald-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Tables */}
        <MessageTable
          isEngineRunning={status.isRunning}
          messageCount={status.stats?.messagesReceived || 0}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}