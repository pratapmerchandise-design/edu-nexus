"""Membership tiers configuration for EduNexus.

Student-friendly monetization: free users keep full access, paid tiers add a
colored verification tick + fair, progressively better benefits. Prices are in INR
per month. Perks below reflect ONLY features that are actually implemented in the
app (verification tick, feed reach boost, monthly outreach caps, upload size,
post-audience control, and sticker packs). Aspirational perks are intentionally
omitted to avoid over-promising.

Freemium outreach limits (Tinder/Bumble style, MONTHLY): free users can start only a
limited number of NEW conversations with people they don't already chat with, and
join a limited number of groups per month; paid tiers raise those caps. Ongoing
chats stay unlimited. The cap is event-based over a rolling 30-day window, so
leaving a group does not refund a join and cannot be used to bypass the limit.

Sticker packs: free users have no sticker access. Each paid tier unlocks a set of
packs that can be used in posts, comments, and direct messages. The catalog is
defined here in code so it ships with the build and never breaks if the DB is
empty.
"""
from datetime import datetime, timezone
from typing import Optional

# Order matters: highest tier last. Free users are tier=None.
TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']

# Sticker pack catalog. Each pack is identified by a stable key. The actual
# rendered artwork for a sticker is a custom illustrated SVG (see
# api/stickers.py) that is themed per pack/tier and embeds the EduNexus
# logomark, so the stickers feel like first-party brand merch.
STICKER_PACKS = {
    'study_boost': {
        'key': 'study_boost',
        'name': 'Study Boost',
        'description': 'Cute study-themed stickers with the EduNexus cap and notebook for your posts, comments and chats.',
        'icon': '🎓',
        'tint': '#22E079',  # brand green
        'min_tier': 'bronze',
        'accent': '#1E7450',
        'gradient': ['#22E079', '#0B7A43', '#042F16'],
        'stickers': [
            {'key': 'study_v1', 'label': 'Aced it', 'art': 'graduate'},
            {'key': 'study_v2', 'label': 'Study mode', 'art': 'book_stack'},
            {'key': 'study_v3', 'label': 'Big idea', 'art': 'lightbulb_orbit'},
            {'key': 'study_v4', 'label': 'Focus', 'art': 'brain_focus'},
            {'key': 'study_v5', 'label': 'Hi-Five', 'art': 'high_five'},
            {'key': 'study_v6', 'label': 'Note this', 'art': 'notebook_pen'},
        ],
    },
    'reactions': {
        'key': 'reactions',
        'name': 'Reactions',
        'description': 'Quick reaction stickers for replying without typing a word — built on the EduNexus brand mark.',
        'icon': '😎',
        'tint': '#7C3AED',  # royal purple
        'min_tier': 'silver',
        'accent': '#4C1D95',
        'gradient': ['#A78BFA', '#7C3AED', '#3B0764'],
        'stickers': [
            {'key': 'rxn_v1', 'label': 'LOL', 'art': 'laugh_burst'},
            {'key': 'rxn_v2', 'label': 'Wow!', 'art': 'wow_spark'},
            {'key': 'rxn_v3', 'label': 'On fire', 'art': 'fire_ring'},
            {'key': 'rxn_v4', 'label': 'Love it', 'art': 'heart_pulse'},
            {'key': 'rxn_v5', 'label': 'Sad', 'art': 'rain_cloud'},
            {'key': 'rxn_v6', 'label': 'Mind blown', 'art': 'mind_blown'},
        ],
    },
    'campus_life': {
        'key': 'campus_life',
        'name': 'Campus Life',
        'description': 'Bring the campus vibe to every conversation with EduNexus merch illustrations.',
        'icon': '🎒',
        'tint': '#F59E0B',  # amber
        'min_tier': 'gold',
        'accent': '#B45309',
        'gradient': ['#FBBF24', '#F59E0B', '#92400E'],
        'stickers': [
            {'key': 'cmp_v1', 'label': 'Coffee', 'art': 'coffee_cup'},
            {'key': 'cmp_v2', 'label': 'Pizza', 'art': 'pizza_slice'},
            {'key': 'cmp_v3', 'label': 'Graduation', 'art': 'grad_cap'},
            {'key': 'cmp_v4', 'label': 'Party', 'art': 'confetti_pop'},
            {'key': 'cmp_v5', 'label': 'Game on', 'art': 'trophy'},
            {'key': 'cmp_v6', 'label': 'Music', 'art': 'headphones'},
        ],
    },
    'premium_vip': {
        'key': 'premium_vip',
        'name': 'Premium VIP',
        'description': 'Exclusive Platinum-only stickers with the EduNexus crown and a metallic gold finish.',
        'icon': '👑',
        'tint': '#FBBF24',  # gold
        'min_tier': 'platinum',
        'accent': '#92400E',
        'gradient': ['#FDE68A', '#FBBF24', '#B45309'],
        'stickers': [
            {'key': 'vip_v1', 'label': 'Crown', 'art': 'royal_crown'},
            {'key': 'vip_v2', 'label': 'Diamond', 'art': 'diamond_prism'},
            {'key': 'vip_v3', 'label': 'To the moon', 'art': 'rocket_trail'},
            {'key': 'vip_v4', 'label': 'Champion', 'art': 'trophy_gold'},
            {'key': 'vip_v5', 'label': 'Star', 'art': 'star_burst'},
            {'key': 'vip_v6', 'label': 'VIP', 'art': 'vip_badge'},
        ],
    },
}

