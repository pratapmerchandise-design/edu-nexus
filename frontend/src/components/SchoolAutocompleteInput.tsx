import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Building2, Search, Check, Plus, Loader2, X } from 'lucide-react';

interface SchoolItem {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
}

interface SchoolAutocompleteInputProps {
  value: string;
  onChange: (schoolName: string, schoolId?: number) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  required?: boolean;
}
export const SchoolAutocompleteInput: React.FC<SchoolAutocompleteInputProps> = ({
  value,
  onChange,
  placeholder = 'Search your school, e.g. DPS, Modern School...',
  className = '',
  inputClassName = '',
  required = false,
}) => {
  const [query, setQuery] = useState(value || '');
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<SchoolItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const trimmed = query.trim();
        const data = await api.get<SchoolItem[]>(`/schools/search?q=${encodeURIComponent(trimmed)}&limit=12`);
        setSuggestions(data || []);
      } catch (err) {
        console.error('Failed to search schools:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (school: SchoolItem) => {
    setQuery(school.name);
    setSelectedId(school.id);
    onChange(school.name, school.id);
    setIsOpen(false);
  };

  const handleSelectCustom = () => {
    const trimmed = query.trim();
    if (trimmed) {
      setSelectedId(undefined);
      onChange(trimmed, undefined);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSelectedId(undefined);
    onChange('', undefined);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    const totalItems = suggestions.length + (query.trim() ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      } else if (highlightedIndex === suggestions.length && query.trim()) {
        handleSelectCustom();
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      } else if (query.trim()) {
        handleSelectCustom();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-muted-foreground pointer-events-none flex items-center">
          <Building2 className="w-4 h-4 text-primary" />
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          value={query}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onChange={(e) => {
            const nextVal = e.target.value;
            setQuery(nextVal);
            // Typing breaks the previous "selected" match; subsequent signup
            // will be sent as a brand-new (custom) school.
            if (selectedId) setSelectedId(undefined);
            onChange(nextVal, undefined);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={
            inputClassName ||
            'w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-all font-medium'
          }
        />

        <div className="absolute right-3 flex items-center gap-1">
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          )}
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto divide-y divide-border/40 scrollbar-thin">
          {/* Header indicator */}
          <div className="px-3.5 py-2 bg-secondary/40 text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Verified Campus Directory</span>
            <span>{suggestions.length} match{suggestions.length !== 1 ? 'es' : ''}</span>
          </div>

          {/* Suggestion items */}
          {suggestions.map((school, index) => {
            const isSelected = value.trim().toLowerCase() === school.name.trim().toLowerCase();
            const isHighlighted = highlightedIndex === index;

            return (
              <button
                key={school.id}
                type="button"
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(school)}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors ${
                  isHighlighted || isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5 border border-border/80">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt="" className="w-5 h-5 object-contain rounded" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                    <span className="truncate">{school.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </div>
                  {school.description && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {school.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}

          {/* Unlisted / Custom option */}
          {query.trim() && (
            <button
              type="button"
              onMouseEnter={() => setHighlightedIndex(suggestions.length)}
              onClick={handleSelectCustom}
              className={`w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 transition-colors border-t border-border/60 ${
                highlightedIndex === suggestions.length
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">
                  Use "<strong>{query.trim()}</strong>"
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Connect as a custom / unlisted campus
                </p>
              </div>
            </button>
          )}

          {suggestions.length === 0 && !query.trim() && !loading && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Start typing to search 160+ verified schools and campuses...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
