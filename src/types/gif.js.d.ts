/**
 * gif.js minimal type stub
 */
declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      image: HTMLImageElement | HTMLCanvasElement,
      options?: { delay?: number; copy?: boolean },
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}
