// AI-Assisted
export interface ParsedAsciiMessage {
  type: 'ascii';
  payload: string;
  isValid: boolean;
  error?: string;
}

export interface ParsedBinaryMessage {
  type: 'binary';
  header: number;
  payloadSize: number;
  payload: Buffer;
  isValid: boolean;
  error?: string;
}

export type ParsedMessage = ParsedAsciiMessage | ParsedBinaryMessage;

export class MessageParser {
  private buffer: Buffer = Buffer.alloc(0);
  private readonly ASCII_START_MARKER = '$';
  private readonly ASCII_END_MARKER = ';';
  private readonly BINARY_HEADER = 0xAA;
  public debugMode = false; // For logging raw bytes

  addData(data: Buffer): ParsedMessage[] {
    this.buffer = Buffer.concat([this.buffer, data]);
    const messages: ParsedMessage[] = [];

    while (this.buffer.length > 0) {
      const message = this.tryParseMessage();
      if (message) {
        messages.push(message);
      } else {
        break; // No complete message found, wait for more data
      }
    }

    return messages;
  }

  private tryParseMessage(): ParsedMessage | null {
    if (this.buffer.length === 0) return null;

    // Check if it's a binary message (starts with 0xAA)
    if (this.buffer[0] === this.BINARY_HEADER) {
      return this.tryParseBinaryMessage();
    }

    // Otherwise, try to parse as ASCII
    return this.tryParseAsciiMessage();
  }

  private tryParseAsciiMessage(): ParsedAsciiMessage | null {
    // Only parse as ASCII if we don't have binary data
    if (this.buffer.length > 0 && this.buffer[0] === this.BINARY_HEADER) {
      return null; // This is binary data
    }

    const bufferStr = this.buffer.toString('ascii', 0, Math.min(this.buffer.length, 2000)); // Limit conversion

    if (this.debugMode) {
      console.log('ASCII Parse attempt - Buffer:', this.buffer.subarray(0, 50));
      console.log('ASCII Parse attempt - String:', bufferStr.substring(0, 100));
    }

    // Look for start marker
    const startIdx = bufferStr.indexOf(this.ASCII_START_MARKER);
    if (startIdx === -1) {
      // No start marker found, might be binary data or incomplete
      // Skip one byte to avoid getting stuck
      if (this.buffer.length > 1000) { // Avoid infinite buffer growth
        this.buffer = this.buffer.subarray(1);
      }
      return null;
    }

    // Look for end marker after start marker
    const endIdx = bufferStr.indexOf(this.ASCII_END_MARKER, startIdx + 1);
    if (endIdx === -1) {
      // No end marker found yet, need more data
      return null;
    }

    // Extract the complete message (payload EXCLUDES the markers)
    const payload = bufferStr.substring(startIdx + 1, endIdx);
    const totalMessageLength = endIdx + 1; // Include end marker

    // Remove processed bytes from buffer
    this.buffer = this.buffer.subarray(totalMessageLength);

    if (this.debugMode) {
      console.log('ASCII Message found - Payload:', payload);
      console.log('ASCII Message - Start:', startIdx, 'End:', endIdx);
    }

    return {
      type: 'ascii',
      payload,
      isValid: true
    };
  }

  private tryParseBinaryMessage(): ParsedBinaryMessage | null {
    // Need at least 6 bytes for header (1) + payload size (5)
    if (this.buffer.length < 6) {
      return null;
    }

    // Verify header
    const header = this.buffer[0];
    if (header !== this.BINARY_HEADER) {
      // This shouldn't happen as we check before calling, but safety first
      this.buffer = this.buffer.subarray(1);
      return {
        type: 'binary',
        header,
        payloadSize: 0,
        payload: Buffer.alloc(0),
        isValid: false,
        error: 'Invalid header, expected 0xAA'
      };
    }

    // Read payload size (5 bytes, little-endian)
    const payloadSizeBytes = this.buffer.subarray(1, 6);
    // Read as 32-bit first, then check if 5th byte exists for larger sizes
    let payloadSize = payloadSizeBytes.readUInt32LE(0);
    if (payloadSizeBytes.length >= 5 && payloadSizeBytes[4] !== 0) {
      // Handle larger sizes if needed, but be careful about overflow
      const highByte = payloadSizeBytes[4];
      payloadSize = payloadSize + (highByte * 0x100000000);
    }

    if (this.debugMode) {
      console.log('Binary Message - Header:', header.toString(16), 'PayloadSize:', payloadSize);
      console.log('Binary Message - SizeBytes:', Array.from(payloadSizeBytes).map(b => b.toString(16)).join(' '));
    }

    // Validate payload size (reasonable limits to prevent memory issues)
    if (payloadSize > 1024 * 1024 * 1024) { // 1GB limit
      this.buffer = this.buffer.subarray(6); // Skip this message
      return {
        type: 'binary',
        header,
        payloadSize,
        payload: Buffer.alloc(0),
        isValid: false,
        error: 'Payload size exceeds reasonable limit (1GB)'
      };
    }

    // Check if we have the complete message
    const totalMessageSize = 6 + payloadSize;
    if (this.buffer.length < totalMessageSize) {
      // Need more data
      return null;
    }

    // Extract payload
    const payload = this.buffer.subarray(6, totalMessageSize);

    // Remove processed bytes from buffer
    this.buffer = this.buffer.subarray(totalMessageSize);

    return {
      type: 'binary',
      header,
      payloadSize,
      payload,
      isValid: true
    };
  }

  // Get remaining buffer size for monitoring
  getBufferSize(): number {
    return this.buffer.length;
  }

  // Clear buffer (useful for testing or error recovery)
  clearBuffer(): void {
    this.buffer = Buffer.alloc(0);
  }

  // Static method to validate a single ASCII message. we don't validate for now
  static validateAsciiMessage(message: string): { isValid: boolean; error?: string } {
    return { isValid: true };
  }

  // Static method to validate binary message structure
  static validateBinaryMessage(header: number, payloadSize: number, payload: Buffer): { isValid: boolean; error?: string } {
    if (header !== 0xAA) {
      return { isValid: false, error: 'Invalid header, expected 0xAA' };
    }

    if (payloadSize !== payload.length) {
      return { isValid: false, error: 'Payload size mismatch' };
    }

    if (payloadSize > 1024 * 1024 * 1024) {
      return { isValid: false, error: 'Payload size exceeds reasonable limit' };
    }

    return { isValid: true };
  }
}