import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, X, Sparkles, Upload, Link as LinkIcon, Flame, Trophy, 
  Laugh, BookOpen, ThumbsUp, Loader2, Gamepad2, Film, Smile, 
  Heart, ChevronDown
} from 'lucide-react';
import { api, uploadFile } from '../services/api';

export interface GifItem {
  id: string;
  title: string;
  url: string;
  preview_url: string;
  width?: number;
  height?: number;
}

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
  title?: string;
}

const CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: Flame, query: '' },
  { id: 'memes', label: 'Memes', icon: Sparkles, query: 'meme' },
  { id: 'reactions', label: 'Reactions', icon: ThumbsUp, query: 'reaction' },
  { id: 'study', label: 'Study & Tech', icon: BookOpen, query: 'coding study science' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, query: 'gaming play' },
  { id: 'anime', label: 'Anime & TV', icon: Film, query: 'anime' },
  { id: 'sports', label: 'Sports', icon: Trophy, query: 'sports celebration' },
  { id: 'funny', label: 'Funny & LOL', icon: Laugh, query: 'funny laugh' },
  { id: 'animals', label: 'Cute Animals', icon: Smile, query: 'cute animal cat dog' },
  { id: 'celebrate', label: 'Celebrate', icon: Heart, query: 'celebrate win party' },
];

const QUICK_SUGGESTIONS = [
  'Batman', 'Cat', 'Dance', 'Messi', 'Iron Man', 'Coding', 'Exam', 'Naruto', 'High Five', 'Cheering'
];

const DIRECT_GIPHY_KEY = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';
const PAGE_SIZE = 24;

export const GifPicker: React.FC<GifPickerProps> = ({ onSelect, onClose, title = 'Choose a GIF' }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('trending');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch helper: queries backend proxy /api/gifs with fallback to direct GIPHY API
  const fetchGifs = useCallback(async (query: string, pageOffset: number, append: boolean = false) => {
    if (pageOffset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let endpoint = '';
      if (query.trim()) {
        endpoint = `/gifs/search?q=${encodeURIComponent(query.trim())}&offset=${pageOffset}&limit=${PAGE_SIZE}`;
      } else {
        endpoint = `/gifs/trending?offset=${pageOffset}&limit=${PAGE_SIZE}`;
      }

      // 1. Try EduNexus backend API
      let data: any = null;
      try {
        data = await api.get<{ gifs: GifItem[]; total_count: number; offset: number }>(endpoint);
      } catch (backendErr) {
        console.warn('Backend GIF proxy unavailable, falling back to direct GIPHY:', backendErr);
        // 2. Direct fallback to GIPHY
        const gEndpoint = query.trim() ? 'search' : 'trending';
        const gParams = query.trim()
          ? `q=${encodeURIComponent(query.trim())}&offset=${pageOffset}&limit=${PAGE_SIZE}&rating=g`
          : `offset=${pageOffset}&limit=${PAGE_SIZE}&rating=g`;
        const gRes = await fetch(`https://api.giphy.com/v1/gifs/${gEndpoint}?api_key=${DIRECT_GIPHY_KEY}&${gParams}`);
        if (gRes.ok) {
          const gData = await gRes.json();
          const items: GifItem[] = (gData.data || []).map((g: any) => ({
            id: g.id,
            title: g.title || 'GIF',
            url: g.images?.original?.url || g.images?.downsized?.url || g.images?.fixed_height?.url,
            preview_url: g.images?.fixed_height?.url || g.images?.fixed_height_small?.url || g.images?.original?.url,
            width: Number(g.images?.fixed_height?.width) || 200,
            height: Number(g.images?.fixed_height?.height) || 150,
          })).filter((item: GifItem) => !!item.url);
          data = {
            gifs: items,
            total_count: gData.pagination?.total_count || items.length,
            offset: pageOffset,
          };
        }
      }

      if (data && Array.isArray(data.gifs)) {
        if (append) {
          setGifs((prev) => [...prev, ...data.gifs]);
        } else {
          setGifs(data.gifs);
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
        }
        setTotalCount(data.total_count || 0);
        setOffset(pageOffset);
      } else if (!append) {
        setGifs([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Failed to load GIFs:', err);
      if (!append) {
        setGifs([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Effect on search or category change (debounced 280ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeCat = CATEGORIES.find((c) => c.id === selectedCategory);
      const effectiveQuery = search.trim() || activeCat?.query || '';
      fetchGifs(effectiveQuery, 0, false);
    }, 280);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, fetchGifs]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setSearch('');
  };

  const handleSuggestionClick = (keyword: string) => {
    setSearch(keyword);
    setSelectedCategory('');
  };

  const handleLoadMore = () => {
    if (isLoadingMore || gifs.length >= totalCount) return;
    const nextOffset = offset + PAGE_SIZE;
    const activeCat = CATEGORIES.find((c) => c.id === selectedCategory);
    const effectiveQuery = search.trim() || activeCat?.query || '';
    fetchGifs(effectiveQuery, nextOffset, true);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onSelect(customUrl.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await uploadFile(file);
      onSelect(data.url);
    } catch (err: any) {
      alert(err.message || 'Failed to upload GIF file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-border flex items-center justify-between bg-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shadow-md shadow-primary/25">
              GIF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Unlimited Live GIFs
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Search and share anything across millions of GIFs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Upload Action */}
        <div className="p-3 border-b border-border space-y-2.5 bg-card">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search any GIF on the internet (e.g. messi, iron man, study, anime, cricket)..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (selectedCategory) setSelectedCategory('');
                }}
                className="w-full bg-secondary/80 border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              {isLoading ? (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
              ) : search ? (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              title="Upload your own .gif file"
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 text-foreground"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".gif,image/gif"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Quick Suggestion Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground shrink-0 mr-1">
              Popular:
            </span>
            {QUICK_SUGGESTIONS.map((word) => (
              <button
                key={word}
                onClick={() => handleSuggestionClick(word)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors shrink-0 ${
                  search.toLowerCase() === word.toLowerCase()
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {word}
              </button>
            ))}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id && !search;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-3 py-1 rounded-xl font-bold text-[11px] whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]'
                      : 'bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* GIFs Grid */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin"
        >
          {isLoading && gifs.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-video bg-secondary/60 animate-pulse rounded-2xl border border-border/40"
                />
              ))}
            </div>
          ) : gifs.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {gifs.map((gif) => (
                  <button
                    key={`${gif.id}-${gif.preview_url}`}
                    type="button"
                    onClick={() => onSelect(gif.url)}
                    className="group relative rounded-2xl overflow-hidden bg-secondary border border-border/80 hover:border-primary hover:shadow-xl transition-all aspect-video flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <img
                      src={gif.preview_url || gif.url}
                      alt={gif.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      <span className="text-[11px] font-bold text-white truncate w-full text-left drop-shadow-sm">
                        {gif.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Load More Button */}
              {gifs.length < totalCount && (
                <div className="text-center pt-2 pb-1">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold text-foreground inline-flex items-center gap-2 hover:border-primary transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>Loading more GIFs...</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-primary" />
                        <span>Load More GIFs ({gifs.length} of {totalCount})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground">
                <Search className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-foreground">No GIFs found for "{search}"</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Try searching for a different keyword like "happy", "study", "cat", or click on one of the popular categories above.
              </p>
            </div>
          )}
        </div>

        {/* Custom Direct GIF URL Bar */}
        <div className="p-3 border-t border-border bg-secondary/20">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="url"
                placeholder="Or paste any direct GIF link (https://...gif)..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={!customUrl.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
            >
              Insert
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
