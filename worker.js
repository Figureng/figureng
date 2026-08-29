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
  return String(text || "")
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

/* =========================================================
   ADMIN AUTHENTICATION
   ========================================================= */

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

/* =========================================================
   CREATE ARTICLE
   ========================================================= */

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
        status,
        url: `/guides/${slug}`
      }
    },
    201
  );
}

/* =========================================================
   LIST ARTICLES
   ========================================================= */

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

/* =========================================================
   GET ARTICLE BY ID
   ========================================================= */

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

/* =========================================================
   GET ARTICLE BY SLUG
   ========================================================= */

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
      AND status = 'published'
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

/* =========================================================
   UPDATE ARTICLE
   ========================================================= */

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
      status,
      url: `/guides/${slug}`
    }
  });
}

/* =========================================================
   DELETE ARTICLE
   ========================================================= */

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

/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   ARTICLE CONTENT
   ========================================================= */

function formatArticleContent(content) {
  const escaped = escapeHtml(content);

  return escaped
    .split(/\n\s*\n/)
    .map(function(paragraph) {
      const text = paragraph.trim();

      if (!text) {
        return "";
      }

      return `<p>${text.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

/* =========================================================
   DYNAMIC PUBLIC ARTICLE PAGE
   ========================================================= */

async function renderArticlePage(slug, env) {
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
        published_at
      FROM articles
      WHERE slug = ?
      AND status = 'published'
      LIMIT 1
    `)
    .bind(slug)
    .first();

  if (!article) {
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Guide Not Found | FigureNG</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <style>
          body {
            margin: 0;
            background: #f6f7f5;
            color: #14231d;
            font-family: Arial, Helvetica, sans-serif;
          }

          .wrap {
            max-width: 760px;
            margin: 100px auto;
            padding: 30px;
            text-align: center;
          }

          a {
            color: #12372a;
            font-weight: 800;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Guide not found</h1>
          <p>The guide you are looking for does not exist or is not published.</p>
          <p><a href="/guides.html">Return to FigureNG Guides</a></p>
        </div>
      </body>
      </html>`,
      {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }

  const title =
    escapeHtml(
      article.seo_title || article.title
    );

  const description =
    escapeHtml(
      article.meta_description ||
      article.excerpt ||
      article.title
    );

  const articleTitle =
    escapeHtml(article.title);

  const category =
    escapeHtml(article.category);

  const excerpt =
    escapeHtml(article.excerpt);

  const content =
    formatArticleContent(article.content);

  const featuredImage =
    article.featured_image
      ? `
        <img
          src="${escapeHtml(article.featured_image)}"
          alt="${articleTitle}"
          class="featured-image"
        >
      `
      : "";

  let date = "";

  if (article.published_at) {
    const parsedDate = new Date(article.published_at);

    if (!Number.isNaN(parsedDate.getTime())) {
      date = parsedDate.toLocaleDateString(
        "en-NG",
        {
          year: "numeric",
          month: "long",
          day: "numeric"
        }
      );
    }
  }

  const canonical =
    `https://figureng.figureng247.workers.dev/guides/${encodeURIComponent(article.slug)}`;

  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>${title} | FigureNG</title>

<meta
  name="description"
  content="${description}"
>

<meta
  name="robots"
  content="index, follow"
>

<link
  rel="canonical"
  href="${canonical}"
>

<link
  rel="icon"
  type="image/svg+xml"
  href="/favicon.svg"
>

<style>

:root {
  --green: #12372a;
  --green2: #1b513d;
  --ink: #14231d;
  --muted: #69756f;
  --background: #f6f7f5;
  --white: #ffffff;
  --line: #dfe4e1;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: var(--background);
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.75;
}

a {
  color: inherit;
  text-decoration: none;
}

.container {
  width: min(1120px, calc(100% - 30px));
  margin: auto;
}

header {
  background: white;
  border-bottom: 1px solid var(--line);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 20px;
  font-weight: 900;
}

.mark {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  background: var(--green);
  color: white;
  border-radius: 5px;
  font-size: 11px;
}

.brand span {
  color: var(--green2);
}

nav {
  display: flex;
  gap: 24px;
}

nav a {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

nav a:hover {
  color: var(--ink);
}

main {
  padding: 70px 0 90px;
}

.article-wrap {
  max-width: 820px;
  margin: auto;
}

.article-header {
  margin-bottom: 38px;
}

.article-category {
  color: var(--green2);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
  margin-bottom: 14px;
}

h1 {
  font-size: clamp(38px, 6vw, 58px);
  line-height: 1.08;
  letter-spacing: -2px;
  margin-bottom: 17px;
}

.excerpt {
  color: var(--muted);
  font-size: 17px;
  line-height: 1.7;
  margin-bottom: 18px;
}

.meta {
  color: #8a948f;
  font-size: 11px;
}

.featured-image {
  display: block;
  width: 100%;
  max-height: 480px;
  object-fit: cover;
  border-radius: 6px;
  margin: 35px 0;
}

.article-content {
  background: white;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 40px;
}

.article-content p {
  color: #33423a;
  font-size: 16px;
  margin-bottom: 23px;
}

.article-content p:last-child {
  margin-bottom: 0;
}

.back-link {
  display: inline-block;
  margin-bottom: 25px;
  color: var(--green2);
  font-size: 12px;
  font-weight: 900;
}

footer {
  background: var(--green);
  color: white;
  padding: 40px 0;
}

.footer-description {
  color: #c4d8ce;
  font-size: 12px;
  max-width: 400px;
}

.copyright {
  margin-top: 25px;
  padding-top: 18px;
  border-top: 1px solid rgba(255,255,255,.15);
  color: #a9c2b6;
  font-size: 10px;
}

@media(max-width:600px) {

  nav {
    gap: 12px;
  }

  nav a {
    font-size: 11px;
  }

  nav a:nth-child(n+3) {
    display: none;
  }

  main {
    padding: 45px 0 65px;
  }

  h1 {
    font-size: 38px;
    letter-spacing: -1.2px;
  }

  .article-content {
    padding: 25px 20px;
  }

  .article-content p {
    font-size: 15px;
  }

}

</style>

</head>

<body>

<header>

  <div class="container header">

    <a href="/" class="brand">
      <div class="mark">FG</div>
      Figure<span>NG</span>
    </a>

    <nav>
      <a href="/tools.html">Tools</a>
      <a href="/guides.html">Guides</a>
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
    </nav>

  </div>

</header>

<main>

  <div class="container">

    <article class="article-wrap">

      <a
        href="/guides.html"
        class="back-link"
      >
        ← Back to Guides
      </a>

      <header class="article-header">

        <div class="article-category">
          ${category}
        </div>

        <h1>
          ${articleTitle}
        </h1>

        <p class="excerpt">
          ${excerpt}
        </p>

        <div class="meta">
          FigureNG${date ? ` · ${escapeHtml(date)}` : ""}
        </div>

      </header>

      ${featuredImage}

      <div class="article-content">
        ${content}
      </div>

    </article>

  </div>

</main>

<footer>

  <div class="container">

    <div class="brand">
      <div class="mark">FG</div>
      Figure<span>NG</span>
    </div>

    <p class="footer-description">
      Practical calculators, tools and guides for everyday
      decisions in Nigeria.
    </p>

    <div class="copyright">
      © 2026 FigureNG. All rights reserved.
    </div>

  </div>

</footer>

</body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

/* =========================================================
   PUBLIC DYNAMIC GUIDE ROUTE
   ========================================================= */

async function handlePublicGuide(request, env) {
  const url = new URL(request.url);

  const match = url.pathname.match(
    /^\/guides\/([^/]+)\/?$/
  );

  if (!match) {
    return null;
  }

  const slug = decodeURIComponent(match[1]);

  return renderArticlePage(slug, env);
}

/* =========================================================
   API ROUTER
   ========================================================= */

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

  if (!(await authenticate(request, env))) {
    return unauthorized();
  }

  if (
    path === "/api/articles" &&
    request.method === "POST"
  ) {
    return createArticle(request, env);
  }

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

  return json(
    {
      success: false,
      error: "API route not found."
    },
    404
  );
}

/* =========================================================
   MAIN WORKER
   ========================================================= */

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    /*
     * API routes
     */

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
     * Dynamic database-powered guide pages.
     */

    if (url.pathname.startsWith("/guides/")) {

      try {

        if (!env.DB) {
          return new Response(
            "Database connection unavailable.",
            {
              status: 500,
              headers: {
                "Content-Type":
                  "text/plain; charset=UTF-8"
              }
            }
          );
        }

        const guideResponse =
          await handlePublicGuide(
            request,
            env
          );

        if (guideResponse) {
          return guideResponse;
        }

      } catch (error) {

        console.error(
          "FigureNG guide error:",
          error
        );

        return new Response(
          "Unable to load this guide.",
          {
            status: 500,
            headers: {
              "Content-Type":
                "text/plain; charset=UTF-8"
            }
          }
        );
      }
    }

    /*
     * Existing static FigureNG website.
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
