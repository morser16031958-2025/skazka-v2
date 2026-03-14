import { motion, Variants } from "framer-motion";
import { WORLDS, WorldMode } from "../config/worlds";
import "./DoorSelect.css";

interface DoorSelectProps {
  onSelect: (worldMode: WorldMode) => void;
  onBack: () => void;
}

const WORLD_IMAGES: Record<WorldMode, string> = {
  fairytale: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800",
  adventure: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800",
  magic: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800",
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export function DoorSelect({ onSelect, onBack }: DoorSelectProps) {
  const worldModes = Object.keys(WORLDS) as WorldMode[];

  return (
    <div className="door-select">
      <div className="door-background" />
      <div className="door-overlay" />

      <button className="door-back-button" onClick={onBack}>
        ← Назад
      </button>
      
      <motion.h1
        className="main-title"
        variants={titleVariants}
        initial="hidden"
        animate="visible"
      >
        Начни свою сказку
      </motion.h1>

      <motion.div
        className="cards-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {worldModes.map((worldMode) => {
          const world = WORLDS[worldMode];
          return (
            <motion.button
              key={worldMode}
              className="world-card"
              variants={itemVariants}
              onClick={() => onSelect(worldMode)}
              whileHover={{ translateY: -6 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <img
                src={WORLD_IMAGES[worldMode]}
                alt={world.name}
                className="card-bg-image"
              />
              <div className="card-gradient" />
              <div className="card-content">
                <span
                  className="card-age"
                  style={{ color: world.accentColor }}
                >
                  {world.ageLabel}
                </span>
                <h2 className="card-title">{world.name}</h2>
                <p className="card-description">{world.description}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
