import { NextResponse } from "next/server";

const TOKEN_URL = "https://streaming.assemblyai.com/v3/token";

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "ASSEMBLYAI_API_KEY is not configured." }, { status: 500 });
  }

  const url = new URL(TOKEN_URL);
  url.searchParams.set("expires_in_seconds", "60");
  url.searchParams.set("max_session_duration_seconds", "120");

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to create AssemblyAI streaming token." }, { status: response.status });
    }

    const data = (await response.json()) as { token?: string; expires_in_seconds?: number };

    if (!data.token) {
      return NextResponse.json({ error: "AssemblyAI token response did not include a token." }, { status: 502 });
    }

    return NextResponse.json({
      token: data.token,
      expires_in_seconds: data.expires_in_seconds,
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach AssemblyAI token service." }, { status: 502 });
  }
}
