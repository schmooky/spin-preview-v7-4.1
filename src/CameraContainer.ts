import gsap from "gsap";
import { Spine } from "pixi-spine";
import { Application, Bounds, Container, DisplayObject, Graphics, Rectangle } from "pixi.js";

export class CameraContainer extends Container {
  originalWidth: any;
  originalHeight: any;
  app: Application;
  graphics?: Graphics;
  private isDragging = false;
  private dragData = { x: 0, y: 0 };
  
  constructor(options: { width: number; height: number; app: Application }) {
    super();
    // Store the original scene dimensions
    this.originalWidth = options.width;
    this.originalHeight = options.height;
    this.app = options.app;
    this._bounds = new Bounds()
    this._bounds.minX =-4000;
    this._bounds.minY =-4000;
    this._bounds.maxX =4000;
    this._bounds.maxY =4000;
    this.hitArea = new Rectangle(-20000,-20000,40000,40000);
    
    // Add event listeners for dragging
    this.interactive = true;
    this.on("pointerdown", this.onDragStart, this);
    this.on("pointerup", this.onDragEnd, this);
    this.on("pointerupoutside", this.onDragEnd, this);
    this.on("pointermove", this.onDragMove, this);
  }
  
  private onDragStart(event: any): void {
    this.isDragging = true;
    this.dragData = event.data.getLocalPosition(this.parent);
  }
  
  private onDragEnd(): void {
    this.isDragging = false;
  }
  
  private onDragMove(event: any): void {
    if (this.isDragging) {
      const newPosition = event.data.getLocalPosition(this.parent);
      this.x += newPosition.x - this.dragData.x;
      this.y += newPosition.y - this.dragData.y;
      this.dragData = newPosition;
    }
  }
  centerCamera() {
    const x = this.app.renderer.width / 2; //- (bounds.x + bounds.width / 2) * scale;
    const y = this.app.renderer.height  / 2; //- (bounds.y + bounds.height / 2) * scale;
    
    this.x = x;
    this.y = y;
  }
  
  lookAtChild(object: Spine): number {
    let padding = 100;
    
    // Get the bounds of the object in global space
    let bounds: { width: number; height: number; x: number; y: number } =
    object.getBounds();
    if (bounds.width == 0 || bounds.height == 0) {
      bounds.width = object.skeleton.data.width / 2;
      bounds.height = object.skeleton.data.height / 2;
    }
    if (
      bounds.width > this.app.screen.width ||
      bounds.height > this.app.screen.height
    ) {
      // let padding =Math.min(this.width,this.height)*4;
    } else {
      padding = Math.min(this.width, this.height) * 4;
    }
    
    // Calculate the scale needed to fit the object within the screen
    const scaleX = (this.app.screen.width - padding * 2) / bounds.width;
    const scaleY = (this.app.screen.height - padding * 2) / bounds.height;
    let scale = Math.min(scaleX, scaleY);
    if (scale <= 0) scale = 1;
    
    const minScale = 0.1;
    const maxScale = 10;
    const scaleStep = 0.2;
    const scaleDivisor = 5;
    
    // Calculate the position to center the object
    const x = this.app.screen.width / 2; //- (bounds.x + bounds.width / 2) * scale;
    const y = this.app.screen.height / 2; //- (bounds.y + bounds.height / 2) * scale;
    
    this.x = x;
    this.y = y;
    
    scale = +(Math.ceil(scale * scaleDivisor) / scaleDivisor).toFixed(2);
    scale = Math.max(minScale, Math.min(maxScale, scale));
    
    object.scale.set(scale);
    this.setCanvasScaleDebugInfo(scale);
    document
    .getElementById("pixiContainer")!
    .addEventListener("wheel", (event) => {
      event.preventDefault();
      
      // Determine scroll direction
      const scrollDirection = Math.sign(event.deltaY);
      
      // Update scale based on scroll direction
      scale -= scrollDirection * scaleStep;
      
      // scale = +(Math.ceil(scale * scaleDivisor) / scaleDivisor).toFixed(2);
      
      // Clamp scale between minScale and maxScale
      scale = Math.max(minScale, Math.min(maxScale, scale));
      
      // Apply the new scale to the container
      object.scale.set(scale);
      
      this.addGrid(scale);
      
      this.setCanvasScaleDebugInfo(scale);
    });
    return scale;
  }
  
  setCanvasScaleDebugInfo(scale: number) {
    const debug = document.getElementById("canvasScale");
    if (!debug) return;
    debug.innerText = `Scale: x${scale.toFixed(2)}`;
  }
  
  addGrid(scale: number) {
    const gridSize = 2000;
    const interval = Math.floor(100 * scale);
    const graphics = new Graphics();
    
    console.table({ gridSize, interval, scale });
    
    // Calculate the number of lines needed based on the grid size and interval
    const numLines = Math.floor(gridSize / interval);
    
    // Calculate the starting position for the grid
    const startX = (-numLines * interval);
    const startY = (-numLines * interval);
    
    console.table({ startX, startY });
    const color = 0x424549;
    // Draw right vertical lines
    for (let i = 0; i <= numLines; i++) {
      const x = i * interval;
      graphics.lineStyle(1, color).moveTo(x, startY).lineTo(x, -startY);
    }
    
    // Draw bottom horizontal lines
    for (let i = 0; i <= numLines; i++) {
      const y = i * interval;
      graphics.lineStyle(1, color).moveTo(startX, y).lineTo(-startX, y);
    }
    
    // Draw left vertical lines
    for (let i = -1; i >= -numLines; i--) {
      const x = i * interval;
      graphics.lineStyle(1, color).moveTo(x, startY).lineTo(x, -startY);
    }
    
    // Draw up horizontal lines
    for (let i = -1; i >= -numLines; i--) {
      const y = i * interval;
      graphics.lineStyle(1, color).moveTo(startX, y).lineTo(-startX, y);
    }
    
    this.graphics && this.removeChild(this.graphics);
    this.graphics?.destroy();
    // Add the grid to the stage
    this.addChildAt(graphics, 0);
    this.graphics = graphics;
  }
}
