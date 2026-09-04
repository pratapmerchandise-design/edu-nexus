import os
import time
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/gifs", tags=["gifs"])

# Active API key candidates
DEFAULT_KEYS = [
    os.getenv("GIPHY_API_KEY", "").strip(),
    "sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh",
]
ACTIVE_KEYS = [k for k in DEFAULT_KEYS if k]

# Simple in-memory LRU-like cache with TTL (5 minutes)
# Format: {cache_key: (timestamp, payload)}
CACHE: Dict[str, tuple[float, Any]] = {}
CACHE_TTL_SECONDS = 300

# Emergency offline fallback GIFs in case external network fails
FALLBACK_GIFS = [
    {
        "id": "cat-typing",
        "title": "Cat Typing Fast",
        "url": "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif",
        "preview_url": "https://media.giphy.com/media/JIX9t2j0ZTN9S/200.gif",
        "width": 300,
        "height": 200,
    },
    {
        "id": "cheers-gatsby",
        "title": "Leonardo DiCaprio Cheers",
        "url": "https://media.giphy.com/media/GCLlQnV7dXY2KGmpBR/giphy.gif",
        "preview_url": "https://media.giphy.com/media/GCLlQnV7dXY2KGmpBR/200.gif",
        "width": 300,
        "height": 200,
    },
    {
        "id": "thumbs-up-kid",
        "title": "Thumbs Up Kid",
        "url": "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
        "preview_url": "https://media.giphy.com/media/111ebonMs90YLu/200.gif",
        "width": 300,
        "height": 200,
    },
    {
        "id": "mind-blown",
        "title": "Mind Blown Galaxy",
        "url": "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
        "preview_url": "https://media.giphy.com/media/26ufdipQqU2lhNA4g/200.gif",
        "width": 300,
        "height": 200,
    },
    {
        "id": "spongebob-imagination",
        "title": "SpongeBob Imagination",
        "url": "https://media.giphy.com/media/BQUITFiYVtNte/giphy.gif",
        "preview_url": "https://media.giphy.com/media/BQUITFiYVtNte/200.gif",
        "width": 300,
        "height": 200,
    },
    {
        "id": "carlton-dance",
        "title": "Carlton Dance Win",
        "url": "https://media.giphy.com/media/pa37AAG5KXoek/giphy.gif",
        "preview_url": "https://media.giphy.com/media/pa37AAG5KXoek/200.gif",
        "width": 300,
        "height": 200,
    },
    {
        "id": "this-is-fine",
        "title": "This is Fine Dog",
        "url": "https://media.giphy.com/media/9M5jK4GXmD5o1irGrF/giphy.gif",
        "preview_url": "https://media.giphy.com/media/9M5jK4GXmD5o1irGrF/200.gif",
        "width": 300,
        "height": 200,
    },
    {
        "id": "fire-elmo",
        "title": "Elmo In Fire",
        "url": "https://media.giphy.com/media/yr7n0u3qzO9nG/giphy.gif",
        "preview_url": "https://media.giphy.com/media/yr7n0u3qzO9nG/200.gif",
        "width": 300,
        "height": 200,
    }
]

def fetch_from_giphy(endpoint: str, params: dict) -> dict:
    """Helper to query GIPHY API with retry across configured keys."""
    cache_key = f"{endpoint}:{json.dumps(params, sort_keys=True)}"
    now = time.time()

    # Check cache
    if cache_key in CACHE:
        timestamp, cached_data = CACHE[cache_key]
        if now - timestamp < CACHE_TTL_SECONDS:
            return cached_data

    last_error = None
    for api_key in ACTIVE_KEYS:
        query_dict = {**params, "api_key": api_key, "rating": "g"}
        query_str = urllib.parse.urlencode(query_dict)
        url = f"https://api.giphy.com/v1/gifs/{endpoint}?{query_str}"
        
        try:
            req = urllib.request.Request(
                url, 
                headers={
                    "User-Agent": "Mozilla/5.0 (EduNexus/1.0)",
                    "Accept": "application/json"
                }
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                if resp.status == 200:
                    raw = resp.read().decode("utf-8")
                    data = json.loads(raw)
                    
                    # Format items
                    items = []
                    for g in data.get("data", []):
                        images = g.get("images", {})
                        orig = images.get("original", {}).get("url") or images.get("downsized_medium", {}).get("url")
                        prev = images.get("fixed_height", {}).get("url") or images.get("fixed_height_small", {}).get("url") or orig
                        
                        if orig and prev:
                            items.append({
                                "id": g.get("id"),
                                "title": g.get("title") or "GIF",
                                "url": orig,
                                "preview_url": prev,
                                "width": int(images.get("fixed_height", {}).get("width") or 200),
                                "height": int(images.get("fixed_height", {}).get("height") or 150),
                            })

                    pagination = data.get("pagination", {})
                    result = {
                        "gifs": items,
                        "total_count": pagination.get("total_count", len(items)),
                        "offset": pagination.get("offset", 0),
                        "count": len(items),
                    }

                    # Cache successful result
                    if len(CACHE) > 500:
                        # Prune oldest
                        oldest_keys = sorted(CACHE.keys(), key=lambda k: CACHE[k][0])[:100]
                        for ok in oldest_keys:
                            CACHE.pop(ok, None)

                    CACHE[cache_key] = (now, result)
                    return result
        except Exception as e:
            last_error = e
            continue

    # If external API fails, return cached or fallback
    print(f"[GIFs API] External fetch failed: {last_error}")
    return {
        "gifs": FALLBACK_GIFS,
        "total_count": len(FALLBACK_GIFS),
        "offset": 0,
        "count": len(FALLBACK_GIFS),
        "fallback": True
    }

@router.get("/trending")
def get_trending_gifs(
    offset: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=50)
):
    """Retrieve currently trending animated GIFs with pagination."""
    return fetch_from_giphy("trending", {"offset": offset, "limit": limit})

@router.get("/search")
def search_gifs(
    q: str = Query(..., min_length=1),
    offset: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=50)
):
    """Search across millions of animated GIFs with any keyword or topic."""
    query = q.strip()
    if not query:
        return fetch_from_giphy("trending", {"offset": offset, "limit": limit})
    return fetch_from_giphy("search", {"q": query, "offset": offset, "limit": limit})

@router.get("/categories")
def get_gif_categories():
    """Returns curated discovery categories for rapid discovery."""
    return [
        {"id": "trending", "name": "Trending", "query": ""},
        {"id": "reactions", "name": "Reactions", "query": "reaction"},
        {"id": "memes", "name": "Memes", "query": "meme"},
        {"id": "anime", "name": "Anime", "query": "anime"},
        {"id": "gaming", "name": "Gaming", "query": "gaming"},
        {"id": "sports", "name": "Sports", "query": "sports celebration"},
        {"id": "study", "name": "Study & Science", "query": "studying science"},
        {"id": "celebrate", "name": "Celebrate", "query": "celebrate victory"},
        {"id": "funny", "name": "Funny & LOL", "query": "funny lol"},
        {"id": "movies", "name": "Movies & TV", "query": "cinema movie"},
    ]
