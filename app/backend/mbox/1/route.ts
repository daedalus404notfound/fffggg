import { NextRequest, NextResponse } from "next/server";

function getRandomAfricanIP() {
  const ranges: [number, number][] = [
    [41, 57],
    [41, 60],
    [41, 72],
    [41, 73],
    [102, 0],
    [102, 22],
    [105, 16],
    [105, 48],
    [197, 136],
    [45, 96],
  ];
  const base = ranges[Math.floor(Math.random() * ranges.length)];
  const rand = () => Math.floor(Math.random() * 254) + 1;
  return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
}

function fetchWithTimeout(
  url: string,
  options: { method: string; headers: Record<string, string>; body?: string },
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const perPage = Number(req.nextUrl.searchParams.get("perPage") ?? 28);
  const channelId = Number(req.nextUrl.searchParams.get("channelId") ?? 1);

  const randomIP = getRandomAfricanIP();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
    "Accept-Language": "en-US,en;q=0.5",
    Accept: "application/json",
    "User-Agent": "okhttp/4.12.0",
    "X-Forwarded-For": randomIP,
    "CF-Connecting-IP": randomIP,
    "X-Real-IP": randomIP,
    Referer: `https://fmoviesunblocked.net/spa/videoPlayPage`,
    Origin: "https://fmoviesunblocked.net",
  };

  try {
    const filterRes = await fetchWithTimeout(
      "https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/filter",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ page, perPage, channelId }),
      },
      8000,
    );

    const filterJson = await filterRes.json();
    const data = filterJson?.data ?? filterJson;
    const items = data?.items ?? [];

    const mappedItems = items.map((item: any) => {
      const mediaType = item?.subjectType === 1 ? "movie" : "tv";
      return {
        title: item?.title ?? null,
        releaseDate: item?.releaseDate ?? null,
        mediaType,
        dubs: item?.dubs ?? [],
        detailPath: item?.detailPath ?? null,
        subjectId: item?.subjectId,
        duration: item?.duration,
        genre: item?.genre,
      };
    });

    return NextResponse.json({
      success: true,
      pager: data?.pager ?? null,
      items: mappedItems,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { success: false, error: "Request timed out" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { success: false, error: err?.message },
      { status: 500 },
    );
  }
}
