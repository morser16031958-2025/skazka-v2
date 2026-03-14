import { useState, useEffect } from "react";
import { Story } from "./types";
import { WorldMode } from "./config/worlds";
import { Landing } from "./components/Landing";
import { DoorSelect } from "./components/DoorSelect";
import { StoryWizard } from "./components/StoryWizard";
import { StoryReader } from "./components/StoryReader";
import { MyStories } from "./components/MyStories";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./App.css";

type AppScreen = "landing" | "menu" | "stories" | "wizard" | "reader";

function App() {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [selectedWorldMode, setSelectedWorldMode] = useState<WorldMode | null>(null);

  // Загрузить истории при старте
  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await fetch("/api/stories");
      if (response.ok) {
        const data = await response.json();
        // Преобразуем старый формат v1 в v2 (если нужно)
        // Пока просто сохраняем как есть
        setStories(data);
      }
    } catch (error) {
      console.error("Failed to load stories:", error);
    }
  };

  const handleDoorSelect = (worldMode: WorldMode) => {
    setSelectedWorldMode(worldMode);
    setScreen("wizard");
  };

  const handleStoryCreated = async (newStory: Story) => {
    // Генерируем первую главу
    try {
      const { generateChapter } = await import("./services/ai");

      const firstChapter = await generateChapter(
        newStory.worldMode!,
        newStory.worldDescription,
        newStory.heroDescription,
        newStory.antagonistDescription,
        "История только начинается"
      );

      const chapterNode = {
        id: "chapter_0",
        title: firstChapter.title,
        narration_text: firstChapter.narration_text,
        scene_image_url: "",
        choices: firstChapter.choices.map((c, i) => ({
          id: `choice_${i}`,
          text: c.text,
        })),
        state_summary: firstChapter.state_summary_end,
      };

      const storyWithChapter: Story = {
        ...newStory,
        chapters: [chapterNode],
        currentChapter: chapterNode,
      };

      // Сохраняем в БД
      await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storyWithChapter),
      });

      setCurrentStory(storyWithChapter);
      setStories([...stories, storyWithChapter]);
      setScreen("reader");
    } catch (error) {
      console.error("Failed to create first chapter:", error);
      alert("Ошибка при создании первой главы: " + (error instanceof Error ? error.message : ""));
    }
  };

  const handleBackToMenu = () => {
    setScreen("menu");
    setCurrentStory(null);
    setSelectedWorldMode(null);
  };

  const handleOpenStory = (story: Story) => {
    setCurrentStory(story);
    setScreen("reader");
  };

  const handleUpdateStory = (updatedStory: Story) => {
    setCurrentStory(updatedStory);
    setStories(stories.map((s) => (s.id === updatedStory.id ? updatedStory : s)));

    // Сохраняем в БД
    fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedStory),
    }).catch(console.error);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      setStories(stories.filter((s) => s.id !== storyId));
      if (currentStory?.id === storyId) {
        setCurrentStory(null);
      }
    } catch (error) {
      console.error("Failed to delete story:", error);
      alert("Ошибка при удалении истории");
    }
  };

  const handleNewStory = () => {
    setScreen("menu");
    setCurrentStory(null);
  };

  const handleShowStories = () => {
    setScreen("stories");
  };

  const handleLandingCreateStory = () => {
    setScreen("menu");
  };

  const handleLandingLibrary = () => {
    setScreen("stories");
  };

  return (
    <ErrorBoundary>
      {screen === "landing" && (
        <Landing 
          onCreateStory={handleLandingCreateStory} 
          onLibrary={handleLandingLibrary} 
        />
      )}

      {screen === "menu" && (
        <DoorSelect onSelect={handleDoorSelect} />
      )}

      {screen === "wizard" && selectedWorldMode && (
        <StoryWizard
          worldMode={selectedWorldMode}
          onStoryCreated={handleStoryCreated}
          onCancel={handleBackToMenu}
        />
      )}

      {screen === "reader" && currentStory && (
        <StoryReader
          story={currentStory}
          onChapterUpdate={handleUpdateStory}
          onBack={handleBackToMenu}
        />
      )}

      {screen === "stories" && (
        <MyStories
          stories={stories}
          onSelectStory={handleOpenStory}
          onNewStory={handleNewStory}
          onDeleteStory={handleDeleteStory}
          onBack={() => setScreen("landing")}
        />
      )}
    </ErrorBoundary>
  );
}

export default App;
