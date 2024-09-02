// DOM element selections
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

// Application state variables
const defaultBrushSize = 7;
let isLineModeActive = false;
let startPoint = { x: 0, y: 0 };
let lineInProgress = null;
let lines = [];

// Initialize Fabric.js canvas
// Initialize Fabric.js canvas
const canvas = new fabric.Canvas("canvas", {
  isDrawingMode: true,
  width: 912,
  height: 712,
  backgroundColor: "#202020",
  historyUndo: [],
  historyRedo: [],
  preserveObjectStacking: true,
});

// Create a frame automatically after canvas initialization
let activeFrame = null;

// Use canvas.getWidth() and canvas.getHeight() to get the actual size
const canvasWidth = canvas.getWidth();
const canvasHeight = canvas.getHeight();
const size = Math.min(canvasWidth, canvasHeight) * 0.75; // Adjust the size as needed

// Ensure the frame stays at the back when new objects are added
canvas.on("object:added", function (e) {
  if (activeFrame && e.target !== activeFrame) {
    canvas.sendToBack(activeFrame); // Send the frame to the back
  }
});

// Utility function to update active tool UI and show/hide toolbars
function setActiveTool(button) {
  const activeToolClass = "active-tool";
  const activeButton = document.querySelector("." + activeToolClass);
  if (activeButton) {
    activeButton.classList.remove(activeToolClass);
  }
  button.classList.add(activeToolClass);

  // Show/hide select-options-toolbar based on the active tool
  if (button === selectModeButton) {
    selectOptionsToolbar.style.display = "flex";
  } else {
    selectOptionsToolbar.style.display = "none";
  }

  updateToolbarPositions();
}

