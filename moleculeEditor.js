class moleculeEditor {
  constructor() {
    this.drawingArea = document.getElementById("drawing-area");
    this.penButton = document.getElementById("pencil");
    this.eraserButton = document.getElementById("eraser");
    this.clearButton = document.getElementById("clear");
    this.undoButton = document.getElementById("undo");
    this.redoButton = document.getElementById("redo");
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    this.addListeners();
    this.lines = [];
    this.actionStack = [];
    this.backupLines = [];
    this.erasedLines = [];
    this.currentLineIndex = -1;
    this.actionStackIndex = -1;
    this.currentAction = null;
    this.currentTool = "pencil";
  }
  addListeners() {
    this.drawingArea.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this)
    );
    this.drawingArea.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.drawingArea.addEventListener(
      "mousemove",
      this.handleMouseMove.bind(this)
    );
    this.drawingArea.addEventListener(
      "mouseleave",
      this.handleMouseUp.bind(this)
    );
    this.penButton.addEventListener("click", () => {
      this.eraserButton.classList.remove("selected");
      this.currentTool = "pencil";
      this.penButton.classList.add("selected");
    });
    this.eraserButton.addEventListener("click", () => {
      this.penButton.classList.remove("selected");
      this.currentTool = "eraser";
      this.eraserButton.classList.add("selected");
    });
    this.clearButton.addEventListener("click", this.clearLines.bind(this));
    this.undoButton.addEventListener("click", this.undoLines.bind(this));
    this.redoButton.addEventListener("click", this.redoLines.bind(this));
  }
  handleKeyDown(event) {
    if (event.ctrlKey && event.keyCode === 90) {
      this.undoLines(event);
    } else if (event.ctrlKey && event.keyCode === 89) {
      this.redoLines(event);
    }
  }
  handleMouseDown(event) {
    if (this.currentTool == "pencil") {
      this.startLine(event);
    } else {
      this.eraseLine(event);
    }
  }
  handleMouseMove(event) {
    if (this.currentAction) {
      this.updateLine(event);
    }
  }
  handleMouseUp(event) {
    if (this.currentAction) {
      this.endLine(event);
    }
  }
  drawBond(x1, y1, x2, y2) {
    const bond = document.createElementNS("http://www.w3.org/2000/svg", "line");
    bond.setAttribute("x1", x1);
    bond.setAttribute("y1", y1);
    bond.setAttribute("x2", x2);
    bond.setAttribute("y2", y2);
    bond.setAttribute("stroke", "black");
    bond.setAttribute("stroke-linecap", "round");
    this.drawingArea.appendChild(bond);
  }
  startLine(event) {
    let x = event.offsetX;
    let y = event.offsetY;
    for (let index = 0; index <= this.currentLineIndex; index++) {
      let line = this.lines[index];
      let dxStart = x - line.startX;
      let dyStart = y - line.startY;
      let dxEnd = x - line.endX;
      let dyEnd = y - line.endY;
      if (Math.sqrt(dxStart * dxStart + dyStart * dyStart) < 10) {
        x = line.startX;
        y = line.startY;
        break;
      }

      if (Math.sqrt(dxEnd * dxEnd + dyEnd * dyEnd) < 10) {
        x = line.endX;
        y = line.endY;
        break;
      }
    }
    this.currentAction = {
      type: "bond",
      startX: x,
      startY: y,
      endX: x,
      endY: y,
    };
  }
  updateLine(event) {
    this.currentAction.endX = event.offsetX;
    this.currentAction.endY = event.offsetY;
    this.drawAllLines();
    this.drawBond(
      this.currentAction.startX,
      this.currentAction.startY,
      this.currentAction.endX,
      this.currentAction.endY
    );
  }
  endLine(event) {
    const dx = event.offsetX - this.currentAction.startX;
    const dy = event.offsetY - this.currentAction.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 20) {
      this.currentAction.endX = event.offsetX;
      this.currentAction.endY = event.offsetY;
      this.currentLineIndex += 1;
      this.lines = this.lines.slice(0, this.currentLineIndex);
      this.lines.push({
        startX: this.currentAction.startX,
        startY: this.currentAction.startY,
        endX: this.currentAction.endX,
        endY: this.currentAction.endY,
      });
      this.pushAction("draw");
    }
    this.drawAllLines();
    this.currentAction = null;
  }
  eraseLine(event) {
    if (this.currentLineIndex === -1) return;
    const x = event.offsetX;
    const y = event.offsetY;
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const line = this.lines[i];
      const dx = line.endX - line.startX;
      const dy = line.endY - line.startY;
      const dist =
        Math.abs(dx * (line.startY - y) - (line.startX - x) * dy) /
        Math.sqrt(dx * dx + dy * dy);
      if (dist < 5) {
        const erased = this.lines.splice(i, 1);
        this.erasedLines.push(...erased);
        this.currentLineIndex -= 1;
      }
    }
    this.pushAction("erase");
    this.drawAllLines();
  }
  clearLines(event) {
    this.backupLines = this.lines;
    this.lines = [];
    this.drawingArea.innerHTML = "";
    this.currentLineIndex = -1;
    this.pushAction("clear");
  }
  undoLines(event) {
    if (this.actionStackIndex > -1) {
      const canvasData = this.actionStack[this.actionStackIndex];
      this.actionStackIndex--;
      if (canvasData === "draw") {
        this.currentLineIndex -= 1;
      } else if (canvasData === "erase") {
        if (this.erasedLines.length === 0) return;
        this.currentLineIndex += 1;
        this.lines = this.lines.slice(0, this.currentLineIndex);
        const lastErased = this.erasedLines.pop();
        this.lines.push(lastErased);
      } else if (canvasData === "clear") {
        this.lines = this.backupLines;
        this.currentLineIndex = this.lines.length - 1;
      }
      this.drawAllLines();
    }
  }
  redoLines(event) {
    if (this.actionStackIndex < this.actionStack.length - 1) {
      this.actionStackIndex++;
      const canvasData = this.actionStack[this.actionStackIndex];
      if (canvasData === "draw") {
        this.currentLineIndex += 1;
      } else if (canvasData === "erase") {
        const erased = this.lines.splice(this.currentLineIndex, 1);
        this.erasedLines.push(...erased);
        this.currentLineIndex -= 1;
      } else if (canvasData === "clear") {
        this.backupLines = this.lines;
        this.lines = [];
        this.currentLineIndex = -1;
      }
      this.drawAllLines();
    }
  }
  pushAction(action) {
    this.actionStack.splice(this.actionStackIndex + 1);
    this.actionStack.push(action);
    this.actionStackIndex++;
  }
  drawAllLines() {
    this.drawingArea.innerHTML = "";
    for (let index = 0; index <= this.currentLineIndex; index++) {
      const line = this.lines[index];
      this.drawBond(line.startX, line.startY, line.endX, line.endY);
    }
  }
}
