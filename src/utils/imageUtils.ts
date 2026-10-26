import React from 'react';
import { Therapist } from '../types';

/**
 * Returns CSS properties for framing and zooming therapist photos consistently.
 */
export function getTherapistImageStyle(
  therapist?: Partial<Therapist> | { avatarUrl?: string; imagePosition?: string; imageZoom?: number } | null
): React.CSSProperties {
  if (!therapist) return { objectFit: 'cover' };
  const position = therapist.imagePosition || '50% 50%';
  const zoom = therapist.imageZoom || 1;
  return {
    objectFit: 'cover',
    objectPosition: position,
    transform: zoom !== 1 ? `scale(${zoom})` : 'none',
    transformOrigin: position,
  };
}
