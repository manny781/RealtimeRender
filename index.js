require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: process.env.NODE_ENV === 'development'
      ? "http://localhost:3000"
      : [process.env.FRONTEND_URL, "https://your-render-app.onrender.com"],
    methods: ["GET", "POST"]
  }
});
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
let users = {};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Routes
app.post('/upload', upload.single('profilePic'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// Socket.io
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on('user-joined', (user) => {
    if (!user?.id) return;
    
    // Clean previous connections with same user ID
    Object.entries(users).forEach(([id, u]) => {
      if (u.id === user.id) {
        io.to(id).emit('force-disconnect', 'New login detected');
        delete users[id];
      }
    });

    users[socket.id] = { ...user, socketId: socket.id };
    io.emit('active-users', Object.values(users));
    socket.broadcast.emit('user-joined', user);
  });

  socket.on('send-message', (data) => {
    if (!data?.message) return;
    
    if (data.to) {
      // Private message
      io.to(data.to).emit('receive-message', data);
    } else {
      // Group message
      socket.broadcast.emit('receive-message', data);
    }
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      socket.broadcast.emit('user-left', users[socket.id]);
      delete users[socket.id];
      io.emit('active-users', Object.values(users));
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    users: Object.keys(users).length,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  }
});