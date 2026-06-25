import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080"

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const url = new URL(`/${path.join("/")}`, BACKEND_URL)
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value))

  const headers = new Headers(request.headers)
  headers.delete("host")

  let body: string | undefined
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text() || undefined
  }

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: request.method,
      headers,
      body,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const text = await res.text()
  return new NextResponse(text || null, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, (await params).path)
}
