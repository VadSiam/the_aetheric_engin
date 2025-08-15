// AI-Assisted
'use client';

import { Copy, Key, Search, Wallet } from 'lucide-react';
import { useState } from 'react';
import NFTChecker from './NFTChecker';

interface BIP39Word {
  word: string;
  timestamp: string;
  messageId: number;
  position: number;
}

interface EthereumAddressData {
  address: string;
  messageId: number;
  timestamp: string;
}

interface DecoderResults {
  ethereumAddresses: EthereumAddressData[];
  seedPhrases: string[];
  bip39Words: BIP39Word[];
  technicalSummary: string;
}

interface DecoderResultsProps {
  results: DecoderResults | null;
  isDecoding: boolean;
  onDecode: () => void;
  hasMessages: boolean;
}

export default function DecoderResults({ results, isDecoding, onDecode, hasMessages }: DecoderResultsProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [addressPage, setAddressPage] = useState(0);
  const [wordsPage, setWordsPage] = useState(0);

  const ADDRESSES_PER_PAGE = 10;
  const WORDS_PER_PAGE = 10;

  const handleCopy = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl shadow-xl border-4 border-purple-300 mb-8 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold flex items-center">
            <Key className="w-5 h-5 mr-2" />
            🔮 Decoded Crypto Secrets
          </h3>
          <button
            onClick={onDecode}
            disabled={!hasMessages || isDecoding}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none"
          >
            {isDecoding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Decoding...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Decode Messages
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6">
        {!results && !isDecoding && (
          <div className="text-center text-purple-600 italic">
            <p className="text-lg mb-2">🔍 Ready to decrypt hidden crypto secrets</p>
            <p className="text-sm">Click ~Decode Messages~ to analyze the collected data for Ethereum addresses and BIP39 seed phrases</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">

            {/* Ethereum Addresses */}
            {results.ethereumAddresses && results.ethereumAddresses.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-green-200">
                <h4 className="text-lg font-bold text-green-800 mb-3 flex items-center">
                  <Wallet className="w-5 h-5 mr-2" />
                  Discovered Ethereum Addresses ({results.ethereumAddresses.length})
                </h4>

                {/* Pagination info */}
                {results.ethereumAddresses.length > ADDRESSES_PER_PAGE && (
                  <div className="flex justify-between items-center mb-3 text-sm text-green-600">
                    <span>
                      Showing {addressPage * ADDRESSES_PER_PAGE + 1}-{Math.min((addressPage + 1) * ADDRESSES_PER_PAGE, results.ethereumAddresses.length)} of {results.ethereumAddresses.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAddressPage(Math.max(0, addressPage - 1))}
                        disabled={addressPage === 0}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1">
                        Page {addressPage + 1} of {Math.ceil(results.ethereumAddresses.length / ADDRESSES_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setAddressPage(Math.min(Math.ceil(results.ethereumAddresses.length / ADDRESSES_PER_PAGE) - 1, addressPage + 1))}
                        disabled={addressPage >= Math.ceil(results.ethereumAddresses.length / ADDRESSES_PER_PAGE) - 1}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {results.ethereumAddresses
                    .slice(addressPage * ADDRESSES_PER_PAGE, (addressPage + 1) * ADDRESSES_PER_PAGE)
                    .map((addressData, index) => (
                      <div key={index} className="bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <span>Message #{addressData.messageId}</span>
                            <span>•</span>
                            <span>{new Date(addressData.timestamp).toLocaleDateString('en-US', {
                              year: '2-digit',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <button
                            onClick={() => handleCopy(addressData.address, `address-${addressPage * ADDRESSES_PER_PAGE + index}`)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
                            title="Copy address"
                          >
                            {copiedItem === `address-${addressPage * ADDRESSES_PER_PAGE + index}` ? (
                              <span className="text-xs text-green-800">✓</span>
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <code className="block font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {addressData.address}
                        </code>
                      </div>
                    ))}
                </div>

                {/* NFT Checker Integration */}
                <NFTChecker addresses={results.ethereumAddresses} />
              </div>
            )}


            {/* Technical Summary */}
            {results.technicalSummary && (
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-gray-200">
                <h4 className="text-lg font-bold text-gray-800 mb-3">🔬 Technical Analysis</h4>
                <div className="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-3 rounded-lg font-mono">
                  {results.technicalSummary}
                </div>
              </div>
            )}

            {/* Show partial results even if incomplete */}
            {(results.bip39Words && results.bip39Words.length > 0) && (
              <div className="bg-white rounded-xl p-4 shadow-md border-2 border-amber-200">
                <h4 className="text-lg font-bold text-amber-800 mb-3 flex items-center">
                  <Key className="w-5 h-5 mr-2" />
                  Found BIP39 Words ({results.bip39Words.length})
                </h4>

                {/* Pagination for BIP39 words */}
                {results.bip39Words.length > WORDS_PER_PAGE && (
                  <div className="flex justify-between items-center mb-3 text-sm text-amber-600">
                    <span>
                      Showing {wordsPage * WORDS_PER_PAGE + 1}-{Math.min((wordsPage + 1) * WORDS_PER_PAGE, results.bip39Words.length)} of {results.bip39Words.length}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setWordsPage(Math.max(0, wordsPage - 1))}
                        disabled={wordsPage === 0}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1">
                        Page {wordsPage + 1} of {Math.ceil(results.bip39Words.length / WORDS_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setWordsPage(Math.min(Math.ceil(results.bip39Words.length / WORDS_PER_PAGE) - 1, wordsPage + 1))}
                        disabled={wordsPage >= Math.ceil(results.bip39Words.length / WORDS_PER_PAGE) - 1}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {results.bip39Words
                    .slice(wordsPage * WORDS_PER_PAGE, (wordsPage + 1) * WORDS_PER_PAGE)
                    .map((wordData, index) => (
                      <div key={wordsPage * WORDS_PER_PAGE + index} className="bg-amber-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <code className="font-bold text-amber-800">{wordData.word}</code>
                            <span className="text-sm text-amber-600 ml-2">
                              (Message #{wordData.messageId}, Position: {wordData.position})
                            </span>
                          </div>
                          <span className="text-xs text-amber-500">
                            {new Date(wordData.timestamp).toLocaleDateString('en-US', {
                              year: '2-digit',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {(!results.ethereumAddresses || results.ethereumAddresses.length === 0) &&
              (!results.bip39Words || results.bip39Words.length === 0) && (
                <div className="text-center text-orange-600 bg-orange-50 p-4 rounded-lg">
                  <p className="text-lg mb-2">🔍 No crypto secrets found</p>
                  <p className="text-sm">The decoder analysis completed but no Ethereum addresses or BIP39 words were discovered in the message data.</p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}