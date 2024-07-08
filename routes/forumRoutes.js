const express = require('express');
const router = express.Router();
const firestore = require('../config/firestore');
const { authenticateJWT } = require('../middleware/auth');

// WebSocket Server
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

// Verbindung zur Firestore Collection für Chatrooms
const chatroomsCollection = firestore.collection('chatrooms');

// WebSocket Verbindung initialisieren
wss.on('connection', (ws, req) => {
    // Prüfe, ob der Benutzer eingeloggt ist
    const token = req.query.token;
    if (!token) {
        ws.close(1008, 'Token required');
        return;
    }

    // Verifiziere JWT Token
    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
            ws.close(1008, 'Invalid token');
            return;
        }

        // Prüfe, ob der Benutzer im Modul eingetragen ist
        const moduleId = req.query.moduleId;
        const moduleRef = firestore.collection('modules').doc(moduleId);
        const moduleDoc = await moduleRef.get();

        if (!moduleDoc.exists) {
            ws.close(1008, 'Module not found');
            return;
        }

        // Füge den Benutzer dem Chatraum hinzu
        const chatroomId = `${moduleId}-chat`;
        const chatroomRef = chatroomsCollection.doc(chatroomId);

        // Nachrichtenempfang
        ws.on('message', async (message) => {
            const chatMessage = {
                user: user.email,
                message: message,
                timestamp: new Date(),
            };

            // Speichere die Nachricht in Firestore
            await chatroomRef.collection('messages').add(chatMessage);

            // Sende Nachricht an alle verbundenen Clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(chatMessage));
                }
            });
        });

        // Willkommensnachricht
        ws.send('Welcome to the chat room!');
    });
});

// HTTP Endpunkt zum Beitritt zum Chatraum
router.get('/join', authenticateJWT, async (req, res) => {
    const moduleId = req.query.moduleId;
    const chatroomId = `${moduleId}-chat`;

    // Prüfe, ob der Benutzer im Modul eingetragen ist
    const moduleRef = firestore.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
        return res.status(404).send('Module not found');
    }

    // Erstelle den Chatraum falls noch nicht vorhanden
    const chatroomRef = chatroomsCollection.doc(chatroomId);
    await chatroomRef.set({ moduleId });

    res.status(200).send('Joined chat room successfully');
});

module.exports = router;
