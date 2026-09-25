import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'stealth-desk-content';

const SYSTEM_DESIGN = [
  '# System Design',
  '',
  '## How to open',
  '- Clarify functional requirements, scale, and the constraint that actually matters',
  '- Estimate QPS, storage, and bandwidth before naming products',
  '- Draw clients, edge, services, data stores, and the async path',
  '- Name the first bottleneck, the failure mode, and the metric you would alert on',
  '',
  '## CAP theorem',
  '- Consistency: every read sees the latest committed write',
  '- Availability: every request receives a non-error response',
  '- Partition tolerance: the system continues during a network split',
  '- During a partition you pick CP or AP. CA only exists if partitions cannot happen',
  '- CP examples: ZooKeeper, etcd, HBase, a SQL primary with quorum commits',
  '- AP examples: Cassandra, Dynamo-style stores, DNS',
  '- PACELC: if there is a Partition, trade availability and consistency; Else, trade latency and consistency',
  '',
  '## Load balancing',
  '- Layer 4 balances connections. Layer 7 can route on path, header, or cookie',
  '- Algorithms: round robin, least connections, weighted, consistent hashing, IP hash',
  '- Consistent hashing keeps a key on the same node as the ring changes. Virtual nodes smooth hot spots',
  '- Health checks combine active probes and passive error rate. Remove a node only after repeated failures',
  '- Run the balancer in at least two zones. Clients need a short DNS TTL or anycast in front',
  '- Sticky sessions belong at the edge only when the state cannot move to a shared store',
  '',
  '## Caching',
  '- Cache-aside: read the cache, and on a miss load the database and fill the cache',
  '- Read-through and write-through: the cache library talks to the database',
  '- Write-behind flushes asynchronously. It is fast and can lose the last writes',
  '- Invalidate when correctness matters. A TTL is the backstop, not the design',
  '- A stampede turns one miss into thousands of database reads. Coalesce those requests',
  '- Hot keys: replicate the entry, or put a small in-process cache in front of Redis',
  '- Evict with LRU for recency, LFU for popularity, and TTL for freshness',
  '',
  '## Database selection',
  '- SQL when you need transactions, joins, and constraints: orders, payments, inventory',
  '- A document store fits an aggregate you load by id: profile, catalog item, session blob',
  '- Wide-column fits time-series and huge partitioned writes',
  '- Key-value fits cache, locks, and simple lookups',
  '- A search index serves full text. It is not the source of truth',
  '- Index the columns you filter and sort. An unused index only taxes writes',
  '- Shard on a high-cardinality key the query always has. A key like "today" becomes a hotspot',
  '- Know whether replicas are synchronous or asynchronous before you promise a read-your-writes story',
  '',
  '## Reliability patterns',
  '- Put a timeout on every remote call. Retry only idempotent work, with jittered backoff',
  '- A circuit breaker opens after the error budget is spent, then probes half-open',
  '- Bulkheads give each dependency its own pool so one outage cannot take every thread',
  '- Idempotency keys make at-least-once delivery safe for payments and other writes',
  '- Rate-limit and shed load at the edge before the database falls over',
  '- Multi-AZ covers a dead instance. Multi-region is for an RPO and RTO that require it',
  '- A backup is not real until you have restored it',
  '- Degrade on purpose: serve a stale cache, drop a non-critical feature, queue the write',
  '',
  '## Messaging',
  '- A queue distributes work. A log or topic fans the same event out to many consumers',
  '- Kafka keeps order inside a partition. Consumers store their own offsets',
  '- At most once drops on failure. At least once retries, so the consumer must be idempotent',
  '- Effective exactly-once is usually a transaction plus an idempotency key, not a magic flag',
  '- Outbox: write the business row and the event in one database transaction, then publish',
  '- After N failures, park the message on a dead-letter queue and alert',
  '- Ordering holds for one partition key, not for the whole topic',
  '',
  '## Common numbers',
  '- Memory is ~100 ns, SSD is ~100 us, a disk seek is ~10 ms',
  '- Same-zone round trip is well under 1 ms. Cross-region is often 50 to 150 ms',
  '- 1 day is 86,400 seconds. 10k QPS sustained is about 864 million requests a day',
  '- 1 million daily users at 20 requests each is about 230 QPS average. Peak is often 5 to 10 times that',
  '- 1 KB times 1 million rows is about 1 GB before indexes and replicas',
  '- 99.9% availability allows about 43 minutes of downtime a month. 99.99% allows about 4 minutes',
  '',
  '## Close the interview',
  '- Say which component saturates first and what you would shard, cache, or make async',
  '- Name the metric: error rate, p99 latency, queue lag, or saturation',
  '- Mention the one thing you would cut if you had to ship a smaller version',
].join('\n');

