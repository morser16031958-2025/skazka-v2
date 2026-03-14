import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { WorldMode, WORLDS } from "../config/worlds";
import { Story } from "../types";
import { generateWorldSetup } from "../services/ai";
import "./StoryWizard.css";

interface StoryWizardProps {
  worldMode: WorldMode;
  onStoryCreated: (story: Story) => void;
  onCancel: () => void;
}

const STAGES = [
  "✨ Создаём волшебный мир...",
  "🦸 Придумываем героя...",
  "⚔️ Готовим испытание...",
  "🎨 Рисуем иллюстрации..."
];

export function StoryWizard({ worldMode, onStoryCreated, onCancel }: StoryWizardProps) {
  const world = WORLDS[worldMode];
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"generating" | "preview">("generating");
  const [story, setStory] = useState<Partial<Story> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading) return;

    // Переключение этапов каждые 8 секунд
    const stageInterval = setInterval(() => {
      setCurrentStage(prev => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 8000);

    // Прогресс-бар от 0 до 90% за 35 секунд
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (90 / 350); // 90% за 35 сек (350 * 100ms)
        return Math.min(newProgress, 90);
      });
    }, 100);

    return () => {
      clearInterval(stageInterval);
      clearInterval(progressInterval);
    };
  }, [loading]);

  const handleGenerateWorld = async () => {
    setLoading(true);
    setError(null);
    setCurrentStage(0);
    setProgress(0);
    try {
      const setup = await generateWorldSetup(worldMode);

      const newStory: Partial<Story> = {
        id: uuidv4(),
        title: `История из ${world.name}`,
        worldMode,
        ageLabel: world.ageLabel,
        worldDescription: setup.worldDescription,
        heroDescription: setup.heroDescription,
        antagonistDescription: setup.antagonistDescription,
        worldImage: setup.worldImage,
        heroImage: setup.heroImage,
        antagonistImage: setup.antagonistImage,
        chapters: [],
        currentChapter: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setStory(newStory);
      setProgress(100);
      setStep("preview");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка при создании мира";
      setError(message);
      console.error("Failed to generate world:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStory = () => {
    if (story) {
      onStoryCreated(story as Story);
    }
  };

  return (
    <div className="story-wizard">
      {step === "generating" && (
        <div className="wizard-generating" style={{ backgroundColor: loading ? world.accentColor : undefined }}>
          {loading ? (
            <div className="loading-screen">
              <h2>{STAGES[currentStage]}</h2>
              <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="progress-text">{Math.round(progress)}%</p>
              <div className="stages-indicator">
                {STAGES.map((_, idx) => (
                  <div
                    key={idx}
                    className={`stage-dot ${idx <= currentStage ? 'active' : ''}`}
                  ></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <h2>✨ Создаём твой мир...</h2>
              <p className="world-name">{world.name}</p>
              {error && <div className="error-message">{error}</div>}
              <button
                className="btn-primary"
                onClick={handleGenerateWorld}
                disabled={loading}
              >
                {loading ? "⏳ Загружаем..." : "🚀 Начать"}
              </button>
              <button className="btn-secondary" onClick={onCancel}>
                ← Отмена
              </button>
            </>
          )}
        </div>
      )}
      {step === "preview" && story && (
        <div className="wizard-preview">
          <h2>{story.title}</h2>

          <div className="preview-section">
            <h3>🌍 Мир</h3>
            {story.worldImage && (
              <img src={story.worldImage} alt="Мир" className="preview-image" />
            )}
            <p>{story.worldDescription}</p>
          </div>

          <div className="preview-section">
            <h3>🦸 Герой</h3>
            {story.heroImage && (
              <img src={story.heroImage} alt="Герой" className="preview-image" />
            )}
            <p>{story.heroDescription}</p>
          </div>

          <div className="preview-section">
            <h3>⚔️ Препятствие</h3>
            {story.antagonistImage && (
              <img src={story.antagonistImage} alt="Препятствие" className="preview-image" />
            )}
            <p>{story.antagonistDescription}</p>
          </div>

          <div className="wizard-actions">
            <button className="btn-primary" onClick={handleStartStory}>
              📖 Начать историю
            </button>
            <button className="btn-secondary" onClick={() => setStep("generating")}>
              🔄 Создать другой мир
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
