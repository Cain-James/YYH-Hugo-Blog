var VIEW_TTL_MS = 6 * 60 * 60 * 1000;
var KV_BINDING = "POST_VIEWS";

export async function onRequestPost(context) {
  var namespace = context.env[KV_BINDING];

  if (!namespace || typeof namespace.get !== "function" || typeof namespace.put !== "function") {
    return json(
      {
        error: "Missing KV binding",
        binding: KV_BINDING
      },
      500
    );
  }

  var payload;
  try {
    payload = await context.request.json();
  } catch (error) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  var normalized = normalizePayload(payload, context.request.url);
  if (normalized.error) {
    return json({ error: normalized.error }, 400);
  }

  var key = buildPostKey(normalized.path);
  var existingRaw = await namespace.get(key);
  var existing = parseRecord(existingRaw);
  var now = Date.now();
  var nextViews = existing && typeof existing.views === "number" ? existing.views + 1 : 1;

  var record = {
    path: normalized.path,
    permalink: normalized.permalink,
    title: normalized.title,
    lang: normalized.lang,
    views: nextViews,
    updatedAt: now,
    createdAt: existing && existing.createdAt ? existing.createdAt : now
  };

  await namespace.put(key, JSON.stringify(record), {
    metadata: {
      path: record.path,
      permalink: record.permalink,
      title: record.title,
      lang: record.lang,
      views: record.views,
      updatedAt: record.updatedAt
    }
  });

  return json({
    ok: true,
    path: record.path,
    views: record.views,
    dedupeWindowMs: VIEW_TTL_MS
  });
}

function normalizePayload(payload, requestUrl) {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload is required" };
  }

  var siteOrigin = new URL(requestUrl).origin;
  var path = typeof payload.path === "string" ? payload.path.trim() : "";
  var permalink = typeof payload.permalink === "string" ? payload.permalink.trim() : "";
  var title = typeof payload.title === "string" ? payload.title.trim() : "";
  var lang = typeof payload.lang === "string" ? payload.lang.trim() : "";

  if (!path || path.charAt(0) !== "/") {
    return { error: "Relative path is required" };
  }

  try {
    var resolved = new URL(path, siteOrigin);
    if (resolved.origin !== siteOrigin) {
      return { error: "Cross-origin path is not allowed" };
    }
    path = resolved.pathname;
  } catch (error) {
    return { error: "Invalid path" };
  }

  if (!permalink) {
    permalink = new URL(path, siteOrigin).toString();
  }

  if (!title) {
    return { error: "Title is required" };
  }

  if (!lang) {
    lang = "default";
  }

  return {
    path: path,
    permalink: permalink,
    title: title,
    lang: lang
  };
}

function parseRecord(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function buildPostKey(path) {
  return "post:" + path;
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
