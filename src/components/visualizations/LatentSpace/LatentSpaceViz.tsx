"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CLASS_COLORS, VIZ, VizButton, VizFrame, VizStat, gaussian, scale, seededRandom } from "../viz-kit";

const PW = 220, PH = 220, PAD = 18, GAP = 16;
const AE_DOM: [number, number] = [-3.5, 3.5];
const VAE_DOM: [number, number] = [-2.5, 2.5];

// Pre-compute static scales
const aeSx = scale(AE_DOM[0], AE_DOM[1], PAD, PW - PAD);
const aeSy = scale(AE_DOM[0], AE_DOM[1], PH - PAD, PAD);
const vaeSx = scale(VAE_DOM[0], VAE_DOM[1], PAD, PW - PAD);
const vaeSy = scale(VAE_DOM[0], VAE_DOM[1], PH - PAD, PAD);

// Data generation — seededRandom(23) for both panels
const AE_CENTERS = [[-2.4,-2.4],[2.4,-2.4],[0,2.8],[-2.4,2.0],[2.4,2.0]] as const;
const VAE_CENTERS = [[-1.1,-0.8],[1.1,-0.8],[0,1.3],[-1.1,0.8],[1.1,0.8]] as const;

interface Pt { x: number; y: number; cls: number }
function genPts(centers: readonly (readonly [number,number])[], sigma: number, seed: number): Pt[] {
  const rng = seededRandom(seed);
  return centers.flatMap((c, cls) => Array.from({ length: 12 }, () => ({ x: gaussian(rng, c[0], sigma), y: gaussian(rng, c[1], sigma), cls })));
}
const AE_PTS = genPts(AE_CENTERS, 0.3, 23);
const VAE_PTS = genPts(VAE_CENTERS, 0.5, 23);

// Morphing decoder shape prototypes [rx, ry, rot-deg]
const PROTOS: [number,number,number][] = [[28,14,0],[14,28,90],[22,22,45],[30,10,30],[10,30,60]];
const CANON = [[-1,-1],[1,-1],[0,1],[-1,1],[1,1]];

function shapeFor(nx: number, ny: number, gap: boolean, isAE: boolean) {
  if (isAE && gap) return { rx: 18, ry: 18, rot: 0, jagged: true };
  const w = CANON.map(([px,py]) => 1 / (Math.hypot(nx-px, ny-py) + 0.01));
  const sum = w.reduce((a,b)=>a+b,0);
  const nw = w.map(x=>x/sum);
  return { rx: PROTOS.reduce((s,p,i)=>s+nw[i]*p[0],0), ry: PROTOS.reduce((s,p,i)=>s+nw[i]*p[1],0), rot: PROTOS.reduce((s,p,i)=>s+nw[i]*p[2],0), jagged: false };
}

function jaggedPath(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i/10)*2*Math.PI, j = 0.4 + seededRandom(i*7+3)() * 0.8;
    return `${i===0?"M":"L"}${(cx+r*j*Math.cos(a)).toFixed(1)},${(cy+r*j*Math.sin(a)).toFixed(1)}`;
  });
  return pts.join(" ") + " Z";
}

