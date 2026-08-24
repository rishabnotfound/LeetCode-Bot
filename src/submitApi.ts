const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

type Cookies = {
  LEETCODE_SESSION: string;
  csrftoken: string;
  cf_clearance?: string;
};

function cookieHeader(c: Cookies): string {
  const parts = [`LEETCODE_SESSION=${c.LEETCODE_SESSION}`, `csrftoken=${c.csrftoken}`];
  if (c.cf_clearance) parts.push(`cf_clearance=${c.cf_clearance}`);
  return parts.join("; ");
}

export type UserStatus = { isSignedIn: boolean; username: string };

export async function userStatus(c: Cookies): Promise<UserStatus> {
  const res = await fetch("https://leetcode.com/graphql/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Referer: "https://leetcode.com/",
      Cookie: cookieHeader(c),
      "x-csrftoken": c.csrftoken,
    },
    body: JSON.stringify({ query: "query { userStatus { isSignedIn username } }" }),
  });
  if (!res.ok) throw new Error(`userStatus HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: { userStatus: UserStatus } };
  return json.data.userStatus;
}

export type SubmitResponse = { submission_id: number };

export async function submit(
  c: Cookies,
  slug: string,
  questionId: string,
  code: string,
  lang = "python3",
): Promise<SubmitResponse> {
  const url = `https://leetcode.com/problems/${slug}/submit/`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Origin: "https://leetcode.com",
      Referer: `https://leetcode.com/problems/${slug}/description/?envType=daily-question`,
      Cookie: cookieHeader(c),
      "x-csrftoken": c.csrftoken,
    },
    body: JSON.stringify({ lang, question_id: questionId, typed_code: code }),
  });
  if (!res.ok) throw new Error(`submit HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as SubmitResponse;
  if (!json.submission_id) throw new Error(`submit returned no submission_id: ${JSON.stringify(json)}`);
  return json;
}

export type CheckResponse =
  | { state: "PENDING" | "STARTED" }
  | {
      state: "SUCCESS";
      status_msg: string;
      status_code: number;
      run_success: boolean;
      total_correct?: number;
      total_testcases?: number;
      compile_error?: string;
      runtime_error?: string;
      last_testcase?: string;
      expected_output?: string;
      code_output?: string;
    };

export async function check(c: Cookies, submissionId: number): Promise<CheckResponse> {
  const res = await fetch(`https://leetcode.com/submissions/detail/${submissionId}/check/`, {
    headers: {
      "User-Agent": UA,
      Referer: "https://leetcode.com/",
      Cookie: cookieHeader(c),
      "x-csrftoken": c.csrftoken,
    },
  });
  if (!res.ok) throw new Error(`check HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as CheckResponse;
}

export async function waitForVerdict(c: Cookies, submissionId: number, timeoutMs = 90_000): Promise<CheckResponse> {
  const start = Date.now();
  let delay = 800;
  while (Date.now() - start < timeoutMs) {
    const r = await check(c, submissionId);
    if (r.state === "SUCCESS") return r;
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay + 300, 2500);
  }
  throw new Error(`Verdict timeout after ${timeoutMs}ms`);
}
