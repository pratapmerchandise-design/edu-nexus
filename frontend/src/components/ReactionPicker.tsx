import React, { useEffect, useRef } from 'react';

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  position?: 'top' | 'bottom';
  align?: 'left' | 'right' | 'center';
  className?: string;
  emojis?: string[];
}

const DEFAULT_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🚀'];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  onSelect,
  onClose,
  position = 'top',
  align = 'center',
  className = '',
  emojis = DEFAULT_EMOJIS,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const posClasses =
    position === 'top'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  const alignClasses =
    align === 'left'
      ? 'left-0'
      : align === 'right'
      ? 'right-0'
      : 'left-1/2 -translate-x-1/2';

  return (
    <div
      ref={containerRef}
      className={`absolute z-40 flex items-center gap-1 p-1.5 bg-card/95 backdrop-blur-md border border-border/80 rounded-full shadow-xl shadow-black/20 animate-in fade-in zoom-in-95 duration-150 ${posClasses} ${alignClasses} ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(emoji);
            onClose?.();
          }}
          className="w-8 h-8 flex items-center justify-center text-lg rounded-full hover:bg-secondary/80 hover:scale-130 active:scale-95 transition-all duration-150 cursor-pointer select-none"
          title={`React with ${emoji}`}
        >
          <span>{emoji}</span>
        </button>
      ))}
    </div>
  );
};