export function LatentSpaceViz({ className }: { className?: string }) {
  const [mode, setMode] = useState<"AE"|"VAE">("VAE");
  const [drag, setDrag] = useState({ x: PW/2, y: PH/2 });
  const pressing = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const dom = mode === "AE" ? AE_DOM : VAE_DOM;
  const sx = mode === "AE" ? aeSx : vaeSx;
  const sy = mode === "AE" ? aeSy : vaeSy;
  const dataX = scale(PAD, PW-PAD, dom[0], dom[1])(drag.x);
  const dataY = scale(PH-PAD, PAD, dom[0], dom[1])(drag.y);

  const inGap = useMemo(() => {
    if (mode === "VAE") return false;
    return Math.min(...AE_CENTERS.map(([cx,cy]) => Math.hypot(dataX-cx, dataY-cy))) > 1.1;
  }, [mode, dataX, dataY]);

  const shape = useMemo(
    () => shapeFor(dataX/Math.abs(dom[1]), dataY/Math.abs(dom[1]), inGap, mode === "AE"),
    [dataX, dataY, dom, inGap, mode]
  );

  const updateDrag = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * (PW*2 + GAP);
    const rawX = svgX > PW + GAP ? svgX - (PW + GAP) : svgX;
    const rawY = ((e.clientY - rect.top) / rect.height) * PH;
    setDrag({ x: clamp(rawX, PAD, PW-PAD), y: clamp(rawY, PAD, PH-PAD) });
  }, []);

  const dotX = sx(dataX), dotY = sy(dataY);
  const aeDotX = aeSx(dataX), aeDotY = aeSy(dataY);
  const vaeDotX = vaeSx(dataX), vaeDotY = vaeSy(dataY);

  return (
    <VizFrame className={className} title="Latent Space: AE vs VAE"
      caption="In an AE, the latent space has gaps — sampling a point in a hole produces garbage. A VAE's KL term forces the posterior toward N(0,1), filling the gaps and enabling smooth interpolation.">
      <div className="flex gap-2 mb-3">
        <VizButton onClick={() => setMode("AE")} active={mode === "AE"}>AE</VizButton>
        <VizButton onClick={() => setMode("VAE")} active={mode === "VAE"}>VAE</VizButton>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${PW*2+GAP} ${PH+24}`}
        className="w-full block cursor-crosshair select-none" role="img" aria-label="Latent space panels"
        onMouseDown={(e) => { pressing.current = true; updateDrag(e); }}
        onMouseMove={(e) => { if (pressing.current) updateDrag(e); }}
        onMouseUp={() => { pressing.current = false; }}
        onMouseLeave={() => { pressing.current = false; }}>

        {/* Left panel — AE */}
        <rect x={0} y={0} width={PW} height={PH} rx={6} fill={VIZ.card} stroke={VIZ.axis} />
        <text x={PW/2} y={PH+16} textAnchor="middle" fontSize={10} fill={VIZ.text}>AE latent space</text>
        {AE_PTS.map((p,i) => <circle key={`a${i}`} cx={aeSx(p.x)} cy={aeSy(p.y)} r={4}
          fill={CLASS_COLORS[p.cls]} opacity={mode==="AE"?0.85:0.2} stroke="#0f1117" strokeWidth={0.5} />)}
        {mode === "AE" && inGap && <circle cx={dotX} cy={dotY} r={14} fill="none" stroke={VIZ.rose} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />}
        <circle cx={mode==="AE"?dotX:aeDotX} cy={mode==="AE"?dotY:aeDotY} r={mode==="AE"?8:7}
          fill={mode==="AE"?(inGap?VIZ.rose:VIZ.yellow):VIZ.yellow} stroke="white" strokeWidth={1.5} opacity={mode==="AE"?0.95:0.3} />

        {/* Right panel — VAE */}
        <rect x={PW+GAP} y={0} width={PW} height={PH} rx={6} fill={VIZ.card} stroke={VIZ.axis} />
        <text x={PW+GAP+PW/2} y={PH+16} textAnchor="middle" fontSize={10} fill={VIZ.text}>VAE latent space</text>
        {VAE_PTS.map((p,i) => <circle key={`v${i}`} cx={PW+GAP+vaeSx(p.x)} cy={vaeSy(p.y)} r={4}
          fill={CLASS_COLORS[p.cls]} opacity={mode==="VAE"?0.85:0.2} stroke="#0f1117" strokeWidth={0.5} />)}
        <circle cx={PW+GAP+(mode==="VAE"?dotX:vaeDotX)} cy={mode==="VAE"?dotY:vaeDotY} r={mode==="VAE"?8:7}
          fill={VIZ.yellow} stroke="white" strokeWidth={1.5} opacity={mode==="VAE"?0.95:0.3} />
      </svg>

      {/* Decoder output */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <span className="text-xs text-slate-400">Interpolated decoder output:</span>
        <svg viewBox="0 0 100 80" className="w-28 h-24" aria-label="Decoder output shape">
          <rect width={100} height={80} rx={4} fill={VIZ.card} stroke={VIZ.axis} />
          {shape.jagged ? (
            <>
              <path d={jaggedPath(50,40,26)} fill="none" stroke={VIZ.rose} strokeWidth={2} opacity={0.9} />
              <text x={50} y={44} textAnchor="middle" fontSize={18} fill={VIZ.rose}>?</text>
            </>
          ) : (
            <ellipse cx={50} cy={40} rx={shape.rx} ry={shape.ry} fill="none" stroke={VIZ.teal}
              strokeWidth={2.5} transform={`rotate(${shape.rot.toFixed(1)},50,40)`} opacity={0.9} />
          )}
        </svg>
      </div>

      <div className="flex gap-5 mt-3 flex-wrap">
        <VizStat label="mode" value={mode} color={mode==="VAE"?VIZ.teal:VIZ.orange} />
        <VizStat label="z" value={`[${dataX.toFixed(2)}, ${dataY.toFixed(2)}]`} color={VIZ.textBright} />
        {mode === "AE" && <VizStat label="in gap?" value={inGap?"Yes":"No"} color={inGap?VIZ.rose:VIZ.teal} />}
      </div>
    </VizFrame>
  );
}
