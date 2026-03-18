const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows any origin since we may run Vite on 5173
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // Notify others in the room that a new user joined
    socket.to(roomId).emit('user_joined', socket.id);
  });

  // Relay public keys for End-to-End Encryption
  socket.on('public_key_exchange', (data) => {
    // data: { roomId, senderId, targetId (optional), publicKey }
    if (data.targetId) {
      // Send directly to the target user
      socket.to(data.targetId).emit('public_key_exchange', {
        senderId: socket.id,
        publicKey: data.publicKey
      });
    } else {
      // Broadcast to room if no specific target
      socket.to(data.roomId).emit('public_key_exchange', {
        senderId: socket.id,
        publicKey: data.publicKey
      });
    }
  });

  socket.on('send_message', (data) => {
    // data: { roomId, encryptedMessage, iv, senderId, ... }
    // The server doesn't decrypt anything, just forwards it.
    socket.to(data.roomId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    io.emit('user_disconnected', socket.id); // Broadcasting globally for simplicity, or we could track rooms
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Secure Chat Backend running on port ${PORT}`);
});
