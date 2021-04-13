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
    const roomNo = 'R' + Math.round(Math.random() * 10000);
    document.getElementById('roomNo').value = roomNo;
    return roomNo;
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
function connectToRoom(username, room, image) {
    if (!username) username = 'Unknown-' + Math.random();
    socket.emit('create or join', room, username);
    console.log(username + " joined room " + room);
    initCanvas(socket, image);
    hideLoginInterface(room, username);
}

/**
 * Checks whether the given room has an image associated with it already, and connects if it has
 */
function checkRoom() {
    var username = document.getElementById("name").value;
    var room = document.getElementById("roomNo").value;
    $.ajax({
        url: '/checkRoom',
        data: JSON.stringify({room: room}),
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            console.log("Image found");
            connectToRoom(username, room, dataR.url);
        },
        error: function (xhr, status, error) {
            console.log("no image found");
            showImageChoice();
        }
    });
}

/**
 * shows the image selection form
 */
function showImageChoice() {
    document.getElementById('connect').style.display = 'none';
    document.getElementById('image_form').style.display = 'block';
}

/**
 * displays image input elements based on the pressed button
 * @param method: the image input method selected
 * @returns false
 */
function imageSelector(method) {
    var url =  document.getElementById('imageURL');
    var upload =  document.getElementById('imageUpload');
    var select =  document.getElementById('imageSelect');
    var attributes =  document.getElementById('imageAttributes');
    var type = document.getElementById('imageType');
    var submit = document.getElementById('upload');
    if (method == 'url') {
        url.style.display = 'block';
        upload.style.display = 'none';
        select.style.display = 'none';
        attributes.style.display = 'block';
        submit.style.display = 'block'
        type.value = 'imageURL'
    } else if (method == 'upload') {
        url.style.display = 'none';
        upload.style.display = 'block';
        select.style.display = 'none';
        attributes.style.display = 'block';
        submit.style.display = 'block'
        type.value = 'imageUpload'
    } else if (method == 'select') {
        url.style.display = 'none';
        upload.style.display = 'none';
        select.style.display = 'block';
        attributes.style.display = 'none';
        submit.style.display = 'none'
        type.value = 'imageSelect'
    }
    return false;
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
    document.getElementById('image_form').style.display = 'none';
    document.getElementById('chat_interface').style.display = 'block';
    document.getElementById('who_you_are').innerHTML = username;
    document.getElementById('in_room').innerHTML = ' ' + room;
}

/**
 * Creates a new image for the room, then enters it
 * @param url: POST url
 * @param title: Image title
 * @param desc: Image description
 * @param author: Image author
 * @param image: Image URL, can be a link or base64
 * @param room: Room to create with new image
 */
function newImage(url, title, desc, author, image, room) {
    var data = JSON.stringify({
        title: title,
        description: desc,
        author: author,
        url: image,
        rooms: room
    });
    $.ajax({
        url: url,
        data: data,
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            checkRoom();
        },
        error: function (xhr, status, error) {
            alert('Error: ' + error.message);
        }
    });
}

/**
 * Upload in image in base64
 * @param title: Image title
 * @param description: Image description
 * @param author: Image author
 * @param room: Room to create with new image
 */
function uploadImage(title, description, author, room) {
    var reader = new FileReader();
    reader.addEventListener("load", function () {
        newImage('/upload', title, description, author, reader.result, [room]);
    }, false);
    reader.readAsDataURL(document.getElementById("image_upload").files[0])
}

/**
 * Submit an image URL or file for creation
 */
function submitImage() {
    var type = document.getElementById('imageType').value;
    var room = document.getElementById('roomNo').value;
    var title = document.getElementById('title').value;
    var description = document.getElementById('desc').value;
    var author = document.getElementById('author').value;
    if (type === "imageURL") {
        var imageURL = document.getElementById('image_url').value;
        newImage('/upload', title, description, author, imageURL, [room]);
    } else if (type === "imageUpload") {
        uploadImage(title, description, author, room);
    } else {
        throw ReferenceError("image type not recognised");
    }
}

/**
 * Get images by the given author
 */
function getImageByAuthor() {
    var query = document.getElementById('author_search').value;
    $.ajax({
        url: "/search",
        data: JSON.stringify({author: query}),
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            displayImages(dataR);
        },
        error: function (xhr, status, error) {
            alert('Error: ' + error.message);
        }
    });
}

/**
 * Use the selected existing image for a new room
 * @param image: The image to use
 */
function useImage(image) {
    var data = {
        id: image._id,
        room: document.getElementById('roomNo').value
    }
    $.ajax({
        url: "/add",
        data: JSON.stringify(data),
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            checkRoom();
        },
        error: function (xhr, status, error) {
            alert('Error: ' + error.message);
        }
    });
}

/**
 * Display images below the author search box
 * @param images
 */
function displayImages(images) {
    var display_div = document.getElementById('show_images');
    display_div.innerHTML = '';
    images.forEach(function(image) {
        var newDiv = document.createElement("DIV");
        var title = document.createElement("H3");
        title.innerText = image.title;
        var description = document.createElement("P");
        description.innerText = image.description;
        var author = document.createElement("P");
        author.innerText = "Author: ".concat(image.author);
        var thumbnail = document.createElement("IMG");
        thumbnail.src = image.url;
        thumbnail.width = "300";
        newDiv.appendChild(title);
        newDiv.appendChild(description);
        newDiv.appendChild(author);
        newDiv.appendChild(thumbnail);
        newDiv.id = "imageDiv";
        newDiv.onclick = function() {useImage(image)};
        display_div.appendChild(newDiv);
    })
}
