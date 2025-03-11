import { Application, Sprite } from 'pixi.js';
import { SpineBenchmark } from './SpineBenchmark';
import { CameraContainer } from './CameraContainer';

import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";


// import { attributes } from "./text/general.md";

// document.title = attributes.title; // Hello from front-matter

// document.querySelector("#generalRequirementsText")!.innerHTML = JSON.stringify(attributes); // <h1>Markdown File</h1>
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

const dropArea = document.getElementById('dropArea')!;

dropArea.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
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
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('highlight');
    
    const files = e.dataTransfer?.files;
    if (files) {
        benchmark.loadSpineFiles(files);
    }
});
function bytesToSize(bytes: number) {
    const sizes = ['Bytes', 'KB', 'MB']
    if (bytes === 0) return 'n/a'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    if (i === 0) return `${bytes} ${sizes[i]}`
    return `${(bytes / (1024 ** i)).toFixed(1)} ${sizes[i]}`
}