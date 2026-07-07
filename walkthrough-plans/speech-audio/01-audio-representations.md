# Plan — speech-audio/01-audio-representations (applied flex)

From-scratch STFT/spectrogram + resolution trade-off + Nyquist/frame-count exercise.
Intro promised a mel filterbank that was never shown.

## Added
0. **Intuition** — waveform→spectrogram→mel→MFCC pipeline.
2. **Validation** — pure-tone spectrogram peaks at its own frequency; STFT
   frequency-profile correlates >0.99 with `scipy.signal.stft`.
3. **Mel filterbank + MFCC (new sections)** — triangular mel filters from scratch,
   log-mel spectrogram, DCT→13 MFCCs, energy-compaction check.
4. **Gotchas** — window trade-off, spectral leakage (Hann vs rectangular demo,
   60%→8%), Nyquist aliasing, log-before-DCT, mel-band count.
6. **Key takeaways**.

## Done when
scipy validation + mel/MFCC added; gotchas + recap; exercise passes; runs. ✅ (3 asserts)
