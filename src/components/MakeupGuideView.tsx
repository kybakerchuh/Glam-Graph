import React from 'react';
import { ArrowRight } from 'lucide-react';
import { MAKEUP_PRODUCTS, MODELS } from '../data/makeupCatalog';
import { MakeupZoneId } from '../types';

interface Props {
  onJumpToZone: (zone: MakeupZoneId) => void;
}

export const MakeupGuideView: React.FC<Props> = ({ onJumpToZone }) => {
  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1C1917]">
          Makeup Terms &amp; Skin-Tone Matching Guide
        </h1>
        <p className="mt-2 text-sm text-[#44403C] leading-relaxed">
          Every product in the studio explained in plain language—what it is called, exactly where on
          the face it goes, and how different shades complement skin tones from Fair Porcelain to Deep Espresso.
        </p>
      </div>

      {/* Skin Tone Spectrum Reference */}
      <section className="rounded-xl border border-[#E7E1DA] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#1C1917] mb-3">
          Studio Models &amp; Undertones (Light to Deep)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODELS.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-[#E7E1DA] bg-[#FAF8F6] p-3"
            >
              <span
                className="h-11 w-11 rounded-full border border-black/15 shrink-0"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${m.palette.highlight}, ${m.palette.base} 60%, ${m.palette.shadow})`,
                }}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#1C1917]">{m.name}</div>
                <div className="text-xs text-[#44403C]">{m.skinToneLabel}</div>
                <div className="text-[11px] text-[#78716C]">{m.undertoneLabel}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Complete 13-Product Glossary */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MAKEUP_PRODUCTS.map((prod, idx) => (
          <div
            key={prod.zone}
            className="flex flex-col justify-between rounded-xl border border-[#E7E1DA] bg-white p-5 space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#78716C]">
                <span>
                  {String(idx + 1).padStart(2, '0')}. {prod.group}
                </span>
                <span className="tabular-nums">{prod.shades.length} shades</span>
              </div>
              <h3 className="text-base font-semibold text-[#1C1917] font-sans">{prod.name}</h3>
              <p className="text-xs text-[#44403C] leading-relaxed">
                <strong className="text-[#1C1917]">What it is:</strong> {prod.whatItIs}
              </p>
              <p className="text-xs text-[#44403C] leading-relaxed">
                <strong className="text-[#1C1917]">Where it goes:</strong> {prod.whereItGoes}
              </p>
              <p className="text-xs text-[#78716C] leading-relaxed">
                <strong className="text-[#44403C]">Tip:</strong> {prod.proTip}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F3EFEA]">
              <div className="flex -space-x-1">
                {prod.shades.slice(0, 6).map((s) => (
                  <span
                    key={s.id}
                    title={s.name}
                    className="h-5 w-5 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: s.hex }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => onJumpToZone(prod.zone)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#9D174D] hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Try in Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
