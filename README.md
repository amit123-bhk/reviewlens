# ReviewLens 🔍
> AI-powered Customer Review Analytics & Store Owner Action Dashboard

ReviewLens is a production-grade full-stack MERN application that ingests e-commerce customer reviews via CSV, cleans and normalizes the data, analyzes sentiment, topics, summaries, and actionability using Google Gemini (via OpenAI-compatible endpoint), caches results in MongoDB using cryptographic hashes, and surfaces actionable store owner insights alongside AI-suggested customer replies.

---

## 🚀 Key Highlights & Architecture

1. **Robust CSV Pre-processing**:
   - Strips dangerous HTML tags (`<script>`, `<iframe>`, `<img>`, etc.) and normalizes whitespace while preserving valid punctuation and non-ASCII scripts (Hindi, emojis).
   - Normalizes textual ratings (e.g., `"five"`, `"one"` $\rightarrow$ `5`, `1`).
   - Identifies and flags duplicate reviews (`duplicateOf`) to avoid duplicate LLM processing.
   - Gracefully handles empty reviews, missing columns, and malformed rows (`skipped_empty`, `invalid_row`).

2. **Prompt Injection & Sarcasm Defense**:
   - Encloses review text strictly within `<customer_review id="...">` XML boundaries with XML entity neutralization (`&lt;`, `&gt;`, `&amp;`).
   - Strict system prompt instructs the model to disregard instructions embedded within review text.
   - Sarcasm detection correctly identifies sarcastic complaints (e.g. *"Oh fantastic, another update that breaks bluetooth audio. 10/10 quality control."* is correctly tagged `negative`).
   - Sarcasm and rating-vs-sentiment mismatches are highlighted on the dashboard.

3. **Two-Tier Resilient Analysis Engine**:
   - Reviews are chunked into sequential batches of 5 to maximize throughput while preventing token overflow.
   - Strict schema validation (`validateAnalysis`) enforces allowed sentiments (`positive`, `neutral`, `negative`), valid topics, clean single-line summaries $\le 200$ characters, and boolean `needs_reply`.
   - **One-Shot Retry Queue**: Reviews that are dropped by the model, return non-JSON, or fail schema validation are retried once in a new batch. If validation fails twice, status is safely marked `analysis_failed` without crashing.

4. **Two-Level MongoDB Caching**:
   - `AnalysisCache`: Each review text is hashed using `sha256(LLM_MODEL + PROMPT_VERSION + normalised_text)`. Before calling the LLM, cached results are fetched in bulk (`getMany`). Only new or modified reviews are dispatched to the LLM.
   - `InsightsCache`: Top 3 complaints and top 3 praises are cached by hash of review summaries.
   - Suggested replies are saved directly onto the review in the MongoDB `Run` document.

5. **On-Demand Courteous Customer Replies**:
   - `POST /api/reviews/:reviewId/reply`: Generates a professional, empathetic customer reply (max 80 words, strictly English, zero promises of refunds or discounts).
   - Generates only on user click and caches the generated reply in MongoDB for instantaneous subsequent views.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Plain Vanilla CSS (no bloated UI frameworks), Responsive 1366px+ Layout
- **Backend**: Node.js 20+, Express 4, ES Modules (`"type": "module"`), Multer
- **Database**: MongoDB & Mongoose
- **AI/LLM**: Google Gemini (`gemini-flash-lite-latest`) via standard OpenAI-compatible REST endpoint (plain `fetch`, zero external SDKs)
- **Testing**: Vitest (45 automated tests covering schema, CSV cleaning, prompts, hashing, LLM client backoff, batch analyzer, insights, and replies)

---

## 📁 Project Structure

