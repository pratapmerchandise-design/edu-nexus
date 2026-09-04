"""Sticker pack endpoints.

Stickers are custom illustrated SVGs themed per pack/tier. They can be dropped
into posts, comments and direct messages. They are gated by membership tier:
free users see a locked preview, paid tiers get the packs that match their tier.

The stickers are rendered server-side as inline SVG so:
  * no external CDN, no image hosting, no Pillow dependency
  * the artwork is fully self-contained, looks crisp at any size
  * the EduNexus brand mark can be embedded directly inside the artwork
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User
from backend.app.auth.security import get_current_user_optional
from backend.app import membership_config as mconfig
from backend.app.quotas import active_tier

router = APIRouter(prefix="/stickers", tags=["stickers"])


def _resolve_user_tier(db: Session, current_user: Optional[User]) -> Optional[str]:
    if current_user is None:
        return None
    return active_tier(db, current_user.id)


@router.get("/packs")
def list_sticker_packs(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Return the full sticker catalog. Each pack is annotated with whether the
    signed-in user (or anonymous visitor) can actually use it."""
    user_tier = _resolve_user_tier(db, current_user)
    allowed = set(mconfig.tier_sticker_packs(user_tier))
    catalog = mconfig.public_pack_catalog()
    for pack in catalog:
        pack['unlocked'] = pack['key'] in allowed
        pack['min_tier'] = pack['min_tier']
    return {
        "user_tier": user_tier,
        "packs": catalog,
    }


@router.get("/packs/{pack_key}/{sticker_key}.svg")
def render_sticker(pack_key: str, sticker_key: str):
    """Serve a sticker as a self-contained SVG. No auth is required to RENDER
    a sticker (so old messages still display), but only unlocked packs/stickers
    are reachable through the picker UI. We still validate the key here so we
    don't 500 on garbage URLs."""
    pack = mconfig.STICKER_PACKS.get(pack_key)
    if not pack:
        raise HTTPException(status_code=404, detail="Sticker pack not found")
    sticker = next((s for s in pack['stickers'] if s['key'] == sticker_key), None)
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found")

    art = sticker.get('art', sticker_key)
    svg = _build_sticker_svg(art, pack, sticker)
    return Response(content=svg, media_type="image/svg+xml")


# ---------------------------------------------------------------------------
# SVG assembly
# ---------------------------------------------------------------------------

EDU_LOGOMARK = (
    # A stylized "E" that doubles as a graduation cap with a tassel
    '<g transform="translate(8 8)">'
    '  <path d="M2 0 L18 0 L15 4 L5 4 L5 8 L13 8 L13 12 L5 12 L5 16 L15 16 L18 20 L2 20 Z" fill="currentColor"/>'
    '  <circle cx="20" cy="2" r="2" fill="currentColor"/>'
    '</g>'
)


def _grad_defs(uid: str, c1: str, c2: str, c3: str) -> str:
    return (
        f'<defs>'
        f'<linearGradient id="{uid}" x1="0%" y1="0%" x2="0%" y2="100%">'
        f'<stop offset="0%" stop-color="{c1}"/>'
        f'<stop offset="55%" stop-color="{c2}"/>'
        f'<stop offset="100%" stop-color="{c3}"/>'
        f'</linearGradient>'
        f'<radialGradient id="{uid}_shine" cx="30%" cy="20%" r="65%">'
        f'<stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>'
        f'<stop offset="60%" stop-color="#ffffff" stop-opacity="0.05"/>'
        f'<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>'
        f'</radialGradient>'
        f'<filter id="{uid}_shadow" x="-25%" y="-25%" width="150%" height="150%">'
        f'<feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity="0.35"/>'
        f'</filter>'
        f'</defs>'
    )


