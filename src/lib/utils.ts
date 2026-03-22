import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts common image links (Google Drive, Imgur) to direct image URLs.
 * Uses a proxy (weserv.nl) to bypass CORS and referrer issues for external images.
 */
export function getDirectImageUrl(url: string): string {
  if (!url) return '';

  let cleanUrl = url.trim();

  // Handle protocol-relative URLs
  if (cleanUrl.startsWith('//')) {
    cleanUrl = 'https:' + cleanUrl;
  }

  // Google Drive: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // -> https://drive.google.com/uc?id=FILE_ID
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveMatch) {
    cleanUrl = `https://drive.google.com/uc?id=${driveMatch[1]}`;
  }

  // Imgur: https://imgur.com/a/ID or https://imgur.com/ID
  // -> https://i.imgur.com/ID.jpg
  const imgurMatch = cleanUrl.match(/imgur\.com\/(?:a\/)?([^\/]+)/);
  if (imgurMatch && !cleanUrl.includes('i.imgur.com')) {
    const id = imgurMatch[1].split(/[?#]/)[0];
    cleanUrl = `https://i.imgur.com/${id}.jpg`;
  }

  // Use images.weserv.nl as a proxy to bypass CORS/Referrer issues
  // This is especially helpful for ImageKit, Google Drive, and Imgur
  if (cleanUrl.startsWith('http') && !cleanUrl.includes('picsum.photos')) {
    // Remove protocol for weserv
    const urlWithoutProtocol = cleanUrl.replace(/^https?:\/\//, '');
    return `https://images.weserv.nl/?url=${encodeURIComponent(urlWithoutProtocol)}&default=${encodeURIComponent(cleanUrl)}`;
  }

  return cleanUrl;
}
