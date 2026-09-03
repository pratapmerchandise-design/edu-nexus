"""Membership tiers configuration for EduNexus.

Student-friendly monetization: free users keep full access, paid tiers add a
colored verification tick + fair, progressively better benefits. Prices are in INR
per month. Perks below reflect ONLY features that are actually implemented in the
app (verification tick, feed reach boost, monthly outreach caps, upload size, and
post-audience control). Aspirational perks are intentionally omitted to avoid
over-promising.

Freemium outreach limits (Tinder/Bumble style, MONTHLY): free users can start only a
limited number of NEW conversations with people they don't already chat with, and
join a limited number of groups per month; paid tiers raise those caps. Ongoing
chats stay unlimited. The cap is event-based over a rolling 30-day window, so
leaving a group does not refund a join and cannot be used to bypass the limit.
"""
from datetime import datetime, timezone
from typing import Optional

# Order matters: highest tier last. Free users are tier=None.
TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum']

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
        'perks': [
            'Bronze verification tick on your name everywhere',
            'Higher reach in the For You feed',
            'Post to your followers or a school community (not just public)',
            '10 new chats & 5 group joins per month',
            '25 MB per upload (photos, videos & files)',
        ],
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
        'perks': [
            'Everything in Silver',
            'Gold verification tick',
            'Top reach in the For You feed',
            '40 new chats & 20 group joins per month',
            '75 MB per upload (photos, videos & files)',
        ],
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
        'perks': [
            'Everything in Gold',
            'Platinum verification tick (highest tier)',
            'Maximum For You feed reach',
            '100 new chats & 40 group joins per month',
            '150 MB per upload (photos, videos & files)',
        ],
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
    'perks': [
        'Access to feed, forums, opportunities, school hub & messaging',
        'Chat unlimited with people you already know',
        '3 new chats & 2 group joins per month (to meet new people)',
        '25 MB per upload (photos, videos & docs)',
        'Standard feed reach',
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
