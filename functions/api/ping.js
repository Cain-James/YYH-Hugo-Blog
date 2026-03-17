export function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "pages-function-ping"
    }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
