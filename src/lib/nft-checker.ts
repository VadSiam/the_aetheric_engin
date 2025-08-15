// AI-Assisted
/**
 * NFT Checker - Check Ethereum addresses for NFT ownership
 * Uses free APIs to detect NFTs without requiring API keys
 */

interface NFTData {
  address: string;
  hasNFTs: boolean;
  nftCount?: number;
  collections?: string[];
  error?: string;
}

interface OpenSeaAsset {
  id: number;
  token_id: string;
  collection: {
    name: string;
  };
}

interface OpenSeaResponse {
  assets: OpenSeaAsset[];
}

export class NFTChecker {
  private readonly DELAY_BETWEEN_REQUESTS = 200; // 200ms delay to avoid rate limiting
  private readonly BATCH_SIZE = 10; // Check 10 addresses at a time

  /**
   * Check multiple addresses for NFTs
   */
  async checkAddresses(addresses: string[]): Promise<NFTData[]> {
    console.log(`🔍 Checking ${addresses.length} addresses for NFTs`);
    const results: NFTData[] = [];
    
    // Process in batches to avoid overwhelming APIs
    for (let i = 0; i < addresses.length; i += this.BATCH_SIZE) {
      const batch = addresses.slice(i, i + this.BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(addresses.length / this.BATCH_SIZE)}`);
      
      const batchResults = await Promise.all(
        batch.map(address => this.checkSingleAddress(address))
      );
      
      results.push(...batchResults);
      
      // Delay between batches
      if (i + this.BATCH_SIZE < addresses.length) {
        await this.delay(this.DELAY_BETWEEN_REQUESTS * this.BATCH_SIZE);
      }
    }

    const withNFTs = results.filter(r => r.hasNFTs).length;
    console.log(`🎯 Found ${withNFTs} addresses with NFTs out of ${addresses.length} checked`);
    
    return results;
  }

  /**
   * Check single address for NFTs using OpenSea API
   */
  private async checkSingleAddress(address: string): Promise<NFTData> {
    try {
      // Use OpenSea API (no key required, but rate limited)
      const response = await fetch(
        `https://api.opensea.io/api/v1/assets?owner=${address}&limit=10`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry once
          await this.delay(1000);
          return this.checkSingleAddressWithBackoff(address);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data: OpenSeaResponse = await response.json();
      const assets = data.assets || [];

      if (assets.length > 0) {
        console.log(`✅ Address ${address} has ${assets.length}+ NFTs`);
        const collections = [...new Set(assets.map(asset => asset.collection.name))];
        
        return {
          address,
          hasNFTs: true,
          nftCount: assets.length,
          collections: collections.slice(0, 3) // Show top 3 collections
        };
      } else {
        return {
          address,
          hasNFTs: false,
          nftCount: 0
        };
      }

    } catch (error) {
      console.warn(`⚠️ Error checking ${address}:`, error);
      return {
        address,
        hasNFTs: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Backup method with longer delay for rate-limited requests
   */
  private async checkSingleAddressWithBackoff(address: string): Promise<NFTData> {
    try {
      const response = await fetch(
        `https://api.opensea.io/api/v1/assets?owner=${address}&limit=5`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: OpenSeaResponse = await response.json();
      const assets = data.assets || [];

      return {
        address,
        hasNFTs: assets.length > 0,
        nftCount: assets.length,
        collections: assets.length > 0 
          ? [...new Set(assets.map(asset => asset.collection.name))].slice(0, 3)
          : undefined
      };

    } catch (error) {
      return {
        address,
        hasNFTs: false,
        error: 'Rate limited or API error'
      };
    }
  }

  /**
   * Alternative method using Etherscan (checks for ERC-721 transactions)
   */
  async checkAddressesViaEtherscan(addresses: string[]): Promise<NFTData[]> {
    console.log('🔍 Using Etherscan method to check for NFT activity');
    const results: NFTData[] = [];

    for (const address of addresses.slice(0, 100)) { // Limit to first 100 for free tier
      try {
        // Check for ERC-721 token transfers (NFTs)
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=desc`
        );

        if (response.ok) {
          const data = await response.json();
          const hasNFTs = data.result && data.result.length > 0;
          
          results.push({
            address,
            hasNFTs,
            nftCount: hasNFTs ? data.result.length : 0
          });

          if (hasNFTs) {
            console.log(`✅ Address ${address} has NFT transactions`);
          }
        }
      } catch (error) {
        results.push({
          address,
          hasNFTs: false,
          error: 'Etherscan API error'
        });
      }

      // Rate limiting delay
      await this.delay(this.DELAY_BETWEEN_REQUESTS);
    }

    return results;
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Export addresses with NFTs to JSON
   */
  exportNFTAddresses(results: NFTData[]): void {
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
  }
}

// Export singleton instance
export const nftChecker = new NFTChecker();