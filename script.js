// ELEMENTS & VARIABLES ======================================
const canvasContainer = document.getElementById("canvas-container");
const selectModeButton = document.getElementById("select-mode");
const eraseModeButton = document.getElementById("erase-mode");
const drawModeButton = document.getElementById("draw-mode");
const lineModeButton = document.getElementById("line-mode");
const brushWidthSlider = document.getElementById("brush-width");
const brushOpacitySlider = document.getElementById("brush-opacity");
const opacitySizeLabel = document.getElementById("opacity-size-label");
const brushColorPicker = document.getElementById("brush-color");
const brushSizeLabel = document.querySelector('label[for="brush-width"]');
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");
const clearDrawingButton = document.getElementById("clear-drawing");
const copyButton = document.getElementById("copy-button");
const addImageButton = document.getElementById("add-image");
let lines = [];

// Variables
const defaultBrushSize = 7;
let isLineModeActive = false;
let startPoint = { x: 0, y: 0 };
let lineInProgress = null;

// CANVAS =========================================
const canvas = new fabric.Canvas("canvas", {
  isDrawingMode: true,
  width: 912,
  height: 712,
  backgroundColor: "#fff",
  historyUndo: [],
  historyRedo: [],
  preserveObjectStacking: true, // Prevent selected objects from being brought to the front
});

// Set Active Tool
function setActiveTool(button) {
  const activeToolClass = "active-tool";
  const activeButton = document.querySelector("." + activeToolClass);
  if (activeButton) {
    activeButton.classList.remove(activeToolClass);
  }
  button.classList.add(activeToolClass);
}

// OPACITY & COLOR ===========================================
brushOpacitySlider.addEventListener("input", updateBrushOpacityAndColor);
brushColorPicker.addEventListener("input", updateBrushOpacityAndColor);
updateBrushOpacityAndColor();

function updateBrushOpacityAndColor() {
  const opacity = brushOpacitySlider.value;
  const color = brushColorPicker.value;
  const rgbaColor = hexToRGBA(color, opacity);
  canvas.freeDrawingBrush.strokeOpacity = opacity;
  canvas.freeDrawingBrush.color = rgbaColor;
  opacitySizeLabel.textContent = opacity;
}

