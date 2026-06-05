# LinkedIn AI Agent

Generates one LinkedIn post per day on GitHub Actions cron. Runs on Bun + TypeScript with a swappable LLM provider (OpenAI / Anthropic / Gemini). Saves the post as a markdown draft you copy-paste to LinkedIn.

## Stack

- **Runtime**: Bun 1.2+ (native TypeScript, native `.env`, native test runner)
- **Language**: TypeScript (strict, ESM)
- **Linter/formatter**: Biome
- **LLM**: GPT-5.4-mini default, swappable to Claude Sonnet 4.6 or Gemini 2.5 Flash via env
- **Dedup**: Jaccard similarity on word + bigram sets (no extra API calls)
- **Schedule**: GitHub Actions cron at 03:30 UTC (09:00 IST, ±1h due to GH scheduler drift)
- **Delivery**: Markdown draft committed to repo + uploaded as workflow artifact

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in **one** API key for your chosen provider:

```env
LLM_PROVIDER=openai          # or "anthropic" / "gemini"
OPENAI_API_KEY=sk-...
```

### 3. Add your voice samples

Open `src/prompts/voice-samples.ts` and replace the placeholder with **3–5 LinkedIn posts in the voice you want to imitate**. These can be your own past posts or posts from creators you admire.

This step is non-optional if you want the output to sound human. The prompt is built around these samples.

### 4. Run locally (dry run — no file commits)

```bash
bun run generate:dry
```

This calls the LLM, runs validation, and prints the post to stdout without writing files.

### 5. Run for real

```bash
bun run generate
```

Writes the post to `data/generated-posts/YYYY-MM-DD.md` and appends to `data/history.json`.

## Configuration

Behavior knobs in `.env`:

| Var | Default | Meaning |
|---|---|---|
| `LLM_PROVIDER` | `openai` | Which provider to use (`openai` / `anthropic` / `gemini`) |
| `OPENAI_MODEL` | `gpt-5.4-mini` | OpenAI model ID — check your dashboard for exact ID |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Claude model ID |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model ID |
| `MAX_GENERATION_ATTEMPTS` | `3` | How many times to retry if validation fails |
| `TOPIC_COOLDOWN_DAYS` | `7` | Don't repeat a topic within this window |
| `HISTORY_LOOKBACK` | `30` | Last N posts used for dedup + prompt context |
| `SIMILARITY_THRESHOLD` | `0.55` | Reject if Jaccard similarity vs any recent post exceeds this |
| `DRY_RUN` | `false` | Skip file writes when `true` |

## LinkedIn auto-posting (own API integration)

The agent saves a markdown draft of each post to `data/generated-posts/`. To **also** auto-publish to LinkedIn, the project includes a first-class implementation of LinkedIn's OAuth 2.0 + Posts API — no third-party automation services involved.

**What's implemented:**
- OAuth 2.0 authorization-code flow with refresh-token support (`src/auth/linkedin-oauth.ts`)
- LinkedIn Posts API v202402 (`POST /rest/posts`) with proper `LinkedIn-Version` + `X-Restli-Protocol-Version` headers (`src/publishers/linkedin.publisher.ts`)
- One-time CLI to complete the OAuth dance via a local callback server (`scripts/linkedin-auth.ts`)
- Fail-soft orchestration: if the LinkedIn API errors, the markdown draft + history are still saved

### One-time setup (~10 min)

#### 1. Create a LinkedIn Developer App

1. Go to https://developer.linkedin.com/apps and click **Create app**.
2. Fill in the basics:
   - **App name**: anything, e.g. "My LinkedIn AI Agent"
   - **LinkedIn Page**: associate with your company page if you have one (or skip)
   - **App logo**: any image
   - Accept terms → **Create app**
3. In the new app's **Auth** tab:
   - **Authorized redirect URLs**: add `http://localhost:8765/callback`
4. In the new app's **Products** tab, request these products:
   - **Sign In with LinkedIn using OpenID Connect** — usually auto-approves
   - **Share on LinkedIn** — gives the `w_member_social` scope needed to post. Approval timing varies.
5. Once products are added, go to the **Auth** tab → **Application credentials**. Copy:
   - **Client ID**
   - **Client Secret**

#### 2. Run the auth CLI

In your terminal, from the repo root:

```bash
LINKEDIN_CLIENT_ID=your_client_id \
LINKEDIN_CLIENT_SECRET=your_client_secret \
bun run auth:linkedin
```

This script:
1. Spins up a tiny HTTP server on `localhost:8765`
2. Prints an authorization URL — open it in your browser
3. You authorize the app on LinkedIn
4. LinkedIn redirects to `localhost:8765/callback?code=...`
5. The script catches the code, exchanges it for tokens, fetches your person URN, and prints everything

