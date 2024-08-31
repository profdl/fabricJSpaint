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
const canvas = new fabric.Canvas("canvas", {
  isDrawingMode: true,
  width: 912,
  height: 712,
  backgroundColor: "#fff",
  historyUndo: [],
  historyRedo: [],
  preserveObjectStacking: true,
});

// Utility function to update active tool UI
function setActiveTool(button) {
  const activeToolClass = "active-tool";
  const activeButton = document.querySelector("." + activeToolClass);
  if (activeButton) {
    activeButton.classList.remove(activeToolClass);
  }
  button.classList.add(activeToolClass);
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

// Clear drawing functionality
document.getElementById("clear-drawing").addEventListener("click", function () {
  canvas.clear();
  canvas.backgroundColor = "#fff";
});

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
  changeBackgroundColor(this.value);
});

function changeBackgroundColor(color) {
  canvas.backgroundColor = color;
  canvas.renderAll();
}

// Zoom and pan functionality
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
  this.setViewportTransform(this.viewportTransform);
  this.isDragging = false;
  this.selection = true;
});

// Text tool functionality
const textToolButton = document.getElementById("text-tool");
const textInput = document.getElementById("text-input");

textToolButton.addEventListener("click", function () {
  setActiveTool(textToolButton);
  textInput.style.display = "inline-block";
  textInput.focus();
});

textInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    const text = new fabric.IText(textInput.value, {
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

// Enable double-click to edit text
canvas.on("mouse:dblclick", function (options) {
  const target = options.target;
  if (target && target.type === "text") {
    target.enterEditing();
    target.selectAll();
  }
});

// Exit text editing mode when clicking outside
canvas.on("mouse:down", function (options) {
  if (canvas.getActiveObject() && canvas.getActiveObject().type === "text") {
    const target = options.target;
    if (!target || target.type !== "text") {
      canvas.getActiveObject().exitEditing();
    }
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

// Drag functionality for toolbars
const toolbar = document.getElementById("toolbar");
const optionsToolbar = document.getElementById("options-toolbar");

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
    const toolbarRect = toolbar.getBoundingClientRect();
    const optionsToolbarRect = optionsToolbar.getBoundingClientRect();
    optionsToolbar.style.left = `${
      newLeft + (toolbarRect.width - optionsToolbarRect.width) / 2
    }px`;
    optionsToolbar.style.top = `${newTop - optionsToolbarRect.height - 10}px`;
    optionsToolbar.style.bottom = "auto";
    optionsToolbar.style.transform = "none";
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
  optionsToolbar.style.left = "50%";
  toolbar.style.top = "auto";
  optionsToolbar.style.bottom = "58px";
  optionsToolbar.style.transform = "translateX(-50%)";
}

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
