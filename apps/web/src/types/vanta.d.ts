declare module 'vanta/dist/vanta.birds.min' {
  import * as THREE from 'three';
  interface VantaOptions {
    el: HTMLElement;
    THREE: typeof THREE;
    [key: string]: any;
  }
  interface VantaEffect {
    destroy(): void;
  }
  function BIRDS(options: VantaOptions): VantaEffect;
  export default BIRDS;
}
