import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";

dotenv.config();

const db = new Database("tubeforge.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    topic TEXT,
    duration INTEGER,
    show_source INTEGER,
    caption_enabled INTEGER,
    status TEXT,
    script TEXT,
    voice_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    text TEXT,
    type TEXT DEFAULT 'text',
    image_url TEXT,
    voice_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/projects", (req, res) => {
    const projects = db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all();
    res.json(projects);
  });

  app.post("/api/projects", (req, res) => {
    const { title, topic, duration, showSource, captionEnabled } = req.body;
    const info = db.prepare(`
      INSERT INTO projects (title, topic, duration, show_source, caption_enabled, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, topic, duration, showSource ? 1 : 0, captionEnabled ? 1 : 0, "draft");
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/projects/:id", (req, res) => {
    const { id } = req.params;
    const { status, script, voice_url, video_url, thumbnail_url } = req.body;
    
    const updates = [];
    const params = [];
    
    if (status) { updates.push("status = ?"); params.push(status); }
    if (script) { updates.push("script = ?"); params.push(script); }
    if (voice_url) { updates.push("voice_url = ?"); params.push(voice_url); }
    if (video_url) { updates.push("video_url = ?"); params.push(video_url); }
    if (thumbnail_url) { updates.push("thumbnail_url = ?"); params.push(thumbnail_url); }
    
    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }
    
    res.json({ success: true });
  });

  // Chat History
  app.get("/api/messages", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages ORDER BY created_at ASC LIMIT 100").all();
    res.json(messages);
  });

  // Socket.io Logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("send_message", (data) => {
      const { text, user_id, type, image_url, voice_url } = data;
      db.prepare("INSERT INTO messages (user_id, text, type, image_url, voice_url) VALUES (?, ?, ?, ?, ?)").run(
        user_id, 
        text, 
        type || 'text',
        image_url || null,
        voice_url || null
      );
      io.emit("receive_message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
