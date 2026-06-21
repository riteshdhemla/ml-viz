# Evidently AI Case Studies — Content Update Log

**Source:** Evidently AI — 800 ML and LLM Case Studies (PDF, June 2026)  
**Total parsed entries:** 805 case studies from ~185 companies, 2020–2025.

---

## Dataset Summary

| Technology | Count | % |
|---|---|---|
| Predictive ML | 411 | 51% |
| Generative AI & LLM | 204 | 25% |
| AI Agents | 87 | 11% |
| NLP | 39 | 5% |
| CV | 36 | 4% |
| RAG | 28 | 3% |

| Use Case Tag | Count | Key Companies |
|---|---|---|
| Product features | 138 | Grammarly, Swiggy, Google, Zillow, GitHub |
| Ops automation | 118 | DoorDash, Netflix, Uber, Amazon |
| Recommender systems | 109 | Pinterest, Netflix, LinkedIn, DoorDash, Meta |
| Search | 101 | Airbnb, Instacart, LinkedIn, Expedia |
| Data analytics | 57 | Uber, Nubank, DoorDash, Grab |
| Fraud detection | 38 | Nubank, Binance, Stripe, Uber, Feedzai |
| Customer support | 35 | Wayfair, Doctolib, Meta, GoDaddy |
| Demand forecasting | 35 | Instacart, Lyft, Uber, Foodpanda |
| Content personalization | 33 | Wayfair, Duolingo, Uber, NYT |
| Software ops | 32 | Uber, Agoda, Duolingo, Meta |
| Code generation | 29 | GitHub, Uber, Meta, Spotify, Airbnb |
| Item classification | 28 | Shopify, Walmart, Airbnb, Wayfair |
| Ad ranking/targeting | 25 | Pinterest, Instacart, Criteo, Grab, Lyft |
| Spam/content mod | 19 | Pinterest, Zillow, LinkedIn, Bumble |
| ETA prediction | 19 | Swiggy, Lyft, DoorDash, Gojek |
| Causality | 13 | Netflix, NYT, Lyft, Gojek |
| HR tasks | 10 | LinkedIn, Upwork, Coinbase |
| Pricing | 8 | Expedia, Trivago, Zillow, Lyft |
| Voice interface | 7 | Airbnb, Walmart, Intercom, OpenAI |
| Chatbot | 19 | Grab, Uber, Instacart, Nubank |

---

## Gap Analysis Against Existing Content

### Already well-covered
- GenAI/LLMs, RAG, Agents → `building-with-llms`, `agent-design-patterns` — ✅
- Basic recommender systems → `recommender-systems` (3 lessons) — partial
- Time series fundamentals → `time-series` (3 lessons) — partial
- Anomaly detection (statistical/density) → `ml-in-practice/14` — partial
- MLOps, feature stores, monitoring → `ml-in-practice` (19 lessons) — ✅

### Gaps identified

| Gap | Case study volume | Decision |
|---|---|---|
| Session-based & real-time rec | 109 total rec studies | New lesson recsys/04 |
| Diversity, cold start, exploration | 109 total rec studies | New lesson recsys/05 |
| Ad ranking & CTR prediction | 25 ad studies | New lesson recsys/06 |
| Production demand forecasting + ETA | 35 + 19 = 54 | New lesson time-series/04 |
| Fraud detection at scale | 38 | New lesson ml-in-practice/20 |
| Content moderation | 19 | New lesson ml-in-practice/21 |
| Code intelligence & generation | 29 | New lesson building-with-llms/12 |
| Voice & multimodal AI | 7 voice + 36 CV | New lesson building-with-llms/13 |

---

## Content Added

### New Lessons (8)

1. **`recommender-systems/04-session-based-and-realtime.mdx`**  
   *Rationale:* 109 rec system case studies; many involve real-time session context (Pinterest ×10, Netflix ×7, DoorDash ×5). The existing 3-lesson course covers only collaborative filtering, matrix factorization, and two-tower architecture — it doesn't explain how platforms adapt to what you're doing *right now*. Session-based transformers (SASRec, BERT4Rec), contextual bandits, and streaming feature pipelines are production staples.

2. **`recommender-systems/05-diversity-cold-start-exploration.mdx`**  
   *Rationale:* Cold start is listed in the existing course index as a topic but has no lesson. 109 rec studies highlight: (a) every new item/user faces cold start, (b) diversity (serendipity, not just accuracy) is explicitly optimized by Netflix, Spotify, Pinterest. Exploration vs exploitation via contextual bandits ties into the RL curriculum.

3. **`recommender-systems/06-ad-ranking-and-ctr-prediction.mdx`**  
   *Rationale:* 25 dedicated ad ranking studies from Pinterest, Criteo, Instacart, Grab, Lyft, Autotrader. Ad systems are the largest revenue driver for most platforms; their ML stacks (CTR prediction → DeepFM/DLRM, second-price auctions, bid optimization) are critical applied ML and not covered anywhere in the existing curriculum.