def _shield(uid: str, c1: str, c2: str, c3: str) -> str:
    """A rounded square badge: gradient body + shine + ring + drop shadow."""
    return (
        f'<g filter="url(#{uid}_shadow)">'
        f'  <rect x="6" y="6" width="116" height="116" rx="30" ry="30" '
        f'        fill="url(#{uid})" stroke="{c3}" stroke-width="3"/>'
        f'  <rect x="6" y="6" width="116" height="116" rx="30" ry="30" '
        f'        fill="url(#{uid}_shine)"/>'
        f'  <rect x="10" y="10" width="108" height="108" rx="26" ry="26" '
        f'        fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>'
        f'</g>'
    )


def _wrap(uid: str, pack: dict, body_svg: str) -> str:
    c1, c2, c3 = pack.get('gradient', [pack['tint'], pack.get('accent', pack['tint']), pack['tint']])
    safe_label = (pack.get('name', 'EduNexus sticker')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" '
        f'role="img" aria-label="{safe_label} sticker">'
        + _grad_defs(uid, c1, c2, c3)
        + _shield(uid, c1, c2, c3)
        + body_svg
        + '</svg>'
    )


def _art(art: str, uid: str, pack: dict) -> str:
    """Dispatch to a per-sticker illustration. Each piece of art is a function
    of (uid, pack) and returns inline SVG drawn over the rounded badge."""
    fn = ART_REGISTRY.get(art)
    if fn is None:
        return _art('default', uid, pack)
    return fn(uid, pack)


# ---------------------------------------------------------------------------
# Per-sticker illustrations. Each function draws on top of the badge.
# Color: use #ffffff for elements that should sit on the colored badge.
# ---------------------------------------------------------------------------

def _art_default(uid, pack):
    # EduNexus logomark on the badge
    return f'<g transform="translate(0 0)" color="#ffffff">{EDU_LOGOMARK}</g>'


def _art_graduate(uid, pack):
    return (
        # Graduation cap with tassel and "E" logomark on the front
        '<g fill="#ffffff">'
        '  <path d="M64 28 L102 46 L64 64 L26 46 Z"/>'
        '  <path d="M40 54 L40 72 Q64 84 88 72 L88 54 L64 64 Z" fill="#ffffff" fill-opacity="0.85"/>'
        '  <line x1="96" y1="48" x2="100" y2="80" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>'
        '  <circle cx="100" cy="84" r="4"/>'
        '  <g transform="translate(54 50) scale(0.55)" fill="#042F16">'
        '    <rect x="0" y="0" width="20" height="20" rx="4"/>'
        '    <path d="M4 4 L16 4 L13 7 L7 7 L7 10 L13 10 L13 13 L7 13 L7 16 L13 16 L16 16 L16 19 L4 19 Z"/>'
        '  </g>'
        '</g>'
        # sparkles
        '<g fill="#FDE68A">'
        '<circle cx="30" cy="38" r="2"/><circle cx="98" cy="40" r="1.5"/>'
        '<circle cx="34" cy="92" r="1.5"/><circle cx="100" cy="88" r="2"/>'
        '</g>'
    )


def _art_book_stack(uid, pack):
    return (
        '<g>'
        # shadow plate
        '<rect x="26" y="92" width="76" height="8" rx="4" fill="#000" fill-opacity="0.25"/>'
        # book 1 (bottom)
        '<rect x="28" y="76" width="72" height="16" rx="3" fill="#ffffff"/>'
        '<rect x="28" y="76" width="6" height="16" fill="#042F16"/>'
        # book 2
        '<rect x="34" y="60" width="60" height="16" rx="3" fill="#FDE68A"/>'
        '<rect x="34" y="60" width="5" height="16" fill="#92400E"/>'
        # book 3 (top, with E logomark on spine)
        '<rect x="40" y="42" width="48" height="18" rx="3" fill="#ffffff"/>'
        '<rect x="40" y="42" width="5" height="18" fill="#042F16"/>'
        '<g transform="translate(52 48) scale(0.35)" fill="#042F16">'
        '<rect x="0" y="0" width="20" height="20" rx="3"/>'
        '<path d="M4 4 L16 4 L13 7 L7 7 L7 10 L13 10 L13 13 L7 13 L7 16 L13 16 L16 16 L16 19 L4 19 Z"/>'
        '</g>'
        # bookmark hanging
        '<path d="M82 42 L82 60 L86 56 L90 60 L90 42 Z" fill="#EF4444"/>'
        '</g>'
    )


