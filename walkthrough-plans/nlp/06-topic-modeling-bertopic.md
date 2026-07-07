# Plan — nlp/06-topic-modeling-bertopic (applied flex)

Full 4-stage BERTopic from scratch (random-proj embed, PCA, KMeans, c-TF-IDF),
c_tf_idf exercise, DML #60 TF-IDF + DML #90 BM25.

## Added
0. **Intuition** — embed→reduce→cluster→label; clusters meaning not words (vs LDA).
2. **Validation** — from-scratch KMeans vs `sklearn.KMeans` via adjusted Rand index
   (>0.9), and recovers the planted topics (>0.9).
4. **Gotchas** — curse of dimensionality demo (distance spread collapses → reduce
   first), KMeans needs K vs HDBSCAN, random-proj has no semantics, c-TF-IDF vs raw.
6. **Key takeaways**.

## Done when
sklearn-KMeans/ARI validation asserted; gotchas + recap; exercises + DML pass;
runs. ✅ (4 asserts)
