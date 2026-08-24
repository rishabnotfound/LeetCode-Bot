# LeetCode Daily Bot

Auto-submits the top-voted Python3 community solution to LeetCode's Daily Challenge to maintain your streak.

Pure HTTP — no browser, no Playwright. Uses LeetCode's public GraphQL for the problem/solution and the same `/submit/` endpoint your browser uses.

## How it works

1. Fetch today's Daily Challenge via GraphQL (`activeDailyCodingChallengeQuestion`)
2. Fetch top-voted Python3 community solutions (`questionSolutions` + `ugcArticleSolutionArticle`)
3. Extract the first ```python code block
4. `POST /problems/{slug}/submit/` with your session cookies
5. Poll `/submissions/detail/{id}/check/` until verdict

## Local setup

```bash
npm install
cp .env.example .env
# fill in cookies from browser, then:
npm start
```

### Getting the cookies

In your browser (logged into leetcode.com):
1. DevTools → **Application** → **Cookies** → `https://leetcode.com`
2. Copy the **Value** of each of these into `.env`:
   - `LEETCODE_SESSION` → `LEETCODE_SESSION=`
   - `csrftoken` → `LEETCODE_CSRFTOKEN=`
   - `cf_clearance` → `LEETCODE_CF_CLEARANCE=` *(optional)*

Cookies typically last ~14 days.

## GitHub Actions (daily automation)

1. Push this repo to GitHub.
2. Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add:
   - `LEETCODE_SESSION`
   - `LEETCODE_CSRFTOKEN`
   - `LEETCODE_CF_CLEARANCE`
3. Cron runs daily at 00:15 UTC. Trigger manually from **Actions → LeetCode Daily → Run workflow** to test.

## Known limitations

- **Community solutions can be wrong.** Top-voted ≠ correct. A wrong solution submits a Wrong Answer to your record.
- **No retry.** If the top solution fails, the bot exits. Streak survives only if you re-run before 00:00 UTC.
- **LeetCode may change the API.** They've renamed fields before (`solutionArticle` → `ugcArticleSolutionArticle`).
- **Automated submissions violate LeetCode's TOS.** Low enforcement risk at 1/day, but not zero.

## Files

```
src/
  index.ts         # orchestrator
  leetcodeApi.ts   # GraphQL: daily challenge + top solutions
  submitApi.ts     # HTTP: submit + poll verdict
.github/workflows/
  daily.yml        # cron schedule
```