def _art_lightbulb_orbit(uid, pack):
    return (
        '<g>'
        # orbital ring
        '<ellipse cx="64" cy="66" rx="42" ry="14" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.6" transform="rotate(-20 64 66)"/>'
        # bulb
        '<circle cx="64" cy="58" r="20" fill="#FDE68A"/>'
        '<path d="M50 76 Q64 88 78 76 L78 82 Q64 92 50 82 Z" fill="#ffffff" fill-opacity="0.9"/>'
        '<rect x="56" y="82" width="16" height="6" rx="1" fill="#ffffff" fill-opacity="0.7"/>'
        # shine
        '<path d="M52 48 Q60 42 70 46" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>'
        # electron
        '<circle cx="100" cy="40" r="3" fill="#ffffff"/>'
        '<circle cx="28" cy="92" r="2" fill="#ffffff"/>'
        '</g>'
    )


def _art_brain_focus(uid, pack):
    return (
        '<g>'
        # brain shape (stylized)
        '<path d="M44 50 Q34 56 36 70 Q34 84 48 88 L48 96 L80 96 L80 88 Q94 84 92 70 Q94 56 84 50 Q84 38 74 38 L54 38 Q44 38 44 50 Z" fill="#ffffff"/>'
        '<path d="M64 40 Q62 60 64 80 Q66 60 64 40" fill="none" stroke="#042F16" stroke-width="2" stroke-linecap="round"/>'
        '<path d="M52 56 Q58 62 52 70" fill="none" stroke="#042F16" stroke-width="2" stroke-linecap="round"/>'
        '<path d="M76 56 Q70 62 76 70" fill="none" stroke="#042F16" stroke-width="2" stroke-linecap="round"/>'
        # target reticle
        '<circle cx="64" cy="62" r="14" fill="none" stroke="#EF4444" stroke-width="2"/>'
        '<circle cx="64" cy="62" r="4" fill="#EF4444"/>'
        '</g>'
    )


def _art_high_five(uid, pack):
    return (
        '<g>'
        # palm
        '<path d="M40 92 L40 56 Q40 50 46 50 Q52 50 52 56 L52 40 Q52 34 58 34 Q64 34 64 40 L64 36 Q64 30 70 30 Q76 30 76 36 L76 52 Q82 52 82 58 L82 68 Q88 70 88 78 L88 92 Z" fill="#FDE68A" stroke="#92400E" stroke-width="2"/>'
        # finger lines
        '<path d="M52 56 L52 84 M58 50 L58 84 M64 44 L64 84 M70 40 L70 84 M76 56 L76 84" stroke="#92400E" stroke-width="1.5" fill="none"/>'
        # motion lines
        '<g stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none">'
        '<path d="M30 30 L38 38"/><path d="M94 28 L86 36"/>'
        '<path d="M28 50 L36 50"/><path d="M92 48 L100 48"/>'
        '</g>'
        '</g>'
    )


