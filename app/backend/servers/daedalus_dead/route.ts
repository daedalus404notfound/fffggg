import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  Referer: "https://yflix.to/",
  Accept: "application/json",
};

const ENC_DEC_API = "https://enc-dec.app/api";
const YFLIX_AJAX = "https://yflix.to/ajax";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("a");
    const media_type = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const imdbId = req.nextUrl.searchParams.get("e");
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!id || !media_type || !ts || !token) {
      return NextResponse.json(
        { success: false, error: "need token" },
        { status: 404 },
      );
    }

    // ⏱ expire after 8 seconds
    if (Date.now() - Number(ts) > 8000) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }
    if (!validateBackendToken(id, f_token, ts, token)) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 403 },
      );
    }

    // block direct /api access
    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // ── Step 1: resolve content_id via search ─────────────────────────────────
    // Pass "yid" to skip search entirely if you already have the content_id.
    // Otherwise we search by title (param "f") and optionally filter by year (param "g").
    let contentId = req.nextUrl.searchParams.get("yid");

    if (!contentId) {
      const title = req.nextUrl.searchParams.get("f");
      const year = req.nextUrl.searchParams.get("g"); // optional, e.g. "2024"

      if (!title) {
        return NextResponse.json(
          {
            success: false,
            error: "title param 'f' required to resolve content",
          },
          { status: 400 },
        );
      }

      // 1a. Search yflix for the title
      const keyword = encodeURIComponent(title);
      let searchHtml: string;
      try {
        const searchResp = await fetchWithTimeout(
          `${YFLIX_AJAX}/film/search?keyword=${keyword}`,
          { headers: HEADERS, cache: "no-store" },
          8000,
        );
        if (!searchResp.ok) {
          return NextResponse.json(
            { success: false, error: `search failed ${searchResp.status}` },
            { status: 502 },
          );
        }
        const searchJson = await searchResp.json();
        searchHtml = searchJson?.result?.html ?? "";
      } catch {
        return NextResponse.json(
          { success: false, error: "Timed out during search" },
          { status: 504 },
        );
      }

      // 1b. Parse all results: extract href, title, year from the HTML
      // Each item: <a class="item" href="/watch/SLUG"> ... <div class="title">TITLE</div> ... <span>YEAR</span>
      const itemRegex =
        /<a[^>]+class="item"[^>]+href="(\/watch\/[^"]+)"[^>]*>[\s\S]*?<div class="title">([\s\S]*?)<\/div>[\s\S]*?<span>([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>/g;

      let slug: string | null = null;
      let match: RegExpExecArray | null;
      const normalise = (s: string) =>
        s
          .toLowerCase()
          .replace(/<[^>]+>/g, "")
          .trim();

      while ((match = itemRegex.exec(searchHtml)) !== null) {
        const href = match[1]; // /watch/the-wild-robot.rx65q
        const resultTitle = normalise(match[2]);
        const resultYear = normalise(match[4]); // span[1]=type, span[2]=year

        const titleMatch = resultTitle === normalise(title);
        const yearMatch = !year || resultYear === year.trim();

        if (titleMatch && yearMatch) {
          slug = href.replace("/watch/", "");
          break;
        }
      }

      // Fallback: if strict match fails, take the first result
      if (!slug) {
        const firstHref = searchHtml.match(/href="(\/watch\/[^"]+)"/);
        if (!firstHref) {
          return NextResponse.json(
            { success: false, error: "No results found on yflix" },
            { status: 404 },
          );
        }
        slug = firstHref[1].replace("/watch/", "");
      }

      // 1c. Fetch the watch page and scrape content_id from data-id
      let watchHtml: string;
      try {
        const watchResp = await fetchWithTimeout(
          `https://yflix.to/watch/${slug}`,
          { headers: HEADERS, cache: "no-store" },
          12000,
        );
        if (!watchResp.ok) {
          return NextResponse.json(
            { success: false, error: `watch page ${watchResp.status}` },
            { status: 502 },
          );
        }
        watchHtml = await watchResp.text();
      } catch {
        return NextResponse.json(
          { success: false, error: "Timed out fetching watch page" },
          { status: 504 },
        );
      }

      const idMatch = watchHtml.match(
        /<div[^>]*id="movie-rating"[^>]*data-id="([^"]+)"/,
      );
      if (!idMatch) {
        return NextResponse.json(
          { success: false, error: "Could not extract content id" },
          { status: 502 },
        );
      }
      contentId = idMatch[1];
    }

    // ── Step 2: encrypt content_id ────────────────────────────────────────────
    let encId: string;
    try {
      const encResp = await fetchWithTimeout(
        `${ENC_DEC_API}/enc-movies-flix?text=${encodeURIComponent(contentId)}`,
        { headers: HEADERS, cache: "no-store" },
        8000,
      );
      const encJson = await encResp.json();
      encId = encJson.result;
    } catch {
      return NextResponse.json(
        { success: false, error: "Encryption step failed" },
        { status: 502 },
      );
    }

    // ── Step 3: fetch episodes list (TV) or go straight to servers (movie) ────
    let lid: string;
    let subtitlesRaw: string | null = null;

    if (media_type === "tv") {
      if (!season || !episode) {
        return NextResponse.json(
          { success: false, error: "season and episode required for tv" },
          { status: 400 },
        );
      }

      // episodes list
      let eid: string;
      try {
        const epResp = await fetchWithTimeout(
          `${YFLIX_AJAX}/episodes/list?id=${contentId}&_=${encodeURIComponent(encId)}`,
          { headers: HEADERS, cache: "no-store" },
          8000,
        );
        const epJson = await epResp.json();

        const parseResp = await fetchWithTimeout(
          `${ENC_DEC_API}/parse-html`,
          {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/json" },
            body: JSON.stringify({ text: epJson.result }),
            cache: "no-store",
          },
          8000,
        );
        const episodes = (await parseResp.json()).result;
        eid = episodes[season][episode].eid;
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to fetch episodes" },
          { status: 502 },
        );
      }

      // encrypt eid → servers list
      let servers: Record<string, Record<string, { lid: string }>>;
      try {
        const encEidResp = await fetchWithTimeout(
          `${ENC_DEC_API}/enc-movies-flix?text=${encodeURIComponent(eid)}`,
          { headers: HEADERS, cache: "no-store" },
          8000,
        );
        const encEid = (await encEidResp.json()).result;

        const srvResp = await fetchWithTimeout(
          `${YFLIX_AJAX}/links/list?eid=${eid}&_=${encodeURIComponent(encEid)}`,
          { headers: HEADERS, cache: "no-store" },
          8000,
        );
        const srvJson = await srvResp.json();

        const srvParseResp = await fetchWithTimeout(
          `${ENC_DEC_API}/parse-html`,
          {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/json" },
            body: JSON.stringify({ text: srvJson.result }),
            cache: "no-store",
          },
          8000,
        );
        servers = (await srvParseResp.json()).result;
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to fetch servers" },
          { status: 502 },
        );
      }

      // pick server: prefer "default" → "1", fallback to first available
      const serverType = servers["default"]
        ? "default"
        : Object.keys(servers)[0];
      const serverId = servers[serverType]["1"]
        ? "1"
        : Object.keys(servers[serverType])[0];
      lid = servers[serverType][serverId].lid;
    } else {
      // ── Movie: content_id is also the single "eid" on yflix ─────────────────
      let servers: Record<string, Record<string, { lid: string }>>;
      try {
        const srvResp = await fetchWithTimeout(
          `${YFLIX_AJAX}/links/list?eid=${contentId}&_=${encodeURIComponent(encId)}`,
          { headers: HEADERS, cache: "no-store" },
          8000,
        );
        const srvJson = await srvResp.json();

        const srvParseResp = await fetchWithTimeout(
          `${ENC_DEC_API}/parse-html`,
          {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/json" },
            body: JSON.stringify({ text: srvJson.result }),
            cache: "no-store",
          },
          8000,
        );
        servers = (await srvParseResp.json()).result;
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to fetch movie servers" },
          { status: 502 },
        );
      }

      const serverType = servers["default"]
        ? "default"
        : Object.keys(servers)[0];
      const serverId = servers[serverType]["1"]
        ? "1"
        : Object.keys(servers[serverType])[0];
      lid = servers[serverType][serverId].lid;
    }

    // ── Step 4: encrypt lid → embed data → decrypt ────────────────────────────
    let decrypted: any;
    try {
      const encLidResp = await fetchWithTimeout(
        `${ENC_DEC_API}/enc-movies-flix?text=${encodeURIComponent(lid)}`,
        { headers: HEADERS, cache: "no-store" },
        8000,
      );
      const encLid = (await encLidResp.json()).result;

      const embedResp = await fetchWithTimeout(
        `${YFLIX_AJAX}/links/view?id=${lid}&_=${encodeURIComponent(encLid)}`,
        { headers: HEADERS, cache: "no-store" },
        8000,
      );
      const embedJson = await embedResp.json();
      const encrypted: string = embedJson.result;

      // subtitles come as a urlencoded sub.list param embedded in the encrypted blob
      subtitlesRaw = encrypted;

      const decResp = await fetchWithTimeout(
        `${ENC_DEC_API}/dec-movies-flix`,
        {
          method: "POST",
          headers: { ...HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({ text: encrypted }),
          cache: "no-store",
        },
        8000,
      );
      decrypted = (await decResp.json()).result;
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to decrypt embed" },
        { status: 502 },
      );
    }

    // ── Step 5: parse the decrypted HLS url ───────────────────────────────────
    // dec-movies-flix returns .result as an object, string, or nested JSON string
    let hlsUrl: string;
    const extractUrl = (val: any): string | null => {
      if (!val) return null;
      if (typeof val === "string") {
        if (val.startsWith("http")) return val;
        try {
          return extractUrl(JSON.parse(val));
        } catch {
          return null;
        }
      }
      if (typeof val === "object") {
        return val.url ?? val.link ?? val.stream ?? val.file ?? null;
      }
      return null;
    };
    const resolved = extractUrl(decrypted);
    if (!resolved) {
      console.error("[daedalus] decrypted value:", JSON.stringify(decrypted));
    }
    hlsUrl = resolved ?? "";

    if (!hlsUrl || !hlsUrl.startsWith("http")) {
      return NextResponse.json(
        { success: false, error: "Could not resolve stream URL" },
        { status: 502 },
      );
    }

    // ── Step 6: extract subtitles from the raw encrypted payload ─────────────
    // yflix encodes subtitle list as a urlencoded `sub.list` query parameter
    // inside the encrypted blob string before decryption.
    const subtitles: { label: string; url: string; default?: boolean }[] = [];
    if (subtitlesRaw) {
      try {
        const subMatch = subtitlesRaw.match(/sub\.list=([^&"]+)/);
        if (subMatch) {
          const subUrl = decodeURIComponent(subMatch[1]);
          const subResp = await fetchWithTimeout(
            subUrl,
            { headers: HEADERS, cache: "no-store" },
            6000,
          );
          if (subResp.ok) {
            const subJson = await subResp.json();
            // subJson is typically [{ label, file }]
            if (Array.isArray(subJson)) {
              for (const s of subJson) {
                subtitles.push({
                  label: s.label ?? s.language ?? "Unknown",
                  url: s.file ?? s.url,
                  default: s.default ?? false,
                });
              }
            }
          }
        }
      } catch {
        // subtitles are non-critical, continue without them
      }
    }

    return NextResponse.json({
      success: true,
      links: [
        {
          type: "hls",
          link: hlsUrl,
        },
      ],
      subtitles,
    });
  } catch (err) {
    console.error("[daedalus] unhandled:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
