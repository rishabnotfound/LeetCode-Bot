import { fetchDailyChallenge, pickCandidateSolutions } from "../src/leetcodeApi.js";

const d = await fetchDailyChallenge();
console.log("Daily:", d.title, "·", d.slug, "·", d.url);
const candidates = await pickCandidateSolutions(d.slug, 5);
console.log(`\nRanked ${candidates.length} candidates:`);
for (let i = 0; i < candidates.length; i++) {
  const c = candidates[i];
  console.log(`\n[${i + 1}] "${c.source.title}" · ${c.lang} · ${c.source.votes} votes · ${c.code.split("\n").length} lines`);
}
console.log("\n--- TOP CANDIDATE CODE ---");
console.log(candidates[0].code);
