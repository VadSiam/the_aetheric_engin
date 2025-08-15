// AI-Assisted
'use client';

import { ExternalLink, Search, Download } from 'lucide-react';
import { useState } from 'react';

interface NFTData {
  address: string;
  hasNFTs: boolean;
  nftCount?: number;
  collections?: string[];
  error?: string;
}

interface EthereumAddressData {
  address: string;
  messageId: number;
  timestamp: string;
}

interface NFTCheckerProps {
  addresses: EthereumAddressData[];
}

export default function NFTChecker({ addresses }: NFTCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<NFTData[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [batchSize] = useState(50);

  const handleCheckNextBatch = async () => {
    if (isChecking || addresses.length === 0 || currentOffset >= addresses.length) return;

    setIsChecking(true);
    setError(null);
    setIsPaused(false);

    try {
      const addressStrings = addresses.map(a => a.address);
      
      console.log(`🔍 Checking batch ${Math.floor(currentOffset / batchSize) + 1}: addresses ${currentOffset + 1}-${Math.min(currentOffset + batchSize, addresses.length)}`);
      
      // Call our backend API route with batch parameters
      const response = await fetch('/api/nft-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          addresses: addressStrings,
          offset: currentOffset,
          limit: batchSize
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }
      
      // Accumulate results
      setResults(prev => [...prev, ...data.results]);
      setCurrentOffset(data.batch.processed);
      setTotalProcessed(data.batch.processed);
      setProgress((data.batch.processed / addresses.length) * 100);
      
      const withNFTs = data.results.filter((r: NFTData) => r.hasNFTs).length;
      const totalWithNFTsSoFar = [...results, ...data.results].filter(r => r.hasNFTs).length;
      console.log(`✅ Batch ${Math.floor(currentOffset / batchSize) + 1} complete: Found NFTs in ${withNFTs} of ${data.results.length} addresses (addresses ${currentOffset + 1}-${data.batch.processed} of ${addresses.length})`);
      console.log(`🎯 Running total: ${totalWithNFTsSoFar} addresses with NFTs out of ${data.batch.processed} checked so far`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`NFT checking failed: ${errorMsg}`);
      console.error('NFT checking error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCheckAll = async () => {
    if (isChecking || addresses.length === 0) return;

    // Reset state for full check
    setResults([]);
    setCurrentOffset(0);
    setTotalProcessed(0);
    setProgress(0);
    setError(null);

    // Start checking all batches
    let offset = 0;
    const addressStrings = addresses.map(a => a.address);
    const allResults: NFTData[] = [];

    while (offset < addresses.length && !isPaused) {
      setIsChecking(true);
      
      try {
        console.log(`🔍 Processing batch ${Math.floor(offset / batchSize) + 1} of ${Math.ceil(addresses.length / batchSize)}`);
        
        const response = await fetch('/api/nft-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            addresses: addressStrings,
            offset: offset,
            limit: batchSize
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Unknown API error');
        }
        
        // Update results progressively
        allResults.push(...data.results);
        setResults([...allResults]);
        setCurrentOffset(data.batch.processed);
        setTotalProcessed(data.batch.processed);
        setProgress((data.batch.processed / addresses.length) * 100);
        
        const withNFTs = data.results.filter((r: NFTData) => r.hasNFTs).length;
        const currentBatchNum = Math.floor(offset / batchSize) + 1;
        const totalBatches = Math.ceil(addresses.length / batchSize);
        console.log(`✅ Batch ${currentBatchNum}/${totalBatches} complete: Found NFTs in ${withNFTs} of ${data.results.length} addresses (addresses ${offset + 1}-${data.batch.processed})`);
        
        const currentTotal = allResults.length;
        const currentNFTTotal = allResults.filter(r => r.hasNFTs).length;
        console.log(`🎯 Progress: ${currentNFTTotal} addresses with NFTs out of ${currentTotal} checked so far`);
        
        offset = data.batch.processed;
        
        // Small delay between batches to show progress
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(`NFT checking failed: ${errorMsg}`);
        console.error('NFT checking error:', err);
        break;
      }
    }

    setIsChecking(false);
    
    if (!isPaused) {
      const totalWithNFTs = allResults.filter(r => r.hasNFTs).length;
      console.log(`🏁 ALL BATCHES COMPLETE! Found NFTs in ${totalWithNFTs} out of ${allResults.length} addresses checked`);
      console.log(`📊 Final Stats: ${totalWithNFTs} addresses with NFTs out of ${addresses.length} total addresses (${(totalWithNFTs/addresses.length*100).toFixed(2)}% have NFTs)`);
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      setIsChecking(false);
    }
  };

  const handleReset = () => {
    setResults([]);
    setCurrentOffset(0);
    setTotalProcessed(0);
    setProgress(0);
    setError(null);
    setIsPaused(false);
  };

  const handleExportWithNFTs = () => {
    if (results.length === 0) return;
    
    const addressesWithNFTs = results.filter(r => r.hasNFTs);
    
    const exportData = {
      timestamp: new Date().toISOString(),
      totalChecked: results.length,
      addressesWithNFTs: addressesWithNFTs.length,
      addresses: addressesWithNFTs.map(r => ({
        address: r.address,
        nftCount: r.nftCount,
        collections: r.collections
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `addresses-with-nfts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`📁 Exported ${addressesWithNFTs.length} addresses with NFTs`);
  };

  const addressesWithNFTs = results.filter(r => r.hasNFTs);
  const totalBatches = Math.ceil(addresses.length / batchSize);
  const currentBatch = Math.floor(currentOffset / batchSize) + 1;
  const hasMore = currentOffset < addresses.length;

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-lg font-bold text-purple-800 flex items-center">
          🎨 NFT Checker ({addresses.length} addresses)
        </h5>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCheckAll}
            disabled={isChecking || addresses.length === 0 || (results.length > 0 && !hasMore)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none"
          >
            {isChecking ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Checking All...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Check All ({totalBatches} batches)
              </>
            )}
          </button>

          <button
            onClick={handleCheckNextBatch}
            disabled={isChecking || addresses.length === 0 || !hasMore}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none"
          >
            Next {batchSize}
          </button>

          {results.length > 0 && (
            <button
              onClick={handleReset}
              disabled={isChecking}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none"
            >
              Reset
            </button>
          )}

          {addressesWithNFTs.length > 0 && (
            <button
              onClick={handleExportWithNFTs}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              Export NFTs ({addressesWithNFTs.length})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-r-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {(isChecking || totalProcessed > 0) && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2 text-sm">
            <span className="text-purple-700">
              {isChecking 
                ? `Checking batch ${currentBatch} of ${totalBatches}...` 
                : `Processed: ${totalProcessed} of ${addresses.length} addresses`
              }
            </span>
            <div className="flex gap-4 text-xs">
              <span className="text-purple-600">{progress.toFixed(1)}%</span>
              <span className="text-green-600 font-bold">NFTs: {addressesWithNFTs.length}</span>
            </div>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-3 shadow-inner">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {totalProcessed > 0 && (
            <div className="text-xs text-purple-600 mt-1 text-center">
              Batch {currentBatch} of {totalBatches} • {hasMore ? 'More to check' : 'All done!'}
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-purple-200">
            <div className="flex gap-4">
              <span className="text-purple-700">
                ✅ Checked: {results.length} addresses
              </span>
              <span className="text-green-700 font-bold">
                🎨 With NFTs: {addressesWithNFTs.length}
              </span>
            </div>
            <div className="text-xs text-purple-600">
              {hasMore ? `${addresses.length - totalProcessed} remaining` : 'Complete!'}
            </div>
          </div>

          {addressesWithNFTs.length > 0 && (
            <div className="space-y-2">
              <h6 className="font-bold text-purple-800 mb-2">🎯 Addresses with NFTs:</h6>
              {addressesWithNFTs.slice(0, 10).map((result, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <code className="text-sm font-mono text-purple-800">
                        {result.address}
                      </code>
                      <div className="text-xs text-purple-600 mt-1">
                        {result.nftCount} NFTs
                        {result.collections && result.collections.length > 0 && (
                          <span> • Collections: {result.collections.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`https://opensea.io/${result.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded"
                      title="View on OpenSea"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
              
              {addressesWithNFTs.length > 10 && (
                <div className="text-center text-sm text-purple-600">
                  ... and {addressesWithNFTs.length - 10} more addresses with NFTs
                </div>
              )}
            </div>
          )}

          {addressesWithNFTs.length === 0 && (
            <div className="text-center text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p>📭 No NFTs found in any of the checked addresses</p>
              <p className="text-sm mt-1">The addresses may be empty or contain only regular tokens</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}