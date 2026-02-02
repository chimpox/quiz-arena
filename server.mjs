import http from 'http'
import next from 'next'
import { Server } from 'socket.io'
import { randomUUID } from 'node:crypto'

function generateGameCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev })
const handle = app.getRequestHandler()

/**
 * In-memory server state.
 * This is "real multiplayer" across devices as long as everyone connects to THIS server process.
 * (Still ephemeral: restarting the server wipes games.)
 */
const games = new Map()

function lobbySnapshot(code) {
  const game = games.get(code)
  if (!game) return null
  return {
    type: 'lobby_state',
    code,
    status: game.status,
    settings: game.settings,
    questionsCount: game.questions.length,
    questions: game.status === 'playing' ? game.questions : undefined,
    currentQuestionIndex: game.status === 'playing' ? (game.currentQuestionIndex || 0) : undefined,
    players: game.players,
  }
}

function randomId(prefix) {
  return `${prefix}-${randomUUID()}`
}

await app.prepare()

const server = http.createServer((req, res) => {
  // Let Next.js handle all HTTP routes normally
  handle(req, res)
})

// Socket.io server
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket) => {
  // Initialize socket data
  socket.data.gameCode = null
  socket.data.role = null
  socket.data.playerId = null

  socket.emit('hello')

  socket.on('create_game', (data) => {
    const { settings, questions } = data

    if (!settings || !questions || !Array.isArray(questions) || questions.length === 0) {
      socket.emit('error', { message: 'Missing settings/questions' })
      return
    }

    const hostId = randomId('host')
    let code = generateGameCode()
    while (games.has(code)) code = generateGameCode()

    const game = {
      code,
      hostId,
      settings,
      questions,
      players: [],
      status: 'lobby',
    }
    games.set(code, game)

    socket.data.role = 'host'
    socket.data.gameCode = code
    socket.join(code) // Join socket.io room

    socket.emit('create_ok', { code, hostId })
    io.to(code).emit('lobby_state', lobbySnapshot(code))
  })

  socket.on('subscribe', (data) => {
    const { code, role, hostId, playerId } = data
    const game = games.get(code)
    if (!game) {
      socket.emit('error', { message: 'Game not found' })
      return
    }

    socket.data.gameCode = code
    socket.data.role = role || null
    socket.data.playerId = playerId || null
    socket.join(code) // Join socket.io room

    // basic host-auth check (demo-level)
    if (role === 'host' && hostId && hostId !== game.hostId) {
      socket.emit('error', { message: 'HostId mismatch' })
      return
    }

    console.log(`[SUBSCRIBE] ${role} subscribed to game ${code}. Game status: ${game.status}, Has questions: ${game.questions ? game.questions.length : 0}`)
    socket.emit('lobby_state', lobbySnapshot(code))
  })

  socket.on('join_game', (data) => {
    const { code, name, avatarStyle, avatarSeed, avatarColor } = data
    const game = games.get(code)
    if (!game || game.status !== 'lobby') {
      socket.emit('join_error', { message: 'Game not found or not joinable' })
      return
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      socket.emit('join_error', { message: 'Missing display name' })
      return
    }

    const playerId = randomId('player')
    const startingHealth = game.settings.startingHealth

    const player = {
      id: playerId,
      name: name.trim(),
      avatarStyle,
      avatarSeed,
      avatarColor,
      health: startingHealth,
      maxHealth: startingHealth, // baseline for UI; NOT a cap anymore
      points: 0,
      isReady: true,
      isEliminated: false,
    }

    game.players.push(player)

    socket.data.role = 'player'
    socket.data.gameCode = code
    socket.data.playerId = playerId
    socket.join(code) // Join socket.io room

    socket.emit('join_ok', { code, playerId })
    io.to(code).emit('lobby_state', lobbySnapshot(code))
  })

  socket.on('start_game', (data) => {
    const { code, hostId } = data
    const game = games.get(code)
    if (!game) {
      socket.emit('error', { message: 'Game not found' })
      return
    }
    if (hostId !== game.hostId) {
      socket.emit('error', { message: 'Not authorized to start' })
      return
    }
    game.status = 'playing'
    console.log(`[START_GAME] Game ${code} started. Sending ${game.questions.length} questions to ${game.players.length} players`)
    io.to(code).emit('game_started', { 
      code,
      game: {
        code: game.code,
        hostId: game.hostId,
        settings: game.settings,
        questions: game.questions,
        players: game.players,
        currentQuestionIndex: game.currentQuestionIndex || 0,
        status: game.status
      }
    })
    io.to(code).emit('lobby_state', lobbySnapshot(code))
  })

  socket.on('disconnect', () => {
    const code = socket.data.gameCode
    if (!code) return
    const game = games.get(code)
    if (!game) return
    
    // Remove player if they were a player
    if (socket.data.role === 'player' && socket.data.playerId) {
      game.players = game.players.filter(p => p.id !== socket.data.playerId)
      // Broadcast updated lobby state
      io.to(code).emit('lobby_state', lobbySnapshot(code))
    }
  })
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server ready on http://localhost:${port} (socket.io: /socket.io)`)
})

