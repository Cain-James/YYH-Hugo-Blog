var KV_BINDING = "BLOG_KV";
var DEFAULT_LIMIT = 5;
var MAX_LIMIT = 10;

export async function onRequestGet(context) {
  var namespace = context.env[KV_BINDING];

  if (!namespace || typeof namespace.list !== "function") {
    return json(
      {
        error: "Missing KV binding",
        binding: KV_BINDING
      },
      500
    );
  }

  var requestUrl = new URL(context.request.url);
  var limit = clampLimit(requestUrl.searchParams.get("limit"));
  var lang = requestUrl.searchParams.get("lang") || "";
  var exclude = normalizePath(requestUrl.searchParams.get("exclude") || "");

  var all = [];
  var cursor = undefined;

  do {
    var page = await namespace.list({
      prefix: "post:",
      limit: 1000,
      cursor: cursor
    });

    var keys = page.keys || [];
    var index;
    for (index = 0; index < keys.length; index += 1) {
      var item = keys[index];
      var meta = item.metadata || null;
      if (!meta) {
        continue;
      }
      if (lang && meta.lang !== lang) {
        continue;
      }
      if (exclude && meta.path === exclude) {
        continue;
      }
      if (!meta.title || !meta.permalink || !meta.path) {
        continue;
      }
      all.push({
        path: meta.path,
        permalink: meta.permalink,
        title: meta.title,
        lang: meta.lang || "default",
        views: parseNumber(meta.views),
        updatedAt: parseNumber(meta.updatedAt)
      });
    }

    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);

  all.sort(function (a, b) {
    if (b.views !== a.views) {
      return b.views - a.views;
    }
    return b.updatedAt - a.updatedAt;
  });

  return json({
    ok: true,
    items: all.slice(0, limit)
  });
}

function clampLimit(raw) {
  var parsed = parseInt(raw || "", 10);
  if (!isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

function normalizePath(path) {
  if (!path || path.charAt(0) !== "/") {
    return "";
  }
  return path;
}

function parseNumber(value) {
  var parsed = parseInt(value, 10);
  return isFinite(parsed) ? parsed : 0;
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