const ALGORITHMS = [
  '# Algorithms',
  '',
  '## Big-O',
  '- O(1) hash map get or set on average, and array index',
  '- O(log n) binary search, balanced tree, heap push and pop',
  '- O(n) linear scan, two pointers, sliding window',
  '- O(n log n) comparison sort, and sorting n items with a heap',
  '- O(n^2) nested loops over the same collection',
  '- O(2^n) subsets and naive recursion over include-or-skip choices',
  '- O(n!) permutations',
  '- Space means extra memory. Say so if the interviewer wants input included',
  '- Dynamic array append is O(1) amortized because resizes are rare',
  '',
  '## Sliding window',
  '- Use it for a best contiguous subarray or substring',
  '- Move right outward. Shrink left while the window is invalid',
  '- Fixed size k: add nums[right], and once right >= k drop nums[right - k]',
  '- Variable size: longest substring without a repeat keeps a frequency map',
  '```',
  'function window(nums, k) {',
  '  let left = 0;',
  '  let best = 0;',
  '  let state = 0;',
  '  for (let right = 0; right < nums.length; right++) {',
  '    state += nums[right];',
  '    while (state > k && left <= right) {',
  '      state -= nums[left];',
  '      left++;',
  '    }',
  '    best = Math.max(best, right - left + 1);',
  '  }',
  '  return best;',
  '}',
  '```',
  '',
  '## Two pointers',
  '- Sorted pair sum: left at 0, right at n - 1. Move the side that fixes the sum',
  '- Same direction: slow writes the kept items, fast scans (dedupe a sorted array)',
  '- Opposite ends for a palindrome, or for container with most water',
  '- Do not put two pointers on unsorted data unless you sort first and indexes may change',
  '',
  '## Binary search',
  '- The input is sorted, or you are searching the answer space for the minimum feasible value',
  '- Mid is lo + ((hi - lo) >> 1) so the index cannot overflow',
  '- Lower bound: first index with nums[i] >= target. If mid works, search the left half including mid',
  '```',
  'function binarySearch(nums, target) {',
  '  let lo = 0;',
  '  let hi = nums.length - 1;',
  '  while (lo <= hi) {',
  '    const mid = lo + ((hi - lo) >> 1);',
  '    if (nums[mid] === target) return mid;',
  '    if (nums[mid] < target) lo = mid + 1;',
  '    else hi = mid - 1;',
  '  }',
  '  return -1;',
  '}',
  '```',
  '',
  '## BFS',
  '- Shortest path on an unweighted graph, and level order of a tree',
  '- Record distance when you enqueue. Mark seen when you enqueue, not when you dequeue',
  '- A grid usually has four neighbors. Add the diagonal only if the problem allows it',
  '- 0-1 BFS uses a deque: weight 0 goes on the front, weight 1 goes on the back',
  '```',
  'function bfs(start) {',
  '  const queue = [start];',
  '  const seen = new Set([start]);',
  '  while (queue.length) {',
  '    const node = queue.shift();',
  '    for (const next of neighbors(node)) {',
  '      if (seen.has(next)) continue;',
  '      seen.add(next);',
  '      queue.push(next);',
  '    }',
  '  }',
  '}',
  '```',
  '',
  '## DFS',
  '- Connected components, cycle detection, topological sort, and backtracking',
  '- Backtracking is choose, recurse, unchoose. Prune a partial answer that cannot succeed',
  '- Iterative DFS uses a stack. Mark seen at push time or you will push the same node twice',
  '- A directed cycle: a node in the current path (visiting) means a back edge',
  '```',
  'function dfs(node, seen) {',
  '  if (seen.has(node)) return;',
  '  seen.add(node);',
  '  for (const next of neighbors(node)) dfs(next, seen);',
  '}',
  '```',
  '',
  '## Dynamic programming',
  '- You need overlapping subproblems and an optimal substructure',
  '- State the state, the transition, the base case, the loop order, and where the answer sits',
  '- 1D: climb stairs, house robber, coin change',
  '- 2D: grid paths, edit distance, 0/1 knapsack',
  '- If only the previous row matters, keep two arrays or roll the index in place',
  '```',
  'function coinChange(coins, amount) {',
  '  const dp = Array(amount + 1).fill(Infinity);',
  '  dp[0] = 0;',
  '  for (let a = 1; a <= amount; a++) {',
  '    for (const coin of coins) {',
  '      if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);',
  '    }',
  '  }',
  '  return dp[amount] === Infinity ? -1 : dp[amount];',
  '}',
  '```',
  '',
  '## Patterns worth naming',
  '- Prefix sums turn a range sum into two lookups',
  '- A monotonic stack answers the next greater element in linear time',
  '- Union-find handles dynamic connectivity and component counts',
  '- A heap handles top-k and a running median',
  '- A trie handles prefix lookup. Add a word-end flag',
  '- Reach for a segment tree only when the problem has range updates',
].join('\n');