def _art_notebook_pen(uid, pack):
    return (
        '<g>'
        # notebook
        '<rect x="30" y="34" width="56" height="68" rx="6" fill="#ffffff"/>'
        '<rect x="30" y="34" width="6" height="68" fill="#042F16"/>'
        # lines
        '<line x1="42" y1="50" x2="80" y2="50" stroke="#1E7450" stroke-width="2"/>'
        '<line x1="42" y1="60" x2="80" y2="60" stroke="#1E7450" stroke-width="2"/>'
        '<line x1="42" y1="70" x2="74" y2="70" stroke="#1E7450" stroke-width="2"/>'
        # check
        '<path d="M50 82 L56 88 L70 74" fill="none" stroke="#22E079" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
        # pen
        '<g transform="translate(74 70) rotate(35)">'
        '<rect x="0" y="0" width="36" height="8" rx="2" fill="#FDE68A"/>'
        '<polygon points="36,0 44,4 36,8" fill="#042F16"/>'
        '</g>'
        '</g>'
    )


def _art_laugh_burst(uid, pack):
    return (
        '<g>'
        # burst spikes
        '<g fill="#ffffff">'
        '<polygon points="64,18 70,34 58,34"/>'
        '<polygon points="64,110 70,94 58,94"/>'
        '<polygon points="18,64 34,70 34,58"/>'
        '<polygon points="110,64 94,70 94,58"/>'
        '</g>'
        # face
        '<circle cx="64" cy="64" r="32" fill="#FDE68A"/>'
        '<circle cx="52" cy="58" r="4" fill="#042F16"/>'
        '<circle cx="76" cy="58" r="4" fill="#042F16"/>'
        '<path d="M44 72 Q64 92 84 72" fill="none" stroke="#042F16" stroke-width="4" stroke-linecap="round"/>'
        '<path d="M58 78 Q64 86 70 78" fill="#EF4444"/>'
        '</g>'
    )


def _art_wow_spark(uid, pack):
    return (
        '<g>'
        # big star
        '<polygon points="64,22 72,52 104,52 78,70 86,100 64,82 42,100 50,70 24,52 56,52" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # sparkles
        '<g fill="#ffffff">'
        '<circle cx="28" cy="32" r="2"/><circle cx="100" cy="30" r="2"/>'
        '<circle cx="22" cy="92" r="2"/><circle cx="104" cy="94" r="2"/>'
        '</g>'
        # "WOW" mini
        '<text x="64" y="74" text-anchor="middle" font-family="Inter, Helvetica, sans-serif" '
        'font-weight="900" font-size="14" fill="#042F16">WOW</text>'
        '</g>'
    )


def _art_fire_ring(uid, pack):
    return (
        '<g>'
        # ring
        '<circle cx="64" cy="64" r="40" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="4 6"/>'
        # flames
        '<path d="M64 28 Q52 44 56 60 Q48 52 44 60 Q40 76 50 92 Q56 100 64 100 Q72 100 78 92 Q88 76 84 60 Q80 52 72 60 Q76 44 64 28 Z" fill="#FDE68A"/>'
        '<path d="M64 40 Q58 52 60 64 Q56 60 54 66 Q52 78 60 90 Q64 96 68 90 Q76 78 74 66 Q72 60 68 64 Q70 52 64 40 Z" fill="#EF4444"/>'
        # center
        '<circle cx="64" cy="70" r="6" fill="#ffffff"/>'
        '</g>'
    )


def _art_heart_pulse(uid, pack):
    return (
        '<g>'
        # pulse line behind
        '<path d="M14 70 L34 70 L42 56 L52 84 L62 60 L72 80 L82 70 L114 70" '
        'fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.55"/>'
        # heart
        '<path d="M64 96 C 36 78 30 56 44 46 C 54 40 60 46 64 54 C 68 46 74 40 84 46 C 98 56 92 78 64 96 Z" '
        'fill="#FDE68A" stroke="#EF4444" stroke-width="3"/>'
        # shine
        '<path d="M52 52 Q58 50 60 56" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>'
        '</g>'
    )


