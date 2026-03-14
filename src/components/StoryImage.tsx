interface StoryImageProps {
  src?: string;
  alt: string;
  fallback?: string;
}

export function StoryImage({ src, alt, fallback }: StoryImageProps) {
  return (
    <div className="story-image-container">
      {src ? (
        <img src={src} alt={alt} />
      ) : fallback ? (
        <img src={fallback} alt={alt} />
      ) : (
        <div className="image-placeholder">{alt}</div>
      )}
    </div>
  );
}
