# Plan — fine-tuning-alignment/02-peft-lora-qlora (algorithm flex)
From-scratch LoRA layer + rank sweep + QLoRA int4 + exercise.
FIXED pre-existing NaN: train() dY scaled by batch size (256x) diverged; fixed dY=2*diff/size, lr 0.02->0.1.
Added: intuition; validation (rank>=intrinsic fits, elbow at 4; QLoRA recovers ~9x on 4-bit base w/ honest residual — low-rank can't absorb full-rank quant error); params-saved demo; gotchas; takeaways. ✅ 3 asserts.
