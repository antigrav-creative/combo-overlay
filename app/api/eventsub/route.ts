import { NextRequest, NextResponse } from "next/server";
import { verifyEventSubSignature } from "@/lib/twitch";
import { addStreamOnlineEvent } from "@/lib/events";

// Twitch EventSub webhook handler
export async function POST(request: NextRequest) {
  const body = await request.text();

  // Get headers for verification
  const messageId = request.headers.get("Twitch-Eventsub-Message-Id");
  const timestamp = request.headers.get("Twitch-Eventsub-Message-Timestamp");
  const signature = request.headers.get("Twitch-Eventsub-Message-Signature");
  const messageType = request.headers.get("Twitch-Eventsub-Message-Type");

  if (!messageId || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  // Verify signature
  if (!verifyEventSubSignature(messageId, timestamp, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const payload = JSON.parse(body);

  // Handle webhook callback verification
  if (messageType === "webhook_callback_verification") {
    console.log("[EventSub] Verification challenge received");
    return new NextResponse(payload.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Handle revocation
  if (messageType === "revocation") {
    console.log("[EventSub] Subscription revoked:", payload.subscription);
    return NextResponse.json({ received: true });
  }

  // Handle notification
  if (messageType === "notification") {
    const eventType = payload.subscription.type;
    const event = payload.event;

    console.log(`[EventSub] Received ${eventType}:`, event);

    if (eventType === "stream.online") {
      const broadcasterLogin = event.broadcaster_user_login;
      console.log(`[EventSub] Stream online: ${broadcasterLogin}`);

      // Broadcast to connected SSE clients
      addStreamOnlineEvent(broadcasterLogin);
    }

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ error: "Unknown message type" }, { status: 400 });
}

