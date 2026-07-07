# Plan — nlp/01-text-preprocessing (applied flex)

Strong from-scratch already (BPE, TF-IDF, DML #129 unigram, DML #51 edit distance).

## Added
0. **Intuition** — tokenization (vocab vs length; subword compromise) + weighting (TF-IDF).
2. **Validation** — reproduce `sklearn.TfidfVectorizer` *exactly* from scratch
   (smoothed IDF + L2 norm), assert max diff < 1e-9.
3. **"what to notice"** on token counts and BPE merge-frequency decay.
4. **Gotchas** — textbook IDF goes negative for ubiquitous terms (demo), granularity,
   normalisation, lowercasing tradeoffs.
6. **Key takeaways**.

## Done when
sklearn match asserted; gotchas + recap; exercises + DML pass; runs. ✅ (6 asserts)