You'll see output like:

```
LINKEDIN_PERSON_URN=urn:li:person:abc123
LINKEDIN_ACCESS_TOKEN=AQX...long-token...XYZ
```

If your app is approved for refresh tokens (see below), you'll also get:

```
LINKEDIN_REFRESH_TOKEN=AQU...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
```

#### 3. Save credentials

**Locally** (for `bun run generate`): add the printed values to your `.env`.

**On GitHub Actions** (for the daily cron): add each as a repository secret in Settings → Secrets and variables → Actions:
- `LINKEDIN_PERSON_URN`
- `LINKEDIN_ACCESS_TOKEN` (if not using refresh)
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REFRESH_TOKEN` (if using refresh)

#### 4. Test

```bash
bun run generate
```

A new post appears in `data/generated-posts/YYYY-MM-DD.md` **and** on your LinkedIn profile within a few seconds. Output should include `[linkedin] Published via LinkedIn Posts API. URN: ...`.

### Access tokens vs refresh tokens

LinkedIn issues two credential modes:

| Mode | Token lifetime | Setup | Behavior |
|---|---|---|---|
| **Access token only** | ~60 days | Default for new apps | Re-run `bun run auth:linkedin` every ~2 months and update the secret |
| **Access + refresh token** | Refresh ~12 months | Requires LinkedIn to enable "Programmatic Refresh Tokens" on your app | Cron mints a fresh access token every run — set-and-forget |

To enable refresh tokens: in your LinkedIn app, find the **Settings** tab → contact LinkedIn support or use the "request features" flow to ask for "Programmatic Refresh Tokens".

The publisher auto-detects which mode is configured — provide refresh credentials in env and it uses them; otherwise it falls back to the static access token.

### If the LinkedIn API errors

The orchestrator runs LinkedIn as **fail-soft**: a 401 (token expired), 403 (scope not granted), or any network error logs the failure but doesn't abort the run. The markdown draft is saved and `history.json` is updated regardless. You won't lose a day's post — you'll just need to paste manually that day and refresh tokens/scopes for the next run.

Common errors:

| HTTP | Meaning | Fix |
|---|---|---|
| 401 | Access token expired | Re-run `bun run auth:linkedin` (or use refresh token mode) |
| 403 | `w_member_social` scope not approved | Request the "Share on LinkedIn" product in your LinkedIn app |
| 422 | Post content rejected (rare) | Check post body — LinkedIn rejects certain characters / very long URLs |
| 429 | Rate limited | LinkedIn's API limit is ~150 posts/day per app — at 1 post/day you'll never hit this |

### File map

```
src/
├── auth/
│   └── linkedin-oauth.ts        # OAuth flow helpers (auth URL, code exchange, refresh)
├── publishers/
│   └── linkedin.publisher.ts    # POST to /rest/posts with token refresh
scripts/
└── linkedin-auth.ts             # One-time OAuth CLI
```

## GitHub Actions setup

### 1. Add secrets

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

Add the API key(s) for your chosen provider:

- `OPENAI_API_KEY` (required if `LLM_PROVIDER=openai`)
- `ANTHROPIC_API_KEY` (required if `LLM_PROVIDER=anthropic`)
- `GEMINI_API_KEY` (required if `LLM_PROVIDER=gemini`)
- LinkedIn credentials (optional — enables auto-posting; leave unset for draft-only):
  - `LINKEDIN_PERSON_URN`
  - `LINKEDIN_ACCESS_TOKEN` (60-day token) **or** `LINKEDIN_CLIENT_ID` + `LINKEDIN_CLIENT_SECRET` + `LINKEDIN_REFRESH_TOKEN` (long-lived)
  - See [LinkedIn auto-posting setup](#linkedin-auto-posting-own-api-integration) above

### 2. Add variables (optional)

Under **Variables** (not Secrets), you can override defaults without editing the workflow:

- `LLM_PROVIDER`, `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `GEMINI_MODEL`

### 3. Enable workflow permissions

**Settings → Actions → General → Workflow permissions** → select **Read and write permissions**. Required so the workflow can commit the daily post back to the repo.

### 4. Trigger

- **Automatic**: runs daily at 03:30 UTC (09:00 IST). Heads up: GH Actions cron is best-effort and can be delayed 15–60 minutes during peak load.
- **Manual**: Actions tab → "Daily LinkedIn Post" → "Run workflow". Toggle "Generate without committing" for a dry run.

## Project structure

