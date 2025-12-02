// Twitch API helpers for EventSub

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID!;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!;

interface AppAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
}

// Cache for app access token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get an app access token for server-to-server Twitch API calls
 */
export async function getAppAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get app access token: ${response.status}`);
  }

  const data: AppAccessToken = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

/**
 * Get user ID from username
 */
export async function getUserId(username: string): Promise<string | null> {
  const token = await getAppAccessToken();

  const response = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": TWITCH_CLIENT_ID,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.status}`);
  }

  const data = await response.json();
  const users: TwitchUser[] = data.data;

  return users.length > 0 ? users[0].id : null;
}

/**
 * Subscribe to stream.online EventSub
 */
export async function subscribeToStreamOnline(
  broadcasterId: string,
  callbackUrl: string
): Promise<boolean> {
  const token = await getAppAccessToken();
  const secret = process.env.TWITCH_EVENTSUB_SECRET!;

  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": TWITCH_CLIENT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "stream.online",
        version: "1",
        condition: {
          broadcaster_user_id: broadcasterId,
        },
        transport: {
          method: "webhook",
          callback: callbackUrl,
          secret: secret,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to subscribe to EventSub:", error);
    return false;
  }

  return true;
}

/**
 * Verify Twitch EventSub signature
 */
export function verifyEventSubSignature(
  messageId: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const secret = process.env.TWITCH_EVENTSUB_SECRET!;

  const message = messageId + timestamp + body;
  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(message).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Get existing EventSub subscriptions
 */
export async function getSubscriptions(): Promise<
  Array<{ id: string; type: string; condition: Record<string, string> }>
> {
  const token = await getAppAccessToken();

  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": TWITCH_CLIENT_ID,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get subscriptions: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete an EventSub subscription
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const token = await getAppAccessToken();

  await fetch(
    `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": TWITCH_CLIENT_ID,
      },
    }
  );
}