function hexToRGBA(hex, opacity) {
  const hexValue = hex.replace("#", "");
  const r = parseInt(hexValue.substring(0, 2), 16);
  const g = parseInt(hexValue.substring(2, 4), 16);
  const b = parseInt(hexValue.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// EVENT LISTENERS ===========================================
selectModeButton.addEventListener("click", function () {
  isLineModeActive = false;
  canvas.isDrawingMode = false;
  canvas.selection = true;
  setActiveTool(selectModeButton);
  canvas.forEachObject(function (obj) {
    obj.selectable = true;
    obj.evented = true;
  });
});

eraseModeButton.addEventListener("click", function () {
  canvas.isDrawingMode = true;
  canvas.selection = false;
  canvas.freeDrawingBrush.color = "white";
  setActiveTool(eraseModeButton);
  canvas.forEachObject(function (obj) {
    obj.selectable = false;
  });
  isLineModeActive = false;
});

drawModeButton.addEventListener("click", function () {
  isLineModeActive = false;
  updateBrushOpacityAndColor();
  canvas.isDrawingMode = true;
  canvas.selection = false;
  setActiveTool(drawModeButton);
});

brushWidthSlider.addEventListener("input", function () {
  const size = parseInt(this.value, 10) || 1;
  canvas.freeDrawingBrush.width = size;
  brushSizeLabel.textContent = size;
});

opacitySizeLabel.textContent = brushOpacitySlider.value;
canvas.freeDrawingBrush.width = defaultBrushSize;
brushWidthSlider.value = defaultBrushSize;
brushSizeLabel.textContent = defaultBrushSize;

lineModeButton.addEventListener("click", function () {
  isLineModeActive = !isLineModeActive;
  setActiveTool(lineModeButton);

  if (isLineModeActive) {
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.forEachObject(function (obj) {
      obj.selectable = false;
    });
    lines.forEach(function (existingLine) {
      existingLine.selectable = false;
    });
  } else {
    canvas.isDrawingMode = true;
    setActiveTool(drawModeButton);
  }
});

canvas.on("mouse:down", function (options) {
  if (isLineModeActive) {
    startPoint = canvas.getPointer(options.e);
    var points = [startPoint.x, startPoint.y, startPoint.x, startPoint.y];
    const color = brushColorPicker.value;
    const opacity = brushOpacitySlider.value;
    const rgbaColor = hexToRGBA(color, opacity);
    const size = parseInt(brushWidthSlider.value, 10) || 1;
    lineInProgress = new fabric.Line(points, {
      strokeWidth: size,
      fill: rgbaColor,
      stroke: rgbaColor,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    canvas.add(lineInProgress);
  }
});

canvas.on("mouse:up", function (options) {
  if (isLineModeActive) {
    const color = brushColorPicker.value;
    const opacity = brushOpacitySlider.value;
    const rgbaColor = hexToRGBA(color, opacity);
    const size = parseInt(brushWidthSlider.value, 10) || 1;
    var pointer = canvas.getPointer(options.e);
    var points = [startPoint.x, startPoint.y, pointer.x, pointer.y];
    var line = new fabric.Line(points, {
      strokeWidth: size,
      fill: rgbaColor,
      stroke: rgbaColor,
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
    });
    canvas.remove(lineInProgress);
    canvas.add(line);
    canvas.renderAll();
    lineInProgress = null;
    lines.push(line);
  }
  updateCanvasHistory();
});

canvas.on("mouse:move", function (options) {
  if (isLineModeActive && lineInProgress) {
    var pointer = canvas.getPointer(options.e);
    lineInProgress.set({ x2: pointer.x, y2: pointer.y });
    canvas.renderAll();
  }
});

// HISTORY ===========================================

// Initialize history stacks
canvas.historyUndo = [];
canvas.historyRedo = [];

// Update Canvas History Function
function updateCanvasHistory() {
  // Save the current state to the undo stack
  const currentState = JSON.stringify(canvas.toJSON());

  // Prevent duplicate states being pushed consecutively
  if (
    canvas.historyUndo.length === 0 ||
    canvas.historyUndo[canvas.historyUndo.length - 1] !== currentState
  ) {
    canvas.historyUndo.push(currentState);
  }

  // Clear the redo stack after a new change
  canvas.historyRedo = [];

  // Enable or disable undo/redo buttons based on the history stacks
  updateHistoryButtons();
}

// Undo Function
function undo() {
  if (canvas.historyUndo.length > 1) {
    // Move the current state from the undo stack to the redo stack
    const currentState = canvas.historyUndo.pop();
    canvas.historyRedo.push(currentState);

    // Load the previous state from the undo stack
    const previousState = canvas.historyUndo[canvas.historyUndo.length - 1];
    canvas.loadFromJSON(previousState, function () {
      canvas.renderAll();
    });
  }

  updateHistoryButtons();
}

// Redo Function
function redo() {
  if (canvas.historyRedo.length > 0) {
    // Move the next state from the redo stack to the undo stack
    const nextState = canvas.historyRedo.pop();
    canvas.historyUndo.push(nextState);

    // Load the next state from the redo stack
    canvas.loadFromJSON(nextState, function () {
      canvas.renderAll();
    });
  }

  updateHistoryButtons();
}

// Enable/Disable Undo and Redo Buttons
function updateHistoryButtons() {
  undoButton.disabled = canvas.historyUndo.length <= 1;
  redoButton.disabled = canvas.historyRedo.length === 0;
}

// Attach event listeners for undo/redo buttons
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);

// Update history on certain canvas actions
canvas.on("object:added", updateCanvasHistory);
canvas.on("object:modified", updateCanvasHistory);
canvas.on("object:removed", updateCanvasHistory);
canvas.on("mouse:up", updateCanvasHistory);

// Key events for undo and redo
document.addEventListener("keydown", function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    e.shiftKey
  ) {
    e.preventDefault();
    redo();
  }
});

// COPY & PASTE ===========================================
// Existing clipboard variable
let _clipboard;

// Copy Function
function Copy() {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    activeObject.clone(function (cloned) {
      _clipboard = cloned;
    });
  }
}

// Cut Function
function Cut() {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    activeObject.clone(function (cloned) {
      _clipboard = cloned;
      canvas.remove(activeObject); // Remove the selected object from the canvas
    });
  }
}

// Paste Function
function Paste() {
  if (_clipboard) {
    _clipboard.clone(function (clonedObj) {
      canvas.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true,
      });
      if (clonedObj.type === "activeSelection") {
        clonedObj.canvas = canvas;
        clonedObj.forEachObject(function (obj) {
          canvas.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvas.add(clonedObj);
      }
      _clipboard.top += 10;
      _clipboard.left += 10;
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
    });
  }
}

// Add event listener for keyboard shortcuts
document.addEventListener("keydown", function (e) {
  const activeObject = canvas.getActiveObject(); // Get the currently selected object

  // Detect the Delete key or Command-X (cut) key combination
  if ((e.key === "Delete" || e.key === "Backspace") && activeObject) {
    e.preventDefault();
    Cut();
  } else if (
    e.key.toLowerCase() === "x" &&
    (e.ctrlKey || e.metaKey) &&
    activeObject
  ) {
    e.preventDefault();
    Cut();
  } else if (
    e.key.toLowerCase() === "c" &&
    (e.ctrlKey || e.metaKey) &&
    activeObject
  ) {
    e.preventDefault();
    Copy();
  } else if (e.key.toLowerCase() === "v" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    Paste();
  } else if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    !e.shiftKey
  ) {
    e.preventDefault();
    undo();
  } else if (
    (e.ctrlKey || e.metaKey) &&
    e.key.toLowerCase() === "z" &&
    e.shiftKey
  ) {
    e.preventDefault();
    redo();
  }
});

