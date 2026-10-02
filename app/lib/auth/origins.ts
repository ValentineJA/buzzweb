// Only deployment configuration is trusted; never derive this list from request headers.
export function trustedOrigins(env: Record<string, string | undefined> = process.env): string[] {
  const values = [env.APP_URL];
  if (env.VERCEL === "1") {
    for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL", ...(env.VERCEL_ENV === "production" ? ["VERCEL_PROJECT_PRODUCTION_URL"] : [])]) {
      if (env[key]) values.push("https://" + env[key]);
    }
  }
  return [...new Set(values.flatMap((value) => {
    if (!value) return [];
    try {
      const url = new URL(value);
      if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return [];
      if (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && url.protocol === "http:")) return [];
      return [url.origin];
    } catch { return []; }
  }))];
}
