import { fetchDailyChallenge, pickBestPythonSolution } from "../src/leetcodeApi.js";

const d = await fetchDailyChallenge();
console.log("Daily:", d.title, "·", d.slug, "·", d.url);
const { code, source } = await pickBestPythonSolution(d.slug);
console.log("Picked:", source.title, `(${source.votes} votes, topicId=${source.topicId})`);
console.log("--- CODE ---");
console.log(code);