4. **`time-series/04-demand-forecasting-in-production.mdx`**  
   *Rationale:* 35 demand forecasting + 19 ETA prediction studies from DoorDash, Lyft, Uber, Instacart, Foodpanda, Swiggy, Gojek. The existing time-series course covers ARIMA and deep learning architecturally but doesn't show how production systems handle hierarchical forecasting, special events, multi-horizon predictions, and ETA with uncertainty.

5. **`ml-in-practice/20-fraud-detection-at-scale.mdx`**  
   *Rationale:* 38 fraud studies from Nubank, Binance, Stripe, Uber, Feedzai, Wayfair, DoorDash. The existing `anomaly-detection` lesson (ml-in-practice/14) covers the statistical/density methods. Production fraud is qualitatively different: graph-based detection, real-time feature engineering, risk scoring architectures, class imbalance at billion-transaction scale, and adversarial adaptation deserve their own treatment.

6. **`ml-in-practice/21-content-moderation.mdx`**  
   *Rationale:* 19 content moderation studies from Pinterest, Zillow, DoorDash, Etsy, Snap, Roblox, LinkedIn, Bumble. Safety/trust & safety is a major ML application domain not covered. Multi-class toxicity classification, human-in-the-loop labeling, active learning, policy enforcement thresholds, and appeal flows are production-critical.

7. **`building-with-llms/12-code-intelligence-and-generation.mdx`**  
   *Rationale:* 29 code generation studies from GitHub, Uber, Meta, Spotify, Airbnb, Intuit, Microsoft. Code intelligence is the single biggest LLM use case category after chat. The existing building-with-llms course mentions agents and tool use but has no treatment of code-specific patterns: code search/embedding, fill-in-the-middle, repo-level context, code review automation.

8. **`building-with-llms/13-voice-and-multimodal-ai.mdx`**  
   *Rationale:* 7 voice interface studies (Intercom, OpenAI, Airbnb, Walmart) + 36 CV studies (Instacart, Canva, Binance, Pinterest, Etsy). Multimodal AI (vision-language models, speech-to-text pipelines) is a rapidly growing production category. No existing lesson covers the end-to-end pipeline from audio/vision input to LLM reasoning to action.

### New Wiki Pages (8)

1. **`session-based-recommendations.mdx`** — GRU4Rec, SASRec, BERT4Rec algorithm walkthrough  
   *Referenced by:* `recommender-systems/04-session-based-and-realtime`

2. **`hierarchical-forecasting.mdx`** — Mint-style top-down, bottom-up, MinT reconciliation  
   *Referenced by:* `time-series/04-demand-forecasting-in-production`

3. **`graph-fraud-detection.mdx`** — GNN for fraud, entity resolution, homophily in fraud graphs  
   *Referenced by:* `ml-in-practice/20-fraud-detection-at-scale`

4. **`text-to-sql.mdx`** — Schema-aware prompting, execution validation, self-correction loop  
   *Referenced by:* `building-with-llms/12-code-intelligence-and-generation`

5. **`ad-auction-and-bidding.mdx`** — Second-price auction, GSP, VCG, smart bidding  
   *Referenced by:* `recommender-systems/06-ad-ranking-and-ctr-prediction`

6. **`uplift-modeling.mdx`** — S/T/X-learner, meta-learners for causal treatment effect  
   *Referenced by:* `causal-inference/02-interventions-and-potential-outcomes`

7. **`cold-start-problem.mdx`** — Content-based fallback, meta-learning, exploration strategies  
   *Referenced by:* `recommender-systems/05-diversity-cold-start-exploration`

8. **`llm-as-judge.mdx`** — Prometheus, G-Eval, LLM-as-a-judge patterns and pitfalls  
   *Referenced by:* `building-with-llms/08-llm-evaluation`, `model-evaluation/04-llm-evaluation`

### Updated Course Indexes
- `recommender-systems/index.mdx` — added 3 new topics, updated `estimatedHours`
- `time-series/index.mdx` — added production forecasting topic, updated `estimatedHours`
- `ml-in-practice/index.mdx` — added fraud detection & content moderation topics, updated `estimatedHours`
- `building-with-llms/index.mdx` — added code intelligence & multimodal topics, updated `estimatedHours`

### New Exercises (24 total)
- 3 per new lesson × 8 lessons = 24 exercises added to `src/lib/exercises.ts`

### New Notebooks (16 total)
- 8 lesson notebooks in `notebooks/{course-slug}/{lesson-slug}.ipynb`
- 8 wiki notebooks in `notebooks/wiki/{wiki-slug}.ipynb`
