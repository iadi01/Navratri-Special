import "dotenv/config";
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  saveScoreToMongo,
  getScoresFromMongo,
  getUsersFromMongo,
  getMongoStatus,
  validateAdminLogin,
  getAdminsFromMongo,
  saveAdminToMongo,
  deleteAdminFromMongo,
  getLiveDaysFromMongo,
  saveLiveDaysToMongo,
  checkAttemptInMongo,
  saveUserProfileToMongo,
  checkUsernameConflictInMongo,
} from "./server/db-service";

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

    // Extract client IP (Cloudflare, Proxy, or direct)
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // =========================================================================
    // 📦 MONGODB ATLAS DIRECT API HANDLERS
    // =========================================================================

    // 🛡️ Check if user / device already attempted today's quiz
    if (url.pathname === '/api/check-attempt' && request.method === 'GET') {
      try {
        const day = Number(url.searchParams.get('day') || 1);
        const username = url.searchParams.get('username') || undefined;
        const rollNo = url.searchParams.get('rollNo') || undefined;
        const result = await checkAttemptInMongo(day, username, rollNo, clientIp);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ attempted: false }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    // 🔍 Check username conflict in same course & batch
    if (url.pathname === '/api/users/check-username' && request.method === 'GET') {
      try {
        const username = url.searchParams.get('username') || '';
        const course = url.searchParams.get('course') || '';
        const batch = url.searchParams.get('batch') || '';
        const year = url.searchParams.get('year') || '';
        const rollNo = url.searchParams.get('rollNo') || '';
        const result = await checkUsernameConflictInMongo({
          username,
          course,
          batch,
          year,
          rollNo,
          clientIp,
        });
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ conflict: false }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    // 👤 Save / update user profile with max 2 edit restriction
    if (url.pathname === '/api/users/profile' && request.method === 'POST') {
      try {
        const profile = await request.json();
        const res = await saveUserProfileToMongo(profile, clientIp);
        return new Response(JSON.stringify(res), {
          status: res.success ? 200 : 400,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err?.message }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/api/scores') {
      if (request.method === 'POST') {
        try {
          const entry = await request.json();
          const res = await saveScoreToMongo(entry, clientIp);
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

    // =========================================================================
    // 👑 ADMIN & GLOBAL CONFIG API HANDLERS
    // =========================================================================
    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
      try {
        const { username, password } = await request.json();
        const res = await validateAdminLogin(username, password);
        return new Response(JSON.stringify(res), {
          status: res.success ? 200 : 401,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err?.message || 'Login failed' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/api/admin/list' && request.method === 'GET') {
      try {
        const admins = await getAdminsFromMongo();
        return new Response(JSON.stringify(admins), {
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

    if (url.pathname === '/api/admin/add' && request.method === 'POST') {
      try {
        const body = await request.json();
        const res = await saveAdminToMongo(body);
        return new Response(JSON.stringify(res), {
          status: res.success ? 200 : 400,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err?.message || 'Failed to add admin' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/api/admin/delete' && request.method === 'POST') {
      try {
        const { username } = await request.json();
        const res = await deleteAdminFromMongo(username);
        return new Response(JSON.stringify(res), {
          status: res.success ? 200 : 400,
          headers: { 'content-type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err?.message || 'Failed to delete admin' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    if (url.pathname === '/api/admin/live-days') {
      if (request.method === 'GET') {
        try {
          const days = await getLiveDaysFromMongo();
          return new Response(JSON.stringify(days), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify([1]), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }
      }

      if (request.method === 'POST') {
        try {
          const { days } = await request.json();
          const ok = await saveLiveDaysToMongo(days);
          return new Response(JSON.stringify({ success: ok }), {
            status: ok ? 200 : 500,
            headers: { 'content-type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ success: false, error: err?.message }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
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
