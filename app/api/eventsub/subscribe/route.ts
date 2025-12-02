import { NextRequest, NextResponse } from "next/server";
import {
  getUserId,
  subscribeToStreamOnline,
  getSubscriptions,
  deleteSubscription,
} from "@/lib/twitch";

export async function POST(request: NextRequest) {
  try {
    const { channel } = await request.json();

    if (!channel) {
      return NextResponse.json(
        { error: "Channel is required" },
        { status: 400 }
      );
    }

    // Skip EventSub on localhost - Twitch can't reach local servers
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (appUrl.includes("localhost") || appUrl.includes("127.0.0.1")) {
      console.log("[EventSub] Skipping subscription - localhost not supported by Twitch");
      return NextResponse.json({
        success: true,
        message: "Skipped - EventSub requires a public HTTPS URL",
        skipped: true,
      });
    }

    // Get broadcaster user ID
    const userId = await getUserId(channel);
    if (!userId) {
      return NextResponse.json(
        { error: "Channel not found" },
        { status: 404 }
      );
    }

    // Check if we already have a subscription for this channel
    const existingSubs = await getSubscriptions();
    const existingSub = existingSubs.find(
      (sub) =>
        sub.type === "stream.online" &&
        sub.condition.broadcaster_user_id === userId
    );

    if (existingSub) {
      return NextResponse.json({
        success: true,
        message: "Already subscribed",
        subscriptionId: existingSub.id,
      });
    }

    // Create callback URL
    const callbackUrl = `${appUrl}/api/eventsub`;

    // Subscribe to stream.online
    const success = await subscribeToStreamOnline(userId, callbackUrl);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to subscribe to EventSub" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Subscribed to stream.online",
      channel,
      userId,
    });
  } catch (error) {
    console.error("[Subscribe] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get current subscriptions
export async function GET() {
  try {
    const subscriptions = await getSubscriptions();
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("[Subscribe] Error getting subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to get subscriptions" },
      { status: 500 }
    );
  }
}

// Delete a subscription
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("id");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    await deleteSubscription(subscriptionId);

    return NextResponse.json({
      success: true,
      message: "Subscription deleted",
    });
  } catch (error) {
    console.error("[Subscribe] Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}

