import { NextResponse } from "next/server";

const demoEmail = "demo@flowbase.app";

type ClerkUserList = Array<{ id: string }>;

async function clerkRequest<T>(path: string, init?: RequestInit) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not configured.");
  }

  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Clerk API request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export async function POST() {
  try {
    const users = await clerkRequest<ClerkUserList>(
      `/users?email_address=${encodeURIComponent(demoEmail)}`,
    );
    const demoUser = users[0];

    if (!demoUser) {
      return NextResponse.json({ error: "Demo user was not found in Clerk." }, { status: 404 });
    }

    const signInToken = await clerkRequest<{ token: string }>("/sign_in_tokens", {
      method: "POST",
      body: JSON.stringify({
        user_id: demoUser.id,
        expires_in_seconds: 120,
      }),
    });

    return NextResponse.json({ token: signInToken.token });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start demo login." },
      { status: 500 },
    );
  }
}