def _art_rain_cloud(uid, pack):
    return (
        '<g>'
        # cloud
        '<path d="M40 60 Q40 46 56 46 Q62 36 76 40 Q92 40 92 56 Q100 56 100 66 L40 66 Q34 66 40 60 Z" fill="#ffffff"/>'
        # tears
        '<g fill="#7DD3FC">'
        '<path d="M52 72 L56 88 L60 72 Z"/>'
        '<path d="M68 76 L72 92 L76 76 Z"/>'
        '<path d="M84 72 L88 88 L92 72 Z"/>'
        '</g>'
        # face
        '<circle cx="60" cy="58" r="2" fill="#042F16"/>'
        '<circle cx="80" cy="58" r="2" fill="#042F16"/>'
        '<path d="M64 60 Q70 56 76 60" fill="none" stroke="#042F16" stroke-width="2" stroke-linecap="round"/>'
        '</g>'
    )


def _art_mind_blown(uid, pack):
    return (
        '<g>'
        # explosion rays
        '<g fill="#FDE68A">'
        '<polygon points="64,16 70,40 58,40"/>'
        '<polygon points="100,32 88,48 96,52"/>'
        '<polygon points="28,32 40,48 32,52"/>'
        '<polygon points="16,68 38,64 38,72"/>'
        '<polygon points="112,68 90,64 90,72"/>'
        '</g>'
        # head
        '<circle cx="64" cy="68" r="26" fill="#FDE68A"/>'
        # shocked face
        '<circle cx="56" cy="64" r="4" fill="#042F16"/>'
        '<circle cx="72" cy="64" r="4" fill="#042F16"/>'
        '<ellipse cx="64" cy="80" rx="6" ry="8" fill="#042F16"/>'
        # sparks
        '<g fill="#ffffff">'
        '<circle cx="34" cy="96" r="2"/><circle cx="94" cy="96" r="2"/>'
        '<circle cx="20" cy="48" r="1.5"/><circle cx="108" cy="48" r="1.5"/>'
        '</g>'
        '</g>'
    )


def _art_coffee_cup(uid, pack):
    return (
        '<g>'
        # steam
        '<g fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.85">'
        '<path d="M52 22 Q56 30 52 38"/>'
        '<path d="M64 18 Q68 28 64 38"/>'
        '<path d="M76 22 Q80 30 76 38"/>'
        '</g>'
        # cup
        '<path d="M36 50 L92 50 L86 100 Q84 106 78 106 L50 106 Q44 106 42 100 Z" fill="#ffffff"/>'
        # handle
        '<path d="M92 60 Q108 60 108 76 Q108 90 92 90" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>'
        # coffee top
        '<ellipse cx="64" cy="50" rx="28" ry="6" fill="#92400E"/>'
        # E logomark on cup
        '<g transform="translate(54 72) scale(0.45)" fill="#92400E">'
        '<rect x="0" y="0" width="20" height="20" rx="3"/>'
        '<path d="M4 4 L16 4 L13 7 L7 7 L7 10 L13 10 L13 13 L7 13 L7 16 L13 16 L16 16 L16 19 L4 19 Z"/>'
        '</g>'
        '</g>'
    )


def _art_pizza_slice(uid, pack):
    return (
        '<g>'
        # slice
        '<path d="M28 96 L100 96 L64 30 Z" fill="#FDE68A"/>'
        '<path d="M28 96 L100 96 L64 30 Z" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>'
        # crust
        '<path d="M28 96 L100 96 L96 102 L32 102 Z" fill="#92400E"/>'
        # pepperoni
        '<circle cx="64" cy="76" r="6" fill="#EF4444"/>'
        '<circle cx="54" cy="86" r="5" fill="#EF4444"/>'
        '<circle cx="74" cy="86" r="5" fill="#EF4444"/>'
        # basil
        '<circle cx="60" cy="60" r="3" fill="#22E079"/>'
        '<circle cx="70" cy="64" r="3" fill="#22E079"/>'
        '</g>'
    )


