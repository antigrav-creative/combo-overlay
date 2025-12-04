# Twitch Combo Overlay

A browser-based overlay for Twitch streams that tracks and displays combo redemptions (bit cheers). Built with Next.js for use with OBS Browser Source.

## Features

- **User Horses Mode** - Each user gets their own persistent horse that grows with each redemption
- **Falling Hearts Mode** - Hearts fall from top to bottom and disappear
- **Falling Horseluls** - Physics-based falling emotes that pile up on screen (alternative mode)
- **Hearts Counter** - Displays a running total of heart combo redemptions
- **7TV Emote Support** - Customizable emotes via 7TV emote IDs
- **User Tracking** - Tracks who sent each combo and displays leaderboards
- **Auto-Expiration** - Horses expire after 1 hour of inactivity, hearts expire after 12 hours
- **Explosion Animation** - Horses explode with a puff effect when they expire
- **Persistent Storage** - Data persists in localStorage across page refreshes
- **Configurable Position** - Choose which corner to display stats
- **Adjustable Size** - Scale the falling emotes up or down
- **Dev Mode** - Test functionality without real bit cheers

## Expiration System

### Horselul (Horses)
- Each user's horse has a **1 hour** expiry timer
- Timer resets every time that user cheers a horselul
- If 1 hour passes with no activity from that user:
  - Horse explodes with a puff animation
  - User's count is removed from the total
  - User is removed from the leaderboard
- If the user cheers again after expiry, they get a brand new horse at a random position starting at base size

### Hearts
- Each heart has a **12 hour** expiry timer
- Hearts are removed from the count automatically when they expire
- No animation for heart expiry (they just disappear from the count)

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
4. Adjust size and position options
5. Toggle display options for totals and user leaderboards
6. Copy the generated overlay URL

### 4. Add to OBS

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
- Horse grows larger with each horselul redemption
- Jump animation when user redeems
- Expires after 1 hour of inactivity with explosion animation

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
- Manually expire horses to preview the explosion animation
- Clear all data instantly

## Data Persistence

Data is stored in localStorage with the key `combo-overlay-v3-{channel}`:
- Persists across page refreshes
- Cleared when OBS closes the browser source
- Can be manually cleared via dev mode

## Deployment

### Vercel (Recommended)

```bash
npx vercel
```

The overlay works on any static hosting since it uses client-side Twitch IRC connection (no server required).

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
