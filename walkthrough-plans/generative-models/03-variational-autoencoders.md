# Plan — generative-models/03 (algorithm). Reparameterization, KL landscape, VAE class, latent manifold.
MAJOR FIX: the original training loop NEVER UPDATED WEIGHTS (computed losses only) — every downstream
figure showed an untrained model. Added vae_train_step with full analytic backprop, verified against
finite differences; real training (beta=0.05, KL warm-up over 1000 epochs; recon 0.49 -> 0.026).
Validation: closed-form Gaussian KL == Monte-Carlo E[log q - log p]. Gotcha: observed posterior
collapse (no warm-up, beta=1 -> KL 0.008, latent ignored) vs healthy warm-up run.
