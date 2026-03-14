import express from "express";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = path.join(__dirname, "tales.db");
const DATA_DIR = path.join(__dirname, "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const AUDIO_DIR = path.join(DATA_DIR, "audio");

// Создаём папки для ассетов
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Инициализация БД
let db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Создание таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS stories (
    story_id TEXT PRIMARY KEY,
    created_at INTEGER,
    updated_at INTEGER,
    world_mode TEXT,
    age_label TEXT,
    world_description TEXT,
    hero_description TEXT,
    antagonist_description TEXT,
    world_image TEXT,
    hero_image TEXT,
    antagonist_image TEXT,
    title TEXT,
    chapters_json TEXT
  );

  CREATE TABLE IF NOT EXISTS chapters (
    node_id TEXT PRIMARY KEY,
    story_id TEXT,
    title TEXT,
    narration_text TEXT,
    scene_image_url TEXT,
    choices_json TEXT,
    state_summary TEXT,
    FOREIGN KEY(story_id) REFERENCES stories(story_id) ON DELETE CASCADE
  );
`);

const count = db.prepare("SELECT COUNT(*) as count FROM stories").get() as { count: number };
console.log(`Database initialized. Found ${count.count} stories.`);

// Проверяем и исправляем схему базы данных
try {
  // Проверяем существование колонки world_mode
  const tableInfo = db.prepare("PRAGMA table_info(stories)").all() as Array<{name: string, type: string}>;
  const hasWorldMode = tableInfo.some(col => col.name === 'world_mode');
  
  if (!hasWorldMode) {
    console.log("Adding missing world_mode column to stories table...");
    db.prepare("ALTER TABLE stories ADD COLUMN world_mode TEXT").run();
    console.log("Added world_mode column successfully.");
  }
  
  // Проверяем другие колонки
  const requiredColumns = ['age_label', 'world_description', 'hero_description', 'antagonist_description', 'world_image', 'hero_image', 'antagonist_image', 'chapters_json'];
  for (const column of requiredColumns) {
    const hasColumn = tableInfo.some(col => col.name === column);
    if (!hasColumn) {
      console.log(`Adding missing ${column} column to stories table...`);
      db.prepare(`ALTER TABLE stories ADD COLUMN ${column} TEXT`).run();
      console.log(`Added ${column} column successfully.`);
    }
  }
} catch (e) {
  console.error("Error during database migration:", e);
}

// Хелпер: удалить файл ассета по пути из БД
function deleteAssetFile(assetPath: string | null) {
  if (!assetPath || assetPath.startsWith("data:")) return;
  try {
    const filePath = path.resolve(DATA_DIR, assetPath.replace("/assets/", ""));
    // Защита от path traversal
    if (!filePath.startsWith(path.resolve(DATA_DIR))) return;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.warn("Failed to delete asset file:", assetPath, e);
  }
}

// Хелпер: сохранить base64 в файл
function saveBase64Asset(dataUrl: string, type: "image" | "audio", nodeId: string): string {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl; // уже путь

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return dataUrl;

  const [, mimeType, b64data] = match;
  const subtype = mimeType.split("/")[1] || "bin";
  const ext = subtype === "mpeg" ? "mp3" : subtype.replace("+xml", "");
  const dir = type === "image" ? IMAGES_DIR : AUDIO_DIR;
  const filePath = path.join(dir, `${nodeId}.${ext}`);

  fs.writeFileSync(filePath, Buffer.from(b64data, "base64"));
  return `/assets/${type}s/${nodeId}.${ext}`;
}

// --- Статика для ассетов (до Vite middleware!) ---
app.use("/assets", express.static(DATA_DIR, {
  maxAge: "7d",
  immutable: true,
}));

app.use("/backgrounds", express.static(path.join(__dirname, "public/backgrounds"), {
  maxAge: "7d",
  immutable: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API: Получить все истории
app.get("/api/stories", (req, res) => {
  try {
    const stories = db.prepare("SELECT * FROM stories ORDER BY updated_at DESC").all();
    const transformed = stories.map(transformStoryFromDB);
    res.json(transformed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch stories" });
  }
});

function transformStoryFromDB(row: any) {
  const chapters = row.chapters_json ? JSON.parse(row.chapters_json) : [];
  const currentChapter = chapters.length > 0 ? chapters[chapters.length - 1] : null;
  
  return {
    id: row.story_id,
    title: row.title,
    worldMode: row.world_mode,
    ageLabel: row.age_label,
    worldDescription: row.world_description,
    heroDescription: row.hero_description,
    antagonistDescription: row.antagonist_description,
    worldImage: row.world_image,
    heroImage: row.hero_image,
    antagonistImage: row.antagonist_image,
    chapters,
    currentChapter,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// API: Получить конкретную историю
app.get("/api/stories/:id", (req, res) => {
  try {
    const story = db.prepare("SELECT * FROM stories WHERE story_id = ?").get(req.params.id);
    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }
    res.json(transformStoryFromDB(story));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch story" });
  }
});

// API: Сохранить/Обновить историю
app.post("/api/stories", (req, res) => {
  try {
    const {
      id,
      title,
      worldMode,
      ageLabel,
      worldDescription,
      heroDescription,
      antagonistDescription,
      worldImage,
      heroImage,
      antagonistImage,
      chapters,
      currentChapter,
      createdAt,
      updatedAt,
    } = req.body;

    const story_id = id;
    const created_at = createdAt || Date.now();
    const updated_at = updatedAt || Date.now();
    const world_mode = worldMode;
    const age_label = ageLabel;
    const world_description = worldDescription;
    const hero_description = heroDescription;
    const antagonist_description = antagonistDescription;
    const chapters_json = chapters || [];

    // Обрабатываем base64 изображения
    let processedWorldImage = worldImage;
    let processedHeroImage = heroImage;
    let processedAntagonistImage = antagonistImage;

    if (worldImage && worldImage.startsWith("data:")) {
      processedWorldImage = saveBase64Asset(worldImage, "image", `world_${story_id}`);
    }
    if (heroImage && heroImage.startsWith("data:")) {
      processedHeroImage = saveBase64Asset(heroImage, "image", `hero_${story_id}`);
    }
    if (antagonistImage && antagonistImage.startsWith("data:")) {
      processedAntagonistImage = saveBase64Asset(antagonistImage, "image", `antag_${story_id}`);
    }

    db.prepare(`
      INSERT OR REPLACE INTO stories
      (story_id, created_at, updated_at, world_mode, age_label, world_description, hero_description, antagonist_description, world_image, hero_image, antagonist_image, title, chapters_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      story_id,
      created_at,
      updated_at,
      world_mode,
      age_label,
      world_description,
      hero_description,
      antagonist_description,
      processedWorldImage,
      processedHeroImage,
      processedAntagonistImage,
      title,
      JSON.stringify(chapters_json)
    );

    res.json({ success: true });
  } catch (e) {
    console.error("[POST /api/stories] Error:", e);
    res.status(500).json({ error: "Failed to save story", details: e instanceof Error ? e.message : String(e) });
  }
});

