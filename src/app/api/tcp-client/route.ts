// AI-Assisted
import { NextRequest, NextResponse } from 'next/server';
import { TcpClient, TcpClientConfig } from '@/lib/tcp-client';
import { initDatabase } from '@/lib/database';

// Global TCP client instance
let tcpClientInstance: TcpClient | null = null;
let clientEvents: Array<{ timestamp: Date; event: string; data?: unknown }> = [];

// Event handler to collect events from TCP client
const handleTcpEvent = (event: string, data?: unknown) => {
  clientEvents.push({ timestamp: new Date(), event, data });
  // Keep only last 100 events to prevent memory leaks
  if (clientEvents.length > 100) {
    clientEvents = clientEvents.slice(-100);
  }
};

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    // Initialize database
    await initDatabase();

    switch (action) {
      case 'start':
        if (tcpClientInstance?.isActive()) {
          return NextResponse.json({ 
            error: 'TCP client is already running' 
          }, { status: 400 });
        }

        // Get configuration from environment
        const config: TcpClientConfig = {
          host: process.env.SERVER_API || 'localhost',
          port: parseInt(process.env.AE_SERVER_PORT || '8080'),
          jwtToken: process.env.JWT_TOKEN || '',
          targetMessageCount: 600
        };

        if (!config.jwtToken) {
          return NextResponse.json({ 
            error: 'JWT_TOKEN not found in environment variables' 
          }, { status: 400 });
        }

        tcpClientInstance = new TcpClient(config, handleTcpEvent);
        clientEvents = []; // Reset events
        
        try {
          await tcpClientInstance.start();
          return NextResponse.json({ 
            message: 'TCP client started successfully',
            config: { ...config, jwtToken: '***' } // Hide JWT in response
          });
        } catch (error) {
          return NextResponse.json({ 
            error: `Failed to start TCP client: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, { status: 500 });
        }

      case 'stop':
        if (!tcpClientInstance) {
          return NextResponse.json({ 
            error: 'No TCP client instance found' 
          }, { status: 400 });
        }

        try {
          await tcpClientInstance.stop();
          const finalStats = tcpClientInstance.getStats();
          tcpClientInstance = null;
          return NextResponse.json({ 
            message: 'TCP client stopped successfully',
            finalStats
          });
        } catch (error) {
          return NextResponse.json({ 
            error: `Failed to stop TCP client: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, { status: 500 });
        }

      case 'status':
        if (!tcpClientInstance) {
          return NextResponse.json({ 
            isRunning: false,
            stats: null,
            events: clientEvents.slice(-10) // Last 10 events
          });
        }

        const stats = await tcpClientInstance.refreshStats();
        return NextResponse.json({
          isRunning: tcpClientInstance.isActive(),
          stats,
          events: clientEvents.slice(-10)
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use "start", "stop", or "status"' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Return current status without requiring POST body
    if (!tcpClientInstance) {
      return NextResponse.json({ 
        isRunning: false,
        stats: null,
        events: clientEvents.slice(-10)
      });
    }

    const stats = await tcpClientInstance.refreshStats();
    return NextResponse.json({
      isRunning: tcpClientInstance.isActive(),
      stats,
      events: clientEvents.slice(-10)
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}