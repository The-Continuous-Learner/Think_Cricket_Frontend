import { request as nodeRequest } from "http"
import { type NextRequest, NextResponse } from "next/server"

const BACKEND_HOST = "localhost"
const BACKEND_PORT = 8080

function forward(
  method: string,
  path: string,
  body?: string,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = nodeRequest(
      {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
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
  if (request.method === "GET") {
    const obj = Object.fromEntries(request.nextUrl.searchParams.entries())
    if (Object.keys(obj).length > 0) body = JSON.stringify(obj)
  } else {
    const text = await request.text()
    body = text || undefined
  }

  let result: { status: number; text: string }
  try {
    result = await forward(request.method, path.join("/"), body)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new NextResponse(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new NextResponse(result.text || null, {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path)
}