// Convert hex color to RGBA
function hexToRGBA(hex, opacity) {
  const hexValue = hex.replace("#", "");
  const r = parseInt(hexValue.substring(0, 2), 16);
  const g = parseInt(hexValue.substring(2, 4), 16);
  const b = parseInt(hexValue.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// Update brush opacity and color
function updateBrushOpacityAndColor() {
  const opacity = brushOpacitySlider.value;
  const color = brushColorPicker.value;
  const rgbaColor = hexToRGBA(color, opacity);
  canvas.freeDrawingBrush.strokeOpacity = opacity;
  canvas.freeDrawingBrush.color = rgbaColor;
  opacitySizeLabel.textContent = opacity;
}

brushOpacitySlider.addEventListener("input", function () {
  if (canvas.isDrawingMode) {
    updateBrushOpacityAndColor();
  } else {
    updateSelectedObjectsOpacity();
  }
});

// Update color of selected objects
function updateSelectedObjectsColor() {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length > 0) {
    const color = brushColorPicker.value;
    activeObjects.forEach((obj) => {
      if (obj.fill) {
        obj.set("fill", color);
      }
      if (obj.stroke) {
        obj.set("stroke", color);
      }
    });
    canvas.renderAll();
    updateCanvasHistory();
  }
}

function updateSelectedObjectsOpacity() {
  const activeObjects = canvas.getActiveObjects();
  const newOpacity = parseFloat(brushOpacitySlider.value);

  if (activeObjects.length > 0) {
    activeObjects.forEach((obj) => {
      obj.set("opacity", newOpacity);
    });
    canvas.renderAll();
    updateCanvasHistory();
  }
}

// Update size of selected brush stroke
function updateSelectedBrushStrokeSize() {
  const activeObjects = canvas.getActiveObjects();
  const newWidth = parseInt(brushWidthSlider.value);

  activeObjects.forEach((obj) => {
    if (obj.type === "path") {
      obj.set("strokeWidth", newWidth);
    }
  });

  canvas.renderAll();
  updateCanvasHistory();
}

// Event listener for brush width slider
brushWidthSlider.addEventListener("input", function () {
  if (canvas.isDrawingMode) {
    canvas.freeDrawingBrush.width = parseInt(this.value);
  } else {
    updateSelectedBrushStrokeSize();
  }
});

// Event listener for color picker
brushColorPicker.addEventListener("input", function () {
  if (canvas.isDrawingMode) {
    updateBrushOpacityAndColor();
  } else {
    updateSelectedObjectsColor();
  }
});

// Initialize brush settings
updateBrushOpacityAndColor();

// Mode change event listeners
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

drawModeButton.addEventListener("click", function () {
  isLineModeActive = false;
  updateBrushOpacityAndColor();
  canvas.isDrawingMode = true;
  canvas.selection = false;
  setActiveTool(drawModeButton);
});

eraseModeButton.addEventListener("click", function () {
  isLineModeActive = false;
  canvas.isDrawingMode = true;
  canvas.selection = false;
  canvas.freeDrawingBrush.color = "white";
  setActiveTool(eraseModeButton);
  canvas.forEachObject(function (obj) {
    obj.selectable = false;
  });
});

lineModeButton.addEventListener("click", function () {
  isLineModeActive = !isLineModeActive;
  setActiveTool(lineModeButton);
  if (isLineModeActive) {
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair"; // Set crosshair cursor when line mode is active
    canvas.forEachObject(function (obj) {
      obj.selectable = false;
    });
    lines.forEach(function (existingLine) {
      existingLine.selectable = false;
    });
  } else {
    canvas.isDrawingMode = true;
    canvas.selection = true;
    canvas.defaultCursor = "crosshair"; // Reset cursor to default when line mode is inactive
    setActiveTool(drawModeButton);
  }
});

// Brush width change listener
brushWidthSlider.addEventListener("input", function () {
  const size = parseInt(this.value, 10) || 1;
  canvas.freeDrawingBrush.width = size;
  brushSizeLabel.textContent = size;
});

// Initialize UI values
opacitySizeLabel.textContent = brushOpacitySlider.value;
canvas.freeDrawingBrush.width = defaultBrushSize;
brushWidthSlider.value = defaultBrushSize;
brushSizeLabel.textContent = defaultBrushSize;

// Line drawing handling
canvas.on("mouse:down", function (options) {
  if (isLineModeActive) {
    canvas.selection = false; // Disable selection
    canvas.defaultCursor = "crosshair";
    startPoint = canvas.getPointer(options.e);
    const points = [startPoint.x, startPoint.y, startPoint.x, startPoint.y];
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

canvas.on("mouse:move", function (options) {
  if (isLineModeActive && lineInProgress) {
    canvas.selection = false; // Disable selection

    const pointer = canvas.getPointer(options.e);
    lineInProgress.set({ x2: pointer.x, y2: pointer.y });
    canvas.renderAll();
  }
});

canvas.on("mouse:up", function () {
  if (isLineModeActive && lineInProgress) {
    const color = brushColorPicker.value;
    const opacity = brushOpacitySlider.value;
    const rgbaColor = hexToRGBA(color, opacity);
    const size = parseInt(brushWidthSlider.value, 10) || 1;
    const endPoint = canvas.getPointer(event.e);
    const points = [startPoint.x, startPoint.y, endPoint.x, endPoint.y];

    const line = new fabric.Line(points, {
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
    lineInProgress = null;
    lines.push(line);
    canvas.renderAll();
    updateCanvasHistory();
  }
  canvas.selection = true; // Re-enable selection after drawing
  canvas.defaultCursor = "default"; // Reset cursor to default
});

// History management
function updateCanvasHistory() {
  const currentState = JSON.stringify(canvas.toJSON());
  if (
    canvas.historyUndo.length === 0 ||
    canvas.historyUndo[canvas.historyUndo.length - 1] !== currentState
  ) {
    canvas.historyUndo.push(currentState);
  }
  canvas.historyRedo = [];
  updateHistoryButtons();
}

function undo() {
  if (canvas.historyUndo.length > 1) {
    const currentState = canvas.historyUndo.pop();
    canvas.historyRedo.push(currentState);
    const previousState = canvas.historyUndo[canvas.historyUndo.length - 1];
    canvas.loadFromJSON(previousState, function () {
      canvas.renderAll();
    });
  }
  updateHistoryButtons();
}

function redo() {
  if (canvas.historyRedo.length > 0) {
    const nextState = canvas.historyRedo.pop();
    canvas.historyUndo.push(nextState);
    canvas.loadFromJSON(nextState, function () {
      canvas.renderAll();
    });
  }
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoButton.disabled = canvas.historyUndo.length <= 1;
  redoButton.disabled = canvas.historyRedo.length === 0;
}

// Attach event listeners for undo/redo
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);

// Update history on canvas actions
canvas.on("object:added", updateCanvasHistory);
canvas.on("object:modified", updateCanvasHistory);
canvas.on("object:removed", updateCanvasHistory);
canvas.on("mouse:up", updateCanvasHistory);

// Keyboard shortcuts for undo and redo
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

// Copy and paste functionality
let _clipboard;

function Copy() {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    activeObject.clone(function (cloned) {
      _clipboard = cloned;
    });
  }
}

function Cut() {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    activeObject.clone(function (cloned) {
      _clipboard = cloned;
      canvas.remove(activeObject);
    });
  }
}

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

// Keyboard shortcuts for various actions
document.addEventListener("keydown", function (e) {
  const activeObject = canvas.getActiveObject();

  if ((e.key === "Delete" || e.key === "Backspace") && activeObject) {
    e.preventDefault();
    if (activeObject.type === "activeSelection") {
      activeObject.forEachObject(function (obj) {
        canvas.remove(obj);
      });
      canvas.discardActiveObject();
      canvas.renderAll();
    } else {
      canvas.remove(activeObject);
    }
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

// Copy button functionality
copyButton.addEventListener("click", function () {
  Copy();
  Paste();
});

document.getElementById("clear-drawing").addEventListener("click", function () {
  // Clear the canvas and reset its properties
  canvas.clear();
  resizeCanvas(); // Call this after initializing the canvas
  canvas.setZoom(1); // Ensure zoom is reset
  initializeFrame();
  canvas.backgroundColor = "#202020";
  canvas.setZoom(1);

  // Reinitialize the frame
  initializeFrame();
});

//clear-drawing simulate
document.getElementById("clear-drawing").click();
resizeCanvas(); // Call this after initializing the canvas

// Function to initialize the frame
function initializeFrame() {
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  const size = Math.min(canvasWidth, canvasHeight) * 0.6; // Adjust the size as needed

  // Create a new frame (Rect object in Fabric.js) with a dashed line
  activeFrame = new fabric.Rect({
    left: canvasWidth / 2, // Adjust left offset to center horizontally
    top: canvasHeight * 0.45, // Center the frame vertically
    width: size * 1.77777777778,
    height: size,
    fill: "#f0f0f0",
    stroke: "black", // Stroke color
    strokeWidth: 1, // 1 pixel stroke width
    strokeDashArray: [5, 5], // Dashed line: 5 pixels dash, 5 pixels gap
    originX: "center",
    originY: "center",
    selectable: true,
    hasControls: true,
    hasBorders: true,
  });

  // Add the frame to the canvas and recalculate offsets
  canvas.add(activeFrame);
  canvas.calcOffset();
}

// Object added and modified event handlers
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

// Save as PNG functionality
document.getElementById("save-image").addEventListener("click", function () {
  saveCanvasAsImage();
});

function saveCanvasAsImage() {
  const dataURL = canvas.toDataURL({
    format: "png",
    multiplier: 1,
  });
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "canvas-image.png";
  link.click();
}

// Upload image functionality
const imageUploadInput = document.getElementById("image-upload");

addImageButton.addEventListener("click", function () {
  imageUploadInput.click();
});

imageUploadInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (f) {
      fabric.Image.fromURL(f.target.result, function (img) {
        const scaleFactor = Math.min(
          (canvas.width * 0.5) / img.width,
          (canvas.height * 0.5) / img.height
        );
        img.scale(scaleFactor);
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

// Flatten canvas functionality
document
  .getElementById("flatten-canvas")
  .addEventListener("click", function () {
    confirmFlattenCanvas();
  });

function confirmFlattenCanvas() {
  const userConfirmed = window.confirm(
    "Are you sure you want to flatten all elements into a single image? This action cannot be undone."
  );
  if (userConfirmed) {
    flattenCanvas();
  }
}

function flattenCanvas() {
  const dataURL = canvas.toDataURL({
    format: "png",
    multiplier: 1,
  });
  canvas.clear();
  fabric.Image.fromURL(dataURL, function (img) {
    img.set({
      left: 0,
      top: 0,
      scaleX: canvas.width / img.width,
      scaleY: canvas.height / img.height,
      selectable: false,
      evented: false,
    });
    canvas.add(img);
    canvas.renderAll();
  });
}

// Background color picker functionality
const backgroundColorPicker = document.getElementById(
  "background-color-picker"
);

backgroundColorPicker.addEventListener("input", function () {
  changeFrameColor(this.value);
});

function changeFrameColor(color) {
  canvas.getObjects().forEach((obj) => {
    if (obj.type === "rect" && obj.strokeDashArray) {
      obj.set("fill", color);
    }
  });
  canvas.renderAll();
}

// Zoom and pan functionality
canvas.on("mouse:wheel", function (opt) {
  const delta = opt.e.deltaY;
  let zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;

  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;

  const pointer = canvas.getPointer(opt.e);
  const zoomPointX = pointer.x;
  const zoomPointY = pointer.y;

  // Calculate the new viewport position
  canvas.zoomToPoint({ x: zoomPointX, y: zoomPointY }, zoom);

  opt.e.preventDefault();
  opt.e.stopPropagation();
});

//reset zoom
canvas.setZoom(1);

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
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;
});

// Text tool functionality
const textToolButton = document.getElementById("text-tool");

textToolButton.addEventListener("click", function () {
  setActiveTool(textToolButton);

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const fontSize = Math.min(windowWidth, windowHeight) * 0.25;

  const text = new fabric.IText("Text", {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: fontSize,
    fill: brushColorPicker.value,
    fontFamily: "Arial",
    editable: true,
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.renderAll();
  setActiveTool(selectModeButton);
});

// Enable double-click to edit text
canvas.on("mouse:dblclick", function (options) {
  const target = options.target;
  if (target && target.type === "i-text") {
    target.enterEditing();
    target.selectAll();
    canvas.requestRenderAll();
  }
});

// Exit text editing mode when clicking outside
canvas.on("mouse:down", function (options) {
  if (canvas.getActiveObject() && canvas.getActiveObject().type === "i-text") {
    const target = options.target;
    if (!target || target.type !== "i-text") {
      canvas.getActiveObject().exitEditing();
      canvas.requestRenderAll();
    }
  }
});

// Ensure text objects are selectable
canvas.on("object:added", function (e) {
  if (e.target && e.target.type === "i-text") {
    e.target.set({
      selectable: true,
      editable: true,
    });
  }
});

// Shape tool functionality
const rectToolButton = document.getElementById("rect-tool");
const circleToolButton = document.getElementById("circle-tool");

rectToolButton.addEventListener("click", function () {
  setActiveTool(rectToolButton);
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const size = Math.min(canvasWidth, canvasHeight) * 0.25;
  const rect = new fabric.Rect({
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    fill: brushColorPicker.value,
    width: size,
    height: size,
    originX: "center",
    originY: "center",
  });
  canvas.add(rect);
  //set current tool to select
  canvas.setActiveTool(selectModeButton);
  canvas.renderAll();
});

circleToolButton.addEventListener("click", function () {
  setActiveTool(circleToolButton);
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const radius = Math.min(canvasWidth, canvasHeight) * 0.125;
  const circle = new fabric.Circle({
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    fill: brushColorPicker.value,
    radius: radius,
    originX: "center",
    originY: "center",
  });
  canvas.add(circle);
  //set current tool to select
  canvas.setActiveTool(selectModeButton);
  canvas.renderAll();
});

// Arrange elements functionality
const bringForwardButton = document.getElementById("bring-forward-button");
const sendBackwardButton = document.getElementById("send-backward-button");
const bringToFrontButton = document.getElementById("bring-to-front-button");
const sendToBackButton = document.getElementById("send-to-back-button");

bringForwardButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.bringForward(activeObject);
  }
});

sendBackwardButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    activeObject.set({ opacity: 0.5 });
    canvas.sendBackwards(activeObject, true);
    canvas.renderAll();
    setTimeout(() => {
      activeObject.set({ opacity: 1 });
      canvas.renderAll();
    }, 200);
  }
});

bringToFrontButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.bringToFront(activeObject);
  }
});