// API: Удалить историю
app.delete("/api/stories/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM chapters WHERE story_id = ?").run(req.params.id);
    db.prepare("DELETE FROM stories WHERE story_id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete story" });
  }
});

// API: Скачать БД
app.get("/api/download-db", (req, res) => {
  if (fs.existsSync(DB_PATH)) {
    res.download(DB_PATH, "tales_backup.db");
  } else {
    res.status(404).json({ error: "Database file not found" });
  }
});

// AI API endpoints
const N1N_API_KEY = process.env.N1N_API_KEY;
const N1N_TEXT_MODEL = process.env.N1N_TEXT_MODEL || "gemini-2.5-flash";
const N1N_IMAGE_MODEL = process.env.N1N_IMAGE_MODEL || "gemini-2.5-flash-image";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_TEXT_MODEL = process.env.OPENROUTER_TEXT_MODEL || "google/gemini-2.5-flash";
const OPENROUTER_IMAGE_MODEL = process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image";
const AI_PROVIDER = (process.env.AI_PROVIDER || (OPENROUTER_API_KEY ? "openrouter" : "n1n")).toLowerCase();

async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

async function callN1nJson(prompt: string, systemPrompt: string, model: string = N1N_TEXT_MODEL) {
  if (!N1N_API_KEY) throw new Error("N1N API Key not configured");

  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      console.log(`[N1N] Retry ${attempt + 1}/3 after ${delay}ms...`);
      await sleep(delay);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const resp = await fetch("https://api.n1n.ai/v1/chat/completions", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Authorization": `Bearer ${N1N_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000
        })
      });

      clearTimeout(timeoutId);

      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`N1N API auth error (${resp.status})`);
      }

      if (resp.status === 429) {
        if (attempt < 2) continue;
        throw new Error("N1N API rate limited");
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`N1N API error: ${resp.status} - ${text}`);
      }

      const data = await resp.json() as any;
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from N1N");

      let result = JSON.parse(content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''));
      return result;

    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(`[N1N] Attempt ${attempt + 1} failed:`, lastError);
    }
  }

  throw new Error(`N1N API failed: ${lastError}`);
}

