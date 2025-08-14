# The Aetheric Engine

A Next.js application that connects to TCP servers to collect and analyze ASCII and binary messages using the AE Protocol.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env.local` with your server credentials:
   ```bash
   JWT_TOKEN=your_jwt_token_here
   SERVER_API=your_server_host
   AE_SERVER_PORT=8080
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

4. **Open the dashboard:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Start the Engine:** Click "Ignite Engine" to connect to the TCP server
2. **Monitor Progress:** Watch real-time message collection (targets 600 messages)
3. **View Messages:** Browse ASCII and binary messages in paginated tables
4. **Export Data:** Use export buttons for ASCII, Binary, or Mixed data formats
5. **Stop Engine:** Click "Halt Engine" when complete, or it stops automatically at 600 messages

## Available Commands

```bash
npm run dev    # Start development server
npm run build  # Build for production (must pass)
npm run start  # Start production server
npm run lint   # Run ESLint
```

## Features

- **Real-time TCP Communication:** Connects to AE Protocol servers
- **Message Parsing:** Handles both ASCII (`$message;`) and binary (`0xAA` header) formats
- **SQLite Storage:** Persistent message storage with full history
- **Live Dashboard:** Steampunk-themed UI with real-time updates
- **Export Options:** JSON exports with timestamp sorting
- **Auto-pagination:** 40 messages per page for easy browsing
- **Crypto Decoder:** Extracts hidden cryptocurrency data from collected messages

## Crypto Decoder Feature

After collecting messages, the Aetheric Engine can analyze them for hidden cryptographic data.

### Automatic Decoding
- Decoder automatically runs when engine stops after 600 messages
- Searches for Ethereum addresses in binary and ASCII payloads
- Finds BIP39 mnemonic words using the standard wordlist
- Generates seed phrase variants from discovered words chronologically

### Manual Decoding
- Click "Decode Messages" button in the dashboard anytime after collecting messages
- Available even if fewer than 600 messages are collected
- Shows real-time progress with detailed console logging

### Understanding Results

**Discovered Ethereum Addresses**
- Valid 42-character addresses found in message data
- Extracted from both binary (hex decoded) and ASCII sources
- Each address includes a copy button for easy use

**Potential Seed Phrases**
- Generated only from actually found BIP39 words
- Multiple variants: chronological, alphabetical, reverse orders
- Length varies based on number of words discovered
- ⚠️ Test carefully - phrases may be incomplete if insufficient words found

**Found BIP39 Words**
- Individual words discovered in messages with full details:
  - Source message ID and type (ASCII/Binary)
  - Exact position within the message
  - Timestamp for chronological ordering
- Only shows words actually present in your collected data

### Important Notes
- Results depend entirely on the messages you collect
- No pre-programmed addresses or word lists - everything is discovered dynamically
- Different message sets may produce different results
- Seed phrases with fewer than 12 words are incomplete and may not work in wallets
