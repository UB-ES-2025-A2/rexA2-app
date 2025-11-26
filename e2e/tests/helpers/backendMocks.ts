import type { Page, Request } from "@playwright/test";

type MockUser = {
  id: string;
  email: string;
  username: string;
  name?: string;
};

type MockRoute = {
  id: string;
  _id: string;
  name: string;
  description: string;
  category: string;
  points: Array<[number, number]>;
  visibility: boolean;
  owner_id: string;
  owner_username: string;
  username?: string;
  email?: string;
};

type MockComment = {
  id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
  replies: MockComment[];
};

const jsonResponse = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const PRIMARY_USER: MockUser = {
  id: "user-primary",
  email: "testuser@example.com",
  username: "test_user",
  name: "Test User",
};

const FOLLOWEE_USER: MockUser = {
  id: "user-followee",
  email: "followee@example.com",
  username: "followee_user",
  name: "Followee User",
};

const TOKENS = {
  [PRIMARY_USER.email]: "token-primary",
  [FOLLOWEE_USER.email]: "token-followee",
};

const VALID_PASSWORD = "Aa1!passw";

function resolveUserFromAuth(request: Request): MockUser | null {
  const auth = request.headers()["authorization"] || "";
  if (auth.includes(TOKENS[PRIMARY_USER.email])) return PRIMARY_USER;
  if (auth.includes(TOKENS[FOLLOWEE_USER.email])) return FOLLOWEE_USER;
  return null;
}

export async function setupBackendMocks(page: Page) {
  let followState = false;

  const routes: MockRoute[] = [
    {
      id: "route-1",
      _id: "route-1",
      name: "Ruta de prueba",
      description: "Ruta E2E de ejemplo",
      category: "montaña",
      points: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      visibility: true,
      owner_id: FOLLOWEE_USER.id,
      owner_username: FOLLOWEE_USER.username,
      username: FOLLOWEE_USER.username,
      email: FOLLOWEE_USER.email,
    },
  ];

  const commentsByRoute: Record<string, MockComment[]> = {
    "route-1": [
      {
        id: "comment-1",
        user_id: FOLLOWEE_USER.id,
        username: FOLLOWEE_USER.username,
        content: "Comentario inicial",
        created_at: new Date().toISOString(),
        replies: [],
      },
    ],
  };

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;
    const method = route.request().method();

    const isApiPath =
      pathname.startsWith("/auth") ||
      pathname.startsWith("/routes") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/favorites");

    if (!isApiPath) {
      await route.continue();
      return;
    }

    const authedUser = resolveUserFromAuth(route.request());

    if (pathname === "/auth/login" && method === "POST") {
      let payload: { email?: string; password?: string } = {};
      try {
        payload = (route.request().postDataJSON() as any) ?? {};
      } catch {
        payload = {};
      }

      if (
        payload.email === PRIMARY_USER.email &&
        payload.password === VALID_PASSWORD
      ) {
        await route.fulfill(
          jsonResponse({
            access_token: TOKENS[PRIMARY_USER.email],
            user: PRIMARY_USER,
          })
        );
        return;
      }

      await route.fulfill(jsonResponse({ detail: "Credenciales inválidas" }, 401));
      return;
    }

    if (pathname === "/auth/me") {
      if (!authedUser) {
        await route.fulfill(jsonResponse({ detail: "No autorizado" }, 401));
        return;
      }
      await route.fulfill(jsonResponse(authedUser));
      return;
    }

    if (pathname === "/favorites/me") {
      await route.fulfill(jsonResponse({ route_ids: [] }));
      return;
    }

    if (pathname === "/routes" && method === "GET") {
      await route.fulfill(jsonResponse(routes));
      return;
    }

    const routeDetailMatch = pathname.match(/^\/routes\/([^/]+)$/);
    if (routeDetailMatch) {
      const routeId = routeDetailMatch[1];
      const found = routes.find((r) => r.id === routeId || r._id === routeId);
      if (!found) {
        await route.fulfill(jsonResponse({ detail: "Ruta no encontrada" }, 404));
        return;
      }
      await route.fulfill(
        jsonResponse({
          ...found,
          is_owner: authedUser?.id === found.owner_id,
        })
      );
      return;
    }

    const commentsMatch = pathname.match(/^\/routes\/([^/]+)\/comments$/);
    if (commentsMatch) {
      const routeId = commentsMatch[1];
      if (method === "GET") {
        await route.fulfill(jsonResponse(commentsByRoute[routeId] || []));
        return;
      }
      if (method === "POST") {
        if (!authedUser) {
          await route.fulfill(jsonResponse({ detail: "No autorizado" }, 401));
          return;
        }
        const payload = (await route.request().postDataJSON().catch(() => ({}))) as {
          content?: string;
          parent_id?: string | null;
        };
        const newComment: MockComment = {
          id: `comment-${Date.now()}`,
          user_id: authedUser.id,
          username: authedUser.username,
          content: payload.content || "",
          created_at: new Date().toISOString(),
          replies: [],
        };
        commentsByRoute[routeId] = [
          newComment,
          ...(commentsByRoute[routeId] || []),
        ];
        await route.fulfill(jsonResponse(newComment, 201));
        return;
      }
    }

    if (pathname === "/users/search") {
      const q = (searchParams.get("q") || "").toLowerCase();
      const includeFollowee = q === "all" || q === "" || FOLLOWEE_USER.username.includes(q);
      const data = includeFollowee
        ? [
            {
              id: FOLLOWEE_USER.id,
              username: FOLLOWEE_USER.username,
              name: FOLLOWEE_USER.name,
              email: FOLLOWEE_USER.email,
              avatar_url: null,
            },
          ]
        : [];
      await route.fulfill(jsonResponse(data));
      return;
    }

    const isFollowingMatch = pathname.match(/^\/users\/([^/]+)\/is-following$/);
    if (isFollowingMatch) {
      const userId = isFollowingMatch[1];
      if (userId === FOLLOWEE_USER.id) {
        await route.fulfill(jsonResponse({ is_following: followState }));
      } else {
        await route.fulfill(jsonResponse({ is_following: false }));
      }
      return;
    }

    const followMatch = pathname.match(/^\/users\/([^/]+)\/follow$/);
    if (followMatch) {
      const userId = followMatch[1];
      if (!authedUser) {
        await route.fulfill(jsonResponse({ detail: "No autorizado" }, 401));
        return;
      }
      if (method === "POST") followState = userId === FOLLOWEE_USER.id ? true : followState;
      if (method === "DELETE") followState = userId === FOLLOWEE_USER.id ? false : followState;
      await route.fulfill(jsonResponse({ ok: true }));
      return;
    }

    const routesByUserMatch = pathname.match(/^\/routes\/user\/([^/]+)$/);
    if (routesByUserMatch) {
      const username = decodeURIComponent(routesByUserMatch[1]);
      const data = routes.filter((r) => r.owner_username === username);
      await route.fulfill(jsonResponse(data));
      return;
    }

    await route.continue();
  });
}
