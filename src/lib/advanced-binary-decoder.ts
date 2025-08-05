// AI-Assisted

export interface AdvancedDecodingResult {
  method: string;
  result: string;
  success: boolean;
  description: string;
  confidence: number; // 0-100, how confident we are this is the correct decoding
}

export class AdvancedBinaryDecoder {

  /**
   * Main decoding function that uses 0xAA header as decoding hint
   */
  static decodeWithHeader(payload: string, header: number = 0xAA): AdvancedDecodingResult[] {
    const results: AdvancedDecodingResult[] = [];

    try {
      // First decode from Base64 to get raw bytes
      const binaryString = atob(payload);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Try different decoding methods based on 0xAA header
      results.push(...this.tryXorDecoding(bytes, header));
      results.push(...this.tryCaesarDecoding(bytes, header));
      results.push(...this.tryCompressionDecoding(bytes));
      results.push(...this.tryMultiLayerDecoding(payload));
      results.push(...this.tryPatternAnalysis(bytes));

      // Add hex dump as fallback
      results.push({
        method: 'Hex Dump',
        result: this.generateHexDump(bytes),
        success: true,
        description: `Raw binary data (${bytes.length} bytes)`,
        confidence: 10
      });

      // Sort by confidence score
      return results.sort((a, b) => b.confidence - a.confidence);

    } catch (error) {
      return [{
        method: 'Error',
        result: '',
        success: false,
        description: `Failed to decode Base64: ${error}`,
        confidence: 0
      }];
    }
  }

  /**
   * XOR decoding using header value as key
   */
  private static tryXorDecoding(bytes: Uint8Array, header: number): AdvancedDecodingResult[] {
    const results: AdvancedDecodingResult[] = [];

    // Try XOR with header value (0xAA = 170)
    const xorResult = this.xorDecode(bytes, header);
    if (this.isReadableText(xorResult)) {
      results.push({
        method: `XOR (key: 0x${header.toString(16).toUpperCase()})`,
        result: xorResult,
        success: true,
        description: `XOR decoded using header value ${header} as key`,
        confidence: 80
      });
    }

    // Try XOR with repeating pattern
    const xorPatternResult = this.xorDecodePattern(bytes, [header]);
    if (this.isReadableText(xorPatternResult) && xorPatternResult !== xorResult) {
      results.push({
        method: `XOR Pattern (0x${header.toString(16).toUpperCase()})`,
        result: xorPatternResult,
        success: true,
        description: `XOR decoded with repeating header pattern`,
        confidence: 75
      });
    }

    // Try common XOR keys
    const commonKeys = [0xFF, 0x00, 0x42, 0x7F, header ^ 0xFF];
    for (const key of commonKeys) {
      const result = this.xorDecode(bytes, key);
      if (this.isReadableText(result)) {
        results.push({
          method: `XOR (key: 0x${key.toString(16).toUpperCase()})`,
          result: result,
          success: true,
          description: `XOR decoded with key ${key}`,
          confidence: 60
        });
      }
    }

    return results;
  }

  /**
   * Caesar cipher decoding using header value as shift
   */
  private static tryCaesarDecoding(bytes: Uint8Array, header: number): AdvancedDecodingResult[] {
    const results: AdvancedDecodingResult[] = [];

    // Try Caesar cipher with header as shift value
    const shifts = [header % 26, header % 256, (256 - header) % 256];

    for (const shift of shifts) {
      const result = this.caesarDecode(bytes, shift);
      if (this.isReadableText(result)) {
        results.push({
          method: `Caesar Cipher (shift: ${shift})`,
          result: result,
          success: true,
          description: `Caesar cipher with shift ${shift} derived from header`,
          confidence: 70
        });
      }
    }

    return results;
  }

  /**
   * Try to decompress the data
   */
  private static tryCompressionDecoding(bytes: Uint8Array): AdvancedDecodingResult[] {
    const results: AdvancedDecodingResult[] = [];

    // Check for gzip magic bytes (1f 8b)
    if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      results.push({
        method: 'Gzip Decompression',
        result: '[Gzip data detected - decompression not implemented]',
        success: false,
        description: 'Data appears to be gzip compressed',
        confidence: 90
      });
    }

    // Check for deflate/zlib magic bytes
    if (bytes.length > 2 && bytes[0] === 0x78) {
      results.push({
        method: 'Deflate Decompression',
        result: '[Deflate data detected - decompression not implemented]',
        success: false,
        description: 'Data appears to be deflate compressed',
        confidence: 85
      });
    }

