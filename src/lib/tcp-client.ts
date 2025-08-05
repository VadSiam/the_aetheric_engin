// AI-Assisted
import { Socket } from 'net';
import { getMessageCounts, insertAsciiMessage, insertBinaryMessage } from './database';
import { MessageParser, ParsedMessage } from './message-parser';

export interface TcpClientConfig {
  host: string;
  port: number;
  jwtToken: string;
  targetMessageCount: number;
}

export interface TcpClientStats {
  isConnected: boolean;
  isAuthenticated: boolean;
  messagesReceived: number;
  asciiMessages: number;
  binaryMessages: number;
  errors: string[]; // Real system errors only
  startTime?: Date;
  endTime?: Date;
  bufferSize: number;
}

// Add an enum for event types to make them type-safe
enum TcpClientEventType {
  STATUS = 'status',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  AUTHENTICATED = 'authenticated',
  MESSAGE = 'message',
  STATS = 'stats',
  STOPPED = 'stopped'
}

interface TcpClientEventData {
  type?: 'ascii' | 'binary';
  payload?: string;
  size?: number;
  status?: {
    connected: boolean;
    authenticated: boolean;
  };
  error?: string;
  connectionId?: string;
  bufferSize?: number;
  messageType?: 'ascii' | 'binary';
  messageCount?: number;
}

// Update the event handler type to use the enum
export type TcpClientEventHandler = (event: TcpClientEventType, data?: TcpClientEventData) => void;

export class TcpClient {
  private socket: Socket | null = null;
  private parser: MessageParser = new MessageParser();
  private config: TcpClientConfig;
  private stats: TcpClientStats;
  private eventHandler?: TcpClientEventHandler;
  private isRunning = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;

  constructor(config: TcpClientConfig, eventHandler?: TcpClientEventHandler) {
    this.config = config;
    this.eventHandler = eventHandler;
    this.stats = {
      isConnected: false,
      isAuthenticated: false,
      messagesReceived: 0,
      asciiMessages: 0,
      binaryMessages: 0,
      errors: [],
      bufferSize: 0
    };
    // Enable debug mode for troubleshooting
    this.parser.debugMode = true;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('TCP client is already running');
    }

    this.isRunning = true;
    this.stats.startTime = new Date();
    this.stats.errors = [];
    this.emitEvent(TcpClientEventType.STATUS, { payload: 'Starting TCP client...' });

