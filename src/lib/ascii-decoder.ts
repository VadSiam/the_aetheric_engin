// AI-Assisted

export interface DecodingResult {
  method: string;
  result: string;
  success: boolean;
  description: string;
}

export function decodeAsciiPayload(payload: string): string {
  let decoded = '';

  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    const code = payload.charCodeAt(i);

    // Handle common escape sequences
    if (code === 0x09) decoded += '\\t'; // Tab
    else if (code === 0x0A) decoded += '\\n'; // Newline
    else if (code === 0x0D) decoded += '\\r'; // Carriage return
    else if (code === 0x00) decoded += '\\0'; // Null
    else if (code === 0x07) decoded += '\\a'; // Bell
    else if (code === 0x08) decoded += '\\b'; // Backspace
    else if (code === 0x0C) decoded += '\\f'; // Form feed
    else if (code === 0x0B) decoded += '\\v'; // Vertical tab
    else if (code === 0x1B) decoded += '\\e'; // Escape

    // Handle other control characters (0x00-0x1F and 0x7F-0xFF)
    else if (code < 0x20 || code > 0x7E) {
      decoded += `\\x${code.toString(16).padStart(2, '0').toUpperCase()}`;
    }

    // Handle printable ASCII characters
    else {
      decoded += char;
    }
  }

  return decoded;
}

export function tryBase64Decode(payload: string): DecodingResult {
  try {
    // Check if it looks like Base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(payload.trim())) {
      return {
        method: 'Base64',
        result: payload,
        success: false,
        description: 'Not valid Base64 format'
      };
    }

    const decoded = atob(payload.trim());
    return {
      method: 'Base64',
      result: decoded,
      success: true,
      description: 'Successfully decoded from Base64'
    };
  } catch (error) {
    console.error('🚀 ~ error:', error)
    return {
      method: 'Base64',
      result: payload,
      success: false,
      description: 'Base64 decode failed'
    };
  }
}

export function tryUrlDecode(payload: string): DecodingResult {
  try {
    const decoded = decodeURIComponent(payload);
    const hasEncodedChars = payload.includes('%') || payload.includes('+');

    if (decoded !== payload && hasEncodedChars) {
      return {
        method: 'URL',
        result: decoded,
        success: true,
        description: 'Successfully decoded URL encoding'
      };
    }

    return {
      method: 'URL',
      result: payload,
      success: false,
      description: 'No URL encoding detected'
    };
  } catch (error) {
    console.error('🚀 ~ error:', error)
    return {
      method: 'URL',
      result: payload,
      success: false,
      description: 'URL decode failed'
    };
  }
}

export function tryHexDecode(payload: string): DecodingResult {
  try {
    // Check if it looks like hex
    const hexRegex = /^[0-9A-Fa-f\s]+$/;
    if (!hexRegex.test(payload.trim())) {
      return {
        method: 'Hex',
        result: payload,
        success: false,
        description: 'Not valid hex format'
      };
    }

    const cleanPayload = payload.replace(/\s/g, '');
    if (cleanPayload.length % 2 !== 0) {
      return {
        method: 'Hex',
        result: payload,
        success: false,
        description: 'Hex string length must be even'
      };
    }

    let decoded = '';
    for (let i = 0; i < cleanPayload.length; i += 2) {
      const hexByte = cleanPayload.substr(i, 2);
      const byte = parseInt(hexByte, 16);
      decoded += String.fromCharCode(byte);
    }

    return {
      method: 'Hex',
      result: decoded,
      success: true,
      description: 'Successfully decoded from hex'
    };
  } catch (error) {
    console.error('🚀 ~ error:', error)
    return {
      method: 'Hex',
      result: payload,
      success: false,
      description: 'Hex decode failed'
    };
  }
}

export function getAllDecodingAttempts(payload: string): DecodingResult[] {
  const results: DecodingResult[] = [];

  // Always include the original
  results.push({
    method: 'Original',
    result: payload,
    success: true,
    description: 'Original ASCII characters'
  });

  // Try escape sequence decoding
  const escaped = decodeAsciiPayload(payload);
  if (escaped !== payload) {
    results.push({
      method: 'Escaped',
      result: escaped,
      success: true,
      description: 'Control characters as escape sequences'
    });
  }

  // Try various decodings
  results.push(tryBase64Decode(payload));
  results.push(tryUrlDecode(payload));
  results.push(tryHexDecode(payload));

  // Try Base64 on the original if it failed, in case of padding issues
  if (!results.find(r => r.method === 'Base64' && r.success)) {
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const paddedResult = tryBase64Decode(paddedPayload);
    if (paddedResult.success) {
      results.push({
        ...paddedResult,
        description: 'Base64 decoded with padding added'
      });
    }
  }

  return results;
}

export function isTextLikePayload(payload: string): boolean {
  // Check if payload mostly contains printable characters
  let printableCount = 0;
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    if ((code >= 0x20 && code <= 0x7E) || code === 0x09 || code === 0x0A || code === 0x0D) {
      printableCount++;
    }
  }

  // Consider it text-like if 80% or more characters are printable
  return payload.length === 0 || (printableCount / payload.length) >= 0.8;
}

export function getPayloadPreview(payload: string, maxLength: number = 50): string {
  const decoded = decodeAsciiPayload(payload);
  if (decoded.length <= maxLength) {
    return decoded;
  }
  return decoded.substring(0, maxLength) + '...';
}

export function formatPayloadForDisplay(payload: string): {
  preview: string;
  full: string;
  isTextLike: boolean;
  length: number;
  decodingAttempts: DecodingResult[];
} {
  const decodingAttempts = getAllDecodingAttempts(payload);

  // Use the best successful decoding for preview, or original if none work
  const bestDecoding = decodingAttempts.find(r => r.success && r.method !== 'Original') || decodingAttempts[0];

  return {
    preview: getPayloadPreview(bestDecoding.result, 100),
    full: bestDecoding.result,
    isTextLike: isTextLikePayload(payload),
    length: payload.length,
    decodingAttempts
  };
}