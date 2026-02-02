import { AvatarStyle } from './types';

export function generateGameCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getAvatarUrl(style: AvatarStyle, seed: string, color?: string): string {
  // Clean seed - remove any color suffix for backward compatibility
  const cleanSeed = seed.replace(/-[A-F0-9]{6}$/i, '');
  const baseUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${cleanSeed}`;
  
  if (!color) {
    // Try to extract color from seed if it contains a hex color (backward compatibility)
    const colorMatch = seed.match(/-([A-F0-9]{6})$/i);
    if (colorMatch) {
      color = `#${colorMatch[1]}`;
    }
  }
  
  if (color) {
    // Remove # from hex color for URL
    const colorHex = color.replace('#', '');
    // Add color parameters - most DiceBear styles support backgroundColor
    // This will apply the color as a background or accent color depending on the style
    return `${baseUrl}&backgroundColor=${colorHex}`;
  }
  
  return baseUrl;
}

export function calculatePoints(
  isCorrect: boolean,
  timeRemaining: number,
  totalTime: number
): number {
  if (!isCorrect) return 0;
  
  // Base points for correct answer
  const basePoints = 500;
  
  // Speed bonus (0-500 points based on time remaining)
  const speedBonus = Math.floor((timeRemaining / totalTime) * 500);
  
  return basePoints + speedBonus;
}

export function getHealthColor(health: number, maxHealth: number): string {
  const percentage = (health / maxHealth) * 100;
  
  if (percentage > 60) return 'text-green-600';
  if (percentage > 30) return 'text-amber-600';
  return 'text-red-600';
}

export function getHealthBarColor(health: number, maxHealth: number): string {
  const percentage = (health / maxHealth) * 100;
  
  if (percentage > 60) return 'bg-green-500';
  if (percentage > 30) return 'bg-amber-500';
  return 'bg-red-500';
}

export const AVATAR_STYLES: { value: AvatarStyle; label: string }[] = [
  { value: 'adventurer', label: 'Adventurer' },
  { value: 'avataaars', label: 'Avataaars' },
  { value: 'bottts', label: 'Bottts (Robots)' },
  { value: 'fun-emoji', label: 'Fun Emoji' },
  { value: 'identicon', label: 'Identicon' },
  { value: 'lorelei', label: 'Lorelei' },
  { value: 'micah', label: 'Micah' },
  { value: 'miniavs', label: 'Miniavs' },
  { value: 'notionists', label: 'Notionists' },
  { value: 'open-peeps', label: 'Open Peeps' },
  { value: 'personas', label: 'Personas' },
  { value: 'pixel-art', label: 'Pixel Art' },
];

export const COLOR_PALETTES = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', 
  '#F8B739', '#52B788', '#E76F51', '#2A9D8F'
];