// Copy button event listener
copyButton.addEventListener("click", function () {
  Copy();
  Paste();
});

// Clear Drawing button event listener remains unchanged
document.getElementById("clear-drawing").addEventListener("click", function () {
  canvas.clear();
  canvas.backgroundColor = "#fff";
});

canvas.on("object:added", function (e) {
  if (e.target.shadow) {
    e.target.selectable = false;
    e.target.evented = false;
  }
});

canvas.on("object:modified", function (e) {
  if (e.target.shadow) {
    e.target.selectable = false;
    e.target.evented = false;
  }
});

// Save as PNG
// Save Image button event listener
document.getElementById("save-image").addEventListener("click", function () {
  saveCanvasAsImage();
});

function saveCanvasAsImage() {
  // Convert the canvas content to a data URL
  const dataURL = canvas.toDataURL({
    format: "png",
    multiplier: 1,
  });

  // Create a temporary link element
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "canvas-image.png"; // Set the default name for the downloaded file

  // Trigger a click event on the link to start the download
  link.click();
}

// Upload Image
const imageUploadInput = document.getElementById("image-upload");

addImageButton.addEventListener("click", function () {
  imageUploadInput.click(); // Trigger the file input click
});

imageUploadInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (f) {
      fabric.Image.fromURL(f.target.result, function (img) {
        // Calculate the scale to 50% of the canvas size
        const scaleFactor = Math.min(
          (canvas.width * 0.5) / img.width,
          (canvas.height * 0.5) / img.height
        );
        img.scale(scaleFactor);

        // Center the image on the canvas
        img.set({
          left: (canvas.width - img.width * scaleFactor) / 2,
          top: (canvas.height - img.height * scaleFactor) / 2,
        });

        canvas.add(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  }
});

/// Flatten Canvas button event listener
document
  .getElementById("flatten-canvas")
  .addEventListener("click", function () {
    confirmFlattenCanvas();
  });

function confirmFlattenCanvas() {
  // Show a confirmation dialog to the user
  const userConfirmed = window.confirm(
    "Are you sure you want to flatten all elements into a single image? This action cannot be undone."
  );

  // If the user confirms, proceed with flattening the canvas
  if (userConfirmed) {
    flattenCanvas();
  }
}

function flattenCanvas() {
  // Convert the current canvas to a data URL
  const dataURL = canvas.toDataURL({
    format: "png",
    multiplier: 1,
  });

  // Clear the canvas of all objects
  canvas.clear();

  // Create a new image element from the data URL
  fabric.Image.fromURL(dataURL, function (img) {
    // Set the image to be the full size of the canvas
    img.set({
      left: 0,
      top: 0,
      scaleX: canvas.width / img.width,
      scaleY: canvas.height / img.height,
      selectable: false,
      evented: false,
    });

    // Add the image to the canvas
    canvas.add(img);
    canvas.renderAll();
  });
}

// Background Color Picker
const backgroundColorPicker = document.getElementById(
  "background-color-picker"
);

backgroundColorPicker.addEventListener("input", function () {
  changeBackgroundColor(this.value);
});

function changeBackgroundColor(color) {
  canvas.backgroundColor = color;
  canvas.renderAll();
}

// Zoom and Pan Functionality
// Enable zooming and panning
canvas.on("mouse:wheel", function (opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  canvas.setZoom(zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});

canvas.on("mouse:down", function (opt) {
  var evt = opt.e;
  if (evt.altKey === true) {
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  }
});

canvas.on("mouse:move", function (opt) {
  if (this.isDragging) {
    var e = opt.e;
    var vpt = this.viewportTransform;
    vpt[4] += e.clientX - this.lastPosX;
    vpt[5] += e.clientY - this.lastPosY;
    this.requestRenderAll();
    this.lastPosX = e.clientX;
    this.lastPosY = e.clientY;
  }
});

canvas.on("mouse:up", function (opt) {
  // on mouse up we want to recalculate new interaction
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;
});

// Text Tool Functionality
const textToolButton = document.getElementById("text-tool");
const textInput = document.getElementById("text-input");

textToolButton.addEventListener("click", function () {
  setActiveTool(textToolButton);
  textInput.style.display = "inline-block";
  textInput.focus();
});

textInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    const text = new fabric.Text(textInput.value, {
      left: 100,
      top: 100,
      fill: brushColorPicker.value,
      fontSize: 20,
    });
    canvas.add(text);
    textInput.value = "";
    textInput.style.display = "none";
  }
});

