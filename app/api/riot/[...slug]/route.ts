import { NextRequest, NextResponse } from "next/server";

// Riot API proxy. Tarayıcı doğrudan Riot'a istek atamaz (CORS yok) ve API key'i
// istemciye sızdırmak istemeyiz. Bu route, sunucu tarafında X-Riot-Token header'ı
// ekleyerek isteği iletir.
//
// Çağrı formatı:  /api/riot/<host>/<gerçek-riot-path>?<query>
//   host = "europe" | "americas" | "asia"  (account-v1, match-v5 için bölge kümesi)
//        | "euw1" | "na1" | "tr1" | ...     (summoner-v4 için platform)
//
// Örn: /api/riot/europe/riot/account/v1/accounts/by-riot-id/Faker/KR1

const ALLOWED_HOSTS = new Set([
  // regional routing
  "europe",
  "americas",
  "asia",
  "sea",
  // platform routing
  "euw1",
  "eun1",
  "tr1",
  "ru",
  "na1",
  "br1",
  "la1",
  "la2",
  "oc1",
  "kr",
  "jp1",
]);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string[] }> }
) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RIOT_API_KEY tanımlı değil. .env.local dosyasını kontrol et." },
      { status: 500 }
    );
  }

  const { slug } = await ctx.params;
  const [host, ...rest] = slug;

  if (!host || !ALLOWED_HOSTS.has(host)) {
    return NextResponse.json(
      { error: `Geçersiz host: ${host}` },
      { status: 400 }
    );
  }

  const path = rest.join("/");
  const search = req.nextUrl.search; // ?queue=440&count=20 ...
  const target = `https://${host}.api.riotgames.com/${path}${search}`;

  const upstream = await fetch(target, {
    headers: { "X-Riot-Token": apiKey },
    // Riot verileri sık değişmez; kısa süreli edge cache faydalı olabilir ama
    // istemci tarafında React Query zaten cacheliyor.
    cache: "no-store",
  });

  const body = await upstream.text();

  // Hata gövdelerini de aynen geçirelim ki istemci anlamlı mesaj gösterebilsin.
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
