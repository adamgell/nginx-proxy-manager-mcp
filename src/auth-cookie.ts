// NPMplus >= 2.15 no longer returns the JWT in the /tokens body: it is only set
// as the signed httpOnly cookie `__Host-Http-token`, and the API ignores the
// Authorization header. Extract that cookie so it can be replayed as-is.
export function extractTokenCookie(setCookie: string | string[] | undefined): string | null {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const c of cookies) {
    const pair = c.split(';')[0].trim();
    if (pair.startsWith('__Host-Http-token=')) return pair;
  }
  return null;
}
