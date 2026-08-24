# LeetCode-Bot

Automatically solves LeetCode's Daily Challenge every day and keeps your streak alive.

**Live proof:** [leetcode.com/u/yoru__/](https://leetcode.com/u/yoru__/) — this account's streak is maintained entirely by this bot.

No browser. No Playwright. Pure HTTP — talks directly to LeetCode's GraphQL and submit endpoints, the same ones your browser uses.

## How it works

1. Fetches today's Daily Challenge from LeetCode's public GraphQL API.
2. Pulls the top-voted community solution across 10 languages (python3, java, cpp, javascript, typescript, go, c#, ruby, rust, kotlin) and picks the one with the most votes. Ties break toward python3.
3. Extracts a submittable code block from the solution post (skips bare snippets that lack `class Solution`).
4. Submits it under your account via `POST /problems/{slug}/submit/`.
5. Polls `/submissions/detail/{id}/check/` and prints the verdict.

Total runtime: ~5 seconds. Zero interaction.

## Requirements

- Node.js 20+
- A LeetCode account
- 2 minutes to copy two cookies

## Setup

### 1. Install

```bash
git clone <this-repo>
cd LeetCode-Bot
npm install
cp .env.example .env
```

### 2. Grab your cookies

Log into [leetcode.com](https://leetcode.com) in your browser, then:

1. Open DevTools (⌥⌘I on Mac, F12 on Windows/Linux).
2. **Application** tab → **Cookies** → `https://leetcode.com`.
3. Copy these two values into `.env`:

| Cookie in browser | Variable in `.env` |
|---|---|
| `LEETCODE_SESSION` | `LEETCODE_SESSION=` |
| `csrftoken`        | `LEETCODE_CSRFTOKEN=` |

Paste each value on a single line, no spaces, no quotes.

### 3. Run it

```bash
npm start
```

Expected output:

```
→ Checking auth…
  logged in as your-username ✓
→ Fetching today's Daily Challenge…
  2026-08-24 · Stone Game VIII · https://leetcode.com/problems/stone-game-viii/
→ Finding top-voted community solution (any language)…
  "Top-Down and Bottom-Up" · python3 · 57 votes
→ Submitting as python3…
→ Waiting for verdict…
  Accepted (80/80)
✓ Streak maintained.
```

## Automating with GitHub Actions

The bot ships with a workflow that runs daily at **00:15 UTC** (15 minutes after LeetCode rolls the new daily).

1. Push this repo to a **private** GitHub repository.
2. Go to **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `LEETCODE_SESSION`
   - `LEETCODE_CSRFTOKEN`
3. To smoke-test right away: **Actions → LeetCode Daily → Run workflow**.

After that, do nothing. It just runs.

## About cookie expiry

- **`LEETCODE_SESSION`** has a nominal 14-day lifetime, but LeetCode refreshes it every time you visit the site while logged in. If you use LeetCode weekly, this never expires from your side. If you disappear for 14+ days, it dies and you re-paste.
- **`csrftoken`** is long-lived and only rotates if you clear cookies or log out everywhere.

If the workflow fails with `isSignedIn: false`, that's your cue to grab fresh cookies.

## Limitations

- **Top-voted ≠ correct.** Occasionally the top solution is buggy, outdated, or uses a stale function signature. That submission goes on your record as Wrong Answer. The streak is safe if you re-run before 00:00 UTC.
- **No retry / fallback.** If the top solution fails, the bot exits. Would be a good next feature.
- **No failure notifications.** Silent CI failures are the actual streak-killer. Consider adding Discord/Telegram webhook.
- **LeetCode may change the API.** They've renamed GraphQL fields before. When that happens, expect a `Cannot query field X` error and open an issue.
- **Automation is against LeetCode's TOS.** Enforcement at 1 submission/day is effectively nonexistent, but not zero. Use at your own risk.

## Project structure

```
src/
  index.ts        # entrypoint — orchestrates the flow
  leetcodeApi.ts  # GraphQL: daily challenge + top solutions
  submitApi.ts    # HTTP: submit + poll verdict
scripts/
  smoke.ts        # dry-run the API layer (no submit)
.github/workflows/
  daily.yml       # daily cron
.env.example      # cookie template
```

## Manually testing without submitting

```bash
npx tsx scripts/smoke.ts
```

Fetches today's problem and prints the top-voted solution across all languages without touching your account.

## License

[MIT](LICENSE)
