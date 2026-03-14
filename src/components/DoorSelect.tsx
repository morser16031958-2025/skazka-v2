import { useState } from "react";
import { GENRES, Genre, AgeGroup } from "../config/worlds";
import "./DoorSelect.css";

interface DoorSelectProps {
  onSelect: (genre: Genre, ageGroup: AgeGroup) => void;
}

const AGE_GROUPS: Array<{ id: AgeGroup; label: string }> = [
  { id: "3-5", label: "3-5 лет" },
  { id: "6-8", label: "6-8 лет" },
  { id: "9-12", label: "9-12 лет" },
  { id: "13+", label: "13+" },
  { id: "auto", label: "AI решит" },
];

export function DoorSelect({ onSelect }: DoorSelectProps) {
  const genres = Object.keys(GENRES) as Genre[];
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("auto");

  return (
    <div className="door-select">
      <div className="door-background" />
      <div className="door-overlay" />
      
      <div className="door-header">
        <h1 className="main-title">Выбери свой мир</h1>
      </div>

      <div className="genre-grid">
        {genres.map((genre) => {
          const item = GENRES[genre];
          const isSelected = selectedGenre === genre;
          return (
            <button
              key={genre}
              type="button"
              className={`genre-card ${isSelected ? "selected" : ""}`}
              style={{
                borderColor: isSelected ? item.accentColor : "rgba(255,255,255,0.1)",
                backgroundColor: isSelected ? `${item.accentColor}26` : "rgba(255,255,255,0.05)",
              }}
              onClick={() => setSelectedGenre(genre)}
            >
              <div className="genre-title-row">
                {isSelected && (
                  <span className="genre-dot" style={{ backgroundColor: item.accentColor }} />
                )}
                <span className="genre-title">{item.name}</span>
              </div>
              <span className="genre-description">{item.description}</span>
            </button>
          );
        })}
      </div>

      <div className="age-block">
        <span className="age-title">Для кого создаем?</span>
        <div className="age-pills">
          {AGE_GROUPS.map((group) => {
            const isActive = ageGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                className={`age-pill ${isActive ? "active" : ""}`}
                onClick={() => setAgeGroup(group.id)}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedGenre && (
        <button
          className="next-button"
          type="button"
          onClick={() => onSelect(selectedGenre, ageGroup)}
        >
          Дальше →
        </button>
      )}
    </div>
  );
}
