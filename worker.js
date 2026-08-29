const jsonHeaders = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...jsonHeaders, ...extraHeaders }
  });
}

function slugify(value) {
  return String(value || "").trim().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(value, max = 1000000) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeRichHtml(input) {
  let html = String(input || "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|textarea|button|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|input|textarea|button|meta|link)[^>]*\/?\s*>/gi, "");
  const allowed = /^(p|br|h2|h3|h4|strong|b|em|i|u|s|ul|ol|li|blockquote|a|img|div|span)$/i;
  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, function(full, tag, attrs) {
    if (!allowed.test(tag)) return "";
    if (full.startsWith("</")) return `</${tag.toLowerCase()}>`;
    let safe = "";
    const attrRe = /([a-zA-Z-]+)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))/g;
    let match;
    while ((match = attrRe.exec(attrs))) {
      const name = match[1].toLowerCase();
      const value = match[2] ?? match[3] ?? match[4] ?? "";
      if (["onclick","onload","onerror","onmouseover","onfocus","onmouseenter","onmouseleave","oninput","onsubmit","style"].includes(name)) {
        if (name === "style") {
          const styles = value.split(";").map(x => x.trim()).filter(Boolean);
          const good = styles.filter(x => /^(color|background-color|font-weight|text-align)\s*:\s*[-#(),.%\w\s]+$/i.test(x));
          if (good.length) safe += ` style="${escapeHtml(good.join("; "))}"`;
        }
        continue;
      }
      if (name === "href") {
        if (/^https?:\/\//i.test(value) || value.startsWith("/")) safe += ` href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer"`;
        continue;
      }
      if (name === "src") {
        if (/^https?:\/\//i.test(value) || value.startsWith("/api/media/")) safe += ` src="${escapeHtml(value)}"`;
        continue;
      }
      if (["alt","title","width","height"].includes(name)) safe += ` ${name}="${escapeHtml(value.slice(0, 500))}"`;
    }
    if (tag.toLowerCase() === "img") return `<img${safe}>`;
    if (tag.toLowerCase() === "br") return "<br>";
    return `<${tag.toLowerCase()}${safe}>`;
  });
  return html.slice(0, 1000000);
}

function contentToHtml(content) {
  const value = String(content || "");
  if (/<\s*(p|h2|h3|ul|ol|blockquote|img|strong|em|div)\b/i.test(value)) return sanitizeRichHtml(value);
  return escapeHtml(value).split(/\n\s*\n/).map(p => p.trim() ? `<p>${p.replace(/\n/g, "<br>")}</p>` : "").join("\n");
}

async function bodyJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function auth(request, env) {
  return Boolean(request.headers.get("X-Admin-Password") && env.ADMIN_PASSWORD && request.headers.get("X-Admin-Password") === env.ADMIN_PASSWORD);
}

function unauthorized() { return json({ success:false, error:"Unauthorized." }, 401); }

async function getArticle(id, env) {
  const article = await env.DB.prepare(`SELECT id,title,slug,excerpt,content,category,featured_image,seo_title,meta_description,status,published_at,created_at,updated_at FROM articles WHERE id=? LIMIT 1`).bind(Number(id)).first();
  return article ? json({success:true,article}) : json({success:false,error:"Article not found."},404);
}

async function listArticles(request, env) {
  const u = new URL(request.url);
  const slug = u.searchParams.get("slug");
  if (slug) {
    const article = await env.DB.prepare(`SELECT id,title,slug,excerpt,content,category,featured_image,seo_title,meta_description,status,published_at,created_at,updated_at FROM articles WHERE slug=? AND status='published' LIMIT 1`).bind(slug).first();
    return article ? json({success:true,article}) : json({success:false,error:"Article not found."},404);
  }
  const status = u.searchParams.get("status") || "published";
  const limit = Math.min(Math.max(Number(u.searchParams.get("limit") || 20) || 20,1),100);
  const where = status === "all" ? "" : "WHERE status = ?";
  const binds = status === "all" ? [limit] : [status,limit];
  const result = await env.DB.prepare(`SELECT id,title,slug,excerpt,content,category,featured_image,seo_title,meta_description,status,published_at,created_at,updated_at FROM articles ${where} ORDER BY COALESCE(published_at,created_at) DESC LIMIT ?`).bind(...binds).all();
  return json({success:true,count:result.results.length,articles:result.results});
}

async function createArticle(request, env) {
  const b = await bodyJson(request); if (!b) return json({success:false,error:"Invalid JSON request."},400);
  const title=cleanText(b.title,200), content=contentToHtml(b.content), excerpt=cleanText(b.excerpt,500), category=cleanText(b.category,100)||"Guides";
  const featuredImage=cleanText(b.featured_image,1000), seoTitle=cleanText(b.seo_title,200), metaDescription=cleanText(b.meta_description,320);
  if(!title || !content.replace(/<[^>]*>/g,"" ).trim()) return json({success:false,error:"Title and content are required."},400);
  let slug=slugify(b.slug||title); if(!slug) return json({success:false,error:"A valid article slug is required."},400);
  if(await env.DB.prepare("SELECT id FROM articles WHERE slug=? LIMIT 1").bind(slug).first()) slug += "-"+Date.now();
  const status=b.status==="published"?"published":"draft";
  const publishedAt=status==="published"?new Date().toISOString():null;
  const r=await env.DB.prepare(`INSERT INTO articles(title,slug,excerpt,content,category,featured_image,seo_title,meta_description,status,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(title,slug,excerpt,content,category,featuredImage,seoTitle,metaDescription,status,publishedAt).run();
  return json({success:true,message:"Article created successfully.",article:{id:r.meta.last_row_id,title,slug,status,url:`/article.html?slug=${encodeURIComponent(slug)}`}},201);
}

async function updateArticle(id,request,env) {
  const articleId=Number(id); if(!Number.isInteger(articleId)||articleId<=0)return json({success:false,error:"Invalid article ID."},400);
  const b=await bodyJson(request); if(!b)return json({success:false,error:"Invalid JSON request."},400);
  const current=await env.DB.prepare("SELECT status,published_at FROM articles WHERE id=?").bind(articleId).first(); if(!current)return json({success:false,error:"Article not found."},404);
  const title=cleanText(b.title,200),content=contentToHtml(b.content),excerpt=cleanText(b.excerpt,500),category=cleanText(b.category,100)||"Guides",featuredImage=cleanText(b.featured_image,1000),seoTitle=cleanText(b.seo_title,200),metaDescription=cleanText(b.meta_description,320);
  if(!title || !content.replace(/<[^>]*>/g,"" ).trim())return json({success:false,error:"Title and content are required."},400);
  let slug=slugify(b.slug||title); if(!slug)return json({success:false,error:"A valid slug is required."},400);
  const dup=await env.DB.prepare("SELECT id FROM articles WHERE slug=? AND id!=? LIMIT 1").bind(slug,articleId).first(); if(dup)slug += "-"+Date.now();
  const status=b.status==="published"?"published":"draft"; let publishedAt=current.published_at; if(status==="published"&&!publishedAt)publishedAt=new Date().toISOString(); if(status==="draft")publishedAt=null;
  await env.DB.prepare(`UPDATE articles SET title=?,slug=?,excerpt=?,content=?,category=?,featured_image=?,seo_title=?,meta_description=?,status=?,published_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(title,slug,excerpt,content,category,featuredImage,seoTitle,metaDescription,status,publishedAt,articleId).run();
  return json({success:true,message:"Article updated successfully.",article:{id:articleId,title,slug,status,url:`/article.html?slug=${encodeURIComponent(slug)}`} });
}

async function deleteArticle(id,env) {
  const r=await env.DB.prepare("DELETE FROM articles WHERE id=?").bind(Number(id)).run();
  return r.meta.changes ? json({success:true,message:"Article deleted successfully."}) : json({success:false,error:"Article not found."},404);
}

const defaultNav=[{label:"Tools",url:"/tools.html",enabled:true},{label:"Guides",url:"/guides.html",enabled:true},{label:"About",url:"/about.html",enabled:true}];

async function getSettings(env) {
  const rows=await env.DB.prepare("SELECT key,value FROM site_settings").all();
  const out={}; for(const row of rows.results) { try { out[row.key]=JSON.parse(row.value); } catch { out[row.key]=row.value; } }
  if(!Array.isArray(out.nav_items))out.nav_items=defaultNav; return out;
}

async function siteConfig(env) { return json({success:true,settings:await getSettings(env)}); }

async function updateSettings(request,env) {
  const b=await bodyJson(request); if(!b||!b.settings)return json({success:false,error:"Settings are required."},400);
  const allowed={site_name:String(b.settings.site_name||"FigureNG").slice(0,100),site_tagline:String(b.settings.site_tagline||"").slice(0,300),nav_items:Array.isArray(b.settings.nav_items)?b.settings.nav_items.slice(0,12).map(x=>({label:String(x.label||"").slice(0,50),url:String(x.url||"").slice(0,300),enabled:Boolean(x.enabled)})):defaultNav};
  for(const [key,value] of Object.entries(allowed)) await env.DB.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(key,JSON.stringify(value)).run();
  return json({success:true,message:"Site settings saved.",settings:allowed});
}

function mediaTypeAllowed(type){return ["image/jpeg","image/png","image/webp","image/gif","image/svg+xml"].includes(type);}

async function uploadMedia(request,env){
  if(!env.MEDIA)return json({success:false,error:"Image storage is not configured yet. Create the figureng-media R2 bucket and deploy again."},503);
  const form=await request.formData(); const file=form.get("file"); if(!(file instanceof File))return json({success:false,error:"No image file was uploaded."},400);
  if(!mediaTypeAllowed(file.type))return json({success:false,error:"Only JPG, PNG, WebP, GIF and SVG images are allowed."},400);
  if(file.size>5*1024*1024)return json({success:false,error:"Image must be 5 MB or smaller."},400);
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const key=`articles/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:"public, max-age=31536000, immutable"}});
  await env.DB.prepare("INSERT INTO media(filename,object_key,mime_type,size) VALUES(?,?,?,?)").bind(file.name,key,file.type,file.size).run();
  return json({success:true,url:`/api/media/${encodeURIComponent(key)}`,key,filename:file.name});
}

async function serveMedia(key,env){
  if(!env.MEDIA)return new Response("Media storage is not configured.",{status:503});
  const object=await env.MEDIA.get(key); if(!object)return new Response("Image not found",{status:404});
  const headers=new Headers(); object.writeHttpMetadata(headers); headers.set("etag",object.httpEtag); headers.set("Cache-Control","public, max-age=31536000, immutable"); return new Response(object.body,{headers});
}

export default {
  async fetch(request,env){
    const url=new URL(request.url); const path=url.pathname;
    try {
      if(path.startsWith("/api/media/")) return serveMedia(decodeURIComponent(path.slice("/api/media/".length)),env);
      if(path.startsWith("/api/")) {
        if(path==="/api/site-config"&&request.method==="GET")return siteConfig(env);
        if(path==="/api/articles"&&request.method==="GET")return listArticles(request,env);
        if(path==="/api/articles"&&request.method==="POST") {if(!(await auth(request,env)))return unauthorized();return createArticle(request,env);}
        if(path==="/api/media"&&request.method==="POST") {if(!(await auth(request,env)))return unauthorized();return uploadMedia(request,env);}
        if(path==="/api/site-config"&&request.method==="PUT") {if(!(await auth(request,env)))return unauthorized();return updateSettings(request,env);}
        const m=path.match(/^\/api\/articles\/(\d+)$/); if(m){if(!(await auth(request,env)))return unauthorized(); if(request.method==="GET")return getArticle(m[1],env); if(request.method==="PUT")return updateArticle(m[1],request,env); if(request.method==="DELETE")return deleteArticle(m[1],env);}
        return json({success:false,error:"API route not found."},404);
      }
      if(path==="/guides"||path==="/guides/") return Response.redirect(new URL("/guides.html",request.url),301);
      return env.ASSETS.fetch(request);
    } catch(error) {
      return json({success:false,error:error?.message||"Server error."},500);
    }
  }
};
