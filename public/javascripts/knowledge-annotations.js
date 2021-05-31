// using the module pattern not to pollute namespace with global variables
(() => {

    const API_KEY = 'AIzaSyAG7w627q-djB4gTTahssufwNOImRqdYKM';

    // array keeping the annotation rectangle elements
    const rectangles = [];

    const canvas = document.getElementById('canvas');
    const modal = document.getElementById('knowledge-modal');

    let startPos = { x: 0, y: 0 };

    let isAnnotating = false;

    const handleMouseDown = (event) => {
        if(mode !== 'annotating')
            return;

        isAnnotating = true;

        // update start position
        startPos.x = event.offsetX;
        startPos.y = event.offsetY;

        // create new annotation rectangle
        const newRect = document.createElement('div');
        newRect.classList.add('rect');
        canvas.insertAdjacentElement('afterend', newRect);
        rectangles.push(newRect);

        // register rectangle resize event
        window.addEventListener('mousemove', handleRectangleResize);
    };

    const handleRectangleResize = (event) => {
        if(!isAnnotating)
            return;

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
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

        const rectElement = rectangles[rectangles.length - 1];

        rectElement.style.left = canvasLeft + x + 'px';
        rectElement.style.top = canvasTop + y + 'px';

        rectElement.style.width = width + 'px';
        rectElement.style.height = height + 'px';
    };

    const handleMouseUp = () => {
        if(!isAnnotating)
            return;

        isAnnotating = false;

        // remove resize listener
        window.removeEventListener('mousemove', handleRectangleResize);

        // change class of the newly drawn rectangle
        const rectElement = rectangles[rectangles.length - 1];
        rectElement.classList.add('rect-finished');

        // show annotation modal
        modal.classList.remove('hidden');
    };

    // event firing after selecting an element in the KG widget
    const handleAnnotationSelection = (event) => {
        console.log(event);

        const { name, id, rc: description, qc: url } = event.row;

        // append tooltip with fetched information to the annotation rectangle
        const rectElement = rectangles[rectangles.length - 1];
        rectElement.innerHTML = `
            <div class="tooltip">
                <h4>${name}</h4>
                <p>ID: ${id}</p>
                <p>Description: ${description}</p>
                <a href="${url}" target="_blank">Link</a>
            </div>
        `;

        modal.classList.add('hidden');
    }

    const initKGWidget = () => {
        const config = {
            selectHandler: handleAnnotationSelection
        };

        KGSearchWidget(API_KEY, document.getElementById('knowledge-search'), config);
    };

    // add listeners to canvas
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // handle mode switching (between drawing and annotating)
    document.getElementById('switch_mode').addEventListener('click', (event) => {
       if(window.mode === 'drawing') {
           window.mode = 'annotating';
           event.target.innerHTML = 'Switch to drawing';
       } else {
           window.mode = 'drawing';
           event.target.innerHTML = 'Switch to annotating';
       }

       isAnnotating = false;
    });

    initKGWidget();
})();