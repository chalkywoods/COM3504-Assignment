// using the module IFEE pattern not to pollute namespace with global variables

const KnowledgeAnnotations = (function () {
    const API_KEY = 'AIzaSyAG7w627q-djB4gTTahssufwNOImRqdYKM';

    // variable keeping a reference to the most current rectangle
    let currentRect = null;

    const canvas = document.getElementById('canvas');
    const modal = document.getElementById('knowledge-modal');
    const knowledgeSearchInput = document.getElementById('knowledge-search');

    // storing the mouse starting position
    let startPos = {x: 0, y: 0};

    let isAnnotating = false;

    const handleMouseDown = (event) => {
        if (mode !== 'annotating')
            return;

        isAnnotating = true;

        // update start position
        startPos.x = event.offsetX;
        startPos.y = event.offsetY;

        // create new annotation rectangle
        currentRect = document.createElement('div');
        currentRect.classList.add('rect');
        canvas.insertAdjacentElement('afterend', currentRect);

        // register rectangle resize event
        window.addEventListener('mousemove', handleRectangleResize);
    };

    const handleRectangleResize = (event) => {
        if (!isAnnotating)
            return;

        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        const canvasLeft = canvas.offsetLeft;
        const canvasTop = canvas.offsetTop;

        // compute current mouse position considering canvas boundaries
        const mousePos = {
            x: Math.min(Math.max(event.pageX - canvasLeft, 0), canvasWidth),
            y: Math.min(Math.max(event.pageY - canvasTop, 0), canvasHeight)
        };

        // compute coords of the top left edge of the rectangle
        const x = Math.min(mousePos.x, startPos.x);
        const y = Math.min(mousePos.y, startPos.y);

        // compute width and height of rectangle
        const width = Math.abs(mousePos.x - startPos.x);
        const height = Math.abs(mousePos.y - startPos.y);

        currentRect.style.left = canvasLeft + x + 'px';
        currentRect.style.top = canvasTop + y + 'px';

        currentRect.style.width = width + 'px';
        currentRect.style.height = height + 'px';
    };

    const handleMouseUp = () => {
        if (!isAnnotating)
            return;

        isAnnotating = false;

        // remove resize listener
        window.removeEventListener('mousemove', handleRectangleResize);

        currentRect.classList.add('rect-finished');

        if(!window.navigator.onLine) {
            alert('Annotating is not possible while offline!');
            currentRect.parentElement.removeChild(currentRect);
        } else {
            // show annotation modal
            modal.classList.remove('hidden');
            knowledgeSearchInput.value = '';
            knowledgeSearchInput.focus();
        }
    };

    // event firing after selecting an element in the KG widget
    const handleAnnotationSelection = (event) => {
        // hide the modal
        modal.classList.add('hidden');

        // append tooltip with fetched information to the annotation rectangle
        currentRect.innerHTML = getTooltipHTML(event.row);

        // creating annotation object that'll be emitted and stored
        const annotation = {
            x: currentRect.offsetLeft - canvas.offsetLeft,
            y: currentRect.offsetTop - canvas.offsetTop,
            width: currentRect.offsetWidth,
            height: currentRect.offsetHeight,
            data: event.row,
            canvasWidth: canvas.offsetWidth
        };

        socket.emit('annotation', room, username, annotation);

        storeAnnotation(annotation);
    }

    // function creating a rectangle with a specified annotation
    const createAnnotation = (annotation) => {
        const rectElement = document.createElement('div');
        rectElement.classList.add('rect', 'rect-finished');

        // scaling the annotation rectangle
        const scaleFactor = canvas.offsetWidth / annotation.canvasWidth;
x
        rectElement.style.left = scaleFactor * annotation.x + canvas.offsetLeft + 'px';
        rectElement.style.top = scaleFactor * annotation.y + canvas.offsetTop + 'px';
        rectElement.style.width = scaleFactor * annotation.width + 'px';
        rectElement.style.height = scaleFactor * annotation.height + 'px';

        rectElement.innerHTML = getTooltipHTML(annotation.data);

        canvas.insertAdjacentElement('afterend', rectElement);
    };

    // function generating HTML representing a tooltip displaying KG information
    const getTooltipHTML = (data) => {
        const {name, id, rc: description, qc: url} = data;

        return `
            <div class="tooltip">
                <h4>${name}</h4>
                <p>ID: ${id}</p>
                <p>Description: ${description}</p>
                <a href="${url}" target="_blank">Link</a>
            </div>
        `;
    };

    // function storing annotation in the indexedDB
    const storeAnnotation = async (annotation) => {
        if(!dbInstance) {
            await initDatabase();
        }

        annotation.room = room;
        dbInstance.put('annotations', annotation);
    };

    // function reading cached annotations and displaying them on the canvas
    const loadCachedAnnotations = async () => {
        deleteAnnotations();

        try {
            const annotations = await dbInstance.getAllFromIndex('annotations', 'room', room);

            // delaying annotations so canvas can position correctly
            setTimeout(() => {
                annotations.forEach(annotation => {
                    createAnnotation(annotation);
                });
            }, 100);
        } catch(err) {
            console.error('Failed to load cached annotations!');
        }
    };

    // function removing all annotations from canvas
    const deleteAnnotations = () => {
        [...document.querySelectorAll('.rect')].forEach(annotation => annotation.parentElement.removeChild(annotation));
    };

    // function clearing all cached annotations from canvas, indexedDB and emitting socket.io event
    const clearAnnotations = async () => {
        if (!dbInstance)
            await initDatabase();

        deleteAnnotations();

        const annotations = await dbInstance.getAllFromIndex('annotations', 'room', room);
        annotations.forEach(annotation => dbInstance.delete('annotations', annotation.id));

        console.log('Annotations deleted from the IndexedDB');
    };


    const initKGWidget = () => {
        const config = {
            selectHandler: handleAnnotationSelection
        };

        KGSearchWidget(API_KEY, knowledgeSearchInput, config);
    };

    // add listeners to canvas and window
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // handle mode switching (between drawing and annotating)
    document.getElementById('switch_mode').addEventListener('click', (event) => {
        if (window.mode === 'drawing') {
            window.mode = 'annotating';
            event.target.innerHTML = 'Switch to drawing';
        } else {
            window.mode = 'drawing';
            event.target.innerHTML = 'Switch to annotating';
        }

        isAnnotating = false;
    });

    initKGWidget();

    // expose functions for use by other files
    return {
        loadCachedAnnotations,
        createAnnotation,
        storeAnnotation,
        clearAnnotations
    };
})();

// socket.io handler
socket.on('annotation', (room, senderUsername, annotation) => {
    // ignore if originated from the current user
    if (username === senderUsername)
        return;

    KnowledgeAnnotations.createAnnotation(annotation);
    KnowledgeAnnotations.storeAnnotation(annotation);
});