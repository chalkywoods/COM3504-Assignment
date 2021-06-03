let username = null;
let room = null;
let dbInstance = null;
const socket = io();
/**
 * called by <body onload>
 * it initialises the interface and the expected socket messages
 * plus the associated actions
 */
function init() {
    // register a service worker
    // TODO: Untick later
    // if ('serviceWorker' in navigator) {
    //     navigator.serviceWorker.register('./sw.js').then(function (registration) {
    //         // registration successful
    //         console.log('ServiceWorker registration successful with scope: ', registration.scope);
    //     }, function (err) {
    //         // registration failed
    //         console.log('ServiceWorker registration failed: ', err);
    //     });
    // }

    // it sets up the interface so that userId and room  are selected
    document.getElementById('initial_form').classList.remove('hidden');
    document.getElementById('chat_interface').classList.add('hidden');

    // join a room
    socket.on('joinRoom', (room, joining_username) => {
        if (joining_username === username) {
            // it enters the chat
            hideLoginInterface(room, username);
        } else {
            // notifies that someone has joined the room
            writeOnHistory('<b>' + joining_username + '</b>' + ' joined room ' + room);
        }
    });

    // receive a chat message
    socket.on('message', (room, sender_username, msg, timestamp) => {
        let who = sender_username;
        if (who === username) who = 'Me';
        storeChat(room, sender_username, msg, timestamp);
        writeOnHistory('<b>' + who + ':</b> ' + msg);
    });
    
    // receive clear canvas event
    socket.on('clear_canvas', (room) => {
        deleteCachedStrokes(room)
            .then(() => {
                // clear canvas for the user
                clearCanvas();
                // send clear event for other users
                socket.emit('clear_canvas', room);
            })
    });

    // check indexedDB support and initialise
    if ('indexedDB' in window) {
        initDatabase();
    } else {
        console.log('This browser doesn\t support IndexedDB');
    }
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
    socket.emit('message', room, username, msg, Date.now());
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
    initCanvas(socket, image, room, username);
    hideLoginInterface(room, username);
    loadCachedChats(room);
}

/**
 * Checks whether the given room has an image associated with it already, and connects if it has
 */
