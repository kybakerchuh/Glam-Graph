import React, { useEffect, useRef } from 'react';
import { ModelProfile } from '../types';
import { drawModelPortrait, PORTRAIT_H, PORTRAIT_W } from '../utils/portraitRenderer';

interface Props {
  model: ModelProfile;
  className?: string;
}

export const ModelPortraitPreview: React.FC<Props> = ({ model, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!scratchRef.current) {
      const s = document.createElement('canvas');
      s.width = PORTRAIT_W;
      s.height = PORTRAIT_H;
      scratchRef.current = s;
    }

    drawModelPortrait(ctx, scratchRef.current, model, {}, {});
  }, [model]);

  return (
    <canvas
      ref={canvasRef}
      width={PORTRAIT_W}
      height={PORTRAIT_H}
      className={`block ${className}`}
      aria-label={`${model.name} portrait preview with ${model.hairStyle.replace(/_/g, ' ')} hairstyle`}
    />
  );
};
