export type WorldMode = "fairytale" | "adventure" | "magic";

export interface WorldConfig {
  id: WorldMode;
  name: string;
  ageLabel: string;
  description: string;
  buttonText: string;
  systemPrompt: string;
  imageStyleSuffix: string;
  textLength: { min: number; max: number };
  accentColor: string;
  backgroundColor: string;
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
    backgroundColor: "#1a0f00",
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
    backgroundColor: "#001a0a",
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
    backgroundColor: "#0a0015",
  },
};