//Shape Tool Functionality
const rectToolButton = document.getElementById("rect-tool");
const circleToolButton = document.getElementById("circle-tool");

rectToolButton.addEventListener("click", function () {
  setActiveTool(rectToolButton);
  const rect = new fabric.Rect({
    left: 100,
    top: 100,
    fill: brushColorPicker.value,
    width: 50,
    height: 50,
  });
  canvas.add(rect);
});

circleToolButton.addEventListener("click", function () {
  setActiveTool(circleToolButton);
  const circle = new fabric.Circle({
    left: 150,
    top: 150,
    fill: brushColorPicker.value,
    radius: 30,
  });
  canvas.add(circle);
});

// Arrange Elements Functionality
const bringForwardButton = document.createElement("button");
bringForwardButton.innerHTML = '<i class="fas fa-arrow-up"></i> Bring Forward';
document.getElementById("toolbar").appendChild(bringForwardButton);

const sendBackwardButton = document.createElement("button");
sendBackwardButton.innerHTML =
  '<i class="fas fa-arrow-down"></i> Send Backward';
document.getElementById("toolbar").appendChild(sendBackwardButton);

const bringToFrontButton = document.createElement("button");
bringToFrontButton.innerHTML =
  '<i class="fas fa-angle-double-up"></i> Bring to Front';
document.getElementById("toolbar").appendChild(bringToFrontButton);

const sendToBackButton = document.createElement("button");
sendToBackButton.innerHTML =
  '<i class="fas fa-angle-double-down"></i> Send to Back';
document.getElementById("toolbar").appendChild(sendToBackButton);

// Bring Forward Button Functionality
bringForwardButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.bringForward(activeObject);
  }
});

// Send Backward Button Functionality
sendBackwardButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    activeObject.set({ opacity: 0.5 }); // Optional: Change opacity for feedback
    canvas.sendBackwards(activeObject, true);
    canvas.renderAll(); // Keep the object selected after moving
    setTimeout(() => {
      activeObject.set({ opacity: 1 }); // Reset opacity after the move
      canvas.renderAll();
    }, 200); // Timeout for visual feedback
  }
});

// Bring to Front Button Functionality
bringToFrontButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.bringToFront(activeObject); // Move the object to the front of the stack
    console.log("Object brought to the front of the stack.");
  }
});

// Send to Back Button Functionality
sendToBackButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.sendToBack(activeObject); // Move the object to the back of the stack
    console.log("Object sent to the back of the stack.");
  }
});

////////////////

//Auto-save Functionality
window.addEventListener("beforeunload", function () {
  const canvasState = JSON.stringify(canvas.toJSON());
  localStorage.setItem("canvasState", canvasState);
});

window.addEventListener("load", function () {
  const savedState = localStorage.getItem("canvasState");
  if (savedState) {
    canvas.loadFromJSON(savedState, function () {
      canvas.renderAll();
    });
  }
});

//Move toolbar functionality
const toolbar = document.getElementById("toolbar");
const optionsToolbar = document.getElementById("options-toolbar");
const dragHandle = document.getElementById("drag-handle");

let isDragging = false;
let startX, startY, initialLeft, initialTop;

// Function to handle the start of dragging
dragHandle.addEventListener("mousedown", function (e) {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  initialLeft = toolbar.offsetLeft;
  initialTop = toolbar.offsetTop;
  document.body.style.userSelect = "none"; // Prevent text selection while dragging
});

// Function to handle the dragging movement
document.addEventListener("mousemove", function (e) {
  if (isDragging) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    toolbar.style.position = "absolute";
    toolbar.style.left = `${initialLeft + dx}px`;
    toolbar.style.top = `${initialTop + dy}px`;

    // Move the options toolbar along with the main toolbar
    optionsToolbar.style.position = "absolute";
    optionsToolbar.style.left = `${initialLeft + dx}px`;
    optionsToolbar.style.top = `${initialTop + dy + toolbar.offsetHeight}px`;
  }
});

// Function to handle the end of dragging
document.addEventListener("mouseup", function () {
  if (isDragging) {
    isDragging = false;
    document.body.style.userSelect = "auto"; // Re-enable text selection
  }
});

//Canvas Resize Functionality
function resizeCanvas() {
  canvas.setWidth(window.innerWidth);
  canvas.setHeight(window.innerHeight);
  canvas.calcOffset(); // Recalculate the canvas offset
}

// Call resizeCanvas on window resize
window.addEventListener("resize", resizeCanvas);

// Initial canvas resize to fill the window
resizeCanvas();
