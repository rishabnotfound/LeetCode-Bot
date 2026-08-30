const GRAPHQL_URL = "https://leetcode.com/graphql/";

type GraphQLResponse<T> = { data: T; errors?: { message: string }[] };

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join("; ")}`);
  return json.data;
}

export type DailyChallenge = {
  date: string;
  slug: string;
  title: string;
  url: string;
  questionId: string;
};

export async function fetchDailyChallenge(): Promise<DailyChallenge> {
  const query = `
    query questionOfToday {
      activeDailyCodingChallengeQuestion {
        date
        link
        question { questionId titleSlug title }
      }
    }
  `;
  const data = await gql<{
    activeDailyCodingChallengeQuestion: {
      date: string;
      link: string;
      question: { questionId: string; titleSlug: string; title: string };
    };
  }>(query);
  const d = data.activeDailyCodingChallengeQuestion;
  return {
    date: d.date,
    slug: d.question.titleSlug,
    title: d.question.title,
    questionId: d.question.questionId,
    url: `https://leetcode.com${d.link}`,
  };
}

// Language tag used in `questionSolutions.languageTags` -> LeetCode submit `lang` value.
// - detectPattern: relaxed check that this is *some* code in the language
// - requiredPattern: strict check that it's a full LeetCode-submittable answer (has Solution class/impl)
// Priority (lower = preferred when votes tie): most self-contained/cleanest submit format wins.
export const LANGUAGES: {
  tag: string;
  submitLang: string;
  priority: number;
  detectPattern: RegExp;
  requiredPattern: RegExp;
}[] = [
  { tag: "python3", submitLang: "python3", priority: 1, detectPattern: /def\s+\w+\s*\(|class\s+Solution/, requiredPattern: /class\s+Solution\s*:/ },
  { tag: "java", submitLang: "java", priority: 2, detectPattern: /public\s+(class|int|void|List|String|boolean)/, requiredPattern: /class\s+Solution\b/ },
  { tag: "cpp", submitLang: "cpp", priority: 3, detectPattern: /vector<|#include|int\s+\w+\s*\(/, requiredPattern: /class\s+Solution\s*\{/ },
  { tag: "javascript", submitLang: "javascript", priority: 4, detectPattern: /var\s+\w+\s*=\s*function|const\s+\w+\s*=\s*\(|function\s+\w+\s*\(/, requiredPattern: /var\s+\w+\s*=\s*function|=\s*function\s*\(/ },
  { tag: "typescript", submitLang: "typescript", priority: 5, detectPattern: /function\s+\w+\s*\(|const\s+\w+\s*:\s*|=>\s*/, requiredPattern: /function\s+\w+\s*\(/ },
  { tag: "golang", submitLang: "golang", priority: 6, detectPattern: /func\s+\w+\s*\(/, requiredPattern: /func\s+\w+\s*\(/ },
  { tag: "csharp", submitLang: "csharp", priority: 7, detectPattern: /public\s+class\s+Solution|using\s+System/, requiredPattern: /public\s+class\s+Solution\b/ },
  { tag: "ruby", submitLang: "ruby", priority: 8, detectPattern: /def\s+\w+|class\s+Solution/, requiredPattern: /class\s+Solution\b/ },
  { tag: "rust", submitLang: "rust", priority: 9, detectPattern: /impl\s+Solution|fn\s+\w+\s*\(/, requiredPattern: /impl\s+Solution\b/ },
  { tag: "kotlin", submitLang: "kotlin", priority: 10, detectPattern: /class\s+Solution|fun\s+\w+\s*\(/, requiredPattern: /class\s+Solution\b/ },
];

const FENCED_LANG_ALIASES: Record<string, string> = {
  py: "python3", python: "python3", python3: "python3",
  "c++": "cpp", cpp: "cpp", cxx: "cpp",
  java: "java",
  js: "javascript", javascript: "javascript",
  ts: "typescript", typescript: "typescript",
  go: "golang", golang: "golang",
  cs: "csharp", csharp: "csharp", "c#": "csharp",
  rb: "ruby", ruby: "ruby",
  rs: "rust", rust: "rust",
  kt: "kotlin", kotlin: "kotlin",
};

export type SolutionPost = {
  topicId: string;
  title: string;
  votes: number;
  language: string; // language tag used in the query
};

// Primary endpoint: the older `questionSolutions` GraphQL. Fast and simple,
// but returns 0 results for newer problems (LeetCode moved recent posts to
// the UGC pipeline). Fallback below handles those.
async function queryTopSolutionsLegacy(questionSlug: string, languageTag?: string): Promise<Omit<SolutionPost, "language">[]> {
  const query = `
    query communitySolutions(
      $questionSlug: String!
      $skip: Int!
      $first: Int!
      $orderBy: TopicSortingOption
      $languageTags: [String!]
    ) {
      questionSolutions(
        filters: {
          questionSlug: $questionSlug
          skip: $skip
          first: $first
          orderBy: $orderBy
          languageTags: $languageTags
        }
      ) { solutions { id title post { voteCount } } }
    }
  `;
  const data = await gql<{
    questionSolutions: {
      solutions: { id: number; title: string; post: { voteCount: number } }[];
    };
  }>(query, {
    questionSlug,
    skip: 0,
    first: 10,
    orderBy: "most_votes",
    languageTags: languageTag ? [languageTag] : [],
  });
  return data.questionSolutions.solutions.map((s) => ({
    topicId: String(s.id),
    title: s.title,
    votes: s.post.voteCount,
  }));
}

// Fallback endpoint: the newer `ugcArticleSolutionArticles` GraphQL that
// LeetCode's own frontend uses. Handles brand-new problems where the legacy
// query returns nothing.
async function queryTopSolutionsUgc(questionSlug: string, languageTag?: string): Promise<Omit<SolutionPost, "language">[]> {
  const query = `
    query ugcArticleSolutionArticles(
      $questionSlug: String!
      $orderBy: ArticleOrderByEnum
      $skip: Int
      $first: Int
      $tagSlugs: [String!]
    ) {
      ugcArticleSolutionArticles(
        questionSlug: $questionSlug
        orderBy: $orderBy
        skip: $skip
        first: $first
        tagSlugs: $tagSlugs
      ) {
        edges { node { topicId title reactions { count reactionType } } }
      }
    }
  `;
  const data = await gql<{
    ugcArticleSolutionArticles: {
      edges: { node: { topicId: number; title: string; reactions: { count: number; reactionType: string }[] } }[];
    };
  }>(query, {
    questionSlug,
    orderBy: "HOT",
    skip: 0,
    first: 15,
    tagSlugs: languageTag ? [languageTag] : [],
  });
  return data.ugcArticleSolutionArticles.edges.map((e) => {
    const upvotes = e.node.reactions.find((r) => r.reactionType === "UPVOTE")?.count ?? 0;
    return { topicId: String(e.node.topicId), title: e.node.title, votes: upvotes };
  });
}

async function queryTopSolutions(questionSlug: string, languageTag?: string): Promise<Omit<SolutionPost, "language">[]> {
  const legacy = await queryTopSolutionsLegacy(questionSlug, languageTag).catch(() => []);
  if (legacy.length) return legacy;
  return queryTopSolutionsUgc(questionSlug, languageTag).catch(() => []);
}

export async function fetchSolutionBody(topicId: string): Promise<string> {
  const query = `
    query solutionDetail($topicId: ID!) {
      ugcArticleSolutionArticle(topicId: $topicId) { content title }
    }
  `;
  const data = await gql<{ ugcArticleSolutionArticle: { content: string } | null }>(query, { topicId });
  if (!data.ugcArticleSolutionArticle) throw new Error(`No solution article for topicId=${topicId}`);
  return data.ugcArticleSolutionArticle.content;
}

// Extract every fenced code block from a post that looks like a submittable LeetCode answer
// (i.e. matches the language's requiredPattern — has `class Solution` etc.).
// LeetCode's article API sometimes double-encodes JSON escape sequences into
// the markdown body (e.g. `\'`, `\"`, `\\n`). Undo those so the code compiles.
function decodeArticleEscapes(s: string): string {
  return s
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

// Some posts (especially copied from rich-text editors) contain non-breaking
// spaces, zero-width joiners, smart quotes, etc. that break compilers.
// Normalize them to plain ASCII equivalents.
function sanitizeCode(s: string): string {
  return s
    .replace(/\u00A0/g, " ")   // non-breaking space
    .replace(/\u200B/g, "")    // zero-width space
    .replace(/\u200C/g, "")    // zero-width non-joiner
    .replace(/\u200D/g, "")    // zero-width joiner
    .replace(/\uFEFF/g, "")    // BOM / zero-width no-break space
    .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
    .replace(/\u2013/g, "-")   // en dash
    .replace(/\u2014/g, "-")   // em dash
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export function extractSubmittableBlocks(markdown: string): { code: string; lang: string }[] {
  const normalized = decodeArticleEscapes(markdown);
  const fenceRe = /```([a-zA-Z0-9+#]*)\s*\n([\s\S]*?)```/g;
  const results: { code: string; lang: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = fenceRe.exec(normalized)) !== null) {
    const tag = m[1].trim().toLowerCase();
    const body = m[2].trim();
    if (!body) continue;

    if (tag) {
      const alias = FENCED_LANG_ALIASES[tag];
      const langDef = alias ? LANGUAGES.find((l) => l.tag === alias) : undefined;
      if (langDef && langDef.requiredPattern.test(body)) {
        results.push({ code: sanitizeCode(body), lang: langDef.submitLang });
      }
    } else {
      // Untagged fence — sniff by detectPattern *and* require full submittable form
      for (const langDef of LANGUAGES) {
        if (langDef.detectPattern.test(body) && langDef.requiredPattern.test(body)) {
          results.push({ code: sanitizeCode(body), lang: langDef.submitLang });
          break;
        }
      }
    }
  }
  return results;
}

export type Candidate = { code: string; lang: string; source: SolutionPost };

export async function pickCandidateSolutions(slug: string, maxCandidates = 5): Promise<Candidate[]> {
  // Fetch top solutions for every language in parallel.
  const perLangResults = await Promise.all(
    LANGUAGES.map(async (lang) => {
      const posts = await queryTopSolutions(slug, lang.tag).catch(() => []);
      return posts.map((p) => ({ ...p, language: lang.tag }));
    }),
  );

  // Rank: highest votes first, tiebreaker by language priority (python3 wins ties).
  const allPosts = perLangResults.flat().sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    const pa = LANGUAGES.find((l) => l.tag === a.language)?.priority ?? 99;
    const pb = LANGUAGES.find((l) => l.tag === b.language)?.priority ?? 99;
    return pa - pb;
  });
  if (!allPosts.length) throw new Error(`No community solutions found for ${slug}`);

  const candidates: Candidate[] = [];
  const seenTopics = new Set<string>();

  for (const post of allPosts) {
    if (candidates.length >= maxCandidates) break;
    if (seenTopics.has(post.topicId)) continue;
    seenTopics.add(post.topicId);

    const body = await fetchSolutionBody(post.topicId).catch(() => "");
    if (!body) continue;
    const blocks = extractSubmittableBlocks(body);
    if (!blocks.length) continue;

    const langDef = LANGUAGES.find((l) => l.tag === post.language);
    const preferred = langDef && blocks.find((b) => b.lang === langDef.submitLang);
    const chosen = preferred ?? blocks[0];
    candidates.push({ code: chosen.code, lang: chosen.lang, source: post });
  }
  if (!candidates.length) throw new Error(`Found ${allPosts.length} posts for ${slug} but none had a submittable code block`);
  return candidates;
}
