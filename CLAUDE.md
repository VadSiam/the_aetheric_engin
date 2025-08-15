# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Aetheric Engine is a Next.js 15 application that connects to a TCP server to receive and parse both ASCII and binary messages. The application implements the "AE Protocol" for communication, where ASCII messages are delimited by `$` and `;` markers, and binary messages have a `0xAA` header followed by a 5-byte payload size.

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build (must pass without TypeScript errors)
npm run build

# Start production server
npm start

# Linting
npm run lint
```

**Important**: Always run `npm run build` after making significant changes to ensure TypeScript compilation succeeds. The build must pass before committing changes.

## Core Architecture

### TCP Client System (`src/lib/tcp-client.ts`)
- **TcpClient**: Main class that manages socket connections, authentication, and message collection
- Connects to server using JWT authentication via `AUTH {token}` command
- Automatically reconnects up to 3 times on connection failure
- Stops automatically after reaching target message count (default: 600)
- Sends `STATUS` command when stopping to signal server

### Message Parsing (`src/lib/message-parser.ts`)
- **MessageParser**: Handles stream parsing of mixed ASCII/binary data
- ASCII messages: `$payload;` format
- Binary messages: `0xAA` + 5-byte size (little-endian) + payload
- Maintains internal buffer for incomplete messages
- Debug mode available for troubleshooting

### Database Layer (`src/lib/database.ts`)
- SQLite database with two main tables: `msgascii` and `msgbinary`
- **msgascii**: `id`, `payload`, `timestamp`, `message_length`
- **msgbinary**: `id`, `payload` (BLOB), `payload_size`, `timestamp`, `header_verified`
- Database file: `aetheric_engine.db` in project root

### API Routes
- **`/api/tcp-client`**: Controls TCP client (start/stop/status)
- **`/api/messages`**: Retrieves messages with multiple export formats:
  - `type=ascii`: ASCII messages only with `type: 'Ascii'` field
  - `type=binary`: Binary messages only with `type: 'Binary'` field
  - `type=mixed`: Combined messages sorted by timestamp
  - `type=all`: Separate ascii/binary objects for UI display
- **`/api/nft-check`**: Batch-checks Ethereum addresses for NFT ownership using Etherscan API

### UI Components
- **Dashboard**: Main control panel with steampunk theming
- **MessageTable**: Displays messages with pagination (40 items/page)
- **ConnectionStatus**: Shows real-time connection state
- **DecoderResults**: Displays decoded Ethereum addresses and BIP39 words with pagination
- **NFTChecker**: Progressive batch NFT checking with live results and export functionality

## Environment Configuration

Required environment variables in `.env.local`:
```
JWT_TOKEN=<jwt_token_for_authentication>
SERVER_API=<tcp_server_host>
AE_SERVER_PORT=<tcp_server_port>
```

## Key Implementation Details

### Message Processing Flow
1. TCP data received → MessageParser.addData()
2. Parsed messages → TcpClient.processMessage()
3. Messages stored in database via insertAsciiMessage/insertBinaryMessage
4. UI polls `/api/tcp-client` for status updates
5. UI fetches messages via `/api/messages?type=all`

### Binary Message Handling
- Binary payload stored as Buffer in database
- Converted to Base64 for JSON transport to frontend
- 0xAA header used as decoding key (advanced decoders available but simplified UI shows raw data)
- Size validation prevents memory issues (1GB limit)

### Auto-Refresh Logic
- Dashboard auto-refreshes every 2 seconds when engine running
- MessageTable auto-refreshes every 5 seconds when engine running AND below 600 messages
- Auto-refresh disabled when engine stops
- Manual refresh triggers available on all components

### Export Functionality
- Three export buttons: "Export ASCII", "Export Binary", "Export Mix Data"
- All exports include `type` field (`'Ascii'` or `'Binary'`) 
- Mixed export combines both message types sorted chronologically
- Downloads as JSON files with date stamps

## Crypto Analysis System

### Client-Side Decoder (`src/lib/client-decoder.ts`)
- **AethericDecoder**: Extracts cryptocurrency secrets from collected messages
- Searches for Ethereum addresses in binary hex data using pattern `/[a-f0-9]{40}/gi`
- Dynamically finds BIP39 words from standard wordlist in both ASCII and binary messages
- Generates seed phrase variants in chronological order
- No hardcoded values - all discovery is dynamic based on actual message content

### NFT Checking System (`src/components/NFTChecker.tsx`, `/api/nft-check`)
- **Progressive Batch Processing**: Checks addresses in batches of 50 to avoid API rate limits
- **Live Result Updates**: Shows NFT discoveries immediately after each batch completes
- **Etherscan Integration**: Uses public ERC-721 transaction API to detect NFT ownership
- **State Management**: Accumulates results across batches with offset/limit tracking
- **Export Functionality**: Downloads JSON with NFT addresses and collection metadata

#### NFT API Route Parameters
```typescript
POST /api/nft-check
{
  addresses: string[],
  offset?: number,     // Starting index (default: 0)
  limit?: number       // Batch size (default: 50)
}
```

#### NFT Response Format
```typescript
{
  success: boolean,
  results: NFTData[],
  batch: {
    offset: number,
    limit: number,
    total: number,
    processed: number,
    hasMore: boolean
  }
}
```

### Message Interpretation Logic
- BIP39 words found chronologically: "all aim add art any box" interpreted as NFT-related instructions
- "All addresses, aim to add art to any wallet box" - leading to NFT checking implementation
- Uses "forgotten year 2000" clue from steampunk theme (still under research)

## Development Notes

### When Making Changes
1. Always run `npm run build` to check TypeScript compilation
2. Test both ASCII and binary message handling
3. Verify auto-refresh behavior during engine start/stop cycles
4. Test pagination when message count exceeds 40 items
5. Test NFT batch processing with rate limiting
6. Verify decoder finds addresses/words dynamically without hardcoded values

### Common Patterns
- Use `await initDatabase()` before any database operations
- Convert Buffer to Base64 for JSON serialization: `buffer.toString('base64')`
- Follow existing steampunk theming with Tailwind CSS gradients
- Maintain separation between ASCII and binary message processing paths
- Use progressive state updates for long-running operations (NFT checking)
- Rate limit external API calls (200ms delay between Etherscan requests)

### Error Handling
- TCP client stores real system errors in `stats.errors[]`
- Invalid messages are stored in database regardless of validation status
- UI displays connection status and system errors prominently
- Database operations wrapped in try-catch with proper error propagation
- NFT checking handles API rate limits and network errors gracefully
- Browser caching issues resolved by clearing `.next` folder and hard refresh

### NFT Checking Implementation Details
- **Batch Processing**: Uses offset/limit to process large address sets progressively
- **API Rate Limiting**: 200ms delay between Etherscan requests, 50 addresses per batch
- **Progressive UI Updates**: Results appear after each batch, not at the end
- **State Persistence**: Tracks currentOffset, totalProcessed, and accumulated results
- **Export Format**: JSON with timestamp, total counts, and collection metadata
- **Error Recovery**: Continues processing remaining batches if individual requests fail