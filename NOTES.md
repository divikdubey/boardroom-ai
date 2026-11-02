# Boardroom AI: Complete Notes

> Ye notes mere apne seekhne ke liye hain. Isme koi API key ya password mat likhna (file GitHub pe jayegi).
> Status: **Steps 1-5 done (~50%)**. Next: Step 6 (web search).

---

## 1. Project kya hai

**Boardroom AI**: user apna startup idea likhta hai, aur 4 AI "experts" us idea ko analyze karte hain, phir ek Judge final verdict deta hai (score, risks, next steps).

**Tagline:** *Your startup idea, grilled by 4 AI experts.*

**Agents:**
| Agent | Kaam |
|---|---|
| Market Researcher | Audience, market size, demand, trends |
| Competitor Analyst | Kaun kaun pehle se yahi kar raha hai |
| Critic | Idea fail kyun hoga (devil's advocate) |
| Financial Planner | Kharcha, kamayi, break-even (rough) |
| Judge | Sabka jawab padh ke JSON verdict |

**Ye idea kyun chuna:** generic todo/e-commerce se alag hai, demo mein "wow" factor deta hai (agents live baat karte dikhte hain), aur Gen AI ke important concepts (agents, streaming, tool/search) seekhne ko milte hain.

---

## 2. Tech stack

- **Backend:** Node + Express (ES modules)
- **Database:** MongoDB Atlas (purana cluster, naya database `boardroom-ai`)
- **AI:** Google Gemini API (free tier), SDK: `@google/genai`
- **Streaming:** SSE (Server-Sent Events)
- **Web search (Step 6):** Tavily API
- **Frontend (baad mein):** React + Tailwind
- **Plain JS, LangChain nahi** (concepts seedhe samajhne ke liye)

---

## 3. Poora flow (sabse zaroori)

```
User → ideas.js (route) → agent file (role prompt) → callGemini.js → Gemini API
                                                                        ↓
User ← ideas.js (route) ← agent file ←────────────────────────── AI ka text
```

**Agents ka order (3 phases):**
```
Phase 1 (parallel):  Market + Competitor            ← sirf idea dekhte hain
Phase 2 (parallel):  Critic + Financial             ← idea + Phase 1 ka jawab padhte hain
Phase 3:             Judge                          ← idea + chaaron ka jawab padhta hai
```

**"Discussion" ka asli matlab:** har agent ka call alag hota hai aur Gemini ko pichla call yaad nahi rehta. Isliye hum ek agent ka output **khud text mein paste karke** agle agent ko dete hain. Ek ka output, doosre ka input.

**Mock test mein proof mila:** input size 43 chars (Phase 1) → 242 chars (Phase 2) → 411 chars (Judge). Matlab agents ne ek dusre ka text padha.

---

## 4. Folder structure

```
boardroom-AI/
├── NOTES.md
├── backend/
│   ├── .env                 (secrets, GitHub pe nahi jaata)
│   ├── .gitignore           (node_modules, .env)
│   ├── package.json
│   └── src/
│       ├── server.js        (Express app start)
│       ├── config/db.js     (MongoDB connect)
│       ├── routes/ideas.js  (traffic police: kaun kab chalega)
│       ├── agents/
│       │   ├── callGemini.js        (AI se asli baat)
│       │   ├── marketResearcher.js
│       │   ├── competitorAnalyst.js
│       │   ├── critic.js
│       │   ├── financialPlanner.js
│       │   └── judge.js
│       ├── tools/webSearch.js       (Step 6)
│       └── models/                  (abhi khali)
└── frontend/                (baad mein)
```

**Folders kyun alag:** har cheez ki apni jagah (separation of concerns). `routes` = URL handle, `agents` = AI logic, `config` = setup, `models` = DB schemas.

---

## 5. Step-by-step: kya banaya

### Step 1: Setup + DB
- `npm init`, packages: `express mongoose dotenv cors` aur dev mein `nodemon`
- `package.json` mein `"type": "module"` (import syntax ke liye) aur `"dev": "nodemon src/server.js"`
- `.env`: `PORT`, `MONGO_URI`, `GEMINI_API_KEY`, `MOCK_AI`
- `.gitignore` mein `.env` aur `node_modules`
- `/api/health` route se server check kiya

### Step 2: Pehla AI agent
- Market Researcher + route `POST /api/analyze`
- Pehla asli Gen AI call

### Step 3: Baaki agents + Judge
- Ek helper `callGemini()` banaya, baaki agents mein sirf role prompt alag
- Judge JSON mein jawab deta hai, `parseJSON` fence (` ```json `) hata ke parse karta hai, fail ho toh `{ raw: text }`

### Step 4: Discussion
- Phases mein chalana, `Promise.all` se parallel
- Critic aur Financial ab Market + Competitor ka jawab padhte hain

### Step 5: Streaming
- **5A:** route `GET /api/analyze-stream`, events: `agent_start`, `agent_done`, `done`, `error`
- **5B:** `token` events, har tukda aate hi user ko. `callGemini` ko 3rd input `onToken` mila
- Judge stream nahi hota (aadha JSON screen pe bekaar lagta)

---

## 6. File-by-file explanation

### db.js
- `mongoose.connect(process.env.MONGO_URI)` Atlas se connect karta hai
- `try/catch`: fail hua toh error dikha ke `process.exit(1)`, kyunki bina DB ke app ka matlab nahi
- Extra: `dns.setServers(["8.8.8.8","8.8.4.4"])` aur `dns.setDefaultResultOrder("ipv4first")`. Ye **mere laptop ki network problem** ke fix the, project ka feature nahi.

### server.js
- `import "dotenv/config"` **sabse upar** (baaki code ko keys chahiye)
- `cors()`: frontend (alag port) ko allow
- `express.json()`: request body (`req.body`) padhne ke liye
- `app.use("/api", ideaRoutes)`: routes jode
- `connectDB().then(() => app.listen(...))`: pehle DB, phir server

### callGemini.js (AI ka dimaag)
- `export async function callGemini(systemInstruction, userMessage, onToken)`
- **systemInstruction** = agent ka role. **userMessage** = asli kaam. **onToken** = optional, diya toh streaming.
- **MODELS list:** 3 models priority order mein (fallback)
- **2 loops:** bahar `round` (1 se 3), andar har `model`. Max 3 x 3 = 9 koshish.
- **timeout 15000:** 15 sec mein jawab nahi aaya toh haar maan le, warna code atka rehta
- **maxOutputTokens 1000:** jawab ki lambai ki limit
- **try/catch:** fail hua toh crash nahi, agla model
- **sleep(3000 * round):** rounds ke beech ruk (3s, 6s). Ise **backoff** kehte hain, busy server ko saans mile
- **sent flag:** aadha text ja chuka ho aur error aaye toh retry nahi (warna duplicate text)
- **MOCK_AI=true:** Gemini call hi nahi, nakli jawab (word by word). Testing ke liye.
- Sab fail hua toh `throw lastError`, route ka `catch` pakad leta hai

### Agent files (marketResearcher, critic, etc.)
Har file mein 2 hi cheezein: `SYSTEM` (role text) aur ek chhota function jo `callGemini` ko call karta hai. Critic aur Financial ko `reports` bhi milte hain jo message mein jud jaate hain.

### ideas.js (route, traffic police)
- `/analyze` (POST): poora jawab ek saath
- `/analyze-stream` (GET): live events (SSE)
- `step(name, emit, fn)`: agent chalane se pehle/baad event bhejta hai, `onToken` banata hai
- `runPipeline(idea, emit)`: 3 phases, dono routes yahi use karte hain (`emit` default `() => {}`)
- Idea khali ho toh **400** error. AI fail ho toh **500**, server crash nahi.
- **`export default router`** zaroori, warna `server.js` ka import fail

### SSE route ke headers
```js
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");
res.flushHeaders();
```
Event format (event ke baad **khali line** zaroori):
```
event: token
data: {"agent":"market","text":"hello "}

```
`res.write()` data bhejta hai par connection khula rakhta hai. `res.json()` ek baar bhej ke band kar deta hai. GET isliye kyunki browser ka `EventSource` sirf GET chalata hai.

---

## 7. Concepts (glossary)

- **SDK:** ready-made toolkit jo API se baat karna aasan banata hai (URL, key, response format khud sambhalta hai). Har AI company ka apna SDK hota hai.
- **System prompt:** AI ko role/rules dene wala instruction, user ke message se alag.
- **Prompt engineering:** AI se achha jawab lene ke liye instruction likhne ki kala.
- **Fallback:** ek fail ho toh agla option try.
- **Retry with backoff:** fail hone par ruk ke dobara, har baar zyada ruk ke.
- **Timeout:** atki hui call ko tod dena.
- **Mock mode:** nakli jawab, bina API ke development.
- **Promise.all:** kai async kaam **ek saath** shuru, sabke khatam hone ka wait.
- **SSE:** server connection khula rakh ke data ke tukde bhejta hai.
- **Token:** AI ke jawab ka chhota tukda (word ya usse chhota).
- **RAG (chhota roop):** AI ko bahar ka data (search results) prompt mein dena.
- **Separation of concerns:** har file ka ek hi kaam.
- **nodemon:** file save hote hi server restart. `.env` badalne ke baad `rs` likh ke manual restart.
- **CORS:** alag port wale frontend ko backend call karne ki permission.

---

## 8. Mere doubts aur unke jawab

**Q. 4 agents kaun se hain, Gemini ke hi hain kya?**
Haan, sab ek hi Gemini. Farak sirf system prompt ka hai. Ek actor jo har baar alag costume pehen leta hai.

**Q. Alag-alag agents se efficiency badhti hai?**
Efficiency nahi, **quality** badhti hai (har agent ek hi kaam pe focus karta hai). Time aur cost 5 guna hota hai. Speed ke liye independent agents ko parallel chalate hain.

**Q. ideas.js aur callGemini.js mein kya fark hai?**
`ideas.js` = manager (kaun kab chalega). `callGemini.js` = cook (AI se baat). Kal Groq lagana ho toh sirf `callGemini.js` badlegi.

**Q. SDK import kyun karte hain?**
SDK ke bina khud URL, headers, body format likhna padta. SDK ye sab sambhalta hai.

**Q. Do loops (round aur model) mein kya fark?**
Andar wala loop 3 models try karta hai. Teeno fail hon toh bahar wala loop ruk ke poori list dobara try karta hai. Koi bhi model chal gaya toh `return` se function wahin khatam.

**Q. Purane Atlas cluster ke saath naya cluster banana padega?**
Nahi. Free plan mein 1 cluster milta hai. Link mein naya database naam likh do, wo pehli baar data save hone par ban jaata hai.

**Q. Krish Naik ka course is project ke liye kitna kaam ka?**
Concepts (RAG, embeddings) ke liye achha, par wo mostly Python hai aur streaming/tool use utna deep nahi. Project ke liye docs aur khud build karna zyada kaam aata hai. Rating: 6/10.

**Q. Resume mein weight?**
Poora + deployed + streaming + web search hone par 7-8/10. Adhoora ho toh resume mein mat daalna. Live link, README, aur interview mein explain kar paana sabse zyada matter karta hai.

**Q. Kitna percent kaam hua?**
Steps 1-5 done = ~50%. Frontend sabse bada baaki hissa hai.

---

## 9. Errors jo aaye aur fix

| Error | Reason | Fix |
|---|---|---|
| `ENOENT package.json` | Galat folder se `npm run dev` | `cd backend` |
| `MONGO_URL` vs `MONGO_URI` | `.env` mein variable ka naam alag | Naam code se match karo |
| `[nodemon] clean exit` | `server.js` khali ya save nahi | Code paste + save |
| `querySrv ECONNREFUSED` | Laptop ka DNS MongoDB ka address nahi dhundh paya | `dns.setServers(["8.8.8.8","8.8.4.4"])` |
| 404 model not found | Model ka naam purana | Error mein naya naam likha hota hai |
| `Unable to connect to remote server` | Server chal hi nahi raha | `npm run dev`, 2 terminals |
| 504 / 503 | Google ka load, aur laptop pe IPv6 atakna | `ipv4first` + fallback + retry |
| `ERR_MODULE_NOT_FOUND` | File bani hi nahi ya galat jagah | File sahi folder mein banao |
| `does not provide an export named 'default'` | `export default router` nahi likha | File ke end mein add |
| PowerShell mein sirf "AI call failed" | Asli error server terminal mein hota hai | **Hamesha server terminal dekho** |

**Debugging ka sabak:** jo errors khud debug kiye (DNS, IPv6, missing export), wahi interview mein asli developer wali kahani hain.

---

## 10. Interview Q&A

1. **Project 30 second mein?**
   "Node/Express backend jo startup idea leta hai aur role-based LLM agents ko 3 phases mein chalata hai: independent agents parallel, phir unka output padhne wale agents, phir Judge jo JSON verdict deta hai. Responses SSE se stream hote hain, aur API failures ke liye model fallback, timeout aur retry hai."
2. **System prompt kya hota hai?** AI ko role aur rules dene wala instruction, user message se alag.
3. **API key code mein kyun nahi?** GitHub pe leak ho jaati, isliye `.env` aur `.gitignore`.
4. **Server DB se pehle start kyun nahi?** Bina DB ke requests fail hongi.
5. **AI call fail ho toh?** try/catch, 3 models ka fallback, retry with backoff, aakhir mein 500 error. Server crash nahi hota.
6. **Timeout kyun?** Atki call poore server ko latka deti.
7. **Backoff kyun, seedha retry kyun nahi?** Busy server pe turant dobara hit karne se load badhta hai.
8. **Mock mode ka faida?** Development mein quota aur Google ki dikkat se bachte hain.
9. **Parallel vs sequential?** Jo agents independent hain (Market, Competitor) parallel, jo dusron ka output chahte hain (Critic, Financial, Judge) baad mein. Discussion jitni deep, utna slow.
10. **SSE aur normal request mein fark?** Normal: ek request, ek jawab. SSE: connection khula rehta hai aur server tukde bhejta rehta hai.
11. **`res.write` vs `res.json`?** `write` connection khula rakhta hai, `json` ek baar bhej ke band.
12. **Judge stream kyun nahi?** Aadha JSON screen pe dikhna bekaar hai, isliye wo ek saath aata hai.
13. **Agents ko "autonomous" bolna sahi hai?** Nahi. Abhi ye prompt-based roles hain. Resume mein "multi-agent pipeline" likho.
14. **Sabse mushkil kya tha?** Network issues (DNS, IPv6) aur Google API ki unreliability. Fallback + retry + mock mode se handle kiya.

---

## 11. Resume line (draft)

> **Boardroom AI**: Multi-agent startup idea validator. Built a Node/Express backend where 5 role-based LLM agents analyze an idea in parallel and sequential phases, with SSE token streaming, web search, and model fallback / retry handling for API failures. (Frontend + deployment: in progress.)

**Honest rule:** jo bana nahi hai wo resume mein mat likho. Frontend, deploy aur live link ke baad hi final karo.

---

## 12. Roadmap (11 steps)

| Step | Kaam | Status |
|---|---|---|
| 1 | Setup + DB connect | Done |
| 2 | Pehla AI agent | Done |
| 3 | 4 agents + Judge | Done |
| 4 | Agents ek dusre ka jawab padhte hain | Done |
| 5 | Streaming (SSE) | Done |
| 6 | Web search (Tavily) | Next |
| 7 | MongoDB mein report save + history | |
| 8 | React frontend | |
| 9 | PDF export + share link | |
| 10 | Login (JWT) + rate limiting | |
| 11 | Deploy + README | |

**Resume weight badhane wali cheezein:** live link, streaming demo, real web search, clean README + architecture diagram, 10-20 users se try karwana.

---

## 13. Commands cheat-sheet

```bash
# Server chalana (backend folder mein, terminal 1, band mat karna)
cd backend
npm run dev
# Dikhna chahiye: "MongoDB connected" aur "Server running on port 5000"

# .env badalne ke baad restart: server terminal mein "rs" likh ke Enter
```

```powershell
# Normal test (terminal 2)
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/analyze -ContentType "application/json" -Body '{"idea":"AI tutor for college students"}' | Format-List

# Streaming test
curl.exe -N "http://localhost:5000/api/analyze-stream?idea=AI%20tutor%20for%20college%20students"
```

**.env mein kya kya hona chahiye (values yahan mat likhna):**
```
PORT=5000
MONGO_URI=...
GEMINI_API_KEY=...
MOCK_AI=true        # asli AI ke liye false
TAVILY_API_KEY=...  # Step 6 mein
```

---

## 14. Security reminders

- [ ] Atlas ka password change karna (screenshots mein dikh gaya tha): Database Access, Edit, Edit Password. Naya `.env` mein daalna.
- [ ] `backend/test.js` delete karna
- [ ] GitHub push se pehle `git status` se check ki `.env` list mein nahi hai
- [ ] `0.0.0.0/0` (Atlas Network Access) sirf testing ke liye, deploy ke time hata dena
- [ ] Debug `console.log("Request aayi...")` hata dena
- [ ] Mock mode `MOCK_AI=false` karke asli AI test karna (jab Google kam busy ho)

---

## 15. Meri rules (seekhne ke liye)

1. Code khud type karo, sirf copy-paste nahi.
2. Har step ke baad apne words mein samjhao.
3. Kuch tod ke dekho (ek line hatao, error samjho).
4. Har step ke baad is file mein 3-4 line likho.
5. Asli error hamesha **server terminal** mein dekho.

### Step 6: Web search (Tavily)

**Goal:** Competitor Analyst ko internet se asli data dena, taaki wo companies hallucinate na kare.

#### Problem kya thi
- API se call karne par Gemini ke paas **internet nahi hota**, wo sirf apni training ki yaadasht se jawab deta hai.
- Isse purani ya **jhoothi companies** aa sakti hain (hallucination). Startup validator mein competitors asli hone chahiye.
- (Gemini/ChatGPT **app** mein search ka tool pehle se laga hota hai, isliye lagta hai AI khud search karta hai.)

#### Solution
**Search-then-prompt:** pehle Tavily se search, phir results ka text prompt mein jod ke AI ko dena, aur bolna "sirf inhi companies ko use kar".
Isko **RAG ka chhota roop** kehte hain (AI ko bahar ka data dena).

```
Idea → Tavily search → 5 results → prompt mein jode → Gemini → jawab (asli companies)
```

(Asli "tool use", jahan AI khud decide kare ki search karna hai ya nahi, baad ka upgrade hai.)

#### Files: pehle kya tha, ab kya hai

| File | Pehle | Ab |
|---|---|---|
| `tools/websearch.js` | Thi hi nahi | **Nayi file.** Tavily ko request bhejti hai, 5 results laati hai, har result se sirf title, url, content rakhti hai. `MOCK_AI=true` pe nakli result deti hai. |
| `agents/competitorAnalyst.js` | Sirf idea leke Gemini ko deta tha. AI apni yaadasht se competitors batata tha. Function normal tha. | **Pehle search, phir Gemini.** Function `async` ho gaya (kyunki search ka `await` hai). Search ke results prompt mein jude. System prompt mein naya rule: "Use ONLY companies from the search results." Search fail ho toh `try/catch` se agent bina results ke chalta hai. |
| `.env` | `MOCK_AI`, `GEMINI_API_KEY`, etc. | **+ `TAVILY_API_KEY`** (key nahi hogi toh keyless mode bhi chal sakta hai, rate-limited) |
| `callGemini.js` | Same | **Koi change nahi** |
| `ideas.js` | Same | **Koi change nahi** |
| `critic.js`, `financialPlanner.js`, `judge.js` | Same | **Code same**, par ab inko Competitor ka **asli** jawab milta hai, toh unka jawab bhi behtar hota hai |

**Ye kyun important hai:** `ideas.js` aur `callGemini.js` mein kuch nahi badla, kyunki sab alag-alag kaam ki files hain (separation of concerns). Naya feature jodne mein sirf 1 nayi file aur 1 file ka change laga.

#### competitorAnalyst.js: line by line

```js
let results = [];
try {
  results = await webSearch(`${idea} startup competitors alternatives`);
} catch (err) {
  console.error("Search failed:", err.message);
}
```
Search chalao. Fail ho toh app crash nahi, bas khali results (**graceful degradation**).

```js
const sources = results
  .map((r, i) => `${i + 1}. ${r.title} (${r.url}): ${r.content.slice(0, 300)}`)
  .join("\n");
```
Har result ko ek line mein badla: "1. Naam (link): pehle 300 akshar". `slice(0, 300)` prompt ko chhota rakhta hai (tokens aur kharcha bachta hai).

```js
const message = `Startup idea: ${idea}\n\nWeb search results:\n${sources || "No results found."}`;
return callGemini(SYSTEM, message, onToken);
```
Idea + search results ek message mein, aur Gemini ko diya. Results nahi mile toh "No results found." jata hai.

#### websearch.js: line by line
- `fetch("https://api.tavily.com/search", ...)`: Tavily ko POST request. SDK ki zaroorat nahi, Node mein `fetch` built-in hai.
- `Authorization: Bearer <key>`: key bhejne ka tareeka.
- `max_results: 5`: sirf 5 results, taaki prompt bada na ho.
- `if (!res.ok) throw ...`: Tavily ne error diya toh saaf error phek do.
- `data.results.map(...)`: bhaari response se sirf kaam ki 3 cheezein.
- **Keyless option (optional):** key na ho toh header `X-Tavily-Access-Mode: keyless` bhej sakte hain. Sirf testing ke liye, rate-limited.

#### Concepts
- **Hallucination:** AI ka confidence ke saath galat ya jhootha jawab dena.
- **Grounding / RAG:** AI ko asli data dena aur usi pe jawab dene ko kehna.
- **Graceful degradation:** ek hissa fail ho toh poora system na gire.
- **Prompt rule "Use ONLY..."**: AI ko search results se bahar jaane se rokta hai.

#### Errors jo aaye
| Error | Reason | Fix |
|---|---|---|
| Import pe lal line (`differs only in casing`) | File ka naam `websearch.js` (chhota s) tha, import mein `webSearch.js` (bada S) | Import ko file ke naam se **letter-by-letter** match kiya. Linux pe deploy mein ye asli crash banta. |

#### Test results
- **Mock mode:** Judge ka input **411 chars se 704 chars** hua. Matlab search ke results Competitor ke jawab mein gaye aur aage tak pahunche.
- **Real mode (`MOCK_AI=false`):** asli competitors aaye (StudyFetch, Gizmo, Khanmigo, Admithub). Critic ne Market aur Competitor ke claims ko seedha challenge kiya. Judge ka JSON sahi parse hua (score, verdict, strengths, risks, nextSteps).

#### Interview Q&A
1. **Search kyun add kiya, AI khud nahi karta?** API se call karne par LLM ke paas internet nahi hota. Uski knowledge purani ho sakti hai aur wo companies bana sakta hai. Isliye pehle search, phir results prompt mein.
2. **Ye RAG hai kya?** Haan, chhota roop. Retrieval (search) + Generation (AI jawab). Vector DB wala RAG alag cheez hai, wo documents ke liye hota hai.
3. **Search fail ho toh?** try/catch se pakad ke agent bina results ke chalta hai, server crash nahi hota.
4. **Hallucination kaise kam kiya?** Asli search results diye aur prompt mein "sirf in results ki companies use kar" bola.
5. **Tavily hi kyun, Gemini ka Google Search tool kyun nahi?** Tavily kisi bhi AI ke saath chalta hai (provider-independent), aur isse RAG ka concept seekha.
6. **Aage kya improve karoge?** Asli tool use: AI khud decide kare ki search karna hai ya nahi, aur sources ke links report mein dikhana.

#### Resume point
> Integrated real-time web search (Tavily) into the Competitor agent to ground LLM output in live data and reduce hallucinated competitors.

#### Progress
Steps 1-6 done, **~58%**. Backend core poora (5 agents, discussion, streaming, search). Baaki: DB save, frontend, PDF, login, deploy.

#### Checklist
- [ ] Development mein `MOCK_AI=true`, demo/final test mein `false` (asli credits kharch hote hain)
- [ ] Prompt mein "India ke hisaab se, INR mein" likhna (Financial Planner dollars de raha tha), agar India focus hai
- [ ] Baad mein report mein sources ke links dikhana

### Step 7: Reports MongoDB mein save + history

**Goal:** Har analysis ko database mein save karna, purani reports ki list dikhana, aur ek report ko ID se wapas kholna.

#### Problem kya thi
- Analysis khatam hote hi **gayab** ho jata tha. Server ya page band, result khatam.
- Share link, history, PDF export jaisi cheezein bina saved data ke ban hi nahi sakti.
- Pehle MongoDB sirf connected tha, **koi data save nahi hota tha**.

#### Solution
```
Idea → 5 agents → result → saveReport() → MongoDB (reports collection) → user ko result + id
```
Aur 2 naye routes: history list, aur ek report ID se.

#### Files: pehle kya tha, ab kya hai

| File | Pehle | Ab |
|---|---|---|
| `models/Report.js` | Thi hi nahi (`models` folder khali tha) | **Nayi file.** Report ka schema: idea, market, competitors, critic, financial, judge, aur timestamps. |
| `routes/reports.js` | Thi hi nahi | **Nayi file.** `GET /api/reports` (history) aur `GET /api/reports/:id` (ek report). |
| `routes/ideas.js` | Result sirf user ko jata tha, save kuch nahi hota tha. `/analyze` seedha `res.json(result)` karta tha. Stream route aakhir mein sirf `done` bhejta tha. | **Import `Report`**, ek naya helper **`saveReport()`**. `/analyze` ab `{ id, ...result }` bhejta hai. Stream route ab `saved` event (`{ id }`) bhi bhejta hai `done` se pehle. |
| `server.js` | Sirf `ideaRoutes` jude the | **+ `import reportRoutes`** aur **`app.use("/api", reportRoutes)`** |
| `callGemini.js`, agents | Same | **Koi change nahi** |

**Ye kyun important hai:** AI ka code (agents, `callGemini`) bilkul nahi chhua. Naya feature (storage) alag files mein aaya. Yahi separation of concerns hai.

#### Report.js: line by line
```js
const reportSchema = new mongoose.Schema({
  idea: { type: String, required: true },
  market: String, competitors: String, critic: String, financial: String,
  judge: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
```
- **Schema:** DB mein data ka naksha (kaun si field, kaunsa type).
- `required: true`: idea ke bina report save nahi hogi.
- **Mixed (judge):** Judge ka jawab kabhi proper JSON hota hai (score, risks...), kabhi `{ raw: "..." }`. Mixed dono le leta hai.
- `timestamps: true`: Mongoose khud `createdAt` aur `updatedAt` lagata hai.
- `mongoose.model("Report", schema)`: schema se **model** banta hai, jisse `Report.create()`, `Report.find()` jaise functions milte hain. Collection ka naam khud **`reports`** ban jata hai (chhota aur plural).
- Database `boardroom-ai` aur collection `reports` **pehli baar save hone par** Atlas mein banti hain.

#### saveReport() (ideas.js)
```js
async function saveReport(idea, result) {
  try {
    const report = await Report.create({ idea, ...result });
    return report._id;
  } catch (err) {
    console.error("Save failed:", err.message);
    return null;
  }
}
```
- `{ idea, ...result }`: idea ke saath paanchon agents ka jawab ek object mein (`...` spread operator).
- **Alag helper kyun:** DB save fail ho toh bhi user ko uska analysis milna chahiye. 1 minute ka AI kaam ek DB galti se waste nahi hona chahiye. Ye **graceful degradation** hai (Step 6 wala hi concept).
- Fail hone par `null` return, crash nahi.

#### reports.js: line by line
- **History:** `Report.find().sort({ createdAt: -1 }).limit(20).select("idea judge.score createdAt")`
  - `sort -1`: sabse nayi pehle
  - `limit(20)`: sirf 20
  - `select`: list mein poora text nahi, sirf idea, score, time. Response chhota aur tez.
- **Ek report:** `/reports/:id`. `:id` URL ka variable hai (`req.params.id`).
- `mongoose.isValidObjectId(id)`: galat ID pe Mongoose crash karta, isliye pehle check.
- **3 alag error codes:** **400** (galat ID, user ki galti), **404** (report nahi mili), **500** (server ki dikkat). Har ek ka matlab alag.

#### API endpoints (ab tak)
| Method | URL | Kaam |
|---|---|---|
| GET | `/api/health` | Server zinda hai? |
| POST | `/api/analyze` | Poora analysis ek saath, `id` ke saath |
| GET | `/api/analyze-stream?idea=...` | Live streaming analysis, aakhir mein `saved` event |
| GET | `/api/reports` | Latest 20 reports ki history |
| GET | `/api/reports/:id` | Ek poori report |

#### Concepts
- **Schema vs Model:** schema = naksha, model = us naksha se kaam karne wala tool (`create`, `find`).
- **ObjectId (`_id`):** MongoDB ki apni unique ID, har document ko khud milti hai.
- **Mixed type:** jab field ka shape badalta ho.
- **Route params (`:id`):** URL ka badalne wala hissa.
- **HTTP status codes:** 400 user ki galti, 404 nahi mila, 500 server ki galti.
- **`__v`:** Mongoose ka internal version number, ignore kar sakte hain.

#### Errors / dikkatein jo aayi
| Error | Reason | Fix |
|---|---|---|
| `AI call failed: This operation was aborted` | Asli Gemini 15 second mein jawab nahi de paya, timeout ne call kaat di. `MOCK_AI` abhi bhi `false` tha. | DB ka test asli AI ke bina ho sakta hai, isliye `MOCK_AI=true`, `rs`, phir test. **Sabak:** jis cheez ko test karna hai, usko doosri cheez (AI) se alag rakho. |

#### Test results
- Analysis chalayi, report ke saath **`id`** aayi.
- `GET /api/reports/:id` se poori report wapas aayi: `_id`, paanchon agents, `createdAt`, `updatedAt`, `__v`.
- Input sizes 43, 152, 389, 704 chars: discussion saved report mein bhi safe hai.
- Atlas mein `boardroom-ai` database aur `reports` collection check karna.

#### Demo reliability: safety net (kyunki free Gemini kabhi bhi busy ho sakta hai)
1. **Pehle se asli AI se 3-4 achhi reports bana ke DB mein save rakho.** Demo mein pehle wahi dikhao, phir live try karo.
2. Demo se ek din pehle asli AI test karo (subah ya raat, jab Google kam busy ho).
3. **Groq ko fallback provider** banao (Gemini fail ho toh Groq). `callGemini.js` ek file ka change.
4. Timeout 15s se badha ke 30-40s karna (streaming ke liye).
5. Frontend mein **"demo mode"**: saved report ko replay karna.
6. Backup ke liye 2 minute ki screen recording.

#### Interview Q&A
1. **Report kaise save hoti hai?** Mongoose model (`Report.create`) se. Pipeline khatam hone ke baad `saveReport` helper chalta hai.
2. **Save fail ho toh?** try/catch se `null` return, aur user ko result phir bhi milta hai.
3. **Schema aur model mein fark?** Schema data ka structure hai, model usse DB ke saath kaam karne ke functions deta hai.
4. **`judge` ka type Mixed kyun?** Uska shape badalta hai (proper JSON ya `{ raw }`).
5. **History mein poori report kyun nahi bhejte?** `select` se sirf idea, score, time bhejte hain, taaki response chhota aur tez ho.
6. **400, 404, 500 mein fark?** 400 galat request (galat ID), 404 resource nahi mila, 500 server ki dikkat.
7. **AI fail hota rahe toh demo kaise karoge?** Saved reports, fallback provider, aur demo mode.

#### Resume point
> Persisted analysis reports in MongoDB (Mongoose) with history and retrieval-by-ID endpoints, with graceful handling so DB failures never lose the user's result.

#### Progress
Steps 1-7 done, **~65%**. Baaki: React frontend (Step 8, sabse bada), PDF + share link, login, deploy.

#### Checklist
- [ ] Atlas se mock wali reports delete karna (text mein `[MOCK]`)
- [ ] Development mein `MOCK_AI=true`, demo/final test mein `false`
- [ ] Groq fallback lagana (Step 8 se pehle ya baad mein)
- [ ] Timeout 15s se badhana
- [ ] Atlas ka password change (agar abhi tak nahi kiya)

### Step 8: React frontend (8A, 8B, 8C, 8D)

**Goal:** Backend ko ek asli app jaisa dikhana: idea form, live agent cards, score meter, aur history.

#### Frontend ka structure (ab)
```
frontend/src/
├── main.jsx            (BrowserRouter ke andar App)
├── App.jsx             (navbar + routes)
├── config.js           (API_URL ek jagah)
├── agentsConfig.js     (5 agents ki list: naam + rang)
├── index.css           (@import "tailwindcss")
├── components/
│   ├── AgentCard.jsx   (ek agent ka chat bubble)
│   ├── ScoreMeter.jsx  (gol score meter, SVG)
│   └── VerdictPanel.jsx (meter + verdict + 3 cards)
└── pages/
    ├── Home.jsx        (idea form + live streaming)
    ├── History.jsx     (purani reports ki list)
    └── ReportView.jsx  (ek saved report)
```

#### Flow
```
Browser (React) --EventSource--> /api/analyze-stream --> agents --> tokens/events
                                                                        |
Home page: events se agent cards live bharte hain, Judge ka JSON ---> VerdictPanel
History page: GET /api/reports        ReportView: GET /api/reports/:id
```

---

#### 8A: Setup
- **Vite** (React ka dev server) + **Tailwind** (class naam se styling). `npm create vite`, `@tailwindcss/vite` plugin.
- `config.js` mein `API_URL`. Deploy ke time sirf ek line badlegi.
- Test: `/api/health` call karke "Backend: online/offline" dikhaya.
- **Seekha:** `useState` (page ki yaadasht, badle toh page khud dobara dikhta hai), `useEffect(..., [])` (page khulte hi ek baar chalta hai), `fetch`.

#### 8B: Idea form + live chat
- **`AgentCard.jsx`**: ek component, 5 baar use hota hai. Naam, rang, status (waiting / typing / done) aur text **props** se aate hain.
- **`Home`**: `new EventSource(url)` backend ke SSE events padhta hai.
  - `agent_start`: status "typing"
  - `token`: us agent ke text mein tukda jodo (`prev[agent].text + text`) → **live typing**
  - `agent_done`: final text
  - `saved`: report ki `id`
  - `done` / `error`: stream band
- `agent` field se sahi card ko token milta hai, isliye **parallel agents (Market + Competitor) ek saath alag cards mein type** hote hain.
- `encodeURIComponent(idea)`: idea ke spaces aur special characters ko URL ke layak banata hai.
- `useRef` mein `EventSource` rakha (state nahi, kyunki badalne pe page dobara dikhane ki zaroorat nahi).
- **`es.close()` bahut zaroori:** server stream khatam karta hai toh `EventSource` khud dobara connect ho jata hai aur analysis phir shuru ho jati (credits kharch!). Isliye `done` aur `error` dono pe close.
- Page chhodte hi cleanup (`useEffect` ka return) stream band karta hai.
- Button `disabled` jab idea khali ho ya analysis chal rahi ho.

#### 8C: Score meter + final report
- **`ScoreMeter.jsx`**: SVG ke do gol (peeche gray, aage rangin). Aage wale ka kitna hissa dikhe, wo `strokeDashoffset` decide karta hai. `circumference = 2 * PI * radius`.
- Rang: 7+ hara, 5-6 peela, usse kam laal. **Rang inline `style` mein** (Tailwind dynamic class naam `text-${color}` nahi pehchanta).
- `shown` state: pehle 0, 100ms baad asli score, taaki CSS `transition` chale aur meter **dheere bharta** dikhe.
- `Math.max/min`: AI galat score de (jaise 15) toh bhi meter na toote.
- **`VerdictPanel.jsx`**: meter + ek line ka verdict + 3 cards (Strengths, Risks, Next steps). `ListCard` helper teeno ke liye same code. `(items || [])` se crash nahi agar AI list dena bhool jaye.
- **Backend mein mock sudhara:** `callGemini.js` mein Judge ke liye nakli JSON, taaki mock mode mein bhi meter test ho.
- Judge ka result `score` ke saath aaye toh alag state `verdict` mein rakha, warna text mein.

#### 8D: History + pages (React Router)
- `react-router-dom` install, `main.jsx` mein `<BrowserRouter>`.
- **App.jsx ab sirf navbar + `<Routes>`**. Purana saara code `pages/Home.jsx` mein gaya.
- **Routes:** `/` Home, `/history` History, `/report/:id` ReportView, `*` "Page nahi mila".
- **History.jsx:** `GET /api/reports`. 3 states: loading, error, khali list. `r.judge?.score ?? "-"`: purani reports mein score na ho toh crash nahi. Har row ek `<Link>`.
- **ReportView.jsx:** `useParams()` se URL ki `id`, `GET /api/reports/:id`. `useEffect(..., [id])`: id badle toh dobara fetch. 404 aur baaki errors alag message. **Wahi `AgentCard` aur `VerdictPanel` dobara use hue**, sirf data alag jagah se aaya (component reuse).
- **`agentsConfig.js`**: AGENTS list Home aur ReportView dono use karte hain, copy nahi.
- **NavLink** jo page khula hai use khud highlight karta hai. `end` Analyze pe, warna `/` har URL se match hota.
- **Share link ki neev:** `/report/abc123` URL kholne par wahi report khulti hai (refresh pe bhi).

---

#### Files: pehle kya tha, ab kya hai

| File | Pehle | Ab |
|---|---|---|
| `App.jsx` | Health check (8A), phir poora analyze UI (8B, 8C) | Sirf navbar + routes |
| `pages/Home.jsx` | Thi hi nahi | Purana analyze UI yahan aaya, "Report saved" ki jagah report ka `Link` |
| `pages/History.jsx`, `ReportView.jsx` | Thi hi nahi | Nayi pages |
| `agentsConfig.js` | AGENTS list `App.jsx` ke andar thi | Alag file, 2 jagah use hoti hai |
| `components/*` | Thi hi nahi | `AgentCard`, `ScoreMeter`, `VerdictPanel` |
| `main.jsx` | Sirf `<App />` | `<BrowserRouter>` ke andar |
| `backend/callGemini.js` | Mock sirf text deta tha | Judge ke liye mock JSON bhi |

---

#### Concepts (glossary)
- **Component:** UI ka chhota reusable tukda (function jo JSX deta hai).
- **Props:** component ko bahar se diye gaye inputs.
- **State (`useState`):** component ki yaadasht; badle toh UI dobara dikhta hai.
- **`useEffect`:** side-effects (fetch, stream) chalane ke liye. `[]` = ek baar, `[id]` = id badle tab, return function = cleanup.
- **`useRef`:** aisi value jo yaad rakhni hai par badalne pe UI refresh nahi chahiye.
- **EventSource:** browser ka built-in SSE reader.
- **React Router:** ek app ke andar alag URL, alag page, bina page reload ke.
- **`<Link>` vs `<a>`:** `Link` page reload nahi karta, sirf React ka page badalta hai.
- **`useParams`:** URL ka variable (`:id`) nikalta hai.
- **Vite:** dev server, save karte hi browser mein change.
- **Tailwind:** class naam se styling; dynamic class naam banane se kaam nahi karta (poora naam likhna padta hai).

#### Errors jo aaye
| Error | Reason | Fix |
|---|---|---|
| "Backend: offline" | Page backend ke ready hone se pehle khula, aur `useEffect` sirf ek baar check karta hai | Backend chalao, page refresh |
| Vite `import-analysis` error (`./ScoreMeter`) | `ScoreMeter.jsx` file `components` mein bani nahi thi | File sahi naam aur sahi folder mein banao |
| Navbar/History nahi dikha | `App.jsx` purana wala hi tha, replace nahi hua | `App.jsx` poori file naye code se replace |

**Sabak:** import error aaye toh pehle **file ka naam aur jagah** check karo (backend ke `ERR_MODULE_NOT_FOUND` jaisa hi).

#### Mini sawaal ke jawab
1. **`es.close()` kyun?** Warna server ke stream khatam karne par browser khud dobara connect karke analysis phir se shuru kar deta.
2. **Tailwind mein `border-${color}` kyun nahi?** Tailwind poore class naam text mein dhundh ke CSS banata hai. Banaya hua naam use nahi dikhta.
3. **Meter ka rang `style` se kyun?** Dynamic rang ke liye inline style chalta hai.
4. **`shown` state kyun?** Pehle 0, phir asli score; isse CSS transition chalti hai aur meter bharta dikhta hai.
5. **`useEffect` mein `[]` kyun?** Sirf page khulte hi ek baar chalane ke liye, warna har render pe fetch hota.
6. **`config.js` kyun?** API address ek jagah, deploy mein ek line badalni.
7. **`Link` vs `a`?** `Link` page reload nahi karta.
8. **`[id]` kyun?** URL ki id badle toh nayi report fetch ho.

#### Interview Q&A
1. **Live typing frontend mein kaise?** `EventSource` SSE events padhta hai. Har `token` event mein agent ka naam hai, usse sahi card ke text mein jodta hoon, aur React state se UI dobara dikhta hai.
2. **Parallel agents ke tokens mix kyun nahi hote?** Har event mein `agent` field hai, aur state agent ke key se alag-alag rakhi hai.
3. **Stream ke saath kya dikkat aati hai?** Server band kare toh EventSource auto-reconnect karta hai. Isliye `done` aur `error` pe `close()`.
4. **Component reuse ka example?** `AgentCard` aur `VerdictPanel` live analysis aur saved report dono mein use hue.
5. **AI galat format de toh?** `?.`, `?? "-"`, `(items || [])`, aur score ko 0-10 mein clamp karne se UI crash nahi hota.
6. **Loading, error, khali: teeno handle kiye?** Haan, History aur ReportView mein alag message.
7. **Routing kyun?** Har report ka apna URL, jo share link ban sakta hai.

#### Resume point
> Built a React (Vite, Tailwind, React Router) frontend that streams multi-agent output live over SSE, with an animated score meter and shareable report URLs.

#### Progress
Steps 1-8 done, **~83%**. Backend aur frontend dono chal rahe hain (mock mode mein test).

#### Baaki
- Step 9: PDF export + share link
- Step 10: Login (JWT) + rate limiting
- Step 11: Deploy + README (live link)
- Groq fallback, timeout badhana, asli AI se 3-4 achhi demo reports save karna

#### Checklist
- [ ] Mock reports Atlas se delete (text mein `[MOCK]`)
- [ ] Demo ke liye asli AI se achhi reports save
- [ ] Deploy se pehle `config.js` mein live API URL
- [ ] Atlas ka password change (agar abhi tak nahi kiya)

### Step 9: Landing page + Authentication + per-user data (9A, 9B, 9C, 9D)

**Goal:** Ek asli product jaisa flow: landing page, signup/login, har user ki apni reports, aur protected backend.

#### Final flow
```
Landing (/)  ->  Signup/Login  ->  /app (analyzer)  ->  /history  ->  /report/:id
                     |
              token (JWT) localStorage mein
                     |
   har request: Authorization: Bearer <token>  ->  Passport (jwt)  ->  req.user
```

#### URL structure (frontend)
| URL | Page | Login zaroori? |
|---|---|---|
| `/` | Landing | Nahi |
| `/login`, `/signup` | AuthPage | Nahi |
| `/app` | Home (analyzer) | Haan |
| `/history` | History | Haan |
| `/report/:id` | ReportView | Haan |
| `*` | "Page not found." | Nahi |

---

#### 9A: Landing page + routes
- `pages/Landing.jsx`: hero, "Meet the panel" (AGENTS list dobara use hui), "How it works".
- `App.jsx` mein **layout route**: `Layout` (navbar + `<Outlet />`). Jo routes `<Route element={<Layout />}>` ke andar hain unko navbar milta hai, Landing bahar hai isliye nahi.
- **`<Outlet />`** = wo jagah jahan child page aakar baithta hai.
- Navbar ka "Analyze" ab `/app` pe jata hai.

#### 9B: Backend auth (Passport.js)
**Passport kya karta hai aur kya nahi:** Passport sirf ek dhancha hai jisme "strategies" lagti hain. Password hash karna (bcryptjs) aur token banana (jsonwebtoken) uska kaam nahi.

| Kaam | Kaun |
|---|---|
| Password hash | bcryptjs |
| Token banana (`sign`) | jsonwebtoken |
| Email + password check | passport-local strategy |
| Token se user pehchanna | passport-jwt strategy |

**Files:**
- `models/User.js`: name, email (`unique`, `lowercase`, `trim`), password (hash).
- `config/passport.js`: dono strategies. `done(err, user, info)` callback: `done(err)` toot gaya, `done(null, false, {message})` login fail, `done(null, user)` pass.
- `middleware/auth.js`: `requireAuth`, `passport.authenticate("jwt", { session: false }, callback)`. Custom callback isliye ki default 401 sirf plain text deta hai, humein JSON chahiye.
- `routes/auth.js`: `POST /signup` (validate, duplicate check, `bcrypt.hash(password, 10)`, token), `POST /login` (Passport local), `GET /me` (requireAuth).
- `server.js`: `app.use(passport.initialize())`, `import "./config/passport.js"`, `app.use("/api/auth", authRoutes)`.
- `.env`: `JWT_SECRET` (lambi random string, kisi ko mat dikhana).

**Concepts:**
- **Hashing:** password ko ulta na ho sakne wale code mein badalna. DB leak ho tab bhi asli password safe.
- **JWT:** `header.payload.signature`. Payload sirf **encoded** hai (koi bhi padh sakta hai), isliye password kabhi nahi daalte. Signature ye pakka karta hai ki kisi ne badla nahi. Token 7 din mein expire.
- **`session: false`:** sessions/cookies nahi, sirf token. Isse **stateless** auth kehte hain.
- **Galat email aur galat password ka ek hi message**, taaki koi pata na laga sake ki kaun sa email registered hai.
- **`publicUser()`:** response mein password (hash bhi) kabhi nahi.
- **Status codes:** 201 (bana), 400 (galat input), 401 (galat login / token), 409 (email already hai), 500 (server ki dikkat).

#### 9C: Frontend auth
- `auth/AuthContext.jsx`: **Context** = global dabba. `user`, `token`, `loading`, `login`, `signup`, `logout`, `authFetch`. Token `localStorage` mein (try/catch ke saath, kyunki block ho sakta hai).
- Page khulte hi `GET /auth/me`: saved token abhi bhi sahi hai ya nahi. Kharab nikla toh hata do.
- **`loading` state:** jab tak `/me` ka jawab nahi aata, pata nahi user login hai ya nahi. Iske bina logged-in user ko bhi pehle `/login` dikh jata.
- `components/ProtectedRoute.jsx`: loading toh "Loading...", user nahi toh `<Navigate to="/login" state={{ from }} replace />`, warna `<Outlet />`. `state.from` se login ke baad wahi page khulta hai. `replace` se back button loop nahi banta.
- `pages/AuthPage.jsx`: ek hi component login aur signup ke liye (`mode` prop). Login ke baad redirect khud hota hai, kyunki `user` set hote hi `if (user) return <Navigate ...>` chal jati hai.
- `main.jsx`: `<BrowserRouter>` ke andar `<AuthProvider>`, uske andar `<App />`.
- **Tradeoff:** token `localStorage` mein hai. XSS (bahari script chalne wali galti) ho toh chori ho sakta hai. httpOnly cookie behtar hai par alag domain pe deploy mein complexity laata hai.

#### 9D-1: Backend ko protect + data per-user
- `Report` model mein naya field `user` (`ObjectId`, `ref: "User"`, `index: true`).
- `requireAuth` laga: `/analyze`, `/analyze-stream`, `/reports`, `/reports/:id`.
- **Stream ab POST** hai (pehle GET): token header mein aa sake, aur idea URL/logs mein na dikhe.
- History: `Report.find({ user: req.userId })`. Ek report: `Report.findOne({ _id: id, user: req.userId })`. Filter **query ke andar** hai, taaki dusre ka data DB se aaye hi nahi.
- **Dusre ki report pe 404 (403 nahi):** 403 se pata chal jata hai ki ID exist karti hai. 404 se kuch pata nahi chalta.
- Purani reports (bina `user` ke) kisi ki history mein nahi dikhengi. Atlas se delete kar sakte hain.

#### 9D-2: Frontend ko naye backend se jodna
- **`authFetch`** (AuthContext mein): `fetch` + token header. 401 aaye toh `logout()` (token expire ya kharab). `useCallback` se function stable rehta hai, taaki `useEffect` ki dependency mein infinite loop na bane.
- **`streamAnalysis.js`:** `EventSource` header nahi bhej sakta, isliye `fetch` + `res.body.getReader()`. `TextDecoder({ stream: true })` bytes ko text banata hai. `buffer`: network tukde apni marzi se katte hain, toh `\n\n` (event ki seema) pe todte hain, aur `parts.pop()` se aakhri adhoora tukda agli baar ke liye bacha ke rakhte hain.
- **`AbortController`:** page chhodte hi stream cancel (backend report phir bhi save kar leta hai).
- Home, History, ReportView dobara likhe, UI text **sab English mein**.
- Home mein saare events ek `handleEvent` (`switch`) mein.

---

### Step 10: Rate limiting

**Kyun:** har analysis mein 5 AI calls lagte hain (paisa). Koi bar-bar chala ke credits khatam kar sakta hai, aur login pe brute-force ho sakta hai.

| Limiter | Kahan | Limit | Kiske naam pe |
|---|---|---|---|
| `authLimiter` | login, signup | 20 / 15 min | IP |
| `analyzeLimiter` | analyze, analyze-stream | 5 / ghanta (`ANALYZE_LIMIT` se badal sakte hain) | user ki ID |

- `middleware/rateLimit.js` (`express-rate-limit`). Zyada requests par **429**.
- `message` mein `{ error: "..." }` JSON hai, toh frontend ko kuch badalna nahi pada (wo `data.error` padhta hai).
- **Order zaroori:** `requireAuth` pehle, `analyzeLimiter` baad mein (`keyGenerator` ko `req.userId` chahiye).
- **`trust proxy`:** Render jaise hosting pe server ke aage proxy hota hai. Bina iske sab users ka IP ek dikhta aur sab ek saath block hote. `NODE_ENV=production` pe `app.set("trust proxy", 1)`.
- **Limitation:** count server ki memory mein hai, restart pe reset. Bade production mein Redis.

---

### Files: pehle kya tha, ab kya hai

| File | Pehle | Ab |
|---|---|---|
| `App.jsx` | Navbar + 3 routes | Routes + `Layout` (Outlet) + `ProtectedRoute` + login/signup/landing |
| `main.jsx` | `BrowserRouter` | + `AuthProvider` |
| `pages/Landing.jsx`, `AuthPage.jsx` | Thi hi nahi | Nayi |
| `pages/Home.jsx` | `EventSource`, GET stream | `streamAnalysis` + `authFetch`, POST stream |
| `pages/History.jsx`, `ReportView.jsx` | Seedha `fetch` | `authFetch` (token ke saath) |
| `auth/AuthContext.jsx`, `components/ProtectedRoute.jsx`, `streamAnalysis.js` | Thi hi nahi | Nayi |
| `models/User.js`, `config/passport.js`, `middleware/auth.js`, `routes/auth.js`, `middleware/rateLimit.js` | Thi hi nahi | Nayi |
| `models/Report.js` | Koi `user` field nahi | + `user` |
| `routes/ideas.js` | Koi login nahi, GET stream | `requireAuth`, `analyzeLimiter`, POST stream, report `user` ke saath save |
| `routes/reports.js` | Sabki reports ek list mein | `requireAuth`, per-user filter |
| `server.js` | cors, json, 2 routes | + passport, `/api/auth`, trust proxy |

### API endpoints (ab)
| Method | URL | Login | Kaam |
|---|---|---|---|
| GET | `/api/health` | Nahi | Server zinda? |
| POST | `/api/auth/signup` | Nahi (limiter) | Naya account + token |
| POST | `/api/auth/login` | Nahi (limiter) | Login + token |
| GET | `/api/auth/me` | Haan | Mera user |
| POST | `/api/analyze` | Haan (limiter) | Poora analysis ek saath |
| POST | `/api/analyze-stream` | Haan (limiter) | Live streaming analysis |
| GET | `/api/reports` | Haan | Meri latest 20 reports |
| GET | `/api/reports/:id` | Haan | Meri ek report |

---

### Errors jo aaye
| Error | Reason | Fix |
|---|---|---|
| `querySrv ETIMEOUT / ECONNREFUSED`, `getaddrinfo ENOTFOUND` | Laptop ka DNS kabhi chalta kabhi nahi (network ki dikkat, auth ke code ki nahi) | Phone ka hotspot, ya standard connection string (`mongodb://`) |
| `ReferenceError: ProtectedRoute is not defined` | `App.jsx` mein import line nahi thi | Import add |
| Vite `Failed to resolve import "./components/ProtectedRoute"` | File bani hi nahi thi | File sahi naam aur folder mein |
| `Cannot destructure property 'user' of useAuth(...) as it is null` | `AuthProvider` ne `<App />` ko lapeta nahi | `main.jsx` mein `<AuthProvider><App /></AuthProvider>` |
| 401 nahi aaya (reports khule the) | `reports.js` purani file thi, `requireAuth` nahi tha | Poori file replace + server restart |
| Mock mode mein bhi asli Gemini ke `failed` logs | `callGemini.js` mein mock check adhoori edit se gaya | Poori file replace, ek hi server chalana |
| UI mein Hinglish text | Meri galti (UI English hi hona chahiye) | Saari UI strings English |

**Sabak:**
- Pehla debug: `console.log("MOCK_AI =", ...)` jaisi ek line se pata chalta hai server ko asli mein kya mil raha hai.
- Network/DNS errors project ke code se alag hote hain. Pehle `nslookup` ya hotspot se pakka karo.
- `... is not defined` = import bhool gaye. `Failed to resolve import` = file banayi nahi ya galat jagah.

---

### Concepts (naye)
- **Middleware:** route se pehle chalne wala chaukidaar (`next()` se aage jaane deta hai).
- **Strategy (Passport):** authentication ka ek tareeka (local, jwt).
- **JWT:** signed token, payload padha ja sakta hai par badla nahi ja sakta.
- **Context:** global dabba, props drilling se bachata hai.
- **Protected route:** bina login ke page nahi khulta (frontend ka UX; asli security backend mein).
- **`authFetch`:** token wala `fetch`, 401 pe auto logout.
- **ReadableStream + TextDecoder:** response ko tukdon mein padhna.
- **AbortController:** chalti request ko cancel karna.
- **Rate limiting / 429:** requests ki limit, zyada par "Too Many Requests".
- **Data isolation:** har user sirf apna data dekhe (filter query ke andar).

---

### Mini sawaal ke jawab
1. **Passport kya karta hai aur kya nahi?** Dhancha aur strategies deta hai. Hash aur token nahi banata.
2. **Password hash kyun?** Ulta na ho sakne wala code, DB leak ho tab bhi asli password safe.
3. **`session: false` kyun?** Sessions/cookies nahi, sirf token (stateless).
4. **JWT mein password kyun nahi?** Payload encoded hai, encrypted nahi. Koi bhi padh sakta hai.
5. **`loading` state kyun?** Jab tak `/me` ka jawab nahi aata, nahi pata user login hai ya nahi.
6. **Frontend se page protect karna kaafi kyun nahi?** Wo sirf UX hai. API seedha call ho sakti hai, asli rok backend mein hoti hai.
7. **Stream GET se POST kyun?** Token header mein bhejne ke liye, aur idea URL mein na dikhe.
8. **`EventSource` ki jagah `fetch` kyun?** `EventSource` custom headers nahi bhej sakta.
9. **Dusre ki report pe 404 kyun?** 403 se pata chalta hai ki ID exist karti hai.
10. **User ka filter query ke andar kyun?** Dusre ka data DB se aaye hi nahi, laane ke baad filter nahi.
11. **`authFetch` mein 401 pe logout kyun?** Token kharab ya expire hua, user ko dobara login karna hoga.
12. **`useCallback` kyun?** Function stable rahe, `useEffect` dependency mein loop na bane.
13. **Analysis limit user pe, login limit IP pe kyun?** Analysis mein kharcha user ka hai (ek WiFi pe kai log). Login mein user abhi pehchana nahi gaya, isliye IP.
14. **`analyzeLimiter` `requireAuth` ke baad kyun?** `keyGenerator` ko `req.userId` chahiye.
15. **429 vs 401?** 401 = login nahi/token galat. 429 = bahut zyada requests.

---

### Interview Q&A
1. **Auth kaise kiya?** Passport.js: local strategy login ke liye, JWT strategy routes protect karne ke liye. Password bcrypt se hash, token stateless JWT.
2. **JWT kyun, sessions kyun nahi?** Frontend aur backend alag domain pe deploy honge. Token stateless hai, server ko kuch yaad nahi rakhna.
3. **Authenticated stream kaise kiya?** `EventSource` header nahi bhej sakta, isliye `fetch` + `ReadableStream`, aur SSE events khud parse kiye (buffer, `\n\n` split).
4. **Ek user dusre ki report kaise nahi dekh sakta?** Har report mein `user` ID hai, aur query mein hi filter hai (`_id` + `user`). Dusre ki report pe 404.
5. **Credits ki suraksha?** Per-user rate limit (analysis), per-IP limit (login), aur login zaroori.
6. **Token chori ho jaye toh?** localStorage mein XSS ka risk hai. Improvement: httpOnly cookie, shorter expiry, refresh token.
7. **Rate limiter ki limitation?** Memory mein hai, restart ya multiple servers pe reset. Production mein Redis.
8. **Protected route aur backend protection mein fark?** Frontend UX ke liye, backend asli suraksha ke liye.

---

### Resume points (update)
> Implemented authentication with Passport.js (local + JWT strategies), bcrypt password hashing, and per-user data isolation in MongoDB.
> Built an authenticated SSE streaming client using fetch and ReadableStream (EventSource cannot send headers).
> Added per-user and per-IP rate limiting to protect paid AI API usage and prevent brute-force attacks.

### Progress
Steps 1-10 done, **~92%**.

### Baaki
- **Step 11:** Deploy (Render + Vercel), README, architecture diagram, live link
- Optional: PDF export aur share link (ab reports owner-only hain, share ke liye `isPublic` ya share ID chahiye)
- Groq fallback (demo reliability), asli AI se 3-4 achhi demo reports save karna

### Checklist
- [ ] `.env` mein `ANALYZE_LIMIT` development ke liye 100, deploy pe 5
- [ ] `console.log("MOCK_AI = ...")` debug line `server.js` se hatao
- [ ] Atlas se purani reports (bina user ke) aur mock reports delete
- [ ] Atlas ka password change (agar abhi tak nahi kiya)
- [ ] Deploy pe `NODE_ENV=production`, naya `JWT_SECRET` (dev wala mat use karna)
- [ ] `0.0.0.0/0` Atlas Network Access sirf deploy ke liye, aur uska password strong