TIER_PACK_ACCESS = {
    'bronze': ['study_boost'],
    'silver': ['study_boost', 'reactions'],
    'gold': ['study_boost', 'reactions', 'campus_life'],
    'platinum': ['study_boost', 'reactions', 'campus_life', 'premium_vip'],
}


def _sticker_perks(tier_key: str) -> list:
    """Human-readable perks describing sticker access for a tier."""
    keys = TIER_PACK_ACCESS.get(tier_key, [])
    if not keys:
        return []
    lines = []
    if 'study_boost' in keys:
        lines.append('Sticker pack: Study Boost (6 stickers) — use in posts, comments & chats')
    if 'reactions' in keys:
        lines.append('Sticker pack: Reactions (6 stickers)')
    if 'campus_life' in keys:
        lines.append('Sticker pack: Campus Life (6 stickers)')
    if 'premium_vip' in keys:
        lines.append('Sticker pack: Premium VIP — exclusive Platinum-only stickers')
    return lines


MEMBERSHIP_TIERS = {
    'bronze': {
        'key': 'bronze',
        'name': 'Bronze Member',
        'price_inr': 29,
        'color': '#CD7F32',
        'boost': 1.15,
        'upload_mb': 25,
        'poll_options': 5,
        'new_conversations_per_month': 10,
        'group_joins_per_month': 5,
        'sticker_packs': TIER_PACK_ACCESS['bronze'],
        'perks': [
            'Bronze verification tick on your name everywhere',
            'Higher reach in the For You feed',
            'Post to your followers or a school community (not just public)',
            '10 new chats & 5 group joins per month',
            '25 MB per upload (photos, videos & files)',
        ] + _sticker_perks('bronze'),
    },
    'silver': {
        'key': 'silver',
        'name': 'Silver Member',
        'price_inr': 59,
        'color': '#9CA3AF',
        'boost': 1.35,
        'upload_mb': 50,
        'poll_options': 6,
        'new_conversations_per_month': 20,
        'group_joins_per_month': 10,
        'sticker_packs': TIER_PACK_ACCESS['silver'],
        'perks': [
            'Everything in Bronze',
            'Silver verification tick',
            'Stronger For You feed reach (get discovered faster)',
            '20 new chats & 10 group joins per month',
            '50 MB per upload (photos, videos & files)',
        ],
    },
    'gold': {
        'key': 'gold',
        'name': 'Gold Member',
        'price_inr': 99,
        'color': '#F5C518',
        'boost': 1.6,
        'upload_mb': 75,
        'poll_options': 8,
        'new_conversations_per_month': 40,
        'group_joins_per_month': 20,
        'sticker_packs': TIER_PACK_ACCESS['gold'],
        'perks': [
            'Everything in Silver',
            'Gold verification tick',
            'Top reach in the For You feed',
            '40 new chats & 20 group joins per month',
            '75 MB per upload (photos, videos & files)',
        ] + _sticker_perks('gold'),
    },
    'platinum': {
        'key': 'platinum',
        'name': 'Platinum Member',
        'price_inr': 199,
        'color': '#22E079',
        'boost': 2.0,
        'upload_mb': 150,
        'poll_options': 10,
        'new_conversations_per_month': 100,
        'group_joins_per_month': 40,
        'sticker_packs': TIER_PACK_ACCESS['platinum'],
        'perks': [
            'Everything in Gold',
            'Platinum verification tick (highest tier)',
            'Maximum For You feed reach',
            '100 new chats & 40 group joins per month',
            '150 MB per upload (photos, videos & files)',
        ] + _sticker_perks('platinum'),
    },
}

