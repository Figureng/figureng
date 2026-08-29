export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /*
     * FigureNG Worker
     *
     * For now, this Worker simply confirms that the
     * Worker layer is working while continuing to
     * serve the existing public website.
     */

    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          success: true,
          service: "FigureNG",
          worker: "online"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    /*
     * All normal website requests continue to be
     * served from the public directory.
     */

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "FigureNG Worker is running, but the ASSETS binding is not configured.",
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  }
};
