import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Story, ChapterNode } from "../types";
import { generateChapter, generateImage } from "../services/ai";
import { WORLDS } from "../config/worlds";
import "./StoryReader.css";

interface StoryReaderProps {
  story: Story;
  onChapterUpdate: (story: Story) => void;
  onBack: () => void;
}

export function StoryReader({ story, onChapterUpdate, onBack }: StoryReaderProps) {
  const [loading, setLoading] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());
  const chapter = story.currentChapter;
  const world = story.worldMode ? WORLDS[story.worldMode] : null;
  const defaultBg = world?.backgroundColor || "#1a0f00";

  useEffect(() => {
    setSelectedChoices(new Set());
  }, [chapter?.id, story.id]);

  const handleChoiceSelect = async (choiceText: string) => {
    if (loading) return;

    setLoading(true);
    setSelectedChoices(prev => new Set([...prev, choiceText]));
    try {
      const stateSummary = chapter?.state_summary || "История только начинается";

      const response = await generateChapter(
        story.worldMode!,
        story.worldDescription,
        story.heroDescription,
        story.antagonistDescription,
        stateSummary,
        choiceText
      );

      const newNodeId = uuidv4();

      let sceneImageUrl = "";
      try {
        if (response.scene_image_prompt) {
          sceneImageUrl = await generateImage(response.scene_image_prompt, world?.imageStyleSuffix);
        }
      } catch (imgError) {
        console.warn("Failed to generate scene image:", imgError);
      }

      const newChapter: ChapterNode = {
        id: newNodeId,
        title: response.title,
        narration_text: response.narration_text,
        scene_image_url: sceneImageUrl,
        choices: response.choices.map((c) => ({
          id: uuidv4(),
          text: c.text,
        })),
        state_summary: response.state_summary_end,
      };

      const updatedStory: Story = {
        ...story,
        chapters: [...story.chapters, newChapter],
        currentChapter: newChapter,
        updatedAt: new Date().toISOString(),
      };

      onChapterUpdate(updatedStory);
    } catch (error) {
      console.error("Failed to generate next chapter:", error);
      alert("Ошибка при генерировании следующей главы: " + (error instanceof Error ? error.message : ""));
    } finally {
      setLoading(false);
    }
  };

  if (!chapter) {
    return (
      <div className="story-reader empty">
        <p>История не начата</p>
        <button className="btn-back-menu" onClick={onBack}>
          ← Назад
        </button>
      </div>
    );
  }

  return (
    <div 
      className="story-reader" 
      style={{ 
        backgroundColor: defaultBg,
        '--bg-color': defaultBg
      } as React.CSSProperties & { '--bg-color': string }}
    >
      {chapter.scene_image_url && (
        <div className="image-container">
          <img src={chapter.scene_image_url} alt={chapter.title} className="scene-image" />
          <div className="image-gradient"></div>
        </div>
      )}

      <div className="reader-back-row">
        <button className="btn-back-menu reader-back-button" onClick={onBack}>
          ← Назад
        </button>
      </div>

      <div className="content-wrapper">
        <h1 className="chapter-title">
          {`Глава ${Math.max(1, story.chapters.findIndex((c) => c.id === chapter.id) + 1)}. ${chapter.title}`}
        </h1>

        <div className="narration">
          {chapter.narration_text.split('\n\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <div className="choices-section">
          <h2 className="choices-title">Что будет дальше?</h2>
          <div className="choices-grid">
            {chapter.choices?.map((choice) => (
              <button
                key={choice.id}
                className={`choice-button ${selectedChoices.has(choice.text) ? 'choice-selected' : ''}`}
                onClick={() => handleChoiceSelect(choice.text)}
                disabled={loading}
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="loading-indicator">⏳ Создаём следующую главу...</div>}
      </div>
    </div>
  );
}
