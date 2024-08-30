    
    // Initialize Fabric.js canvas
    var canvas = new fabric.Canvas('canvas-container', {
        isDrawingMode: true // Enable drawing mode
      });

      // Set canvas dimensions
        canvas.setHeight(512);
        canvas.setWidth(512);
  
      // Customize brush options
      canvas.freeDrawingBrush.width = 5;
      canvas.freeDrawingBrush.color = 'black';
  
      // Disable default right-click menu on the canvas
      canvas.on('contextmenu', function (e) {
        e.preventDefault();
      });
  


// Clear-drawing button clears the canvas ====================
document.getElementById('clear-drawing').addEventListener('click', function () {
    canvas.clear();
    });
 
// save-drawing button downloads the image as png ====================
document.getElementById('save-drawing').addEventListener('click', function () {

    // Get the canvas screenshot as PNG
    var screenshot = canvas.toDataURL({
      format: 'png'
    });
  
    // Create an <a> tag
    var downloadLink = document.createElement('a');
    // Set link's href to point to the DataURL of the image
    downloadLink.href = screenshot;
    // Set link's download attribute (name of the file to be downloaded)
    downloadLink.download = 'my-canvas.png';
  
    // Append the link to the body
    document.body.appendChild(downloadLink);
    // Trigger a click on the element
    downloadLink.click();
    // Remove the element from the DOM
    document.body.removeChild(downloadLink);
  }
    );

