export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const rawPath = requestUrl.searchParams.get("path") || "/";
  const siteOrigin = requestUrl.origin;

  let pageUrl;
  try {
    pageUrl = new URL(rawPath, siteOrigin);
  } catch {
    return json({ error: "Invalid path" }, 400);
  }

  if (pageUrl.origin !== siteOrigin) {
    return json({ error: "Cross-origin path is not allowed" }, 400);
  }

  const upstreamUrl = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback";

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Referer: pageUrl.toString(),
        "User-Agent": "YYH-Hugo-Blog busuanzi proxy"
      },
      cf: {
        cacheEverything: true,
        cacheTtl: 60
      }
    });
  } catch (error) {
    return json(
      { error: "Failed to reach busuanzi upstream", detail: String(error) },
      502
    );
  }

  if (!upstreamResponse.ok) {
    return json(
      { error: "Busuanzi upstream returned an error", status: upstreamResponse.status },
      502
    );
  }

  const text = await upstreamResponse.text();
  const data = extractBusuanziPayload(text);

  if (!data) {
    return json({ error: "Invalid busuanzi response" }, 502);
  }

  return json(
    {
      site_pv: normalizeNumber(data.site_pv),
      site_uv: normalizeNumber(data.site_uv),
      page_pv: normalizeNumber(data.page_pv),
      version: data.version ?? null
    },
    200,
    {
      "Cache-Control": "public, max-age=60"
    }
  );
}

function extractBusuanziPayload(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function json(payload, status, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}
