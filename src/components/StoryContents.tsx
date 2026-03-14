import { Story } from "../types";
import "./StoryContents.css";

interface StoryContentsProps {
  story: Story;
  onBack: () => void;
  onSelectChapter: (chapterIndex: number) => void;
}

export function StoryContents({ story, onBack, onSelectChapter }: StoryContentsProps) {
  return (
    <div className="story-contents">
      <div className="story-contents-bg" />
      <div className="story-contents-overlay" />
      <div className="story-contents-body">
        <div className="story-contents-header">
          <button className="btn-back-menu" onClick={onBack}>
            ← Назад
          </button>
          <h1>{story.title}</h1>
        </div>

        <div className="story-contents-hero">
          {story.worldImage ? (
            <img src={story.worldImage} alt="Мир" />
          ) : (
            <div className="story-contents-hero-placeholder">🌍</div>
          )}
        </div>

        <div className="story-contents-grid">
          {story.chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              type="button"
              className="story-contents-card"
              onClick={() => onSelectChapter(index)}
            >
              <span className="story-contents-card-title">{`Глава ${index + 1}.`}</span>
              <span className="story-contents-card-subtitle">{chapter.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