function checkRoom() {
    username = document.getElementById("name").value;
    room = document.getElementById("roomNo").value;
    $.ajax({
        url: '/checkRoom',
        data: JSON.stringify({ room: room }),
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            console.log("Image found");
            delete dataR['_id'];
            storeImage(room, dataR);
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
    document.getElementById('connect').classList.add('hidden');
    document.getElementById('image_form').classList.remove('hidden');
}

/**
 * displays image input elements based on the pressed button
 * @param method: the image input method selected
 * @returns false
 */
function imageSelector(method) {
    const url = document.getElementById('imageURL');
    const upload = document.getElementById('imageUpload');
    const select = document.getElementById('imageSelect');
    const attributes = document.getElementById('imageAttributes');
    const type = document.getElementById('imageType');
    const submit = document.getElementById('upload');
    if (method === 'url') {
        url.style.display = 'block';
        upload.style.display = 'none';
        select.style.display = 'none';
        attributes.style.display = 'block';
        submit.style.display = 'block'
        type.value = 'imageURL'
    } else if (method === 'upload') {
        url.style.display = 'none';
        upload.style.display = 'block';
        select.style.display = 'none';
        attributes.style.display = 'block';
        submit.style.display = 'block'
        type.value = 'imageUpload'
    } else if (method === 'select') {
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
    document.getElementById('initial_form').classList.add('hidden');
    document.getElementById('image_form').classList.add('hidden');
    document.getElementById('chat_interface').classList.remove('hidden');
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
    const data = {
        title: title,
        description: desc,
        author: author,
        url: image
    }
    storeImage(room[0], data);
    data['rooms'] = room;
    $.ajax({
        url: url,
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
 * Submit an image URL or file for creation
 */
function submitImage() {
    const type = document.getElementById('imageType').value;
    const room = document.getElementById('roomNo').value;
    const title = document.getElementById('title').value;
    const description = document.getElementById('desc').value;
    const author = document.getElementById('author').value;
    if (type === "imageURL") {
        const imageURL = document.getElementById('image_url').value;
        base64FromUrl(imageURL)
            .then(function (imageData) {
                newImage('/upload', title, description, author, imageData, [room]);
            })
    } else if (type === "imageUpload") {
        base64FromFile()
            .then(function (imageData) {
                newImage('/upload', title, description, author, imageData, [room]);
            })
    } else {
        throw ReferenceError("image type not recognised");
    }
}

/**
 * Load an image in base64 format from image url
 * @param url: url of image
 * @returns {Promise<unknown>}
 */

async function base64FromUrl(url) {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result;
            resolve(base64data);
        }
    });
}

/**
 * Load image in base64 format from image file upload field
 */
async function base64FromFile() {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(document.getElementById("image_upload").files[0])
        reader.onloadend = () => {
            const base64data = reader.result;
            resolve(base64data);
        }
    })
}

/**
 * Get images by the given author
 */
function getImageByAuthor() {
    const query = document.getElementById('author_search').value;
    $.ajax({
        url: "/search",
        data: JSON.stringify({ author: query }),
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
    const data = {
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
    let display_div = document.getElementById('show_images');
    display_div.innerHTML = '';
    images.forEach(function (image) {
        let newDiv = document.createElement("DIV");
        let title = document.createElement("H3");
        title.innerText = image.title;
        let description = document.createElement("P");
        description.innerText = image.description;
        let author = document.createElement("P");
        author.innerText = "Author: ".concat(image.author);
        let thumbnail = document.createElement("IMG");
        thumbnail.src = image.url;
        thumbnail.width = "300";
        newDiv.appendChild(title);
        newDiv.appendChild(description);
        newDiv.appendChild(author);
        newDiv.appendChild(thumbnail);
        newDiv.id = "imageDiv";
        newDiv.onclick = function () { useImage(image) };
        display_div.appendChild(newDiv);
    })
}

async function initDatabase() {
    dbInstance = await idb.openDB('appdb', 1, {
        upgrade(dbInstance) {
            let imageStore = dbInstance.createObjectStore('images', {
                keyPath: 'id',
                autoIncrement: true
            });
            imageStore.createIndex('room', 'room')
            imageStore.createIndex('uniqueImage', ['room', 'title', 'description', 'author', 'url'], { unique: true })

            let chatStore = dbInstance.createObjectStore('chats', {
                keyPath: 'id',
                autoIncrement: true
            });
            chatStore.createIndex('room', 'room')
            chatStore.createIndex('roomTime', ['room', 'timestamp'], { unique: true })

            let strokeStore = dbInstance.createObjectStore('strokes', {
                keyPath: 'id',
                autoIncrement: true
            });
            strokeStore.createIndex('room', 'room')
            strokeStore.createIndex('roomTime', ['room', 'timestamp'], { unique: true })
        }
    });
    console.log('DB created');
}

async function storeImage(room, imageObject) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        imageObject['room'] = room;
        dbInstance.put('images', imageObject)
    }
}

async function storeStroke(room, timestamp, strokeObject) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        strokeObject['room'] = room;
        strokeObject['timestamp'] = timestamp;
        dbInstance.put('strokes', strokeObject)
    }
}

async function storeChat(room, username, text, timestamp) {
    const chatObject = {
        room: room,
        username: username,
        text: text,
        timestamp: timestamp
    }
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        dbInstance.put('chats', chatObject)
    }
}

async function getImage(room) {
    return ddbInstanceb.getFromIndex('images', 'room', room);
}

async function getChats(room) {
    return dbInstance.getAllFromIndex('chats', 'room', room);
}

async function getStrokes(room) {
    return dbInstance.getAllFromIndex('strokes', 'room', room);
}

async function loadCachedChats(room) {
    getChats(room)
        .then(function (chats) {
            chats.forEach(chat => writeOnHistory('<b>' + chat.username + ':</b> ' + chat.text));
        })
}

async function loadCachedStrokes(room, context) {
    getStrokes(room)
        .then(function (strokes) {
            strokes.forEach(stroke => drawOnCanvas(
                context,
                stroke.width,
                stroke.height,
                stroke.prevX,
                stroke.prevY,
                stroke.currX,
                stroke.currY,
                color,
                thickness
            ));
        })
}

async function deleteCachedStrokes(room) {
    return dbInstance.delete('strokes', 'room', room);
}

async function canvasClearing() {
    // delete cached strokes
    deleteCachedStrokes(room)
        .then(() => {
            // clear canvas for the user
            clearCanvas();
            // send clear event for other users
            socket.emit('clear_canvas', room);
        })
}