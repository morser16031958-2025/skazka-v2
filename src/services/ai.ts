import { WorldMode, WORLDS } from "../config/worlds";

const MIN_REQUEST_INTERVAL = 1000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

let lastRequestTime = 0;

class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
          await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
        }

        lastRequestTime = Date.now();
        await task();

        await sleep(MIN_REQUEST_INTERVAL);
      }
    }

    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

const requestQueue = new RequestQueue();

async function callLocalApi<T>(endpoint: string, body: any): Promise<T> {
  return requestQueue.add(async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
  });
}

export interface ChapterResponse {
  title: string;
  narration_text: string;
  scene_image_prompt: string;
  choices: Array<{ text: string }>;
  state_summary_end: string;
}

export interface WorldSetupResponse {
  worldDescription: string;
  heroDescription: string;
  antagonistDescription: string;
  worldImage: string;
  heroImage: string;
  antagonistImage: string;
}

/**
 * Генерировать текст главы
 */
export async function generateChapter(
  worldMode: WorldMode,
  worldBible: string,
  heroBible: string,
  antagonistBible: string,
  stateSummary: string,
  choiceText?: string
): Promise<ChapterResponse> {
  const world = WORLDS[worldMode];
  const systemPrompt = world.systemPrompt;

  const prompt = `Напиши следующую главу истории.
Мир: ${worldBible}.
Герой: ${heroBible}.
Антагонист: ${antagonistBible}.
Текущее состояние: ${stateSummary}.
${choiceText ? `Выбор читателя: ${choiceText}` : "Это первая глава."}

Длина текста: ${world.textLength.min}-${world.textLength.max} символов.
Верни JSON: title, narration_text, scene_image_prompt, choices (ровно 3), state_summary_end.`;

  return callLocalApi<ChapterResponse>("/api/ai/generate-chapter", {
    worldMode,
    systemPrompt,
    prompt,
  });
}

/**
 * Генерировать картинку (prompt уже содержит стиль от клиента)
 */
export async function generateImage(prompt: string, styleSuffix?: string): Promise<string> {
  const fullPrompt = styleSuffix ? `${prompt}. ${styleSuffix}` : prompt;
  const result = await callLocalApi<{ imageUrl: string }>("/api/ai/generate-image", {
    prompt: fullPrompt,
  });

  if (!result?.imageUrl) {
    throw new Error("No image URL returned");
  }

  return result.imageUrl;
}

/**
 * Генерировать мир, героя и антагониста одновременно
 */
export async function generateWorldSetup(
  worldMode: WorldMode
): Promise<WorldSetupResponse> {
  const world = WORLDS[worldMode];
  const descriptionSystemPrompt = `Ты создаёшь краткие описания для детских историй. Возвращай только валидный JSON с полем "description". Используй русский язык.`;

  // Три параллельных запроса для описаний
  const [worldResp, heroResp, antagonistResp] = await Promise.all([
    callLocalApi<{ description: string }>("/api/ai/generate-chapter", {
      worldMode,
      systemPrompt: descriptionSystemPrompt,
      prompt: `Создай краткое описание волшебного мира для ${world.ageLabel}. ${world.description}. Верни JSON с полем "description".`,
    }),
    callLocalApi<{ description: string }>("/api/ai/generate-chapter", {
      worldMode,
      systemPrompt: descriptionSystemPrompt,
      prompt: `Создай описание главного героя для истории в мире: "${world.name}". Герой должен быть интересным для ${world.ageLabel}. Верни JSON с полем "description".`,
    }),
    callLocalApi<{ description: string }>("/api/ai/generate-chapter", {
      worldMode,
      systemPrompt: descriptionSystemPrompt,
      prompt: `Создай описание антагониста или препятствия для истории. Это не обязательно враг, может быть загадкой или испытанием. Верни JSON с полем "description".`,
    }),
  ]);

  const worldDescription = worldResp.description || "Таинственный мир";
  const heroDescription = heroResp.description || "Доблестный герой";
  const antagonistDescription = antagonistResp.description || "Испытание";

  // Генерируем картинки
  const [worldImage, heroImage, antagonistImage] = await Promise.all([
    generateImage(worldDescription, world.imageStyleSuffix).catch(() => ""),
    generateImage(heroDescription, world.imageStyleSuffix).catch(() => ""),
    generateImage(antagonistDescription, world.imageStyleSuffix).catch(() => ""),
  ]);

  return {
    worldDescription,
    heroDescription,
    antagonistDescription,
    worldImage,
    heroImage,
    antagonistImage,
  };
}

/**
 * Получить информацию об очереди (для отладки)
 */
export function getQueueStats() {
  return {
    queueSize: requestQueue.getQueueSize(),
    queueProcessing: requestQueue.isProcessing(),
  };
}
