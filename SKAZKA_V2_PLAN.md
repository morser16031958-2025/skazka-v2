# Skazka v2 — План нового проекта

## Что копируем из старого проекта БЕЗ изменений

- `tales.db` — база данных со всеми историями
- `package.json` — зависимости (почти все те же)
- `.env` — ключи API
- `src/types.ts` — модель данных (Story, ChapterNode, Choice)
- `src/components/ErrorBoundary.tsx` — без изменений
- `src/components/StoryImage.tsx` — без изменений
- `data/images/` — все сохранённые картинки
- `data/audio/` — аудио если есть

---

## Что переписываем с нуля

### server.ts — переписать чисто
Взять логику, убрать баги:
- Убрать дублирование /api/generate-image и /api/ai/generate-image (оставить один)
- Убрать path traversal в deleteAssetFile
- Убрать process.exit(0) после восстановления БД
- Убрать /api/debug-db (не нужен в продакшене)
- Добавить таймауты на fetch к AI
- Лимит express.json снизить с 50mb до 5mb

### src/services/ai.ts — переписать
Главные изменения:
- THREE system prompts вместо одного (по одному на каждый мир)
- Убрать двойное дублирование промпта картинок
- Убрать мёртвый textCache
- Починить двойную очередь для изображений

### src/App.tsx — переписать
- Добавить storyMode: "fairytale" | "adventure" | "magic"
- Первый экран — DoorSelect (три двери)
- Убрать wizard из основного флоу

### src/components/ — новые компоненты
- DoorSelect.tsx — экран выбора мира (НОВЫЙ)
- StoryWizard.tsx — упрощённый, без выбора возраста/ценности/стиля
- StoryReader.tsx — взять из старого, почистить race condition
- MainMenu.tsx — взять из старого, убрать лишнее
- MyStories.tsx — взять из старого

---

## Структура папок v2

```
skazka-v2/
├── server.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env
├── tales.db              ← копируем из v1
├── data/
│   ├── images/           ← копируем из v1
│   └── audio/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts
│   ├── config/
│   │   └── worlds.ts     ← НОВЫЙ: конфиг трёх миров
│   ├── components/
│   │   ├── DoorSelect.tsx     ← НОВЫЙ: экран выбора
│   │   ├── MainMenu.tsx
│   │   ├── StoryWizard.tsx    ← упрощённый
│   │   ├── StoryReader.tsx
│   │   ├── MyStories.tsx
│   │   ├── StoryImage.tsx
│   │   └── ErrorBoundary.tsx
│   └── services/
│       ├── ai.ts              ← переписать
│       └── db.ts              ← взять из v1
└── public/
    └── backgrounds/           ← НОВЫЙ: фоны для трёх миров
```

---

## Ключевой новый файл: src/config/worlds.ts

Это сердце новой архитектуры. Всё про каждый мир в одном месте.

```typescript
export type WorldMode = "fairytale" | "adventure" | "magic";

export interface WorldConfig {
  id: WorldMode;
  name: string;
  ageLabel: string;
  description: string;
  buttonText: string;
  systemPrompt: string;
  imageStyleSuffix: string;  // добавляется к промпту картинки
  textLength: { min: number; max: number };
  accentColor: string;
}

export const WORLDS: Record<WorldMode, WorldConfig> = {

  fairytale: {
    id: "fairytale",
    name: "Русская сказка",
    ageLabel: "3 – 7 лет",
    description: "Жар-птицы, добрые молодцы и тридевятые царства",
    buttonText: "Открыть",
    systemPrompt: `Ты — сказитель русских народных сказок.
Говори напевно, используй повторы ("шёл-шёл и нашёл", "думал-думал").
Герои простые и понятные: добрый молодец, жар-птица, баба-яга.
Конфликт всегда мягкий — испытание, а не угроза.
Добро всегда побеждает, финал тёплый и радостный.
Длина текста: 400-800 символов — коротко, ритмично.
Возвращай только валидный JSON по схеме. Никакого текста вне JSON.
Используй русский язык.`,
    imageStyleSuffix: "Palekh miniature style, russian folk art, gold and crimson palette, warm painterly illustration",
    textLength: { min: 400, max: 800 },
    accentColor: "#b07820",
  },

  adventure: {
    id: "adventure",
    name: "Большое приключение",
    ageLabel: "8 – 12 лет",
    description: "Карты, квесты и выборы с настоящими последствиями",
    buttonText: "Войти",
    systemPrompt: `Ты — автор приключенческих историй для детей.
