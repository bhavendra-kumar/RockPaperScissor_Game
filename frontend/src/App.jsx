import React from "react";
import { Routes, Route } from "react-router-dom";
import JoinRoom from "./pages/JoinRoom";
import Game from "./pages/Game";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<JoinRoom />} />
      <Route path="/game" element={<Game />} />
    </Routes>
  );
};

export default App;
