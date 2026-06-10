"use client";

import { useState, useCallback, useMemo } from "react";
import { VizFrame, VizButton, VizStat, VIZ, CLASS_COLORS } from "../viz-kit";

const TRUE_MEANS = [0.5, 3.0, 2.0, 1.5];
const ACTION_LABELS = ["A₀", "A₁", "A₂", "A₃"];
const LR = 0.25;

function softmax(logits: number[]): number[] {
  const maxL = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxL));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

interface StepRecord {
  action: number;
  reward: number;
  baseline: number;
  advantage: number;
}

export function PolicyGradientViz({ className }: { className?: string }) {
  const [logits, setLogits] = useState([0, 0, 0, 0]);
  const [baselineOn, setBaselineOn] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [runningMean, setRunningMean] = useState(0);
  const [lastStep, setLastStep] = useState<StepRecord | null>(null);
  const [rewardHistory, setRewardHistory] = useState<number[]>([]);
  const [advHistory, setAdvHistory] = useState<number[]>([]);

  const probs = useMemo(() => softmax(logits), [logits]);
  const entropy = useMemo(
    () => -probs.reduce((s, p) => s + (p > 1e-10 ? p * Math.log(p) : 0), 0),
    [probs]
  );

  const handleStep = useCallback(() => {
    const currentProbs = softmax(logits);

    // Sample action from current policy
    const r = Math.random();
    let cumulative = 0;
    let sampledAction = 0;
    for (let i = 0; i < currentProbs.length; i++) {
      cumulative += currentProbs[i];
      if (r <= cumulative) {
        sampledAction = i;
        break;
      }
    }

    // Gaussian reward: mean + σ=0.8 noise
    const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 0.93;
    const reward = TRUE_MEANS[sampledAction] + noise;

    const newCount = stepCount + 1;
    const prevMean = runningMean;
    const newMean = prevMean + (reward - prevMean) / newCount;

    const baseline = baselineOn ? prevMean : 0;
    const advantage = reward - baseline;

    // Proper softmax-policy gradient update:
    // ∂log π(a|θ) / ∂θ_i = 1[i==a] - π_i
    const newLogits = logits.map((l, i) => {
      const grad = (i === sampledAction ? 1 - currentProbs[i] : -currentProbs[i]);
      return l + LR * grad * advantage;
    });

    setLogits(newLogits);
    setStepCount(newCount);
    setRunningMean(newMean);
    setLastStep({ action: sampledAction, reward, baseline, advantage });
    setRewardHistory((prev) => [...prev.slice(-24), reward]);
    setAdvHistory((prev) => [...prev.slice(-24), advantage]);
  }, [logits, baselineOn, stepCount, runningMean]);

  const handleReset = useCallback(() => {
    setLogits([0, 0, 0, 0]);
    setStepCount(0);
    setRunningMean(0);
    setLastStep(null);
    setRewardHistory([]);
    setAdvHistory([]);
  }, []);

  const advVariance = useMemo(() => {
    if (advHistory.length < 2) return 0;
    const mean = advHistory.reduce((a, b) => a + b, 0) / advHistory.length;
    return advHistory.reduce((a, b) => a + (b - mean) ** 2, 0) / advHistory.length;
  }, [advHistory]);

  // Layout constants
  const W = 500;
  const BAR_X = 56;
  const BAR_MAX_W = 280;
  const ROW_H = 42;
  const ROWS_TOP = 22;
  const DIVIDER_Y = ROWS_TOP + 4 * ROW_H + 2;
  const INFO_Y = DIVIDER_Y + 18;
  const HIST_Y = INFO_Y + 24;
  const SVG_H = HIST_Y + 50;

  return (
    <VizFrame
      title="Policy Gradient: Bandit"
      caption="The softmax policy π(a|θ) is updated each step via the policy gradient. Positive advantage increases the chosen action's probability; negative advantage decreases it. Toggle baseline to reduce variance."
      className={className}
    >
      <svg viewBox={`0 0 ${W} ${SVG_H}`} className="w-full" style={{ maxHeight: SVG_H }}>
        {/* Column labels */}
        <text x={BAR_X} y={13} fill={VIZ.text} fontSize={9} textAnchor="start">
          π(a) →
        </text>
        <text x={W - 6} y={13} fill={VIZ.text} fontSize={9} textAnchor="end">
          true μ
        </text>

        {/* Action probability bars */}
        {probs.map((prob, i) => {
          const y = ROWS_TOP + i * ROW_H;
          const barW = prob * BAR_MAX_W;
          const isSelected = lastStep?.action === i;
          const advPositive = (lastStep?.advantage ?? 0) >= 0;
          const barColor = isSelected
            ? advPositive
              ? VIZ.teal
              : VIZ.rose
            : CLASS_COLORS[i % CLASS_COLORS.length];

          return (
            <g key={i}>
              {/* Row highlight */}
              {isSelected && (
                <rect
                  x={0}
                  y={y}
                  width={W}
                  height={ROW_H - 2}
                  fill={advPositive ? "rgba(20,184,166,0.06)" : "rgba(244,63,94,0.06)"}
                  rx={4}
                />
              )}

              {/* Arrow indicator */}
              {isSelected && (
                <text
                  x={12}
                  y={y + 24}
                  fill={advPositive ? VIZ.teal : VIZ.rose}
                  fontSize={13}
                  textAnchor="middle"
                >
                  {advPositive ? "▲" : "▼"}
                </text>
              )}

              {/* Action label */}
              <text
                x={36}
                y={y + 24}
                fill={barColor}
                fontSize={12}
                fontWeight="bold"
                textAnchor="middle"
              >
                {ACTION_LABELS[i]}
              </text>

              {/* Track */}
              <rect x={BAR_X} y={y + 13} width={BAR_MAX_W} height={16} fill={VIZ.grid} rx={3} />

              {/* Bar */}
              <rect
                x={BAR_X}
                y={y + 13}
                width={barW}
                height={16}
                fill={barColor}
                rx={3}
                opacity={isSelected ? 1.0 : 0.65}
              />

              {/* Probability text */}
              <text
                x={BAR_X + barW + 6}
                y={y + 25}
                fill={VIZ.textBright}
                fontSize={11}
                fontFamily="monospace"
              >
                {(prob * 100).toFixed(1)}%
              </text>

              {/* True mean */}
              <text
                x={W - 6}
                y={y + 25}
                fill={VIZ.text}
                fontSize={10}
                textAnchor="end"
              >
                {TRUE_MEANS[i].toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Divider */}
        <line
          x1={0}
          y1={DIVIDER_Y}
          x2={W}
          y2={DIVIDER_Y}
          stroke={VIZ.grid}
          strokeWidth={1}
        />

        {/* Last step info */}
        {lastStep ? (
          <g>
            <text x={6} y={INFO_Y} fill={VIZ.text} fontSize={10}>
              <tspan fill={CLASS_COLORS[lastStep.action % CLASS_COLORS.length]} fontWeight="bold">
                {ACTION_LABELS[lastStep.action]}
              </tspan>
              <tspan> sampled · r=</tspan>
              <tspan fill={VIZ.textBright} fontFamily="monospace">
                {lastStep.reward.toFixed(2)}
              </tspan>
              {baselineOn && (
                <>
                  <tspan> · b=</tspan>
                  <tspan fill={VIZ.yellow} fontFamily="monospace">
                    {lastStep.baseline.toFixed(2)}
                  </tspan>
                </>
              )}
              <tspan> · A=</tspan>
              <tspan
                fill={lastStep.advantage >= 0 ? VIZ.teal : VIZ.rose}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {lastStep.advantage >= 0 ? "+" : ""}
                {lastStep.advantage.toFixed(2)}
              </tspan>
              <tspan fill={lastStep.advantage >= 0 ? VIZ.teal : VIZ.rose}>
                {lastStep.advantage >= 0 ? " ↑ prob" : " ↓ prob"}
              </tspan>
            </text>
          </g>
        ) : (
          <text x={6} y={INFO_Y} fill={VIZ.text} fontSize={10} fontStyle="italic">
            Click Step to sample an action and observe the policy update…
          </text>
        )}

        {/* Reward / advantage history bars */}
        {rewardHistory.length > 0 && (
          <g transform={`translate(0, ${HIST_Y})`}>
            <text x={0} y={10} fill={VIZ.text} fontSize={8}>
              {baselineOn ? "advantage" : "reward"} history
            </text>
            {(baselineOn ? advHistory : rewardHistory).map((v, idx) => {
              const MAX_VAL = 4;
              const clampedPos = Math.min(Math.max(v, -MAX_VAL), MAX_VAL);
              const barH = (Math.abs(clampedPos) / MAX_VAL) * 22;
              const isPos = clampedPos >= 0;
              const x = 120 + idx * 13;
              return (
                <rect
                  key={idx}
                  x={x}
                  y={isPos ? 26 - barH : 26}
                  width={10}
                  height={barH}
                  fill={isPos ? VIZ.teal : VIZ.rose}
                  rx={2}
                  opacity={0.7}
                />
              );
            })}
            {/* Zero line */}
            <line
              x1={120}
              y1={26}
              x2={120 + rewardHistory.length * 13}
              y2={26}
              stroke={VIZ.axis}
              strokeWidth={1}
            />
            {/* Baseline level line for reward history */}
            {!baselineOn && runningMean > 0 && (
              <line
                x1={120}
                y1={26 - (Math.min(runningMean, 4) / 4) * 22}
                x2={120 + rewardHistory.length * 13}
                y2={26 - (Math.min(runningMean, 4) / 4) * 22}
                stroke={VIZ.yellow}
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
            )}
            {runningMean > 0 && !baselineOn && (
              <text x={116} y={26 - (Math.min(runningMean, 4) / 4) * 22 - 2} fill={VIZ.yellow} fontSize={7} textAnchor="end">
                mean
              </text>
            )}
          </g>
        )}

        {/* Entropy */}
        <text x={W - 6} y={SVG_H - 4} fill={VIZ.text} fontSize={9} textAnchor="end">
          H(π) = {entropy.toFixed(3)}
        </text>
      </svg>

      <div className="flex flex-wrap items-center gap-3 mt-3">
        <VizButton onClick={handleStep}>Step</VizButton>
        <VizButton onClick={handleReset}>Reset</VizButton>
        <VizButton onClick={() => setBaselineOn((b) => !b)} active={baselineOn}>
          Baseline {baselineOn ? "ON" : "OFF"}
        </VizButton>
        <div className="flex gap-4 ml-2">
          <VizStat label="steps" value={stepCount.toString()} />
          <VizStat
            label="adv σ²"
            value={advVariance.toFixed(2)}
            color={baselineOn ? VIZ.teal : VIZ.text}
          />
          {baselineOn && (
            <VizStat label="baseline" value={runningMean.toFixed(2)} color={VIZ.yellow} />
          )}
        </div>
      </div>
    </VizFrame>
  );
}
