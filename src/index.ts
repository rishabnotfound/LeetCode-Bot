import "dotenv/config";
import { fetchDailyChallenge, pickBestSolution } from "./leetcodeApi.js";
import { userStatus, submit, waitForVerdict } from "./submitApi.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  const cookies = {
    LEETCODE_SESSION: requireEnv("LEETCODE_SESSION"),
    csrftoken: requireEnv("LEETCODE_CSRFTOKEN"),
  };

  console.log("→ Checking auth…");
  const status = await userStatus(cookies);
  if (!status.isSignedIn) throw new Error("Not signed in — LEETCODE_SESSION/csrftoken invalid or expired");
  console.log(`  logged in as ${status.username} ✓`);

  console.log("→ Fetching today's Daily Challenge…");
  const daily = await fetchDailyChallenge();
  console.log(`  ${daily.date} · ${daily.title} · ${daily.url}`);

  console.log("→ Finding top-voted community solution (any language)…");
  const { code, lang, source } = await pickBestSolution(daily.slug);
  console.log(`  "${source.title}" · ${lang} · ${source.votes} votes`);
  console.log(`  ${code.split("\n").length} lines`);

  console.log(`→ Submitting as ${lang}…`);
  const { submission_id } = await submit(cookies, daily.slug, daily.questionId, code, lang);
  console.log(`  submission_id=${submission_id}`);

  console.log("→ Waiting for verdict…");
  const verdict = await waitForVerdict(cookies, submission_id);
  if (verdict.state !== "SUCCESS") throw new Error(`Unexpected verdict state: ${JSON.stringify(verdict)}`);

  console.log(`  ${verdict.status_msg} (${verdict.total_correct}/${verdict.total_testcases})`);

  if (verdict.status_msg !== "Accepted") {
    console.error("\n✗ Not accepted. Details:");
    console.error(JSON.stringify(verdict, null, 2));
    process.exit(1);
  }
  console.log("\n✓ Streak maintained.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
