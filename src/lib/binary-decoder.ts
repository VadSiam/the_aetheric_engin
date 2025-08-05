// AI-Assisted

export interface BinaryDecodingResult {
  method: string;
  result: string | ArrayBuffer;
  success: boolean;
  description: string;
  type: 'text' | 'image' | 'json' | 'hex' | 'raw';
  imageFormat?: string;
  isDataUrl?: boolean;
}

export function detectFileType(data: Uint8Array): { type: string; format?: string } {
  if (data.length < 4) return { type: 'unknown' };

  // Check magic bytes for common formats
  const header = Array.from(data.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Image formats
  if (header.startsWith('89504e47')) return { type: 'image', format: 'PNG' };
  if (header.startsWith('ffd8ff')) return { type: 'image', format: 'JPEG' };
  if (header.startsWith('47494638')) return { type: 'image', format: 'GIF' };
  if (data[0] === 0x3C && data[1] === 0x3F) return { type: 'image', format: 'SVG' }; // <?
  if (header.startsWith('424d')) return { type: 'image', format: 'BMP' };
  if (header.startsWith('52494646')) return { type: 'image', format: 'WEBP' };

  // Text formats
  if (data[0] === 0x7B || data[0] === 0x5B) return { type: 'json' }; // { or [
  if (data[0] === 0x3C) return { type: 'xml' }; // <

  // Check if mostly printable ASCII
  let printableCount = 0;
  for (let i = 0; i < Math.min(data.length, 100); i++) {
    if ((data[i] >= 0x20 && data[i] <= 0x7E) || data[i] === 0x09 || data[i] === 0x0A || data[i] === 0x0D) {
      printableCount++;
    }
  }

  if (printableCount / Math.min(data.length, 100) > 0.8) {
    return { type: 'text' };
  }

  return { type: 'binary' };
}

export function tryDecodeAsText(data: Uint8Array): BinaryDecodingResult {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
    return {
      method: 'UTF-8 Text',
      result: text,
      success: true,
      description: 'Successfully decoded as UTF-8 text',
      type: 'text'
    };
  } catch (error) {
    console.error('🚀 ~ error:', error);
    return {
      method: 'UTF-8 Text',
      result: '',
      success: false,
      description: 'Not valid UTF-8 text',
      type: 'text'
    };
  }
}

export function tryDecodeAsJson(data: Uint8Array): BinaryDecodingResult {
  try {
    const text = new TextDecoder('utf-8').decode(data);
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);

    return {
      method: 'JSON',
      result: formatted,
      success: true,
      description: 'Successfully parsed as JSON',
      type: 'json'
    };
  } catch (error) {
    console.error('🚀 ~ error:', error);
    return {
      method: 'JSON',
      result: '',
      success: false,
      description: 'Not valid JSON format',
      type: 'json'
    };
  }
}

export function tryDecodeAsImage(data: Uint8Array): BinaryDecodingResult {
  try {
    const fileType = detectFileType(data);

    if (fileType.type !== 'image') {
      return {
        method: 'Image',
        result: '',
        success: false,
        description: 'No image format detected',
        type: 'image'
      };
    }

    // Convert to base64 data URL
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(data)));
    let mimeType = 'application/octet-stream';

    switch (fileType.format) {
      case 'PNG': mimeType = 'image/png'; break;
      case 'JPEG': mimeType = 'image/jpeg'; break;
      case 'GIF': mimeType = 'image/gif'; break;
      case 'SVG': mimeType = 'image/svg+xml'; break;
      case 'BMP': mimeType = 'image/bmp'; break;
      case 'WEBP': mimeType = 'image/webp'; break;
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      method: 'Image',
      result: dataUrl,
      success: true,
      description: `Detected ${fileType.format} image (${data.length} bytes)`,
      type: 'image',
      imageFormat: fileType.format,
      isDataUrl: true
    };
  } catch (error) {
    console.error('🚀 ~ error:', error);
    return {
      method: 'Image',
      result: '',
      success: false,
      description: 'Failed to process as image',
      type: 'image'
    };
  }
}

