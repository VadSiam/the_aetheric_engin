// AI-Assisted
import { NextRequest, NextResponse } from 'next/server';
import { 
  getAsciiMessages, 
  getBinaryMessages, 
  getMessageCounts, 
  clearAllMessages,
  initDatabase 
} from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const action = searchParams.get('action');

    if (action === 'counts') {
      const counts = await getMessageCounts();
      return NextResponse.json(counts);
    }

    if (action === 'clear') {
      await clearAllMessages();
      return NextResponse.json({ message: 'All messages cleared successfully' });
    }

    switch (type) {
      case 'ascii':
        const asciiMessages = await getAsciiMessages(limit);
        const asciiWithType = asciiMessages.map(msg => ({ ...msg, type: 'Ascii' }));
        return NextResponse.json({
          type: 'ascii',
          messages: asciiWithType,
          count: asciiWithType.length
        });

      case 'binary':
        const binaryMessages = await getBinaryMessages(limit);
        // Convert Buffer to base64 for JSON serialization and add type
        const serializedBinaryMessages = binaryMessages.map(msg => ({
          ...msg,
          payload: msg.payload.toString('base64'),
          type: 'Binary'
        }));
        return NextResponse.json({
          type: 'binary',
          messages: serializedBinaryMessages,
          count: serializedBinaryMessages.length
        });

      case 'mixed':
        // Get all messages and combine them sorted by timestamp
        const [allAscii, allBinary, counts] = await Promise.all([
          getAsciiMessages(limit),
          getBinaryMessages(limit),
          getMessageCounts()
        ]);

        // Add type field and prepare for sorting
        const asciiTyped = allAscii.map(msg => ({ ...msg, type: 'Ascii' }));
        const binaryTyped = allBinary.map(msg => ({
          ...msg,
          payload: msg.payload.toString('base64'),
          type: 'Binary'
        }));

        // Combine and sort by timestamp (newest first)
        const mixedMessages = [...asciiTyped, ...binaryTyped]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);

        return NextResponse.json({
          type: 'mixed',
          messages: mixedMessages,
          count: mixedMessages.length,
          totals: counts
        });

      case 'all':
      default:
        const [ascii, binary, allCounts] = await Promise.all([
          getAsciiMessages(Math.floor(limit / 2)),
          getBinaryMessages(Math.floor(limit / 2)),
          getMessageCounts()
        ]);

        const serializedBinary = binary.map(msg => ({
          ...msg,
          payload: msg.payload.toString('base64'),
          type: 'Binary'
        }));

        const typedAscii = ascii.map(msg => ({ ...msg, type: 'Ascii' }));

        return NextResponse.json({
          ascii: {
            messages: typedAscii,
            count: typedAscii.length
          },
          binary: {
            messages: serializedBinary,
            count: serializedBinary.length
          },
          totals: allCounts
        });
    }

  } catch (error) {
    console.error('Messages API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve messages' 
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await initDatabase();
    await clearAllMessages();
    return NextResponse.json({ message: 'All messages cleared successfully' });
  } catch (error) {
    console.error('Delete API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear messages' 
    }, { status: 500 });
  }
}