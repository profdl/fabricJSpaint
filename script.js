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
