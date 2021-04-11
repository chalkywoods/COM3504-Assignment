
exports.init = function (io) {

  io.sockets.on('connection', socket => {
    try {

      // create or join a room
      socket.on('create or join', (room, username) => {
        socket.join(room);
        console.log(`[SOCKET.IO] ${username} joined room ${room}`);

        // welcome current user
        let greeting = "Welcome to canvas " + username + "!"
        io.to(room).emit('message', room, username, greeting);
      });

      // listen for chat message
      socket.on('message', (room, username, msg) => {
        io.to(room).emit('message', room, username, msg);

        console.log(`[SOCKET.IO] ${username} messaged room ${room}: ${msg}`);
    });

      socket.on('disconnect', () => {
        console.log('someone disconnected');
      });
    } catch (e) {
      console.log(e);
    }
  });
}
