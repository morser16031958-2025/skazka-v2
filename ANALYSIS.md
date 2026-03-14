# Анализ проекта "Сказки вселенной ИИ"

## Общее описание

Веб-приложение для интерактивного создания и чтения сказок с помощью AI (Google Gemini). Пользователь выбирает жанр/возрастную группу, AI генерирует мир, героя и сюжет с выбором продолжения.

## Архитектура

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express (встроен в dev server через Vite middleware)
- **База данных**: SQLite (better-sqlite3) - локальный файл `tales.db`
- **AI**: Google Gemini 2.5 Flash через N1N API или OpenRouter
- **Анимации**: Framer Motion (motion)
- **Стили**: Tailwind CSS + CSS Modules

## Структура проекта

```
skazka-v2/
├── src/
│   ├── components/          # React компоненты
│   │   ├── Landing.tsx      # Главная страница
│   │   ├── DoorSelect.tsx   # Выбор мира/возраста
│   │   ├── StoryWizard.tsx  # Создание истории
│   │   ├── StoryReader.tsx  # Чтение/продолжение
│   │   ├── StoryContents.tsx # Оглавление
│   │   ├── MyStories.tsx    # Библиотека
│   │   └── ...
│   ├── services/
│   │   ├── ai.ts            # AI сервис
│   │   └── db.ts            # Работа с БД
│   ├── config/
│   │   └── worlds.ts        # Конфигурация миров/жанров
│   ├── types.ts             # TypeScript типы
│   ├── App.tsx              # Главный компонент
│   └── main.tsx             # Точка входа
├── server.ts                # Express сервер
├── tales.db                 # SQLite база данных
├── package.json             # Зависимости
└── vite.config.ts           # Конфигурация Vite
```

## Структура БД

### Таблица `stories`

| Колонка | Тип | Описание |
|---------|-----|----------|
| story_id | TEXT | ID истории (PK) |
| created_at | INTEGER | Дата создания |
| updated_at | INTEGER | Дата обновления |
| world_mode | TEXT | Жанр (fairytale, magic, adventure...) |
| age_label | TEXT | Возрастная группа |
| world_description | TEXT | Описание мира |
| hero_description | TEXT | Описание героя |
| antagonist_description | TEXT | Описание антагониста |
| world_image | TEXT | URL картинки мира |
| hero_image | TEXT | URL картинки героя |
| antagonist_image | TEXT | URL картинки антагониста |
| title | TEXT | Название истории |
| chapters_json | TEXT | JSON массив глав |

### Таблица `chapters`

| Колонка | Тип | Описание |
|---------|-----|----------|
| node_id | TEXT | ID узла (PK) |
| story_id | TEXT | ID истории (FK) |
| title | TEXT | Название главы |
| narration_text | TEXT | Текст повествования |
| scene_image_url | TEXT | URL картинки сцены |
| choices_json | TEXT | JSON выборов |
| state_summary | TEXT | Краткое состояние мира |

## Жанры и возрастные группы

### Жанры (Genre)

- `fairytale` - Русские народные
- `animals` - Про животных
- `magic_soft` - Волшебство (мягкое)
- `magic` - Магия (темное)
- `Adventure` - Приключения
- `fantasy` - Фантастика

### Возрастные группы (AgeGroup)

- `3-5` - Малыши
- `6-8` - Дошкольники
- `9-12` - Школьники
- `13+` - Подростки
- `auto` - Автоматически

## API эндпоинты

### Stories

- `GET /api/stories` - Получить все истории
- `GET /api/stories/:id` - Получить конкретную историю
- `POST /api/stories` - Сохранить/обновить историю
- `DELETE /api/stories/:id` - Удалить историю

### AI

- `POST /api/ai/generate-chapter` - Генерация главы
- `POST /api/ai/generate-world` - Генерация мира
- `POST /api/ai/generate-image` - Генерация изображения

### Утилиты

- `GET /api/download-db` - Скачать резервную копию БД

## Безопасность

- SQL-injection protection: whitelist допустимых колонок
- Path traversal protection при удалении файлов
- Timeout на AI запросы (30-60 сек)
- Retry логика (3 попытки с экспоненциальной задержкой)
- Валидация base64 изображений перед сохранением

## AI Провайдеры

- **N1N API** (по умолчанию) - `gemini-2.5-flash`
- **OpenRouter** (резервный) - `google/gemini-2.5-flash`

## Зависимости

### Основные

- react, react-dom - React 19
- @google/genai - Google AI SDK
- better-sqlite3 - SQLite
- express - Веб-сервер
- lucide-react - Иконки
- motion - Анимации
- react-markdown - Рендеринг Markdown
- uuid - Генерация ID
- vite - Сборщик

### Разработка

- typescript
- @vitejs/plugin-react
- tailwindcss
- tsx

## Запуск

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev
# Открыть http://localhost:3001

# Сборка для продакшена
npm run build
npm run preview

# Проверка типов
npm run lint
```

## Требования

- Node.js
- `.env` файл с:
  - `N1N_API_KEY` или `OPENROUTER_API_KEY` - API ключ AI
  - `PORT` (опционально) - порт сервера (по умолчанию 3001)

## Workflow

1. Пользователь открывает приложение → **Landing**
2. Выбирает "Создать сказку" → **DoorSelect**
3. Выбирает мир и возраст → **StoryWizard**
4. AI генерирует 3 варианта мира → пользователь выбирает
5. AI генерирует первую главу → **StoryReader**
6. Пользователь читает → выбирает продолжение
7. AI генерирует следующую главу
8. История сохраняется в SQLite

## Потенциальные улучшения

- Добавить аутентификацию пользователей
- Добавить возможность делиться историями
- Поддержка аудио (озвучка)
- Экспорт в PDF
- Больше жанров и возрастных групп
- Тесты (unit + e2e)