sendToBackButton.addEventListener("click", function () {
  const activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.sendToBack(activeObject);
  }
});

// Auto-save functionality
// window.addEventListener("beforeunload", function () {
//   const canvasState = JSON.stringify(canvas.toJSON());
//   localStorage.setItem("canvasState", canvasState);
// });

// window.addEventListener("load", function () {
//   const savedState = localStorage.getItem("canvasState");
//   if (savedState) {
//     canvas.loadFromJSON(savedState, function () {
//       canvas.renderAll();
//     });
//   }
// });

// Drag functionality for toolbars
const toolbar = document.getElementById("toolbar");
const optionsToolbar = document.getElementById("options-toolbar");
const selectOptionsToolbar = document.getElementById("select-options-toolbar");
const docPanel = document.getElementById("doc-panel");

let isDragging = false;
let startX, startY, offsetX, offsetY;

toolbar.addEventListener("mousedown", function (e) {
  isDragging = true;
  const rect = toolbar.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  document.body.style.userSelect = "none";
  e.stopPropagation();
  e.preventDefault();
});

document.addEventListener("mousemove", function (e) {
  if (isDragging) {
    const newLeft = e.clientX - offsetX;
    const newTop = e.clientY - offsetY;
    toolbar.style.left = `${newLeft}px`;
    toolbar.style.top = `${newTop}px`;
    toolbar.style.bottom = "auto";
    toolbar.style.transform = "none";

    updateToolbarPositions();
  }
});

