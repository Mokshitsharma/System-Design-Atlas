import { buildSearchIndex } from "@/lib/search";

/** Built once at build time and served as a static file; fetched only when search is opened. */
export async function GET() {
  return Response.json(buildSearchIndex(), {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" },
  });
}
