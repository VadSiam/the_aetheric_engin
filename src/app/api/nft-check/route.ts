// AI-Assisted
import { NextRequest, NextResponse } from 'next/server';

interface NFTData {
  address: string;
  hasNFTs: boolean;
  nftCount?: number;
  collections?: string[];
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { addresses, offset = 0, limit = 50 } = await request.json();

    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Invalid addresses array' },
        { status: 400 }
      );
    }

    const results: NFTData[] = [];
    const startIndex = Math.max(0, offset);
    const endIndex = Math.min(addresses.length, startIndex + limit);
    const batchAddresses = addresses.slice(startIndex, endIndex);

    console.log(`🔍 Checking addresses ${startIndex + 1}-${endIndex} of ${addresses.length}`);

    // Process addresses in the specified batch
    for (const address of batchAddresses) {
      try {
        // Use Etherscan API to check for ERC-721 transfers (NFTs)
        const etherscanUrl = `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10`;

        const response = await fetch(etherscanUrl, {
          headers: {
            'User-Agent': 'AethericEngine/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();

          if (data.status === '1' && Array.isArray(data.result) && data.result.length > 0) {
            // Has NFT transactions
            const collections = [
              ...new Set(
                (data.result as Array<{ tokenName?: string }>).map((tx) => tx.tokenName).filter((name): name is string => Boolean(name))
              )
            ];

            results.push({
              address,
              hasNFTs: true,
              nftCount: data.result.length,
              collections: collections.slice(0, 3) // Top 3 collections
            });
          } else {
            // No NFTs found
            results.push({
              address,
              hasNFTs: false,
              nftCount: 0
            });
          }
        } else {
          // API error
          results.push({
            address,
            hasNFTs: false,
            error: `API error: ${response.status}`
          });
        }
      } catch (error) {
        results.push({
          address,
          hasNFTs: false,
          error: 'Network error'
        });
      }

      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const withNFTs = results.filter(r => r.hasNFTs).length;
    console.log(`🎯 API: Batch ${startIndex + 1}-${endIndex} complete: Found NFTs in ${withNFTs} out of ${results.length} addresses in this batch`);

    return NextResponse.json({
      success: true,
      results,
      batch: {
        offset: startIndex,
        limit: batchAddresses.length,
        total: addresses.length,
        processed: endIndex,
        hasMore: endIndex < addresses.length
      },
      summary: {
        batchChecked: results.length,
        batchWithNFTs: withNFTs,
        totalAddresses: addresses.length
      }
    });

  } catch (error) {
    console.error('NFT check API error:', error);
    return NextResponse.json(
      { error: 'Server error during NFT checking' },
      { status: 500 }
    );
  }
}