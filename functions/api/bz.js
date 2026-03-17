export async function onRequestGet(context) {
  var requestUrl = new URL(context.request.url);
  var rawPath = requestUrl.searchParams.get("path") || "/";
  var siteOrigin = requestUrl.origin;
  var pageUrl;

  try {
    pageUrl = new URL(rawPath, siteOrigin);
  } catch (error) {
    return responseJson({ error: "Invalid path" }, 400);
  }

  if (pageUrl.origin !== siteOrigin) {
    return responseJson({ error: "Cross-origin path is not allowed" }, 400);
  }

  try {
    var upstream = await fetch(
      "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback",
      {
        headers: {
          referer: pageUrl.toString()
        }
      }
    );

    if (!upstream.ok) {
      return responseJson(
        { error: "Busuanzi upstream returned an error", status: upstream.status },
        502
      );
    }

    var text = await upstream.text();
    var start = text.indexOf("{");
    var end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      return responseJson(
        { error: "Invalid busuanzi response", sample: text.slice(0, 200) },
        502
      );
    }

    var data = JSON.parse(text.slice(start, end + 1));

    return responseJson(
      {
        site_pv: parseNumber(data.site_pv),
        site_uv: parseNumber(data.site_uv),
        page_pv: parseNumber(data.page_pv),
        version: typeof data.version === "undefined" ? null : data.version
      },
      200
    );
  } catch (error) {
    return responseJson(
      {
        error: "Busuanzi proxy runtime error",
        detail: error && error.message ? error.message : String(error)
      },
      502
    );
  }
}

function parseNumber(value) {
  var parsed = parseInt(value, 10);
  return isFinite(parsed) ? parsed : null;
}

function responseJson(payload, status) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}