```
src/
├── config/topics.ts             # Topic list + LRU rotation
├── generators/                  # LinkedInGenerator
├── prompts/
│   ├── linkedin.prompt.ts       # System + user prompt builders
│   └── voice-samples.ts         # YOUR voice anchors (edit this!)
├── providers/                   # OpenAI / Anthropic / Gemini behind one interface
├── publishers/
│   ├── draft.publisher.ts       # Writes markdown (default)
│   └── linkedin.publisher.ts    # Stub for direct API publish
├── storage/                     # history.json read/write + hashing
├── types/                       # Shared TypeScript types
├── utils/similarity.ts          # Jaccard dedup
├── validation/post.validator.ts # Word count, CTA, hook, banned phrases, dedup
└── index.ts                     # Orchestrator
```

## Topic strategy (pillars + angles)

Based on June 2026 LinkedIn engagement research, posts are organized into **3 weighted pillars**:

| Pillar | Weight | Topics |
|---|---|---|
| **AI Engineering** | 45% | AI Agents, AI Evals, MCP / Context Engineering, Agent Reliability, LLM in Production, LLM Cost Optimization |
| **Architecture and Stack** | 35% | Software Architecture, React Shipping Stories, Next.js in Production, TypeScript Pitfalls, Node.js at Scale, PostgreSQL Lessons |
| **Founder and Career** | 20% | Startup Lessons, SaaS Build-in-Public Metrics, Freelancing with Numbers, Career Inflection Moments |

Pillar selection uses **deficit-based picking** — whichever pillar is most under-represented in your history relative to its target weight gets picked next. Deterministic, no randomness, converges to target weights.

Each post is also assigned an **angle** from `src/config/angles.ts`:

- `postmortem` — failure → root cause → lesson
- `contrarian-take` — sharp opposing view with evidence
- `mistake-and-lesson` — concrete mistake + one-sentence lesson
- `tool-comparison` — A vs B with real numbers, pick a winner
- `build-in-public` — shipping update with metrics
- `tradeoff-breakdown` — architectural tradeoff with hidden constraint

Same topic × different angle = very different post. Angles rotate LRU.

## Daily flow

```
read history → pick under-served pillar → LRU topic within pillar → LRU angle
  → build prompt (system rules + voice samples + angle instruction + recent hooks)
  → call LLM → sanitize output → validate
  → if invalid: feed reasons back into prompt, retry up to MAX_GENERATION_ATTEMPTS
  → write data/generated-posts/YYYY-MM-DD.md
  → append data/history.json (with pillar + angle for future selection)
  → commit + push (via GH Actions)
```

## Validation rules

A generated post is rejected (and regenerated) if it:

- Is under 150 or over 300 words.
- Doesn't end with a question mark.
- Opens with a generic hook (`In today's...`, `Have you ever...`, etc.).
- Has a hook longer than 10 words (research: <10-word hooks win the first-impression test).
- Lacks any specific anchor — no numbers, no named tool/framework/company.
- Ends with a lazy closing question (`Thoughts?`, `Agree?`, `What do you think?`).
- Contains banned phrases (`leveraging`, `synergy`, `game-changer`, `dive into`, etc.).
- Has markdown formatting (headers, bullets, bold).
- Uses more than 1 emoji or more than 3 hashtags.
- Scores ≥ 0.55 Jaccard similarity against any of the last 30 posts.

Tune in `src/validation/post.validator.ts` and `.env`.

## Tests

```bash
bun test
```

Tests cover topic rotation, similarity scoring, validator rules, and history hashing. The LLM call itself is not tested (it's an external dependency — the integration is exercised by `bun run generate:dry`).

## Future phases

The architecture is set up to extend cleanly:

- **More publishers**: implement the `Publisher` interface for Twitter/X, Dev.to, Medium, your blog. Wire into the orchestrator via env var.
- **More providers**: implement the `LLMProvider` interface for any other API.
- **Better dedup**: swap `src/utils/similarity.ts` for an embeddings-based version (`text-embedding-3-small`, ~$0.001/month) if Jaccard misses too many semantic duplicates.
- **Image generation**: add a generator that calls DALL-E 3 / Imagen and attaches the image to the markdown draft (LinkedIn Posts API supports image attachments via the `/v2/assets` upload flow).
- **Engagement feedback loop**: pull post stats via `/rest/socialActions/{urn}` and feed top-performing posts back into the voice samples.

## Troubleshooting

**"Failed to produce a valid post after 3 attempts"** — Either your voice samples are too restrictive, your banned-phrase list is hitting normal words, or your similarity threshold is too aggressive. Run `bun run generate:dry` and read the rejection reasons.

**"Cannot find module 'openai'"** — Run `bun install`.

**Cron not firing on time** — Expected. GitHub Actions cron drifts heavily. If you need exact timing, use an external scheduler (cron-job.org, Cloudflare Workers) that triggers the workflow via `workflow_dispatch`.

**Post sounds generic / AI-ish** — Edit `src/prompts/voice-samples.ts`. Real samples beat written rules every time.
