import React from 'react';
import { ProblemVisual as ProblemVisualType } from '../types';
import { MathText } from './MathText';

interface Props {
  visual: ProblemVisualType;
}

export const ProblemVisual: React.FC<Props> = ({ visual }) => {
  if (visual.type === 'table') {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-[#E7E1DA] bg-white">
        {visual.title && (
          <div className="border-b border-[#E7E1DA] bg-[#F7F4F0] px-3 py-1.5 text-xs font-semibold text-[#44403C]">
            <MathText text={visual.title} />
          </div>
        )}
        <table className="w-full text-left text-sm tabular-nums">
          <thead>
            <tr className="border-b border-[#E7E1DA] bg-[#FAF8F6]">
              {visual.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 font-semibold text-[#1C1917]">
                  <MathText text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, rIdx) => (
              <tr key={rIdx} className="border-b border-[#F3EFEA] last:border-b-0">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-1.5 text-[#292524]">
                    <MathText text={String(cell)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (visual.type === 'steps') {
    return (
      <div className="my-3 overflow-hidden rounded-lg border border-[#E7E1DA] bg-white">
        {visual.title && (
          <div className="border-b border-[#E7E1DA] bg-[#F7F4F0] px-3 py-1.5 text-xs font-semibold text-[#44403C]">
            <MathText text={visual.title} />
          </div>
        )}
        <div className="divide-y divide-[#F3EFEA]">
          {visual.steps.map((s, idx) => (
            <div key={idx} className="grid grid-cols-[90px_1fr] items-center text-sm">
              <div className="bg-[#FAF8F6] px-3 py-2 font-medium text-[#57534E] border-r border-[#F3EFEA]">
                {s.label}
              </div>
              <div className="px-3 py-2 text-[#1C1917]">
                <MathText text={s.expression} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (visual.type === 'boxplots') {
    const [minDom, maxDom] = visual.domain;
    const width = 440;
    const padL = 88;
    const padR = 20;
    const rowH = 44;
    const height = visual.plots.length * rowH + 46;
    const plotW = width - padL - padR;
    const toX = (val: number) => padL + ((val - minDom) / (maxDom - minDom)) * plotW;

    const ticks: number[] = [];
    for (let v = minDom; v <= maxDom + 0.0001; v += visual.step) {
      ticks.push(Math.round(v * 100) / 100);
    }

    return (
      <div className="my-3 rounded-lg border border-[#E7E1DA] bg-white p-3">
        {visual.title && (
          <div className="mb-1 text-xs font-semibold text-[#44403C]">{visual.title}</div>
        )}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[460px] h-auto">
          {/* Grid lines & ticks */}
          {ticks.map((t) => {
            const x = toX(t);
            return (
              <g key={t}>
                <line
                  x1={x}
                  y1={8}
                  x2={x}
                  y2={height - 26}
                  stroke="#EFECE7"
                  strokeWidth={1}
                />
                <line
                  x1={x}
                  y1={height - 26}
                  x2={x}
                  y2={height - 21}
                  stroke="#57534E"
                  strokeWidth={1.2}
                />
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#44403C"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {t}
                </text>
              </g>
            );
          })}
          {/* Axis line */}
          <line
            x1={padL - 8}
            y1={height - 26}
            x2={width - padR + 8}
            y2={height - 26}
            stroke="#57534E"
            strokeWidth={1.4}
          />
          {visual.plots.map((p, idx) => {
            const cy = 24 + idx * rowH;
            const color = p.color || (idx % 2 === 0 ? '#9D174D' : '#1D4ED8');
            const xMin = toX(p.min);
            const xQ1 = toX(p.q1);
            const xMed = toX(p.median);
            const xQ3 = toX(p.q3);
            const xMax = toX(p.max);
            return (
              <g key={p.label}>
                <text
                  x={padL - 10}
                  y={cy + 4}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="600"
                  fill="#1C1917"
                >
                  {p.label}
                </text>
                {/* Whisker lines */}
                <line x1={xMin} y1={cy} x2={xQ1} y2={cy} stroke={color} strokeWidth={1.8} />
                <line x1={xQ3} y1={cy} x2={xMax} y2={cy} stroke={color} strokeWidth={1.8} />
                {/* Min / Max caps */}
                <line x1={xMin} y1={cy - 7} x2={xMin} y2={cy + 7} stroke={color} strokeWidth={1.8} />
                <line x1={xMax} y1={cy - 7} x2={xMax} y2={cy + 7} stroke={color} strokeWidth={1.8} />
                {/* IQR Box */}
                <rect
                  x={xQ1}
                  y={cy - 11}
                  width={Math.max(2, xQ3 - xQ1)}
                  height={22}
                  fill={`${color}18`}
                  stroke={color}
                  strokeWidth={1.8}
                  rx={2}
                />
                {/* Median line */}
                <line
                  x1={xMed}
                  y1={cy - 11}
                  x2={xMed}
                  y2={cy + 11}
                  stroke={color}
                  strokeWidth={2.5}
                />
              </g>
            );
          })}
        </svg>
        {visual.axisLabel && (
          <div className="mt-1 text-center text-[11px] text-[#57534E]">{visual.axisLabel}</div>
        )}
      </div>
    );
  }

  if (visual.type === 'dotplots') {
    const [minDom, maxDom] = visual.domain;
    const width = 440;
    const padL = 78;
    const padR = 20;
    const plotW = width - padL - padR;
    const toX = (val: number) => padL + ((val - minDom) / (maxDom - minDom)) * plotW;

    const maxDots = Math.max(
      3,
      ...visual.plots.flatMap((pl) => Object.values(pl.values))
    );
    const eachH = maxDots * 11 + 36;
    const height = visual.plots.length * eachH + 12;

    const ticks: number[] = [];
    for (let v = minDom; v <= maxDom + 0.0001; v += visual.step) {
      ticks.push(Math.round(v * 100) / 100);
    }

    return (
      <div className="my-3 rounded-lg border border-[#E7E1DA] bg-white p-3">
        {visual.title && (
          <div className="mb-1 text-xs font-semibold text-[#44403C]">{visual.title}</div>
        )}
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[460px] h-auto">
          {visual.plots.map((pl, pIdx) => {
            const baseY = (pIdx + 1) * eachH - 20;
            const color = pIdx % 2 === 0 ? '#9D174D' : '#0F766E';
            return (
              <g key={pl.label}>
                <text
                  x={padL - 10}
                  y={baseY - 12}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="600"
                  fill="#1C1917"
                >
                  {pl.label}
                </text>
                <line
                  x1={padL - 8}
                  y1={baseY}
                  x2={width - padR + 8}
                  y2={baseY}
                  stroke="#57534E"
                  strokeWidth={1.3}
                />
                {ticks.map((t) => {
                  const x = toX(t);
                  const count = pl.values[t] || 0;
                  return (
                    <g key={t}>
                      <line x1={x} y1={baseY - 3} x2={x} y2={baseY + 4} stroke="#57534E" />
                      <text
                        x={x}
                        y={baseY + 15}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#44403C"
                        fontFamily="IBM Plex Mono, monospace"
                      >
                        {t}
                      </text>
                      {Array.from({ length: count }).map((_, dIdx) => (
                        <circle
                          key={dIdx}
                          cx={x}
                          cy={baseY - 10 - dIdx * 10}
                          r={3.5}
                          fill={color}
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        {visual.axisLabel && (
          <div className="mt-1 text-center text-[11px] text-[#57534E]">{visual.axisLabel}</div>
        )}
      </div>
    );
  }

  if (visual.type === 'histogram') {
    const width = 400;
    const height = 210;
    const padL = 42;
    const padR = 16;
    const padT = 18;
    const padB = 40;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const barW = plotW / visual.bins.length;

    return (
      <div className="my-3 rounded-lg border border-[#E7E1DA] bg-white p-3">
        <div className="mb-1 text-xs font-semibold text-[#44403C]">{visual.title}</div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[420px] h-auto">
          {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
            const val = Math.round(visual.maxY * frac);
            const y = padT + plotH * (1 - frac);
            return (
              <g key={idx}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#EFECE7" />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#57534E"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}
          {visual.bins.map((bin, idx) => {
            const h = (bin.count / visual.maxY) * plotH;
            const x = padL + idx * barW;
            const y = padT + plotH - h;
            return (
              <g key={bin.label}>
                <rect
                  x={x + 1}
                  y={y}
                  width={Math.max(2, barW - 2)}
                  height={h}
                  fill="#9D174D33"
                  stroke="#9D174D"
                  strokeWidth={1.3}
                />
                <text
                  x={x + barW / 2}
                  y={padT + plotH + 14}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#44403C"
                >
                  {bin.label}
                </text>
              </g>
            );
          })}
          <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#44403C" strokeWidth={1.3} />
          <line
            x1={padL}
            y1={padT + plotH}
            x2={width - padR}
            y2={padT + plotH}
            stroke="#44403C"
            strokeWidth={1.3}
          />
          <text x={width / 2} y={height - 6} textAnchor="middle" fontSize="10" fill="#57534E">
            {visual.xLabel}
          </text>
          <text
            x={12}
            y={height / 2}
            textAnchor="middle"
            fontSize="10"
            fill="#57534E"
            transform={`rotate(-90 12 ${height / 2})`}
          >
            {visual.yLabel}
          </text>
        </svg>
      </div>
    );
  }

  // Coordinate Graph
  const [xMin, xMax] = visual.xRange;
  const [yMin, yMax] = visual.yRange;
  const xStep = visual.xStep ?? Math.max(1, Math.round((xMax - xMin) / 10));
  const yStep = visual.yStep ?? Math.max(1, Math.round((yMax - yMin) / 10));
  const size = 280;
  const pad = 28;
  const inner = size - pad * 2;

  const toPxX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * inner;
  const toPxY = (y: number) => pad + ((yMax - y) / (yMax - yMin)) * inner;

  const xTicks: number[] = [];
  for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax + 0.001; x += xStep) {
    xTicks.push(Math.round(x * 100) / 100);
  }
  const yTicks: number[] = [];
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax + 0.001; y += yStep) {
    yTicks.push(Math.round(y * 100) / 100);
  }

  const clipId = `clip-${Math.random().toString(36).slice(2, 9)}`;

  const renderCurvePath = (curve: NonNullable<typeof visual.curves>[number]) => {
    const pts: string[] = [];
    const samples = 80;
    for (let i = 0; i <= samples; i++) {
      const x = xMin + ((xMax - xMin) * i) / samples;
      const y =
        curve.fn === 'quadratic'
          ? curve.a * x * x + curve.b * x + (curve.c ?? 0)
          : curve.a * Math.pow(curve.b, x) + (curve.c ?? 0);
      if (Number.isFinite(y)) {
        pts.push(`${i === 0 ? 'M' : 'L'} ${toPxX(x).toFixed(1)} ${toPxY(y).toFixed(1)}`);
      }
    }
    return pts.join(' ');
  };

  return (
    <div className="my-3 rounded-lg border border-[#E7E1DA] bg-white p-3 inline-block">
      {visual.title && (
        <div className="mb-1.5 text-xs font-semibold text-[#44403C]">{visual.title}</div>
      )}
      <svg viewBox={`0 0 ${size} ${size}`} className="w-[260px] sm:w-[280px] h-auto">
        <defs>
          <clipPath id={clipId}>
            <rect x={pad} y={pad} width={inner} height={inner} />
          </clipPath>
        </defs>

        {/* Grid */}
        {xTicks.map((x) => (
          <line
            key={`gx-${x}`}
            x1={toPxX(x)}
            y1={pad}
            x2={toPxX(x)}
            y2={pad + inner}
            stroke="#EFECE7"
            strokeWidth={1}
          />
        ))}
        {yTicks.map((y) => (
          <line
            key={`gy-${y}`}
            x1={pad}
            y1={toPxY(y)}
            x2={pad + inner}
            y2={toPxY(y)}
            stroke="#EFECE7"
            strokeWidth={1}
          />
        ))}

        {/* Shaded inequalities */}
        <g clipPath={`url(#${clipId})`}>
          {visual.inequalities?.map((ineq, idx) => {
            const yLeft = ineq.slope * xMin + ineq.intercept;
            const yRight = ineq.slope * xMax + ineq.intercept;
            const isUpper = ineq.op === '>=' || ineq.op === '>';
            const fillY = isUpper ? pad : pad + inner;
            const polyPts = `${toPxX(xMin)},${toPxY(yLeft)} ${toPxX(xMax)},${toPxY(yRight)} ${toPxX(xMax)},${fillY} ${toPxX(xMin)},${fillY}`;
            const dashed = ineq.op === '<' || ineq.op === '>';
            return (
              <g key={`ineq-${idx}`}>
                <polygon points={polyPts} fill="#9D174D" fillOpacity={0.16} />
                <line
                  x1={toPxX(xMin)}
                  y1={toPxY(yLeft)}
                  x2={toPxX(xMax)}
                  y2={toPxY(yRight)}
                  stroke="#9D174D"
                  strokeWidth={2}
                  strokeDasharray={dashed ? '5,4' : undefined}
                />
              </g>
            );
          })}

          {visual.verticalInequality && (() => {
            const vx = toPxX(visual.verticalInequality.x);
            const isRight = visual.verticalInequality.op === '>=' || visual.verticalInequality.op === '>';
            const dashed = visual.verticalInequality.op === '<' || visual.verticalInequality.op === '>';
            return (
              <g>
                <rect
                  x={isRight ? vx : pad}
                  y={pad}
                  width={isRight ? pad + inner - vx : vx - pad}
                  height={inner}
                  fill="#0F766E"
                  fillOpacity={0.14}
                />
                <line
                  x1={vx}
                  y1={pad}
                  x2={vx}
                  y2={pad + inner}
                  stroke="#0F766E"
                  strokeWidth={2}
                  strokeDasharray={dashed ? '5,4' : undefined}
                />
              </g>
            );
          })()}
        </g>

        {/* Axes */}
        {yMin <= 0 && yMax >= 0 && (
          <line
            x1={pad}
            y1={toPxY(0)}
            x2={pad + inner}
            y2={toPxY(0)}
            stroke="#292524"
            strokeWidth={1.5}
          />
        )}
        {xMin <= 0 && xMax >= 0 && (
          <line
            x1={toPxX(0)}
            y1={pad}
            x2={toPxX(0)}
            y2={pad + inner}
            stroke="#292524"
            strokeWidth={1.5}
          />
        )}

        {/* Tick labels */}
        {xTicks.map((x) => {
          if (x === 0 && xMin < 0 && xMax > 0) return null;
          const axisY = yMin <= 0 && yMax >= 0 ? toPxY(0) : pad + inner;
          return (
            <text
              key={`tx-${x}`}
              x={toPxX(x)}
              y={Math.min(size - 6, axisY + 12)}
              textAnchor="middle"
              fontSize="8.5"
              fill="#57534E"
              fontFamily="IBM Plex Mono, monospace"
            >
              {x}
            </text>
          );
        })}
        {yTicks.map((y) => {
          if (y === 0 && yMin < 0 && yMax > 0) return null;
          const axisX = xMin <= 0 && xMax >= 0 ? toPxX(0) : pad;
          return (
            <text
              key={`ty-${y}`}
              x={Math.max(18, axisX - 5)}
              y={toPxY(y) + 3}
              textAnchor="end"
              fontSize="8.5"
              fill="#57534E"
              fontFamily="IBM Plex Mono, monospace"
            >
              {y}
            </text>
          );
        })}

        {/* Lines & Curves */}
        <g clipPath={`url(#${clipId})`}>
          {visual.lines?.map((line, idx) => {
            const color = line.color || (idx % 2 === 0 ? '#9D174D' : '#1D4ED8');
            if (line.points && line.points.length >= 2) {
              const p1 = line.points[0];
              const p2 = line.points[line.points.length - 1];
              return (
                <line
                  key={`ln-${idx}`}
                  x1={toPxX(p1.x)}
                  y1={toPxY(p1.y)}
                  x2={toPxX(p2.x)}
                  y2={toPxY(p2.y)}
                  stroke={color}
                  strokeWidth={2.2}
                  strokeDasharray={line.dashed ? '5,4' : undefined}
                />
              );
            }
            const m = line.slope ?? 0;
            const b = line.intercept ?? 0;
            return (
              <line
                key={`ln-${idx}`}
                x1={toPxX(xMin)}
                y1={toPxY(m * xMin + b)}
                x2={toPxX(xMax)}
                y2={toPxY(m * xMax + b)}
                stroke={color}
                strokeWidth={2.2}
                strokeDasharray={line.dashed ? '5,4' : undefined}
              />
            );
          })}

          {visual.curves?.map((curve, idx) => (
            <path
              key={`cv-${idx}`}
              d={renderCurvePath(curve)}
              fill="none"
              stroke={curve.color || '#9D174D'}
              strokeWidth={2.2}
            />
          ))}

          {visual.points?.map((pt, idx) => (
            <circle
              key={`pt-${idx}`}
              cx={toPxX(pt.x)}
              cy={toPxY(pt.y)}
              r={3.5}
              fill="#1C1917"
            />
          ))}
        </g>

        {/* Border frame */}
        <rect x={pad} y={pad} width={inner} height={inner} fill="none" stroke="#D6CFC7" strokeWidth={1} />
        {visual.xLabel && (
          <text x={pad + inner / 2} y={size - 3} textAnchor="middle" fontSize="9.5" fill="#44403C">
            {visual.xLabel}
          </text>
        )}
        {visual.yLabel && (
          <text
            x={10}
            y={pad + inner / 2}
            textAnchor="middle"
            fontSize="9.5"
            fill="#44403C"
            transform={`rotate(-90 10 ${pad + inner / 2})`}
          >
            {visual.yLabel}
          </text>
        )}
      </svg>
    </div>
  );
};
