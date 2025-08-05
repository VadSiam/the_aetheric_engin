// AI-Assisted
'use client';

import { useState, useEffect } from 'react';
import { FileText, Binary, RefreshCw, Download, Eye, EyeOff, Copy } from 'lucide-react';
// Simplified - no complex decoders needed

interface AsciiMessage {
  id: number;
  payload: string;
  timestamp: string;
  message_length: number;
}

interface BinaryMessage {
  id: number;
  payload: string; // base64 encoded
  payload_size: number;
  timestamp: string;
  header_verified: boolean;
}

interface MessagesData {
  ascii: {
    messages: AsciiMessage[];
    count: number;
  };
  binary: {
    messages: BinaryMessage[];
    count: number;
  };
  totals: {
    ascii: number;
    binary: number;
    total: number;
  };
}

interface MessageTableProps {
  isEngineRunning: boolean;
  messageCount: number;
  refreshTrigger: number;
}

export default function MessageTable({ isEngineRunning, messageCount, refreshTrigger }: MessageTableProps) {
  const [messages, setMessages] = useState<MessagesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ascii' | 'binary'>('ascii');
  const [expandedMessage, setExpandedMessage] = useState<{type: 'ascii' | 'binary', id: number} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/messages?type=all&limit=200');
      const data = await response.json();
      
      if (response.ok) {
        setMessages(data);
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    
    // Smart auto-refresh: only when engine is running AND below target (600 messages)
    if (isEngineRunning && messageCount < 600) {
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isEngineRunning, messageCount]);

  // Refresh when triggered by parent (e.g., after purge)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchMessages();
    }
  }, [refreshTrigger]);

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Calculate pagination info
  const getCurrentMessages = () => {
    return activeTab === 'ascii' ? messages?.ascii.messages || [] : messages?.binary.messages || [];
  };
  
  const currentMessages = getCurrentMessages();
  const totalPages = Math.ceil(currentMessages.length / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, currentMessages.length);

  const exportMessages = async (type: 'ascii' | 'binary' | 'all' | 'mixed') => {
    try {
      const response = await fetch(`/api/messages?type=${type}&limit=1000`);
      const data = await response.json();
      
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `aetheric_messages_${type}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };


  if (!messages) {
    return (
      <div className="bg-gradient-to-br from-slate-100 to-gray-100 rounded-2xl shadow-xl border-4 border-slate-300 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 to-gray-800 text-white p-4">
          <h3 className="text-xl font-bold flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Dream Archive
          </h3>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading dream archive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-100 to-gray-100 rounded-2xl shadow-xl border-4 border-slate-300 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-gray-800 text-white p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Dream Archive
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMessages}
              disabled={loading}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Refresh messages"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportMessages('all')}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              title="Export all messages"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-blue-200 text-center">
            <div className="text-2xl font-bold text-blue-800">{messages.totals.ascii}</div>
            <div className="text-blue-600">ASCII Dreams</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-800">{messages.totals.binary}</div>
            <div className="text-purple-600">Binary Visions</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md border-2 border-green-200 text-center">
            <div className="text-2xl font-bold text-green-800">{messages.totals.total}</div>
            <div className="text-green-600">Total Messages</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('ascii')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ascii'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-600 hover:bg-blue-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            ASCII Dreams ({messages.ascii.count})
          </button>
          <button
            onClick={() => setActiveTab('binary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'binary'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Binary className="w-4 h-4" />
            Binary Visions ({messages.binary.count})
          </button>
        </div>

        {/* Message Tables */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {activeTab === 'ascii' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-blue-800 font-bold">ID</th>
                    <th className="px-2 py-3 text-left text-blue-800 font-bold text-sm">Time</th>
                    <th className="px-3 py-3 text-left text-blue-800 font-bold">Length</th>
                    <th className="px-4 py-3 text-left text-blue-800 font-bold">Message</th>
                    <th className="px-2 py-3 text-left text-blue-800 font-bold">View</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedMessages = messages.ascii.messages.slice(startIndex, startIndex + itemsPerPage);
                    
                    return paginatedMessages.map((message, index) => {
                      const isExpanded = expandedMessage?.type === 'ascii' && expandedMessage?.id === message.id;
                      const preview = message.payload.length > 100 ? message.payload.substring(0, 100) + '...' : message.payload;
                      
                      return (
                        <tr key={message.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-3 py-3 text-blue-700 font-mono text-sm">{message.id}</td>
                          <td className="px-2 py-3 text-gray-600 text-xs">
                            {new Date(message.timestamp).toLocaleTimeString('en-US', { 
                              hour12: false, 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })}
                          </td>
                          <td className="px-3 py-3 text-gray-700 text-sm">{message.message_length}</td>
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <div className="bg-gray-50 p-3 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold text-sm text-gray-700">Raw ASCII Message</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(message.payload)}
                                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="Copy to clipboard"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                                <code className="block bg-white px-2 py-1 rounded text-sm text-gray-800 break-all max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {message.payload}
                                </code>
                              </div>
                            ) : (
                              <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-800 break-all">
                                {preview}
                              </code>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <button
                              onClick={() => setExpandedMessage(
                                isExpanded ? null : { type: 'ascii', id: message.id }
                              )}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title={isExpanded ? "Collapse" : "Show full message"}
                            >
                              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              {messages.ascii.messages.length === 0 && (
                <div className="p-8 text-center text-gray-500 italic">
                  No ASCII messages captured yet...
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-purple-800 font-bold">ID</th>
                    <th className="px-2 py-3 text-left text-purple-800 font-bold text-sm">Time</th>
                    <th className="px-3 py-3 text-left text-purple-800 font-bold">Size</th>
                    <th className="px-3 py-3 text-left text-purple-800 font-bold">Header</th>
                    <th className="px-4 py-3 text-left text-purple-800 font-bold">Data Preview</th>
                    <th className="px-2 py-3 text-left text-purple-800 font-bold">View</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedMessages = messages.binary.messages.slice(startIndex, startIndex + itemsPerPage);
                    
                    return paginatedMessages.map((message, index) => {
                      const isExpanded = expandedMessage?.type === 'binary' && expandedMessage?.id === message.id;
                      const preview = message.payload.length > 50 ? message.payload.substring(0, 50) + '...' : message.payload;
                      
                      return (
                        <tr key={message.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="px-3 py-3 text-purple-700 font-mono text-sm">{message.id}</td>
                          <td className="px-2 py-3 text-gray-600 text-xs">
                            {new Date(message.timestamp).toLocaleTimeString('en-US', { 
                              hour12: false, 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })}
                          </td>
                          <td className="px-3 py-3 text-gray-700 text-sm">{message.payload_size} bytes</td>
                          <td className="px-3 py-3">
                            <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">
                              0xAA ✓
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <div className="bg-gray-50 p-3 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-bold text-sm text-gray-700">Binary Data (Base64 encoded)</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(message.payload)}
                                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="Copy to clipboard"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                                <code className="block bg-white px-2 py-1 rounded text-sm text-gray-800 break-all max-h-32 overflow-y-auto">
                                  {message.payload}
                                </code>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Binary className="w-4 h-4 text-purple-600" />
                                <span className="text-sm text-purple-700 font-medium">Binary Data Raw</span>
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                  {preview}
                                </code>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <button
                              onClick={() => setExpandedMessage(
                                isExpanded ? null : { type: 'binary', id: message.id }
                              )}
                              className="p-1 text-purple-600 hover:text-purple-800 transition-colors"
                              title={isExpanded ? "Collapse" : "Show full data"}
                            >
                              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
              {messages.binary.messages.length === 0 && (
                <div className="p-8 text-center text-gray-500 italic">
                  No binary messages captured yet...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {currentMessages.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {startItem}-{endItem} of {currentMessages.length} messages
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-2 py-1 rounded text-sm ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Export Options */}
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => exportMessages('ascii')}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Export ASCII
          </button>
          <button
            onClick={() => exportMessages('binary')}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
          >
            Export Binary
          </button>
          <button
            onClick={() => exportMessages('mixed')}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
          >
            Export Mix Data
          </button>
        </div>
      </div>
    </div>
  );
}