document.addEventListener("mouseup", function () {
  if (isDragging) {
    isDragging = false;
    document.body.style.userSelect = "auto";
  }
});

function resetToolbarPositions() {
  toolbar.style.left = "50%";
  toolbar.style.top = "auto";
  toolbar.style.bottom = "20px";
  toolbar.style.transform = "translateX(-50%)";

  updateToolbarPositions();
}

function updateToolbarPositions() {
  const toolbarRect = toolbar.getBoundingClientRect();
  const toolbarTop = toolbarRect.top;

  // Calculate the total width of both toolbars
  const totalWidth =
    optionsToolbar.offsetWidth + selectOptionsToolbar.offsetWidth;

  // Position optionsToolbar
  optionsToolbar.style.position = "absolute";
  optionsToolbar.style.left = `${
    toolbarRect.left + (toolbarRect.width - totalWidth) / 2
  }px`;
  optionsToolbar.style.top = `${
    toolbarTop - optionsToolbar.offsetHeight - 10
  }px`;
  optionsToolbar.style.bottom = "auto";
  optionsToolbar.style.transform = "none";

  // Position selectOptionsToolbar
  selectOptionsToolbar.style.position = "absolute";
  selectOptionsToolbar.style.left = `${
    toolbarRect.left +
    (toolbarRect.width - totalWidth) / 2 +
    optionsToolbar.offsetWidth +
    4
  }px`;
  selectOptionsToolbar.style.top = `${
    toolbarTop - selectOptionsToolbar.offsetHeight - 10
  }px`;
  selectOptionsToolbar.style.bottom = "auto";
  selectOptionsToolbar.style.transform = "none";
}

