import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Search, Sparkles, X, Crown, Sticker as StickerIcon, Zap, ChevronRight } from 'lucide-react';
import { api, getApiBase } from '../services/api';

export interface Sticker {
  key: string;
  label: string;
  art?: string;
  emoji?: string;
}

export interface StickerPack {
  key: string;
  name: string;
  description: string;
  icon: string;
  tint: string;
  accent?: string;
  gradient?: string[];
  min_tier: string;
  unlocked: boolean;
  stickers: Sticker[];
}

interface StickerPickerProps {
  onSelect: (sticker: { packKey: string; stickerKey: string; url: string; label: string }) => void;
  onClose: () => void;
  onUpgradeClick?: () => void;
  title?: string;
}

export const StickerPicker: React.FC<StickerPickerProps> = ({
  onSelect,
  onClose,
  onUpgradeClick,
  title = 'Stickers',
}) => {
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hoveredSticker, setHoveredSticker] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ user_tier: string | null; packs: StickerPack[] }>('/stickers/packs');
        if (cancelled) return;
        setPacks(data.packs || []);
        setUserTier(data.user_tier || null);
        const firstUnlocked = (data.packs || []).find((p) => p.unlocked);
        setSelectedPackKey(firstUnlocked?.key || (data.packs?.[0]?.key ?? null));
      } catch (err) {
        console.error('Failed to load sticker packs', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apiBase = getApiBase();
  const stickerUrl = (packKey: string, stickerKey: string) =>
    `${apiBase}/stickers/packs/${packKey}/${stickerKey}.svg`;

  const selectedPack = useMemo(
    () => packs.find((p) => p.key === selectedPackKey) || null,
    [packs, selectedPackKey]
  );

  const filteredStickers = useMemo(() => {
    if (!selectedPack) return [];
    const term = search.trim().toLowerCase();
    if (!term) return selectedPack.stickers;
    return selectedPack.stickers.filter(
      (s) => s.label.toLowerCase().includes(term) || s.key.toLowerCase().includes(term)
    );
  }, [selectedPack, search]);

  const unlockedCount = packs.filter((p) => p.unlocked).length;
  const hasAnyAccess = unlockedCount > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={selectedPack ? { boxShadow: `0 25px 60px -20px ${selectedPack.tint}55, 0 0 0 1px ${selectedPack.tint}22` } : undefined}
      >
        {/* Header */}
        <div
          className="relative p-4 sm:p-5 border-b border-border overflow-hidden"
          style={selectedPack ? { background: `linear-gradient(135deg, ${selectedPack.gradient?.[0] || selectedPack.tint} 0%, ${selectedPack.gradient?.[1] || selectedPack.accent || selectedPack.tint} 60%, ${selectedPack.gradient?.[2] || selectedPack.accent || selectedPack.tint} 100%)` } : undefined}
        >
          <div className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #ffffff 0%, transparent 40%), radial-gradient(circle at 80% 80%, #ffffff 0%, transparent 40%)' }} />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-black text-base shadow-lg ring-1 ring-white/30 shrink-0">
                <StickerIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-white tracking-tight drop-shadow-sm">{title}</h3>
                  {userTier ? (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 ring-1 ring-white/30">
                      <Crown className="w-3 h-3" />
                      {userTier} member
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-white bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1 ring-1 ring-white/20">
                      <Lock className="w-3 h-3" />
                      Free plan
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/85 font-medium mt-0.5">
                  {hasAnyAccess
                    ? `${unlockedCount} of ${packs.length} pack${packs.length === 1 ? '' : 's'} unlocked • EduNexus originals`
                    : 'Stickers are a member perk — upgrade to unlock'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white ring-1 ring-white/30 transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pack Tabs */}
        <div className="p-2.5 border-b border-border bg-card flex items-center gap-2 overflow-x-auto scrollbar-none">
          {loading ? (
            <div className="text-[11px] text-muted-foreground px-2">Loading sticker packs...</div>
          ) : (
            packs.map((pack) => {
              const isActive = pack.key === selectedPackKey;
              const grad = pack.gradient || [pack.tint, pack.accent || pack.tint];
              return (
                <button
                  key={pack.key}
                  type="button"
                  onClick={() => setSelectedPackKey(pack.key)}
                  className={`relative px-3 py-2 rounded-2xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 ring-1 ${
                    isActive
                      ? 'text-white shadow-lg scale-[1.02] ring-transparent'
                      : 'bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary ring-border'
                  }`}
                  style={isActive ? { background: `linear-gradient(135deg, ${grad[0]}, ${grad[1] || grad[0]})`, boxShadow: `0 8px 20px -8px ${pack.tint}88` } : undefined}
                  title={pack.unlocked ? pack.name : `Locked • unlocks at ${pack.min_tier}`}
                >
                  <span className="text-base leading-none drop-shadow-sm">{pack.icon}</span>
                  <span className="font-black tracking-tight">{pack.name}</span>
                  {!pack.unlocked && <Lock className="w-3 h-3 opacity-80" />}
                </button>
              );
            })
          )}
        </div>

        {/* Search */}
        {selectedPack?.unlocked && (
          <div className="px-3 pt-3 pb-1 bg-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search this pack..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-secondary/80 border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Stickers Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin">
          {!selectedPack ? (
            <div className="text-center py-12 text-xs text-muted-foreground">No sticker packs available yet.</div>
          ) : !selectedPack.unlocked ? (
            <LockedPackView
              pack={selectedPack}
              onUpgradeClick={onUpgradeClick}
              apiBase={apiBase}
            />
          ) : filteredStickers.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">No stickers match "{search}"</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredStickers.map((s) => {
                const id = `${selectedPack.key}/${s.key}`;
                const isHover = hoveredSticker === id;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onMouseEnter={() => setHoveredSticker(id)}
                    onMouseLeave={() => setHoveredSticker(null)}
                    onClick={() =>
                      onSelect({
                        packKey: selectedPack.key,
                        stickerKey: s.key,
                        url: stickerUrl(selectedPack.key, s.key),
                        label: s.label,
                      })
                    }
                    className="group relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-border/60 bg-secondary/30 hover:bg-secondary hover:border-transparent transition-all hover:shadow-xl hover:-translate-y-0.5"
                    style={isHover ? { boxShadow: `0 12px 24px -10px ${selectedPack.tint}99` } : undefined}
                    title={s.label}
                  >
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95"
                      style={{ background: `linear-gradient(135deg, ${selectedPack.gradient?.[0] || selectedPack.tint}22, ${selectedPack.gradient?.[1] || selectedPack.accent || selectedPack.tint}11)` }}
                    >
                      <img
                        src={stickerUrl(selectedPack.key, s.key)}
                        alt={s.label}
                        className="w-full h-full drop-shadow-md"
                        draggable={false}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground truncate max-w-full transition-colors">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-secondary/20 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            {hasAnyAccess ? 'Stickers can be used in posts, comments and chats.' : 'Stickers are part of the EduNexus membership.'}
          </span>
          {!hasAnyAccess && onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="text-[10px] font-black text-primary hover:underline flex items-center gap-1"
            >
              Upgrade <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const LockedPackView: React.FC<{
  pack: StickerPack;
  apiBase: string;
  onUpgradeClick?: () => void;
}> = ({ pack, apiBase, onUpgradeClick }) => {
  const grad = pack.gradient || [pack.tint, pack.accent || pack.tint];
  return (
    <div className="flex flex-col items-center text-center py-6 px-2 space-y-4">
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm relative">
        {pack.stickers.map((s) => (
          <div
            key={s.key}
            className="aspect-square rounded-2xl border border-border bg-secondary/30 flex items-center justify-center overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${grad[0]}15, ${grad[1] || grad[0]}05)` }}
          >
            <img
              src={`${apiBase}/stickers/packs/${pack.key}/${s.key}.svg`}
              alt={s.label}
              className="w-3/4 h-3/4 opacity-50 blur-[1.5px] grayscale"
              draggable={false}
            />
            <div className="absolute" />
          </div>
        ))}
        {/* Lock overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-card/95 backdrop-blur-md text-foreground flex items-center justify-center shadow-2xl ring-1 ring-border">
            <Lock className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h4 className="text-sm font-black text-foreground flex items-center justify-center gap-1.5">
          <Zap className="w-4 h-4 text-primary" />
          {pack.name} is locked
        </h4>
        <p className="text-xs text-muted-foreground">
          {pack.description}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Unlocks at the <span className="font-bold text-foreground capitalize">{pack.min_tier}</span> tier and above.
        </p>
      </div>

      {onUpgradeClick && (
        <button
          type="button"
          onClick={onUpgradeClick}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md hover:scale-[1.03] active:scale-100 transition-all flex items-center gap-1.5"
        >
          <Crown className="w-3.5 h-3.5" />
          Upgrade to {pack.min_tier} to unlock
        </button>
      )}
    </div>
  );
};
