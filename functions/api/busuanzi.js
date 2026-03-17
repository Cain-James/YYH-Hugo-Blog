export async function onRequestGet(context) {
  try {
    const requestUrl = new URL(context.request.url);
    const rawPath = requestUrl.searchParams.get("path") || "/";
    const siteOrigin = requestUrl.origin;

    let pageUrl;
    try {
      pageUrl = new URL(rawPath, siteOrigin);
    } catch (error) {
      return json({ error: "Invalid path" }, 400);
    }

    if (pageUrl.origin !== siteOrigin) {
      return json({ error: "Cross-origin path is not allowed" }, 400);
    }

    const upstreamUrl = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback";
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        referer: pageUrl.toString(),
        accept: "application/javascript, application/json;q=0.9, */*;q=0.8"
      }
    });

    if (!upstreamResponse.ok) {
      return json(
        { error: "Busuanzi upstream returned an error", status: upstreamResponse.status },
        502
      );
    }

    const text = await upstreamResponse.text();
    const data = extractBusuanziPayload(text);

    if (!data) {
      return json(
        {
          error: "Invalid busuanzi response",
          sample: text.slice(0, 200)
        },
        502
      );
    }

    return json(
      {
        site_pv: normalizeNumber(data.site_pv),
        site_uv: normalizeNumber(data.site_uv),
        page_pv: normalizeNumber(data.page_pv),
        version: typeof data.version === "undefined" ? null : data.version
      },
      200,
      {
        "Cache-Control": "public, max-age=60"
      }
    );
  } catch (error) {
    return json(
      {
        error: "Busuanzi proxy runtime error",
        detail: error instanceof Error ? error.message : String(error)
      },
      502
    );
  }
}

function extractBusuanziPayload(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (error) {
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
