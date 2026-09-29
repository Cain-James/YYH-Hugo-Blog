const UPSTREAM = "https://blog-analytics.finderyyh.workers.dev/";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const start = requestUrl.searchParams.get("start") || "";
  const end = requestUrl.searchParams.get("end") || "";

  if (!DATE_PATTERN.test(start) || !DATE_PATTERN.test(end) || start > end) {
    return json({ error: "Invalid date range" }, 400);
  }

  const upstreamUrl = new URL(UPSTREAM);
  upstreamUrl.searchParams.set("start", start);
  upstreamUrl.searchParams.set("end", end);

  try {
    const response = await fetch(upstreamUrl, {
      headers: { accept: "application/json" }
    });

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    });
  } catch (error) {
    return json({
      error: "Analytics upstream request failed",
      detail: error instanceof Error ? error.message : String(error)
    }, 502);
  }
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