def _art_grad_cap(uid, pack):
    return (
        '<g fill="#ffffff">'
        # mortarboard
        '<polygon points="64,28 110,50 64,72 18,50"/>'
        # base
        '<path d="M36 58 L36 78 Q64 90 92 78 L92 58 L64 72 Z" fill="#ffffff" fill-opacity="0.9"/>'
        # button + tassel
        '<circle cx="64" cy="50" r="3" fill="#FDE68A"/>'
        '<line x1="64" y1="50" x2="100" y2="68" stroke="#FDE68A" stroke-width="3" stroke-linecap="round"/>'
        '<circle cx="100" cy="72" r="4" fill="#FDE68A"/>'
        # E
        '<g transform="translate(56 56) scale(0.4)" fill="#042F16">'
        '<rect x="0" y="0" width="20" height="20" rx="3"/>'
        '<path d="M4 4 L16 4 L13 7 L7 7 L7 10 L13 10 L13 13 L7 13 L7 16 L13 16 L16 16 L16 19 L4 19 Z"/>'
        '</g>'
        '</g>'
    )


def _art_confetti_pop(uid, pack):
    return (
        '<g>'
        # party popper cone
        '<path d="M28 96 L60 64 L74 78 L42 110 Z" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # streamer
        '<path d="M60 64 Q70 50 80 56" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>'
        # confetti pieces
        '<rect x="80" y="22" width="8" height="4" rx="1" fill="#EF4444" transform="rotate(20 84 24)"/>'
        '<rect x="92" y="40" width="8" height="4" rx="1" fill="#22E079" transform="rotate(-15 96 42)"/>'
        '<rect x="70" y="28" width="8" height="4" rx="1" fill="#7C3AED" transform="rotate(40 74 30)"/>'
        '<circle cx="100" cy="60" r="3" fill="#FDE68A"/>'
        '<circle cx="86" cy="50" r="2" fill="#EF4444"/>'
        '<circle cx="78" cy="40" r="2" fill="#22E079"/>'
        # stars
        '<polygon points="104,80 108,86 102,86" fill="#FDE68A"/>'
        '<polygon points="24,40 28,46 22,46" fill="#7C3AED"/>'
        '</g>'
    )


def _art_trophy(uid, pack):
    return (
        '<g>'
        # cup
        '<path d="M42 30 L86 30 L82 60 Q80 76 64 76 Q48 76 46 60 Z" fill="#FDE68A"/>'
        # handles
        '<path d="M42 36 Q28 36 28 50 Q28 62 42 62" fill="none" stroke="#FDE68A" stroke-width="4" stroke-linecap="round"/>'
        '<path d="M86 36 Q100 36 100 50 Q100 62 86 62" fill="none" stroke="#FDE68A" stroke-width="4" stroke-linecap="round"/>'
        # stem
        '<rect x="58" y="76" width="12" height="14" fill="#FDE68A"/>'
        # base
        '<rect x="46" y="90" width="36" height="10" rx="2" fill="#FDE68A"/>'
        # shine
        '<path d="M52 38 L52 60" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>'
        # star
        '<polygon points="64,44 67,52 76,52 69,57 71,66 64,61 57,66 59,57 52,52 61,52" fill="#ffffff"/>'
        '</g>'
    )


def _art_headphones(uid, pack):
    return (
        '<g>'
        # headband
        '<path d="M30 60 Q64 24 98 60" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>'
        # earcups
        '<rect x="22" y="58" width="22" height="32" rx="8" fill="#FDE68A"/>'
        '<rect x="84" y="58" width="22" height="32" rx="8" fill="#FDE68A"/>'
        '<rect x="28" y="64" width="10" height="20" rx="3" fill="#92400E"/>'
        '<rect x="90" y="64" width="10" height="20" rx="3" fill="#92400E"/>'
        # notes
        '<g fill="#ffffff">'
        '<circle cx="50" cy="100" r="3"/>'
        '<rect x="52" y="86" width="2" height="14" fill="#ffffff"/>'
        '<circle cx="80" cy="104" r="3"/>'
        '<rect x="82" y="90" width="2" height="14" fill="#ffffff"/>'
        '</g>'
        '</g>'
    )


