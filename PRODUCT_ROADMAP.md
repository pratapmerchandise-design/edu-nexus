# EduNexus — Product & Roadmap (What's built, how it works, what's next)

This document is the "complete picture" companion to the code. It lists what exists,
how the platform mirrors real social products (Instagram / LinkedIn / YouTube style
mechanics), and the concrete path to a production launch for a large user base.

---

## 1. Feature inventory (already implemented)

**Auth & Identity**
- Email/username signup, login, JWT sessions, email verification + OTP, password reset.
- Profiles: bio, avatar, school, grade, country/city, goals, interests, skills, privacy toggles.
- Follow / unfollow, block, report.

**Feed & Posts**
- Post types: HELP, WIN, IDEA, COLLAB, POLL.
- Images, polls (single choice), tags, location, reply privacy.
- **Likes** (unified reaction) + comments (now with **likes**) + saved posts.
- **"For You" interest-based feed ranking** (new) + "Latest" chronological feed.

**Forums & Discussions**
- Categories, threads, nested replies, **upvote / downvote** (Reddit-style, intentional).
- Anonymous posting.

**Opportunities**
- Competitions, Olympiads, Scholarships, Hackathons, Research, Internships, etc.
- Bookmarks, filters.

**Messaging (realtime)**
- 1:1 + group chats over WebSocket, typing indicators, read/delivered receipts.
- **Voice messages** (record → upload → playback), images, camera, **in-chat polls**.
- Message requests, group join requests/invites, admin roles, delete-for-me / for-everyone.

**School Hub (per-school layer)**
- Join requests, announcements, clubs, events, members directory.
- **Custom roles** (new): school admins create their own role labels and assign them.
- Member management: assign role / remove member (new).
- Members can be messaged / viewed directly from the hub (new).

**Moderation & Admin**
- Reports queue, suspend/ban, delete posts/threads, school directory, create schools + school admins.

**Infra**
- FastAPI + SQLAlchemy, auto schema creation, MySQL/Postgres/SQLite support.
- Dynamic, environment-aware upload URLs (production-safe) (new).

---

## 2. How the platform works (research-based design)

**Feed algorithm (how posts reach the right people)**
- "Latest": reverse-chronological (default, predictable).
- "For You": scores each post by overlap between the viewer's
  interests/skills and the post tags + author interests/skills, plus a boost when the
  author is followed. Ties break by recency. This is the same family of signal used by
  LinkedIn/Twitter (interest graph + social graph + recency). To scale later: precompute
  interest vectors, use a read model / cache, and add engagement signals (CTR, dwell time).

**Media (images, voice, video, polls)**
- Stored as rows referencing a URL + a `type` column (image/audio/video). The schema
  already supports this; `/api/upload` validates type + size. For scale, move bytes to
  object storage (Cloudinary/R2) and keep only the URL in the DB.

**Chat**
- Conversations + members + messages tables; realtime via WebSocket fan-out.
- Delivery/read state tracked per message. For millions of users this becomes a separate
  service (e.g. NATS/Redis pub-sub) — fine for MVP as-is.

**School hierarchy & permissions**
- `SchoolMember.role` is a free-text label. System roles are `admin`/`ambassador`/`student`;
  schools can now define custom roles (stored in `school_roles`) and assign them. Next step:
  enforce `permissions` JSON (manage_members / manage_content / manage_roles) in each
  endpoint so a "Club Lead" can't accidentally admin the whole school.

---

## 3. What I changed in this pass
- Unified comment reactions to real **likes** (removed inconsistent like/dislike UI) so
  Posts = Likes, Comments = Likes, Forums = Up/Down (standard).
- Added **school custom roles** + member management (backend + School Hub UI).
- Added **interest-based "For You" feed** ranking.
- Fixed upload endpoint to return **environment-aware URLs** and validate files
  (was hardcoded `localhost` — a production blocker).
- School Hub members can now be **messaged / viewed**; admins get a **Manage & Roles** panel.
- Made API + WebSocket base URLs **configurable** for free multi-service hosting.
- Polished sidebar/main **scrollbars**.

---

## 4. Roadmap to "launch-ready at scale" (remaining work)

**Stability & scale**
- Add DB indexes on hot columns (created_at, author_id, conversation_id, school_id).
- Cursor/keyset pagination on feed, messages, members (currently offset-based).
- Background jobs (Celery/RQ) for notifications, email, thumbnails, transcoding.
- CDN in front of media; cache "For You" results per user.

**Product completeness**
- Push notifications (web push / FCM) on top of in-app notifications.
- Rich text + @mentions + hashtags with click-through.
- Stories / ephemeral content, reels-style video (YouTube/TikTok mechanic).
- Global search (posts, people, schools, opportunities) with Algolia/Postgres FTS.
- Onboarding flow + suggested follows/interests to seed the interest graph.
- Analytics dashboard for schools + platform.

