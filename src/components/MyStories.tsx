import { Story } from "../types";
import { WorldMode, WORLDS } from "../config/worlds";
import "./MyStories.css";

interface MyStoriesProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onNewStory: () => void;
  onDeleteStory: (storyId: string) => void;
  onBack: () => void;
}

const WORLD_ORDER = Object.keys(WORLDS) as WorldMode[];
const WORLD_MAP = WORLDS as Record<string, (typeof WORLDS)[WorldMode]>;
const SHELF_ORDER = [
  "Облачко Пушинка",
  "Бабочка Искорка",
  "Ева Мечтательница + Тимур Облачный",
  "Жемчужинка",
  "История из Русская сказка",
  "Мышонок Пик",
  "Росинка"
];
const SHELF_MERGE_MAP: Record<string, string> = {
  "Ева Мечтательница": "Ева Мечтательница + Тимур Облачный",
  "Тимур Облачный": "Ева Мечтательница + Тимур Облачный"
};

function normalizeWorldMode(mode?: string) {
  if (mode === "fairy_tale") return "fairytale";
  return mode;
}

function getWorldByMode(mode?: string) {
  const normalized = normalizeWorldMode(mode);
  if (!normalized) return null;
  return WORLD_MAP[normalized] || null;
}

function getAgeRank(ageLabel?: string) {
  if (!ageLabel) return Number.MAX_SAFE_INTEGER;
  const match = ageLabel.match(/\d+/);
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

function getShelfKey(title: string) {
  return SHELF_MERGE_MAP[title] || title;
}

function getUpdatedAtValue(updatedAt?: string) {
  if (!updatedAt) return 0;
  const parsed = Date.parse(updatedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildShelves(stories: Story[]): Array<{ title: string; ageRank: number; stories: Story[] }> {
  const groups = new Map<string, { title: string; ageRank: number; stories: Story[] }>();

  stories.forEach((story) => {
    const key = getShelfKey(story.title);
    const ageRank = getAgeRank(story.ageLabel);
    if (!groups.has(key)) {
      groups.set(key, { title: key, ageRank, stories: [] });
    }
    const group = groups.get(key)!;
    group.ageRank = Math.min(group.ageRank, ageRank);
    group.stories.push(story);
  });

  const shelves = Array.from(groups.values());
  shelves.sort((a, b) => {
    if (a.ageRank !== b.ageRank) return a.ageRank - b.ageRank;
    const indexA = SHELF_ORDER.indexOf(a.title);
    const indexB = SHELF_ORDER.indexOf(b.title);
    if (indexA !== -1 || indexB !== -1) {
      return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) - (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB);
    }
    return a.title.localeCompare(b.title);
  });

  shelves.forEach((shelf) => {
    shelf.stories.sort((a, b) => {
      if (a.title !== b.title) return a.title.localeCompare(b.title);
      return getUpdatedAtValue(b.updatedAt) - getUpdatedAtValue(a.updatedAt);
    });
  });

  return shelves;
}

function shortText(text?: string, maxLength: number = 90) {
  if (!text) return "—";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const clipped = cleaned.slice(0, maxLength).replace(/[.,;:!?]?\s*$/, "");
  return `${clipped}…`;
}

export function MyStories({ stories, onSelectStory, onNewStory, onDeleteStory: _onDeleteStory, onBack }: MyStoriesProps) {
  const shelves = buildShelves(stories);

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      {/* Фон */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: "url('/backgrounds/biblio.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.5,
        zIndex: 0
      }} />
      {/* Оверлей */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(8, 5, 20, 0.6)',
        zIndex: 1
      }} />
      {/* Контент */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div className="stories-header">
          <h1>📚 Библиотека</h1>
          <button className="btn-back-menu" onClick={onBack}>
            ← Назад
          </button>
        </div>

        {shelves.length === 0 ? (
          <div className="empty-state">
            <p>У вас ещё нет историй.</p>
            <p>Создайте первую историю — начните со сказки, приключения или магии!</p>
            <button className="btn-primary" onClick={onNewStory}>
              🚀 Создать первую историю
            </button>
          </div>
        ) : (
          <div className="stories-shelves">
            {shelves.map((shelf) => (
              <div key={shelf.title} className="world-shelf">
                <h2 className="shelf-title">{shelf.title}</h2>
                <div className="stories-grid">
                  {shelf.stories.map((story) => {
                    const world = getWorldByMode(story.worldMode);
                    const ageLabel = story.ageLabel || world?.ageLabel || "Возраст не указан";
                    return (
                      <button
                        key={story.id}
                        type="button"
                        className="story-card"
                        onClick={() => onSelectStory(story)}
                      >
                        <div className="story-images">
                          <div className="story-image-item">
                            {story.worldImage ? (
                              <img src={story.worldImage} alt="Мир" />
                            ) : (
                              <div className="placeholder">🌍</div>
                            )}
                            <span className="image-label">Мир</span>
                          </div>
                          <div className="story-image-item">
                            {story.heroImage ? (
                              <img src={story.heroImage} alt="Герой" />
                            ) : (
                              <div className="placeholder">🦸</div>
                            )}
                            <span className="image-label">Герой</span>
                          </div>
                          <div className="story-image-item">
                            {story.antagonistImage ? (
                              <img src={story.antagonistImage} alt="Антигерой" />
                            ) : (
                              <div className="placeholder">⚔️</div>
                            )}
                            <span className="image-label">Антигерой</span>
                          </div>
                        </div>
                        <div className="story-card-content">
                          <div className="story-card-top">
                            <h3>{story.title}</h3>
                            <div className="story-descriptions">
                              <div className="story-description">
                                <span className="story-description-label">Мир:</span>
                                <span className="story-description-text">{shortText(story.worldDescription)}</span>
                              </div>
                              <div className="story-description">
                                <span className="story-description-label">Герой:</span>
                                <span className="story-description-text">{shortText(story.heroDescription)}</span>
                              </div>
                              <div className="story-description">
                                <span className="story-description-label">Антигерой:</span>
                                <span className="story-description-text">{shortText(story.antagonistDescription)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="story-meta">
                            <span className="story-age">{ageLabel}</span>
                            <span className="chapter-count-big">{story.chapters.length} глав</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
