# Twitch Combo Overlay

A browser-based overlay for Twitch streams that tracks and displays combo redemptions (bit cheers). Built with Next.js for use with OBS Browser Source.

## Features

- **User Horses Mode** - Each user gets their own persistent horse that grows with each redemption
- **Falling Hearts Mode** - Hearts fall from top to bottom and disappear
- **Falling Horseluls** - Physics-based falling emotes that pile up on screen (alternative mode)
- **Hearts Counter** - Displays a running total of heart combo redemptions
- **7TV Emote Support** - Customizable emotes via 7TV emote IDs
- **User Tracking** - Tracks who sent each combo and displays leaderboards
- **Persistent Storage** - Data persists in localStorage across page refreshes
- **Auto-Clear on Stream Start** - Clears data when stream goes live (via Twitch EventSub)
- **Configurable Position** - Choose which corner to display stats
- **Adjustable Size** - Scale the falling emotes up or down
- **Dev Mode** - Test functionality without real bit cheers

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment (Optional - for EventSub)

Create a `.env.local` file for auto-clear on stream start:

```env
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_EVENTSUB_SECRET=any_random_string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get credentials from [Twitch Developer Console](https://dev.twitch.tv/console/apps).

> **Note:** EventSub requires a public HTTPS URL. It won't work on localhost but the overlay functions normally without it.

### 3. Run Development Server

```bash
pnpm dev
```

### 4. Configure Your Overlay

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Enter your Twitch channel name
3. Customize emote IDs (optional) - uses 7TV emote IDs
4. Adjust size and position options
5. Toggle display options for totals and user leaderboards
6. Copy the generated overlay URL

### 5. Add to OBS

1. Add a **Browser Source** in OBS
2. Paste the overlay URL (e.g., `http://localhost:3000/yourchannel?showTotals=true`)
3. Set dimensions to match your stream (e.g., 1920x1080)
4. The transparent background will integrate seamlessly with your stream

## URL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `emoteId` | 7TV emote ID for horselul emotes | `01FDTEQJJR000CM9KGHJPMM7N6` |
| `heartEmoteId` | 7TV emote ID for heart emotes | `01HNK8DGF0000FG935RNS75APG` |
| `userHorses` | User horses mode (each user gets a growing horse) | `true` |
| `fallingHearts` | Falling hearts mode (hearts fall and disappear) | `true` |
| `showTotals` | Show total combo counts | `false` |
| `showUsers` | Show user leaderboard | `false` |
| `size` | Emote size: 1 (smallest) to 5 (largest) | `3` |
| `corner` | Stats position: `bl`, `tl`, `br`, `tr` | `bl` (bottom-left) |
| `dev` | Enable dev mode with test controls | `false` |

### Combo Modes

**User Horses (`userHorses=true`):**
- Each user gets their own horse positioned randomly in the bottom half
- Horse displays user's Twitch color and username
- Horse grows larger with each horselul redemption (no cap)
- Jump animation when user redeems

**Falling Hearts (`fallingHearts=true`):**
- Hearts spawn at top of screen when redeemed
- Fall to bottom and disappear
- Colored based on user's Twitch color
- Random sizes within the configured range

**Classic Mode (`userHorses=false`):**
- Horseluls fall and pile up using physics
- Similar behavior to falling hearts but they stay on screen

### Corner Options

- `bl` - Bottom Left
- `tl` - Top Left
- `br` - Bottom Right
- `tr` - Top Right

### Size Scale

| Value | Multiplier |
|-------|------------|
| 1 | 0.5x (smallest) |
| 2 | 0.75x |
| 3 | 1x (default) |
| 4 | 1.5x |
| 5 | 2x (largest) |

## Combo Detection

The overlay detects Twitch combo redemptions via IRC USERNOTICE messages with:
- `msg-id=onetapgiftredeemed`
- `msg-param-gift-id=heart` or `msg-param-gift-id=horselul`

### Dev Mode Testing

With `?dev=true` in the URL:
- Use the on-screen controls to simulate combos
- Type `#heart` or `#horselul` in chat to trigger test events
- Test with raw IRC message format via the "Test Raw IRC" buttons

## EventSub (Auto-Clear)

When deployed to a public HTTPS URL, the overlay automatically clears all data when the stream goes live. This uses Twitch EventSub webhooks.

### How it works:

1. Overlay subscribes to `stream.online` events for the channel
2. Twitch sends a webhook when the stream starts
3. Server broadcasts to connected overlays via Server-Sent Events
4. Overlays clear their data

### Requirements:

- Public HTTPS URL (Vercel, Railway, etc.)
- Twitch Developer App credentials in `.env.local`
- Update `NEXT_PUBLIC_APP_URL` to your production URL

> **Local Development:** EventSub is automatically skipped on localhost. Use the "Clear All Data" button in dev mode instead.

## Deployment

### Vercel (Recommended)

```bash
npx vercel
```

After deploying:
1. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables to your production URL
2. Add your Twitch credentials to Vercel environment variables

## Tech Stack

- **Next.js 15** - React framework
- **tmi.js** - Twitch IRC client
- **matter-js** - 2D physics engine
- **7TV CDN** - Animated emote hosting
- **Tailwind CSS** - Styling
- **Twitch EventSub** - Stream status webhooks

## Development

```bash
# Run dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## License

MIT
