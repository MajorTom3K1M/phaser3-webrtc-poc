const express = require("express");
const server = express();
const http = require("http").Server(server);
const io = require("socket.io")(http);

server.use(express.static("public"));

http.listen(3000, () => {
  console.log("Server started at: 3000");
});

server.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", async (socket) => {
  console.log("new player connected", socket.id);
  io.sockets.emit("player-joined", {
    clients: Array.from(await io.allSockets()),
    count: io.engine.clientsCount,
    joinedUserId: socket.id,
  });
  socket.on("signaling", (data) => {
    io.to(data.toId).emit("signaling", { fromId: socket.id, ...data });
  });
    socket.on("disconnect", () => {
      io.sockets.emit("player-left", socket.id);
    });
});
