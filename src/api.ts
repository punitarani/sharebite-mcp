function getBaseUrl(): string {
  const url = process.env.SHAREBITE_BASE_URL;
  if (!url) {
    throw new Error("SHAREBITE_BASE_URL not set. Run `bun run setup` to configure.");
  }
  return url;
}

function getSessionId(): string {
  const sessionId = process.env.SHAREBITE_SESSION_ID;
  if (!sessionId) {
    throw new Error("SHAREBITE_SESSION_ID not set. Run `bun run setup` to configure.");
  }
  return sessionId;
}

function headers(): Record<string, string> {
  return {
    Cookie: `sessionid=${getSessionId()}`,
    Accept: "application/json",
  };
}

async function handleResponse(res: Response): Promise<unknown> {
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Auth failed (${res.status}). Your session may have expired. ` +
        `Your session may have expired. Run \`bun run setup\` with a fresh cookie.`,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function apiGet(path: string, params?: Record<string, string>): Promise<unknown> {
  const url = new URL(`${getBaseUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { headers: headers() });
  return handleResponse(res);
}

export async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}
