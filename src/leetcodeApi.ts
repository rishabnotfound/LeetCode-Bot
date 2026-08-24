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

export type SolutionPost = {
  topicId: string;
  title: string;
  votes: number;
};

export async function fetchTopSolutions(questionSlug: string, language = "python3"): Promise<SolutionPost[]> {
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
      ) {
        solutions { id title post { voteCount } }
      }
    }
  `;
  const data = await gql<{
    questionSolutions: {
      solutions: { id: number; title: string; post: { voteCount: number } }[];
    };
  }>(query, {
    questionSlug,
    skip: 0,
    first: 15,
    orderBy: "most_votes",
    languageTags: [language],
  });
  return data.questionSolutions.solutions.map((s) => ({
    topicId: String(s.id),
    title: s.title,
    votes: s.post.voteCount,
  }));
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

const LANG_TAGGED = /```(?:python3?|py)\s*\n([\s\S]*?)```/i;
const UNTAGGED = /```\s*\n([\s\S]*?)```/;

export function extractPythonCode(markdown: string): string | null {
  const normalized = markdown.replace(/\\n/g, "\n");
  const tagged = normalized.match(LANG_TAGGED);
  if (tagged) return tagged[1].trim();
  const untagged = normalized.match(UNTAGGED);
  if (untagged && /class\s+Solution|def\s+\w+\s*\(/.test(untagged[1])) return untagged[1].trim();
  return null;
}

export async function pickBestPythonSolution(slug: string): Promise<{ code: string; source: SolutionPost }> {
  const posts = await fetchTopSolutions(slug, "python3");
  if (!posts.length) throw new Error(`No Python3 community solutions found for ${slug}`);
  for (const post of posts) {
    const body = await fetchSolutionBody(post.topicId);
    const code = extractPythonCode(body);
    if (code) return { code, source: post };
  }
  throw new Error(`Found ${posts.length} Python3 posts for ${slug} but none had an extractable code block`);
}
