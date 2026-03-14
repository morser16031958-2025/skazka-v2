import { Story } from "../types";
import { WORLDS } from "../config/worlds";
import "./MyStories.css";

interface MyStoriesProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onNewStory: () => void;
  onDeleteStory: (storyId: string) => void;
  onBack: () => void;
}

function sortStories(stories: Story[]): Story[] {
  const defaultWorld = {
    name: "Другие",
    ageLabel: "zzz",
    description: "",
    buttonText: "",
    systemPrompt: "",
    imageStyleSuffix: "",
    textLength: { min: 0, max: 0 },
    accentColor: "#666",
    backgroundColor: "#000"
  };
  
  return [...stories].sort((a, b) => {
    const worldA = a.worldMode && WORLDS[a.worldMode] ? WORLDS[a.worldMode] : defaultWorld;
    const worldB = b.worldMode && WORLDS[b.worldMode] ? WORLDS[b.worldMode] : defaultWorld;
    
    // По возрасту
    if (worldA.ageLabel !== worldB.ageLabel) {
      return worldA.ageLabel.localeCompare(worldB.ageLabel);
    }
    // По названию мира
    if (a.worldDescription !== b.worldDescription) {
      return (a.worldDescription || "").localeCompare(b.worldDescription || "");
    }
    // По герою
    if (a.heroDescription !== b.heroDescription) {
      return (a.heroDescription || "").localeCompare(b.heroDescription || "");
    }
    // По антигерою
    return (a.antagonistDescription || "").localeCompare(b.antagonistDescription || "");
  });
}

function groupByWorld(stories: Story[]): Map<string, Story[]> {
  const groups = new Map<string, Story[]>();
  
  stories.forEach(story => {
    const worldMode = story.worldMode || "fairytale";
    const world = WORLDS[worldMode];
    const worldName = world?.name || "Другие";
    
    if (!groups.has(worldName)) {
      groups.set(worldName, []);
    }
    groups.get(worldName)!.push(story);
  });
  
  return groups;
}

export function MyStories({ stories, onSelectStory, onNewStory, onDeleteStory, onBack }: MyStoriesProps) {
  const sortedStories = sortStories(stories);
  const groupedStories = groupByWorld(sortedStories);
  const worldGroups = Array.from(groupedStories.entries());

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
            {worldGroups.map(([worldName, worldStories]) => (
              <div key={worldName} className="world-shelf">
                <h2 className="shelf-title">{worldName}</h2>
                <div className="stories-grid">
                  {worldStories.map((story) => (
                    <div key={story.id} className="story-card">
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
                  <h3>{story.title}</h3>
                  <div className="story-meta">
                    <span className="chapter-count">{story.chapters.length} глав(ы)</span>
                  </div>
                </div>
                <div className="story-actions">
                  <button className="btn-read" onClick={() => onSelectStory(story)}>
                    📖 Читать
                  </button>
                  <button className="btn-delete" onClick={() => onDeleteStory(story.id)}>
                    🗑️ Удалить
                  </button>
                </div>
              </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
