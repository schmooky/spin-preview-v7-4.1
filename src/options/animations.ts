import { Spine } from "pixi-spine";

export function listAndChangeAnimations(spineInstance: Spine) {
    // Get the available animations from the Spine instance
    const animations = spineInstance.skeleton.data.animations;
  
    // Create a container element to hold the buttons
    const container = document.getElementById('sidebarAnimations')!;
  
    // Iterate over each animation and create a button for it
    animations.forEach(animation => {
      const button = document.createElement('button');
      button.textContent = animation.name;
  
      // Add a click event listener to the button
      button.addEventListener('click', () => {
        // Set the animation of the Spine instance
        spineInstance.state.setAnimation(0, animation.name, false);
      });
  
      // Append the button to the buttons container
      container.appendChild(button);
    });
  }