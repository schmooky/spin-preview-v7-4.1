import { Application, Assets, IRenderer } from "pixi.js";
import { AttachmentType, Spine } from "pixi-spine";
import { PerformanceMonitor } from "./PerformanceMonitor";
import {
  AtlasAttachmentLoader,
  DeformTimeline,
  Skeleton,
  SkeletonBinary,
  SkeletonJson,
  SkeletonData,
  TextureAtlas,
} from "@pixi-spine/all-4.1";
import { createId } from "@paralleldrive/cuid2";
import { CameraContainer } from "./CameraContainer";
import { listAndChangeSkins } from "./options/skins";
import { listAndChangeAnimations } from "./options/animations";

export class SpineBenchmark {
  private app: Application;
  private performanceMonitor: PerformanceMonitor;
  private spineInstances: Spine[] = [];
  private isBinary = false;
  private imageMap: Map<string, string> = new Map();
  
  constructor(app: Application) {
    this.app = app;
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  public loadSpineFiles(files: FileList) {
    const acceptedFiles = [...files];
    console.log("Files received:", acceptedFiles.map(f => (f as any).fullPath || f.name).join(", "));
    
    // Clear any previous image mapping
    this.imageMap.clear();
    
    // Initialize tracking variables
    let atlasFile: File | undefined;
    let jsonFile: File | undefined;
    let skelFile: File | undefined;
    let imageFiles: File[] = [];
    
    // First pass - categorize files
    acceptedFiles.forEach((file) => {
      const filename = this.getFilename(file.name);
      const fullPath = (file as any).fullPath || file.name;
      
      // Categorize files by extension
      if (filename.endsWith('.atlas')) {
        atlasFile = file;
        console.log("Atlas file found:", fullPath);
      } else if (filename.endsWith('.json')) {
        jsonFile = file;
        console.log("JSON file found:", fullPath);
      } else if (filename.endsWith('.skel')) {
        skelFile = file;
        this.isBinary = true;
        console.log("Skel file found:", fullPath);
      } else if (file.type.match(/image/)) {
        imageFiles.push(file);
        // Store mapping from base filename to full path for later reference
        this.imageMap.set(filename, fullPath);
        console.log("Image file found:", fullPath, "-> mapped as:", filename);
      } else {
        console.log("Unrecognized file type:", fullPath);
      }
    });
    
    // If we have the necessary files, start loading them
    if ((jsonFile || skelFile) && atlasFile) {
      this.processFiles(atlasFile, jsonFile, skelFile, imageFiles);
    } else {
      console.error('Missing required files for Spine animation. Need atlas and (json or skel) files.');
      alert('Please upload both a skeleton file (.json or .skel) and an atlas file (.atlas)');
    }
  }
  
  private getFilename(path: string): string {
    return path.substring(path.lastIndexOf("/") + 1);
  }
  
  private processFiles(atlasFile: File, jsonFile?: File, skelFile?: File, imageFiles: File[] = []): void {
    console.log("Processing files...");
    
    // Create promises for all file loading operations
    const promises: Promise<void>[] = [];
    let atlasText: string;
    let jsonData: any;
    
    // Load atlas file
    const atlasPromise = this.readFileAsText(atlasFile)
      .then(text => {
        atlasText = text;
        console.log("Atlas loaded:", (atlasFile as any).fullPath || atlasFile.name);
      });
    promises.push(atlasPromise);
    
    // Load JSON file if available
    if (jsonFile) {
      const jsonPromise = this.readFileAsText(jsonFile)
        .then(text => {
          jsonData = JSON.parse(text);
          console.log("JSON loaded:", (jsonFile as any).fullPath || jsonFile.name);
        });
      promises.push(jsonPromise);
    }
    
    // Load skeleton binary file if available
    if (skelFile) {
      const skelPromise = this.readFileAsArrayBuffer(skelFile)
        .then(buffer => {
          jsonData = buffer;
          this.isBinary = true;
          console.log("Skel binary loaded:", (skelFile as any).fullPath || skelFile.name);
        });
      promises.push(skelPromise);
    }
    
    // Load all image files
    for (const imageFile of imageFiles) {
      const imagePromise = this.readFileAsDataURL(imageFile)
        .then(dataUrl => {
          return Assets.load(dataUrl).then(() => {
            // Very important: Cache with just the filename (no path) for atlas reference
            const baseFilename = this.getFilename(imageFile.name);
            Assets.cache.set(baseFilename, Assets.cache.get(dataUrl));
            console.log("Image loaded and cached as:", baseFilename);
          });
        });
      promises.push(imagePromise);
    }
    
    // When all files are loaded, create the spine asset
    Promise.all(promises)
      .then(() => {
        console.log("All files loaded, creating spine asset...");
        this.createSpineAsset(jsonData, atlasText!);
      })
      .catch(error => {
        console.error("Error loading files:", error);
        alert("Error loading spine files: " + error.message);
      });
  }
  
  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target!.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target!.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  
  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target!.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  private createSpineAsset(data: any, atlasText: string): void {
    const key = `spine-${createId()}`;
    
    console.log(`Creating ${this.isBinary ? "Binary" : "Json"} Spine Asset`);
    
    // Create atlas - using a modified loader function
    const spineAtlas = new TextureAtlas(atlasText, (line, callback) => {
      // First try the exact name as provided
      let cachedTexture = Assets.cache.get(line);
      
      if (!cachedTexture) {
        // If not found, try just the filename without path
        const baseFilename = this.getFilename(line);
        cachedTexture = Assets.cache.get(baseFilename);
        console.log(`Looking for texture: ${line} -> ${baseFilename} -> ${cachedTexture ? "FOUND" : "NOT FOUND"}`);
      }
      
      if (cachedTexture) {
        callback(cachedTexture);
      } else {
        console.error(`Texture not found: ${line}`);
        // Try to list all available textures for debugging
        console.log("Available textures:", 
          Object.keys(Assets.cache._cache).filter(k => 
            !k.includes('spine-') && 
            (k.includes('base64') || k.includes('.webp') || k.includes('.png'))));
      }
    });
    
    // Parse skeleton data based on type
    let skeletonData: SkeletonData;
    try {
      if (this.isBinary) {
        const spineBinaryParser = new SkeletonBinary(
          new AtlasAttachmentLoader(spineAtlas)
        );
        skeletonData = spineBinaryParser.readSkeletonData(new Uint8Array(data));
      } else {
        const spineJsonParser = new SkeletonJson(
          new AtlasAttachmentLoader(spineAtlas)
        );
        skeletonData = spineJsonParser.readSkeletonData(data);
      }
      
      // Cache and create the spine instance
      Assets.cache.set(key, skeletonData);
      console.log(`Spine data loaded with key: ${key}`);
      
      setTimeout(() => {
        const skeleton = new Spine(Assets.cache.get(key));
        
        const camera = this.app.stage.children[0] as CameraContainer;
        
        camera.addChild(skeleton);
        
        const scale = camera.lookAtChild(skeleton);
        
        camera.addGrid(scale);
        console.log("Available animations:", skeleton.spineData.animations.map((_) => _.name).join(", "));
        
        this.spineInstances.push(skeleton);
        listAndChangeSkins(skeleton);
        listAndChangeAnimations(skeleton);
        
        document.getElementById("dropArea")?.remove();
      }, 250);
    } catch (error) {
      console.error("Error creating spine asset:", error);
      alert(`Error creating spine asset: ${error.message}`);
    }
  }
}