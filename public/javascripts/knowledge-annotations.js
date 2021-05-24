// using the module pattern not to pollute namespace with global variables
(() => {
    const API_KEY = 'AIzaSyAG7w627q-djB4gTTahssufwNOImRqdYKM';

    // array keeping the annotation rectangle elements
    const rectangles = [];

    const canvas = document.getElementById('canvas');

    let startPos = { x: 0, y: 0 };

    let isAnnotating = false;

    const handleMouseDown = (event) => {
        // update start position
        startPos.x = event.offsetX;
        startPos.y = event.offsetY;

        isAnnotating = true;

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
        isAnnotating = false;

        // remove resize listener
        window.removeEventListener('mousemove', handleRectangleResize);
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
    });

})();