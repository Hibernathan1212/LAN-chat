const express = require('express');
const { WebSocketServer } = require('ws');
const Database = require('better-sqlite3');
const path = require('path');
const http = require('http');


const app = express();
const port = process.env.PORT || 3000;
const dbPath = process.env.DB_PATH || path.join(__dirname, 'chat.db');


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
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Messages table ensured');
} catch (error) {
  console.error('Error opening database:', error.message);
  process.exit(1);
}

const insertMessageStmt = db.prepare('INSERT INTO messages (username, message) VALUES (?, ?)');
const getMessageStmt = db.prepare('SELECT id, username, message, timestamp FROM messages ORDER BY timestamp ASC');

app.use(express.static(path.join(__dirname, 'public')));
console.log(`Serving static files from ${path.join(__dirname, 'public')}`);


const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  console.log('Client Connected');

  const messages = getMessageStmt.all();
  ws.send(JSON.stringify({ type: 'history', messages }));

  ws.on('message', message => {
    try {
      const parsedMessage = JSON.parse(message);

      if (parsedMessage.type === 'chatMessage' && parsedMessage.username && parsedMessage.content) {

        const { username, content } = parsedMessage;

        if (username.length > 50 || content.length > 1000) {
          console.warn('Message too long from client: ', username);
          return;
        }

        const info = insertMessageStmt.run(username, content);

        console.log(`Message inserted: ${info.lastInsertRowid}`);

        const newMessage = {
          id: info.lastInsertRowid,
          username: username,
          message: content,
          timestamp: new Date().toISOString(),
        }

        wss.clients.forEach(client => {
          if (client.readyState === ws.OPEN) {
            client.send(JSON.stringify({ type: 'newMessage', message: newMessage }));
          }
        });
      }
    } catch (error) {
      console.error('Error parsing or handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});


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