Мир полон загадок, карт и испытаний которые нужно преодолеть.
Герой умный и смелый, но не всесильный — ошибается и учится.
Выборы имеют реальные последствия — можно выбрать неверный путь.
Юмор уместен, диалоги живые и динамичные.
Длина текста: 800-1500 символов.
Возвращай только валидный JSON по схеме. Никакого текста вне JSON.
Используй русский язык.`,
    imageStyleSuffix: "adventure map style, watercolor illustration, bright vivid colors, dynamic composition",
    textLength: { min: 800, max: 1500 },
    accentColor: "#1a7850",
  },

  magic: {
    id: "magic",
    name: "Магический портал",
    ageLabel: "13+ лет",
    description: "Тайные миры, древние силы и магия которую нужно открыть",
    buttonText: "Шагнуть",
    systemPrompt: `Ты — автор волшебных историй о тайных мирах и магических приключениях.
Мир живой, древний, полный тайн — за обычным скрывается необычное.
Герой особенный — видит то что другие не замечают.
Магия подчиняется правилам которые нужно открыть — не всесильная, а живая система.
Каждая глава открывает что-то новое: секрет, способность, скрытый смысл.
Каждая глава заканчивается на пороге нового открытия — читатель хочет продолжения.
Антагонист — хранитель тайны или тот кто ищет другим путём, не злодей.
Длина текста: 1500-3000 символов.
Возвращай только валидный JSON по схеме. Никакого текста вне JSON.
Используй русский язык.`,
    imageStyleSuffix: "magical fantasy illustration, ethereal mystical lighting, ancient symbols, portals, atmospheric wonder",
    textLength: { min: 1500, max: 3000 },
    accentColor: "#6040b0",
  },
};
```

---

## Как меняется ai.ts

Вместо одного SYSTEM_INSTRUCTION — используем worlds.ts:

```typescript
import { WORLDS, WorldMode } from "../config/worlds";

export async function generateChapter(
  worldMode: WorldMode,   // ← НОВЫЙ параметр вместо ageGroup
  worldBible: string,
  heroBible: string,
  antagonistBible: string,
  stateSummary: string,
  choiceText?: string
) {
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

  // ... вызов API с systemPrompt
}

export async function generateImage(
  prompt: string,
  worldMode: WorldMode  // ← вместо artStylePreset
) {
  const world = WORLDS[worldMode];
  // Теперь суффикс берётся из конфига мира — никакого дублирования
  const fullPrompt = `${prompt}. ${world.imageStyleSuffix}.`;
  // ... отправка на сервер
}
```

---

## Как меняется StoryWizard

Было 6 шагов. Станет 2:

**Шаг 1** — AI генерирует мир, героя, антагониста одновременно (параллельные запросы).
Показываем красивый экран загрузки: "Создаём твой мир..."

**Шаг 2** — Показываем что получилось: мир + герой + антагонист с картинками.
Кнопка "Начать историю" и кнопка "Создать другой мир" (перегенерация).

Никакого выбора возраста, ценности, стиля — всё берётся из WorldConfig.

---

## Порядок работы

### Этап 1 — Скелет (1-2 часа в Bonsai)
1. `npm create vite@latest skazka-v2 -- --template react-ts`
2. Скопировать `tales.db`, `data/`, `.env`
3. Создать `src/config/worlds.ts` (код выше)
4. Создать `src/types.ts` (из v1 без изменений)

### Этап 2 — Сервер (2-3 часа)
5. Написать чистый `server.ts` — взять логику из v1, убрать баги
6. Проверить что `tales.db` читается и отдаёт старые истории

### Этап 3 — AI сервис (1-2 часа)
7. Написать новый `src/services/ai.ts` с тремя промптами
8. Проверить генерацию главы для каждого мира

### Этап 4 — UI (3-4 часа)
9. `DoorSelect.tsx` — три двери (пока простой вариант)
10. Упрощённый `StoryWizard.tsx` — 2 шага
11. `StoryReader.tsx` — из v1 с фиксом race condition
12. `MyStories.tsx` — из v1 без изменений

### Этап 5 — Фоны и атмосфера
13. Сгенерировать 3 фоновых иллюстрации через генератор картинок
14. Применить к DoorSelect

---

## Промпты для фоновых иллюстраций

**Дверь 1 — Русская сказка:**
```
A magical wooden door standing alone in an enchanted forest clearing,
russian folk art style, inspired by Palekh miniature painting,
warm golden light glowing through the door cracks,
the door is decorated with carved firebird and folk ornaments,
surrounded by glowing fireflies and magical flowers,
soft warm evening light, children's book art,
gold and crimson palette, ultra detailed, no text, no letters
```

**Дверь 2 — Приключение:**
```
An ancient stone archway in a misty forest, 
glowing adventure map visible through the portal,
compass rose and treasure markers on the ground,
warm adventurous atmosphere, watercolor style,
green and gold palette, children's book illustration,
dynamic composition, no text, no letters
```

**Дверь 3 — Магический портал:**
```
A mystical portal made of swirling stars and ancient runes,
standing in a dark magical forest clearing,
ethereal light pouring through the gateway,
ancient symbols carved in stone around the portal,
mysterious fog and floating magical particles,
deep purple and silver palette, fantasy illustration,
ultra detailed, no text, no letters
```