```
reviewlens/
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadBar.jsx    # CSV upload & progress indicators
│   │   │   ├── SummaryCards.jsx # High-level KPIs & data health metrics
│   │   │   ├── TopLists.jsx     # Side-by-side Top 3 Complaints & Praises
│   │   │   ├── ReviewTable.jsx  # Dynamic filters, search & review data
│   │   │   └── ReplyModal.jsx   # Suggested reply modal with copy button
│   │   ├── filterReviews.js     # Pure client-side filter function
│   │   ├── api.js               # Frontend API client
│   │   ├── App.jsx              # Main dashboard composition
│   │   └── App.css              # Custom styling
│   └── vite.config.js
├── server/                      # Express backend & AI pipeline
│   ├── src/
│   │   ├── models/
│   │   │   ├── Run.js           # Run history & reviewed items
│   │   │   ├── AnalysisCache.js # Cryptographic SHA-256 analysis cache
│   │   │   └── InsightsCache.js # Summaries insights cache
│   │   ├── csvCleaner.js        # Sanitization & duplicate detection
│   │   ├── schema.js            # Validation & sanitization of AI outputs
│   │   ├── prompts.js           # Injection-proof system & user prompts
│   │   ├── llmClient.js         # REST fetch with exponential backoff & jitter
│   │   ├── analyzer.js          # Batch processing & retry queue
│   │   ├── hash.js              # SHA-256 cache key generation
│   │   ├── cache.js             # Mongoose cache access layer
│   │   ├── pipeline.js          # End-to-end upload orchestrator
│   │   ├── insights.js          # Code statistics & top praises/complaints
│   │   ├── replyService.js      # Customer reply generator
│   │   ├── db.js                # MongoDB connection handler
│   │   └── index.js             # Express app & route definitions
│   └── tests/                   # Automated Vitest test suite (45 tests)
├── .env.example
├── .gitignore
├── README.md
└── reviews.csv                  # Test review dataset
```

---

## 🚦 Getting Started

### 1. Prerequisites
- **Node.js** v20+
- **MongoDB** running locally on `mongodb://127.0.0.1:27017` (or MongoDB Atlas connection URI)
- A Gemini API Key (or OpenAI-compatible API Key)

### 2. Environment Configuration
Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/reviewlens
LLM_API_KEY=your_gemini_api_key_here
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_MODEL=gemini-flash-lite-latest
```

### 3. Backend Setup & Run
```bash
cd server
npm install
npm test      # Runs all 45 automated tests
npm start     # Starts Express on http://localhost:5000
```

### 4. Frontend Setup & Run
```bash
cd client
npm install
npm run dev   # Starts Vite on http://localhost:5173
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Testing & Validation

The test suite thoroughly covers edge cases and security vectors:
- **`schema.test.js`**: Validates strict allowed sentiments, non-empty deduplicated topics, max 200 char summary, boolean `needs_reply`, and rejection of malformed outputs.
- **`csvCleaner.test.js`**: Tests multiline CSV quotes, HTML tag stripping, rating normalization, UTF-8/Hindi preservation, and duplicate identification.
- **`prompts.test.js`**: Verifies prompt injection defense, XML tag boundaries, and absence of star ratings in LLM prompts (preventing rating bias).
- **`llmClient.test.js`**: Verifies 4-stage exponential backoff with jitter and `Retry-After` header adherence.
- **`analyzer.test.js`**: Validates 5-item batching, single retry queue for dropped or invalid reviews, and graceful degradation without throwing.
- **`insights.test.js`**: Verifies pure code statistics, rating mismatch flags (e.g. 5-star rating with negative text), and fallback handling.
- **`replyService.test.js`**: Enforces strict word limits, anti-hallucination guardrails, and breakout defense.

Run all tests anytime:
```bash
cd server && npm test
```

---

## 🔒 Security Best Practices
- **Zero API Key Leakage**: Keys remain on the server; never exposed to Vite/browser.
- **Prompt Injection Hardening**: All user inputs wrapped in XML delimiters; instruction-ignoring system rules.
- **Sanitized JSON**: Central error middleware prevents internal stack traces or environment variables from leaking in responses.
- **No `dangerouslySetInnerHTML`**: React's native JSX escaping handles all dynamic user content safely.
