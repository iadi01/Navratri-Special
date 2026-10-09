import "dotenv/config";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { saveScoreToMongo, getScoresFromMongo, getUsersFromMongo, getMongoStatus } from "./server/db-service";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // =========================================================================
    // 📦 MONGODB ATLAS DIRECT API HANDLERS
    // =========================================================================
    if (url.pathname === '/api/scores') {
      if (request.method === 'POST') {
        try {
          const entry = await request.json();
          const res = await saveScoreToMongo(entry);
          return new Response(JSON.stringify(res), {
            status: res.success ? 200 : 500,
            headers: { 'content-type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ success: false, error: err?.message }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
          });
        }
      }

      if (request.method === 'GET') {
        try {
          const dayParam = url.searchParams.get('day');
          const day = dayParam ? Number(dayParam) : undefined;
          const scores = await getScoresFromMongo(day);
          return new Response(JSON.stringify(scores), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify([]), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    }

    if (url.pathname === '/api/users' && request.method === 'GET') {
      try {
        const users = await getUsersFromMongo();
        return new Response(JSON.stringify(users), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify([]), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/api/db-status') {
      const status = await getMongoStatus();
      return new Response(JSON.stringify(status), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // SSR and TanStack Router Pages
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
