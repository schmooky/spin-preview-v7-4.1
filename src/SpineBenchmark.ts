import { Application, Assets, IRenderer } from "pixi.js";
import { AttachmentType, Spine } from "pixi-spine";
import { PerformanceMonitor } from "./PerformanceMonitor";
import {
  AtlasAttachmentLoader,
  DeformTimeline,
  Skeleton,
  SkeletonBinary,
  SkeletonData,
  SkeletonJson,
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
  
  constructor(app: Application) {
    this.app = app;
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  public loadSpineFiles(files: FileList) {
    const acceptedFiles = [...files];
    const filesLength = acceptedFiles.length;
    let count = 0;
    
    let atlasText: string | undefined = undefined;
    let json: any = undefined;
    
    const getFilename = (str: string) =>
      str.substring(str.lastIndexOf("/") + 1);
    
    acceptedFiles.forEach((file) => {
      const filename = getFilename(file.name);
      const reader = new FileReader();
      
      if (file.type.match(/image/)) {
        reader.readAsDataURL(file);
      } else if (/^.+\.skel$/.test(filename)){
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
      reader.onload = (event) => {
        if (file.type.match(/image/)) {
          Assets.load(event.target!.result as string).then(() => {
            count += 1;
            Assets.cache.set(
              file.name,
              Assets.cache.get(event.target!.result as string)
            );
            if (count === filesLength) {
              this.createSpineAsset(json, atlasText!);
            }
          });
        } else if (file.type === "application/json") {
          count += 1;
          json = JSON.parse(event.target!.result as string);
          // AnimationStore.instance.setSpineAnimations(Object.keys(json.animations));
          if (count === filesLength) {
            this.createSpineAsset(json, atlasText!);
          }
        }else if (/^.+\.skel$/.test(filename)) {
          console.log('Loading Binary Skel')
          count += 1;
          this.isBinary = true;
          json = event.target!.result;
          // AnimationStore.instance.setSpineAnimations(Object.keys(json.animations));
          if (count === filesLength) {
            this.createSpineAsset(json, atlasText!);
          }
        }
        else {
          count += 1;
          atlasText = event.target!.result as string;
          if (count === filesLength) {
            this.createSpineAsset(json, atlasText);
          }
        }
      };
    });
  }
  
  private createSpineAsset(data: any, atlasText: string): void {
    const key = `spine-${createId()}`;
    const spineAtlas = new TextureAtlas(atlasText, function (line, callback) {
      callback(Assets.cache.get(line));
    });
    
    console.log(`Creating ${this.isBinary ? "Binary" : "Json"} Spine Asset`)
    
    let skeletonData: SkeletonData;
    if(this.isBinary) { 
      console.log('data to parse',data)
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
    
    
    Assets.cache.set(key, skeletonData);
    console.log(`loaded`, key, Assets.cache.get(key));
    console.log(Assets.cache);
    setTimeout(() => {
      const skeleton = new Spine(Assets.cache.get(key));
      
      const camera = this.app.stage.children[0] as CameraContainer;
      //@ts-ignore
      
      camera.addChild(skeleton);
      
      const scale = camera.lookAtChild(skeleton);
      
      camera.addGrid(scale);
      console.log(skeleton.spineData.animations.map((_) => _.name));
      // skeleton.state.setAnimation(0, "idle", true);
      // this.playSpineAnimationsInSequence(skeleton)
      
      this.spineInstances.push(skeleton);
      listAndChangeSkins(skeleton);
      listAndChangeAnimations(skeleton);
      
      document.getElementById("dropArea")?.remove()
    }, 250);
    // this.app.stage.addChild(new Spine(Assets.cache.get(
    //     'key'
    // )))
    
    
  }
}

