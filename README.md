# GhostChat - Secure Anonymous Messaging

A lightweight, anonymous channel-based chat application with complete End-to-End Encryption (E2EE) built with Node.js, Socket.IO, Vanilla JS, and the Web Crypto API.

## Features
- **End-to-End Encrypted:** No messages are ever sent natively over the network. They are encrypted via AES-GCM and unreadable by the server. 
- **Peer-to-Peer ECDH:** Public keys are exchanged over the websocket to securely establish shared secrets for encrypting.
- **Premium Aesthetics:** Dark-mode, glassmorphic UI with micro-animations.
- **Anonymous:** No accounts required. Joining a room grants immediate participation natively securely.

## Prerequisites
You need to install [Node.js](https://nodejs.org/) to run this application since it relies on Node.js to spin up the backend WebSocket server and manage package dependencies.

## Setup Instructions

Once Node.js is installed on your system:

### 1. Start the Backend Server
Open a terminal and navigate to the backend directory:
```bash
cd c:\Users\harsh\.antigravity\secure-chat\backend
npm install
npm start
```
The backend Socket.IO server will start on port `3000`.

### 2. Start the Frontend Application
Open a new terminal and navigate to the frontend directory:
```bash
cd c:\Users\harsh\.antigravity\secure-chat\frontend
```

Since the frontend is built using standard ES Modules and Vanilla HTML/CSS, you can serve it with any HTTP server.
For example, using Vite:
```bash
npm install
npm run dev
```

Alternatively, if you have Python installed, you can simply run:
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in your web browser.

## Security Overview
- When a user joins, an Elliptic Curve Diffie-Hellman (ECDH) keypair is generated (P-256 curve).
- The public key is broadcasted to the room via Socket.io.
- Peers derive an AES-GCM shared secret automatically using the Web Crypto API.
- All messages typed into the input field are encrypted with a random IV block, preventing server-side interception.
