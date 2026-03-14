import { WorldMode } from "./config/worlds";

export interface Choice {
  id: string;
  text: string;
}

export interface ChapterNode {
  id: string;
  title: string;
  narration_text: string;
  scene_image_url: string;
  choices: Choice[];
  state_summary: string;
}

export interface Story {
  id: string;
  title: string;
  worldMode: WorldMode;
  worldDescription: string;
  heroDescription: string;
  antagonistDescription: string;
  heroImage?: string;
  antagonistImage?: string;
  worldImage?: string;
  chapters: ChapterNode[];
  currentChapter: ChapterNode | null;
  createdAt: string;
  updatedAt: string;
}
