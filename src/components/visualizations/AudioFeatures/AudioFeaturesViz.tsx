"use client";

import { useMemo, useState } from "react";
import { VIZ, VizButton, seededRandom } from "../viz-kit";
import {
  GuidedViz,
  GuidedCard,
  GuidedLegend,
  GuidedPayoff,
  type GuidedPhase,
  type GuidedStep,
} from "../GuidedViz/GuidedViz";
import { clamp } from "@/lib/utils";

/**
 * The audio front-end, stage by stage: waveform → frames → spectrum →
 * spectrogram → mel → MFCC.
 *
 * This is the canonical case for a guided walkthrough. Every stage consumes
 * what the previous one produced, so a single picture would have to show all
 * six at once — and the interesting question is never "what does a mel
 * spectrogram look like" but "why is there a mel step at all". Each step
 * therefore says what it does *and* what was broken without it.
 *
 * Everything on screen is computed, not drawn from memory. A synthetic
 * utterance (two voiced segments around a fricative) is framed, Hann-windowed,
 * transformed with a real radix-2 FFT, passed through a real mel filterbank,
 * logged and DCT'd here in the browser. The window-length control re-runs the
 * whole pipeline, which is what makes the time–frequency trade-off testable
 * rather than merely asserted: 50 ms resolves the harmonics into stripes and
 * smears the fricative onset; 10 ms does the exact opposite, and the "Hz per
 * bin" readout in the panel moves with it.
 */

/* -------------------------------------------------------------- constants */

const SR = 16000; // sampling rate, Hz — the speech convention
const CLIP_MS = 640; // length of the toy utterance
const HOP_MS = 10; // hop between frames — held fixed
const WIN_CHOICES = [10, 25, 50] as const; // window lengths the reader can try
const N_MEL = 26; // triangular mel filters (the classic filterbank size)
const N_MFCC = 13; // cepstral coefficients kept
const F_MIN = 20; // filterbank low edge, Hz
const DB_FLOOR = 65; // dynamic range shown in the heatmaps, dB

const NYQUIST = SR / 2;
const N_SAMPLES = Math.round((CLIP_MS / 1000) * SR);
const HOP = Math.round((HOP_MS / 1000) * SR);

/* ------------------------------------------------------- signal synthesis */

interface Voiced {
  t0: number;
  t1: number;
  f0: [number, number];
  formants: [number, number, number];
  gain: number;
}

/** Two vowels around a fricative — enough structure to read off the picture. */
const VOICED: Voiced[] = [
  { t0: 0.02, t1: 0.21, f0: [124, 152], formants: [730, 1090, 2440], gain: 1 },
  { t0: 0.37, t1: 0.62, f0: [158, 112], formants: [270, 2290, 3010], gain: 0.9 },
];
const FRIC = { t0: 0.24, t1: 0.34, lo: 3800, hi: 7400, gain: 0.42 };

/** Raised-cosine fade so segment edges don't click (and don't smear the STFT). */
function fade(t: number, t0: number, t1: number, ms = 0.018): number {
  if (t < t0 || t > t1) return 0;
  const up = clamp((t - t0) / ms, 0, 1);
  const down = clamp((t1 - t) / ms, 0, 1);
  return 0.5 * (1 - Math.cos(Math.PI * up)) * 0.5 * (1 - Math.cos(Math.PI * down)) * 4;
}

/** Resonance envelope: how strongly the vocal tract passes frequency `f`. */
function formantGain(f: number, formants: [number, number, number]): number {
  let g = 0;
  formants.forEach((fc, k) => {
    const bw = 80 + 40 * k;
    g += (1 / (1 + k * 0.6)) / (1 + ((f - fc) / bw) ** 2);
  });
  return g;
}

/**
 * A source–filter synthesis of the clip: a harmonic stack whose fundamental
 * glides (the source) shaped by formant resonances (the filter), plus a band
 * of noise for the fricative. Deterministic — the noise phases come from the
 * seeded RNG.
 */
function synthesise(): Float32Array {
  const x = new Float32Array(N_SAMPLES);
  const rng = seededRandom(11);

  for (const seg of VOICED) {
    let phase = 0;
    for (let i = 0; i < N_SAMPLES; i++) {
      const t = i / SR;
      if (t < seg.t0 || t > seg.t1) continue;
      const u = (t - seg.t0) / (seg.t1 - seg.t0);
      const f0 = seg.f0[0] + (seg.f0[1] - seg.f0[0]) * u;
      phase += (2 * Math.PI * f0) / SR;
      const env = fade(t, seg.t0, seg.t1) * seg.gain;
      let v = 0;
      for (let k = 1; k * f0 < NYQUIST * 0.98; k++) {
        v += formantGain(k * f0, seg.formants) * Math.sin(k * phase);
      }
      x[i] += env * v;
    }
  }

  // Fricative: a band of sinusoids with random phases — noise with a known
  // spectral support, so the picture is honest about where the energy sits.
  const tones = 56;
  const freqs = Array.from({ length: tones }, () => FRIC.lo + rng() * (FRIC.hi - FRIC.lo));
  const phases = Array.from({ length: tones }, () => rng() * 2 * Math.PI);
  for (let i = 0; i < N_SAMPLES; i++) {
    const t = i / SR;
    const env = fade(t, FRIC.t0, FRIC.t1, 0.012) * FRIC.gain;
    if (env === 0) continue;
    let v = 0;
    for (let k = 0; k < tones; k++) v += Math.sin(2 * Math.PI * freqs[k] * t + phases[k]);
    x[i] += (env * v) / Math.sqrt(tones);
  }

  let peak = 0;
  for (let i = 0; i < N_SAMPLES; i++) peak = Math.max(peak, Math.abs(x[i]));
  if (peak > 0) for (let i = 0; i < N_SAMPLES; i++) x[i] /= peak;
  return x;
}

const CLIP = synthesise();

