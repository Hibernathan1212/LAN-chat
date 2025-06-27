const express = require('express');
const { WebSocketServer } = require('ws');
const Database = require('better-sqlite3');
const path = require('path');
const http = require('http');


const app = express();
const port = process.env.PORT || 3000;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'chat.db');

const MAX_MESSAGE_HISTORY = 10;
const MESSAGE_LIFESPAN_HOURS = 24;
const CLEANUP_INTERVAL_MINUTES = 60;

let db;
try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  console.log(`Database connected at: ${dbPath}`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    ip STRING NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Messages table ensured');
} catch (error) {
  console.error('Error opening database:', error.message);
  process.exit(1);
}

const insertMessageStmt = db.prepare('INSERT INTO messages (username, message, ip) VALUES (?, ?, ?)');
const getRecentMessagesStmt = db.prepare(`SELECT id, username, message, ip, timestamp FROM messages ORDER BY timestamp DESC LIMIT ${MAX_MESSAGE_HISTORY}`);
const deleteMessageStmt = db.prepare('DELETE FROM messages WHERE id = ?');
const deleteOldMessagesStmt = db.prepare(`
  DELETE FROM messages
  WHERE timestamp < datetime('now', '-${MESSAGE_LIFESPAN_HOURS} hours')
`)

const connectedClients = new Map();

app.use(express.static(path.join(__dirname, 'public')));
console.log(`Serving static files from ${path.join(__dirname, 'public')}`);


const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {

  const clientIp = req.socket.remoteAddress;
  console.log(`Client connected from: ${clientIp}`);

  connectedClients.set(ws, { ip: clientIp, username: 'Anonymous' });

  const recentMessages = getRecentMessagesStmt.all().reverse();
  ws.send(JSON.stringify({ type: 'history', messages: recentMessages }));

  broadcastConnectedUsers();
  
  ws.on('message', message => {
    try {
      const parsedMessage = JSON.parse(message);
      const clientInfo = connectedClients.get(ws);

      if (!clientInfo) {
        console.warn('Received message from unknown client');
        return;
      }

      if (parsedMessage.type === 'chatMessage' && parsedMessage.username && parsedMessage.content) {

        const { username, content } = parsedMessage;

        if (clientInfo.username !== username) {
          clientInfo.username = username;
          broadcastConnectedUsers();
        }

        if (username.length > 50 || content.length > 1000) {
          console.warn(`Message too long from ${username} (${clientInfo.ip}):`, content);
          return;
        }

        const info = insertMessageStmt.run(username, content, clientInfo.ip);

        console.log(`Message inserted by ${username} (${clientInfo.ip}): ${info.lastInsertRowid}`);

        const newMessage = {
          id: info.lastInsertRowid,
          username: username,
          message: content,
          ip: clientInfo.ip,
          timestamp: new Date().toISOString(),
        }

        wss.clients.forEach(client => {
          if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({ type: 'newMessage', message: newMessage }));
          }
        });
      } else if (parsedMessage.type === 'deleteMessage' && parsedMessage.id) {
        const messageId = parsedMessage.id;

        // may want to check in the future if user's ip === message creator's ip and/or if user has admin privileges

        try {
          const deleteInfo = deleteMessageStmt.run(messageId);
          if (deleteInfo.changes > 0) {
            console.log(`Message ID ${messageId} deleted by ${clientInfo.username} (${clientInfo.ip})`);

            wss.clients.forEach(client => {
              if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify({ type: 'messageDeleted', id: messageId }));
              }
            });
          } else {
            console.log(`Attempted to delete non-existent message ID ${messageId}`);
          }
        } catch (deleteError) {
          console.error(`Error deleting message ID ${messageId}:`, deleteError.message);
        }
      }
    } catch (error) {
      console.error('Error parsing or handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected from: ${clientIp}`);
    connectedClients.delete(ws); 
    broadcastConnectedUsers();
  });

  ws.on('error', error => {
    console.error(`WebSocket error from ${clientIp}:`, error);
    connectedClients.delete(ws); 
    broadcastConnectedUsers();
  });
});

function broadcastConnectedUsers() {
  const users = Array.from(connectedClients.values()).map(client => ({
    ip: client.ip,
    username: client.username,
  }));

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'connectedUsers', users: users }));
    }
  });
  console.log('Broadcasting connected users:', users);
}

setInterval(() => {
  try {
    const info = deleteOldMessagesStmt.run();
    if (info.changes > 0) {
      console.log(`Deleted ${info.changes} old messages.`);
    }
  } catch (error) {
    console.error('Error during old message cleanup:', error.message);
  }
}, CLEANUP_INTERVAL_MINUTES * 60 * 1000); // Convert minutes to milliseconds



server.listen(port, () => {
  console.log(`LAN Chat backend listening on http://localhost:${port}`);
  console.log(`Access from another device on your LAN at: http://YOUR_DOCKER_HOST_IP:${port}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down server');
  db.close();

  server.close(() => {
    console.log('HTTP and WebSocket server closed');
    process.exit(0);
  });
});