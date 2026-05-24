var KV_BINDING = "BLOG_KV";
var DEFAULT_LIMIT = 5;
var MAX_LIMIT = 10;
var CACHE_LIMIT = 20;
var CACHE_TTL_SECONDS = 5 * 60;

export async function onRequestGet(context) {
  var namespace = context.env[KV_BINDING];

  if (!namespace || typeof namespace.get !== "function" || typeof namespace.put !== "function" || typeof namespace.list !== "function") {
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
  var cacheKey = buildCacheKey(lang);
  var cachedItems = await readCachedItems(namespace, cacheKey);

  if (cachedItems) {
    return json({
      ok: true,
      cached: true,
      items: selectItems(cachedItems, limit, exclude)
    });
  }

  var all = await loadItemsFromKv(namespace, lang);
  await writeCachedItems(namespace, cacheKey, all.slice(0, CACHE_LIMIT));

  return json({
    ok: true,
    cached: false,
    items: selectItems(all, limit, exclude)
  });
}

async function loadItemsFromKv(namespace, lang) {
  var items = [];
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
      if (!meta.title || !meta.permalink || !meta.path) {
        continue;
      }
      items.push({
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

  items.sort(function (a, b) {
    if (b.views !== a.views) {
      return b.views - a.views;
    }
    return b.updatedAt - a.updatedAt;
  });

  return items;
}

async function readCachedItems(namespace, cacheKey) {
  var cachedRaw = await namespace.get(cacheKey);
  if (!cachedRaw) {
    return null;
  }

  try {
    var cached = JSON.parse(cachedRaw);
    if (!cached || !Array.isArray(cached.items)) {
      return null;
    }
    return cached.items;
  } catch (error) {
    return null;
  }
}

async function writeCachedItems(namespace, cacheKey, items) {
  try {
    await namespace.put(
      cacheKey,
      JSON.stringify({
        cachedAt: Date.now(),
        items: items
      }),
      {
        expirationTtl: CACHE_TTL_SECONDS
      }
    );
  } catch (error) {
    console.warn("Popular posts cache write failed", error);
  }
}

function selectItems(items, limit, exclude) {
  var selected = [];
  var index;

  for (index = 0; index < items.length; index += 1) {
    if (exclude && items[index].path === exclude) {
      continue;
    }
    selected.push(items[index]);
    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

function buildCacheKey(lang) {
  if (!lang) {
    return "popular:all";
  }
  return "popular:lang:" + lang;
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
