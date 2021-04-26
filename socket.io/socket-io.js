
exports.init = function (io) {

  io.sockets.on('connection', socket => {
    try {

      // create or join a room
      socket.on('create or join', (room, username) => {
        socket.join(room);
        console.log(`[SOCKET.IO] ${username} joined room ${room}`);

        // welcome current user
        let greeting = username + " joined the room."
        socket.to(room).emit('message', room, "Chat Bot", greeting);
      });

      // listen for chat message
      socket.on('message', (room, username, msg, timestamp) => {
        io.to(room).emit('message', room, username, msg, timestamp);

        console.log(`[SOCKET.IO] ${username} messaged room ${room}: ${msg}`);
      });

      socket.on('stroke', (room, username, stroke, timestamp) => {
        socket.to(room).emit('stroke', room, username, stroke, timestamp);

        console.log(`[SOCKET.IO] ${username} is drawing in room ${room}`);
      });

      socket.on('disconnect', () => {
        console.log('someone disconnected');
      });
    } catch (e) {
      console.log(e);
    }
  });
}
