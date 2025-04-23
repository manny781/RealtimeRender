require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "https://your-netlify-app.netlify.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
let users = {};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket Connection
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // User joins
  socket.on('user-joined', (user) => {
    // Prevent duplicate users
    Object.keys(users).forEach(id => {
      if (users[id]?.id === user.id) {
        io.to(id).emit('force-disconnect', 'Duplicate session');
        delete users[id];
      }
    });

    users[socket.id] = { ...user, socketId: socket.id };
    io.emit('active-users', Object.values(users));
    socket.broadcast.emit('user-joined', user);
  });

  // Message handling
  socket.on('send-message', (data) => {
    if (data.to) {
      // Private message
      io.to(data.to).emit('receive-message', data);
    } else {
      // Group message
      socket.broadcast.emit('receive-message', data);
    }
  });

  // Disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      socket.broadcast.emit('user-left', users[socket.id]);
      delete users[socket.id];
      io.emit('active-users', Object.values(users));
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    users: Object.keys(users).length,
    uptime: process.uptime()
  });
});

// Start server
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});