/* --------------------------------------------------------------- the DSP */

/** In-place iterative radix-2 Cooley–Tukey FFT. `re.length` must be a power of two. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const xr = re[i + k + half];
        const xi = im[i + k + half];
        const vr = xr * cr - xi * ci;
        const vi = xr * ci + xi * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

const hzToMel = (f: number) => 2595 * Math.log10(1 + f / 700);
const melToHz = (m: number) => 700 * (10 ** (m / 2595) - 1);

/** Triangular filters spaced evenly on the mel scale — `[filter][bin]` weights. */
function melFilterbank(nFft: number): { weights: Float64Array[]; centres: number[] } {
  const nBins = nFft / 2 + 1;
  const lo = hzToMel(F_MIN);
  const hi = hzToMel(NYQUIST);
  const edgeHz = Array.from({ length: N_MEL + 2 }, (_, i) =>
    melToHz(lo + ((hi - lo) * i) / (N_MEL + 1)),
  );
  const edgeBin = edgeHz.map((f) => (f * nFft) / SR);

  const weights = Array.from({ length: N_MEL }, (_, m) => {
    const w = new Float64Array(nBins);
    const [a, b, c] = [edgeBin[m], edgeBin[m + 1], edgeBin[m + 2]];
    for (let k = 0; k < nBins; k++) {
      if (k > a && k < b) w[k] = (k - a) / (b - a);
      else if (k >= b && k < c) w[k] = (c - k) / (c - b);
    }
    return w;
  });
  return { weights, centres: edgeHz.slice(1, N_MEL + 1) };
}

/** Orthonormal DCT-II — the decorrelating step that turns log-mel into cepstra. */
function dctII(x: Float64Array, keep: number): Float64Array {
  const n = x.length;
  const out = new Float64Array(keep);
  for (let k = 0; k < keep; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += x[i] * Math.cos((Math.PI * (i + 0.5) * k) / n);
    out[k] = s * Math.sqrt(2 / n) * (k === 0 ? Math.SQRT1_2 : 1);
  }
  return out;
}

interface Pipeline {
  winMs: number;
  nWin: number;
  nFft: number;
  nBins: number;
  nFrames: number;
  hzPerBin: number;
  overlap: number;
  window: Float64Array;
  /** Raw and windowed samples per frame, kept for the framing picture. */
  raw: Float32Array[];
  windowed: Float64Array[];
  /** Linear-frequency magnitudes, `[frame][bin]`. */
  mag: Float64Array[];
  /** Mel-band energies and their logs, `[frame][band]`. */
  logMel: Float64Array[];
  /** Cepstral coefficients, `[frame][coefficient]`. */
  mfcc: Float64Array[];
  melCentres: number[];
  melWeights: Float64Array[];
  /** 0…1 normalised copies for the heatmaps. */
  magNorm: number[][];
  melNorm: number[][];
  mfccNorm: number[][];
}

/** Run the whole front-end for one window length. */
function runPipeline(winMs: number): Pipeline {
  const nWin = Math.round((winMs / 1000) * SR);
  const nFft = 1 << Math.ceil(Math.log2(nWin));
  const nBins = nFft / 2 + 1;
  const nFrames = 1 + Math.floor((N_SAMPLES - nWin) / HOP);

  // Periodic Hann — the taper that stops the frame edges leaking across the
  // whole spectrum.
  const window = new Float64Array(nWin);
  for (let i = 0; i < nWin; i++) window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / nWin));

  const { weights, centres } = melFilterbank(nFft);

  const raw: Float32Array[] = [];
  const windowed: Float64Array[] = [];
  const mag: Float64Array[] = [];
  const logMel: Float64Array[] = [];
  const mfcc: Float64Array[] = [];

  for (let f = 0; f < nFrames; f++) {
    const start = f * HOP;
    const slice = CLIP.slice(start, start + nWin);
    const win = new Float64Array(nWin);
    for (let i = 0; i < nWin; i++) win[i] = slice[i] * window[i];

    const re = new Float64Array(nFft);
    const im = new Float64Array(nFft);
    re.set(win);
    fft(re, im);

    const m = new Float64Array(nBins);
    for (let k = 0; k < nBins; k++) m[k] = Math.hypot(re[k], im[k]) / nWin;

    const lm = new Float64Array(N_MEL);
    for (let b = 0; b < N_MEL; b++) {
      let e = 0;
      const w = weights[b];
      for (let k = 0; k < nBins; k++) e += w[k] * m[k] * m[k];
      lm[b] = Math.log(e + 1e-10);
    }

    raw.push(slice);
    windowed.push(win);
    mag.push(m);
    logMel.push(lm);
    mfcc.push(dctII(lm, N_MFCC));
  }

  return {
    winMs,
    nWin,
    nFft,
    nBins,
    nFrames,
    hzPerBin: SR / nFft,
    overlap: (nWin - HOP) / nWin,
    window,
    raw,
    windowed,
    mag,
    logMel,
    mfcc,
    melCentres: centres,
    melWeights: weights,
    magNorm: normaliseDb(mag),
    melNorm: normaliseLog(logMel),
    mfccNorm: normaliseSigned(mfcc),
  };
}

/** Magnitudes → dB, clipped to a fixed dynamic range below the loudest cell. */
function normaliseDb(frames: Float64Array[]): number[][] {
  let peak = 1e-12;
  for (const f of frames) for (const v of f) peak = Math.max(peak, v);
  return frames.map((f) =>
    Array.from(f, (v) => {
      const db = 20 * Math.log10((v + 1e-12) / peak);
      return clamp(1 + db / DB_FLOOR, 0, 1);
    }),
  );
}

/**
 * Log energies are natural-log *power*, so the same `DB_FLOOR` dynamic range is
 * `DB_FLOOR · ln10/10` nats below the loudest band.
 */
