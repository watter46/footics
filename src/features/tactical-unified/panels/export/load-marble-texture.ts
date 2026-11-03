let cachedMarbleImage: HTMLImageElement | null = null;
let marbleImagePromise: Promise<HTMLImageElement> | null = null;

export function getCachedMarbleImage(): HTMLImageElement | null {
  return cachedMarbleImage;
}

export function loadMarbleTexture(): Promise<HTMLImageElement> {
  if (cachedMarbleImage?.complete && cachedMarbleImage.naturalWidth > 0) {
    return Promise.resolve(cachedMarbleImage);
  }
  if (!marbleImagePromise) {
    marbleImagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      if (typeof Image === 'undefined') {
        reject(new Error('Image is not available'));
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        cachedMarbleImage = img;
        resolve(img);
      };
      img.onerror = (e) => {
        marbleImagePromise = null;
        reject(e);
      };
      img.src = '/assets/pitch-marble-texture.jpg';
    });
  }
  return marbleImagePromise;
}