async function callN1nImage(prompt: string, model: string = N1N_IMAGE_MODEL) {
  if (!N1N_API_KEY) throw new Error("N1N API Key not configured");

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(2000);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const resp = await fetch(`https://api.n1n.ai/v1beta/models/${model}:generateContent`, {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Authorization": `Bearer ${N1N_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] }
        })
      });

      clearTimeout(timeoutId);

      if (resp.status === 401 || resp.status === 403) {
        return null;
      }

      if (!resp.ok) {
        continue;
      }

      const data = await resp.json() as any;
      const parts = data?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) return null;

      for (const part of parts) {
        const inlineData = part?.inlineData || part?.inline_data;
        if (inlineData?.data) {
          const mimeType = inlineData.mimeType || "image/png";
          return `data:${mimeType};base64,${inlineData.data}`;
        }
      }
      return null;

    } catch (e) {
      console.error(`[N1N Image] Attempt ${attempt + 1} failed:`, e);
    }
  }

  return null;
}

async function callOpenRouterJson(prompt: string, systemPrompt: string, model: string = OPENROUTER_TEXT_MODEL) {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API Key not configured");

  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      await sleep(delay);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000
        })
      });

      clearTimeout(timeoutId);

      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`OpenRouter API auth error (${resp.status})`);
      }

      if (resp.status === 429) {
        if (attempt < 2) continue;
        throw new Error("OpenRouter API rate limited");
      }

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`OpenRouter API error: ${resp.status} - ${text}`);
      }

      const data = await resp.json() as any;
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenRouter");

      const result = JSON.parse(content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, ''));
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(`[OpenRouter] Attempt ${attempt + 1} failed:`, lastError);
    }
  }

  throw new Error(`OpenRouter API failed: ${lastError}`);
}

async function callOpenRouterImage(prompt: string, model: string = OPENROUTER_IMAGE_MODEL) {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API Key not configured");

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await sleep(2000);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const resp = await fetch("https://openrouter.ai/api/v1/images/generations", {
        signal: controller.signal,
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          prompt,
          response_format: "b64_json"
        })
      });

      clearTimeout(timeoutId);

      if (resp.status === 401 || resp.status === 403) {
        return null;
      }

      if (!resp.ok) {
        continue;
      }

      const data = await resp.json() as any;
      const item = data?.data?.[0];
      if (item?.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      }
      if (item?.url) {
        return item.url;
      }
      return null;
    } catch (e) {
      console.error(`[OpenRouter Image] Attempt ${attempt + 1} failed:`, e);
    }
  }

  return null;
}

// API: Генерировать главу
app.post("/api/ai/generate-chapter", async (req, res) => {
  try {
    const { worldMode, systemPrompt, prompt } = req.body;

    if (!systemPrompt || !prompt) {
      return res.status(400).json({ error: "Missing systemPrompt or prompt" });
    }

    const result = AI_PROVIDER === "openrouter"
      ? await callOpenRouterJson(prompt, systemPrompt)
      : await callN1nJson(prompt, systemPrompt);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to generate chapter" });
  }
});

// API: Генерировать картинку
app.post("/api/ai/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const imageUrl = AI_PROVIDER === "openrouter"
      ? await callOpenRouterImage(prompt)
      : await callN1nImage(prompt);
    if (!imageUrl) {
      return res.status(500).json({ error: "Failed to generate image" });
    }

    res.json({ imageUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : "Failed to generate image" });
  }
});

// === Vite middleware (в конце!) ===
async function setupVite() {
  const vite = await createViteServer({
    server: { middlewareMode: true }
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    try {
      const url = req.originalUrl;
      let html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      html = await vite.transformIndexHtml(url, html);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e: any) {
      vite.ssrFixStacktrace(e);
      console.error(e);
      res.status(500).end(e.message);
    }
  });
}

// Start server
async function start() {
  await setupVite();

  app.listen(PORT, () => {
    console.log(`✓ Server running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
