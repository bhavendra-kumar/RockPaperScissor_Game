const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // React frontend
    methods: ["GET", "POST"]
  }
});

const ROUND_TIME = 10000; // 10 seconds
let rooms = {}; // roomId -> { players: [], moves: {}, rounds, score, timeout }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Player joins room
  socket.on("joinRoom", ({ roomId, playerName }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], moves: {}, rounds: 1, score: {}, timeout: null };
    }

    // Add player
    rooms[roomId].players.push({ id: socket.id, name: playerName });
    rooms[roomId].score[socket.id] = 0;

    io.to(roomId).emit("roomData", rooms[roomId].players);

    // Start round timer if 2 players are present
    if (rooms[roomId].players.length === 2 && !rooms[roomId].timeout) {
      startRoundTimer(roomId);
    }
  });

  // Player makes move
  socket.on("playerMove", ({ roomId, move }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].moves[socket.id] = move;

    // If both players moved, resolve round immediately
    if (Object.keys(rooms[roomId].moves).length === 2) {
      if (rooms[roomId].timeout) {
        clearTimeout(rooms[roomId].timeout);
        rooms[roomId].timeout = null;
      }
      resolveRound(roomId);
    }
  });

  // Player disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
      delete rooms[roomId].score[socket.id];
      delete rooms[roomId].moves[socket.id];

      // If room empty, delete it
      if (rooms[roomId].players.length === 0) delete rooms[roomId];
      else io.to(roomId).emit("roomData", rooms[roomId].players);
    }
  });
});

// --- Round timer ---
function startRoundTimer(roomId) {
  rooms[roomId].timeout = setTimeout(() => {
    const [p1, p2] = rooms[roomId].players.map(p => p.id);
    const m1 = rooms[roomId].moves[p1] || null;
    const m2 = rooms[roomId].moves[p2] || null;

    // Determine round result based on moves/timeouts
    let roundResult;
    if (!m1 && !m2) roundResult = "draw";
    else if (!m1) roundResult = `${rooms[roomId].players[1].name} wins (timeout)`;
    else if (!m2) roundResult = `${rooms[roomId].players[0].name} wins (timeout)`;
    else return; // both moved, already resolved

    // Update score if winner exists
    if (roundResult.includes("wins")) {
      const winnerId = roundResult.includes(rooms[roomId].players[0].name) ? p1 : p2;
      rooms[roomId].score[winnerId]++;
    }

    io.to(roomId).emit("roundResult", {
      round: rooms[roomId].rounds,
      moves: rooms[roomId].moves,
      roundResult,
      score: rooms[roomId].score
    });

    // Reset moves, increment round, start next timer
    rooms[roomId].moves = {};
    rooms[roomId].rounds++;
    rooms[roomId].timeout = null;
    startRoundTimer(roomId);
  }, ROUND_TIME);
}

// --- Resolve round when both players have moved ---
function resolveRound(roomId) {
  const [p1, p2] = rooms[roomId].players.map(p => p.id);
  const m1 = rooms[roomId].moves[p1];
  const m2 = rooms[roomId].moves[p2];

  let roundResult;
  if (m1 === m2) roundResult = "draw";
  else if (
    (m1 === "rock" && m2 === "scissors") ||
    (m1 === "paper" && m2 === "rock") ||
    (m1 === "scissors" && m2 === "paper")
  ) {
    roundResult = `${rooms[roomId].players[0].name} wins`;
    rooms[roomId].score[p1]++;
  } else {
    roundResult = `${rooms[roomId].players[1].name} wins`;
    rooms[roomId].score[p2]++;
  }

  io.to(roomId).emit("roundResult", {
    round: rooms[roomId].rounds,
    moves: { [p1]: m1, [p2]: m2 },
    roundResult,
    score: rooms[roomId].score
  });

  rooms[roomId].moves = {};
  rooms[roomId].rounds++;

  // Start next round timer
  startRoundTimer(roomId);
}

server.listen(5000, () => console.log("Server running on 5000"));
