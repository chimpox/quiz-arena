# QuizArena

A real-time multiplayer quiz game built with Next.js, Pusher Channels, and Upstash Redis. Host quiz games and compete with friends in real-time.

## Features

- **Real-time multiplayer** - Players see updates instantly via Pusher Channels
- **Host controls** - One player hosts and controls the game flow
- **Health-based scoring** - Answer correctly to gain health, wrong answers cost health
- **Time-based points** - Faster answers earn more points
- **Customizable settings** - Adjust question count, time limits, and health values
- **Leaderboard** - Track standings throughout the game

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Real-time**: Pusher Channels
- **Database**: Upstash Redis
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel (serverless)

## Getting Started

### Prerequisites

You'll need accounts with:
1. **Pusher** (for real-time events) - [pusher.com](https://pusher.com)
2. **Upstash** (for Redis storage) - [upstash.com](https://upstash.com)

Both offer free tiers that work for this project.

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/QuizArena.git
cd QuizArena
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Pusher

1. Go to [pusher.com](https://pusher.com) and create an account
2. Create a new **Channels** app
3. In your app settings, note down:
   - App ID
   - Key
   - Secret
   - Cluster (e.g., `us2`, `eu`, `ap1`)

### 4. Set up Upstash Redis

1. Go to [upstash.com](https://upstash.com) and create an account
2. Create a new **Redis** database (free tier works)
3. In the database details, find the **REST API** section and note:
   - REST URL
   - REST Token

### 5. Configure environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Pusher
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
PUSHER_APP_ID=your_app_id
PUSHER_SECRET=your_secret

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Play

1. **Host a game**: Click "Host Game", configure settings, and share the game code
2. **Join a game**: Click "Join Game" and enter the code shared by the host
3. **Wait in lobby**: Players gather in the lobby until the host starts
4. **Answer questions**: Select answers before time runs out
5. **View results**: See who answered correctly and track the leaderboard
6. **Final standings**: Game ends with final scores and rankings

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add your environment variables in Vercel's project settings
4. Deploy

The app is designed to work with Vercel's serverless functions - no persistent server required.

## Project Structure

```
QuizArena/
├── app/
│   ├── api/
│   │   ├── game/
│   │   │   ├── create/route.ts    # Create new game
│   │   │   ├── join/route.ts      # Join existing game
│   │   │   └── [code]/
│   │   │       ├── route.ts       # Get game state
│   │   │       ├── start/route.ts # Start the game
│   │   │       ├── answer/route.ts# Submit answer
│   │   │       └── next/route.ts  # Next question
│   │   └── pusher/
│   │       └── auth/route.ts      # Pusher authentication
│   ├── host/page.tsx              # Host game page
│   ├── join/page.tsx              # Join game page
│   ├── lobby/[code]/page.tsx      # Game lobby
│   └── game/[code]/
│       ├── page.tsx               # Question view
│       ├── results/page.tsx       # After-question results
│       └── final/page.tsx         # Final leaderboard
├── hooks/
│   └── use-pusher.ts              # Pusher subscription hook
├── lib/
│   ├── pusher-server.ts           # Server-side Pusher
│   ├── pusher-client.ts           # Client-side Pusher
│   ├── redis.ts                   # Redis client
│   ├── game-service.ts            # Game logic
│   └── types.ts                   # TypeScript types
└── components/ui/                 # shadcn/ui components
```

## License

MIT
