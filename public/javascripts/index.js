let username = null;
let room = null;
const socket = io();


/**
 * called by <body onload>
 * it initialises the interface and the expected socket messages
 * plus the associated actions
 */
function init() {
    // it sets up the interface so that userId and room are selected
    document.getElementById('initial_form').style.display = 'block';
    document.getElementById('chat_interface').style.display = 'none';

    //@todo here is where you should initialise the socket operations as described in teh lectures (room joining, chat message receipt etc.)

    // join a room
    socket.on("joinRoom", (room, joining_username) => {
        if (joining_username === username) {
            // it enters the chat
            hideLoginInterface(room, username);
        } else {
            // notifies that someone has joined the room
            writeOnHistory('<b>' + joining_username + '</b>' + ' joined room ' + room);
        }
    });

    // receive a chat message
    socket.on("message", (room, sender_username, msg) => {
        let who = sender_username;
        if (who === username) who = 'Me';
        writeOnHistory('<b>' + who + ':</b> ' + msg);
    });
}

/**
 * called to generate a random room number
 * This is a simplification. A real world implementation would ask the server to generate a unique room number
 * so to make sure that the room number is not accidentally repeated across uses
 */
function generateRoom() {
    roomNo = Math.round(Math.random() * 10000);
    document.getElementById('roomNo').value = 'R' + roomNo;
}

/**
 * called when the Send button is pressed. It gets the text to send from the interface
 * and sends the message via  socket
 */
function sendChatText() {
    let msg = document.getElementById('chat_input').value;
    socket.emit('message', room, username, msg);
    document.getElementById('chat_input').value = '';
}

/**
 * used to connect to a room. It gets the user name and room number from the
 * interface
 */
function connectToRoom() {
    room = document.getElementById('roomNo').value;
    username = document.getElementById('name').value;
    let imageUrl = document.getElementById('image_url').value;
    if (!username) username = 'Unknown-' + Math.random();
    socket.emit('create or join', room, username);
    console.log(username + " joined room " + room);
    initCanvas(socket, imageUrl);
    hideLoginInterface(room, username);
}

/**
 * it appends the given html text to the history div
 * this is to be called when the socket receives the chat message (socket.on ('message'...)
 * @param text: the text to append
 */
function writeOnHistory(text) {
    if (text === '') return;
    let history = document.getElementById('history');
    let paragraph = document.createElement('p');
    paragraph.innerHTML = text;
    history.appendChild(paragraph);
    // scroll to the last element
    history.scrollTop = history.scrollHeight;
    document.getElementById('chat_input').value = '';
}

/**
 * it hides the initial form and shows the chat
 * @param room the selected room
 * @param username the user name
 */
function hideLoginInterface(room, username) {
    document.getElementById('initial_form').style.display = 'none';
    document.getElementById('chat_interface').style.display = 'block';
    document.getElementById('who_you_are').innerHTML = username;
    document.getElementById('in_room').innerHTML = ' ' + room;
}


function sendImage(url, title, desc, author, image) {
    var imageData = image;//encodeImage(image);
    var data = JSON.stringify({
        title: title,
        description: desc,
        author: author,
        image: imageData
    });
    $.ajax({
        url: url,
        data: data,
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            alert('Image uploaded');
        },
        error: function (xhr, status, error) {
            alert('Error: ' + error.message);
        }
    });
}

function encodeImage(image) {
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    var imageData = canvas.toDataURL('image/png');
    return imageData;
}

function uploadImage() {
    var formArray = $("form").serializeArray();
    var data = {};
    for (index in formArray) {
        data[formArray[index].name] = formArray[index].value;
    }
    console.log(data['title']);
    var reader = new FileReader();
    reader.addEventListener("load", function () {
        sendImage('/upload', data['title'], data['desc'], data['author'], reader.result);
    }, false);
    reader.readAsDataURL(document.getElementById("image").files[0])
}
