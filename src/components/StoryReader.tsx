import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Story, ChapterNode } from "../types";
import { generateChapter, generateImage } from "../services/ai";
import { GENRES, Genre } from "../config/worlds";
import "./StoryReader.css";

interface StoryReaderProps {
  story: Story;
  onChapterUpdate: (story: Story) => void;
  onBack: () => void;
}

const STOP_WORDS = new Set([
  "и",
  "в",
  "на",
  "по",
  "к",
  "с",
  "а",
  "но",
  "или",
  "что",
  "как",
  "мы",
  "вы",
  "он",
  "она",
  "они",
  "это",
  "то",
  "за",
  "для",
  "же",
  "ли",
  "да"
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
}

function buildReferenceText(nextChapter: ChapterNode | null) {
  if (!nextChapter) return "";
  return [nextChapter.title, nextChapter.narration_text, nextChapter.state_summary]
    .filter(Boolean)
    .join(" ");
}

function guessSelectedChoice(choices: ChapterNode["choices"], nextChapter: ChapterNode | null) {
  if (!choices?.length || !nextChapter) return null;
  const referenceTokens = new Set(tokenize(buildReferenceText(nextChapter)));
  let best: string | null = null;
  let bestScore = 0;

  choices.forEach((choice) => {
    const tokens = tokenize(choice.text);
    const score = tokens.reduce((acc, token) => acc + (referenceTokens.has(token) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = choice.text;
    }
  });

  return bestScore > 0 ? best : null;
}

function getNextChapter(story: Story, current: ChapterNode | null) {
  if (!current) return null;
  const index = story.chapters.findIndex((node) => node.id === current.id);
  if (index === -1) return null;
  return story.chapters[index + 1] || null;
}

function resolveGenre(mode?: string) {
  if (!mode) return null;
  const normalized = mode === "fairy_tale" ? "fairytale" : mode;
  return GENRES[normalized as Genre] || null;
}

export function StoryReader({ story, onChapterUpdate, onBack }: StoryReaderProps) {
  const [loading, setLoading] = useState(false);
  const [selectedChoices, setSelectedChoices] = useState<Set<string>>(new Set());
  const [isFlipping, setIsFlipping] = useState(false);
  const chapter = story.currentChapter;
  const world = resolveGenre(story.worldMode);
  const defaultBg = "#1a0f00";
  const nextChapter = getNextChapter(story, chapter);
  const inferredChoice = chapter?.selectedChoiceText || guessSelectedChoice(chapter?.choices, nextChapter);

  // Issue 4: Determine visible choices based on story state
  let visibleChoices = chapter?.choices || [];
  if (nextChapter && inferredChoice && chapter?.choices) {
    // Has next chapter and inferred choice → show only selected
    visibleChoices = chapter.choices.filter((choice) => choice.text === inferredChoice);
  } else if (!nextChapter) {
    // No next chapter (last chapter) → show all choices
    visibleChoices = chapter?.choices || [];
  }
  // If has next chapter but no inference → show all choices (default already set)

  useEffect(() => {
    if (!chapter) {
      setSelectedChoices(new Set());
      return;
    }
    setSelectedChoices(inferredChoice ? new Set([inferredChoice]) : new Set());
  }, [chapter?.id, story.id, story.chapters, inferredChoice]);

  useEffect(() => {
    if (!chapter) return;
    setIsFlipping(true);
    const timer = setTimeout(() => setIsFlipping(false), 450);
    return () => clearTimeout(timer);
  }, [chapter?.id]);

  const handleChoiceSelect = async (choiceText: string) => {
    if (loading) return;

    if (selectedChoices.has(choiceText)) {
      const nextChapter = getNextChapter(story, chapter);
      if (nextChapter) {
        onChapterUpdate({
          ...story,
          currentChapter: nextChapter,
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }

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

      const updatedChapters = story.chapters.map((node) =>
        node.id === chapter.id ? { ...node, selectedChoiceText: choiceText } : node
      );

      const updatedStory: Story = {
        ...story,
        chapters: [...updatedChapters, newChapter],
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
      className={`story-reader ${isFlipping ? "page-flip" : ""}`}
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

        {visibleChoices.length > 0 && (
          <div className="choices-section">
            <h2 className="choices-title">Что будет дальше?</h2>
            <div className="choices-grid">
              {visibleChoices.map((choice) => (
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
        )}

        {loading && <div className="loading-indicator">⏳ Создаём следующую главу...</div>}
      </div>
    </div>
  );
}
