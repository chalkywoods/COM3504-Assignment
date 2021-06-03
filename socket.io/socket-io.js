
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
      
      // listen for room change
      socket.on('change_room', (room, toRoom, timestamp) => {
        io.to(room).emit('change_room', room, toRoom, timestamp);

        console.log(`[SOCKET.IO] Room ${room} changed to ${toRoom}`);
      });

      // listen for drawing
      socket.on('stroke', (room, username, stroke, timestamp) => {
        socket.to(room).emit('stroke', room, username, stroke, timestamp);

        console.log(`[SOCKET.IO] ${username} is drawing in room ${room}`);
      });

      // listen for cleared canvas
      socket.on('clear_canvas', (room) => {
        socket.to(room).emit('clear_canvas', room);

        console.log(`[SOCKET.IO] Canvas cleared in room ${room}`);
      });

      // handling knowledge graph annotation
      socket.on('annotation', (room, username, annotation) => {
        socket.to(room).emit('annotation', room, username, annotation);

        console.log(`[SOCKET.IO] ${username} has created an annotation in room ${room}`);
      });

      socket.on('disconnect', () => {
        console.log('someone disconnected');
      });
    } catch (e) {
      console.log(e);
    }
  });
}