function normaliseLog(frames: Float64Array[]): number[][] {
  let hi = -Infinity;
  for (const f of frames) for (const v of f) hi = Math.max(hi, v);
  const lo = hi - (DB_FLOOR * Math.LN10) / 10;
  return frames.map((f) => Array.from(f, (v) => clamp((v - lo) / (hi - lo), 0, 1)));
}

/**
 * MFCCs are signed — map to 0…1 around a 0.5 midpoint for a diverging ramp.
 * `c0` is dropped: it is overall frame energy, an order of magnitude larger than
 * the rest, and including it would flatten every other coefficient to grey. The
 * scale is the 95th percentile rather than the maximum, for the same reason —
 * one loud frame should not wash the picture out.
 */
function normaliseSigned(frames: Float64Array[]): number[][] {
  const mags: number[] = [];
  for (const f of frames) for (let k = 1; k < f.length; k++) mags.push(Math.abs(f[k]));
  mags.sort((a, b) => a - b);
  const m = Math.max(mags[Math.floor(mags.length * 0.95)] ?? 1, 1e-12);
  return frames.map((f) => Array.from(f.slice(1), (v) => clamp(0.5 + v / (2 * m), 0, 1)));
}

/* -------------------------------------------------------------- colouring */

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Piecewise-linear RGB ramp through a list of stops. */
function makeRamp(stops: string[]): (t: number) => string {
  const rgb = stops.map(parseHex);
  return (t: number) => {
    const u = clamp(t, 0, 1) * (rgb.length - 1);
    const i = Math.min(rgb.length - 2, Math.floor(u));
    const f = u - i;
    const c = rgb[i].map((v, k) => Math.round(v + (rgb[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
}

/** Quiet → loud. Dark base so the spectrogram sits on the page background. */
const heat = makeRamp(["#0b0e17", "#1e2a56", "#4338ca", "#6366f1", "#22d3ee", "#fde047"]);
/** Negative → positive, for the signed cepstral coefficients. */
const diverge = makeRamp(["#fb7185", "#9f1239", "#1b1f2e", "#0f766e", "#5eead4"]);

/**
 * A heatmap drawn as one `<path>` per quantised colour level rather than one
 * `<rect>` per cell: 62 × 513 cells is 32k nodes the naive way, and ~18 the
 * batched way. `values` is `[column][row]`, row 0 at the bottom.
 */
function heatPaths(
  values: number[][],
  x0: number,
  y0: number,
  w: number,
  h: number,
  ramp: (t: number) => string,
  levels = 18,
): { d: string; fill: string }[] {
  const cols = values.length;
  const rows = values[0]?.length ?? 0;
  if (!cols || !rows) return [];
  const cw = w / cols;
  const ch = h / rows;
  // A hair of overlap kills the hairline seams between adjacent cells.
  const bw = (cw + 0.5).toFixed(2);
  const bh = (ch + 0.5).toFixed(2);
  const buckets: string[][] = Array.from({ length: levels }, () => []);

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const l = Math.min(levels - 1, Math.floor(clamp(values[c][r], 0, 1) * levels));
      const x = x0 + c * cw;
      const y = y0 + h - (r + 1) * ch;
      buckets[l].push(`M${x.toFixed(2)} ${y.toFixed(2)}h${bw}v${bh}h-${bw}z`);
    }
  }
  return buckets
    .map((b, l) => ({ d: b.join(""), fill: ramp((l + 0.5) / levels) }))
    .filter((b) => b.d.length > 0);
}

/* ------------------------------------------------------------ svg helpers */

/**
 * Min/max envelope of a waveform, one column per pixel — the way audio editors
 * draw it, and the only honest way to show 10,240 samples in 620 px.
 */
function envelopePath(
  x: Float32Array,
  from: number,
  to: number,
  px: number,
  py: number,
  w: number,
  h: number,
): string {
  const cols = Math.max(1, Math.round(w));
  const n = Math.max(1, to - from);
  const mid = py + h / 2;
  const top: string[] = [];
  const bot: string[] = [];
  for (let c = 0; c < cols; c++) {
    const a = from + Math.floor((c * n) / cols);
    const b = Math.max(a + 1, from + Math.floor(((c + 1) * n) / cols));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = a; i < b && i < to; i++) {
      if (x[i] < lo) lo = x[i];
      if (x[i] > hi) hi = x[i];
    }
    if (lo === Infinity) {
      lo = 0;
      hi = 0;
    }
    const xx = px + (c / cols) * w;
    top.push(`${xx.toFixed(1)} ${(mid - (hi * h) / 2).toFixed(1)}`);
    bot.push(`${xx.toFixed(1)} ${(mid - (lo * h) / 2).toFixed(1)}`);
  }
  return `M${top.join("L")}L${bot.reverse().join("L")}Z`;
}

/** Polyline through every sample — for the short slices that fit. */
function linePath(
  v: ArrayLike<number>,
  px: number,
  py: number,
  w: number,
  h: number,
  vmax: number,
): string {
  const mid = py + h / 2;
  const pts: string[] = [];
  for (let i = 0; i < v.length; i++) {
    const xx = px + (i / Math.max(1, v.length - 1)) * w;
    const yy = mid - (clamp(v[i] / vmax, -1, 1) * h) / 2;
    pts.push(`${xx.toFixed(1)} ${yy.toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/* ---------------------------------------------------------------- phases */

const PHASES: GuidedPhase[] = [
  { id: "time", label: "Time domain · the waveform", tone: "teal" },
  { id: "freq", label: "Frequency domain · the spectrogram", tone: "brand", numberPrefix: "F" },
];

const STEPS: GuidedStep[] = [
  {
    phase: "time",
    label: "Sampling",
    title: "Sound arrives as one very long list of numbers",
    body: (
      <>
        <p>
          A microphone turns air pressure into a voltage and the converter reads it{" "}
          <strong>{fmt(SR)} times a second</strong> — the speech convention. One second is{" "}
          {fmt(SR)} numbers, and <strong>Nyquist</strong> caps what those numbers can represent at{" "}
          <code>f_s/2</code> = {fmt(NYQUIST)} Hz. Sample too slowly and frequencies above the cap
          don&rsquo;t vanish, they <em>alias</em> — they come back disguised as low ones.
        </p>
        <p>
          This is the honest representation and a poor input. It is enormously long, and the part
          that carries meaning — <em>which frequencies are present</em> — is nowhere in any single
          number. It only exists as a relationship <em>between</em> them. Everything that follows is
          about dragging that relationship out into the open.
        </p>
      </>
    ),
    hint: `Zoom in: the smooth curve is really a list of samples ${(1e6 / SR).toFixed(1)} µs apart.`,
  },
  {
    phase: "time",
    label: "Frame & window",
    title: "Cut it into overlapping frames, and taper each one",
    body: (
      <>
        <p>
          Speech changes every few milliseconds, so we chop the clip into short frames and hop{" "}
          <strong>{HOP_MS} ms</strong> between them — at the usual 25 ms window that means every
          frame overlaps most of its neighbour. Each frame is then multiplied by a{" "}
          <strong>Hann taper</strong> that falls to zero at both edges.
        </p>
        <p>
          Without framing, one Fourier transform over the whole clip would tell you which
          frequencies occurred but not <em>when</em> — useless for speech, which <em>is</em> change.
          And without the taper, the hard cut at each frame edge is a discontinuity the transform
          reads as broadband energy that was never in the signal (<strong>spectral leakage</strong>).
          The overlap is what stops the taper from throwing the edges away.
        </p>
      </>
    ),
    hint: "Click the waveform to move the frame — whichever frame you pick is carried through every later step.",
  },
  {
    phase: "freq",
    label: "One spectrum",
    title: "Fourier-transform a single frame",
    body: (
      <>
        <p>
          The FFT rewrites the windowed frame as a sum of sinusoids, giving one magnitude per
          frequency bin. Phase is thrown away — for recognition, <em>what</em> frequencies are
          present matters and their relative timing inside a single frame does not.
        </p>
        <p>
          Look at what appears: a comb of evenly-spaced spikes (the voice&rsquo;s fundamental and its
          harmonics — the <em>source</em>) sitting under a few broad humps (the{" "}
          <strong>formants</strong>, resonances of the vocal tract — the <em>filter</em>). Which
          vowel you hear is decided by where those humps are. In the raw samples that fact was a
          squiggle; here it is a coordinate.
        </p>
      </>
    ),
    hint: "The spike spacing is the pitch; the broad humps under it are the formants that name the vowel.",
  },
  {
    phase: "freq",
    label: "Spectrogram",
    title: "Stack the frames into an image",
    body: (
      <>
        <p>
          One spectrum per frame, one column per spectrum: the <strong>STFT</strong>. Time runs
          across, frequency runs up, magnitude is brightness. A single spectrum was a still photo of
          a moving thing — and the transitions between sounds are most of the information in speech.
        </p>
        <p>
          It is now an <strong>image</strong>, which is the real prize: every 2-D tool — convolution,
          patching, attention over patches — transfers to audio unchanged. But the window length you
          chose is a hard trade: long windows resolve frequency and smear time, short windows do the
          reverse, and no window does both.
        </p>
      </>
    ),
    hint: "Change the window length above and watch the picture trade harmonics for onsets — the Hz-per-bin readout moves with it.",
  },
  {
    phase: "freq",
    label: "Mel filterbank",
    title: "Warp the frequency axis onto the ear",
    body: (
      <>
        <p>
          Pass every column through <strong>{N_MEL} triangular filters</strong> spaced evenly on the{" "}
          <strong>mel scale</strong> — roughly logarithmic — and keep the energy each one collects.
          Narrow and crowded at the bottom, wide and sparse at the top.
        </p>
        <p>
          A linear axis spends identical resolution on 200–400 Hz, where you hear a large pitch
          difference, and on 7,000–7,200 Hz, where you can barely tell the two apart. Most of the
          linear bins therefore describe distinctions no listener can make, and the model has to
          learn to ignore them from data. The filterbank throws that away up front.
        </p>
      </>
    ),
    hint: "Watch the triangles: equal spacing in mel is very unequal spacing in Hz.",
  },
  {
    phase: "freq",
    label: "Log + DCT",
    title: "Take the log, then decorrelate into MFCCs",
    body: (
      <>
        <p>
          Two last moves. <strong>Log</strong>, because loudness is perceived logarithmically — and
          because it turns the source × filter product into a source + filter <em>sum</em>. Then a{" "}
          <strong>DCT</strong>, keeping the first {N_MFCC} coefficients: neighbouring mel bands are
          heavily correlated, and the DCT packs that shared structure into a few numbers.
        </p>
        <p>
          The low coefficients hold the slowly-varying spectral envelope — the formants — while the
          high ones hold the fast ripple, which is pitch. Cutting at {N_MFCC} keeps the identity of
          the sound and discards the identity of the speaker. That mattered enormously to the models
          MFCCs were invented for; it matters less to a neural net, which is why modern systems
          usually stop one step earlier, at log-mel.
        </p>
      </>
    ),
    hint: "Compare the two heatmaps: the same utterance, one at 13 numbers per frame instead of hundreds.",
  },
];

const S_SAMPLE = 0;
const S_FRAME = 1;
const S_SPECTRUM = 2;
const S_SPECTROGRAM = 3;
const S_MEL = 4;
const S_MFCC = 5;

/* ------------------------------------------------------------------ view */

export function AudioFeaturesViz({ className }: { className?: string }) {
  const [winMs, setWinMs] = useState<number>(25);
  const [frame, setFrame] = useState(12);

  const p = useMemo(() => runPipeline(winMs), [winMs]);
  const f = Math.min(frame, p.nFrames - 1);
  const frameStart = f * HOP;
  const frameMs = (frameStart / SR) * 1000;

  /** Loudest bin of the selected frame — the annotation on the spectrum. */
  const peakBin = useMemo(() => {
    const m = p.mag[f];
    let best = 1;
    for (let k = 2; k < m.length; k++) if (m[k] > m[best]) best = k;
    return best;
  }, [p, f]);
  const peakHz = peakBin * p.hzPerBin;

  // Batching tens of thousands of cells into a handful of paths is cheap, but
  // not free — and it only changes when the window length does.
  const heatmaps = useMemo(
    () => ({
      lin: heatPaths(p.magNorm, 52, 26, 600, 224, heat),
      mel: heatPaths(p.melNorm, 52, 132, 600, 132, heat),
      mfcc: heatPaths(p.mfccNorm, 372, 46, 280, 200, diverge),
    }),
    [p],
  );

  const melCells = p.nFrames * N_MEL;
  const mfccCells = p.nFrames * N_MFCC;
  const linTotal = p.nFrames * p.nBins;

  const controls = (
    <>
      <span className="self-center font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
        STFT window
      </span>
      {WIN_CHOICES.map((w) => (
        <VizButton key={w} onClick={() => setWinMs(w)} active={winMs === w}>
          {w} ms
        </VizButton>
      ))}
    </>
  );

  /* -------------------------------------------------------------- stages */

  /** Step 01 — the waveform, plus a zoom that shows it is really discrete. */
  const sampleStage = () => {
    const z0 = Math.round(0.1 * SR);
    const zn = 64;
    const zoomX = 44 + ((z0 / N_SAMPLES) * 620);
    const zoomW = Math.max(3, (zn / N_SAMPLES) * 620);
    return (
      <svg
        viewBox="0 0 680 310"
        className="block w-full"
        role="img"
        aria-label="The synthetic utterance as a waveform, with a zoom showing individual samples"
      >
        <path d={envelopePath(CLIP, 0, N_SAMPLES, 44, 26, 620, 104)} fill={VIZ.teal} opacity={0.75} />
        <line x1={44} y1={78} x2={664} y2={78} stroke={VIZ.axis} strokeWidth={0.5} />
        <rect
          x={zoomX}
          y={26}
          width={zoomW}
          height={104}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={1.2}
        />
        <line x1={zoomX} y1={130} x2={44} y2={182} stroke={VIZ.orange} strokeWidth={0.6} strokeDasharray="3 3" />
        <line x1={zoomX + zoomW} y1={130} x2={664} y2={182} stroke={VIZ.orange} strokeWidth={0.6} strokeDasharray="3 3" />

        {[0, 160, 320, 480, 640].map((ms) => (
          <text
            key={ms}
            x={44 + (ms / CLIP_MS) * 620}
            y={148}
            textAnchor="middle"
            fill={VIZ.text}
            className="font-mono text-[9px]"
          >
            {ms} ms
          </text>
        ))}
        <text x={44} y={18} fill={VIZ.textBright} className="font-mono text-[10px]">
          {fmt(N_SAMPLES)} samples · amplitude −1 … 1
        </text>

        <rect x={44} y={182} width={620} height={110} fill={VIZ.card} stroke={VIZ.grid} rx={6} />
        <line x1={54} y1={237} x2={654} y2={237} stroke={VIZ.axis} strokeWidth={0.5} />
        {Array.from({ length: zn }, (_, i) => {
          const x = 54 + (i / (zn - 1)) * 600;
          const y = 237 - CLIP[z0 + i] * 48;
          return (
            <g key={i}>
              <line x1={x} y1={237} x2={x} y2={y} stroke={VIZ.brand} strokeWidth={0.8} opacity={0.5} />
              <circle cx={x} cy={y} r={2.1} fill={VIZ.brandLight} />
            </g>
          );
        })}
        <text x={54} y={200} fill={VIZ.textBright} className="font-mono text-[10px]">
          {zn} consecutive samples ≈ {((zn / SR) * 1000).toFixed(1)} ms
        </text>
      </svg>
    );
  };

  /** Step 02 — framing and the Hann taper, with the frame selectable. */
  const frameStage = () => {
    const wWidth = (p.nWin / N_SAMPLES) * 620;
    const fx = 44 + (frameStart / N_SAMPLES) * 620;
    const win = p.windowed[f];
    const rawMax = Math.max(...Array.from(p.raw[f], Math.abs), 1e-6);

    return (
      <svg
        viewBox="0 0 680 320"
        className="block w-full"
        role="img"
        aria-label="The waveform split into overlapping frames, with the selected frame windowed by a Hann taper"
      >
        <path d={envelopePath(CLIP, 0, N_SAMPLES, 44, 22, 620, 88)} fill={VIZ.teal} opacity={0.28} />
        <rect x={fx} y={22} width={wWidth} height={88} fill={VIZ.orange} opacity={0.14} />
        <path
          d={envelopePath(CLIP, frameStart, frameStart + p.nWin, fx, 22, wWidth, 88)}
          fill={VIZ.teal}
        />

        {/* frame ruler: every frame, staggered so the overlap is visible */}
        {Array.from({ length: p.nFrames }, (_, k) => {
          const x = 44 + ((k * HOP) / N_SAMPLES) * 620;
          return (
            <rect
              key={k}
              x={x}
              y={118 + (k % 2) * 7}
              width={wWidth}
              height={5}
              rx={2}
              fill={k === f ? VIZ.orange : VIZ.brand}
              opacity={k === f ? 1 : 0.22}
            />
          );
        })}
        <text x={44} y={146} fill={VIZ.text} className="font-mono text-[9px]">
          {p.nFrames} frames · {p.nWin} samples each · hop {HOP} ({(p.overlap * 100).toFixed(0)}%
          overlap)
        </text>

        {/* click target for choosing a frame */}
        <rect
          x={44}
          y={22}
          width={620}
          height={101}
          fill="transparent"
          className="cursor-pointer"
          onClick={(e) => {
            const box = (e.target as SVGRectElement).getBoundingClientRect();
            const u = clamp((e.clientX - box.left) / box.width, 0, 1);
            setFrame(clamp(Math.round((u * N_SAMPLES) / HOP), 0, p.nFrames - 1));
          }}
        />

        <rect x={44} y={166} width={620} height={140} fill={VIZ.card} stroke={VIZ.grid} rx={6} />
        <text x={54} y={184} fill={VIZ.textBright} className="font-mono text-[10px]">
          frame {f} · t = {frameMs.toFixed(0)} ms · {p.nWin} samples
        </text>
        <line x1={54} y1={246} x2={654} y2={246} stroke={VIZ.axis} strokeWidth={0.5} />
        <path
          d={linePath(
            Array.from(p.window, (w) => w * rawMax),
            54,
            196,
            600,
            100,
            rawMax,
          )}
          fill="none"
          stroke={VIZ.yellow}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.75}
        />
        <path
          d={linePath(p.raw[f], 54, 196, 600, 100, rawMax)}
          fill="none"
          stroke={VIZ.text}
          strokeWidth={0.7}
          opacity={0.45}
        />
        <path
          d={linePath(win, 54, 196, 600, 100, rawMax)}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={1.3}
        />
        <text x={654} y={184} textAnchor="end" fill={VIZ.yellow} className="font-mono text-[9px]">
          Hann taper
        </text>
      </svg>
    );
  };

  /** Step F1 — the magnitude spectrum of the selected frame. */
  const spectrumStage = () => {
    const m = p.mag[f];
    const peak = Math.max(...Array.from(m), 1e-9);
    const pts: string[] = [];
    for (let k = 0; k < p.nBins; k++) {
      const x = 52 + (k / (p.nBins - 1)) * 600;
      const y = 262 - (m[k] / peak) * 210;
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return (
      <svg
        viewBox="0 0 680 300"
        className="block w-full"
        role="img"
        aria-label="Magnitude spectrum of the selected frame, showing harmonics under formant peaks"
      >
        <path d={`M52 262L${pts.join("L")}L652 262Z`} fill={VIZ.brand} opacity={0.28} />
        <path d={`M${pts.join("L")}`} fill="none" stroke={VIZ.brandLight} strokeWidth={1.1} />
        <line x1={52} y1={262} x2={652} y2={262} stroke={VIZ.axis} strokeWidth={0.6} />
        {[0, 2000, 4000, 6000, 8000].map((hz) => (
          <g key={hz}>
            <line
              x1={52 + (hz / NYQUIST) * 600}
              y1={52}
              x2={52 + (hz / NYQUIST) * 600}
              y2={262}
              stroke={VIZ.grid}
              strokeWidth={0.5}
            />
            <text
              x={52 + (hz / NYQUIST) * 600}
              y={278}
              textAnchor="middle"
              fill={VIZ.text}
              className="font-mono text-[9px]"
            >
              {hz / 1000} kHz
            </text>
          </g>
        ))}
        <line
          x1={52 + (peakHz / NYQUIST) * 600}
          y1={44}
          x2={52 + (peakHz / NYQUIST) * 600}
          y2={262}
          stroke={VIZ.orange}
          strokeWidth={0.9}
          strokeDasharray="4 3"
        />
        <text
          x={52 + (peakHz / NYQUIST) * 600 + 6}
          y={44}
          fill={VIZ.orange}
          className="font-mono text-[10px]"
        >
          peak {peakHz.toFixed(0)} Hz
        </text>
        <text x={52} y={24} fill={VIZ.textBright} className="font-mono text-[10px]">
          frame {f} · {p.nFft}-point FFT → {p.nBins} magnitude bins
        </text>
        <text x={652} y={24} textAnchor="end" fill={VIZ.text} className="font-mono text-[10px]">
          {p.hzPerBin.toFixed(1)} Hz per bin
        </text>
      </svg>
    );
  };

  /** Step F2 — the full linear-frequency spectrogram. */
  const spectrogramStage = () => {
    const cells = heatmaps.lin;
    const colW = 600 / p.nFrames;
    return (
      <svg
        viewBox="0 0 680 290"
        className="block w-full"
        role="img"
        aria-label="Spectrogram: time on the horizontal axis, linear frequency on the vertical, magnitude as brightness"
      >
        {cells.map((c) => (
          <path key={c.fill} d={c.d} fill={c.fill} />
        ))}
        <rect
          x={52 + f * colW}
          y={26}
          width={Math.max(1.5, colW)}
          height={224}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={1.2}
        />
        {[0, 2000, 4000, 6000, 8000].map((hz) => (
          <text
            key={hz}
            x={46}
            y={250 - (hz / NYQUIST) * 224 + 3}
            textAnchor="end"
            fill={VIZ.text}
            className="font-mono text-[9px]"
          >
            {hz === 0 ? "0" : `${hz / 1000}k`}
          </text>
        ))}
        {[0, 160, 320, 480, 640].map((ms) => (
          <text
            key={ms}
            x={52 + (ms / CLIP_MS) * 600}
            y={266}
            textAnchor="middle"
            fill={VIZ.text}
            className="font-mono text-[9px]"
          >
            {ms} ms
          </text>
        ))}
        <text x={52} y={18} fill={VIZ.textBright} className="font-mono text-[10px]">
          {p.nFrames} × {p.nBins} = {fmt(linTotal)} values · {p.hzPerBin.toFixed(1)} Hz per bin ·{" "}
          {HOP_MS} ms per column
        </text>
      </svg>
    );
  };

  /** Step F3 — the filterbank on top, the mel spectrogram below. */
  const melStage = () => {
    const cells = heatmaps.mel;
    const colW = 600 / p.nFrames;
    return (
      <svg
        viewBox="0 0 680 300"
        className="block w-full"
        role="img"
        aria-label="Triangular mel filterbank over the linear frequency axis, and the resulting mel spectrogram"
      >
        {p.melWeights.map((w, b) => {
          const pts: string[] = [];
          for (let k = 0; k < p.nBins; k++) {
            if (w[k] <= 0) continue;
            pts.push(`${(52 + (k / (p.nBins - 1)) * 600).toFixed(1)} ${(96 - w[k] * 62).toFixed(1)}`);
          }
          if (!pts.length) return null;
          return (
            <path
              key={b}
              d={`M${pts.join("L")}`}
              fill="none"
              stroke={heat(0.25 + (b / N_MEL) * 0.6)}
              strokeWidth={1}
              opacity={0.9}
            />
          );
        })}
        <line x1={52} y1={96} x2={652} y2={96} stroke={VIZ.axis} strokeWidth={0.6} />
        {[0, 2000, 4000, 6000, 8000].map((hz) => (
          <text
            key={hz}
            x={52 + (hz / NYQUIST) * 600}
            y={110}
            textAnchor="middle"
            fill={VIZ.text}
            className="font-mono text-[9px]"
          >
            {hz / 1000} kHz
          </text>
        ))}
        <text x={52} y={24} fill={VIZ.textBright} className="font-mono text-[10px]">
          {N_MEL} triangular filters · equally spaced in mel, not in Hz
        </text>

        {cells.map((c) => (
          <path key={c.fill} d={c.d} fill={c.fill} />
        ))}
        <rect
          x={52 + f * colW}
          y={132}
          width={Math.max(1.5, colW)}
          height={132}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={1.2}
        />
        {[0, 8, 16, 25].map((b) => (
          <text
            key={b}
            x={46}
            y={264 - ((b + 0.5) / N_MEL) * 132 + 3}
            textAnchor="end"
            fill={VIZ.text}
            className="font-mono text-[9px]"
          >
            {fmt(p.melCentres[b])}
          </text>
        ))}
        <text x={652} y={126} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
          band centre, Hz
        </text>
        <text x={52} y={126} fill={VIZ.textBright} className="font-mono text-[10px]">
          mel spectrogram · {p.nFrames} × {N_MEL} = {fmt(melCells)} values
        </text>
        <text x={52} y={280} fill={VIZ.text} className="font-mono text-[9px]">
          {p.nBins} linear bins → {N_MEL} mel bands ({(p.nBins / N_MEL).toFixed(1)}× fewer)
        </text>
      </svg>
    );
  };

  /** Step F4 — the cepstral coefficients of one frame, and of the whole clip. */
  const mfccStage = () => {
    const cells = heatmaps.mfcc;
    const colW = 280 / p.nFrames;
    // c0 is frame energy and dwarfs the rest — reported as a number so the bars
    // can be scaled to the coefficients that carry the spectral shape.
    const c = Array.from(p.mfcc[f]).slice(1);
    const scale = Math.max(...c.map(Math.abs), 1e-9);
    const bw = 240 / c.length;
    return (
      <svg
        viewBox="0 0 680 290"
        className="block w-full"
        role="img"
        aria-label="Cepstral coefficients of the selected frame, and the MFCC heatmap for the whole clip"
      >
        <text x={52} y={24} fill={VIZ.textBright} className="font-mono text-[10px]">
          frame {f} · c1–c{N_MFCC - 1}
        </text>
        <text x={292} y={24} textAnchor="end" fill={VIZ.text} className="font-mono text-[10px]">
          c0 = {p.mfcc[f][0].toFixed(1)} (energy)
        </text>
        <line x1={52} y1={146} x2={292} y2={146} stroke={VIZ.axis} strokeWidth={0.6} />
        {c.map((v, k) => {
          const h = (Math.abs(v) / scale) * 92;
          return (
            <g key={k}>
              <rect
                x={52 + k * bw + 1.5}
                y={v >= 0 ? 146 - h : 146}
                width={bw - 3}
                height={Math.max(1, h)}
                fill={v >= 0 ? VIZ.teal : VIZ.rose}
              />
              <text
                x={52 + k * bw + bw / 2}
                y={258}
                textAnchor="middle"
                fill={VIZ.text}
                className="font-mono text-[8px]"
              >
                c{k + 1}
              </text>
            </g>
          );
        })}
        <text x={52} y={276} fill={VIZ.text} className="font-mono text-[9px]">
          c1–c4 = spectral envelope (the formants) · high c = fine ripple (pitch)
        </text>

        <text x={372} y={24} fill={VIZ.textBright} className="font-mono text-[10px]">
          MFCCs · {p.nFrames} × {N_MFCC} = {fmt(mfccCells)} values
        </text>
        <text x={652} y={24} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
          c1–c{N_MFCC - 1} shown
        </text>
        {cells.map((cl) => (
          <path key={cl.fill} d={cl.d} fill={cl.fill} />
        ))}
        <rect
          x={372 + f * colW}
          y={46}
          width={Math.max(1.5, colW)}
          height={200}
          fill="none"
          stroke={VIZ.orange}
          strokeWidth={1.2}
        />
        <text x={366} y={52} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
          c{N_MFCC - 1}
        </text>
        <text x={366} y={246} textAnchor="end" fill={VIZ.text} className="font-mono text-[9px]">
          c1
        </text>
        <text x={372} y={266} fill={VIZ.text} className="font-mono text-[9px]">
          time →
        </text>
      </svg>
    );
  };

  const stage = (i: number) => {
    if (i === S_SAMPLE) return sampleStage();
    if (i === S_FRAME) return frameStage();
    if (i === S_SPECTRUM) return spectrumStage();
    if (i === S_SPECTROGRAM) return spectrogramStage();
    if (i === S_MEL) return melStage();
    return mfccStage();
  };

  /* --------------------------------------------------------------- panel */

  const panel = (i: number) => (
    <>
      <PanelTitle>What the pipeline has produced so far</PanelTitle>
      <div className="flex flex-wrap gap-2.5">
        <GuidedCard label="waveform" accent={VIZ.teal}>
          {fmt(SR)} Hz · {CLIP_MS} ms → <Num>{fmt(N_SAMPLES)}</Num> samples. Nyquist ceiling{" "}
          {fmt(NYQUIST)} Hz.
        </GuidedCard>

        {i >= S_FRAME && (
          <GuidedCard label="frames" accent={VIZ.orange}>
            <Num>{p.nFrames}</Num> frames · {p.nWin} samples ({p.winMs} ms), hop {HOP} (
            {(p.overlap * 100).toFixed(0)}% overlap) · Hann.
          </GuidedCard>
        )}

        {i >= S_SPECTRUM && (
          <GuidedCard label="spectrum" accent={VIZ.brand}>
            {p.nFft}-point FFT → <Num>{p.nBins}</Num> bins, {p.hzPerBin.toFixed(1)} Hz apart. Phase
            discarded.
          </GuidedCard>
        )}

        {i >= S_SPECTROGRAM && (
          <GuidedCard label="spectrogram" accent={VIZ.brandLight}>
            {p.nFrames} × {p.nBins} = <Num>{fmt(linTotal)}</Num> values — a time × frequency image.
          </GuidedCard>
        )}

        {i >= S_MEL && (
          <GuidedCard label="mel" accent={VIZ.yellow}>
            {N_MEL} bands → {p.nFrames} × {N_MEL} = <Num>{fmt(melCells)}</Num> values, resolution
            spent where the ear has it.
          </GuidedCard>
        )}

        {i >= S_MFCC && (
          <GuidedCard label="mfcc" accent={VIZ.rose}>
            log + DCT, keep {N_MFCC} → {p.nFrames} × {N_MFCC} = <Num>{fmt(mfccCells)}</Num> values,
            decorrelated.
          </GuidedCard>
        )}
      </div>

      {i === S_SPECTROGRAM && (
        <GuidedPayoff label="the trade you just made">
          At a {p.winMs} ms window each column resolves frequency to{" "}
          <strong className="font-semibold text-white">{p.hzPerBin.toFixed(1)} Hz</strong> and time
          to <strong className="font-semibold text-white">{p.winMs} ms</strong>. Their product is
          fixed: buying one costs the other. Speech systems land on 25 ms because that is roughly the
          longest stretch over which a speech sound holds still.
        </GuidedPayoff>
      )}

      {i === S_MFCC && (
        <GuidedPayoff label="what the front-end bought">
          {fmt(N_SAMPLES)} samples → {fmt(linTotal)} spectrogram values → {fmt(melCells)} mel →{" "}
          <strong className="font-semibold text-white">{fmt(mfccCells)} MFCCs</strong>: a{" "}
          {(N_SAMPLES / mfccCells).toFixed(0)}× reduction in which almost nothing that identifies the
          sound was lost. Every step of that ladder was a claim about hearing, not about compression
          — and the last two steps are the ones modern models increasingly skip, feeding log-mel
          (or the raw waveform) to a network and letting it learn its own front-end.
        </GuidedPayoff>
      )}
    </>
  );

  /* -------------------------------------------------------------- legend */

  const legend = (i: number) => {
    if (i === S_SAMPLE)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>waveform</GuidedLegend>
          <GuidedLegend color={VIZ.brandLight}>individual samples</GuidedLegend>
        </>
      );
    if (i === S_FRAME)
      return (
        <>
          <GuidedLegend color={VIZ.orange}>selected frame (windowed)</GuidedLegend>
          <GuidedLegend color={VIZ.text}>raw frame</GuidedLegend>
          <GuidedLegend color={VIZ.yellow}>Hann taper</GuidedLegend>
        </>
      );
    if (i === S_MFCC)
      return (
        <>
          <GuidedLegend color={VIZ.teal}>positive coefficient</GuidedLegend>
          <GuidedLegend color={VIZ.rose}>negative coefficient</GuidedLegend>
          <GuidedLegend color={VIZ.orange}>selected frame</GuidedLegend>
        </>
      );
    if (i === S_SPECTRUM) return <GuidedLegend color={VIZ.brandLight}>magnitude</GuidedLegend>;
    return (
      <>
        <GuidedLegend color={heat(0.22)}>quiet</GuidedLegend>
        <GuidedLegend color={heat(0.58)}>mid</GuidedLegend>
        <GuidedLegend color={heat(0.95)}>loud</GuidedLegend>
        <GuidedLegend color={VIZ.orange}>selected frame</GuidedLegend>
      </>
    );
  };

  const stageNote = (i: number) => {
    if (i === S_SAMPLE) return `${fmt(SR)} Hz · ${CLIP_MS} ms`;
    if (i >= S_SPECTROGRAM && i !== S_MFCC)
      return `${p.winMs} ms window · ${p.hzPerBin.toFixed(1)} Hz per bin`;
    return `frame ${f} · t = ${frameMs.toFixed(0)} ms`;
  };

  return (
    <GuidedViz
      className={className}
      title="From sound to tensor: the audio front-end, step by step"
      caption="A synthetic utterance — two vowels around a fricative — carried through the whole feature pipeline. Every number on screen is computed live in the browser: real Hann windowing, a real radix-2 FFT, a real mel filterbank and a real DCT. Changing the window length re-runs all of it, so the time–frequency trade-off is something you can test rather than something you have to take on faith."
      phases={PHASES}
      steps={STEPS}
      controls={controls}
      stage={stage}
      stageNote={stageNote}
      panel={panel}
      legend={legend}
    />
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
      {children}
    </div>
  );
}

/** Emphasised figure inside a panel card. */
function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-slate-200">{children}</span>;
}
