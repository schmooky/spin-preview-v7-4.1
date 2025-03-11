import { Spine } from "pixi-spine";

export function listAndChangeSkins(spineInstance: Spine) {
    // Get the available skins from the Spine instance
    const skins = spineInstance.skeleton.data.skins;
  
    // Create a container element to hold the buttons
    const container = document.getElementById('sidebarSkins')!;
  
    // Iterate over each skin and create a button for it
    skins.forEach(skin => {
      const button = document.createElement('button');
      button.textContent = skin.name;
  
      // Add a click event listener to the button
      button.addEventListener('click', () => {
        // Change the skin of the Spine instance
        spineInstance.skeleton.setSkinByName(skin.name);
        spineInstance.skeleton.setSlotsToSetupPose();
      });
  
      // Append the button to the container
      container.appendChild(button);
    });
  }