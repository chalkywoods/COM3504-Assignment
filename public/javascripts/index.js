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
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(function (registration) {
            // registration successful
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
            // registration failed
            console.log('ServiceWorker registration failed: ', err);
        });
    }

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
    socket.on('clear_canvas', async (room, sender_username) => {
        if(username === sender_username)
            return;

        console.log('Clearing canvas...');

        try {
            clearCanvas(false);
            await deleteCachedStrokes(room);
            await KnowledgeAnnotations.clearAnnotations();
        } catch {
            console.log('Failed to delete strokes from the IndexedDB');
        }
    });

    socket.on('change_room', (room, toRoom, timestamp) => {
        storeMove(room, toRoom, timestamp);
        changeRoom(toRoom);
    });

    // check indexedDB support and initialise
    if ('indexedDB' in window) {
        initDatabase();
    } else {
        console.log('This browser doesn\t support IndexedDB');
    }

    window.addEventListener('online',  syncImages);
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
    let history = document.getElementById('history');
    history.innerHTML = "";
    loadCachedChats(room);

    KnowledgeAnnotations.loadCachedAnnotations();
}

/**
 * Checks whether the given room has an image associated with it already, and connects if it has
 */
function checkRoom(checking=null) {
    username = document.getElementById("name").value;

    if (checking === null) {
        checking = document.getElementById("roomNo").value;
    }
    if (window.navigator.onLine) {
        $.ajax({
            url: '/checkRoom',
            data: JSON.stringify({room: checking}),
            contentType: 'application/json',
            type: 'POST',
            success: function (dataR) {
                console.log("Image found");
                delete dataR['_id'];
                room = checking;
                storeImage(room, dataR, 1);
                connectToRoom(username, room, dataR.url);
            },
            error: function (xhr, status, error) {
                console.log("no image found");
                showImageChoice();
            }
        });
    } else {
        getImage(checking)
            .then((image) => {
                if (!image) {
                    alert('Offline: Image will be uploaded when connection is back');
                    showImageChoice();
                } else {
                    alert('Offline: Using local room');
                    room = checking;
                    connectToRoom(username, room, image.url);
                }
            })
            .catch(function() {
                alert('Offline: Image will be uploaded when connection is back');
                showImageChoice();
            })
    }
}

/**
 * shows the image selection form
 */
