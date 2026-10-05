// SpotMate AI 검색 (Cloudflare Worker)
// 검색 문장을 Claude Haiku 4.5가 SpotMate 필터(JSON)로 바꿔 돌려줘요. 장소를 고르는 건 사이트가 해요.
// 필요한 값 (Cloudflare 대시보드 > Worker > Settings > Variables and Secrets):
//   ANTHROPIC_API_KEY (Secret)  — Anthropic 콘솔에서 만든 키
//   ALLOWED_ORIGINS  (Text, 선택) — 쉼표로 구분. 없으면 아래 기본값
// 키는 이 Worker 안에만 있고 브라우저에는 절대 보내지 않아요.

const MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_ORIGINS = 'https://tinytripsvan.ca,https://www.tinytripsvan.ca,https://jsp6forcode.github.io,http://localhost:8765';
const MAX_Q = 200;          // 검색어 최대 글자 수
const PER_MINUTE = 12;      // IP당 1분 요청 수 (Worker 인스턴스마다 따로 세는 간단한 제한)

// 사이트의 SEARCH_KW 키와 같아야 해요 (index.html)
const KW = {
  ramen: 'ramen', pho: 'pho / Vietnamese', sushi: 'sushi, omakase', hotpot: 'hot pot', korean: 'Korean food, KBBQ',
  japanese: 'Japanese, izakaya, katsu, udon', chinese: 'Chinese, dim sum, dumplings', indian: 'Indian, curry', thai: 'Thai',
  italian: 'Italian, pasta, pizza', burger: 'burgers', steak: 'steak', seafood: 'seafood, oysters, fish', mexican: 'Mexican, tacos',
  persian: 'Persian, kebab, Middle Eastern', brunch: 'brunch, breakfast, pancakes', pub: 'pubs, breweries, beer',
  coffee: 'coffee, cafés, matcha', icecream: 'ice cream, gelato', bakery: 'bakery, bread, pastry', dessert: 'desserts, cake, sweets',
  playground: 'playgrounds', water: 'spray parks, pools, swimming, water play', bike: 'biking, bike parks, pump tracks',
  hike: 'hikes, trails, forest walks', beach: 'beaches, seawall', museum: 'museums, galleries, art', farm: 'farms, animals, petting zoo',
  garden: 'gardens, flowers', indoorplay: 'indoor play, trampoline, climbing gyms, play centres', pumpkin: 'pumpkin patches, Halloween',
  views: 'views, sunsets, lookouts',
};

const SYSTEM = `You turn a search on SpotMate, a guide to places in Metro Vancouver, into filters. Call set_filters once.
Pages: "explore" = things to do (parks, museums, attractions, kid activities), "eats" = restaurants, pubs, bars, "dessert" = cafés, coffee, bakeries, ice cream, desserts.
Keyword keys (use only these; pick every one that fits, none if nothing fits):
${Object.entries(KW).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
Rules:
- words: up to 4 extra English words to look for in place names, descriptions and menus, only for specific things not covered by a key (e.g. "bibimbap", "aquarium", "dumpling"). Singular, lowercase. Empty when keys cover it.
- near: the user wants somewhere close (near me, nearby, walking distance, around here).
- now: they want it open now or soon (now, tonight, right now, still open, late night).
- kids: with children/family. free: free of charge (explore only). indoor: indoor or rainy-day (explore only).
- price: "$" cheap/budget, "$$" mid, "$$$" fancy/date night/special occasion, "" otherwise (eats only).
- happy_hour: drinks deals/after work. lunch: lunch specials/lunch deals.
- when: the day they plan to go: "today", "tomorrow", "weekend" (this weekend), "sat", "sun", or "" when not said or "now". "now" stays for right now only.
- place: the area they name, as one of: downtown, northvan, westvan, burnaby, richmond, newwest, coquitlam, portcoquitlam, portmoody, surrey, southsurrey, whiterock, delta, tsawwassen, langley, fortlangley, mapleridge, pittmeadows, steveston, kitsilano, mountpleasant, eastvan, deepcove, ubc. "" when no area is named.
- Food or drink cravings go to eats (or dessert for sweets/coffee). Activities go to explore.
- say: one short friendly English line (max 12 words) describing what you're showing, e.g. "Ramen spots open now near you". No emoji.
- If the text is not a search for places, set every filter off and say "Try asking for a place, like ramen near me".`;

const TOOL = {
  name: 'set_filters',
  description: 'Filters for the SpotMate list.',
  input_schema: {
    type: 'object',
    properties: {
      page: { type: 'string', enum: ['explore', 'eats', 'dessert'] },
      keys: { type: 'array', items: { type: 'string', enum: Object.keys(KW) } },
      words: { type: 'array', items: { type: 'string' }, maxItems: 4 },
      near: { type: 'boolean' }, now: { type: 'boolean' }, kids: { type: 'boolean' }, free: { type: 'boolean' }, indoor: { type: 'boolean' },
      price: { type: 'string', enum: ['', '$', '$$', '$$$'] },
      happy_hour: { type: 'boolean' }, lunch: { type: 'boolean' },
      when: { type: 'string', enum: ['', 'today', 'tomorrow', 'weekend', 'sat', 'sun'] },
      place: { type: 'string' },
      say: { type: 'string' },
    },
    required: ['page', 'keys', 'words', 'near', 'now', 'kids', 'free', 'indoor', 'price', 'happy_hour', 'lunch', 'when', 'place', 'say'],
  },
};

const hits = new Map();
function limited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 60000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > PER_MINUTE;
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(',').map(s => s.trim());
    const cors = allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } : {};
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (req.method === 'OPTIONS') return new Response(null, { status: cors['Access-Control-Allow-Origin'] ? 204 : 403, headers: cors });
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    if (!cors['Access-Control-Allow-Origin']) return json({ error: 'origin' }, 403);
    if (limited(req.headers.get('CF-Connecting-IP') || 'x')) return json({ error: 'rate_limited' }, 429);

    let q = '', now = '';
    try { const b = await req.json(); q = String(b.q || '').trim().slice(0, MAX_Q); now = String(b.now || '').slice(0, 60); } catch (e) {}
    if (!q) return json({ error: 'empty' }, 400);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 300,
        system: SYSTEM,
        tools: [TOOL], tool_choice: { type: 'tool', name: 'set_filters' },
        messages: [{ role: 'user', content: `Now in Vancouver: ${now || 'unknown'}\nSearch: ${q}` }],
      }),
    });
    if (!res.ok) return json({ error: 'upstream', status: res.status }, 502);
    const out = await res.json();
    const tool = (out.content || []).find(c => c.type === 'tool_use');
    if (!tool) return json({ error: 'no_filters' }, 502);
    return json(tool.input);
  },
};
