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

function normalizeWorldMode(mode?: string) {
  if (mode === "fairy_tale") return "fairytale";
  return mode;
}

function getWorldByMode(mode?: string) {
  const normalized = normalizeWorldMode(mode);
  if (!normalized) return null;
  return WORLD_MAP[normalized] || null;
}

function sortStories(stories: Story[]): Story[] {
  const getWorldIndex = (worldMode?: string) => {
    const normalized = normalizeWorldMode(worldMode);
    if (!normalized) return Number.MAX_SAFE_INTEGER;
    const index = WORLD_ORDER.indexOf(normalized as WorldMode);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  return [...stories].sort((a, b) => {
    const worldIndexA = getWorldIndex(a.worldMode);
    const worldIndexB = getWorldIndex(b.worldMode);
    if (worldIndexA !== worldIndexB) return worldIndexA - worldIndexB;

    const worldA = getWorldByMode(a.worldMode);
    const worldB = getWorldByMode(b.worldMode);
    const worldNameA = worldA?.name || "Другие";
    const worldNameB = worldB?.name || "Другие";
    if (worldNameA !== worldNameB) return worldNameA.localeCompare(worldNameB);

    return (a.title || "").localeCompare(b.title || "");
  });
}

function groupByWorld(stories: Story[]): Array<{ worldMode: WorldMode | null; worldName: string; stories: Story[] }> {
  const groups = new Map<string, Story[]>();

  stories.forEach((story) => {
    const worldMode = story.worldMode || null;
    const world = getWorldByMode(worldMode || undefined);
    const worldName = world?.name || "Другие";
    if (!groups.has(worldName)) {
      groups.set(worldName, []);
    }
    groups.get(worldName)!.push(story);
  });

  const orderedWorlds = WORLD_ORDER.map((mode) => ({
    worldMode: mode,
    worldName: WORLDS[mode].name,
    stories: groups.get(WORLDS[mode].name) || []
  })).filter((group) => group.stories.length > 0);

  const otherStories = groups.get("Другие");
  if (otherStories && otherStories.length > 0) {
    orderedWorlds.push({ worldMode: null, worldName: "Другие", stories: otherStories });
  }

  return orderedWorlds;
}

function shortText(text?: string, maxLength: number = 90) {
  if (!text) return "—";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const clipped = cleaned.slice(0, maxLength).replace(/[.,;:!?]?\s*$/, "");
  return `${clipped}…`;
}

export function MyStories({ stories, onSelectStory, onNewStory, onDeleteStory: _onDeleteStory, onBack }: MyStoriesProps) {
  const sortedStories = sortStories(stories);
  const worldGroups = groupByWorld(sortedStories);

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

        {sortedStories.length === 0 ? (
          <div className="empty-state">
            <p>У вас ещё нет историй.</p>
            <p>Создайте первую историю — начните со сказки, приключения или магии!</p>
            <button className="btn-primary" onClick={onNewStory}>
              🚀 Создать первую историю
            </button>
          </div>
        ) : (
          <div className="stories-shelves">
            {worldGroups.map((group) => (
              <div key={group.worldName} className="world-shelf">
                <h2 className="shelf-title">{group.worldName}</h2>
                <div className="stories-grid">
                  {group.stories.map((story) => {
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