function showImageChoice(moving) {
    document.getElementById('connect').classList.add('hidden');
    document.getElementById('image_form').classList.remove('hidden');

    const button = document.getElementById('upload');
    button.onclick = function() { submitImage(moving); };
    imageSelector('url');
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

function sendChangeRoom(toRoom) {
    hideLoginInterface(room, username);
    socket.emit("change_room", room, toRoom, Date.now())
}

function changeRoom(room) {
    let history = document.getElementById('history');
    let paragraph = document.createElement('p');
    let button = document.createElement('button');
    button.className = "move_room_button"
    button.onclick = function() {checkRoom(room)};
    button.innerHTML = `Move to room ${room}`;
    paragraph.appendChild(button);
    history.appendChild(paragraph);

    // scroll to the last element
    history.scrollTop = history.scrollHeight;
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
    document.getElementById('search').onclick = function() {getImageByAuthor(true)};
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
    return new Promise((resolve, reject) => {
        const data = {
            title: title,
            description: desc,
            author: author,
            url: image
        }
        storeImage(room[0], data, 0);
        data['rooms'] = room;
        if (window.navigator.onLine) {
            $.ajax({
                url: url,
                data: JSON.stringify(data),
                contentType: 'application/json',
                type: 'POST',
                success: function (dataR) {
                    markImageUploaded(room[0])
                        .then(function() {
                            resolve(room[0]);
                        })
                },
                error: function (xhr, status, error) {
                    alert('Error: ' + error.message);
                    reject(error);
                }
            });
        } else {
            resolve(room[0]);
        }
    })
}

/**
 * Submit an image URL or file for creation
 */
function submitImage(moving) {
    let newRoom;
    if (moving) {
        newRoom = generateRoom();
    } else {
        room = document.getElementById('roomNo').value;
        newRoom = room;
    }

    const type = document.getElementById('imageType').value;
    const title = document.getElementById('title').value;
    const description = document.getElementById('desc').value;
    const author = document.getElementById('author').value;

    let image;

    if (type === "imageURL") {
        const imageURL = document.getElementById('image_url').value;
        image = base64FromUrl(imageURL)
    } else if (type === "imageUpload") {
        image = base64FromFile()
    } else {
        throw ReferenceError("image type not recognised");
    }
    image.then(function(imageData) {
        newImage('/upload', title, description, author, imageData, [newRoom]).then(newRoom => {
            if (moving) {
                sendChangeRoom(newRoom);
            } else {
                checkRoom(newRoom)
            }
        });
    })
}

async function promisifyUrl(url) {
    return new Promise((resolve) => resolve(url));
}

/**
 * Load an image in base64 format from image url
 * @param url: url of image
 * @returns {Promise<unknown>}
 */
async function base64FromUrl(url) {
    const blob = await fetch(url, {mode: "cors"})
        .then(data => data.blob())
        .catch(e => {
            if (e instanceof TypeError) {
                alert("Invalid image URL");
            }
        })
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
function getImageByAuthor(moving) {
    const query = document.getElementById('author_search').value;
    $.ajax({
        url: "/search",
        data: JSON.stringify({ author: query }),
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            displayImages(dataR, moving);
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
function useImage(image, moving=false) {
    const data = {
        id: image._id
    }
    if (moving) {
        data['room'] = generateRoom();
    } else {
        data['room'] = document.getElementById('roomNo').value;
    }
    $.ajax({
        url: "/add",
        data: JSON.stringify(data),
        contentType: 'application/json',
        type: 'POST',
        success: function (dataR) {
            if (moving) {
                sendChangeRoom(data.room);
            } else {
                checkRoom();
            }
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
function displayImages(images, moving) {
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
        newDiv.onclick = function () { useImage(image, moving) };
        display_div.appendChild(newDiv);
    })
}

async function initDatabase() {
    dbInstance = await idb.openDB('appdb', 3, {
        upgrade(dbInstance, oldVersion) {
            // if database is created for the first time
            if (oldVersion < 1) {
                let imageStore = dbInstance.createObjectStore('images', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                imageStore.createIndex('room', 'room')
                imageStore.createIndex('uniqueImage', ['room', 'title', 'description', 'author', 'url'], {unique: true})

                let chatStore = dbInstance.createObjectStore('chats', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                chatStore.createIndex('room', 'room')
                chatStore.createIndex('roomTime', ['room', 'timestamp'], {unique: true})

                let strokeStore = dbInstance.createObjectStore('strokes', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                strokeStore.createIndex('room', 'room')
                strokeStore.createIndex('roomTime', ['room', 'timestamp'], {unique: true})

                const annotationStore = dbInstance.createObjectStore('annotations', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                annotationStore.createIndex('room', 'room');
            }

            if (oldVersion < 2) {
                let moveStore = dbInstance.createObjectStore('moves', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                moveStore.createIndex('room', 'room')
                moveStore.createIndex('roomTime', ['room', 'timestamp'], {unique: true})
            }
            if (oldVersion < 3) {
                // Can't seem to retroactively add index in idb so delete and remake
                dbInstance.deleteObjectStore('images')
                let imageStore = dbInstance.createObjectStore('images', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                imageStore.createIndex('room', 'room')
                imageStore.createIndex('uniqueImage', ['room', 'title', 'description', 'author', 'url'], {unique: true})
                imageStore.createIndex('uploaded', 'uploaded')
            }
        }
    });

    console.log('DB created');
}

async function storeImage(room, imageObject, uploaded) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        imageObject['room'] = room;
        imageObject['uploaded'] = uploaded;
        dbInstance.put('images', imageObject)
            .catch(err => console.log("Image already cached"))
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

async function storeMove(room, toRoom, timestamp) {
    const moveObject = {
        room: room,
        toRoom: toRoom,
        timestamp: timestamp
    }
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        dbInstance.put('moves', moveObject)
    }
}


async function getImage(room) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        return dbInstance.getFromIndex('images', 'room', room);
    }
}

async function getChats(room) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        return dbInstance.getAllFromIndex('chats', 'room', room);
    }
}

async function getMoves(room) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        return dbInstance.getAllFromIndex('moves', 'room', room);
    }
}

async function getStrokes(room) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        return dbInstance.getAllFromIndex('strokes', 'room', room);
    }
}

async function markImageUploaded(room) {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        dbInstance.getFromIndex('images', 'room', room)
            .then((image) => {
                dbInstance.delete('images', 'room', room);
                storeImage(room, image, 1)
            })
    }
}

async function syncImages() {
    if (!dbInstance)
        await initDatabase();
    if (dbInstance) {
        dbInstance.getAllFromIndex('images', 'uploaded', 0)
            .then(function (images) {
                images.forEach(image => {
                    delete image.uploaded;
                    delete image.id;
                    image.rooms = [image.room];
                    delete image.room;
                    $.ajax({
                        url: '/upload',
                        data: JSON.stringify(image),
                        contentType: 'application/json',
                        type: 'POST',
                        success: function (dataR) {
                            markImageUploaded(image.rooms[0])
                        },
                        error: function (xhr, status, error) {
                            if (status === 422) {
                                alert('Error: Room ' + image.room + ' already exists in database, can\'t upload ' + image.title);
                            } else {
                                alert('Error: ' + error.message);
                            }
                        }
                    })
                })
            })
    }
}

async function loadCachedChats(room) {
    const chats = await getChats(room);
    const moves = await getMoves(room);
    const messages = chats.concat(moves);
    messages.sort(compareTimes);
    messages.forEach(message =>  {
        if (message.hasOwnProperty("toRoom")) {
            changeRoom(message.toRoom);
        } else {
            writeOnHistory('<b>' + message.username + ':</b> ' + message.text);
        }
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
    if (!dbInstance)
        await initDatabase();

    const strokes = await getStrokes(room);
    strokes.forEach(stroke => dbInstance.delete('strokes', stroke.id));

    console.log('Strokes deleted from the IndexedDB');
}

/*
    Function used for canvas clearing
    Removes strokes from the IndexedDB and emits a socket.io event for other users to do the same
 */
async function canvasClearing() {
    console.log('Clearing canvas...');

    try {
        clearCanvas(false);
        socket.emit('clear_canvas', room, username);

        KnowledgeAnnotations.clearAnnotations();
        deleteCachedStrokes(room);
    } catch(err) {
        console.error('Failed to clear canvas');
        console.error(err);
    }
}

function compareTimes(a, b) {
    return a.timestamp - b.timestamp;
}