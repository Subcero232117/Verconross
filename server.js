import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacenamiento en memoria para usuarios y mensajes
const connectedUsers = new Map();
const chatMessages = [];

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Gestión de Socket.io
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Manejar registro de usuario
  socket.on('register-user', (username) => {
    connectedUsers.set(socket.id, username);
    io.emit('users-update', Array.from(connectedUsers.values()));
    
    // Enviar historial de mensajes al nuevo usuario
    socket.emit('chat-history', chatMessages);
  });

  // Manejar mensajes de chat
  socket.on('chat-message', (message) => {
    const username = connectedUsers.get(socket.id);
    const newMessage = {
      id: Date.now(),
      user: username,
      text: message,
      timestamp: new Date().toISOString()
    };
    
    chatMessages.push(newMessage);
    if (chatMessages.length > 100) chatMessages.shift(); // Mantener solo últimos 100 mensajes
    
    io.emit('new-message', newMessage);
  });

  // Manejar eventos de video
  socket.on('video-loaded', (videoId) => {
    socket.join(`video-${videoId}`);
    io.to(`video-${videoId}`).emit('video-sync-request');
  });

  socket.on('video-state-update', (data) => {
    socket.broadcast.emit('video-state-change', {
      currentTime: data.currentTime,
      state: data.state,
      videoId: data.videoId
    });
  });

  socket.on('video-time-update', (data) => {
    socket.broadcast.emit('video-time-sync', {
      currentTime: data.currentTime,
      videoId: data.videoId
    });
  });

  // Manejar desconexión
  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    io.emit('users-update', Array.from(connectedUsers.values()));
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
