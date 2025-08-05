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