FREE_TIER = {
    'key': 'free',
    'name': 'Free',
    'price_inr': 0,
    'color': '#64748B',
    'boost': 1.0,
    'upload_mb': 25,
    'poll_options': 5,
    'new_conversations_per_month': 3,
    'group_joins_per_month': 2,
    'sticker_packs': [],
    'perks': [
        'Access to feed, forums, opportunities, school hub & messaging',
        'Chat unlimited with people you already know',
        '3 new chats & 2 group joins per month (to meet new people)',
        '25 MB per upload (photos, videos & docs)',
        'Standard feed reach',
        'No sticker access — upgrade to a member tier to unlock sticker packs',
    ],
}


def get_tier_config(tier: Optional[str]) -> dict:
    if not tier:
        return FREE_TIER
    return MEMBERSHIP_TIERS.get(tier.lower(), FREE_TIER)


def tier_boost(tier: Optional[str]) -> float:
    return float(get_tier_config(tier).get('boost', 1.0))


def tier_upload_bytes(tier: Optional[str]) -> int:
    mb = int(get_tier_config(tier).get('upload_mb', 25))
    return mb * 1024 * 1024


def tier_poll_options(tier: Optional[str]) -> int:
    return int(get_tier_config(tier).get('poll_options', 5))


def tier_sticker_packs(tier: Optional[str]) -> list:
    """List of sticker pack keys a user at the given tier can access. Empty for free."""
    if not tier:
        return []
    return list(get_tier_config(tier).get('sticker_packs', []))


def has_sticker_access(tier: Optional[str], pack_key: str) -> bool:
    """True if the given tier unlocks the named pack."""
    return pack_key in tier_sticker_packs(tier)


def public_pack_catalog() -> list:
    """Full sticker pack catalog (used by /api/stickers/packs). Packs the user
    cannot access are still returned but marked as locked, so the UI can show
    a preview behind a paywall."""
    result = []
    for key, pack in STICKER_PACKS.items():
        result.append({
            'key': key,
            'name': pack['name'],
            'description': pack['description'],
            'icon': pack['icon'],
            'tint': pack['tint'],
            'accent': pack.get('accent', pack['tint']),
            'gradient': pack.get('gradient', [pack['tint'], pack.get('accent', pack['tint'])]),
            'min_tier': pack['min_tier'],
            'stickers': pack['stickers'],
        })
    return result


def tier_quota(tier: Optional[str]) -> dict:
    cfg = get_tier_config(tier)
    return {
        'new_conversations_per_month': cfg.get('new_conversations_per_month', 0),
        'group_joins_per_month': cfg.get('group_joins_per_month', 0),
    }


def public_tiers_list() -> list:
    """Tiers shown in the UI, free first then ascending price."""
    result = [FREE_TIER]
    for key in TIER_ORDER:
        result.append(MEMBERSHIP_TIERS[key])
    return result


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
