const jsonHeaders = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...jsonHeaders,
      ...extraHeaders
    }
  });
}

function slugify(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(value, maxLength = 1000000) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().slice(0, maxLength);
}

async function getRequestBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/*
 * ADMIN AUTHENTICATION
 *
 * The password is stored as a Cloudflare Worker secret.
 * It is never placed inside the website JavaScript.
 */

async function authenticate(request, env) {
  const password = request.headers.get("X-Admin-Password");

  if (!password || !env.ADMIN_PASSWORD) {
    return false;
  }

  return password === env.ADMIN_PASSWORD;
}

function unauthorized() {
  return json(
    {
      success: false,
      error: "Unauthorized."
    },
    401
  );
}

/*
 * CREATE ARTICLE
 */

async function createArticle(request, env) {
  const body = await getRequestBody(request);

  if (!body) {
    return json(
      {
        success: false,
        error: "Invalid JSON request."
      },
      400
    );
  }

  const title = cleanText(body.title, 200);
  const content = cleanText(body.content);
  const excerpt = cleanText(body.excerpt, 500);
  const category = cleanText(body.category, 100) || "Guides";
  const featuredImage = cleanText(body.featured_image, 1000);
  const seoTitle = cleanText(body.seo_title, 200);
  const metaDescription = cleanText(
    body.meta_description,
    320
  );

  if (!title) {
    return json(
      {
        success: false,
        error: "Article title is required."
      },
      400
    );
  }

  if (!content) {
    return json(
      {
        success: false,
        error: "Article content is required."
      },
      400
    );
  }

  let slug = slugify(body.slug || title);

  if (!slug) {
    return json(
      {
        success: false,
        error: "A valid article slug could not be created."
      },
      400
    );
  }

  const existing = await env.DB
    .prepare(
      "SELECT id FROM articles WHERE slug = ? LIMIT 1"
    )
    .bind(slug)
    .first();

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const status =
    body.status === "published"
      ? "published"
      : "draft";

  const publishedAt =
    status === "published"
      ? new Date().toISOString()
      : null;

  const result = await env.DB
    .prepare(`
      INSERT INTO articles (
        title,
        slug,
        excerpt,
        content,
        category,
        featured_image,
        seo_title,
        meta_description,
        status,
        published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      title,
      slug,
      excerpt,
      content,
      category,
      featuredImage,
      seoTitle,
      metaDescription,
      status,
      publishedAt
    )
    .run();

  return json(
    {
      success: true,
      message: "Article created successfully.",
      article: {
        id: result.meta.last_row_id,
        title,
        slug,
        status
      }
    },
    201
  );
}

/*
 * LIST ARTICLES
 */

async function listArticles(request, env) {
  const url = new URL(request.url);

  const status =
    url.searchParams.get("status") || "published";

  const limitValue = Number(
    url.searchParams.get("limit") || 20
  );

  const limit = Math.min(
    Math.max(
      Number.isFinite(limitValue) ? limitValue : 20,
      1
    ),
    100
  );

  let query;
  let bindings;

  if (status === "all") {
    query = `
      SELECT
        id,
        title,
        slug,
        excerpt,
        category,
        featured_image,
        seo_title,
        meta_description,
        status,
        published_at,
        created_at,
        updated_at
      FROM articles
      ORDER BY
        COALESCE(published_at, created_at) DESC
      LIMIT ?
    `;

    bindings = [limit];
  } else {
    query = `
      SELECT
        id,
        title,
        slug,
        excerpt,
        category,
        featured_image,
        seo_title,
        meta_description,
        status,
        published_at,
        created_at,
        updated_at
      FROM articles
      WHERE status = ?
      ORDER BY
        published_at DESC
      LIMIT ?
    `;

    bindings = [status, limit];
  }

  const result = await env.DB
    .prepare(query)
    .bind(...bindings)
    .all();

  return json({
    success: true,
    count: result.results.length,
    articles: result.results
  });
}

/*
 * GET ARTICLE BY ID
 */

async function getArticleById(id, env) {
  const articleId = Number(id);

  if (!Number.isInteger(articleId) || articleId <= 0) {
    return json(
      {
        success: false,
        error: "Invalid article ID."
      },
      400
    );
  }

  const article = await env.DB
    .prepare(`
      SELECT
        id,
        title,
        slug,
        excerpt,
        content,
        category,
        featured_image,
        seo_title,
        meta_description,
        status,
        published_at,
        created_at,
        updated_at
      FROM articles
      WHERE id = ?
      LIMIT 1
    `)
    .bind(articleId)
    .first();

  if (!article) {
    return json(
      {
        success: false,
        error: "Article not found."
      },
      404
    );
  }

  return json({
    success: true,
    article
  });
}

/*
 * GET ARTICLE BY SLUG
 */

async function getArticleBySlug(slug, env) {
  const article = await env.DB
    .prepare(`
      SELECT
        id,
        title,
        slug,
        excerpt,
        content,
        category,
        featured_image,
        seo_title,
        meta_description,
        status,
        published_at,
        created_at,
        updated_at
      FROM articles
      WHERE slug = ?
      LIMIT 1
    `)
    .bind(slug)
    .first();

  if (!article) {
    return json(
      {
        success: false,
        error: "Article not found."
      },
      404
    );
  }

  return json({
    success: true,
    article
  });
}

/*
 * UPDATE ARTICLE
 */

async function updateArticle(id, request, env) {
  const articleId = Number(id);

  if (!Number.isInteger(articleId) || articleId <= 0) {
    return json(
      {
        success: false,
        error: "Invalid article ID."
      },
      400
    );
  }

  const body = await getRequestBody(request);

  if (!body) {
    return json(
      {
        success: false,
        error: "Invalid JSON request."
      },
      400
    );
  }

  const title = cleanText(body.title, 200);
  const content = cleanText(body.content);
  const excerpt = cleanText(body.excerpt, 500);
  const category = cleanText(body.category, 100) || "Guides";
  const featuredImage = cleanText(body.featured_image, 1000);
  const seoTitle = cleanText(body.seo_title, 200);
  const metaDescription = cleanText(
    body.meta_description,
    320
  );

  if (!title || !content) {
    return json(
      {
        success: false,
        error: "Title and content are required."
      },
      400
    );
  }

  let slug = slugify(body.slug || title);

  if (!slug) {
    return json(
      {
        success: false,
        error: "A valid slug is required."
      },
      400
    );
  }

  const duplicate = await env.DB
    .prepare(`
      SELECT id
      FROM articles
      WHERE slug = ?
      AND id != ?
      LIMIT 1
    `)
    .bind(slug, articleId)
    .first();

  if (duplicate) {
    slug = `${slug}-${Date.now()}`;
  }

  const current = await env.DB
    .prepare(
      "SELECT status, published_at FROM articles WHERE id = ?"
    )
    .bind(articleId)
    .first();

  if (!current) {
    return json(
      {
        success: false,
        error: "Article not found."
      },
      404
    );
  }

  const status =
    body.status === "published"
      ? "published"
      : "draft";

  let publishedAt = current.published_at;

  if (status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  if (status === "draft") {
    publishedAt = null;
  }

  await env.DB
    .prepare(`
      UPDATE articles
      SET
        title = ?,
        slug = ?,
        excerpt = ?,
        content = ?,
        category = ?,
        featured_image = ?,
        seo_title = ?,
        meta_description = ?,
        status = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .bind(
      title,
      slug,
      excerpt,
      content,
      category,
      featuredImage,
      seoTitle,
      metaDescription,
      status,
      publishedAt,
      articleId
    )
    .run();

  return json({
    success: true,
    message: "Article updated successfully.",
    article: {
      id: articleId,
      title,
      slug,
      status
    }
  });
}

/*
 * DELETE ARTICLE
 */

async function deleteArticle(id, env) {
  const articleId = Number(id);

  if (!Number.isInteger(articleId) || articleId <= 0) {
    return json(
      {
        success: false,
        error: "Invalid article ID."
      },
      400
    );
  }

  const result = await env.DB
    .prepare(
      "DELETE FROM articles WHERE id = ?"
    )
    .bind(articleId)
    .run();

  if (!result.meta.changes) {
    return json(
      {
        success: false,
        error: "Article not found."
      },
      404
    );
  }

  return json({
    success: true,
    message: "Article deleted successfully."
  });
}

/*
 * API ROUTER
 */

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/health") {
    return json({
      success: true,
      service: "FigureNG",
      worker: "online",
      database: Boolean(env.DB)
    });
  }

  if (!env.DB) {
    return json(
      {
        success: false,
        error: "D1 database binding is not available."
      },
      500
    );
  }

  /*
   * Public article reading.
   */

  if (
    path === "/api/articles" &&
    request.method === "GET"
  ) {
    return listArticles(request, env);
  }

  const publicSlugMatch = path.match(
    /^\/api\/articles\/slug\/([^/]+)$/
  );

  if (
    publicSlugMatch &&
    request.method === "GET"
  ) {
    return getArticleBySlug(
      decodeURIComponent(publicSlugMatch[1]),
      env
    );
  }

  /*
   * Everything below this point requires admin
   * authentication.
   */

  if (!(await authenticate(request, env))) {
    return unauthorized();
  }

  /*
   * Create article.
   */

  if (
    path === "/api/articles" &&
    request.method === "POST"
  ) {
    return createArticle(request, env);
  }

  /*
   * Article by ID.
   */

  const idMatch = path.match(
    /^\/api\/articles\/(\d+)$/
  );

  if (idMatch) {
    const id = idMatch[1];

    if (request.method === "GET") {
      return getArticleById(id, env);
    }

    if (request.method === "PUT") {
      return updateArticle(id, request, env);
    }

    if (request.method === "DELETE") {
      return deleteArticle(id, env);
    }

    return json(
      {
        success: false,
        error: "Method not allowed."
      },
      405
    );
  }

  /*
   * Admin article listing.
   *
   * Example:
   * /api/articles?status=all
   */

  return json(
    {
      success: false,
      error: "API route not found."
    },
    404
  );
}

/*
 * MAIN WORKER
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env);
      } catch (error) {
        console.error("FigureNG API error:", error);

        return json(
          {
            success: false,
            error: "An unexpected server error occurred."
          },
          500
        );
      }
    }

    /*
     * Continue serving the existing FigureNG website.
     */

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "FigureNG Worker is running, but the ASSETS binding is not configured.",
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );
  }
};