def _art_royal_crown(uid, pack):
    return (
        '<g>'
        # base
        '<path d="M24 78 L30 50 L46 64 L64 38 L82 64 L98 50 L104 78 Z" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # jewels
        '<circle cx="64" cy="68" r="5" fill="#EF4444" stroke="#ffffff" stroke-width="1.5"/>'
        '<circle cx="40" cy="74" r="3" fill="#22E079" stroke="#ffffff" stroke-width="1.5"/>'
        '<circle cx="88" cy="74" r="3" fill="#7C3AED" stroke="#ffffff" stroke-width="1.5"/>'
        # band
        '<rect x="24" y="78" width="80" height="14" rx="4" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # shimmer
        '<g fill="#ffffff" fill-opacity="0.8">'
        '<circle cx="32" cy="84" r="1.5"/>'
        '<circle cx="56" cy="84" r="1.5"/>'
        '<circle cx="80" cy="84" r="1.5"/>'
        '<circle cx="96" cy="84" r="1.5"/>'
        '</g>'
        # E logomark
        '<g transform="translate(54 80) scale(0.4)" fill="#042F16">'
        '<rect x="0" y="0" width="20" height="20" rx="3"/>'
        '<path d="M4 4 L16 4 L13 7 L7 7 L7 10 L13 10 L13 13 L7 13 L7 16 L13 16 L16 16 L16 19 L4 19 Z"/>'
        '</g>'
        '</g>'
    )


def _art_diamond_prism(uid, pack):
    return (
        '<g>'
        # diamond
        '<polygon points="64,24 96,52 64,100 32,52" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        '<polygon points="64,24 80,52 64,100 48,52" fill="#ffffff" fill-opacity="0.4"/>'
        # facets
        '<line x1="32" y1="52" x2="96" y2="52" stroke="#ffffff" stroke-width="2"/>'
        '<line x1="64" y1="24" x2="64" y2="100" stroke="#ffffff" stroke-width="2"/>'
        # shine
        '<path d="M50 36 L60 46" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>'
        # sparkles
        '<g fill="#ffffff">'
        '<circle cx="22" cy="30" r="2"/>'
        '<circle cx="106" cy="30" r="2"/>'
        '<circle cx="20" cy="92" r="1.5"/>'
        '<circle cx="108" cy="92" r="1.5"/>'
        '</g>'
        '</g>'
    )


def _art_rocket_trail(uid, pack):
    return (
        '<g>'
        # smoke trail
        '<g fill="#ffffff" fill-opacity="0.7">'
        '<circle cx="34" cy="92" r="6"/>'
        '<circle cx="44" cy="100" r="5"/>'
        '<circle cx="24" cy="98" r="4"/>'
        '<circle cx="54" cy="94" r="4"/>'
        '</g>'
        # rocket body
        '<path d="M64 18 Q78 38 78 60 L78 84 L50 84 L50 60 Q50 38 64 18 Z" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # window
        '<circle cx="64" cy="48" r="6" fill="#7DD3FC" stroke="#ffffff" stroke-width="2"/>'
        # fins
        '<polygon points="50,68 38,84 50,84" fill="#EF4444" stroke="#ffffff" stroke-width="2"/>'
        '<polygon points="78,68 90,84 78,84" fill="#EF4444" stroke="#ffffff" stroke-width="2"/>'
        # flame
        '<path d="M58 84 L64 100 L70 84 Z" fill="#F59E0B"/>'
        '<path d="M60 84 L64 94 L68 84 Z" fill="#EF4444"/>'
        '</g>'
    )


