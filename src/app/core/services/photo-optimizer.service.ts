import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PhotoOptimizerService {
  private readonly maxPhotoDimension = 1600;
  private readonly photoQuality = 0.78;

  async optimize(file: File): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return file;
    }

    try {
      const image = await this.loadImage(file);
      const scale = Math.min(1, this.maxPhotoDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.round(image.naturalWidth * scale);
      const height = Math.round(image.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) return file;

      context.drawImage(image, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', this.photoQuality));
      if (!blob || blob.size >= file.size) return file;

      const optimizedName = file.name.replace(/\.[^.]+$/, '') || 'photo';
      return new File([blob], `${optimizedName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    } catch {
      return file;
    }
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Photo could not be loaded'));
      };
      image.src = url;
    });
  }
}
