require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const forumRoutes = require('./routes/forumRoutes');
const { authenticateJWT } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());

// Routen
app.use('/api/forum', forumRoutes);

// WebSocket Verbindung
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
