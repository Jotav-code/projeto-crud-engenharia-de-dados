import { NextRequest, NextResponse } from "next/server";

const API_UPSTREAM_URL =
  process.env.API_UPSTREAM_URL ??
  "https://projeto-crud-engenharia-de-dados.onrender.com";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const upstreamBaseUrl = API_UPSTREAM_URL.endsWith("/")
    ? API_UPSTREAM_URL
    : `${API_UPSTREAM_URL}/`;
  const upstreamUrl = new URL(path.join("/"), upstreamBaseUrl);
  upstreamUrl.search = request.nextUrl.search;

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 15000);

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
      signal: abortController.signal,
    });
  } catch {
    return NextResponse.json(
      {
        erro: `A API externa não respondeu em tempo hábil: ${upstreamUrl.toString()}`,
      },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }

  if (upstreamResponse.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const contentType =
    upstreamResponse.headers.get("content-type") ?? "application/json";
  const body = await upstreamResponse.text();

  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": contentType,
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context);
}