window.addEventListener("resize", updateToolbarPositions);
window.addEventListener("scroll", updateToolbarPositions);

toolbar.addEventListener("dblclick", resetToolbarPositions);
resetToolbarPositions();
toolbar.style.cursor = "move";

// Canvas resize functionality
function resizeCanvas() {
  canvas.setWidth(window.innerWidth);
  canvas.setHeight(window.innerHeight);
  canvas.calcOffset();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Add drag and drop functionality for images
canvasContainer.addEventListener("dragover", function (e) {
  e.preventDefault();
});

canvasContainer.addEventListener("drop", function (e) {
  e.preventDefault();
  console.log("File dropped");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    console.log("Valid image file detected");
    const reader = new FileReader();
    reader.onload = function (event) {
      console.log("File read successfully");
      fabric.Image.fromURL(
        event.target.result,
        function (img) {
          console.log("Image loaded by fabric.js");
          const scaleFactor = Math.min(
            (canvas.width * 0.5) / img.width,
            (canvas.height * 0.5) / img.height
          );
          img.scale(scaleFactor);

          // Get the pointer position relative to the canvas
          const pointer = canvas.getPointer(e);
          // Center the image on the cursor location
          img.set({
            left: pointer.x - (img.width * scaleFactor) / 2,
            top: pointer.y - (img.height * scaleFactor) / 2,
            originX: "left",
            originY: "top",
          });

          canvas.add(img);
          console.log("Image added to canvas");

          // Select the image
          canvas.setActiveObject(img);

          // Activate the select tool
          canvas.isDrawingMode = false;
          setActiveTool(selectModeButton);
          canvas.renderAll();
          console.log("Canvas rendered");
          updateCanvasHistory();
          console.log("Canvas history updated");
        },
        { crossOrigin: "anonymous" }
      );
    };
    reader.readAsDataURL(file);
  }
});

