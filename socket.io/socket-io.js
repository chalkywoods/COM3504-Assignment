
exports.init = function (io) {

  io.sockets.on('connection', socket => {
    try {

      // create or join a room
      socket.on('create or join', (room, username) => {
        socket.join(room);
        console.log("Joined room " + room);

        // welcome current user
        let greeting = "Welcome to canvas " + username + "!"
        io.to(room).emit('message', room, username, greeting);
      });

      // listen for chat message
      socket.on('message', (room, username, msg) => {
        io.to(room).emit('message', room, username, msg);
    });

      socket.on('disconnect', () => {
        console.log('someone disconnected');
      });
    } catch (e) {
      console.log(e);
    }
  });
}
