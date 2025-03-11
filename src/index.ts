import { Application, Sprite } from 'pixi.js';
import { SpineBenchmark } from './SpineBenchmark';
import { CameraContainer } from './CameraContainer';

import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";

// register the plugin
gsap.registerPlugin(PixiPlugin);

// give the plugin a reference to the PIXI object
PixiPlugin.registerPIXI(PIXI);

const app = new Application({
    antialias: false,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x282b30,
    view: document.getElementById('pixiCanvas')! as HTMLCanvasElement,
    resizeTo: document.getElementById('pixiContainer')! as HTMLDivElement,
});

const camera = new CameraContainer({width:window.innerWidth,height:window.innerHeight,app:app});
app.stage.addChild(camera as any)

const benchmark = new SpineBenchmark(app);

// Create or update the drop area
const dropArea = document.getElementById('dropArea')!;

// Add text instructions to the drop area
const instructions = document.createElement('div');
instructions.innerHTML = `
  <h3>Spine File Loader</h3>
  <p>Drop files or folders here</p>
  <p>Include: .atlas, .json/.skel, and image files</p>
`;
dropArea.appendChild(instructions);

// Create status display
const statusDisplay = document.createElement('div');
statusDisplay.id = 'statusDisplay';
statusDisplay.style.marginTop = '10px';
statusDisplay.style.color = '#ccc';
dropArea.appendChild(statusDisplay);

// Setup drop event handlers
dropArea.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    statusDisplay.textContent = 'Drop files here...';
});

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('highlight');
});

dropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('highlight');
    statusDisplay.textContent = '';
});

// Function to traverse file/directory structure
function traverseFileTree(item: any, path: string, fileList: File[]): Promise<void> {
    path = path || "";
    
    return new Promise((resolve, reject) => {
        if (item.isFile) {
            // Get file
            item.file((file: File) => {
                console.log("File found:", path + file.name);
                // Store the path in a custom property
                Object.defineProperty(file, 'fullPath', {
                    value: path + file.name,
                    writable: false
                });
                fileList.push(file);
                resolve();
            }, reject);
        } else if (item.isDirectory) {
            // Get folder contents
            const dirReader = item.createReader();
            
            // Function to read all entries in the directory
            const readAllEntries = (entries: any[] = []): Promise<any[]> => {
                return new Promise((resolveEntries, rejectEntries) => {
                    dirReader.readEntries((results: any[]) => {
                        if (results.length) {
                            // More entries to process
                            entries = entries.concat(Array.from(results));
                            readAllEntries(entries).then(resolveEntries).catch(rejectEntries);
                        } else {
                            // No more entries, we have all of them
                            resolveEntries(entries);
                        }
                    }, rejectEntries);
                });
            };
            
            readAllEntries().then((entries) => {
                console.log(`Directory found: ${path + item.name}/ (${entries.length} entries)`);
                
                // Process all entries in the directory
                const promises = entries.map(entry => 
                    traverseFileTree(entry, path + item.name + "/", fileList)
                );
                
                Promise.all(promises)
                    .then(() => resolve())
                    .catch(reject);
            }).catch(reject);
        } else {
            resolve(); // Not a file or directory, just resolve
        }
    });
}

// Handle drop event with proper directory traversal
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('highlight');
    
    // Display initial status
    statusDisplay.textContent = "Processing dropped items...";
    
    const items = e.dataTransfer?.items;
    if (!items || items.length === 0) {
        statusDisplay.textContent = "No items found in drop";
        return;
    }
    
    // Convert DataTransferItemList to array
    const itemsArray = Array.from(items);
    const fileList: File[] = [];
    
    // Process all dropped items (files and directories)
    const promises = itemsArray.map(item => {
        // webkitGetAsEntry is where the magic happens
        const entry = item.webkitGetAsEntry();
        if (entry) {
            return traverseFileTree(entry, "", fileList);
        } else {
            return Promise.resolve();
        }
    });
    
    // When all traversal is complete
    Promise.all(promises)
        .then(() => {
            console.log(`Traversal complete, found ${fileList.length} files`);
            statusDisplay.textContent = `Found ${fileList.length} files. Loading...`;
            
            if (fileList.length > 0) {
                // Convert to FileList-like object
                const dataTransfer = new DataTransfer();
                fileList.forEach(file => dataTransfer.items.add(file));
                const files = dataTransfer.files;
                
                // Load files into SpineBenchmark
                benchmark.loadSpineFiles(files);
            } else {
                statusDisplay.textContent = "No valid files found";
            }
        })
        .catch(error => {
            console.error("Error traversing file tree:", error);
            statusDisplay.textContent = "Error processing files";
        });
}, false);

function bytesToSize(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB']
    if (bytes === 0) return 'n/a'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    if (i === 0) return `${bytes} ${sizes[i]}`
    return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}