//=========================================================
//Frame Tool

// Ensure the frame stays at the back when new objects are added
canvas.on("object:added", function (e) {
  if (activeFrame && e.target !== activeFrame) {
    canvas.sendToBack(activeFrame); // Send the frame to the back
  }
});

// Function to create and update the clipping path
function updateClippingForObjects() {
  if (!activeFrame) return; // If no frame is active, exit the function

  const frameBounds = activeFrame.getBoundingRect();

  canvas.getObjects().forEach((obj) => {
    if (obj !== activeFrame) {
      const objBounds = obj.getBoundingRect();

      // Check if the object is completely outside the frame bounds
      if (
        objBounds.left > frameBounds.left + frameBounds.width ||
        objBounds.left + objBounds.width < frameBounds.left ||
        objBounds.top > frameBounds.top + frameBounds.height ||
        objBounds.top + objBounds.height < frameBounds.top
      ) {
        obj.clipPath = null; // Remove clipping if completely outside the frame
      }
      // Apply clipping if the object is at least partially within the frame
      else {
        obj.clipPath = new fabric.Rect({
          left: frameBounds.left,
          top: frameBounds.top,
          width: frameBounds.width,
          height: frameBounds.height,
          originX: "left",
          originY: "top",
          absolutePositioned: true,
        });
      }

      // Mark the object as dirty to force redraw
      obj.dirty = true;
      obj.setCoords(); // Recalculate the object's coordinates
    }
  });

  canvas.renderAll();
}

// Apply clipping to objects that intersect with the frame when moved or modified
canvas.on("object:moving", function () {
  if (activeFrame) updateClippingForObjects();
});

canvas.on("object:modified", function () {
  if (activeFrame) updateClippingForObjects();
});

//Download Frame
const downloadButton = document.getElementById("download-frame");

downloadButton.addEventListener("click", function () {
  if (activeFrame) {
    // Get the bounding rectangle of the frame
    const frameBounds = activeFrame.getBoundingRect();

    // Step 1: Capture the entire canvas as a PNG
    const fullCanvasDataURL = canvas.toDataURL({
      format: "png",
      multiplier: 1, // Adjust this for higher or lower resolution
    });

    // Step 2: Add the captured PNG back to the canvas as an image
    fabric.Image.fromURL(fullCanvasDataURL, function (img) {
      // Position the image exactly over the canvas
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });

      // Step 3: Create a cropped version of the image using the frame dimensions
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = frameBounds.width;
      croppedCanvas.height = frameBounds.height;
      const croppedCtx = croppedCanvas.getContext("2d");

      // Draw the relevant portion of the full canvas onto the cropped canvas
      croppedCtx.drawImage(
        img.getElement(), // The image element from fabric.js
        frameBounds.left, // Source x-coordinate (crop starting x)
        frameBounds.top, // Source y-coordinate (crop starting y)
        frameBounds.width, // Source width (crop width)
        frameBounds.height, // Source height (crop height)
        0, // Destination x (on the cropped canvas)
        0, // Destination y (on the cropped canvas)
        frameBounds.width, // Destination width
        frameBounds.height // Destination height
      );

      // Step 4: Convert the cropped canvas to a data URL and trigger the download
      const croppedDataURL = croppedCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = croppedDataURL;
      link.download = "frame.png";
      link.click();
    });
  } else {
    alert("No frame selected for download.");
  }
});

// Clear clipping paths when frame is deleted
function clearClippingPaths() {
  canvas.getObjects().forEach((obj) => {
    obj.clipPath = null;
  });
  canvas.renderAll();
}

// Example usage when frame is deleted
canvas.on("object:removed", function (e) {
  if (e.target === activeFrame) {
    activeFrame = null;
    clearClippingPaths();
  }
});
