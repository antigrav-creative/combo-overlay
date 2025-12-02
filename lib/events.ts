// Server-Sent Events management for real-time updates

export interface StreamOnlineEvent {
  type: "stream_online";
  channel: string;
  timestamp: number;
}

// Store connected clients by channel
const clients = new Map<string, Set<ReadableStreamDefaultController>>();

// Store recent events for new connections
const recentEvents = new Map<string, StreamOnlineEvent>();

/**
 * Add a client connection for a specific channel
 */
export function addClient(
  channel: string,
  controller: ReadableStreamDefaultController
): void {
  const normalizedChannel = channel.toLowerCase();

  if (!clients.has(normalizedChannel)) {
    clients.set(normalizedChannel, new Set());
  }

  clients.get(normalizedChannel)!.add(controller);
  console.log(
    `[SSE] Client connected to ${normalizedChannel}. Total: ${clients.get(normalizedChannel)!.size}`
  );
}

/**
 * Remove a client connection
 */
export function removeClient(
  channel: string,
  controller: ReadableStreamDefaultController
): void {
  const normalizedChannel = channel.toLowerCase();
  const channelClients = clients.get(normalizedChannel);

  if (channelClients) {
    channelClients.delete(controller);
    console.log(
      `[SSE] Client disconnected from ${normalizedChannel}. Total: ${channelClients.size}`
    );

    if (channelClients.size === 0) {
      clients.delete(normalizedChannel);
    }
  }
}

/**
 * Broadcast stream online event to all connected clients for a channel
 */
export function addStreamOnlineEvent(channel: string): void {
  const normalizedChannel = channel.toLowerCase();
  const event: StreamOnlineEvent = {
    type: "stream_online",
    channel: normalizedChannel,
    timestamp: Date.now(),
  };

  // Store as recent event
  recentEvents.set(normalizedChannel, event);

  // Broadcast to connected clients
  const channelClients = clients.get(normalizedChannel);
  if (channelClients) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();

    for (const controller of channelClients) {
      try {
        controller.enqueue(encoder.encode(data));
      } catch (error) {
        console.error("[SSE] Error sending to client:", error);
        channelClients.delete(controller);
      }
    }

    console.log(
      `[SSE] Broadcasted stream_online to ${channelClients.size} clients for ${normalizedChannel}`
    );
  }
}

/**
 * Get recent event for a channel (for new connections)
 */
export function getRecentEvent(channel: string): StreamOnlineEvent | undefined {
  return recentEvents.get(channel.toLowerCase());
}

/**
 * Get count of connected clients for a channel
 */
export function getClientCount(channel: string): number {
  return clients.get(channel.toLowerCase())?.size ?? 0;
}