export function tryDecodeFromBase64(base64String: string): BinaryDecodingResult {
  try {
    // Clean up the base64 string
    const cleanBase64 = base64String.replace(/[^A-Za-z0-9+/]/g, '');
    const paddedBase64 = cleanBase64 + '='.repeat((4 - cleanBase64.length % 4) % 4);

    const binaryString = atob(paddedBase64);
    const data = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      data[i] = binaryString.charCodeAt(i);
    }

    // Try to detect what the decoded data is
    const fileType = detectFileType(data);

    if (fileType.type === 'image') {
      const imageResult = tryDecodeAsImage(data);
      if (imageResult.success) {
        return {
          ...imageResult,
          method: 'Base64 → Image',
          description: `Decoded Base64 to ${fileType.format} image (${data.length} bytes)`
        };
      }
    }

    // Try as text
    const textResult = tryDecodeAsText(data);
    if (textResult.success) {
      return {
        ...textResult,
        method: 'Base64 → Text',
        description: `Decoded Base64 to text (${data.length} characters)`
      };
    }

    // Return as hex if nothing else works
    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ');
    return {
      method: 'Base64 → Hex',
      result: hex,
      success: true,
      description: `Decoded Base64 to binary data (${data.length} bytes)`,
      type: 'hex'
    };

  } catch (error) {
    console.error('🚀 ~ error:', error);
    return {
      method: 'Base64',
      result: '',
      success: false,
      description: 'Not valid Base64 data',
      type: 'hex'
    };
  }
}

export function generateHexDump(data: Uint8Array, maxBytes: number = 512): string {
  const bytes = data.slice(0, maxBytes);
  let result = '';

  for (let i = 0; i < bytes.length; i += 16) {
    // Address
    const address = i.toString(16).padStart(8, '0');
    result += address + ': ';

    // Hex bytes
    const hexPart = [];
    const textPart = [];

    for (let j = 0; j < 16; j++) {
      if (i + j < bytes.length) {
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

  if (data.length > maxBytes) {
    result += `\n... (${data.length - maxBytes} more bytes)`;
  }

  return result;
}

export function getAllBinaryDecodingAttempts(payload: string): BinaryDecodingResult[] {
  const results: BinaryDecodingResult[] = [];

  // Convert base64 payload to binary data
  let binaryData: Uint8Array;
  try {
    const binaryString = atob(payload);
    binaryData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }
  } catch (error) {
    console.error('🚀 ~ error:', error);
    results.push({
      method: 'Raw Data',
      result: 'Invalid base64 data',
      success: false,
      description: 'Could not decode base64 payload',
      type: 'raw'
    });
    return results;
  }

  // Generate hex dump
  results.push({
    method: 'Hex Dump',
    result: generateHexDump(binaryData),
    success: true,
    description: `Binary data as hex dump (${binaryData.length} bytes)`,
    type: 'hex'
  });

  // Try different decoding methods
  results.push(tryDecodeAsImage(binaryData));
  results.push(tryDecodeAsText(binaryData));
  results.push(tryDecodeAsJson(binaryData));

  // Try treating the original payload as base64-encoded data
  const base64Result = tryDecodeFromBase64(payload);
  if (base64Result.success) {
    results.push(base64Result);
  }

  return results;
}

export function formatBinaryForDisplay(payload: string): {
  preview: string;
  size: number;
  decodingAttempts: BinaryDecodingResult[];
  hasImage: boolean;
} {
  const decodingAttempts = getAllBinaryDecodingAttempts(payload);
  const hasImage = decodingAttempts.some(attempt => attempt.type === 'image' && attempt.success);

  // Use the first successful non-hex decoding for preview, or hex dump
  const bestDecoding = decodingAttempts.find(r => r.success && r.type !== 'hex') || decodingAttempts[0];

  let preview = '';
  if (bestDecoding.type === 'image') {
    preview = `[${bestDecoding.imageFormat} Image - ${bestDecoding.description}]`;
  } else if (bestDecoding.type === 'text') {
    preview = (bestDecoding.result as string).substring(0, 100);
  } else {
    preview = `[Binary Data - ${decodingAttempts[0].description}]`;
  }

  return {
    preview,
    size: payload.length,
    decodingAttempts,
    hasImage
  };
}