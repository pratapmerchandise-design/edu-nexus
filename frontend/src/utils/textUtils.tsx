export const renderContentWithHighlights = (content: string) => {
  if (!content) return null;
  return content.split(/(\s+)/).map((word, i) => {
    if (word.startsWith('#') || word.startsWith('@')) {
      return <span key={i} className="text-primary font-bold hover:underline cursor-pointer">{word}</span>;
    }
    if (isStickerUrl(word.trim())) {
      return (
        <img
          key={i}
          src={word.trim()}
          alt="sticker"
          className="inline-block w-16 h-16 sm:w-20 sm:h-20 align-middle mx-0.5"
          draggable={false}
        />
      );
    }
    if (word.includes('http://') || word.includes('https://')) {
      return (
        <a key={i} href={word.trim()} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 500, wordBreak: 'break-all' }}>
          {word}
        </a>
      );
    }
    return word;
  });
};

export const isStickerUrl = (url: string): boolean => {
  if (!url) return false;
  return /\/api\/stickers\/packs\/[^/]+\/[^/]+\.svg(\?.*)?$/i.test(url);
};

export const isStickerOnlyContent = (content: string): boolean => {
  if (!content) return false;
  const trimmed = content.trim();
  if (!trimmed) return false;
  // Treat as sticker-only if every non-whitespace token is a sticker URL
  return trimmed.split(/\s+/).every((tok) => isStickerUrl(tok));
};

export const timeAgo = (dateString: string) => {
  const dateStr = dateString.endsWith('Z') ? dateString : dateString + 'Z';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  
  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
    }
  }
  return "just now";
};

export const isVideoUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|mov|mkv|avi|m4v)(\?.*)?$/i.test(url);
};
