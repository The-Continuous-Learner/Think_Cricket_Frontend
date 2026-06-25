import { request as nodeRequest } from "http"
import { request as httpsRequest } from "https"
import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080"

function parseValue(v: string): unknown {
  if (v === "") return v
  const n = Number(v)
  return isNaN(n) ? v : n
}

function forward(
  method: string,
  path: string,
  body: string | undefined,
  backendUrl: string,
): Promise<{ status: number; text: string }> {
  const base = new URL(backendUrl)
  const isHttps = base.protocol === "https:"
  const port = base.port ? parseInt(base.port, 10) : isHttps ? 443 : 80

  return new Promise((resolve, reject) => {
    const req = (isHttps ? httpsRequest : nodeRequest)(
      {
        hostname: base.hostname,
        port,
        path: `/${path}`,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(body !== undefined ? { "Content-Length": Buffer.byteLength(body) } : {}),
        },
      },
      (res) => {
        let text = ""
        res.on("data", (chunk: Buffer) => { text += chunk.toString() })
        res.on("end", () => resolve({ status: res.statusCode ?? 500, text }))
      },
    )
    req.on("error", reject)
    if (body !== undefined) req.write(body)
    req.end()
  })
}

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  let body: string | undefined

  if (request.method === "GET" || request.method === "HEAD") {
    const params: Record<string, unknown> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      params[key] = parseValue(value)
    })
    if (Object.keys(params).length > 0) {
      body = JSON.stringify(params)
    }
  } else {
    const text = await request.text()
    body = text || undefined
  }

  let result: { status: number; text: string }
  try {
    result = await forward(request.method, path.join("/"), body, BACKEND_URL)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  return new NextResponse(result.text || null, {
    status: result.status,
    headers: { "Content-Type": "application/json" },
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
