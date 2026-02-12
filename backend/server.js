require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const OpenAI = require("openai");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ---------- HELPERS ---------- */
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------- AUTH ---------- */
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username,password) VALUES (?,?)",
    [username, hash],
    err => {
      if (err) return res.json({ error: "User exists" });
      res.json({ success: true });
    }
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (_, user) => {
      if (!user) return res.json({ error: "Invalid login" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.json({ error: "Invalid login" });

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
      res.json({ token, model: user.model });
    }
  );
});

/* ---------- MODEL SWITCH ---------- */
app.post("/set-model", auth, (req, res) => {
  const { model } = req.body;

  const allowed = ["gpt-4o-mini", "gpt-4.1-mini"];
  if (!allowed.includes(model))
    return res.status(400).json({ error: "Invalid model" });

  db.run(
    "UPDATE users SET model=? WHERE id=?",
    [model, req.user.id],
    () => res.json({ success: true })
  );
});

/* ---------- CHAT ---------- */
app.post("/chat", auth, (req, res) => {
  const { message } = req.body;

  db.get(
    "SELECT model FROM users WHERE id=?",
    [req.user.id],
    (_, user) => {
      db.all(
        "SELECT role,content FROM memory WHERE userId=?",
        [req.user.id],
        async (_, memory) => {
          const messages = [
            { role: "system", content: "You are Intelix, a futuristic AI." },
            ...memory,
            { role: "user", content: message }
          ];

          const completion = await openai.chat.completions.create({
            model: user.model,
            messages
          });

          const reply = completion.choices[0].message.content;

          db.run(
            "INSERT INTO memory (userId,role,content) VALUES (?,?,?)",
            [req.user.id, "user", message]
          );
          db.run(
            "INSERT INTO memory (userId,role,content) VALUES (?,?,?)",
            [req.user.id, "assistant", reply]
          );

          res.json({ reply, model: user.model });
        }
      );
    }
  );
});

/* ---------- MEMORY CLEAR ---------- */
app.post("/clear-memory", auth, (req, res) => {
  db.run(
    "DELETE FROM memory WHERE userId=?",
    [req.user.id],
    () => res.json({ success: true })
  );
});

app.listen(3000, () =>
  console.log("⚡ Intelix v3 running → http://localhost:3000")
);