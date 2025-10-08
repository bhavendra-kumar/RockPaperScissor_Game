import { useEffect, useState } from "react";
import socket from "../socket";
import { useNavigate } from "react-router-dom";

function JoinRoom({ roomId, playerName }) {
  const [players, setPlayers] = useState([]);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("roomData", (players) => setPlayers(players));
    socket.on("gameStart", () => navigate("/game"));

    return () => {
      socket.off("roomData");
      socket.off("gameStart");
    };
  }, [navigate]);

  const handleReady = () => {
    socket.emit("playerReady", { roomId });
    setReady(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-blue-300 p-6">
      <h2 className="text-3xl font-bold mb-6">Lobby: {roomId}</h2>
      
      <div className="flex gap-8 mb-6">
        {players.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-xl shadow-md w-36 text-center">
            <p className="font-semibold">{p.name}</p>
            <p className={`mt-2 font-bold ${p.ready ? "text-green-500" : "text-gray-500"}`}>
              {p.ready ? "Ready ✅" : "Not Ready ❌"}
            </p>
          </div>
        ))}
      </div>

      {!ready && (
        <button
          onClick={handleReady}
          className="bg-green-500 text-white px-6 py-3 rounded-xl text-xl hover:scale-105 transform transition duration-300 shadow-lg"
        >
          Ready
        </button>
      )}

      {ready && <p className="text-lg text-green-700 mt-4 font-semibold">Waiting for opponent...</p>}
    </div>
  );
}

export default JoinRoom;