**Security & trust**
- Rate limiting + CAPTCHA on signup/auth/upload.
- Content moderation automation (flagging) + audit log.
- Refresh tokens, session revocation, 2FA for admins.
- Penetration test before public launch.

**Quality**
- Automated test suite (pytest for API, vitest/playwright for UI).
- CI (GitHub Actions) running lint + tests + build on every PR.
- Error monitoring (Sentry) + uptime checks.

---

## 5. Known limitations (be honest with the client)
- Local-disk uploads don't persist on ephemeral free hosts → use object storage.
- Feed ranking is good but not personalized-learning yet (no ML/engagement feedback loop).
- No push notifications yet (in-app only).
- SQLite is for dev; production must use Postgres.
- No automated tests yet — add the suite before onboarding real users.

---

## 6. Monetization — Membership tiers (live)

A student-friendly way for the client to earn, without paywalling core features.

**Tiers (INR / month)**
| Tier | Price | Tick color | Headline benefit |
|------|-------|------------|-----------------|
| Free | ₹0 | — | Full access to everything |
| Bronze | ₹29 | Bronze | Bronze tick, slight feed reach, custom accent |
| Silver | ₹59 | Silver | Silver tick, stronger reach, DM any verified member |
| Gold | ₹99 | Gold | Gold tick, top reach, post analytics, school custom roles |
| Platinum | ₹199 | Green | Platinum tick, max reach, priority support, early access |

**What members get (fair, "soft power" so free stays useful)**
- A colored **verification tick** next to their name everywhere (profile, posts, comments, forums, DMs, discover, school hub).
- **Higher reach** in the "For You" feed (author tier multiplies the ranking score) — makes them "popular" without buying fake engagement.
- Bigger upload allowance (Bronze 25 MB → Platinum 150 MB), more poll options.
- Gold/Platinum: post reach analytics, extra school-hub custom roles, "Top Member" tag, early access.

**How it's built**
- `backend/app/membership_config.py` = single source of truth (prices, colors, perks, derived boosts/limits).
- `UserMembership` model + `backend/app/api/membership.py` (`/api/membership/tiers`, `/me`, `/subscribe`, `/cancel`).
- Membership is reflected on every user payload via `format_user_out` → `membership` field, plus `author_membership` on posts/comments/threads so ticks render inline.
- `MembershipBadge` component renders the tick everywhere; feed ranking boosts paid tiers.

**Freemium outreach limits (new this pass — Tinder/Bumble mechanic)**
To nudge free users toward paid plans, free accounts can start only a limited number of
**NEW** conversations with people they don't already chat with, and join a limited number
of groups, within a rolling 24h window. Ongoing chats stay unlimited.
- Free: 5 new chats/day, 3 group joins/day
- Bronze: 15 / 8 · Silver: 40 / 15 · Gold: 100 / 30 · Platinum: unlimited
- Limits auto-refresh on a rolling 24h window (`backend/app/quotas.py`).
- Enforced in `messages.py` (`start_or_get_conversation`, `join_group`, and **invitation
  acceptance** — `accept_group_request`). Being invited into a group also consumes the
  invitee's daily cap, so a free user cannot be added into unlimited groups by others.
  When a free user hits a cap they get a clear "Upgrade" prompt that links to
  `/app/membership`.
- The quota is **event-based, not membership-based**: leaving a group does NOT refund a
  join, so "leave one, join another" cannot bypass the daily cap.
- Current usage + caps are exposed via `GET /api/membership/limits` and shown on the
  Membership page ("Your daily outreach" with live remaining counts).
- This is the core money lever for the client: students who want to network more buy a plan.

**Post audience control (members-only benefit)**
- Posts have an `audience`: `public` (everyone), `followers` (people who follow you), or
  `community` (a specific school you belong to). Free users are forced to `public` (server
  returns 403 if they try a restricted audience); paid members can pick any.
- `GET /posts` (feed + profile) filters out posts the viewer isn't allowed to see
  (followers-only hidden from non-followers; community-only hidden from non-members).
- Implemented in `models.py` (`audience`, `audience_community_id`), `posts.py`
  (`create_post` enforcement + `get_feed` visibility), and the Feed create modal
  (audience selector gated by membership, with a community dropdown of the user's schools).
- Migration: `backend/migrate_post_audience.py` adds the columns to existing DBs.

**Perks are now truthful**: the plan benefits listed in `membership_config.py` (and shown on
the Membership page) only describe features that are actually implemented — verification tick,
feed reach boost, monthly outreach caps, upload size, and post-audience control. Aspirational
perks (analytics, priority support, custom accent, etc.) were removed to avoid over-promising.