const BEHAVIORAL = [
  '# Behavioral',
  '',
  '## STAR method',
  '- Situation: one sentence of context. Team, product, and the constraint',
  '- Task: the piece you personally owned, not the team goal',
  '- Action: the decision you made, the tradeoff, and who you pulled in',
  '- Result: a number when you have one, and what changed afterward',
  '- Keep the story under two minutes. Start from the result if time is short',
  '',
  '## Stories to have ready',
  '1. A technical tradeoff you drove and how you chose',
  '2. A production incident you debugged, including the guardrail you added',
  '3. A disagreement with a teammate or manager',
  '4. A project that slipped and how you reset the scope',
  '5. Feedback you took and the behavior that changed',
  '6. A time you unblocked someone else',
  '7. An ambiguous problem you structured before writing code',
  '',
  '## Common questions',
  '- Tell me about yourself: current work, the problems you like, why this team',
  '- Hardest bug: hypothesis, what you measured, the fix, and the regression check',
  '- Conflict: state their goal fairly, then the principle you used to decide',
  '- Failure: own your part in the first sentence',
  '- Leadership without a title: the influence, the writing, or the mentoring',
  '- Why you are leaving: the work you want next, not a list of complaints',
  '',
  '## How to answer',
  '- Use I for the action and we for the shared outcome',
  '- If you do not remember a metric, say what you would look up. Do not invent one',
  '- Pause and pick the story that matches the question',
  '- Close with what you would repeat and what you would drop',
  '',
  '## Questions to ask them',
  '- What does a strong first six months look like on this team?',
  '- What actually pages on-call, and how often?',
  '- How is a technical decision written down, and how is it reversed?',
  '- What is the team trying to stop doing this quarter?',
  '- What happens in a design review when two seniors disagree?',
  '- What changed after the last serious incident?',
].join('\n');

const TALKING_POINTS = [
  '# Talking Points',
  '',
  '## Role I want',
  '- Team:',
  '- Product:',
  '- Why this company:',
  '',
  '## Intro (30 seconds)',
  '- I am:',
  '- Recently I:',
  '- I want to:',
  '',
  '## Project 1',
  '- Context:',
  '- My role:',
  '- Hard part:',
  '- Result:',
  '',
  '## Project 2',
  '- Context:',
  '- My role:',
  '- Hard part:',
  '- Result:',
  '',
  '## Strength to mention',
  '- ',
  '',
  '## Gap to own honestly',
  '- ',
  '',
  '## Questions I still need to ask',
  '- ',
  '- ',
].join('\n');