def _art_trophy_gold(uid, pack):
    return (
        '<g>'
        # cup
        '<path d="M36 24 L92 24 L88 64 Q84 84 64 84 Q44 84 40 64 Z" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # handles
        '<path d="M36 32 Q18 32 18 50 Q18 66 38 66" fill="none" stroke="#FDE68A" stroke-width="5" stroke-linecap="round"/>'
        '<path d="M92 32 Q110 32 110 50 Q110 66 90 66" fill="none" stroke="#FDE68A" stroke-width="5" stroke-linecap="round"/>'
        # star
        '<polygon points="64,40 69,52 82,52 71,60 75,72 64,64 53,72 57,60 46,52 59,52" fill="#ffffff"/>'
        # stem
        '<rect x="58" y="84" width="12" height="12" fill="#FDE68A"/>'
        '<rect x="44" y="96" width="40" height="10" rx="2" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # VIP ribbon
        '<rect x="56" y="60" width="16" height="6" rx="1" fill="#EF4444"/>'
        '</g>'
    )


def _art_star_burst(uid, pack):
    return (
        '<g>'
        # big star with shine
        '<polygon points="64,18 74,46 104,46 80,64 90,94 64,76 38,94 48,64 24,46 54,46" fill="#FDE68A" stroke="#ffffff" stroke-width="2"/>'
        # inner star
        '<polygon points="64,38 70,54 86,54 72,64 76,80 64,72 52,80 56,64 42,54 58,54" fill="#ffffff"/>'
        # sparkles
        '<g fill="#ffffff">'
        '<circle cx="22" cy="20" r="2"/><circle cx="106" cy="20" r="2"/>'
        '<circle cx="20" cy="106" r="1.5"/><circle cx="108" cy="106" r="1.5"/>'
        '</g>'
        '</g>'
    )


def _art_vip_badge(uid, pack):
    return (
        '<g>'
        # ribbon tails
        '<polygon points="42,80 38,110 56,100 60,86" fill="#EF4444" stroke="#ffffff" stroke-width="2"/>'
        '<polygon points="86,80 90,110 72,100 68,86" fill="#EF4444" stroke="#ffffff" stroke-width="2"/>'
        # circle medal
        '<circle cx="64" cy="58" r="32" fill="#FDE68A" stroke="#ffffff" stroke-width="3"/>'
        '<circle cx="64" cy="58" r="26" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="2 3"/>'
        # VIP text
        '<text x="64" y="66" text-anchor="middle" font-family="Inter, Helvetica, sans-serif" '
        'font-weight="900" font-size="20" fill="#042F16" letter-spacing="2">VIP</text>'
        # shine
        '<path d="M50 42 Q56 38 62 40" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none"/>'
        '</g>'
    )


ART_REGISTRY = {
    'graduate': _art_graduate,
    'book_stack': _art_book_stack,
    'lightbulb_orbit': _art_lightbulb_orbit,
    'brain_focus': _art_brain_focus,
    'high_five': _art_high_five,
    'notebook_pen': _art_notebook_pen,
    'laugh_burst': _art_laugh_burst,
    'wow_spark': _art_wow_spark,
    'fire_ring': _art_fire_ring,
    'heart_pulse': _art_heart_pulse,
    'rain_cloud': _art_rain_cloud,
    'mind_blown': _art_mind_blown,
    'coffee_cup': _art_coffee_cup,
    'pizza_slice': _art_pizza_slice,
    'grad_cap': _art_grad_cap,
    'confetti_pop': _art_confetti_pop,
    'trophy': _art_trophy,
    'headphones': _art_headphones,
    'royal_crown': _art_royal_crown,
    'diamond_prism': _art_diamond_prism,
    'rocket_trail': _art_rocket_trail,
    'trophy_gold': _art_trophy_gold,
    'star_burst': _art_star_burst,
    'vip_badge': _art_vip_badge,
}


def _build_sticker_svg(art: str, pack: dict, sticker: dict) -> str:
    uid = f"stk_{pack['key']}_{sticker['key']}"
    body = _art(art, uid, pack)
    return _wrap(uid, pack, body)
