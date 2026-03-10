export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  if (initial) {
    try {
      const url = new URL(path, 'https://butikbiz.com');
      const redirectPath = url.searchParams.get('_path');
      if (redirectPath) {
        const decoded = decodeURIComponent(redirectPath);
        console.log("Redirect path detected from _path param:", decoded);
        return decoded;
      }
    } catch (e) {
      console.log("Error parsing path:", e);
    }

    if (path.startsWith("/store/") || path.startsWith("/product/")) {
      console.log("Deep link detected, allowing path:", path);
      return path;
    }

    if (path.includes("_path=")) {
      try {
        const paramStart = path.indexOf('_path=');
        const encodedPath = path.substring(paramStart + 6).split('&')[0];
        const decoded = decodeURIComponent(encodedPath);
        console.log("Redirect path from query string:", decoded);
        return decoded;
      } catch (e) {
        console.log("Error parsing _path param:", e);
      }
    }

    return "/";
  }
  return path;
}
