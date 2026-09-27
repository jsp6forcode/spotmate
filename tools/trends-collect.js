// 평소 대비 증가율용 Google Trends 주간·일간 데이터 수집 (자주 돌릴수록 최신, 브라우저에서 직접 실행)
//
// Google Trends는 공식 API가 없고 서버(GitHub Actions)에서 부르면 막혀서, 사람이 쓰는 브라우저에서 돌려요.
// 사용법:
//   1. https://trends.google.com/trends/explore?geo=CA-BC&q=Stanley%20Park 를 열어요 (쿠키가 생기도록)
//   2. 개발자 도구(F12) → Console에 이 파일 내용을 통째로 붙여넣고 Enter
//   3. 진행 상황이 콘솔에 찍혀요. 요청을 천천히 보내서 1시간쯤 걸려요 (429가 나면 알아서 쉬었다 다시 해요)
//   4. 끝나면 trends-weekly.json이 다운로드돼요 → data/trends-weekly.json 으로 덮어쓰고 커밋
//
// 결과: series[스팟 id] = { q: 검색어, partial: 마지막 주가 진행 중인지, v: 최근 12개월 주간 값(0~100, 검색어마다 따로 스케일) }
//       daily[스팟 id]  = { d0: 첫날, partial: 마지막 날이 진행 중인지, v: 최근 3개월 일간 값 }
// 앱(index.html의 riseOf)이 "최근 완결된 3일 검색량 ÷ 12개월 주간 평균"으로 증가율을 계산해요.
// 주간·일간은 척도가 달라서, 겹치는 주들로 일간 값을 주간 척도로 바꿔요.
// 평소보다 많이 검색되는 곳(1.05× 이상)의 이유는 notes[스팟 id] = { why, rising, source }에 따로 적어요.
// rising은 Google Trends 최근 7일 "급상승 연관 검색어", why는 지금 유효한 이유(이미 지난 행사는 X)로 사람이 쓴 한두 문장이에요.
// 이 스크립트는 notes를 만들지 않으니, 새 파일로 덮어쓸 때 새로 써 주세요.
(async () => {
  const SPOTS_URL = 'https://jsp6forcode.github.io/spotmate/data/spots.json';
  // 이름만으로는 다른 것과 섞이는 스팟은 지역명 등을 붙여 검색해요 (예: Miku → 가수 하츠네 미쿠)
  const QUERY = {
    miku: 'Miku Vancouver', queenspark: "Queen's Park New Westminster", towncentre: 'Lafarge Lake',
    lionspark: 'Lions Park Port Coquitlam', centralpark: 'Central Park Burnaby', cates: 'Cates Park',
    edmondspark: 'Edmonds Park Burnaby', holland: 'Holland Park Surrey', shipyards: 'The Shipyards North Vancouver',
    kidsmarket: 'Kids Market Granville Island', leparfait: 'Le Parfait Richmond', dolceamore: 'Dolce Amore Gelato',
    littlepisces: 'Little Pisces Taiyaki', moodswing: 'Moodswing Coffee', archr: 'ARCHR Coffee', jjbakes: 'JJ Bakes',
    gratia: 'Gratia Bakery', toedam: 'Toedam', bigflat: 'Big Flat Pancake', burntorange: 'Burnt Orange Cafe',
    lasshilas: 'Las Shilas', phonatic: 'Phonatic', fourwinds: 'Four Winds Brewing', tapsurrey: 'Tap Restaurant Surrey',
    otreat: 'Otreat Brunch', tang: 'Tang Vietnamese Restaurant', barbravo: 'Bar Bravo Richmond'
  };
  const GEO = 'CA-BC', GAP_MS = 6000;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const strip = t => JSON.parse(t.slice(t.indexOf('\n') + 1));
  const iso = sec => new Date(sec * 1000).toISOString().slice(0, 10);
  async function timeline(term, time) {
    const req = { comparisonItem: [{ keyword: term, geo: GEO, time }], category: 0, property: '' };
    const ex = await fetch(`/trends/api/explore?hl=en-US&tz=420&req=${encodeURIComponent(JSON.stringify(req))}`);
    if (!ex.ok) throw new Error('explore ' + ex.status);
    const w = strip(await ex.text()).widgets.find(w => w.id === 'TIMESERIES');
    const ml = await fetch(`/trends/api/widgetdata/multiline?hl=en-US&tz=420&req=${encodeURIComponent(JSON.stringify(w.request))}&token=${w.token}`);
    if (!ml.ok) throw new Error('multiline ' + ml.status);
    const tl = strip(await ml.text()).default.timelineData;
    const last = tl[tl.length - 1];
    return { q: term, t0: tl.length ? +tl[0].time : 0, t: last ? +last.time : 0, partial: last ? !!last.isPartial : false, v: tl.map(x => x.value[0]) };
  }
  async function retry(fn, label) {
    for (let attempt = 0; attempt < 6; attempt++) {
      try { return await fn(); }
      catch (e) {
        if (/429/.test(e.message)) { console.warn(`429 — ${90 * (attempt + 1)}초 쉬었다 다시 해요`); await sleep(90000 * (attempt + 1)); }
        else { console.error(label, e.message); return null; }
      }
    }
    return null;
  }

  const spots = (await (await fetch(SPOTS_URL, { cache: 'no-cache' })).json()).spots;
  const series = {}, daily = {};
  for (const [i, s] of spots.entries()) {
    const q = QUERY[s.id] || s.name;
    const wk = await retry(() => timeline(q, 'today 12-m'), s.id);
    await sleep(GAP_MS);
    const dy = wk && await retry(() => timeline(q, 'today 3-m'), s.id);
    if (wk && dy) { series[s.id] = wk; daily[s.id] = dy; console.log(`${i + 1}/${spots.length} ${s.id} (${q})`); }
    await sleep(GAP_MS);
  }

  // 증가율 척도를 맞출 때 쓰는 마지막 완결 주의 끝 날짜 (마지막 주가 진행 중이면 그 전 주)
  const any = Object.values(series).find(x => x.t);
  const through = any ? iso(any.partial ? any.t - 86400 : any.t + 6 * 86400) : '';
  // "최근"으로 보는 완결된 3일 (마지막 날이 진행 중이면 그 전날까지)
  const anyDay = Object.values(daily).find(x => x.t);
  const lastDay = anyDay ? (anyDay.partial ? anyDay.t - 86400 : anyDay.t) : 0;
  const out = {
    updatedAt: new Date().toISOString().slice(0, 10),
    source: 'Google Trends, British Columbia, past 12 months, weekly. Each place is queried on its own, so values are only comparable within one place.',
    geo: GEO,
    through,
    recentFrom: lastDay ? iso(lastDay - 2 * 86400) : '',
    recentThrough: lastDay ? iso(lastDay) : '',
    series: Object.fromEntries(Object.entries(series).map(([id, x]) => [id, { q: x.q, partial: x.partial, v: x.v }])),
    daily: Object.fromEntries(Object.entries(daily).map(([id, x]) => [id, { d0: iso(x.t0), partial: x.partial, v: x.v }]))
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = 'trends-weekly.json';
  a.click();
  console.log(`끝: ${Object.keys(series).length}/${spots.length}곳`);
})();
