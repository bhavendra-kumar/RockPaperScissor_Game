import { useEffect, useState } from "react";
import socket from "../socket";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

function Game({ roomId, playerName }) {
  const [players, setPlayers] = useState([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({});
  const [roundResult, setRoundResult] = useState("");
  const [moves, setMoves] = useState({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [flipMoves, setFlipMoves] = useState({}); // for flip animation

  const { width, height } = useWindowSize();

  useEffect(() => {
    socket.on("roomData", (players) => setPlayers(players));

    socket.on("roundResult", (data) => {
      setRound(data.round);
      setScore(data.score);
      setRoundResult(data.roundResult);
      setMoves(data.moves);

      // trigger flip animation
      const flipped = {};
      Object.keys(data.moves).forEach((id) => (flipped[id] = true));
      setFlipMoves(flipped);

      // show confetti
      if (data.roundResult !== "draw") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }

      setTimeLeft(10);
      setTimeout(() => setFlipMoves({}), 1000); // reset flip after 1s
    });

    return () => {
      socket.off("roomData");
      socket.off("roundResult");
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [round]);

  const makeMove = (move) => {
    socket.emit("playerMove", { roomId, move });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-200 to-purple-100 flex flex-col items-center p-6 relative">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={150} />}

      <h2 className="text-2xl font-bold mb-4">Round: {round}</h2>
      <h3 className="text-lg font-semibold mb-4">
        Time left: <span className="text-red-500">{timeLeft}s</span>
      </h3>

      {/* Scoreboard */}
      <div className="flex gap-8 mb-6">
        {players.map((p) => (
          <div
            key={p.id}
            className="bg-white p-4 rounded-xl shadow-md w-36 text-center transition-transform duration-300 hover:scale-105"
          >
            <p className="font-semibold">{p.name}</p>
            <p className="text-3xl mt-2">{score[p.id] || 0}</p>
          </div>
        ))}
      </div>

      {/* Move Buttons */}
      <div className="flex justify-center gap-6 mb-6">
        {["rock", "paper", "scissors"].map((m) => {
          const emoji = m === "rock" ? "🪨" : m === "paper" ? "📄" : "✂️";
          const color = m === "rock" ? "bg-red-500" : m === "paper" ? "bg-blue-500" : "bg-green-500";
          return (
            <button
              key={m}
              className={`${color} text-white p-6 rounded-full text-3xl hover:scale-110 transform transition duration-300 shadow-lg`}
              onClick={() => makeMove(m)}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      {/* Players’ Moves with Flip Animation */}
      <div className="flex justify-center gap-12 mb-6">
        {players.map((p) => {
          const move = moves[p.id];
          const isWinner = roundResult.includes(p.name) && roundResult !== "draw";
          const flipped = flipMoves[p.id];

          return (
            <div key={p.id} className="flex flex-col items-center">
              <span className="font-bold">{p.name}</span>
              <div
                className={`relative w-20 h-20 mt-2 perspective`}
              >
                <div
                  className={`absolute w-full h-full rounded-lg text-6xl flex items-center justify-center
                    transition-transform duration-700 transform ${flipped ? "rotateY-180" : ""}
                    ${isWinner ? "bg-yellow-300 animate-bounce" : "bg-white"}
                  `}
                >
                  {move ? (move === "rock" ? "🪨" : move === "paper" ? "📄" : "✂️") : "❔"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Round Result */}
      <h3 className="text-xl font-semibold mb-4">{roundResult}</h3>
    </div>
  );
}

export default Game;