    return new Promise((resolve, reject) => {
      this.connectWithRetry()
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }

  private async connectWithRetry(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new Socket();

      // Set up event handlers
      this.socket.on('connect', () => {
        this.stats.isConnected = true;
        this.reconnectAttempts = 0;
        this.emitEvent(TcpClientEventType.CONNECTED, {
          payload: `Connected to ${this.config.host}:${this.config.port}`
        });
        this.authenticate();
      });

      this.socket.on('data', (data: Buffer) => {
        this.handleData(data);
      });

      this.socket.on('close', (hadError) => {
        this.stats.isConnected = false;
        this.stats.isAuthenticated = false;
        this.emitEvent(TcpClientEventType.DISCONNECTED, {
          payload: hadError ? 'Connection closed with error' : 'Connection closed'
        });

        if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.emitEvent(TcpClientEventType.STATUS, {
            payload: `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
          });
          setTimeout(() => {
            this.connectWithRetry().catch(reject);
          }, 2000);
        }
      });

      this.socket.on('error', (error: Error) => {
        const errorMsg = `Socket error: ${error.message}`;
        this.stats.errors.push(errorMsg);
        this.emitEvent(TcpClientEventType.ERROR, { error: errorMsg });

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts: ${error.message}`));
        }
      });

      // Attempt connection
      this.emitEvent(TcpClientEventType.STATUS, { payload: `Connecting to ${this.config.host}:${this.config.port}...` });
      this.socket.connect(this.config.port, this.config.host);

      // Initial connection timeout
      setTimeout(() => {
        if (!this.stats.isConnected) {
          resolve(); // Let the retry logic handle it
        } else {
          resolve();
        }
      }, 5000);
    });
  }

  private authenticate(): void {
    if (!this.socket) return;

    const authMessage = `AUTH ${this.config.jwtToken}`;
    this.emitEvent(TcpClientEventType.STATUS, { payload: 'Sending authentication...' });
    this.socket.write(authMessage);

    // We'll assume authentication is successful if we start receiving messages
    // The AE protocol doesn't specify an auth response
    setTimeout(() => {
      if (this.stats.isConnected) {
        this.stats.isAuthenticated = true;
        this.emitEvent(TcpClientEventType.AUTHENTICATED, 'Authentication successful');
      }
    }, 1000);
  }

  private async handleData(data: Buffer): Promise<void> {
    try {
      const messages = this.parser.addData(data);
      this.stats.bufferSize = this.parser.getBufferSize();

      for (const message of messages) {
        await this.processMessage(message);
      }

      // Check if we've reached the target message count
      if (this.stats.messagesReceived >= this.config.targetMessageCount) {
        this.emitEvent(TcpClientEventType.STATUS, `Target of ${this.config.targetMessageCount} messages reached!`);
        await this.stop();
      }

    } catch (error) {
      const errorMsg = `Error processing data: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.stats.errors.push(errorMsg);
      this.emitEvent(TcpClientEventType.ERROR, { error: errorMsg });
    }
  }

  private async processMessage(message: ParsedMessage): Promise<void> {
    // Store ALL messages regardless of validation status (as per spec requirement)
    try {
      if (message.type === 'ascii') {
        await insertAsciiMessage(message.payload);
        this.stats.asciiMessages++;
        this.emitEvent(TcpClientEventType.MESSAGE, {
          type: 'ascii',
          payload: message.payload
        });
      } else {
        await insertBinaryMessage(message.payload, message.payloadSize);
        this.stats.binaryMessages++;
        this.emitEvent(TcpClientEventType.MESSAGE, {
          type: 'binary',
          size: message.payloadSize
        });
      }

      this.stats.messagesReceived++;
      this.emitEvent(TcpClientEventType.STATS, this.stats);


    } catch (error) {
      const errorMsg = `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.stats.errors.push(errorMsg);
      this.emitEvent(TcpClientEventType.ERROR, { error: errorMsg });
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stats.endTime = new Date();

    if (this.socket && this.stats.isConnected) {
      // Send STATUS command to stop the server from sending more messages
      this.emitEvent(TcpClientEventType.STATUS, { payload: 'Sending STATUS command...' });
      this.socket.write('STATUS');

      // Wait a bit for any remaining data
      await this.drainSocket();

      // Close the connection
      this.socket.destroy();
    }

    this.emitEvent(TcpClientEventType.STOPPED, 'TCP client stopped');
  }

  private async drainSocket(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve();
        return;
      }

      let dataReceived = false;
      const timeout = setTimeout(() => {
        resolve();
      }, 2000); // 2 second timeout

      const onData = (data: Buffer) => {
        dataReceived = true;
        this.handleData(data); // Process any final messages
      };

      this.socket.on('data', onData);

      // Check periodically if data is still coming
      const drainCheck = setInterval(() => {
        if (!dataReceived) {
          clearInterval(drainCheck);
          clearTimeout(timeout);
          this.socket!.off('data', onData);
          resolve();
        }
        dataReceived = false;
      }, 500);
    });
  }

  getStats(): TcpClientStats {
    return { ...this.stats };
  }

  async refreshStats(): Promise<TcpClientStats> {
    try {
      const counts = await getMessageCounts();
      this.stats.asciiMessages = counts.ascii;
      this.stats.binaryMessages = counts.binary;
      this.stats.messagesReceived = counts.total;
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
    return this.getStats();
  }

  isActive(): boolean {
    return this.isRunning;
  }

  private emitEvent(event: TcpClientEventType, data?: TcpClientEventData | string): void {
    if (this.eventHandler) {
      // Convert string data to proper event data structure
      const eventData: TcpClientEventData = typeof data === 'string'
        ? { payload: data }
        : data || {};

      this.eventHandler(event, eventData);
    }
  }
}