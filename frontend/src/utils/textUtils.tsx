export const renderContentWithHighlights = (content: string) => {
  if (!content) return null;
  return content.split(/(\s+)/).map((word, i) => {
    if (word.startsWith('#') || word.startsWith('@')) {
      return <span key={i} className="text-primary font-bold hover:underline cursor-pointer">{word}</span>;
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
