# Plan — generative-models/05 (algorithm). Forward/reverse diffusion on a 2D ring.
THREE PRE-EXISTING BUGS FIXED: (1) denoiser training re-initialized W,b to zero every epoch — nothing
accumulated (learned W ~0.004 vs optimal 0.19); made persistent (epochs=500, lr=0.02, converges to the
closed-form optimum). (2) schedule too short (alpha_bar_T=0.60, 78% signal at 'pure noise') — now
T=100, beta_max=0.06 (ab_T=0.047). (3) exercise check asserted alpha_bars[-1]<0.05 which its own
scaffold schedule could NEVER satisfy — scaffold updated; late-step distance check made statistical
(seed-0 fluke). Sampler also gained the missing DDPM sigma*z term. Validation: learned W == closed-form
optimal linear denoiser at t=20/50/80. Gotcha: schedule table (78%/36%/22% residual signal).