const DEFAULT_TABS = [
  { id: 'system-design', label: 'System Design', icon: '🏗', content: SYSTEM_DESIGN },
  { id: 'algorithms', label: 'Algorithms', icon: '⚡', content: ALGORITHMS },
  { id: 'behavioral', label: 'Behavioral', icon: '🎯', content: BEHAVIORAL },
  { id: 'talking-points', label: 'Talking Points', icon: '💡', content: TALKING_POINTS },
  { id: 'browser', label: 'Browser', icon: '🌐', content: '' },
];

function loadTabs() {
  let saved = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw) || {};
  } catch {
    saved = {};
  }
  return DEFAULT_TABS.map((tab) =>
    Object.prototype.hasOwnProperty.call(saved, tab.id) ? { ...tab, content: saved[tab.id] } : { ...tab }
  );
}

function persistTabs(nextTabs) {
  const map = {};
  nextTabs.forEach((tab) => {
    map[tab.id] = tab.content;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function classifyLine(line, inFence) {
  const trimmed = line.trim();
  if (trimmed.startsWith('```')) return 'code-fence';
  if (inFence) return 'code';
  if (trimmed === '') return 'blank';
  if (line.startsWith('### ')) return 'h3';
  if (line.startsWith('## ')) return 'h2';
  if (line.startsWith('# ')) return 'h1';
  if (line.startsWith('- ') || line.startsWith('→')) return 'bullet';
  if (/^\d+\./.test(line)) return 'numbered';
  return 'text';
}

function renderLines(content, searchQuery) {
  const query = searchQuery.trim().toLowerCase();
  const lines = content.split('\n');
  let inFence = false;
  return lines.map((line, index) => {
    const variant = classifyLine(line, inFence);
    if (line.trim().startsWith('```')) inFence = !inFence;
    const highlight = query.length > 0 && line.toLowerCase().includes(query);
    const className = `line line-${variant}${highlight ? ' line-highlight' : ''}`;
    return (
      <div key={index} className={className}>
        {line.trim() === '' ? '\u00A0' : line}
      </div>
    );
  });
}

function navigateTarget(raw) {
  const input = (raw || '').trim();
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  if (!input.includes(' ') && input.includes('.')) return `https://${input}`;
  return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
}

export default function App() {
  const [tabs, setTabs] = useState(loadTabs);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_TABS[0].id);
  const [opacity, setOpacity] = useState(90);
  const [clickThrough, setClickThrough] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
  const [addressInput, setAddressInput] = useState('https://www.google.com');
  const webviewRef = useRef(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  const browserActive = activeTab.id === 'browser';

  useEffect(() => {
    window.electronAPI?.setOpacity(opacity / 100);
  }, [opacity]);

  useEffect(() => {
    if (!window.electronAPI?.onToggleClickThroughHotkey) return undefined;
    return window.electronAPI.onToggleClickThroughHotkey(() => {
      setClickThrough((prev) => {
        const next = !prev;
        window.electronAPI.setClickThrough(next);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (!browserActive) return undefined;
    const wv = webviewRef.current;
    if (!wv) return undefined;

    const sync = (event) => {
      const url = event?.url || (typeof wv.getURL === 'function' ? wv.getURL() : '');
      if (url) setAddressInput(url);
    };

    wv.addEventListener('did-navigate', sync);
    wv.addEventListener('did-navigate-in-page', sync);
    return () => {
      wv.removeEventListener('did-navigate', sync);
      wv.removeEventListener('did-navigate-in-page', sync);
    };
  }, [browserActive, browserUrl]);

  function updateActiveContent(content) {
    setTabs((prev) => {
      const next = prev.map((tab) => (tab.id === activeTabId ? { ...tab, content } : tab));
      persistTabs(next);
      return next;
    });
  }

  function resetActiveTab() {
    const original = DEFAULT_TABS.find((tab) => tab.id === activeTabId);
    if (!original) return;
    updateActiveContent(original.content);
    setEditMode(false);
  }

  function toggleClickThrough() {
    setClickThrough((prev) => {
      const next = !prev;
      window.electronAPI?.setClickThrough(next);
      return next;
    });
  }

  function navigateTo(raw) {
    const url = navigateTarget(raw);
    if (!url) return;
    setBrowserUrl(url);
    setAddressInput(url);
    const wv = webviewRef.current;
    if (wv && typeof wv.loadURL === 'function') wv.loadURL(url);
  }

  function onAddressSubmit(event) {
    event.preventDefault();
    navigateTo(addressInput);
  }

  const linuxOpacity = window.electronAPI?.platform === 'linux' ? opacity / 100 : undefined;

  return (
    <div className={`app${clickThrough ? ' app--click-through' : ''}`} style={linuxOpacity == null ? undefined : { opacity: linuxOpacity }}>
      <header className="titlebar">
        <div className="brand">
          <span className="dot" />
          <span className="brand-label">STEALTH MODE</span>
        </div>
        <div className="window-controls">
          <button
            type="button"
            className="icon-btn"
            title={editMode ? 'Done editing' : 'Edit'}
            disabled={browserActive}
            onClick={() => setEditMode((value) => !value)}
          >
            {editMode ? '✓' : '✎'}
          </button>
          <button type="button" className="icon-btn" title="Reset tab" onClick={resetActiveTab}>
            ↺
          </button>
          <button type="button" className="icon-btn" title="Minimize" onClick={() => window.electronAPI?.minimize()}>
            −
          </button>
          <button type="button" className="icon-btn icon-btn--close" title="Close" onClick={() => window.electronAPI?.close()}>
            ×
          </button>
        </div>
      </header>

      {clickThrough && (
        <div className="click-banner">Click-through ON · press ⌘⇧C to regain control</div>
      )}

      <nav className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab${tab.id === activeTab.id ? ' tab--active' : ''}`}
            onClick={() => {
              setActiveTabId(tab.id);
              setEditMode(false);
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="search-row" style={{ display: browserActive ? 'none' : 'flex' }}>
        <input
          className="search-input"
          type="text"
          placeholder="Search notes"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <main className="content" onDoubleClick={() => { if (!browserActive && !editMode) setEditMode(true); }}>
        {browserActive ? (
          <div className="browser-pane">
            <form className="browser-bar" onSubmit={onAddressSubmit}>
              <button type="button" className="nav-btn" title="Back" onClick={() => webviewRef.current?.goBack()}>
                ←
              </button>
              <button type="button" className="nav-btn" title="Forward" onClick={() => webviewRef.current?.goForward()}>
                →
              </button>
              <button type="button" className="nav-btn" title="Reload" onClick={() => webviewRef.current?.reload()}>
                ↻
              </button>
              <input
                className="address-input"
                type="text"
                value={addressInput}
                spellCheck="false"
                onChange={(event) => setAddressInput(event.target.value)}
              />
              <button type="submit" className="go-btn">
                Go
              </button>
            </form>
            <webview
              ref={webviewRef}
              className="browser-webview"
              src={browserUrl}
              allowpopups="true"
            />
          </div>
        ) : editMode ? (
          <textarea
            className="content-editor"
            value={activeTab.content}
            spellCheck="false"
            onChange={(event) => updateActiveContent(event.target.value)}
          />
        ) : (
          <div className="content-viewer">
            {renderLines(activeTab.content, searchQuery)}
            <div className="edit-hint">double-click to edit</div>
          </div>
        )}
      </main>

      <footer className="toolbar">
        <label className="opacity-label" htmlFor="opacity">
          Opacity
        </label>
        <input
          id="opacity"
          className="opacity-slider"
          type="range"
          min="20"
          max="100"
          step="5"
          value={opacity}
          onChange={(event) => setOpacity(Number(event.target.value))}
        />
        <span className="opacity-value">{opacity}%</span>
        <button
          type="button"
          className={`click-toggle${clickThrough ? ' click-toggle--on' : ''}`}
          onClick={toggleClickThrough}
        >
          {clickThrough ? 'Click-through ON' : 'Click-through'}
        </button>
      </footer>
    </div>
  );
}
