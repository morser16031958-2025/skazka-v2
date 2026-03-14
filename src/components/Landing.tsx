import { motion, Variants } from "framer-motion";
import "./Landing.css";

interface LandingProps {
  onCreateStory: () => void;
  onLibrary: () => void;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

export function Landing({ onCreateStory, onLibrary }: LandingProps) {
  return (
    <div className="landing">
      <div className="landing-background" />
      <div className="landing-overlay" />

      <div className="landing-content">
        <motion.p
          className="landing-subtitle"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          Волшебные истории создаются здесь и сейчас
        </motion.p>

        <motion.div
          className="landing-buttons"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <button className="btn-create" onClick={onCreateStory}>
            ✨ Новая сказка
          </button>
          <button className="btn-library" onClick={onLibrary}>
            📚 Библиотека
          </button>
        </motion.div>

        <motion.p
          className="landing-footer"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
        >
          Часть проекта AIUniversity
        </motion.p>
      </div>
    </div>
  );
}
