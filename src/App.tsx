import { useState, useEffect } from "react";
import { Story } from "./types";
import { Genre, AgeGroup } from "./config/worlds";
import { Landing } from "./components/Landing";
import { DoorSelect } from "./components/DoorSelect";
import { StoryWizard } from "./components/StoryWizard";
import { StoryReader } from "./components/StoryReader";
import { MyStories } from "./components/MyStories";
import { StoryContents } from "./components/StoryContents";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./App.css";

type AppScreen = "landing" | "menu" | "stories" | "wizard" | "contents" | "reader";

function App() {
  const [screen, setScreen] = useState<AppScreen>("landing");
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [selectedWorldMode, setSelectedWorldMode] = useState<Genre | null>(null);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup>("auto");

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

  // Загрузить истории при старте
  useEffect(() => {
    loadStories();
  }, []);

  // Обновлять библиотеку при входе на экран
  useEffect(() => {
    if (screen === "stories") {
      loadStories();
    }
  }, [screen]);

  const handleDoorSelect = (worldMode: Genre, ageGroup: AgeGroup) => {
    setSelectedWorldMode(worldMode);
    setSelectedAgeGroup(ageGroup);
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
    const firstChapter = story.chapters?.[0] || null;
    setCurrentStory({ ...story, currentChapter: firstChapter });
    setScreen("contents");
  };

  const handleBackToLibrary = () => {
    setScreen("stories");
    setCurrentStory(null);
  };

  const handleBackToContents = () => {
    setScreen("contents");
  };

  const handleOpenChapter = (chapterIndex: number) => {
    if (!currentStory) return;
    const chapter = currentStory.chapters[chapterIndex] || null;
    setCurrentStory({ ...currentStory, currentChapter: chapter });
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
          ageGroup={selectedAgeGroup}
          onStoryCreated={handleStoryCreated}
          onCancel={handleBackToMenu}
        />
      )}

      {screen === "reader" && currentStory && (
        <StoryReader
          story={currentStory}
          onChapterUpdate={handleUpdateStory}
          onBack={handleBackToContents}
        />
      )}

      {screen === "contents" && currentStory && (
        <StoryContents
          story={currentStory}
          onBack={handleBackToLibrary}
          onSelectChapter={handleOpenChapter}
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
