import { fetchDailyChallenge, pickBestSolution } from "../src/leetcodeApi.js";

const d = await fetchDailyChallenge();
console.log("Daily:", d.title, "·", d.slug, "·", d.url);
const { code, lang, source } = await pickBestSolution(d.slug);
console.log("Picked:", source.title, `(${source.votes} votes, ${lang}, topicId=${source.topicId})`);
console.log("--- CODE ---");
console.log(code);
