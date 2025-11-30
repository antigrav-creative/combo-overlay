# Twitch Combo Overlay

A browser-based overlay for Twitch streams that tracks and displays combo redemptions (bit cheers). Built with Next.js for use with OBS Browser Source.

## Features

- **Hearts Counter** - Displays a running total of heart combo redemptions in the bottom left
- **Falling Horseluls** - Physics-based falling emotes that pile up on screen when horselul combos are redeemed
- **7TV Emote Support** - Customizable emotes via 7TV emote IDs
- **User Tracking** - Tracks who sent each combo and displays leaderboards
- **Persistent Storage** - Data persists in localStorage across page refreshes
- **Dev Mode** - Test functionality without real bit cheers

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

### 3. Configure Your Overlay

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Enter your Twitch channel name
3. Customize emote IDs (optional) - uses 7TV emote IDs
4. Toggle display options for totals and user leaderboards
5. Copy the generated overlay URL

### 4. Add to OBS

1. Add a **Browser Source** in OBS
2. Paste the overlay URL (e.g., `http://localhost:3000/yourchannel?showTotals=true`)
3. Set dimensions to match your stream (e.g., 1920x1080)
4. The transparent background will integrate seamlessly with your stream

## URL Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `emoteId` | 7TV emote ID for falling objects (horselul) | `01FDTEQJJR000CM9KGHJPMM7N6` |
| `heartEmoteId` | 7TV emote ID for heart counter icon | `01HNK8DGF0000FG935RNS75APG` |
| `showTotals` | Show total combo counts | `false` |
| `showUsers` | Show user leaderboard | `false` |
| `dev` | Enable dev mode with test controls | `false` |

## Combo Detection

The overlay detects Twitch combo redemptions via IRC USERNOTICE messages with:
- `msg-id=onetapgiftredeemed`
- `msg-param-gift-id=heart` or `msg-param-gift-id=horselul`

### Dev Mode Testing

With `?dev=true` in the URL:
- Use the on-screen controls to simulate combos
- Type `#heart` or `#horselul` in chat to trigger test events
- Test with raw IRC message format via the "Test Raw IRC" buttons

## Tech Stack

- **Next.js 15** - React framework
- **tmi.js** - Twitch IRC client
- **matter-js** - 2D physics engine
- **7TV CDN** - Animated emote hosting
- **Tailwind CSS** - Styling

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