    return results;
  }

  /**
   * Try multi-layer decoding (Base64 within Base64, etc.)
   */
  private static tryMultiLayerDecoding(payload: string): AdvancedDecodingResult[] {
    const results: AdvancedDecodingResult[] = [];

    try {
      // Try double Base64 decoding
      const firstDecode = atob(payload);
      if (this.isBase64(firstDecode)) {
        const secondDecode = atob(firstDecode);
        if (this.isReadableText(secondDecode)) {
          results.push({
            method: 'Double Base64',
            result: secondDecode,
            success: true,
            description: 'Double Base64 encoded text',
            confidence: 85
          });
        }
      }

      // Try Base64 then URL decode
      const urlDecoded = decodeURIComponent(firstDecode);
      if (urlDecoded !== firstDecode && this.isReadableText(urlDecoded)) {
        results.push({
          method: 'Base64 + URL Decode',
          result: urlDecoded,
          success: true,
          description: 'Base64 then URL encoded text',
          confidence: 80
        });
      }
    } catch (error) {
      console.error('🚀 ~ error:', error)
      // Ignore decode errors
    }

    return results;
  }

  /**
   * Analyze patterns in the data
   */
  private static tryPatternAnalysis(bytes: Uint8Array): AdvancedDecodingResult[] {
    const results: AdvancedDecodingResult[] = [];

    // Check for repeated patterns that might indicate encryption
    const patterns = this.findRepeatingPatterns(bytes);
    if (patterns.length > 0) {
      results.push({
        method: 'Pattern Analysis',
        result: `Found ${patterns.length} repeating patterns: ${patterns.slice(0, 3).map(p =>
          Array.from(p).map(b => b.toString(16).padStart(2, '0')).join(' ')
        ).join(', ')}`,
        success: true,
        description: 'Repeating patterns detected - likely encrypted data',
        confidence: 40
      });
    }

    // Check entropy (randomness)
    const entropy = this.calculateEntropy(bytes);
    results.push({
      method: 'Entropy Analysis',
      result: `Entropy: ${entropy.toFixed(2)} bits/byte`,
      success: true,
      description: entropy > 7.5 ? 'High entropy - likely encrypted/compressed' :
        entropy > 6.0 ? 'Medium entropy - possibly encoded' : 'Low entropy - might be text',
      confidence: 30
    });

    return results;
  }

  // Helper methods
  private static xorDecode(bytes: Uint8Array, key: number): string {
    const decoded = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      decoded[i] = bytes[i] ^ key;
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(decoded);
  }

  private static xorDecodePattern(bytes: Uint8Array, pattern: number[]): string {
    const decoded = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      decoded[i] = bytes[i] ^ pattern[i % pattern.length];
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(decoded);
  }

  private static caesarDecode(bytes: Uint8Array, shift: number): string {
    const decoded = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      decoded[i] = (bytes[i] + shift) % 256;
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(decoded);
  }

  private static isReadableText(text: string): boolean {
    if (text.length < 10) return false;

    // Check for printable ASCII characters
    let printableCount = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
        printableCount++;
      }
    }

    // At least 70% should be printable, and should contain some letters
    const printableRatio = printableCount / text.length;
    const hasLetters = /[a-zA-Z]/.test(text);
    const hasWords = /\b[a-zA-Z]{3,}\b/.test(text);

    return printableRatio > 0.7 && hasLetters && hasWords;
  }

  private static isBase64(str: string): boolean {
    try {
      return /^[A-Za-z0-9+/]*={0,2}$/.test(str.trim()) && str.length % 4 === 0;
    } catch {
      return false;
    }
  }

  private static findRepeatingPatterns(bytes: Uint8Array): Uint8Array[] {
    const patterns: Uint8Array[] = [];
    const minPatternLength = 2;
    const maxPatternLength = 8;

    for (let len = minPatternLength; len <= maxPatternLength; len++) {
      for (let start = 0; start < bytes.length - len * 2; start++) {
        const pattern = bytes.slice(start, start + len);
        let occurrences = 0;

        for (let pos = start + len; pos <= bytes.length - len; pos++) {
          let matches = true;
          for (let i = 0; i < len; i++) {
            if (bytes[pos + i] !== pattern[i]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            occurrences++;
            pos += len - 1; // Skip ahead
          }
        }

        if (occurrences >= 3) {
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  private static calculateEntropy(bytes: Uint8Array): number {
    const freq = new Array(256).fill(0);
    for (const byte of bytes) {
      freq[byte]++;
    }

    let entropy = 0;
    const len = bytes.length;
    for (const count of freq) {
      if (count > 0) {
        const p = count / len;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  private static generateHexDump(bytes: Uint8Array, maxBytes: number = 256): string {
    const limit = Math.min(bytes.length, maxBytes);
    let result = '';

    for (let i = 0; i < limit; i += 16) {
      const address = i.toString(16).padStart(8, '0');
      result += address + ': ';

      const hexPart = [];
      const textPart = [];

      for (let j = 0; j < 16; j++) {
        if (i + j < limit) {
          const byte = bytes[i + j];
          hexPart.push(byte.toString(16).padStart(2, '0'));
          textPart.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
        } else {
          hexPart.push('  ');
          textPart.push(' ');
        }
      }

      result += hexPart.join(' ') + ' | ' + textPart.join('') + '\n';
    }

    if (bytes.length > maxBytes) {
      result += `\n... (${bytes.length - maxBytes} more bytes)`;
    }

    return result;
  }
}

/**
 * Main function to decode binary messages with 0xAA header
 */
export function decodeAdvancedBinary(payload: string): AdvancedDecodingResult[] {
  return AdvancedBinaryDecoder.decodeWithHeader(payload, 0xAA);
}