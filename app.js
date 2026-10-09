// ───────── 메타 데이터 ─────────
// basis: 'trend' = 검색량 순위, 'reviews' = 리뷰 기준으로 고른 추천 (순위 없음)
const CATS = {
  nature: { label: 'Nature & Views', icon: '🏔️', basis: 'trend',   dot: '#10b981' },
  city:   { label: 'City Sights',    icon: '🏙️', basis: 'trend',   dot: '#0ea5e9' },
  food:   { label: 'Food',           icon: '🍜', basis: 'reviews', dot: '#f59e0b', criteria: 'Places with a Google rating of 4.0+ and 300+ reviews across Metro Vancouver, from local favourites to popular chains.' },
  dessert: { label: 'Desserts & Cafés', icon: '🍰', basis: 'reviews', dot: '#ec4899', criteria: 'Bakeries, patisseries, ice cream and gelato shops, and cafés with a Google rating of 4.5+ and 300+ reviews, spread across Metro Vancouver (no chains).' }
};
// 목록 페이지: Explore(view 'list') = 장소, Eats(view 'eats') = 음식점·카페
// EATS_ON: 사이트를 아이 동반 부모용으로 맞추면서 Eats는 잠시 숨겨 둬요 (데이터와 코드는 그대로, true로 바꾸면 돌아와요)
const EATS_ON = false;
// KIDS_ONLY: Explore와 지도는 아이랑 가기 좋은 곳(isKid)만 보여줘요 (그래서 Kids 버튼은 없어요)
const KIDS_ONLY = true;
// WIZARD: Explore를 5단계 질문(나이·언제·예산·시간·목적)으로 골라 10곳을 추천하는 방식으로 (false면 예전 검색·필터 목록)
const WIZARD = true;
const WIZ = [
  { key: 'age', q: 'How old are the kids?', opts: [['baby', 'Babies & toddlers', 'Ages 0–3'], ['pre', 'Preschoolers', 'Ages 3–5'], ['school', 'School age', 'Ages 5–12'], ['mixed', 'Mixed ages', 'Kids of different ages']] },
  { key: 'when', q: 'When are you going?', opts: [['now', 'Right now', 'Places open at this moment'], ['tomorrow', 'Tomorrow', 'Places open tomorrow'], ['weekend', 'This weekend', 'Open Saturday or Sunday, weekend events first'], ['any', 'Any time', 'Every place, whenever you go']] },
];
// 장소 종류 → 태그 이름·목적(kid 아이 중심 / family 가족 나들이 / both)·맞는 나이(b 0–3, p 3–5, s 5–12). 이름과 설명 첫머리로 판단해요 (위에서부터 먼저 맞는 것)
const KINDS = [
  ['water', 'Spray park', /spray park$|^spray|splash|wading|water ?park|water play/i, 'kid', 'bps'],
  ['play', 'Playground', /(?<!indoor )playground|tot lot|adventure play/i, 'kid', 'bps'],
  ['rides', 'Rides & amusements', /(?<!rainbow )\bplayland\b|amusement park|fun ?park|miniature railway|burnaby central railway/i, 'kid', 'ps'],
  ['indoorplay', 'Indoor play', /indoor play(ground)?|play (centre|center|caf)|jungle|kidtropolis|play ?zone|fun ?land|bounce|fun centre/i, 'kid', 'bps'],
  ['gym', 'Kids gym', /gymnastics|parkour|kids gym|ninja|tumble|\bg force gym|my gym|movement centre/i, 'kid', 'ps'],
  ['trampoline', 'Trampoline park', /trampoline|extreme air/i, 'kid', 'ps'],
  ['active', 'Active play', /climb|boulder|parkour|gymnastics|ninja|kids gym|\bair park/i, 'kid', 'ps'],
  ['games', 'Games', /laser|escape|\bvr\b|go-kart|kart track|bowling/i, 'kid', 's'],
  ['minigolf', 'Mini golf', /mini ?golf|mini putt/i, 'kid', 'ps'],
  ['arcade', 'Arcade & mini golf', /arcade|claw|mini golf|mini putt/i, 'kid', 'ps'],
  ['golf', 'Golf', /golf (cent(re|er)|course|club)|(?<!mini)golf$/i, 'both', 'ps'],
  ['wheels', 'Bike & skate', /bike park|bike (skills|terrain)|bmx|pump ?track|skate ?park/i, 'kid', 's'],
  ['arts', 'Arts & crafts', /pottery|art studio|arts centre|(?<!& )cultural cent|craft|paint/i, 'kid', 'ps'],
  ['shop', 'Kids shop', /\btoys?\b|baby nook|book ?(store|shop)|kinder books/i, 'family', 'bps'],
  ['library', 'Library', /librar(y|ies)/i, 'both', 'bps'],
  ['pool', 'Pool', /pool|aquatic|swim/i, 'both', 'bps'],
  ['rec', 'Rec centre', /recreation|sports complex|community cent|leisure|ymca|family place|sportsplex/i, 'both', 'bps'],
  // 센터 이름에 쇼핑몰 단어(Town Centre, Oakridge)가 들어간 곳이 쇼핑몰 사진이 되지 않게, 쇼핑몰은 센터 다음에 판단해요
  ['mall', 'Shopping', /\bikea\b|kids market|\bmall\b|park royal|metropolis|coquitlam centre|richmond centre|town centre|tsawwassen mills|oakridge|lansdowne|shopping/i, 'family', 'bps'],
  ['museum', 'Museum', /olympic experience/i, 'family', 'ps'],
  ['rink', 'Ice rink', /ice rink|skating|arena|\bice\b|oval|canlan/i, 'both', 'ps'],
  // 단어 경계로 ("Branch"의 ranch, "Libraries"가 농장이 되지 않게). 농장은 아이 중심 활동에도 맞아요
  // 연어 부화장·새와 야생동물 보호구역·호박밭은 농장 사진 대신 그 장소에 맞는 사진을 써요 (사용자 요청, 2026-10-03)
  ['salmon', 'Salmon hatchery', /hatchery/i, 'both', 'bps'],
  ['birds', 'Wildlife & birds', /raptor|heron|\bbirds?\b|wildlife|sanctuary|\bfen\b|slough|polder|marshes/i, 'both', 'bps'],
  ['pumpkin', 'Pumpkin patch', /pumpkin/i, 'both', 'bps'],
  ['berry', 'Berry farm', /berry farms?|u-pick berry/i, 'both', 'bps'],
  ['aquarium', 'Aquarium', /aquarium/i, 'family', 'bps'],
  // 이름에 Zoo가 들어가도 홀로그램 쇼는 동물 농장이 아니에요 (Hologram Zoo Vancouver). 생물다양성 보호공원(Godwin Farm)은 농장이 아니라 산책로예요
  ['hologram', 'Hologram show', /hologram/i, 'family', 'ps'],
  ['trail', 'Trail', /biodiversity preserve/i, 'family', 'ps'],
  ['farm', 'Farm & animals', /\bfarms?\b|\bzoo\b|petting|animal/i, 'both', 'bps'],
  ['museum', 'Museum', /museum|gallery|science|planetarium|space cent|historic site|heritage village/i, 'family', 'ps'],
  ['beach', 'Beach & lake', /beach|\blake\b/i, 'family', 'bps'],
  ['garden', 'Garden', /garden|conservatory|arboretum/i, 'family', 'bps'],
  ['trail', 'Trail', /trail|hike|canyon|falls|lookout|mountain|forest|pathway/i, 'family', 'ps'],
  ['park', 'Park', /park/i, 'both', 'bps'],
];
// "Stroller OK": 확인된 정보(spot-facts)가 우선이고, 없으면 몰·놀이공원·박물관·수족관·렉센터·수영장·링크·도서관·실내 놀이터처럼 큰 건물은 유모차가 되는 곳으로 봐요 (사용자 요청, 2026-10-04). 확인된 'no'·'partial'은 그대로 둬요
const BIG_KINDS = new Set(['mall', 'rides', 'museum', 'aquarium', 'rec', 'pool', 'rink', 'library', 'indoorplay']);
const strollerRule = (s, kind) => BIG_KINDS.has(kind) && (s.env !== 'outdoor' || kind === 'rides');
function strollerInfo(s) {
  const st = ((fx(s.id) || {}).amenities || {}).stroller;
  if (st === 'yes') return 'yes';
  if (st === 'no' || st === 'partial') return null;
  return strollerRule(s, kidProfile(s).kind) ? 'big' : null;
}
// 실제 사진이 없는 장소의 대표 이미지: 장소 종류(KINDS 키) → [Pexels 사진 번호, 촬영자]. 사람 얼굴이 나오지 않는 사진만 골랐어요. Pexels 라이선스는 무료 사용이고, 카드에 "그 장소가 아닐 수 있다"고 표시해요
const STOCK_ON = true, stockPick = {}, stockUse = {};
const STOCK = {
  trampoline: [[6571947, 'Tima Miroshnichenko'], [1739321, 'Jesus Perges']],
  aquarium: [[13561441, 'GURYAN'], [8585895, 'Leo Tavares'], [12616864, 'Daka'], [10431750, 'Lu Zhao']],
  berry: [[37827669, 'Elissa Cahill'], [39321183, 'Petra Reid'], [35193370, 'Dursen'], [32494098, 'Muvaffak Karademir']],
  gym: [[6571948, 'Tima Miroshnichenko'], [6571923, 'Tima Miroshnichenko'], [4164525, 'Ivan S'], [4164508, 'Ivan S']],
  minigolf: [[9341535, 'Volker Thimm'], [6370119, 'Anna Tarazevich'], [5792836, 'Laker'], [37129020, 'Rahul Bhagat'], [39980602, 'Boost Media-Marketing'], [9341536, 'Volker Thimm']],
  golf: [[6573252, 'Kindel Media'], [33591646, 'Chimango Hara'], [33275794, 'BAE JUN'], [5384079, 'Lucie Liz'], [32988401, 'Ryan Lansdown']],
  salmon: [[12801543, 'Timon Cornelissen'], [19768980, 'Line Knipst'], [34079754, 'Héctor Berganza'], [29348598, 'Ken Cheatham'], [34145851, 'Beth Fitzpatrick']],
  birds: [[8333150, 'Mark Stebnicki'], [33221105, 'Chris F'], [31964215, 'Mohan Nannapaneni'], [17920941, '@coldbeer'], [35920761, 'Veronika Andrews'], [13681325, 'Mehmet Turgut Kirkgoz'], [17069818, 'Mehmet Turgut Kirkgoz']],
  pumpkin: [[30378129, 'drB drB'], [17511884, 'Boys In Bristol SmokZ'], [34369749, 'Niki Clark'], [39345606, 'Natalia Sevruk'], [13953661, 'Ali Kazal'], [10084233, 'Chris F'], [11024445, 'Graham Hayward'], [5538417, 'Vlada Karpovich']],
  shop: [[8364055, 'RDNE Stock project'], [34708269, 'Caleb Oquendo'], [32213100, 'Sóc Năng Động'], [36873353, 'Nguyễn Tiến Thịnh']],
  water: [[36467177, 'Kristopher Hines'], [33688143, 'Ian Panelo'], [19161771, 'Sukoon Hotels and Resorts'], [39135419, 'WorldOfMtc'], [33326733, 'Quang Nguyen Vinh'], [36467179, 'Kristopher Hines'], [32938601, 'K'], [37880606, 'Jude Mitchell-Hedges'], [27275323, 'Jonathan Cooper'], [38202686, 'Jude Mitchell-Hedges']],
  play: [[133458, 'inspiredimages'], [17274506, 'Joaquin Carfagna'], [12586010, 'Tracy Elford'], [35206773, 'Leandro Henrique'], [28939519, 'dinaziz2462'], [13190802, 'alfomedeiros'], [15150716, 'Jyjyjyjy'], [35015567, 'Garrison Gao'], [32556904, 'Ayşegül Aytören'], [27328526, 'Shovan Datta'], [15834446, 'Enes Sözen'], [38437142, 'Haibo Ni'], [29099749, 'Henry Acevedo'], [7401101, '张子铭'], [12364207, 'Jonathan Cooper']],
  rides: [[17467601, 'alimuart'], [12794397, 'baphi'], [17665574, 'ninobur'], [31693189, 'Pexels contributor'], [18403853, 'miami302'], [18403915, 'miami302'], [15445262, 'tugba-ozsoy']],
  indoorplay: [[19734995, 'DaddySky'], [14286943, 'Asia Culture Center'], [29752372, 'kall'], [11295737, 'Vidal Balielo Jr'], [8088099, 'Artem Podrez'], [8923987, 'Mikhail Nilov']],
  active: [[6677376, 'cottonbro'], [6676172, 'cottonbro'], [7590891, 'Pavel Danilyuk'], [6674132, 'cottonbro'], [6674135, 'cottonbro']],
  games: [[19191084, 'Boys in Bristol Smokz'], [5952949, 'Shvetsa'], [5952998, 'Shvetsa'], [36609679, 'Thangnguyen'], [7429604, 'Pavel Danilyuk'], [7429597, 'Pavel Danilyuk'], [7429395, 'Pavel Danilyuk']],
  arcade: [[5767373, 'cottonbro'], [18403883, 'miami302'], [35693239, 'daniel-gomez'], [18403861, 'miami302']],
  wheels: [[5388528, 'Pexels contributor'], [5388525, 'Pexels contributor'], [7231153, 'GraphicsDump'], [7446400, 'Kelly'], [13292221, 'alfomedeiros']],
  arts: [[38807889, 'Sokil'], [7257019, 'Anete Lusina'], [17324369, 'Alina Skazka'], [5076768, 'Ann Tarazevich'], [6925029, 'Pavel Danilyuk'], [6358831, 'Ann Tarazevich'], [9032443, 'Kevin Malik']],
  mall: [[39962496, 'Jerry Zhang'], [19287629, 'Seher Dogan'], [19332579, 'Mecit Yssf'], [13425897, 'Mxkrv'], [13100935, 'Tkirkgoz'], [37661503, 'Michael D. Beckwith']],
  library: [[37165246, 'Melike'], [5225982, 'Ibnulharezmi'], [30744505, 'Nerosable'], [37888976, 'Beyzz'], [30752162, 'Mographe'], [8045884, 'Introspectivedsgn'], [11222031, 'Bilakis'], [9572664, 'Tima Miroshnichenko']],
  pool: [[39200992, 'Pexels contributor'], [8028423, 'Shvets Production'], [8028466, 'Shvets Production'], [32569769, 'Maarten van Asten'], [19073612, 'Jan van der Wolf'], [9030294, 'KindelMedia'], [8688149, 'KindelMedia'], [6110597, 'Jonathan Borba'], [8028662, 'Shvets Production']],
  rec: [[7186312, 'Cottonbro'], [9787275, 'Victor Parra'], [7513413, 'Bence Szemerey'], [9138716, 'Introspectivedsgn'], [9739462, 'Kindelmedia'], [9500159, 'Introspectivedsgn'], [2815155, 'Kelly']],
  rink: [[6539485, 'Pavel Danilyuk'], [6539486, 'Pavel Danilyuk'], [6539488, 'Pavel Danilyuk'], [6539268, 'Pavel Danilyuk'], [6539276, 'Pavel Danilyuk']],
  farm: [[39568354, 'Aysegul Aytoren'], [1113652, 'themomentier'], [37692161, 'lucasdc'], [31622292, 'Ehaan Dewa'], [15875215, 'NC Farm Bureau Mark'], [39472244, 'Olena Lola'], [14014802, 'Cristian Frohlich'], [17909253, 'Veronika Bykovich'], [5538417, 'Vlada Karpovich'], [11024445, 'Graham Hayward'], [10084233, 'Chris F'], [18211888, 'BabijaPhoto'], [34282667, 'jillyjillystudio'], [28833536, 'juan-c-palacios'], [28387809, 'NC Farm Bureau Mark']],
  museum: [[33990550, 'theshuttervision'], [35870231, 'ekrulila'], [39241845, 'railgunbreaker'], [34909191, 'nguyendesigner'], [19689322, 'israyosoy'], [4595778, 'taha-balta'], [16287997, 'radubradu']],
  beach: [[28494568, 'Kelly'], [28450039, 'Ryan Latimer'], [28450037, 'Ryan Latimer'], [35014304, 'Katherine Elliott'], [39295494, 'Bruno Storchi Bergmann'], [35014321, 'Katherine Elliott'], [9172867, 'Jeffrey Eisen']],
  garden: [[29014982, 'Alex Ohan'], [6639890, 'Gu Bra'], [38390268, 'Wilough'], [33456232, 'Stepkoanna'], [33216181, 'Barna Morvai'], [13275568, 'Melis'], [27898383, 'Ieva Brinkmane'], [5984652, 'Milivigerova']],
  trail: [[38826747, 'Gaurav Aeri'], [33311332, 'Niki Clark'], [33311337, 'Niki Clark'], [9280846, 'Chudin Alexey'], [31985745, 'Niki Clark'], [31985746, 'Niki Clark'], [38426513, 'Ann H'], [94828, 'asPhotography'], [39482893, 'Bara Art'], [14500829, 'Rafal Olbromski']],
  park: [[13514461, 'the-ahnafpiash'], [19175811, 'mibernaa'], [34929939, 'ali-2289586'], [18425557, 'leeandra-cantrell'], [18221583, 'aysenaz-bilgin'], [17177610, 'Vadutskevich'], [29335669, 'AJ4XO'], [34880803, 'Strannik SK'], [39903501, 'david-saurik']],
  sight: [[28494568, 'Kelly'], [27667695, 'Nanda Gopal Lakshman'], [163915, 'bkrustev'], [39859805, 'Necip Duman'], [15499497, 'Cecile Hournau'], [28636808, 'Mladen Janic'], [27630474, 'Fatihmutaf'], [163912, 'bkrustev']],
};

const AGE_LABEL = { b: '0–3', p: '3–5', s: '5–12' };
// 스팟의 종류·태그·목적·나이 (한 번 계산해서 s._kp에 둬요)
function kidProfile(s) {
  if (s._kp) return s._kp;
  const head = s.summary.split(' with ')[0], text = `${s.name} ${head}`;
  // 이름으로 먼저, 안 되면 설명 첫머리로 (설명의 "next to a salmon hatchery" 때문에 공원이 농장이 되지 않게)
  const k = KINDS.find(x => x[2].test(s.name)) || KINDS.find(x => x[2].test(head)) || ['sight', s.cat === 'nature' ? 'Nature' : 'Attraction', null, 'family', 'ps'];
  let ages = k[4].split(''), agesText = null;
  // 설명에 나이가 적혀 있으면 종류 기본값 대신 그걸 따라요 ("for ages 0-6", "ages 4 and up")
  const am = /\bages? (\d+)\s*[-–]\s*(\d+)/i.exec(s.summary), au = /\bages? (\d+) and up/i.exec(s.summary);
  if (am || au) {
    const lo = +(am || au)[1], hi = am ? +am[2] : 12, fit = ['b', 'p', 's'].filter(a => a === 'b' ? lo <= 2 : a === 'p' ? lo <= 5 && hi >= 3 : hi >= 5);
    if (fit.length) { ages = fit; agesText = au && !am ? `Ages ${lo}+` : `Ages ${lo}–${hi}`; }
  }
  const tags = [/^free/i.test(s.price || '') ? 'Free' : s.price ? 'Paid' : null, s.env === 'indoor' ? 'Indoor' : s.env === 'outdoor' ? 'Outdoor' : 'Indoor & outdoor', k[1]];
  // 설명에 나온 시설도 태그로 (공원의 놀이터·물놀이)
  if (/a playground/.test(s.summary) && k[0] !== 'play') tags.push('Playground');
  if (/a spray park/.test(s.summary) && k[0] !== 'water') tags.push('Spray park');
  if (/washrooms/.test(s.summary)) tags.push('Washrooms');
  { const fa = fx(s.id) && fx(s.id).amenities; if (fa) { if (fa.changing === true) tags.push('Changing table'); } }
  { const st = ((fx(s.id) || {}).amenities || {}).stroller; if (st === 'yes' || (st !== 'no' && st !== 'partial' && strollerRule(s, k[0]))) tags.push('Stroller OK'); }
  // 공원에 놀이터가 있으면 아이 중심 활동에도 맞아요
  const purpose = k[0] === 'park' ? (/a playground|a spray park/.test(s.summary) || s.play ? 'both' : 'family') : k[3];
  const mins = (() => { const m = /(\d+)(?:–(\d+))? hrs?/.exec(s.time || ''); return /half day|full day/i.test(s.time || '') ? [3, 5] : m ? [+m[1], +(m[2] || m[1])] : [1, 2]; })();
  return (s._kp = { kind: k[0], label: k[1], purpose, ages, agesText: agesText || (ages.length === 3 ? 'Ages 0–12' : `Ages ${AGE_LABEL[ages[0]].split('–')[0]}–${AGE_LABEL[ages[ages.length - 1]].split('–')[1]}`), tags: tags.filter(Boolean), hours: mins });
}
const PAGES = { list: ['nature', 'city'], eats: ['food', 'dessert'], ...(EATS_ON ? {} : { map: ['nature', 'city'] }) };
// 페이지별 카테고리 드롭다운 항목 ('all' 제외). 행사는 Explore와 지도에서만
const catOptions = view => PAGES[view] ? [...PAGES[view], ...(view !== 'eats' ? ['events'] : [])] : [...Object.keys(CATS), 'events'];
// Eats에는 All이 없어요 (Food가 기본). 다른 페이지는 All부터
const hasAll = view => view !== 'eats';
const defaultCat = view => hasAll(view) ? 'all' : PAGES[view][0];
// "Vancouver classic": 이미 많은 사람이 알고 좋아하는 곳. 데이터의 gem(평점 4.6+·리뷰 500+)과 검색량 상위(isClassic)를 합쳤어요
const CLASSIC = { label: 'Vancouver classic', criteria: 'A local favourite that plenty of people already know and love: rated 4.6+ on Google from 500+ reviews, or one of the most searched places in BC.' };
// 🧸 Kids 필터: 아이 동반 장소(family: true, 놀이터·수영장·몰·농장 등)와 아이랑 가기 좋은 곳(kids: true)만 남겨요
const KIDS_TAG = "Playgrounds, spray parks and pools built for kids, plus places Google marks as good for children or where Google reviews (4.0+ rating, 50+ reviews) say it's great for families.";
const isVanClassic = s => !!s.gem || isClassic(s);
// 모달의 "왜 골랐나" 정보: 히든젬 > 리뷰 기준(음식점·디저트) > 아이 동반. 해당 없으면 null
const REVIEW_MIN = { food: 'Google 4.0+ · 300+ reviews', dessert: 'Google 4.5+ · 300+ reviews' };
// 새로 연 곳: opened('YYYY-MM') 달부터 6개월 동안(그 달 포함 7번째 달 전까지). 평점 4.9+·리뷰 30+ 는 매달 tools/refresh-reviews.ps1 이 확인해요
const JUST_OPENED = { label: 'New Rising Spot', short: 'Google 4.9+ · 30+ reviews', criteria: 'Opened in the last 6 months and already rated 4.9+ on Google from 30+ reviews, so it is new and people love it. Checked every month.' };
const openedDate = s => s.opened ? new Date(s.opened + '-01T12:00:00Z') : null;
const isJustOpened = s => { const d = openedDate(s); if (!d) return false; const end = new Date(d); end.setUTCMonth(end.getUTCMonth() + 7); return Date.now() < end.getTime(); };
const openedLabel = s => `${MON[+s.opened.slice(5, 7) - 1]} ${s.opened.slice(0, 4)}`;
function pickOf(s) {
  const c = CATS[s.cat];
  if (isJustOpened(s)) return { label: JUST_OPENED.label, short: JUST_OPENED.short, heading: `New rising spot · opened ${openedLabel(s)}`, criteria: JUST_OPENED.criteria, source: s.openedSource };
  if (s.gem) return { label: CLASSIC.label, short: 'Google 4.6+ · 500+ reviews', heading: "Why it's a Vancouver classic", criteria: CLASSIC.criteria };
  if (isClassic(s)) return { label: CLASSIC.label, short: 'Among the most searched', heading: "Why it's a Vancouver classic", criteria: CLASSIC.criteria };
  if (c.basis === 'reviews') return { label: 'Review pick', short: REVIEW_MIN[s.cat] || 'Google reviews', heading: "Why it's a review pick", criteria: c.criteria };
  if (s.family) return { label: 'Kid-friendly', short: 'Google 4.0+ · 50+ reviews', heading: "Why it's kid-friendly", criteria: KIDS_TAG };
  if (s.kids) return { label: 'Kid-friendly', short: 'Good for children', heading: "Why it's kid-friendly", criteria: KIDS_TAG };
  if (s.play) return { label: 'Kid-friendly', short: 'A place built for kids', heading: "Why it's kid-friendly", criteria: KIDS_TAG };
  return null;
}
// play: 놀이터·물놀이장·어린이 수영장처럼 아이를 위해 만든 시설 (리뷰가 적어도 아이랑 갈 곳이에요)
// notKid: 리뷰에 아이 관련 단어가 3번 미만이고 예외(공식 아이 정보 등)도 없는 곳 (tools/kid-words.ps1)
const isKid = s => !s.notKid && (!!s.kids || !!s.family || !!s.play);
// 먹거리 "지금 먹기 좋은 곳": 비·추운 날엔 국물 요리, 맑고 따뜻한 날엔 아이스크림·파티오 (이름·설명으로 판단)
const HOT_FOOD = /ramen|\bpho\b|phở|hot ?pot|noodle|udon|laksa|jjigae|tonkotsu|bun bo|congee|soup|dumpling|\bmomos?\b/i;
const BREAKFAST_FOOD = /breakfast|brunch|pancake|waffle|bakery|bagel|croissant|diner|eggs|benny|café|cafe\b|coffee/i;
const SUNNY_FOOD = /patio|rooftop|beach|waterfront|terrace|ice cream|gelato|froyo|frozen yogurt|shaved ice|bingsu|soft serve/i;
// ── 검색창 (1단계: 규칙으로 질문 해석) ──
// 질문 속 단어 → 키워드(장소 이름·설명·메뉴에서 찾을 말). [키, 보여줄 이름, 질문에서 찾을 패턴, 장소에서 찾을 패턴, 먹거리면 'food'/'dessert']
const SEARCH_KW = [
  ['ramen', 'Ramen', /ramen/i, /ramen|tonkotsu|mazesoba/i, 'food'],
  ['pho', 'Pho', /\bpho\b|phở|vietnamese/i, /\bpho\b|phở|vietnamese/i, 'food'],
  ['sushi', 'Sushi', /sushi|sashimi|omakase/i, /sushi|sashimi|omakase|nigiri|aburi/i, 'food'],
  ['hotpot', 'Hot pot', /hot ?pot/i, /hot ?pot/i, 'food'],
  ['korean', 'Korean', /korean/i, /korean|bulgogi|galbi|bibimbap|tteok|kbbq/i, 'food'],
  ['japanese', 'Japanese', /japanese|izakaya|katsu/i, /japanese|izakaya|katsu|teriyaki|udon/i, 'food'],
  ['chinese', 'Chinese', /chinese|dim ?sum|dumpling|xiao ?long/i, /chinese|dim sum|dumpling|szechuan|sichuan|shanghai|peking|momo/i, 'food'],
  ['indian', 'Indian', /indian|curry|thali|butter chicken/i, /indian|curry|thali|dosa|tandoori|biryani|nepali/i, 'food'],
  ['thai', 'Thai', /thai/i, /thai/i, 'food'],
  ['italian', 'Italian', /italian|pasta|pizza/i, /italian|pasta|pizza|trattoria|osteria/i, 'food'],
  ['burger', 'Burgers', /burger/i, /burger/i, 'food'],
  ['steak', 'Steak', /steak/i, /steak/i, 'food'],
  ['seafood', 'Seafood', /seafood|oyster|fish/i, /seafood|oyster|fish|crab|salmon/i, 'food'],
  ['mexican', 'Mexican', /mexican|taco|burrito/i, /mexican|taco|burrito/i, 'food'],
  ['persian', 'Persian', /persian|kebab|kabob|middle eastern/i, /persian|kebab|kabob|middle eastern|afghan/i, 'food'],
  ['brunch', 'Brunch', /brunch|breakfast|pancake/i, /brunch|breakfast|pancake|benny|eggs/i, 'food'],
  ['pub', 'Pubs', /\bpub|brewery|beer/i, /pub|brew|tap|beer/i, 'food'],
  ['coffee', 'Coffee', /coffee|cafe|café|latte|matcha/i, /coffee|caf[eé]|latte|matcha|roast/i, 'dessert'],
  ['icecream', 'Ice cream', /ice ?cream|gelato|soft serve/i, /ice cream|gelato|soft serve|froyo|yogurt/i, 'dessert'],
  ['bakery', 'Bakery', /bakery|bread|pastry|croissant/i, /bakery|bread|pastry|croissant|patisserie|bake/i, 'dessert'],
  ['dessert', 'Desserts', /dessert|sweet|cake/i, /dessert|cake|sweet|patisserie|chocolate/i, 'dessert'],
  ['playground', 'Playgrounds', /playground|slide/i, /playground|play tower|tot/i],
  ['water', 'Water play', /spray|splash|water ?park|water play|swim|pool/i, /spray|splash|water|pool|swim|beach/i],
  ['bike', 'Biking', /bike|bicycle|cycling|pump ?track|bmx/i, /bike|pump track|bmx|cycling/i],
  ['hike', 'Hikes & trails', /hike|hiking|trail/i, /hike|trail|walk|forest|mountain|canyon|lookout/i],
  ['beach', 'Beaches', /beach|ocean|seawall/i, /beach|seawall|ocean|bay\b|waterfront/i],
  ['museum', 'Museums & galleries', /museum|gallery|\bart\b/i, /museum|gallery|art\b|exhibit/i],
  ['farm', 'Farms & animals', /farm|animal|petting/i, /farm|animal|goat|pony/i],
  ['garden', 'Gardens', /garden|flower/i, /garden|botanical|flower/i],
  ['indoorplay', 'Indoor play', /trampoline|climb|indoor play|play ?(centre|center|cafe)/i, /trampoline|climb|play cent|play caf|indoor play/i],
  ['pumpkin', 'Pumpkin patches', /pumpkin|halloween/i, /pumpkin|halloween/i],
  ['views', 'Views', /\bviews?\b|sunset|lookout/i, /view|lookout|sunset|gondola|summit/i],
];
// 질문 속 조건 → 기존 필터
const SEARCH_INTENT = {
  near: /\bnear|nearby|close ?by|around (me|here)|walking/i,
  now: /\bnow\b|right now|open\b|tonight/i,
  kids: /\bkid|child|children|family|families|toddler|baby/i,
  free: /\bfree\b|no cost/i,
  indoor: /indoor|rain|rainy/i,
  cheap: /cheap|budget|inexpensive|affordable/i,
  fancy: /fancy|upscale|fine dining|special occasion|date night/i,
  hh: /happy ?hour|drinks?\b|after work/i,
  lunch: /lunch/i,
  eat: /\beat|food|restaurant|dinner|hungry/i,
  explore: /activit|things to do|place to go|outing/i,
  // 날짜 계획 (주말·내일)
  weekend: /\bweekend\b/i, sat: /\bsaturday\b/i, sun: /\bsunday\b/i, tomorrow: /\btomorrow\b/i, today: /\btoday\b/i,
};
// ── 검색창 2단계: AI (worker/ai-search.js, Claude Haiku 4.5) ──
// ── 부모 리뷰 (Firebase: 구글 로그인 + Firestore) ──
// Firebase 콘솔 > 프로젝트 설정 > 웹 앱의 firebaseConfig를 넣으면 리뷰가 켜져요 (이 값은 공개돼도 괜찮아요. 보안은 firestore.rules가 지켜요)
// 비어 있으면(null) 리뷰 칸을 아예 보여주지 않아요
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDshlxNn9eFahogBeLGrxvtMwy_ck72Xuc',
  authDomain: 'spotmate-ed31a.firebaseapp.com',
  projectId: 'spotmate-ed31a',
  storageBucket: 'spotmate-ed31a.firebasestorage.app',
  messagingSenderId: '530281390361',
  appId: '1:530281390361:web:35da5ea31ff5143ec76588',
};
const FB_VER = '10.12.2';
const REVIEW_MAX = 600;
// Cloudflare Worker 주소. 비어 있으면 AI 없이 위 규칙으로만 해석해요. API 키는 Worker에만 있어요
const AI_SEARCH_URL = '';
// Worker가 돌려준 필터 → parseQuery와 같은 모양. 실패하거나 8초가 지나면 null (규칙 검색으로 대신해요)
async function aiParseQuery(q) {
  const now = new Date().toLocaleString('en-US', { timeZone: TZ, weekday: 'long', hour: 'numeric', minute: '2-digit' });
  let res;
  try { res = await fetch(AI_SEARCH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, now }), signal: AbortSignal.timeout(8000) }); }
  catch (e) { return null; }
  if (!res.ok) return null;
  const r = await res.json().catch(() => null);
  if (!r || !r.page) return null;
  const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const kw = [
    ...(r.keys || []).map(k => SEARCH_KW.find(x => x[0] === k)).filter(Boolean).map(k => ({ key: k[0], label: k[1], re: k[3], cat: k[4] || '' })),
    ...(r.words || []).filter(w => /^[a-z][a-z' -]{1,30}$/i.test(w)).map(w => ({ key: 'w:' + w.toLowerCase(), label: `“${w}”`, re: new RegExp(esc(w), 'i'), cat: '' })),
  ];
  return {
    kw, view: r.page === 'explore' ? 'list' : 'eats', cat: r.page === 'eats' ? 'food' : r.page === 'dessert' ? 'dessert' : 'all',
    near: !!r.near, now: !!r.now, kids: !!r.kids, free: !!r.free, indoor: !!r.indoor, price: r.price || '',
    hh: !!r.happy_hour, lunch: !!r.lunch, place: ORIGINS[r.place] ? r.place : '', when: ['today', 'tomorrow', 'weekend', 'sat', 'sun'].includes(r.when) ? r.when : '', say: String(r.say || '').slice(0, 120),
  };
}
function parseQuery(q) {
  const p = { kw: SEARCH_KW.filter(k => k[2].test(q)).map(k => ({ key: k[0], label: k[1], re: k[3], cat: k[4] || '' })) };
  for (const [k, re] of Object.entries(SEARCH_INTENT)) p[k] = re.test(q);
  // "happy hour"의 drinks, "lunch"는 먹거리 페이지로
  const foodKw = p.kw.filter(k => k.cat === 'food'), sweetKw = p.kw.filter(k => k.cat === 'dessert');
  p.view = foodKw.length || p.hh || p.lunch || p.cheap || p.fancy || (p.eat && !p.kids && !p.explore) ? 'eats' : sweetKw.length ? 'eats' : 'list';
  p.cat = p.view === 'eats' ? (sweetKw.length && !foodKw.length && !p.hh && !p.lunch ? 'dessert' : 'food') : 'all';
  // 지역 이름: "in Coquitlam" → 위치 필터 (지역 이름은 키워드 찾기에서 빼요)
  const place = SEARCH_PLACES.find(([re]) => re.test(q));
  p.place = place ? place[1] : '';
  if (place) q = q.replace(place[0], ' ');
  // 페이지를 정할 단서가 있었는지 (없으면 지금 보던 페이지에 머물러요: Eats에서 "fondue"를 찾으면 Eats에서)
  p.viewSet = !!(p.kw.length || p.hh || p.lunch || p.cheap || p.fancy || p.eat || p.kids || p.explore || p.free || p.indoor);
  // 알아들은 게 없으면 영어 단어(3글자 이상)를 그대로 이름·설명에서 찾아요
  if (!p.kw.length && !Object.keys(SEARCH_INTENT).some(k => p[k])) {
    const words = (q.match(/[a-z][a-z'’-]{2,}/gi) || []).filter(w => !SEARCH_STOP.test(w));
    p.kw = words.map(w => ({ key: 'w:' + w.toLowerCase(), label: `“${w}”`, re: new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), cat: '' }));
    p.unused = [];
  } else {
    // 알아들은 말을 지우고 남은 단어 = 쓰지 않은 말 ("vegan tacos"의 vegan). 화면에 "Not used"로 알려줘요
    let rest = q;
    [...SEARCH_KW.map(k => k[2]), ...Object.values(SEARCH_INTENT)].forEach(re => { rest = rest.replace(new RegExp(re.source, 'gi'), ' '); });
    p.unused = [...new Set((rest.match(/[a-z][a-z'’-]{2,}/gi) || []).filter(w => !SEARCH_STOP.test(w)).map(w => w.toLowerCase()))];
  }
  return p;
}
// 검색에서 뜻이 없는 말 (키워드로 찾지도, "Not used"로 알리지도 않아요)
const SEARCH_STOP = /^(the|and|for|with|without|near|some|something|what|where|which|place|places|good|best|great|nice|cool|fun|want|wanna|find|show|me|recommend|this|that|these|thing|things|spot|spots|somewhere|looking|look|any|anything|can|could|would|should|will|get|try|like|around|area|day|days|time|let|lets|let's|need|please|who|how|are|you|your|our|there|here|from|out|into|all|also|just|really|very|more|most|next|kind|stuff|visit|going|has|have|not|but|its|it's|off|was|one|two|top|go|to|do|in|at|on|of|a|an|is|it|my|we|us|or|up|some|lot|lots|family's|friends?|date|with)$/i;
// 장소에서 키워드를 찾을 글: 이름·설명·음식 종류·인기 메뉴·할 거리
const searchText = s => { const g = GUIDES[s.id] || {}; return [s.name, s.summary, s.cuisine || '', ...(g.menu || []), ...(g.do || []), ...(s.tips || [])].join(' '); };
function hotDish(s) {
  const t = `${s.name} ${s.summary}`;
  if (/ramen|tonkotsu/i.test(t)) return 'a bowl of ramen';
  if (/\bpho\b|phở/i.test(t) || s.cuisine === 'Vietnamese') return 'a bowl of pho';
  if (/hot ?pot/i.test(t)) return 'hot pot';
  if (/dumpling|momo/i.test(t)) return 'hot dumplings';
  return 'something hot';
}
const hasTrend = s => Array.isArray(s.trend);
// 이번 달 검색량이 이 이상이면 누구나 아는 명소(Classic)로 보고, 배지를 달아요 (목록에선 다른 곳과 함께 보여줘요)
const CLASSIC_MIN = 40;
const isClassic = s => hasTrend(s) && s.trend[2] >= CLASSIC_MIN;
// 처음 본 지 이 기간이 안 된 스팟은 "New since your last visit"으로 표시해요
const NEW_DAYS = 14;
// ── 평소 대비 증가율 (data/trends-weekly.json) ──
// 평소 = 직전 4주(마지막 완결 4주) 주간 검색량 평균(series), 최근 = 마지막 RECENT_DAYS일의 일간 검색량 평균(daily).
// Trends는 요청마다 척도가 달라서, 주간·일간이 겹치는 주들로 비율(k)을 구해 일간 값을 주간 척도로 바꿔 비교해요.
// 장소마다 따로 조회한 값이라 장소끼리 척도는 달라도 비율은 비교할 수 있어요.
// 검색량이 너무 적으면(0인 주가 많으면) 비율이 튀어서 계산하지 않아요.
// 일간 값의 0은 "검색이 없었다"가 아니라 "양이 적어 비워 둔 날"이라, 0이 낀 주·날은 계산에서 빼요.
const RISE_MIN_WEEKS = 40;   // 12개월 중 검색량이 0이 아닌 주가 이만큼은 있어야 해요
const BASE_WEEKS = 4;        // "평소"로 보는 직전 주 수 (12개월 평균은 여름 성수기 때문에 가을·겨울엔 대부분 "평소보다 적음"이 돼요)
// 평소는 4주의 평균이 아니라 중앙값: 한 주만 튀어도(예: 27, 37, 6, 30) 배율이 크게 부풀지 않게
const RECENT_DAYS = 3;       // "최근"으로 보는 날 수 (완결된 날만)
const RISE_ICON = '📈';     // 검색 증가 이유의 아이콘 (카드에서 이유 상자와 검색량 줄이 겹치지 않게 비교해요)
const RISING_MIN = 1.05;     // 평소보다 5% 이상 많이 검색되면 "Rising"
const NOW_MIN = 1;           // "지금 가 볼 이유" 점수가 이 이상이면 순위를 매겨요 (매주 열리는 마켓 하나만으로는 안 돼요)
const DAY = 864e5, isoDay = t => new Date(t).toISOString().slice(0, 10), dayMs = iso => Date.parse(iso + 'T00:00:00Z');
function riseOf(sr, dy, weekThrough) {
  if (!sr || !Array.isArray(sr.v) || !dy || !Array.isArray(dy.v) || !weekThrough) return null;
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const w = sr.partial ? sr.v.slice(0, -1) : sr.v.slice();
  if (w.length < 26 || w.filter(x => x > 0).length < RISE_MIN_WEEKS) return null;
  const d = dy.partial ? dy.v.slice(0, -1) : dy.v.slice();
  const r = d.slice(-RECENT_DAYS);
  if (r.length < RECENT_DAYS || r.some(x => !(x > 0))) return null;
  const d0 = dayMs(dy.d0), wEnd = dayMs(weekThrough);
  // 일간 값이 7일 모두 0이 아닌 주들로 척도 비율 k = Σ주간값 ÷ Σ(그 주 일간 평균)
  let sw = 0, sd = 0, n = 0;
  for (let j = w.length - 1; j >= 0; j--) {
    const end = wEnd - (w.length - 1 - j) * 7 * DAY, a = Math.round((end - 6 * DAY - d0) / DAY), b = Math.round((end - d0) / DAY);
    if (a < 0) break;
    if (b >= d.length) continue;
    const wk = d.slice(a, b + 1);
    if (!(w[j] > 0) || wk.some(x => !(x > 0))) continue;
    sw += w[j]; sd += avg(wk); n++;
  }
  if (n < 1 || sd <= 0) return null;
  const b4 = w.slice(-BASE_WEEKS);
  if (b4.some(x => !(x > 0))) return null;
  const m = b4.slice().sort((x, y) => x - y), base = (m[1] + m[2]) / 2, recent = avg(r) * sw / sd;
  return base > 0 ? Math.round(recent / base * 100) / 100 : null;
}
// 평소보다 많이 검색되는 이유: trends-weekly.json의 notes[스팟 id] = { why, rising: [최근 7일 급상승 연관 검색어] }
let RISE_NOTES = {};
// TRENDS_ON: "평소보다 N배 검색" 표시와 그걸 이유로 한 순위. 아직 데이터가 적어서 꺼 둬요 (true로 바꾸면 돌아와요)
const TRENDS_ON = false;
const isRising = s => TRENDS_ON && s.rise != null && s.rise >= RISING_MIN;
// 5% 차이도 보이게, 2배 미만이면 소수점 둘째 자리까지
const fmtRise = r => `${r < 2 ? r.toFixed(2) : r.toFixed(1)}×`;
// 카드·모달용 문구: 평소와 거의 같으면(±5%) 배율 대신 "About its usual"
const riseText = (r, suffix) => Math.abs(r - 1) < 0.05 ? `About its usual ${suffix}` : `${fmtRise(r)} its usual ${suffix}`;
const TF = { today: { label: 'Today', i: 0 }, week: { label: 'This week', i: 1 }, month: { label: 'This month', i: 2 } };
const WEATHER = { sunny: { label: 'Sunny', icon: '☀️' }, cloudy: { label: 'Cloudy', icon: '☁️' }, rain: { label: 'Rain', icon: '🌧️' } };
const ENV = { indoor: 'Indoor', outdoor: 'Outdoor', both: 'Indoor + outdoor' };
const ENV_ICON = { indoor: '🏠', outdoor: '🌳', both: '🏠🌳' };
// 위치 기반 반경 필터 옵션 (km). 'any'는 거리 제한 없음
// 반경: 200 m는 직장인이 걸어서 가는 거리
const RADII = [0.2, 2, 5, 10, 25, 'any'];
const radiusLabel = r => r === 'any' ? 'Any' : r < 1 ? `${Math.round(r * 1000)} m` : `${r} km`;
// 거리: 1 km 미만은 m와 걸어서 몇 분 (직선거리 기준, 분당 80 m), 그 이상은 km
const fmtDist = d => d < 1 ? `${Math.max(10, Math.round(d * 100) * 10)} m · ~${Math.max(1, Math.round(d * 1000 / 80))} min walk` : `${d.toFixed(1)} km`;
// 가장 가까운 스팟이 이보다 멀면 메트로 밴쿠버 밖으로 보고 다운타운 기준으로 바꿔요
const OUT_OF_AREA_KM = 60;
const ORIGINS = {
  downtown:  { label: 'Downtown',        lat: 49.2827, lng: -123.1207 },
  northvan:  { label: 'North Vancouver', lat: 49.3200, lng: -123.0724 },
  burnaby:   { label: 'Burnaby',         lat: 49.2488, lng: -122.9805 },
  richmond:  { label: 'Richmond',        lat: 49.1666, lng: -123.1336 },
  newwest:   { label: 'New Westminster', lat: 49.2057, lng: -122.9110 },
  coquitlam: { label: 'Coquitlam',       lat: 49.2838, lng: -122.7932 },
  surrey:    { label: 'Surrey',          lat: 49.1913, lng: -122.8490 },
  delta:     { label: 'Delta',           lat: 49.0847, lng: -123.0587 },
  langley:   { label: 'Langley',         lat: 49.1044, lng: -122.6600 },
  mapleridge:{ label: 'Maple Ridge',     lat: 49.2194, lng: -122.5984 },
  abbotsford:{ label: 'Abbotsford',      lat: 49.0504, lng: -122.3045, r: 8 },
  chilliwack:{ label: 'Chilliwack',      lat: 49.1579, lng: -121.9514, r: 8 },
  // 검색 전용 (드롭다운에는 고른 경우에만 보여요). r = 검색으로 골랐을 때 반경(km)
  portcoquitlam: { label: 'Port Coquitlam', lat: 49.2625, lng: -122.7811, extra: true },
  portmoody:  { label: 'Port Moody',      lat: 49.2838, lng: -122.8317, extra: true },
  westvan:    { label: 'West Vancouver',  lat: 49.3286, lng: -123.1602, extra: true },
  whiterock:  { label: 'White Rock',      lat: 49.0253, lng: -122.8026, extra: true },
  southsurrey:{ label: 'South Surrey',    lat: 49.0470, lng: -122.7780, extra: true },
  pittmeadows:{ label: 'Pitt Meadows',    lat: 49.2210, lng: -122.6890, extra: true },
  tsawwassen: { label: 'Tsawwassen',      lat: 49.0170, lng: -123.0830, extra: true },
  steveston:  { label: 'Steveston',       lat: 49.1250, lng: -123.1830, extra: true, r: 2 },
  fortlangley:{ label: 'Fort Langley',    lat: 49.1680, lng: -122.5790, extra: true, r: 2 },
  kitsilano:  { label: 'Kitsilano',       lat: 49.2684, lng: -123.1683, extra: true, r: 2 },
  mountpleasant: { label: 'Mount Pleasant', lat: 49.2630, lng: -123.1007, extra: true, r: 2 },
  eastvan:    { label: 'East Vancouver',  lat: 49.2700, lng: -123.0695, extra: true, r: 5 },
  deepcove:   { label: 'Deep Cove',       lat: 49.3290, lng: -122.9500, extra: true, r: 2 },
  ubc:        { label: 'UBC',             lat: 49.2606, lng: -123.2460, extra: true, r: 2 }
};
// 검색어 속 지역 이름 → ORIGINS 키. 긴 이름(Port Coquitlam, North/West Vancouver, South Surrey)을 먼저 찾아요
const SEARCH_PLACES = [
  [/\bport ?coquitlam\b|\bpoco\b/i, 'portcoquitlam'], [/\bport ?moody\b/i, 'portmoody'],
  [/\bnorth ?van(couver)?\b|\bnorth shore\b|\blonsdale\b/i, 'northvan'], [/\bwest ?van(couver)?\b|\bambleside\b|\bdundarave\b/i, 'westvan'],
  [/\bsouth ?surrey\b/i, 'southsurrey'], [/\bwhite ?rock\b/i, 'whiterock'], [/\bpitt meadows\b/i, 'pittmeadows'],
  [/\btsawwassen\b/i, 'tsawwassen'], [/\bsteveston\b/i, 'steveston'], [/\bfort langley\b/i, 'fortlangley'],
  [/\bkits(ilano)?\b/i, 'kitsilano'], [/\bmount pleasant\b|\bmain st(reet)?\b/i, 'mountpleasant'], [/\beast van(couver)?\b|\bcommercial dr(ive)?\b/i, 'eastvan'],
  [/\bdeep cove\b/i, 'deepcove'], [/\bubc\b/i, 'ubc'],
  [/\bdowntown\b|\byaletown\b|\bgastown\b|\bwest end\b|\bcoal harbou?r\b/i, 'downtown'],
  [/\bcoquitlam\b/i, 'coquitlam'], [/\bburnaby\b/i, 'burnaby'], [/\brichmond\b/i, 'richmond'], [/\bnew west(minster)?\b/i, 'newwest'],
  [/\bsurrey\b/i, 'surrey'], [/\bdelta\b|\bladner\b/i, 'delta'], [/\blangley\b/i, 'langley'], [/\bmaple ridge\b/i, 'mapleridge'],
  [/\babbotsford\b|\bmatsqui\b/i, 'abbotsford'], [/\bchilliwack\b|\bsardis\b/i, 'chilliwack'],
];
// 검색으로 고른 지역의 반경: 도시는 5 km, 동네는 2 km (downtown 포함)
const placeRadius = k => ORIGINS[k].r || (k === 'downtown' ? 2 : 5);

// ───────── 스팟 데이터 ─────────
// data/spots.json에서 불러와요. trend: [오늘, 이번 주, 이번 달] 트렌드 지수
let SPOTS = [];
let DATA_META = { source: '', updatedAt: '', trendNote: '', coordsNote: '' };
let RISE_META = { updatedAt: '', through: '', recentFrom: '', recentThrough: '' };
// "Sep 23–25"처럼 최근 비교 기간을 짧게
const recentLabel = () => {
  const { recentFrom: a, recentThrough: b } = RISE_META;
  if (!a || !b) return 'the last few days';
  return `${shortDate(a)}–${a.slice(0, 7) === b.slice(0, 7) ? +b.slice(8, 10) : shortDate(b)}`;
};
// data/spot-guides.json: 스팟별 할 거리(do), 먹을 것(eat), 준비물(bring). 없는 스팟은 자동 준비물만 보여줘요
let GUIDES = {}, GUIDES_NOTE = '';
// ── 같은 내용이 한 화면(카드·장소 창)에 두 번 나오지 않게 ──
// 규칙: 위에 먼저 나오는 내용(Why go now의 행사·시즌, 장소 설명, 배지)이 우선이고, Tiny Trips tip의 각 줄은
// 핵심 단어(4글자 이상 영어 단어와 숫자, 흔한 말 제외)의 절반 이상이 이미 위에 나왔으면 숨겨요
const DUP_STOP = /^(with|from|that|this|they|their|there|have|your|open|daily|place|until|before|about|also|each|only|more|than|into|over|plus|just|when|what|here|some|kids|check|year|round)$/;
const keyWords = t => new Set((String(t).toLowerCase().match(/[a-z]{4,}|\d+/g) || []).filter(w => !DUP_STOP.test(w)));
const overlapsSeen = (t, seen) => { const w = [...keyWords(t)]; return w.length > 0 && w.filter(x => seen.has(x)).length / w.length >= 0.5; };
// data/spot-notes.json: Tiny Trips tip, 공식 페이지에서 확인한 아이 관련 사실 { id: { items: [...], source } } (리뷰가 아니에요)
// data/spot-facts.json: 입장료·예약·유모차/기저귀/수유·아이 먹거리 (확인한 것만. 모르면 비워 둬요)
let FACTS = {}, FACTS_META = { updatedAt: '' };
const fx = id => FACTS[id] || null;
const LINES3 = '[display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden';
// 장소 창의 세 상자(What parents say · Tiny Trips tip · Good to know)가 같은 모양이 되게: 제목은 굵게, 내용은 점(•) 목록, 맨 아래 작은 출처 줄. 배경색만 상자마다 달라요 (사용자 요청, 2026-10-04)
const BOX_TONE = {
  pink: { bg: 'bg-pink-50 dark:bg-pink-500/10 ring-1 ring-pink-200 dark:ring-pink-500/25', h: 'text-pink-900 dark:text-pink-200', dot: 'text-pink-600 dark:text-pink-300' },
  sky: { bg: 'bg-sky-50 dark:bg-sky-500/10 ring-1 ring-sky-200 dark:ring-sky-500/25', h: 'text-sky-900 dark:text-sky-200', dot: 'text-sky-600 dark:text-sky-300' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-800/50 ring-1 ring-slate-200 dark:ring-slate-700', h: 'text-slate-900 dark:text-slate-100', dot: 'text-slate-500 dark:text-slate-400' }
};
const infoBox = (tone, title, itemsHtml, footerHtml = '', label = '') => `
          <section class="rounded-2xl p-5 ${BOX_TONE[tone].bg}"${label ? ` aria-label="${label}"` : ''}>
            <h3 class="font-bold ${BOX_TONE[tone].h}">${title}</h3>
            <ul class="mt-2 space-y-1.5 text-sm text-slate-800 dark:text-slate-200">${itemsHtml.map(x => `<li class="flex gap-2"><span aria-hidden="true" class="${BOX_TONE[tone].dot}">•</span><span>${x}</span></li>`).join('')}</ul>
            ${footerHtml ? `<p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">${footerHtml}</p>` : ''}
          </section>`;
let NOTES = {}, NOTES_META = { updatedAt: '', note: '' };
// data/season.json: 시즌 태그(#FallColours 등)와 스팟별 "지금 가야 하는 이유". 오늘(밴쿠버 날짜)이 from~to 안인 태그만 써요
let SEASON = [], SEASON_NOTE = '';
const activeTags = () => { const d = vanDate(0); return SEASON.filter(t => t.from <= d && d <= t.to && t.spots); };
const spotTags = s => activeTags().filter(t => t.spots[s.id]);
// data/reddit.json: 예전 "On Reddit lately" 근거 링크. 2026-09-30부터 사이트에서 뺐어요 (파일을 불러오지 않아서 아무 것도 안 보여요)
let REDDIT = { mentions: {}, from: '', to: '' };
// data/press.json: 스팟 이름이 나온 최근 지역 음식 기사 { id: [{ outlet, title, url, date }] }. 기사 날짜부터 PRESS_DAYS일 동안 "지금 가 볼 이유"
let PRESS = {};
const PRESS_DAYS = 30;
const recentPress = s => (PRESS[s.id] || []).filter(p => /^https:\/\//.test(p.url || '') && p.date && p.date >= vanDate(-PRESS_DAYS) && p.date <= vanDate(0))
  .sort((a, b) => b.date.localeCompare(a.date));
// data/happy-hours.json: 해피아워 { id: { w: [{ d: 'Mo-Fr', f: '15:00', t: '18:00'|'close' } 또는 { d, all: true }], deals, label, note, source } }
let HAPPY = {}, HAPPY_META = { updatedAt: '' };
const DAY_CODES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_NAME = { Mo: 'Mon', Tu: 'Tue', We: 'Wed', Th: 'Thu', Fr: 'Fri', Sa: 'Sat', Su: 'Sun' };
// "Mo-Fr", "Su-Th"(주말을 넘어감), "Mo,We-Su" → 요일 번호(일=0) 집합
function hhDays(spec) {
  const out = new Set();
  spec.split(',').forEach(part => {
    const [a, b] = part.split('-').map(x => DAY_CODES.indexOf(x.trim()));
    if (a < 0) return;
    if (b == null || b < 0) { out.add(a); return; }
    for (let i = a; ; i = (i + 1) % 7) { out.add(i); if (i === b) break; }
  });
  return out;
}
const hhMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hhDayLabel = spec => spec === 'Mo-Su' ? 'Daily' : spec.split(',').map(p => p.split('-').map(x => DAY_NAME[x]).join('–')).join(', ');
const hhTime = t => t === 'close' ? 'close' : (t === '24:00' || t === '00:00') ? 'midnight' : fmtTime(t);
// data/lunch-specials.json: 런치 스페셜 (형식은 해피아워와 같고, approx: true는 "점심시간"으로만 확인된 곳)
let LUNCH = {}, LUNCH_META = { updatedAt: '' };
const APPROX_LUNCH = { f: '11:30', t: '14:30' };
// "3pm–6pm" → "3–6pm" (둘 다 pm이면 앞쪽 pm을 빼요)
function hhRange(w) {
  if (w.all) return 'all day';
  if (w.approx) return 'lunch hours';
  const a = fmtTime(w.f), b = hhTime(w.t), sa = a.slice(-2);
  return `${/[ap]m$/.test(b) && b.slice(-2) === sa ? a.slice(0, -2) : a}–${b}`;
}
// 요일이 같은 창끼리 묶은 주간 일정: [{ days: 'Daily', times: '2–5pm & 9pm–close' }, ...]
function hhSchedule(h) {
  const groups = [];
  h.w.forEach(w => { const g = groups.find(x => x.d === w.d); const r = hhRange(w) + (w.note ? ` (${w.note})` : ''); if (g) g.r.push(r); else groups.push({ d: w.d, r: [r] }); });
  return groups.map(g => ({ days: hhDayLabel(g.d), times: g.r.join(' & ') }));
}
// 지금 해피아워(또는 런치 스페셜)인지, 아니면 오늘 몇 시에 시작하는지 (영업시간을 알면 "close"는 문 닫을 때까지)
const hhState = s => HAPPY[s.id] ? dealState(s, HAPPY[s.id], 'Happy hour') : null;
const lunchState = s => LUNCH[s.id] ? dealState(s, LUNCH[s.id], 'Lunch special') : null;
function dealState(s, h, defLabel) {
  const now = vanWallClock(), dow = now.getDay(), prev = (dow + 6) % 7, m = now.getHours() * 60 + now.getMinutes();
  const oi = openInfo(s), open = oi ? oi.open : null;
  let active = null, next = null;
  for (const w0 of h.w) {
    const w = w0.approx ? { ...w0, ...APPROX_LUNCH } : w0;
    const days = hhDays(w.d);
    // 종일 딜: 런치 스페셜이면 점심~오후(11am–4pm)에만 "지금"으로 쳐요 (밤 10시에 "Lunch special now"가 뜨지 않게)
    if (w.all) { if (!active && days.has(dow) && open !== false && (defLabel !== 'Lunch special' || (m >= 660 && m < 960))) active = w; continue; }
    const f = hhMin(w.f), t = w.t === 'close' ? null : hhMin(w.t);
    const wraps = t !== null && t < f;   // 자정을 넘기는 창 (예: 9pm–1am)
    if (!active && days.has(dow) && m >= f && (t === null ? open !== false : wraps || m < t)) active = w;
    if (!active && wraps && days.has(prev) && m < t) active = w;
    if (days.has(dow) && m < f && (!next || f < hhMin(next.f))) next = w;
  }
  return { h, label: h.label || defLabel, active, next, until: active ? (active.all ? 'close' : active.approx ? '' : hhTime(active.t)) : '' };
}
// 날짜 계획용: 그날(들) 중 하루라도 딜이 있는지
const dealOnDays = (h, dates) => !!h && h.w.some(w => dates.some(d => hhDays(w.d).has(dowOf(d))));
// 먹거리의 최근 2주 Reddit 글 (제목에 이름이 나온 글)
const recentReddit = s => ((REDDIT.mentions[s.id] || {}).posts || []).filter(p => /^https:\/\/(www\.)?reddit\.com\//.test(p.url) && p.date >= vanDate(-14));
// 데이터 기준일 → "today", "yesterday", "3 days ago"
// data/parking.json: 스팟 근처 400m 안 주차장 (OpenStreetMap). { id: [{ m, fee?, kind?, name?, customers? }] }
let PARKING = { spots: {}, radius: 400 };
// "What parents say" 요약 (data/parent-says.json, 한두 문장)
let SAYS = {};
const PARK_KIND = { surface: 'Surface lot', 'multi-storey': 'Parkade', underground: 'Underground', rooftop: 'Rooftop', street_side: 'Street parking', lane: 'Street parking', layby: 'Pull-out' };
const parkingOf = s => PARKING.spots[s.id];
// 카드용 한 줄: 가장 가까운 주차장 거리와 유료 여부
// data/parking-meters.json: 밴쿠버시 길거리 미터(200m 안) 요금 요약 { id: { n, day, dayMin, dayMax, eve, limit, card } }
let METERS = { spots: {}, radius: 200 };
const money = v => `$${v % 1 ? v.toFixed(2) : v}`;
// 주차 요약: 근처 주차장 중 하나라도 무료면 무료, 유료가 있으면 유료, 모르면 "요금 정보 없음"
// 주차 요약: 밴쿠버시 미터가 있으면 그 정보와 함께 판단해요 ("요금 모름"이라고 한 뒤 미터 요금이 나오는 모순 방지)
function parkSummary(s) {
  const p = parkingOf(s) || [], m = METERS.spots[s.id] && METERS.spots[s.id].day != null;
  if (m) return p.some(x => x.fee === 'no') ? 'Free lot nearby, plus metered street parking' : 'Metered street parking nearby';
  if (!p.length) return s.cat === 'nature' ? 'No lot mapped near this point. Big parks usually have lots at their entrances.' : 'No lot mapped nearby. Street parking or transit may be easiest.';
  // 무료·유료가 섞여 있으면 둘 다 말해요 ("Free parking nearby" 밑에 "Indigo · paid"가 나오는 모순 방지)
  if (p.some(x => x.fee === 'no')) return p.some(x => x.fee === 'yes') ? 'Free and paid parking nearby' : 'Free parking nearby';
  if (p.some(x => x.fee === 'yes')) return 'Paid parking nearby';
  return 'Parking nearby, fee not listed';
}
// 카드용 한 줄 (주차장이 없으면 표시 안 함)
const parkShort = s => {
  const m = METERS.spots[s.id];
  if (m && m.day != null) return `Street meters ~${money(m.day)}/hr`;
  const p = parkingOf(s); if (!p || !p.length) return '';
  return p.some(x => x.fee === 'no') ? (p.some(x => x.fee === 'yes') ? 'Free & paid parking' : 'Free parking') : p.some(x => x.fee === 'yes') ? 'Paid parking' : 'Parking nearby';
};
const parkRate = c => c.replace(/(\d+(?:\.\d+)?)\s*CAD/g, '$$$1').replace(/\s*\/\s*/g, '/');
const parkingUrl = s => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`parking near ${s.name} BC`);
const ago = iso => { if (!iso) return ''; const d = Math.round((Date.parse(vanDate(0)) - Date.parse(iso)) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };
// 장소 종류에서 자동으로 뽑는 준비물 (이름·설명의 단어와 실내/야외로 판단)
function autoBring(s) {
  if (s.cat === 'food' || s.cat === 'dessert') return [];
  const n = `${s.name} ${s.summary}`.toLowerCase(), out = [];
  if (/pool|aquatic|water park|waterpark|splash|wave pool|swim/.test(n)) out.push('Swimsuit and towel', 'A change of clothes');
  if (s.env === 'indoor' && /playground|play centre|play center|play area/.test(n)) out.push('Grip socks (most indoor playgrounds ask for them)');
  if (/beach|banks|spit|tidal/.test(n)) out.push('Sunscreen and a hat', 'A beach blanket or towel');
  if (/hike|trail|falls|canyon|crunch|lookout|headwaters|forest|stair/.test(n) && s.env !== 'indoor') out.push('Sturdy shoes with good grip', 'Water and snacks');
  if (/farm/.test(n)) out.push('Shoes or boots that can get muddy');
  if (s.env !== 'indoor') out.push('A rain jacket, since the weather changes fast');
  if (s.env !== 'indoor' && isKid(s)) out.push(out.includes('Water and snacks') ? 'Wipes for the kids' : 'Snacks and wipes for the kids');
  return out;
}

// ───────── 유틸 ─────────
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byId = id => SPOTS.find(s => s.id === id);
// placeId가 있으면 Google 지도에서 정확히 그 장소를 열어요
const pid = (k, s) => s.placeId ? `&${k}=${encodeURIComponent(s.placeId)}` : '';
const mapsUrl = s => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(s.name + ' BC') + pid('query_place_id', s);
const dirUrl = s => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(s.name + ' BC') + pid('destination_place_id', s);
const infoUrl = s => 'https://www.google.com/search?q=' + encodeURIComponent(s.name + ' Vancouver');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
function km(a, b) {
  const R = 6371, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// "오늘"·영업 여부는 보는 사람 기기가 아니라 밴쿠버 시간 기준
const TZ = 'America/Vancouver';

// ───────── 행사 (파머스 마켓, 축제) ─────────
// data/events.json: schedule = { from, to, weekdays?(0=일), start?, end?, hoursText? }
let EVENTS = [];
let EVENTS_META = { updatedAt: '', note: '' };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// sale: 유명 브랜드 웨어하우스·팩토리 세일, popup: 팝업·박람회처럼 며칠만 열리는 행사
const EVENT_TYPES = { market: 'Farmers market', festival: 'Festival', seasonal: 'Seasonal', sale: 'Warehouse sale', popup: 'Pop-up & show' };
// 어른 위주 행사(맥주 축제, 샘플 세일, 영화제 등)에 붙이는 표시: 보여주되 부모용이라고 윙크로 알려줘요 (events.json의 forParents)
const PARENTS_BADGE = '<span class="ml-1 align-middle whitespace-nowrap text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">For parents 😉</span>';
// 카드 이유 박스 제목: 행사 종류·시즌 태그 이름에 맞게 (Coming up 대신)
const EVENT_LABEL = { market: "Market", festival: "Festival", seasonal: "Seasonal", sale: "Warehouse sale", popup: "Pop-up" };
const eventLabel = ev => EVENT_LABEL[ev.type] || "Event";
const tagLabel = t => String(t.label || "").replace(/([a-z])([A-Z])/g, "$1 $2") || "Season";
const RARE_EVENT = ['sale', 'popup'];
const REST_STEP = 12;
// Worth going now에 늘 보여줄 추천 수 (이유가 있는 곳이 모자라면 클래식·리뷰 추천으로 채워요)
const TOP_N = 10;
const VAN_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
// 밴쿠버 기준 오늘(+n일) 날짜 'YYYY-MM-DD'
const vanDate = (n = 0) => VAN_DATE.format(new Date(Date.now() + n * 864e5));
const dowOf = iso => new Date(iso + 'T12:00:00Z').getUTCDay();
const shortDate = iso => `${MON[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
function occursOn(ev, iso) {
  const s = ev.schedule;
  return iso >= s.from && iso <= s.to && (!s.weekdays || s.weekdays.includes(dowOf(iso)));
}
// 밴쿠버 지금 시각 'HH:MM' (events.json의 end와 같은 형식)
const VAN_HM = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const vanNowHM = () => VAN_HM.format(new Date());
// 오늘부터 days일 안에 열리는 날짜들 (오늘 끝나는 시각이 이미 지났으면 오늘은 빼요)
const upcomingDates = (ev, days) => Array.from({ length: days }, (_, i) => vanDate(i))
  .filter((d, i) => occursOn(ev, d) && !(i === 0 && ev.schedule.end && vanNowHM() >= ev.schedule.end));
function dayLabel(iso) {
  if (iso === vanDate(0)) return 'Today';
  if (iso === vanDate(1)) return 'Tomorrow';
  return `${DOW[dowOf(iso)]}, ${shortDate(iso)}`;
}
// 카드의 "Why go now" 문구: 행사 이름에서 장소 이름을 빼요 (카드 제목과 겹치지 않게)
// "Pumpkin patch at Port Kells Nurseries" → "Pumpkin patch", 장소 이름과 같으면 "Open for the season"
function eventReason(ev, spot, next) {
  // "at Aldor Acres"처럼 장소 이름의 앞부분만 써도 빼요
  const at = /\s+at\s+(.+)$/i.exec(ev.name), spotLc = spot.name.toLowerCase();
  let name = at && spotLc.startsWith(at[1].toLowerCase()) ? ev.name.slice(0, at.index) : ev.name;
  if (name.toLowerCase() === spot.name.toLowerCase()) name = ev.type === 'seasonal' ? 'Open for the season' : (EVENT_TYPES[ev.type] || 'Event');
  return `${dayLabel(next)}: ${name}`;
}
const fmtTime = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? 'pm' : 'am'}`; };
const eventHours = ev => ev.schedule.hoursText || (ev.schedule.start ? `${fmtTime(ev.schedule.start)}–${fmtTime(ev.schedule.end)}` : 'Times vary');
function eventWhen(ev) {
  const s = ev.schedule;
  if (s.weekdays && s.weekdays.length === 1) return `Every ${DOW[s.weekdays[0]]} until ${shortDate(s.to)}`;
  if (s.weekdays) return `${s.weekdays.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DOW[d]).join(', ')} until ${shortDate(s.to)}`;
  return s.from === s.to ? shortDate(s.from) : `${shortDate(s.from)} – ${shortDate(s.to)}`;
}
// ───────── 영업시간 (OpenStreetMap opening_hours 형식, opening_hours.js로 해석) ─────────
// ── 지도 (Leaflet + OpenStreetMap 지도 타일). 키 없이 무료, 지도 오른쪽 아래에 출처를 표시해요 (CARTO 타일은 이제 키가 필요해서 OSM으로) ──
const LEAFLET = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet';
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// 메트로 밴쿠버 전체가 보이는 기본 범위
const METRO_BOUNDS = [[48.98, -123.30], [49.42, -121.85]];
let leafletReady = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (!leafletReady) {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + '.css'; document.head.appendChild(css);
    leafletReady = loadScript(LEAFLET + '.js');
  }
  return leafletReady;
}
const OH_LIB ='https://cdn.jsdelivr.net/npm/opening_hours@3.15.0/build/opening_hours.min.js';
const OH_NOMINATIM = { lat: 49.25, lon: -123.1, address: { country_code: 'ca', state: 'British Columbia' } };
// "sunrise-sunset"(해 뜰 때부터 해 질 때까지)인 공원은 시각을 계산하지 않고 그 사실만 보여줘요.
// (opening_hours.js 브라우저 빌드는 이를 06:00-18:00으로 고정해 계산해서, 해석기에 넣지 않아요)
const isDaylight = s => s.hours === 'sunrise-sunset';
const HOURS_NOTE = { osm: 'Hours from OpenStreetMap', web: "Hours from the place's website or listings", citypark: 'Vancouver park hours, 6am–10pm', park: 'Typical park hours, sunrise to sunset', public: 'Public area' };
// 계절 영업시간은 hoursUntil(YYYY-MM-DD)까지만 믿어요. 지나면 "영업시간 모름"으로 봐요
const hoursValid = s => !s.hoursUntil || vanDate(0) <= s.hoursUntil;
let HOURS_READY = false;
function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
// 라이브러리는 브라우저 로컬 시각으로 계산하므로, 밴쿠버 벽시계 시각을 로컬 Date로 만들어 넘겨요
const VAN_WALL = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
function vanWallClock(date = new Date()) {
  const p = {}; VAN_WALL.formatToParts(date).forEach(x => p[x.type] = x.value);
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
}
const fmtClock = d => `${d.getHours() % 12 || 12}${d.getMinutes() ? ':' + String(d.getMinutes()).padStart(2, '0') : ''}${d.getHours() >= 12 ? 'pm' : 'am'}`;
// 지금 영업 상태: { open, text } 또는 null(영업시간 모름)
// 영업시간 데이터가 없어도 오늘 이 장소에서 시간이 정해진 행사(호박밭 시즌 등)가 열리면 그 시간으로 판단해요
function eventToday(s) {
  const today = vanDate(0);
  return EVENTS.find(ev => ev.spotId === s.id && ev.schedule.start && ev.schedule.end && occursOn(ev, today)) || null;
}
function openInfo(s) {
  if (isDaylight(s)) return { open: true, text: 'Open sunrise to sunset' };
  if (!s._oh) {
    const ev = eventToday(s);
    if (!ev) return null;
    const now = vanNowHM(), { start, end } = ev.schedule;
    if (now < start) return { open: false, text: `Closed · opens ${fmtTime(start)}` };
    if (now < end) return { open: true, text: `Open · closes ${fmtTime(end)}` };
    // 행사 이름은 Why go now에 이미 나와서, 영업 상태 줄에는 시간만 써요 (같은 말이 두 번 나오지 않게)
    return { open: false, text: `Closed for today (it closed at ${fmtTime(end)})` };
  }
  try {
    const now = vanWallClock(), open = s._oh.getState(now);
    if (s.hoursSource === 'public') return { open: true, text: 'Open all day' };
    // "16:30+"처럼 마감 시간이 없는 경우: 라이브러리는 '알 수 없음' 상태로 돌려줘요
    if (!open && s._oh.getUnknown(now)) return { open: true, text: 'Open · closing time not listed' };
    const next = s._oh.getNextChange(now);
    // 오늘이면 시각만, 일주일 안이면 요일, 그보다 멀면 날짜(예: 계절 휴장 뒤 다시 여는 날)
    // 오늘 밤 12시는 "Tue 12am"이 아니라 "midnight"
    const when = !next ? '' : !next.getHours() && !next.getMinutes() && next - now <= 864e5 ? 'midnight' : next.toDateString() === now.toDateString() ? fmtClock(next) : next - now < 6 * 864e5 ? `${DOW[next.getDay()]} ${fmtClock(next)}` : `${MON[next.getMonth()]} ${next.getDate()}, ${fmtClock(next)}`;
    return { open, text: open ? (next ? `Open · closes ${when}` : 'Open') : (next ? `Closed · opens ${when}` : 'Closed') };
  } catch (e) { return null; }
}
// 지금 닫혀 있지만 h시간 안에 여는지 (영업시간을 모르면 false)
function opensWithin(s, h) {
  if (!s._oh || s.hoursSource === 'public') return false;
  try { const now = vanWallClock(), next = s._oh.getNextChange(now); return !s._oh.getState(now) && !!next && next - now <= h * 36e5; } catch (e) { return false; }
}
// 오늘(밴쿠버) h시 30분에 열려 있는지: true/false, 영업시간을 모르면 null
function openAt(s, h) {
  if (!s._oh) { const ev = eventToday(s); if (!ev) return null; const t = `${String(h).padStart(2, '0')}:30`; return t >= ev.schedule.start && t < ev.schedule.end; }
  if (s.hoursSource === 'public') return true;
  try { const d = vanWallClock(); d.setHours(h, 30, 0, 0); return s._oh.getState(d) || s._oh.getUnknown(d); } catch (e) { return null; }
}
// ── 날짜 계획 (When): 주말·내일 계획용. '' = 지금 기준(기본) ──
const WHEN = { today: 'Today', tomorrow: 'Tomorrow', weekend: 'This weekend', sat: 'Saturday', sun: 'Sunday' };
// 문장 속 표현: "Worth going this weekend", "Happening on Saturday"
const WHEN_PHRASE = { today: 'today', tomorrow: 'tomorrow', weekend: 'this weekend', sat: 'on Saturday', sun: 'on Sunday' };
// 고른 때의 날짜들 (밴쿠버). 토요일에 "this weekend"는 오늘·내일, 일요일엔 오늘만
function whenDates(when) {
  const d = dowOf(vanDate(0)), toSat = (6 - d) % 7, toSun = (7 - d) % 7;
  if (when === 'today') return [vanDate(0)];
  if (when === 'tomorrow') return [vanDate(1)];
  if (when === 'sat') return [vanDate(toSat)];
  if (when === 'sun') return [vanDate(toSun)];
  if (when === 'weekend') return d === 0 ? [vanDate(0)] : [vanDate(toSat), vanDate(toSat + 1)];
  return [];
}
// 드롭다운·칩용: "This weekend (Oct 3–4)", "Tomorrow (Tue, Sep 29)"
function whenLabel(when) {
  const ds = whenDates(when);
  if (!ds.length) return 'Any time';
  const range = ds.length === 1 ? `${DOW[dowOf(ds[0])]}, ${shortDate(ds[0])}` : `${shortDate(ds[0])}–${ds[1].slice(5, 7) === ds[0].slice(5, 7) ? +ds[1].slice(8, 10) : shortDate(ds[1])}`;
  return when === 'today' ? `Today (${range})` : `${WHEN[when]} (${range})`;
}
// 하루(a = 그날 0시) 영업시간 문구. 자정을 넘기는 영업은 전날 밤에 붙여서 "11am–1am"으로 보여줘요
// (자정 직후 남은 칸 "12am–1am"은 전날 영업의 연장이라 빼고, "–midnight"는 다음 날 새벽 마감 시각으로 이어요)
function fmtDayHours(s, a) {
  const day = n => { const d = new Date(a); d.setDate(d.getDate() + n); return d; };
  const b = day(1), prevEnd = s._oh.getOpenIntervals(day(-1), a).slice(-1)[0];
  let iv = s._oh.getOpenIntervals(a, b);
  if (iv.length && prevEnd && prevEnd[1].getTime() === a.getTime() && iv[0][0].getTime() === a.getTime() && iv[0][1].getTime() !== b.getTime()) iv = iv.slice(1);
  if (!iv.length) return 'Closed';
  if (iv.length === 1 && iv[0][0].getTime() === a.getTime() && iv[0][1].getTime() === b.getTime()) return 'Open 24 hours';
  return iv.map(([f, t, unk], i) => {
    if (unk) return `from ${fmtClock(f)}`;
    let end = t.getTime() === b.getTime() ? 'midnight' : fmtClock(t);
    if (i === iv.length - 1 && t.getTime() === b.getTime()) {
      const nx = s._oh.getOpenIntervals(b, day(2))[0];
      if (nx && nx[0].getTime() === b.getTime() && nx[1] - b <= 6 * 36e5 && nx[1] - b > 0) end = fmtClock(nx[1]);
    }
    return `${fmtClock(f)}–${end}`;
  }).join(', ');
}
// 그날 영업시간 한 줄: '10am–5pm' · 'Closed' · null(모름). 행사 시간(호박밭 시즌 등)이 있으면 그걸로
function dayHours(s, iso) {
  if (isDaylight(s)) return 'Sunrise to sunset';
  if (s.hoursSource === 'public') return 'Open all day';
  if (!s._oh || (s.hoursUntil && iso > s.hoursUntil)) {
    const ev = EVENTS.find(ev => ev.spotId === s.id && ev.schedule.start && ev.schedule.end && occursOn(ev, iso));
    return ev ? `${fmtTime(ev.schedule.start)}–${fmtTime(ev.schedule.end)}` : null;
  }
  try {
    const [y, m, d] = iso.split('-').map(Number);
    return fmtDayHours(s, new Date(y, m - 1, d));
  } catch (e) { return null; }
}
// 그날 못 가는 곳인지: 하루 종일 닫거나, 오늘이면 이미 문을 닫아 남은 시간에 열지 않는 곳 (영업시간을 모르면 false)
function closedOn(s, iso) {
  const h = dayHours(s, iso);
  if (h === 'Closed') return true;
  if (iso !== vanDate(0) || !h) return false;
  const oi = openInfo(s);
  if (!oi || oi.open) return false;
  return !opensWithin(s, (24 - vanWallClock().getHours()) || 1) && !(eventToday(s) && vanNowHM() < eventToday(s).schedule.start);
}
// 모달용 사람이 읽는 주간 영업시간: 앞으로 7일을 요일별로 계산해 같은 시간은 묶어요 (예: "Mon–Fri 10am–5pm · Sat–Sun 9am–6pm")
function weekHours(s) {
  if (!s._oh || s.hoursSource === 'public') return '';
  try {
    const base = vanWallClock(); base.setHours(0, 0, 0, 0);
    const byDow = {};
    for (let i = 0; i < 7; i++) {
      const a = new Date(base); a.setDate(a.getDate() + i);
      byDow[a.getDay()] = fmtDayHours(s, a);
    }
    const order = [1, 2, 3, 4, 5, 6, 0], groups = [];
    order.forEach(d => { const g = groups[groups.length - 1]; if (g && g.text === byDow[d]) g.to = d; else groups.push({ from: d, to: d, text: byDow[d] }); });
    if (groups.length === 1) return groups[0].text === 'Closed' ? 'Closed all week' : `Every day ${groups[0].text}`;
    return groups.map(g => `${DOW[g.from]}${g.to !== g.from ? '–' + DOW[g.to] : ''} ${g.text}`).join(' · ');
  } catch (e) { return ''; }
}
// ───────── 사진이 없는 스팟용 일러스트 커버 (SVG) ─────────
// 장소 종류에 맞는 풍경을 그리고, 스팟 id로 시드를 만들어 모양과 색이 조금씩 달라지게 해요.
function seeded(str) {
  let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
}
function sceneOf(s) {
  const n = `${s.name} ${s.summary}`.toLowerCase();
  if (s.cat === 'food') return 'food';
  if (s.cat === 'dessert') return 'dessert';
  if (/beach|banks|spit|sunset/.test(n)) return 'beach';
  if (/lake|cove|river|creek|inlet|marine|waterfront|harbour|quay|pier|wharf|fjord|esplanade|pool|aquatic|water/.test(n)) return 'water';
  if (/mountain|hike|trail|falls|crunch|peak|lookout|canyon|gondola|summit|rock/.test(n)) return 'mountain';
  if (s.cat === 'city' || /mall|shopping|centre|gallery|museum/.test(n)) return 'city';
  if (s.env === 'indoor') return 'play';
  return 'park';
}
function sceneSvg(s) {
  const r = seeded(s.id), R = (a, b) => a + (b - a) * r(), W = 400, H = 200, kind = sceneOf(s);
  const hills = (base, amp, fill) => { let d = `M0 ${H} L0 ${base}`; for (let x = 0; x <= W; x += 50) d += ` Q${x + 25} ${base - R(0, amp)} ${x + 50} ${base + R(-amp / 3, amp / 3)}`; return `<path d="${d} L${W} ${H} Z" fill="${fill}"/>`; };
  const peaks = (base, h, fill, snow) => { let d = `M0 ${base}`, caps = ''; let x = 0; while (x < W) { const w = R(70, 130), top = base - R(h * .6, h); d += ` L${x + w / 2} ${top} L${x + w} ${base}`; if (snow) caps += `<path d="M${x + w / 2 - 12} ${top + 14} L${x + w / 2} ${top} L${x + w / 2 + 12} ${top + 14} Z" fill="#f8fafc" opacity=".9"/>`; x += w * .8; } return `<path d="${d} L${W} ${base} L${W} ${H} L0 ${H} Z" fill="${fill}"/>${caps}`; };
  const trees = (n, y0, y1, c) => Array.from({ length: n }, () => { const x = R(10, W - 10), y = R(y0, y1), t = R(10, 18); return `<path d="M${x} ${y - t * 2} L${x - t * .7} ${y} L${x + t * .7} ${y} Z" fill="${c}"/>`; }).join('');
  const sky = (a, b) => `<defs><linearGradient id="sk-${s.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sk-${s.id})"/>`;
  let body = '';
  if (kind === 'park') body = sky('#9fd3ff', '#e0f2fe') + `<circle cx="${R(40, 360)}" cy="${R(30, 55)}" r="18" fill="#fde68a"/>` + hills(120, 40, '#86efac') + hills(150, 30, '#4ade80') + trees(9, 130, 190, '#15803d') + hills(185, 12, '#22c55e');
  else if (kind === 'mountain') body = sky('#7dd3fc', '#e0f2fe') + peaks(130, 90, '#94a3b8', true) + peaks(160, 60, '#64748b', false) + hills(175, 20, '#166534') + trees(14, 170, 200, '#14532d');
  else if (kind === 'water') body = sky('#93c5fd', '#dbeafe') + peaks(110, 55, '#7c8fb0', true) + `<rect y="110" width="${W}" height="90" fill="#3b82f6"/>` + Array.from({ length: 8 }, () => { const x = R(0, W), y = R(125, 190); return `<path d="M${x} ${y} q10 -6 20 0 t20 0" stroke="#bfdbfe" stroke-width="2" fill="none" opacity=".8"/>`; }).join('') + hills(200, 10, '#1d4ed8');
  else if (kind === 'beach') body = sky('#fdba74', '#fde68a') + `<circle cx="${R(80, 320)}" cy="104" r="26" fill="#fb923c"/>` + `<rect y="104" width="${W}" height="46" fill="#0ea5e9"/><rect y="104" width="${W}" height="4" fill="#fed7aa" opacity=".7"/>` + hills(165, 15, '#fcd34d') + `<rect y="175" width="${W}" height="25" fill="#fbbf24"/>`;
  else if (kind === 'city') body = sky('#6366f1', '#f0abfc') + Array.from({ length: 14 }, (_, i) => { const w = R(22, 40), x = i * 30 - 10, h = R(50, 130), win = Array.from({ length: Math.floor(h / 16) }, (_, j) => `<rect x="${x + 6}" y="${H - h + 8 + j * 16}" width="${w - 12}" height="5" fill="#fde68a" opacity="${R(.2, .9).toFixed(2)}"/>`).join(''); return `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" fill="${i % 2 ? '#312e81' : '#4338ca'}"/>${win}`; }).join('');
  else if (kind === 'food') body = `<rect width="${W}" height="${H}" fill="#fde7c7"/>` + Array.from({ length: 10 }, (_, i) => `<rect x="${i * 40}" y="0" width="20" height="${H}" fill="#fbd6a3" opacity=".6"/>`).join('') + Array.from({ length: 5 }, () => { const x = R(30, 370), y = R(30, 170), rr = R(20, 34); return `<circle cx="${x}" cy="${y}" r="${rr}" fill="#fff" opacity=".85"/><circle cx="${x}" cy="${y}" r="${rr * .7}" fill="none" stroke="#f3c38b" stroke-width="3"/>`; }).join('');
  else if (kind === 'dessert') body = `<rect width="${W}" height="${H}" fill="#fce7f3"/>` + Array.from({ length: 36 }, () => `<circle cx="${R(0, W)}" cy="${R(0, H)}" r="${R(3, 8)}" fill="${['#f9a8d4', '#c4b5fd', '#fde68a', '#a7f3d0'][Math.floor(r() * 4)]}" opacity=".8"/>`).join('') + Array.from({ length: 20 }, () => { const x = R(0, W), y = R(0, H), a = R(0, 180); return `<rect x="${x}" y="${y}" width="12" height="3" rx="1.5" fill="${['#f472b6', '#60a5fa', '#34d399', '#fbbf24'][Math.floor(r() * 4)]}" transform="rotate(${a} ${x} ${y})"/>`; }).join('');
  else body = `<rect width="${W}" height="${H}" fill="#ede9fe"/>` + Array.from({ length: 22 }, () => { const x = R(0, W), y = R(0, H), c = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'][Math.floor(r() * 5)]; return r() < .5 ? `<circle cx="${x}" cy="${y}" r="${R(6, 16)}" fill="${c}" opacity=".75"/>` : `<path d="M${x} ${y} l${R(10, 20)} ${R(14, 26)} l${-R(20, 30)} 0 Z" fill="${c}" opacity=".75"/>`; }).join('');
  return { kind, svg: `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" class="absolute inset-0 w-full h-full" aria-hidden="true">${body}</svg>` };
}
const eventMapsUrl = ev => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ev.venue.replace(/\s*\(.*?\)\s*/g, ' ') + ' ' + ev.area + ' BC');
// 밴쿠버 현재 날씨 (Open-Meteo, 키 없이 무료). WMO 날씨 코드를 앱의 3가지 날씨로 묶어요.
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=49.2827&longitude=-123.1207&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,precipitation_probability_max&forecast_days=8&timezone=America%2FVancouver';
function weatherKind(code) {
  if (code <= 1) return 'sunny';
  if (code <= 48) return 'cloudy';
  return 'rain'; // 이슬비, 비, 눈, 소나기, 뇌우
}
// 헤더 날씨 아이콘: 밤에 맑으면 달 (Open-Meteo is_day)
function weatherIcon(code, day) {
  if (code <= 1) return day ? '☀️' : '🌙';
  if (code === 2) return day ? '⛅' : '☁️';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67 || (code >= 80 && code <= 82)) return '🌧️';
  if (code <= 86) return '🌨️';
  return '⛈️';
}
function weatherDesc(code) {
  if (code === 0) return 'clear';
  if (code === 1) return 'mostly clear';
  if (code === 2) return 'partly cloudy';
  if (code === 3) return 'overcast';
  if (code <= 48) return 'foggy';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'showers';
  if (code <= 86) return 'snow showers';
  return 'thunderstorms';
}
function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
// 마지막으로 고른 자녀 나이: 다음 방문에 첫 질문이 자동으로 골라져 있어요 (결과에서 "상관없음"으로 넘긴 건 저장하지 않아요)
const AGE_KEY = 'spotmate-age';
const savedAge = () => { const v = load(AGE_KEY); return ['baby', 'pre', 'school', 'mixed'].includes(v) ? { age: v } : {}; };

// ───────── 앱 ─────────
class App {
  constructor() {
    const savedDark = load('spotmate-dark');
    const prefersDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    const savedRadius = load('spotmate-radius');
    this.state = {
      // sort: 'fresh' = 새로 생긴 곳·뜨는 곳·숨은 명소 먼저, 유명 명소는 맨 아래 / 'distance'
      // tf: AI 분석 캐시 키에만 남아 있어요 (검색량 점수는 더 이상 화면에 쓰지 않아요)
      cat: 'all', tf: 'month', sort: 'fresh',
      tag: '',
      // 날씨는 직접 고르지 않고 Open-Meteo 실제 날씨를 자동으로 써요 (못 가져오면 'cloudy' 기준)
      weather: 'cloudy', live: null, forecast: {},
      // when: 날짜 계획 ('' = 지금 기준, 'today' · 'tomorrow' · 'weekend' · 'sat' · 'sun'). 날짜가 지나면 의미가 바뀌어서 기억하지 않아요
      when: '',
      view: 'list', dark: savedDark === null ? prefersDark : savedDark === '1',
      // nearKey: '' = 위치 필터 없음, 'here' = GPS 현재 위치(origin), 그 외 = ORIGINS의 지역
      nearKey: '', origin: null, geoMsg: '', geoBusy: false,
      // "Open now"는 늘 꺼진 채로 시작해요 (밤에 켜 두면 추천이 몇 곳만 남아서, 켠 상태를 기억하지 않아요)
      openNow: false,
      // Indoor·Kids도 기억하지 않아요 (검색·비 안내로 켜진 게 다음 방문까지 남아 목록이 몰래 좁혀지지 않게)
      indoor: false, kidsOnly: false,
      // cuisine: Food 카테고리에서 고른 음식 종류 ('' = 전체)
      cuisine: '',
      // price: Eats 가격대 ('' = 전체, '$', '$$', '$$$' = $$$ 이상). 켜 둔 채 잊으면 목록이 줄어 보여서 기억하지 않아요
      price: '',
      // hh: Eats "Happy hour" 필터 (지금 하거나 오늘 이따 하는 곳만). 시간이 지나면 의미가 바뀌어서 기억하지 않아요
      hh: false, lunch: false,
      // 검색창: q = 검색어, kw = 알아들은 키워드(장소 이름·설명·메뉴에서 찾기, 하나라도 맞으면), free = Explore에서 무료만
      // filtersOpen: 모바일에서 카테고리·정렬·위치를 펼쳤는지
      filtersOpen: false,
      // wiz: Explore 5단계 추천 (step 0–4, ans = 단계별 고른 값, done = 결과 보기), wizMore: 결과를 몇 곳 보여줄지
      // fxOn: 추천 결과 위 체크 필터 (Free only · Stroller OK · Rain OK · Under 2 hrs). 켜 둔 채 잊지 않게 기억하지 않아요
      fxOn: { free: false, stroller: false, rain: false, short: false },
      wiz: { step: 0, ans: savedAge(), done: false }, wizMore: 10,
      // browse: Explore를 질문 없이 전체 목록(필터)으로 보기. 열 때는 늘 Pick for me(질문)부터 시작해요
      browse: !!(window.GUIDE && window.GUIDE.ids),
      // guide: 안내 페이지(/guides/…)로 들어왔을 때 그 안내에 실린 장소만 보여줘요 (build-guides.ps1 이 window.GUIDE = { title, ids } 를 넣어요)
      guide: window.GUIDE && window.GUIDE.ids ? { title: String(window.GUIDE.title || ''), set: new Set(window.GUIDE.ids) } : null,
      // 부모 리뷰: user = 구글 로그인한 사람, reviewDraft = 쓰는 중인 리뷰 { id, rating, text }
      user: null, reviewsOn: false, reviewDraft: null, reviewBusy: false, reviewMsg: '',
      feedbackBusy: false, feedbackMsg: '', feedbackSent: false, savedTab: 'saved',
      q: '', kw: [], unused: [], free: false, qBusy: false, aiSay: '',
      radius: RADII.map(String).includes(savedRadius) ? (savedRadius === 'any' ? 'any' : +savedRadius) : 10,
      modal: null, trendInfo: false,
      // "Good any day" 목록에서 보여줄 개수 (Show more로 12개씩 늘어나요)
      restShown: REST_STEP,
      plan: [], copyMsg: '', copyText: '',
      loading: true, loadError: ''
    };
    this.ai = {};
    this.sample = null;
    this.root = document.getElementById('app');
    this.fbDraft = {};   // About 탭 피드백 폼에 쓰던 글
    this.root.addEventListener('click', e => this.onClick(e));
    // 지도 탭: 오른쪽 목록 위에 마우스(또는 키보드 포커스)를 올리면 왼쪽 지도에서 그 장소를 강조
    const hl = (e, on) => { const b = e.target.closest && e.target.closest('[data-maphl]'); if (b && (!e.relatedTarget || !b.contains(e.relatedTarget))) this.highlightPin(b.dataset.maphl, on); };
    this.root.addEventListener('mouseover', e => hl(e, true));
    this.root.addEventListener('mouseout', e => hl(e, false));
    this.root.addEventListener('focusin', e => hl(e, true));
    this.root.addEventListener('focusout', e => hl(e, false));
    this.root.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('article[data-act]')) { e.preventDefault(); e.target.click(); }
    });
    this.root.addEventListener('change', e => this.onChange(e));
    // 검색창: 입력 중인 글은 다시 그려져도 남도록 따로 들고 있다가, Enter/Search에 검색
    this.root.addEventListener('input', e => {
      if (e.target.name === 'q') this.qDraft = e.target.value;
      if (e.target.dataset.act === 'evsearch') {
        this.evq = e.target.value;
        const r = this.eventsResults(e.target.dataset.kind), box = document.getElementById('ev-results'), cnt = document.getElementById('ev-count');
        if (box) box.innerHTML = r.html;
        if (cnt) cnt.innerHTML = r.count;
      }
      if (e.target.dataset.act === 'rvtext' && this.state.reviewDraft) this.state.reviewDraft.text = e.target.value;
      // 피드백 폼: 다른 이유로 화면이 다시 그려져도 쓰던 글이 남게
      if (e.target.form && e.target.form.dataset.act === 'feedback') this.fbDraft[e.target.name] = e.target.value;
    });
    this.root.addEventListener('submit', e => {
      if (e.target.matches('form[data-act="feedback"]')) { e.preventDefault(); return this.sendFeedback(); }
      if (!e.target.matches('form[data-act="search"]')) return;
      e.preventDefault();
      this.runSearch(new FormData(e.target).get('q') || '');
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.state.modal) this.closeModal(); });
    // 이미 열린 페이지에 공유 링크(#spot=id)를 붙여 넣은 경우
    // 뒤로가기(모바일 포함): 모달이 열려 있으면 닫고, 앞으로가기로 모달 기록에 오면 다시 열어요
    window.addEventListener('popstate', e => {
      const id = e.state && e.state.modal;
      if (id && byId(id)) { if (this.state.modal !== id) { document.body.style.overflow = 'hidden'; this.set({ modal: id, trendInfo: false, shareMsg: null, reviewMsg: '', reviewDraft: null }); } }
      else if (this.state.modal) this.hideModal();
    });
    window.addEventListener('hashchange', () => {
      const m = /^#spot=([^&]+)/.exec(location.hash), s = m && SPOTS.length && byId(decodeURIComponent(m[1]));
      if (s && this.state.modal !== s.id) this.openModal(s.id);
      this.openSharedEvent();
    });
    this.render();
    this.loadData();
    this.loadWeather();
    // 리뷰(Firebase, 약 400 KB)는 첫 화면을 다 그린 뒤 한가할 때 불러와요
    (window.requestIdleCallback || (f => setTimeout(f, 1200)))(() => this.initReviews(), { timeout: 3000 });
    // "Open now"와 오늘 행사는 시간이 지나면 바뀌어서 5분마다 다시 그려요
    setInterval(() => { if (!this.state.loading) this.render(); }, 5 * 60 * 1000);
    if (window.claude && typeof window.claude.use === 'function') {
      window.claude.use('sample').then(s => { this.sample = s; if (s) this.render(); }).catch(() => {});
    }
  }

  async loadData() {
    this.set({ loading: true, loadError: '' });
    try {
      // 데이터 파일은 한꺼번에(동시에) 받아요. 하나씩 기다리면 파일마다 네트워크 지연이 쌓여 첫 화면이 늦어져요
      // 꺼 둔 기능(Eats·트렌드·Reddit)의 파일은 아예 받지 않아요. spots.json 말고는 없어도 괜찮아요
      const get = (path, on = true) => on ? fetch(path, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null);
      const ohLib = window.opening_hours ? Promise.resolve() : loadScript(OH_LIB).catch(() => null);
      const [data, ed, status, td, gd, nd, md, pd, hd, ld, prd, sd, pk, fd] = await Promise.all([
        fetch('/data/spots.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
        get('/data/events.json'), get('/data/review-status.json'), get('/data/trends-weekly.json', TRENDS_ON),
        get('/data/spot-guides.json'), get('/data/spot-notes.json'), get('/data/parking-meters.json'), get('/data/parking.json'),
        get('/data/happy-hours.json', EATS_ON), get('/data/lunch-specials.json', EATS_ON), get('/data/press.json', EATS_ON), get('/data/season.json'), get('/data/parent-says.json'), get('/data/spot-facts.json'),
      ]);
      SPOTS = data.spots;
      // 행사 정보
      if (ed) { EVENTS = ed.events || []; EVENTS_META = { updatedAt: ed.updatedAt || '', note: ed.note || '' }; }
      // 월 1회 점검(tools/refresh-reviews.ps1)에서 폐업하거나 기준에서 벗어난 스팟은 숨겨요
      if (status) { const { inactive = {} } = status; SPOTS = SPOTS.filter(s => !inactive[s.id]); }
      // 평소 대비 증가율 (TRENDS_ON일 때만)
      if (td) {
        SPOTS.forEach(s => { s.rise = riseOf(td.series && td.series[s.id], td.daily && td.daily[s.id], td.through); });
        RISE_META = { updatedAt: td.updatedAt || '', through: td.through || '', recentFrom: td.recentFrom || '', recentThrough: td.recentThrough || '' };
        RISE_NOTES = td.notes || {};
      }
      // 스팟 안내(할 거리·먹을 것·준비물), Tiny Trips tip, 주차 미터·주차장
      if (gd) { GUIDES = gd.guides || {}; GUIDES_NOTE = gd.note || ''; }
      if (fd) { FACTS = fd.spots || {}; FACTS_META = { updatedAt: fd.updatedAt || '' }; }
      if (nd) { NOTES = nd.notes || {}; NOTES_META = { updatedAt: nd.updatedAt || '', note: nd.note || '' }; }
      if (md) METERS = { spots: md.spots || {}, radius: md.radius || 200 };
      if (pd) PARKING = { spots: pd.spots || {}, radius: pd.radius || 400 };
      // 해피아워·런치 스페셜·음식 기사 (EATS_ON일 때만). Reddit 언급은 사이트에서 뺐어요
      if (hd) { HAPPY = hd.spots || {}; HAPPY_META = { updatedAt: hd.updatedAt || '' }; }
      if (ld) { LUNCH = ld.spots || {}; LUNCH_META = { updatedAt: ld.updatedAt || '' }; }
      if (prd) PRESS = prd.items || {};
      // 시즌 태그
      if (pk) SAYS = pk.spots || {};
      if (sd) { SEASON = Array.isArray(sd.tags) ? sd.tags : []; SEASON_NOTE = sd.note || ''; }
      // 영업시간 해석 라이브러리: 못 불러오면 "Open now" 필터 없이 동작해요
      await ohLib;
      if (window.opening_hours) {
        SPOTS.forEach(s => { if (s.hours && !isDaylight(s) && hoursValid(s)) { try { s._oh = new opening_hours(s.hours, OH_NOMINATIM); } catch (e) { s._oh = null; } } });
        HOURS_READY = true;
      } else HOURS_READY = false;
      DATA_META = { source: data.source, updatedAt: data.updatedAt, trendNote: data.trendNote || '', coordsNote: data.coordsNote || '' };
      let plan = [];
      try { plan = JSON.parse(load('spotmate-plan') || '[]').filter(id => byId(id)); } catch (e) {}
      // "Know it"(아는 곳 숨기기)은 없앴어요. 예전에 숨겨 둔 목록은 지워서 모든 곳이 다시 보이게 해요
      try { ['spotmate-known', 'spotmate-opennow', 'spotmate-price', 'spotmate-kids', 'spotmate-indoor', 'spotmate-browse'].forEach(k => localStorage.removeItem(k)); } catch (e) {}
      this.newIds = this.trackSeen();
      this.set({ loading: false, plan });
      // 검색 링크(?q=)로 들어오면 그 검색을 바로 해요
      const sq = new URLSearchParams(location.search).get('q');
      if (sq) this.runSearch(sq.slice(0, 200));
      // 공유받은 링크(#spot=id)로 들어오면 그 장소를 바로 열어요
      const m = /^#spot=([^&]+)/.exec(location.hash), shared = m && byId(decodeURIComponent(m[1]));
      if (shared) this.openModal(shared.id);
      this.openSharedEvent();
    } catch (e) {
      this.set({ loading: false, loadError: "We couldn't load the spots. Check your connection and try again." });
    }
  }
  // ── 부모 리뷰 ──
  // Firebase SDK는 설정이 있을 때만 불러와요. 리뷰는 한 번에 받아서 장소별로 묶어 둬요 (많아지면 장소를 열 때 받는 방식으로 바꿔요)
  async initReviews() {
    this.reviews = {};
    if (!FIREBASE_CONFIG) return;
    try {
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}`;
      const [A0, A, F] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`)]);
      const fbApp = A0.initializeApp(FIREBASE_CONFIG);
      this.fb = { A, F, auth: A.getAuth(fbApp), db: F.getFirestore(fbApp) };
      A.onAuthStateChanged(this.fb.auth, u => this.set({ user: u ? { uid: u.uid, name: (u.displayName || 'Parent').split(' ')[0].slice(0, 40) } : null }));
      // 구글 페이지로 이동해서 로그인하고 돌아왔으면, 리뷰를 쓰려던 장소를 다시 열어요
      A.getRedirectResult(this.fb.auth).then(res => {
        let spot = ''; try { spot = sessionStorage.getItem('spotmate-review-spot') || ''; sessionStorage.removeItem('spotmate-review-spot'); } catch (x) {}
        // 장소 데이터가 아직 안 왔으면 올 때까지 기다려요
        const go = () => { if (this.state.loading) return setTimeout(go, 200); if (!byId(spot)) return; this.openModal(spot); setTimeout(() => { const r = document.getElementById('reviews'); if (r) r.scrollIntoView({ block: 'start' }); }, 300); };
        if (res && spot) go();
      }).catch(e => this.set({ reviewMsg: `Sign-in didn't finish (${e.code || 'unknown error'}). Try again.` }));
      const snap = await F.getDocs(F.query(F.collection(this.fb.db, 'reviews'), F.orderBy('createdAt', 'desc'), F.limit(3000)));
      snap.forEach(d => { const r = d.data(); (this.reviews[r.spotId] = this.reviews[r.spotId] || []).push({ ...r, id: d.id, date: r.createdAt && r.createdAt.toDate ? r.createdAt.toDate() : new Date() }); });
      this.set({ reviewsOn: true });
    } catch (e) { console.warn('Reviews unavailable', e); }
  }
  // ── About 탭의 피드백 폼: Firestore "feedback" 컬렉션에 쓰기만 (읽기는 Firebase 콘솔에서만, firestore.rules 참고) ──
  async sendFeedback() {
    const d = this.fbDraft, message = (d.message || '').trim();
    if (d.website) return this.set({ feedbackSent: true, feedbackMsg: '' });   // 봇이 채우는 숨은 칸
    if (!message) return this.set({ feedbackMsg: 'Please write a short message first.' });
    this.set({ feedbackBusy: true, feedbackMsg: '' });
    try {
      // Firebase는 첫 화면 뒤에 불러와요. 아직이면 잠깐 기다려요
      for (let i = 0; !this.fb && i < 40; i++) await new Promise(r => setTimeout(r, 200));
      if (!this.fb) throw new Error('Firebase not ready');
      const F = this.fb.F;
      await F.addDoc(F.collection(this.fb.db, 'feedback'), {
        type: ['wrong', 'place', 'idea'].includes(d.type) ? d.type : 'idea',
        place: (d.place || '').trim().slice(0, 100), message: message.slice(0, 1000), email: (d.email || '').trim().slice(0, 100),
        createdAt: F.serverTimestamp(),
      });
      this.fbDraft = {};
      this.set({ feedbackBusy: false, feedbackSent: true });
    } catch (e) { console.warn('Feedback failed', e); this.set({ feedbackBusy: false, feedbackMsg: "Sorry, it didn't send. Please try again in a moment." }); }
  }
  aboutView() {
    const d = this.fbDraft, { feedbackBusy, feedbackMsg, feedbackSent } = this.state;
    const field = 'mt-1 w-full min-h-[40px] sm:min-h-[44px] px-3 py-1.5 sm:py-2 rounded-xl border border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500';
    const types = [['wrong', 'Something’s wrong (hours, details, a closed place)'], ['place', 'Suggest a place'], ['idea', 'An idea or other feedback']];
    return `
    <section class="mt-5 sm:mt-8 max-w-2xl mx-auto">
      <h2 class="text-xl sm:text-3xl font-extrabold tracking-tight">Hello, fellow parents! <span aria-hidden="true">👋</span></h2>
      <div class="mt-3 sm:mt-4 space-y-2.5 sm:space-y-4 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200">
        <p>I’m a dad in Vancouver, and our weekends used to start with the same question: <em>where should we take the kids today?</em> I was tired of a dozen open tabs, so I started Tiny Trips: playgrounds, spray parks, farms, libraries, rainy-day hideouts and more around Metro Vancouver and the Fraser Valley, all in one spot.</p>
        <p>Most places here are rated 4.0 or higher on Google, so you’re seeing spots lots of parents have already tried and loved. It’s still a work in progress, so if you spot a mistake or know a great place that’s missing, please send me a note below.</p>
        <p class="font-semibold">Have fun out there! — A Vancouver dad</p>
      </div>
    </section>
    <section id="feedback" class="mt-6 sm:mt-10 max-w-2xl mx-auto rounded-2xl p-4 sm:p-6 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
      <h3 class="text-base sm:text-xl font-bold">Send feedback</h3>
      ${feedbackSent ? `
      <p class="mt-3 text-sm sm:text-base text-slate-700 dark:text-slate-200" role="status">Thank you so much! Your note is on its way. <span aria-hidden="true">💜</span></p>
      <button data-act="fbagain" class="mt-4 min-h-[44px] px-4 rounded-xl font-semibold border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200">Send another</button>` : `
      <p class="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">Wrong hours, a place that closed, a spot we should add, or anything else. I read every one.</p>
      <form data-act="feedback" class="mt-4 space-y-3 sm:space-y-4">
        <label class="block text-xs sm:text-sm font-semibold">What’s it about?
          <select name="type" class="${field}">${types.map(([v, l]) => `<option value="${v}" ${(d.type || 'wrong') === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        </label>
        <label class="block text-xs sm:text-sm font-semibold">Place name <span class="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
          <input name="place" maxlength="100" value="${esc(d.place || '')}" class="${field}" placeholder="e.g. Mundy Park">
        </label>
        <label class="block text-xs sm:text-sm font-semibold">Your message
          <textarea name="message" required maxlength="1000" rows="3" class="${field}" placeholder="Tell me what you noticed or what you’d like to see">${esc(d.message || '')}</textarea>
        </label>
        <label class="block text-xs sm:text-sm font-semibold">Email <span class="font-normal text-slate-500 dark:text-slate-400">(optional, for a reply. Never shown on the site)</span>
          <input name="email" type="email" maxlength="100" value="${esc(d.email || '')}" class="${field}" autocomplete="email">
        </label>
        <input name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="hidden">
        ${feedbackMsg ? `<p class="text-sm text-rose-700 dark:text-rose-300" role="status">${esc(feedbackMsg)}</p>` : ''}
        <button type="submit" ${feedbackBusy ? 'disabled aria-busy="true"' : ''} class="min-h-[40px] sm:min-h-[48px] px-5 sm:px-6 text-sm sm:text-base rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-60">${feedbackBusy ? 'Sending…' : 'Send feedback'}</button>
      </form>`}
    </section>`;
  }
  reviewStats(id) {
    const list = (this.reviews && this.reviews[id]) || [];
    return list.length ? { n: list.length, avg: list.reduce((a, r) => a + r.rating, 0) / list.length } : null;
  }
  // 구글 로그인: 팝업 창 → 팝업이 막히거나 바로 닫히는 환경(앱 안 브라우저, 일부 휴대폰)에선 구글 페이지로 이동했다 돌아오는 방식
  async reviewSignIn() {
    const A = this.fb.A, provider = new A.GoogleAuthProvider();
    try { await A.signInWithPopup(this.fb.auth, provider); }
    catch (e) {
      const code = (e && e.code) || '';
      if (/popup-blocked|popup-closed-by-user|cancelled-popup-request|operation-not-supported|web-storage-unsupported/.test(code)) {
        try { sessionStorage.setItem('spotmate-review-spot', this.state.modal || ''); } catch (x) {}
        try { return await A.signInWithRedirect(this.fb.auth, provider); } catch (e2) { e = e2; }
      }
      this.set({ reviewMsg: `Sign-in didn't finish (${(e && e.code) || 'unknown error'}). Try again, or open the site in Chrome or Safari.` });
    }
  }
  async reviewPost(spotId) {
    const { user, reviewDraft: d } = this.state;
    if (!user || !d || !d.rating) return this.set({ reviewMsg: 'Pick 1 to 5 stars first.' });
    const text = (d.text || '').trim().slice(0, REVIEW_MAX), F = this.fb.F, id = `${spotId}_${user.uid}`;
    this.set({ reviewBusy: true, reviewMsg: '' });
    try {
      await F.setDoc(F.doc(this.fb.db, 'reviews', id), { spotId, uid: user.uid, name: user.name, rating: d.rating, text, createdAt: F.serverTimestamp() });
      const list = (this.reviews[spotId] || []).filter(r => r.id !== id);
      this.reviews[spotId] = [{ id, spotId, uid: user.uid, name: user.name, rating: d.rating, text, date: new Date() }, ...list];
      this.set({ reviewBusy: false, reviewDraft: null, reviewMsg: 'Thanks! Your review is up.' });
    } catch (e) { this.set({ reviewBusy: false, reviewMsg: "Couldn't save your review. Try again." }); }
  }
  async reviewDelete(spotId) {
    const { user } = this.state; if (!user) return;
    const id = `${spotId}_${user.uid}`;
    try { await this.fb.F.deleteDoc(this.fb.F.doc(this.fb.db, 'reviews', id)); this.reviews[spotId] = (this.reviews[spotId] || []).filter(r => r.id !== id); this.set({ reviewMsg: 'Review deleted.', reviewDraft: null }); }
    catch (e) { this.set({ reviewMsg: "Couldn't delete it. Try again." }); }
  }
  // 모달 안 "Parent reviews" 칸: 평균 별점, 리뷰 목록, 쓰기(로그인 필요)
  reviewSection(s) {
    if (!this.state.reviewsOn) return '';
    const list = this.reviews[s.id] || [], st = this.reviewStats(s.id), { user, reviewDraft, reviewBusy, reviewMsg } = this.state;
    const mine = user && list.find(r => r.uid === user.uid);
    const d = reviewDraft && reviewDraft.id === s.id ? reviewDraft : null;
    const stars = n => `<span class="text-amber-500" aria-label="${n} out of 5 stars">${'★'.repeat(n)}<span class="text-slate-300 dark:text-slate-600">${'★'.repeat(5 - n)}</span></span>`;
    const form = d ? `
            <div class="mt-3 rounded-xl p-4 ring-1 ring-slate-200 dark:ring-slate-700">
              <div class="flex items-center gap-1" role="radiogroup" aria-label="Your rating">${[1, 2, 3, 4, 5].map(n => `<button data-act="rvstar" data-val="${n}" role="radio" aria-checked="${d.rating === n}" aria-label="${n} star${n > 1 ? 's' : ''}" class="text-3xl leading-none ${n <= (d.rating || 0) ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}">★</button>`).join('')}</div>
              <textarea data-act="rvtext" maxlength="${REVIEW_MAX}" rows="3" placeholder="What did your kids like? Anything parents should know (washrooms, stroller access, busy times)?" class="mt-3 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">${esc(d.text || '')}</textarea>
              <div class="mt-2 flex flex-wrap items-center gap-3">
                <button data-act="rvpost" data-val="${s.id}" ${reviewBusy ? 'disabled' : ''} class="min-h-[40px] px-4 rounded-lg font-semibold bg-violet-600 text-white disabled:opacity-60">${reviewBusy ? 'Posting…' : mine ? 'Update review' : 'Post review'}</button>
                <button data-act="rvcancel" class="text-sm underline text-slate-600 dark:text-slate-300">Cancel</button>
                <span class="text-xs text-slate-500 dark:text-slate-400">Shown with your first name.</span>
              </div>
            </div>` : '';
    return `
          <section id="reviews" class="scroll-mt-4">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h3 class="font-bold">Parent reviews</h3>
              ${st ? `<p class="text-sm">${stars(Math.round(st.avg))} <span class="font-semibold">${st.avg.toFixed(1)}</span> <span class="text-slate-500 dark:text-slate-400">· ${plural(st.n, 'review')}</span></p>` : ''}
            </div>
            ${!d ? `<div class="mt-2 flex flex-wrap items-center gap-3 text-sm">
              ${user ? `<button data-act="rvwrite" data-val="${s.id}" class="min-h-[40px] px-4 rounded-lg font-semibold border border-violet-300 text-violet-700 dark:border-violet-500/50 dark:text-violet-300">${mine ? 'Edit your review' : 'Write a review'}</button>
              ${mine ? `<button data-act="rvdelete" data-val="${s.id}" class="underline text-slate-600 dark:text-slate-300">Delete</button>` : ''}
              <button data-act="rvsignout" class="underline text-slate-500 dark:text-slate-400">Sign out (${esc(user.name)})</button>`
              : `<button data-act="rvsignin" class="min-h-[40px] px-4 rounded-lg font-semibold border border-violet-300 text-violet-700 dark:border-violet-500/50 dark:text-violet-300">Sign in with Google to write a review</button>`}
            </div>` : ''}
            ${form}
            ${reviewMsg ? `<p class="mt-2 text-sm text-slate-600 dark:text-slate-300" role="status">${esc(reviewMsg)}</p>` : ''}
            ${list.length ? `<ul class="mt-4 space-y-3">${list.slice(0, 20).map(r => `
              <li class="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60">
                <p class="text-sm">${stars(r.rating)} <span class="font-semibold">${esc(r.name)}</span> <span class="text-xs text-slate-500 dark:text-slate-400">· ${esc(`${MON[r.date.getMonth()]} ${r.date.getDate()}, ${r.date.getFullYear()}`)}</span></p>
                ${r.text ? `<p class="mt-1 text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">${esc(r.text)}</p>` : ''}
              </li>`).join('')}</ul>` : '<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">No reviews yet. Be the first parent to share how it went.</p>'}
          </section>`;
  }

  async loadWeather() {
    try {
      const res = await fetch(WEATHER_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const { current, daily } = await res.json();
      const live = { kind: weatherKind(current.weather_code), desc: weatherDesc(current.weather_code), icon: weatherIcon(current.weather_code, current.is_day !== 0), temp: Math.round(current.temperature_2m) };
      // 날짜별 예보 (주말 계획용): { 'YYYY-MM-DD': { kind, desc, icon, max, pop } }
      const forecast = {};
      if (daily && daily.time) daily.time.forEach((d, i) => {
        const code = daily.weather_code[i];
        forecast[d] = { kind: weatherKind(code), desc: weatherDesc(code), icon: weatherIcon(code, true), max: Math.round(daily.temperature_2m_max[i]), pop: daily.precipitation_probability_max[i] };
      });
      this.set({ live, weather: live.kind, forecast });
    } catch (e) {
      // 날씨를 못 가져와도 앱은 그대로 쓸 수 있어요. 날씨는 AI 추천 문구에만 쓰여요.
    }
  }

  set(patch) {
    // 목록이 바뀌는 필터를 건드리면 "Show more"로 늘린 개수를 처음으로 되돌려요
    if (['cat', 'view', 'tag', 'cuisine', 'price', 'hh', 'lunch', 'sort', 'nearKey', 'radius', 'kidsOnly', 'indoor', 'openNow', 'when'].some(k => k in patch && patch[k] !== this.state[k])) patch.restShown = REST_STEP;
    Object.assign(this.state, patch); this.render();
  }

  // 첫 방문 때 있던 스팟은 기준(0)으로, 그 뒤 새로 생긴 스팟은 처음 본 날짜로 기록해요.
  // 처음 본 지 NEW_DAYS일이 안 된 스팟 id를 돌려줘요 (첫 방문이면 비어 있어요)
  trackSeen() {
    let seen = null;
    try { seen = JSON.parse(load('spotmate-seen') || 'null'); } catch (e) {}
    const first = !seen || typeof seen !== 'object', today = vanDate(0);
    if (first) seen = {};
    SPOTS.forEach(s => { if (!(s.id in seen)) seen[s.id] = first ? 0 : today; });
    store('spotmate-seen', JSON.stringify(seen));
    const cutoff = vanDate(-NEW_DAYS);
    // 한 번에 30곳 넘게 새로 생기면(데이터를 크게 늘린 경우) "새로 생긴 곳"으로 치지 않아요 (카드 수백 개에 New가 붙고 맨 앞을 차지하지 않게)
    const fresh = SPOTS.filter(s => seen[s.id] && seen[s.id] > cutoff).map(s => s.id);
    return new Set(fresh.length > 30 ? [] : fresh);
  }
  // 행사 장소(venue)는 행사가 있을 때만 잠깐 뜨는 곳이라 "New"로 치지 않아요
  isNew(s) { return !s.venue && !!(this.newIds && this.newIds.has(s.id)); }
  // "지금 가 볼 이유": 이 장소에서 곧 열리는 행사 > 시즌(단풍·연어·핼러윈 등) > 평소보다 많이 검색됨.
  // 매주 열리는 파머스 마켓은 언제든 있는 일이라 점수를 조금만 줘요. 이유가 강한 순서로 돌려줘요.
  // 이유 박스 제목: 시즌 행사(호박밭 등)는 고른 해시태그(없으면 그 곳의 첫 태그) 이름으로, 나머지는 행사 종류로
  eventTitle(ev, s) {
    const tags = spotTags(s), t = tags.find(x => x.id === this.state.tag) || (ev.type === 'seasonal' ? tags[0] : null);
    return t ? tagLabel(t) : eventLabel(ev);
  }
  nowReasons(s) {
    const out = [], e = this._spotEvents && this._spotEvents[s.id];
    if (e) {
      const days = Math.round((Date.parse(e.next) - Date.parse(vanDate(0))) / 864e5);
      out.push({ score: e.ev.type === 'market' ? 0.5 : 4 - Math.min(days, 3) * 0.3, label: this.eventTitle(e.ev, s), icon: e.ev.icon || '🎪', text: eventReason(e.ev, s, e.next) });
    }
    // 시즌: 스팟별 start(단풍 절정·첫 연어·개막일)가 지났으면 "지금" 2.5, 아직이면 예고라 0.5 (그것만으로는 순위 X, 닫힌 Playland가 순위에 오르지 않게)
    // 새로 연 곳: 연 지 1개월 안이면 2.5, 3개월 안이면 2, 그 뒤 6개월까지 1.2
    if (isJustOpened(s)) {
      const months = (Date.now() - openedDate(s).getTime()) / (30.4 * 864e5);
      out.push({ score: months <= 1.5 ? 2.5 : months <= 3.5 ? 2 : 1.2, label: 'New spot', icon: '🆕', text: `Opened in ${openedLabel(s)} and already rated 4.9+ on Google (30+ reviews).` });
    }
    spotTags(s).forEach(t => {
      const x = t.spots[s.id], wait = x.start ? Math.round((Date.parse(x.start) - Date.parse(vanDate(0))) / 864e5) : 0;
      out.push({ score: wait <= 0 ? 2.5 : 0.5, label: tagLabel(t), icon: t.emoji, text: x.why });
    });
    // 먹거리가 최근 기사(30일)나 Reddit(2주)에 나왔으면 "요즘 화제"
    if (s.cat === 'food' || s.cat === 'dessert') {
      const p = recentPress(s)[0], r = recentReddit(s)[0];
      if (p) out.push({ score: 1.5, icon: '📰', label: 'In the news', text: `${p.outlet}: “${p.title}” (${shortDate(p.date)})` });
      else if (r) out.push({ score: 1.1, icon: '💬', label: 'Talked about lately', text: `On r/${r.sub}: “${r.title}” (${shortDate(r.date)})` });
    }
    // 시간대·날씨 이유는 가장 강한 하나만 (둘이 겹쳐 점수가 부풀지 않게). 내일·주말 계획일 땐 "지금" 이유라 빼요
    const food = this.planLater() ? null : this.foodNow(s).sort((a, b) => b.score - a.score)[0];
    if (food) out.push(food);
    if (isRising(s)) out.push({ score: 1 + Math.min(s.rise - 1, 1) * 2, label: 'Trending', icon: '📈', text: (RISE_NOTES[s.id] && RISE_NOTES[s.id].why) || `Searched ${fmtRise(s.rise)} its usual amount` });
    return out.sort((a, b) => b.score - a.score);
  }
  // 모달의 해피아워·런치 스페셜 칸: 오늘 상태(지금·이따·오늘 없음) → 요일별 시간 → 가격·딜 → 메모와 출처
  dealSection(st, c, meta) {
    const T = {
      amber: { box: 'bg-amber-50 dark:bg-amber-500/10 ring-amber-200 dark:ring-amber-500/25', h: 'text-amber-900 dark:text-amber-200', on: 'bg-amber-500', chip: 'text-amber-900 ring-amber-200 dark:text-amber-200 dark:ring-amber-500/30' },
      emerald: { box: 'bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/25', h: 'text-emerald-900 dark:text-emerald-200', on: 'bg-emerald-600', chip: 'text-emerald-900 ring-emerald-200 dark:text-emerald-200 dark:ring-emerald-500/30' },
    }[c];
    const status = st.active ? `On now${st.until ? ` · until ${st.until}` : ''}` : st.next ? `Today ${hhRange(st.next)}` : 'Not today';
    return `
          <section class="rounded-2xl p-5 ring-1 ${T.box}">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="font-bold ${T.h}">${esc(st.label)}${st.h.price ? ` <span class="font-semibold text-slate-600 dark:text-slate-300">· ${esc(st.h.price)}</span>` : ''}</h3>
              <span class="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md ${st.active ? `${T.on} text-white` : st.next ? 'bg-white text-slate-800 ring-1 ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-600' : 'bg-white/70 text-slate-600 dark:bg-slate-900 dark:text-slate-400'}">${st.active ? '<span class="w-2 h-2 rounded-full bg-white animate-pulse" aria-hidden="true"></span>' : ''}${esc(status)}</span>
            </div>
            <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              ${hhSchedule(st.h).map(g => `<dt class="font-semibold text-slate-700 dark:text-slate-200">${esc(g.days)}</dt><dd class="text-slate-800 dark:text-slate-100">${esc(g.times)}</dd>`).join('')}
            </dl>
            ${st.h.deals && st.h.deals.length ? `<ul class="mt-3 flex flex-wrap gap-1.5">${st.h.deals.map(d => `<li class="text-xs font-semibold px-2 py-1 rounded-full bg-white ring-1 dark:bg-slate-900 ${T.chip}">${esc(d)}</li>`).join('')}</ul>` : ''}
            ${st.h.note ? `<p class="mt-2 text-sm text-slate-700 dark:text-slate-300">${esc(st.h.note)}</p>` : ''}
            ${st.h.w.some(w => w.approx) ? '<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Exact lunch hours not posted, so call ahead.</p>' : ''}
            <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Checked ${esc(shortDate(meta.updatedAt))}${/^https?:\/\//.test(st.h.source || '') ? ` · <a href="${esc(st.h.source)}" target="_blank" rel="noopener" class="underline">Source ↗</a>` : ''}. Deals change often, so confirm with the restaurant.</p>
          </section>`;
  }
  // 먹거리(음식점·카페)만: 지금 열려 있고 시간대나 날씨에 맞으면 "지금 먹기 좋은 이유"
  // 아침(6:30–11:30, 8:30에 여는 곳) · 심야(9pm 이후, 11:30pm에도 여는 곳) · 비/12°C 이하엔 국물 · 맑고 18°C 이상엔 아이스크림·파티오
  foodNow(s) {
    if (s.cat !== 'food' && s.cat !== 'dessert') return [];
    const oi = openInfo(s);
    // 해피아워 중이면 가장 강한 "지금" 이유 (퇴근길에 제일 궁금한 정보라서)
    const hh = hhState(s);
    const happy = hh && hh.active && (!oi || oi.open) ? [{ score: 1.4, icon: '⏰', label: `${hh.label} now`, hh: true,
      text: `Until ${hh.until}${hh.h.deals && hh.h.deals.length ? `: ${hh.h.deals.slice(0, 2).join(', ')}` : ''}` }] : [];
    // 런치 스페셜 중이면 그다음으로 강한 이유 (점심시간 직장인용)
    const lu = lunchState(s);
    if (lu && lu.active && (!oi || oi.open)) happy.push({ score: 1.35, icon: '⏰', label: `${lu.label} now`, lunch: true,
      text: [lu.until ? `Until ${lu.until}` : 'At lunch', lu.h.price, lu.h.deals && lu.h.deals[0]].filter(Boolean).join(' · ') });
    if (!oi || !oi.open) return happy;
    const now = vanWallClock(), hr = now.getHours() + now.getMinutes() / 60, live = this.state.live;
    // "closes Tue 2am"처럼 자정을 넘기면 요일을 빼고, 12am은 midnight으로
    const m = / closes (.+)$/.exec(oi.text), close = m && m[1].replace(/^[A-Z][a-z]{2} /, '').replace(/^12am$/, 'midnight');
    const until = close ? `, open until ${close}` : '';
    const out = [], add = (score, text) => out.push({ score, icon: '⏰', label: 'Good right now', text });
    const t = `${s.name} ${s.summary}`;
    if (live && (live.kind === 'rain' || live.temp <= 12) && (HOT_FOOD.test(t) || s.cuisine === 'Vietnamese'))
      add(1.3, `${live.kind === 'rain' ? 'Rainy' : 'Chilly'} and ${live.temp}°C: good weather for ${hotDish(s)}${until}`);
    if (live && live.kind === 'sunny' && live.temp >= 18 && SUNNY_FOOD.test(t))
      add(1.3, `Sunny and ${live.temp}°C: ${/ice cream|gelato|froyo|yogurt|soft serve|shaved ice|bingsu/i.test(t) ? 'ice cream weather' : 'a good day to eat outside'}${until}`);
    // 아침: 아침·브런치·베이커리 성격의 곳만 (아침부터 열 뿐인 펍·체인은 빼요), 한 시간 넘게 더 열 때
    if (hr >= 6.5 && hr < 11.5 && openAt(s, 8) && openAt(s, Math.floor(hr) + 1) !== false
      && (s.cuisine === 'Brunch & Café' || s.cat === 'dessert' || BREAKFAST_FOOD.test(t))) add(1.2, `${s.cat === 'dessert' ? 'Open now for morning coffee' : 'Open now for breakfast'}${until}`);
    if ((hr >= 21 || hr < 3) && (hr < 3 || openAt(s, 23))) add(1.2, `Open late tonight${until}`);
    return [...happy, ...out];
  }
  // Tiny Trips tip 중 화면에 아직 안 나온 줄만 (where: 'card'면 카드의 설명·이유·행사 줄, 'modal'이면 장소 창의 Why go now·설명과 비교)
  tipItems(s, where) {
    const n = NOTES[s.id]; if (!n) return [];
    // 장소 창은 카드에 보이는 팁을 항상 포함해요 (카드엔 있는데 창엔 없는 일이 없게). 카드 팁을 맨 앞에, 창에서만 걸러지지 않은 줄을 뒤에 (2026-10-04)
    if (where === 'modal') { const cardTips = this.tipItems(s, 'card'), rest = this.tipItems(s, 'modalOnly'); return [...cardTips, ...rest.filter(x => !cardTips.includes(x))]; }
    const texts = [s.summary];
    const reasons = this.nowReasons(s);
    if (where === 'card') { const why = reasons.filter(x => x.score >= NOW_MIN)[0]; if (why) texts.push(why.text); const e = this._spotEvents && this._spotEvents[s.id]; if (e) texts.push(eventReason(e.ev, s, e.next)); }
    else {
      texts.push(...reasons.map(x => x.text));
      EVENTS.filter(ev => ev.spotId === s.id).forEach(ev => texts.push(ev.name, eventHours(ev), eventWhen(ev), ev.summary || ''));
      spotTags(s).forEach(t => texts.push(t.spots[s.id].why));
    }
    const seen = new Set(texts.flatMap(t => [...keyWords(t)]));
    return n.items.filter(x => !overlapsSeen(x, seen));
  }
  // 날짜 계획이 오늘이 아닌 날(내일·주말)을 가리키는지. 그럴 땐 "지금 영업·지금 해피아워" 대신 그날 기준으로 보여줘요
  planLater() {
    const ds = whenDates(this.state.when);
    return ds.length > 0 && !(ds.length === 1 && ds[0] === vanDate(0));
  }
  // 날짜 계획의 그날(들) 영업시간 한 줄: { text, open } 또는 null(모름). 이틀이 같으면 한 번만 ("Sat–Sun 10am–5pm")
  planHours(s) {
    const ds = whenDates(this.state.when), hs = ds.map(d => dayHours(s, d));
    if (hs.every(h => h == null)) return null;
    const day = d => d === vanDate(1) && ds.length === 1 ? 'Tomorrow' : DOW[dowOf(d)];
    const text = hs.length === 2 && hs[0] === hs[1] ? `${day(ds[0])}–${day(ds[1])} ${hs[0]}` : ds.map((d, i) => `${day(d)} ${hs[i] == null ? 'hours unknown' : hs[i]}`).join(' · ');
    return { text, open: hs.some(h => h && h !== 'Closed') };
  }
  // 10곳을 채우려고 넣은 곳의 카드 이유: 곧 있을 일(약한 이유)이 있을 때만. 클래식·리뷰 추천은 배지와 모달에서 설명해요
  pickReason(s) {
    const weak = this.nowReasons(s)[0];
    return weak ? { pick: true, label: weak.label || 'Why now', text: weak.text } : null;
  }
  // Worth going now(정렬 값 fresh) 순서: 새로 생긴 곳 → 지금 가 볼 이유가 있는 곳(점수 높은 순, 순위 번호) → 숨은 명소 → 나머지(언제 가도 같은 곳)
  freshRank(s) {
    if (this.isNew(s)) return 0;
    if (s.now >= NOW_MIN) return 1;
    return isVanClassic(s) ? 2 : 3;
  }
  // 카드·지도·모달에 보여줄 순위 번호: Worth going now 정렬에서만, 지금 가 볼 이유 순위
  // 키워드 검색 결과는 관련도 순이라 순위 번호를 달지 않아요 (두 번째 카드에 #1이 붙지 않게)
  // 순위 번호는 없앴어요 (2026-10-02, 사용자 결정). 정렬 "Worth going now"만 남아요
  rankOf(s) { return null; }
  rankLabel(s) { return `#${s.freshNo}`; }


  // ── 데이터 ──
  list() {
    const { cat, sort, radius } = this.state;
    if (cat === 'events') return [];
    const origin = this.origin();
    // "Indoor": 비 오는 날용. 실내와 실내+야외(both) 장소만 남겨요.
    // Indoor·Kids 필터는 장소용이라 Eats 페이지에서는 적용하지 않아요
    const eats = this.state.view === 'eats';
    let items = SPOTS.filter(s =>
      (cat === 'all' ? !PAGES[this.state.view] || PAGES[this.state.view].includes(s.cat) : s.cat === cat)
      && (eats || !this.state.indoor || s.env !== 'outdoor') && (eats || !(this.state.kidsOnly || KIDS_ONLY) || isKid(s))
      // 행사 장소(Pacific Coliseum, 컨벤션센터, 마켓이 열리는 공원 등)는 7일 안에 그곳 행사가 있을 때만
      && (!s.venue || !!(this._spotEvents && this._spotEvents[s.id]))
      && (!this.state.guide || this.state.guide.set.has(s.id)))
      .map(s => ({ ...s, dist: origin ? km(origin, s) : null }));
    // 위치 필터가 켜져 있으면 반경 안의 스팟만 남기고, 순위도 그 안에서 다시 매겨요
    // 지역(도시)을 골랐으면 반경 밖이어도 그 도시 이름이 지역에 있는 곳은 넣어요 (Burke Mountain, Coquitlam 등 넓은 도시)
    if (this.nearActive() && radius !== 'any') {
      const o = ORIGINS[this.state.nearKey], inArea = o ? new RegExp(`(^|[(,] ?)${o.label}\\b`, 'i') : null;
      items = items.filter(s => s.dist <= radius || (inArea && inArea.test(s.area || '')));
    }
    // 가격대 (Eats만): $ · $$ · $$$+($$$와 $$$$). 가격을 모르는 곳은 숨기고 개수만 세어 둬요
    this._priceUnknown = 0;
    if (eats && this.state.price) {
      this._priceUnknown = items.filter(s => !s.price).length;
      items = items.filter(s => s.price && (this.state.price === '$$$' ? s.price.length >= 3 : s.price === this.state.price));
    }
    // 검색 키워드: 이름·설명·메뉴에 하나라도 맞는 곳만. "무료"는 Explore에서 입장료 없는 곳만
    if (this.state.kw.length) {
      // 관련도: 이름·음식 종류에 있으면 3, 설명에 있으면 2, 메뉴·팁에만 있으면 1 (메뉴에 "sushi cone"이 있는 체인보다 스시집이 먼저)
      items.forEach(s => { s.kwScore = this.state.kw.reduce((sc, k) => sc + (k.re.test(s.name) || k.re.test(s.cuisine || '') ? 3 : k.re.test(s.summary) ? 2 : k.re.test(searchText(s)) ? 1 : 0), 0); });
      items = items.filter(s => s.kwScore > 0);
    }
    if (this.state.free && !eats) items = items.filter(s => /^free/i.test(s.price || ''));
    // 해피아워·런치 스페셜 (Eats): 버튼에 "지금 N곳"을 보여주고, 켜면 지금 하거나 오늘 이따 시작하는 곳만
    this._hhNow = 0; this._lunchNow = 0;
    if (eats) {
      const today = st => st && (st.active || st.next);
      // 날짜 계획(내일·주말)이면 "지금 N곳"은 세지 않고, 켜면 그날 딜이 있는 곳만
      const later = this.planLater(), ds = later ? whenDates(this.state.when) : null;
      this._hhNow = later ? 0 : items.filter(s => (hhState(s) || {}).active).length;
      this._lunchNow = later ? 0 : items.filter(s => (lunchState(s) || {}).active).length;
      if (this.state.hh) items = items.filter(s => later ? dealOnDays(HAPPY[s.id], ds) : today(hhState(s)));
      if (this.state.lunch) items = items.filter(s => later ? dealOnDays(LUNCH[s.id], ds) : today(lunchState(s)));
    }
    // 음식 종류: 드롭다운 개수는 위치·가격·Open now 필터를 먼저 적용한 뒤, 음식 종류를 고르기 전 기준으로 세요
    this._cuisineCounts = {};
    if (cat === 'food') {
      const openOk = s => !(this.state.openNow && HOURS_READY) || (openInfo(s) || {}).open === true;
      items.forEach(s => { if (s.cuisine && openOk(s)) this._cuisineCounts[s.cuisine] = (this._cuisineCounts[s.cuisine] || 0) + 1; });
      if (this.state.cuisine) items = items.filter(s => s.cuisine === this.state.cuisine);
    }
    // 시즌 태그 필터: 칩에 보여줄 개수는 태그를 고르기 전 목록 기준
    this._tagCounts = Object.fromEntries(activeTags().map(t => [t.id, items.filter(s => t.spots[s.id]).length]));
    this._tagCounts.justopened = items.filter(isJustOpened).length;
    const tag = activeTags().find(t => t.id === this.state.tag);
    if (tag) items = items.filter(s => tag.spots[s.id]);
    if (this.state.tag === 'justopened') items = items.filter(isJustOpened);
    // "Know it"으로 숨긴 곳은 빼고 개수만 세어 둬요

    // "Open now": 지금 열려 있는 곳만. 닫혔거나 영업시간을 모르는 곳은 개수만 세어 둬요
    this._hidden = { closed: 0, unknown: 0 };
    if (this.state.openNow && HOURS_READY) {
      items = items.filter(s => {
        const o = openInfo(s);
        if (!o) { this._hidden.unknown++; return false; }
        if (!o.open) { this._hidden.closed++; return false; }
        return true;
      });
    }
    // 날짜 계획: 그날(들) 모두 문을 닫는 곳은 빼고 개수만 세어 둬요 (영업시간을 모르는 곳은 남겨요)
    if (this.state.when && HOURS_READY) {
      const ds = whenDates(this.state.when);
      items = items.filter(s => {
        const closed = ds.every(d => closedOn(s, d));
        if (closed) this._hidden.closed++;
        return !closed;
      });
    }
    // 순위와 "뜨는 곳" 판단은 평소 대비 증가율(rise)만 써요. 같은 그룹 안에서는 데이터 순서대로.
    if (sort === 'fresh') {
      items.forEach(s => {
        s.now = this.nowReasons(s).reduce((x, r) => x + r.score, 0);
        // "지금" 추천이라, 지금 닫혀 있고 곧(먹거리 30분, 장소 1시간) 열지 않으면 점수를 반으로 (밤에 닫힌 미술관이 1위가 되지 않게)
        if (s.now > 0 && !this.planLater()) { const oi = openInfo(s), soon = s.cat === 'food' || s.cat === 'dessert' ? 0.5 : 1; if (oi && !oi.open && !opensWithin(s, soon)) s.now /= 2; }
      });
      // 점수가 같으면 (예: 심야에 여는 펍 여러 곳) 밴쿠버 클래식 → 가까운 곳(위치를 골랐을 때) → 검색 증가 순
      items.sort((a, b) => this.freshRank(a) - this.freshRank(b) || b.now - a.now
        || isVanClassic(b) - isVanClassic(a) || (a.dist ?? 0) - (b.dist ?? 0) || (b.rise ?? 0) - (a.rise ?? 0));
    }
    if (sort === 'distance') items.sort((a, b) => a.dist - b.dist);
    // Worth going now 순위: 지금 가 볼 이유가 있는 곳에만 목록 순서대로 번호를 매겨요
    if (sort === 'fresh') {
      // "지금 먹기 좋은" 이유(시간대·날씨)만 있는 곳은 TOP_N위 안에서만 순위를 받아요 (아침엔 브런치집이 수십 곳이라)
      let n = 0; items.forEach(s => {
        s.filler = false;
        s.overflow = this.freshRank(s) === 1 && n >= TOP_N && this.nowReasons(s).filter(r => r.score >= NOW_MIN).every(r => r.label === 'Good right now' || r.hh || r.lunch);
        s.freshNo = this.freshRank(s) === 1 && !s.overflow ? ++n : null;
      });
      // 이유가 있는 곳이 TOP_N곳이 안 되면 (Indoor·Kids 필터 등) 추천할 만한 곳으로 TOP_N곳까지 채워요:
      // 약한 이유(곧 시작하는 시즌·마켓)가 있는 곳 → 클래식·리뷰 추천·아이 동반 → 나머지 (목록 순서 그대로)
      // 채운 곳은 순서에 근거가 없으니 순위 번호를 달지 않고 "Also worth a try"로 보여줘요
      const top = items.filter(s => this.freshRank(s) <= 1).length;
      const rest = items.filter(s => this.freshRank(s) > 1);
      const pickScore = s => (s.now > 0 ? 2 : 0) + (pickOf(s) ? 1 : 0);
      const fill = rest.map((s, i) => [s, i]).sort((a, b) => pickScore(b[0]) - pickScore(a[0]) || a[1] - b[1])
        .slice(0, Math.max(0, TOP_N - top)).map(([s]) => s);
      fill.forEach(s => { s.filler = true; });
      // 채운 곳을 순위 목록 바로 뒤로 옮겨요
      if (fill.length) items = [...items.filter(s => this.freshRank(s) <= 1), ...fill, ...rest.filter(s => !s.filler)];
    }
    // 검색 키워드가 있으면 관련도 높은 곳이 먼저 (같은 관련도 안에서는 위 순서 그대로). 순위 정리가 끝난 뒤에 해요
    if (this.state.kw.length) items.sort((a, b) => b.kwScore - a.kwScore);
    return items;
  }
  // 앞으로 days일 안에 열리는 행사 (위치 필터 적용, 가까운 날짜 → 가까운 거리 순)
  // only: 이 날짜들에 열리는 행사만 (날짜 계획)
  upcomingEvents(days, only) {
    const origin = this.origin(), near = this.nearActive(), { radius } = this.state;
    return EVENTS.map(ev => {
      const dates = only ? upcomingDates(ev, days).filter(d => only.includes(d)) : upcomingDates(ev, days);
      return dates.length ? { ...ev, dates, next: dates[0], dist: origin && ev.lat != null ? km(origin, ev) : null } : null;
    }).filter(Boolean)
      .filter(ev => !near || radius === 'any' || (ev.dist != null && ev.dist <= radius))
      .sort((a, b) => a.next.localeCompare(b.next) || (a.dist ?? 1e9) - (b.dist ?? 1e9));
  }
  // 스팟 id → 7일 안에 그 장소에서 열리는 가장 가까운 행사 (날짜 계획이 있으면 그날 열리는 행사만)
  spotEvents() {
    const map = {}, only = this.state.when ? whenDates(this.state.when) : null;
    EVENTS.forEach(ev => {
      if (!ev.spotId) return;
      const next = upcomingDates(ev, only ? 8 : 7).filter(d => !only || only.includes(d))[0];
      if (next && (!map[ev.spotId] || next < map[ev.spotId].next)) map[ev.spotId] = { ev, next };
    });
    return map;
  }
  nearActive() {
    const { nearKey, origin } = this.state;
    return nearKey === 'here' ? !!origin : !!ORIGINS[nearKey];
  }
  // 거리 계산 기준점. 위치 필터가 꺼져 있어도 거리순 정렬이면 다운타운 기준으로 계산해요
  origin() {
    const { nearKey, origin, sort } = this.state;
    if (nearKey === 'here' && origin) return origin;
    if (ORIGINS[nearKey]) return ORIGINS[nearKey];
    if (sort === 'distance') return ORIGINS.downtown;
    return null;
  }
  originLabel() {
    const o = this.origin();
    return o ? (o.label || 'your location') : '';
  }
  // ── 이벤트 ──
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const { act, val } = el.dataset;
    switch (act) {
      case 'noop': return;
      case 'cat': if (el.tagName === 'SELECT') return; return this.set({ cat: val === 'all' && !hasAll(this.state.view) ? defaultCat(this.state.view) : val });
      case 'retry': return this.loadData();
      case 'view': {
        // 행사·파머스 마켓 탭: 장소 필터와 상관없는 별도 목록
        if (val === 'events' || val === 'markets' || val === 'about') { window.scrollTo({ top: 0 }); return this.set({ view: val, tag: '', q: '', kw: [], free: false, aiSay: '', mapPicks: null }); }
        // 새 페이지에 없는 카테고리를 보고 있었다면 그 페이지의 기본 카테고리로 (Eats는 Food, 나머지는 All)
        const keep = catOptions(val).includes(this.state.cat) || (this.state.cat === 'all' && hasAll(val));
        const cat = keep ? this.state.cat : defaultCat(val);
        // 페이지를 바꾸면 검색은 풀어요 (먹거리 키워드가 Explore 목록을 비우지 않게)
        // 추천 결과(10곳)를 보다가 지도로 가면 그 장소들만 지도에 보여줘요 (mapPicks = 추천 순서대로 id)
        const mapPicks = val === 'map' && this.pickMode() && this.state.wiz.done ? (r => [...r.top, ...r.also].map(s => s.id))(this.wizResults()) : null;
        return this.set({ view: val, cat, tag: '', copyMsg: '', copyText: '', q: '', kw: [], free: false, aiSay: '', mapPicks });
      }
      case 'dark': {
        const dark = !this.state.dark; store('spotmate-dark', dark ? '1' : '0'); return this.set({ dark });
      }
      case 'open': this.opener = this.focusKey(el); return this.openModal(val);
      case 'close': return this.closeModal();
      case 'save': return this.togglePlan(val);
      // 부모 리뷰
      case 'savedtab': return this.set({ savedTab: val === 'reviews' ? 'reviews' : 'saved' });
      case 'rvsignin': return this.reviewSignIn();
      case 'fbagain': return this.set({ feedbackSent: false, feedbackMsg: '' });
      case 'rvsignout': this.fb.A.signOut(this.fb.auth); return this.set({ reviewDraft: null, reviewMsg: '' });
      case 'rvwrite': { const mine = (this.reviews[val] || []).find(r => this.state.user && r.uid === this.state.user.uid); return this.set({ reviewDraft: { id: val, rating: mine ? mine.rating : 0, text: mine ? mine.text : '' }, reviewMsg: '' }); }
      case 'rvstar': return this.set({ reviewDraft: { ...this.state.reviewDraft, rating: +val } });
      case 'rvcancel': return this.set({ reviewDraft: null, reviewMsg: '' });
      case 'rvpost': return this.reviewPost(val);
      case 'rvdelete': return this.reviewDelete(val);
      // 카드의 "Review" 버튼: 장소를 열고 리뷰 칸으로
      case 'rvcard': { this.opener = this.focusKey(el); this.openModal(val); setTimeout(() => { const r = document.getElementById('reviews'); if (r) r.scrollIntoView({ block: 'start' }); }, 50); return; }
      case 'ai': return this.runAI(val);
      case 'aistop': if (this.aiCtl) this.aiCtl.abort(); return;
      case 'geo': return this.locate();
      // Open now는 지금 기준이라, 켜면 다른 날 계획(내일·주말)은 풀어요
      case 'filters': return this.set({ filtersOpen: !this.state.filtersOpen });
      // 단계별 추천: 고르기 → 다음 → … → 결과. 결과에서 칩을 누르면 그 단계로 돌아가요
      // 옵션을 누르면 강조를 잠깐 보여준 뒤 다음 질문으로 넘어가요 (마지막 질문이나 결과에서 고치는 중이면 바로 결과)
      case 'wizopt': {
        const [k, v] = val.split(':'), w = { ...this.state.wiz, ans: { ...this.state.wiz.ans, [k]: v } };
        if (k === 'age') store(AGE_KEY, v);
        this.set({ wiz: w });
        clearTimeout(this.wizTimer);
        this.wizTimer = setTimeout(() => {
          if (this.state.wiz !== w) return;   // 그 사이 다른 걸 눌렀으면 그대로
          if (w.step < WIZ.length - 1 && !w.editing) { this.set({ wiz: { ...w, step: w.step + 1 } }); window.scrollTo({ top: 0 }); }
          else this.wizFinish({ ...w, editing: false });
        }, 250);
        return;
      }
      case 'mapall': return this.set({ mapPicks: null });
      // 지도 위 행사·마켓 핀 켜고 끄기
      case 'evfocus': {   // 지도 목록의 행사·마켓 → 지도에서 그 핀으로 가서 팝업 열기
        const p = this._pins && this._pins['ev:' + val], map = this._leaflet;
        if (p && map) { map.setView(p.mk.getLatLng(), Math.max(map.getZoom(), 13), { animate: true }); p.mk.openPopup(); }
        return;
      }
      case 'mapevents':return this.set({ mapEvents: this.state.mapEvents === false });
      case 'mapmarkets': return this.set({ mapMarkets: this.state.mapMarkets === false });
      case 'mode': return this.set({ browse: val === 'browse', q: '', kw: [], unused: [] });
      // "I'm flexible, show me ideas": 남은 질문을 모두 "상관없음"으로 두고 바로 결과
      // "Anything works for us": 5개 질문 모두 "상관없음"으로 바로 결과
      case 'wizany': {
        const ans = {}; WIZ.forEach(st => { ans[st.key] = 'any'; });
        return this.wizFinish({ ...this.state.wiz, ans, editing: false });
      }
      case 'wizall': {
        const ans = { ...this.state.wiz.ans }; WIZ.forEach(st => { if (!ans[st.key]) ans[st.key] = 'any'; });
        return this.wizFinish({ ...this.state.wiz, ans, editing: false });
      }
      case 'wizback': return this.set({ wiz: { ...this.state.wiz, step: Math.max(0, this.state.wiz.step - 1) } });
      case 'wiznext': {
        const w = this.state.wiz;
        if (!w.ans[WIZ[w.step].key]) return;
        if (w.step < WIZ.length - 1 && !w.editing) return this.set({ wiz: { ...w, step: w.step + 1 } });
        return this.wizFinish({ ...w, editing: false });
      }
      case 'wizedit': return this.set({ wiz: { ...this.state.wiz, step: +val, done: false, editing: true } });
      case 'wizset': { const [k, v] = val.split(':'); return this.wizFinish({ ...this.state.wiz, ans: { ...this.state.wiz.ans, [k]: v } }); }
      case 'wizmore': return this.set({ wizMore: this.state.wizMore + 10 });
      case 'wizreset': return this.set({ wiz: { step: 0, ans: savedAge(), done: false }, wizMore: 10, when: '', tag: '' });
      case 'whenoff': return this.set({ when: '' });
      case 'whenset': return this.set({ when: val, openNow: false });
      case 'opennow': return this.set({ openNow: !this.state.openNow, when: !this.state.openNow && this.planLater() ? '' : this.state.when });
      // 해피아워와 런치 필터는 하나만 (둘 다 켜면 겹치는 곳이 거의 없어서)
      case 'qclear': return this.clearSearch();
      case 'guideclear': return this.set({ guideAll: true, restShown: this.state.guide ? this.state.guide.set.size : REST_STEP });
      case 'qtry': return this.runSearch(val);
      // 알아들은 조건 칩의 ×: 그 조건만 꺼요
      case 'qrm': {
        if (val.startsWith('kw:')) return this.set({ kw: this.state.kw.filter(k => k.key !== val.slice(3)) });
        const off = { when: { when: '' }, now: { openNow: false }, kids: { kidsOnly: false }, indoor: { indoor: false }, free: { free: false }, price: { price: '' }, hh: { hh: false }, lunch: { lunch: false } }[val];
        if (val === 'near') { this.geoToken = (this.geoToken || 0) + 1; return this.set({ nearKey: '', geoMsg: '', geoBusy: false }); }
        return off ? this.set(off) : undefined;
      }
      case 'hh': return this.set({ hh: !this.state.hh, lunch: false });
      case 'lunch': return this.set({ lunch: !this.state.lunch, hh: false });
      case 'price': return this.set({ price: this.state.price === val ? '' : val });
      case 'kids': return this.set({ kidsOnly: !this.state.kidsOnly });
      case 'tag': {
        const tag = this.state.tag === val ? '' : val;
        // 단계별 질문 중에 시즌 태그를 누르면, 안 고른 질문은 "상관없음"으로 두고 그 시즌 장소를 바로 보여줘요
        if (this.pickMode() && !this.state.q && !this.state.wiz.done && tag) {
          const ans = { ...this.state.wiz.ans }; WIZ.forEach(st => { if (!ans[st.key]) ans[st.key] = 'any'; });
          this.state.tag = tag; return this.wizFinish({ ...this.state.wiz, ans });
        }
        return this.set({ tag });
      }
      case 'indoor': return this.set({ indoor: !this.state.indoor });
      case 'radius': {
        const radius = val === 'any' ? 'any' : +val; store('spotmate-radius', String(radius)); this.set({ radius, wizMore: 10 }); return this.wizLocScroll();
      }
      case 'nearoff': this.geoToken = (this.geoToken || 0) + 1; this.set({ nearKey: '', geoMsg: '', geoBusy: false, wizMore: 10 }); return this.wizLocScroll();
      case 'copyplan': return this.copyPlan();
      case 'more': return this.set({ restShown: this.state.restShown + REST_STEP });
      case 'share': return this.share(val);
      case 'shareev': return this.shareEvent(val);
      case 'fxtoggle': return this.set({ fxOn: { ...this.state.fxOn, [val]: !this.state.fxOn[val] }, wizMore: 10 });
      case 'report': { const s = byId(val); this.fbDraft = { type: 'wrong', place: s ? s.name : '' }; this.hideModal(); this.set({ view: 'about', feedbackSent: false, feedbackMsg: '' }); return setTimeout(() => { const t = document.getElementById('feedback'); if (t) t.scrollIntoView({ block: 'start' }); }, 0); }
      case 'clearplan': store('spotmate-plan', '[]'); return this.set({ plan: [], copyMsg: '', copyText: '' });
    }
  }
  onChange(e) {
    const el = e.target;
    if (el.dataset.act === 'sort') this.set({ sort: el.value });
    if (el.dataset.act === 'cat') this.set({ cat: el.value, cuisine: '' });
    if (el.dataset.act === 'cuisine') this.set({ cuisine: el.value });
    // 날짜 계획: 다른 날을 고르면 Open now(지금 기준)는 꺼요
    if (el.dataset.act === 'when') this.set({ when: el.value, openNow: whenDates(el.value).some(d => d !== vanDate(0)) ? false : this.state.openNow });
    if (el.dataset.act === 'near') {
      // 진행 중인 위치 요청이 나중에 도착해도 사용자가 고른 지역을 덮어쓰지 않도록 토큰을 올려요
      this.geoToken = (this.geoToken || 0) + 1;
      if (el.value === 'gps') return this.locate();
      this.set({ nearKey: el.value, geoMsg: '', geoBusy: false, ...this.wizLocPatch(el.value) });
      this.wizLocScroll();
    }
  }
  // 검색창 예시: 날씨(비 오면 실내)와 계절에 맞는 질문. 화면이 좁으면 짧게
  exampleQ() {
    const m = new Date().getMonth() + 1, wide = innerWidth >= 1024, mid = innerWidth >= 640;
    const pick = (long, mid2, short) => wide ? long : mid ? mid2 : short;
    if (this.state.weather === 'rain') return pick('indoor play on a rainy day', 'indoor play on a rainy day', 'indoor play');
    if (m >= 9 && m <= 10) return pick('pumpkin patch this weekend', 'pumpkin patch this weekend', 'pumpkin patch');
    if (m === 11) return pick('salmon run this weekend', 'salmon run this weekend', 'salmon run');
    if (m === 12) return pick('Christmas lights this weekend', 'Christmas lights this weekend', 'Christmas lights');
    if (m <= 2) return pick('skiing in North Vancouver', 'skiing in North Vancouver', 'skiing');
    if (m <= 5) return pick('spring flowers this weekend', 'spring flowers this weekend', 'spring flowers');
    return pick('spray park near me this weekend', 'spray park near me', 'spray park near me');
  }
  // 검색: 질문을 해석해서 기존 필터(페이지·지금 영업·아이·실내·가격·해피아워·런치·가까운 곳)를 켜고, 키워드로 좁혀요
  // AI 주소가 있으면 AI가 먼저 해석하고, 안 되면 규칙으로 (늦게 온 이전 검색 결과는 버려요)
  async runSearch(q) {
    q = q.trim();
    this.qDraft = undefined;
    if (!q) return this.clearSearch();
    const token = this.qToken = (this.qToken || 0) + 1;
    let p = null;
    if (AI_SEARCH_URL) {
      this.qDraft = q;   // 기다리는 동안 다시 그려도 검색창 글이 남게
      this.set({ qBusy: true });
      p = await aiParseQuery(q);
      if (token !== this.qToken) return;
      this.qDraft = undefined;
    }
    const ai = !!p;
    if (!p) p = parseQuery(q);
    // 날짜 계획: "this weekend" · "saturday" · "tomorrow" · "today". 다른 날이면 "now/open"은 그날 영업으로 봐요
    const when = p.when !== undefined ? p.when : p.weekend || (p.sat && p.sun) ? 'weekend' : p.sat ? 'sat' : p.sun ? 'sun' : p.tomorrow ? 'tomorrow' : p.today ? 'today' : '';
    const later = whenDates(when).some(d => d !== vanDate(0));
    // 페이지를 정할 단서가 없으면 보던 페이지에 머물러요 (Eats에서 "fondue" → Eats)
    if (p.viewSet === false && this.state.view === 'eats') { p.view = 'eats'; p.cat = this.state.cat === 'dessert' ? 'dessert' : 'food'; }
    // Eats를 숨긴 동안엔 음식 검색어("ramen")는 쓰지 않고 "Not used"로 알려줘요. 해피아워·런치·가격도 끄고 Explore에서
    if (!EATS_ON) {
      const food = p.kw.filter(k => k.cat === 'food' || k.cat === 'dessert');
      p.unused = [...(p.unused || []), ...food.map(k => k.label.toLowerCase())];
      p.kw = p.kw.filter(k => !food.includes(k));
      Object.assign(p, { view: 'list', cat: 'all', hh: false, lunch: false, price: '', cheap: false, fancy: false });
    }
    if (KIDS_ONLY) p.kids = false;
    // 지도 탭에서 검색하면 Explore로 가지 않고 지도에 머물러요 (결과는 지도·오른쪽 목록에 바로 반영)
    const stay = this.state.view === 'map';
    const patch = {
      q, kw: p.kw, unused: p.unused || [], free: p.free && p.view === 'list', view: stay ? 'map' : p.view, mapPicks: stay ? null : this.state.mapPicks, cat: p.cat, cuisine: '', tag: '', when,
      openNow: p.now && HOURS_READY && !later, kidsOnly: p.kids && p.view === 'list', indoor: p.indoor && p.view === 'list',
      price: p.view === 'eats' ? (p.price ?? (p.cheap ? '$' : p.fancy ? '$$$' : '')) : '',
      hh: p.hh && p.view === 'eats', lunch: p.lunch && !p.hh && p.view === 'eats', modal: null,
      qBusy: false, aiSay: ai ? p.say : '',
    };
    // 지역 이름이 있으면 그 지역 기준 (도시 5 km, 동네 2 km). "near me"보다 먼저예요
    // 이전 검색이 고른 지역은, 이번 검색에 지역이 없으면 풀어요
    if (!p.place && this.qPlace && this.state.nearKey === this.qPlace) { this.qPlace = null; patch.nearKey = ''; }
    if (p.place && ORIGINS[p.place]) {
      this.geoToken = (this.geoToken || 0) + 1;
      this.qPlace = p.place;
      Object.assign(patch, { nearKey: p.place, radius: placeRadius(p.place), geoMsg: '', geoBusy: false });
    }
    this.set(patch);
    // 가까운 곳: 이미 위치를 골랐으면 그대로, 아니면 현재 위치를 물어요 (반경 2 km)
    const locating = !p.place && p.near && !this.nearActive();
    if (!p.place && p.near) { if (locating) this.locate(); if (this.state.radius === 'any' || this.state.radius > 2) this.set({ radius: 2 }); }
    // 검색어를 주소(?q=)에 남겨서 북마크·공유할 수 있게 (#spot= 링크는 그대로)
    try { history.replaceState(history.state, '', `${location.pathname}?q=${encodeURIComponent(q)}${location.hash}`); } catch (e) {}
    this.scrollToResults(locating);
  }
  // 검색 뒤 스크롤: 모바일이나 위치를 묻는 중엔 검색창을 맨 위로 (알아들은 조건 칩·위치 안내가 보이게),
  // 데스크톱은 결과 제목이 붙어 있는 필터 바 바로 아래 오게
  scrollToResults(locating) {
    const form = this.root.querySelector('form[data-act="search"]'), top = document.getElementById('list-top');
    if (!top || locating || innerWidth < 768) { if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const bar = form && form.closest('section'), barH = bar && getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0;
    window.scrollTo({ top: top.getBoundingClientRect().top + scrollY - barH - 12, behavior: 'smooth' });
  }
  clearSearch() {
    this.qDraft = undefined;
    this.qToken = (this.qToken || 0) + 1;
    // 검색으로 고른 지역은 검색을 지우면 같이 풀어요 (직접 고른 위치는 그대로)
    if (this.qPlace && this.state.nearKey === this.qPlace) this.state.nearKey = '';
    this.qPlace = null;
    try { if (location.search) history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) {}
    this.set({ q: '', kw: [], unused: [], free: false, qBusy: false, aiSay: '', when: '', openNow: false, kidsOnly: false, indoor: false, price: '', hh: false, lunch: false });
  }
  // 모달을 열면 주소에 #spot=id 를 붙여요. 그 주소를 공유하면 받은 사람도 바로 이 장소가 열려요
  // 기록(history)에 한 칸을 더해서, 휴대폰 뒤로가기가 사이트를 떠나지 않고 모달만 닫게 해요
  openModal(id) {
    document.body.style.overflow = 'hidden';
    const url = `${location.pathname}${location.search}#spot=${encodeURIComponent(id)}`;
    // 외부 링크(Google Maps·가격)에 갔다 뒤로 와서 페이지가 다시 열리면 이 기록 칸이 이미 모달 칸이에요. 또 쌓지 않고 덮어써서 X 한 번에 닫히게 해요
    try { if (this.state.modal || (history.state && history.state.modal)) history.replaceState({ modal: id }, '', url); else history.pushState({ modal: id }, '', url); } catch (e) {}
    this.set({ modal: id, trendInfo: false, shareMsg: null, reviewMsg: '', reviewDraft: null });
  }
  // 닫기 버튼·Esc: 모달이 기록에 한 칸 있으면 뒤로 가서 닫아요 (popstate에서 실제로 닫혀요)
  closeModal() {
    if (history.state && history.state.modal) { history.back(); return; }
    this.hideModal();
  }
  hideModal() {
    if (this.aiCtl) this.aiCtl.abort();
    document.body.style.overflow = '';
    try { if (/^#spot=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    this.set({ modal: null, trendInfo: false, shareMsg: null, reviewMsg: '', reviewDraft: null });
  }
  // 공유: 휴대폰은 공유 시트, 안 되면 링크를 클립보드에 복사
  async share(id) {
    const s = byId(id);
    if (!s) return;
    const url = location.origin + location.pathname + '#spot=' + encodeURIComponent(id);
    const done = text => { this.set({ shareMsg: { id, text } }); clearTimeout(this.shareTimer); this.shareTimer = setTimeout(() => { if (this.state.shareMsg) this.set({ shareMsg: null }); }, 2500); };
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {   // 공유 시트는 휴대폰에서만. 컴퓨터 브라우저는 공유 창이 안 뜨거나 반응이 없을 수 있어서 바로 복사해요
      try { await navigator.share({ title: `${s.name} · Tiny Trips`, text: `${s.name} (${s.area})`, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); done('Link copied'); }
    catch (e) { window.prompt('Copy this link', url); }
  }
  // 공유받은 행사 링크(#event=id): 행사/마켓 탭으로 가서 그 행사를 잠깐 강조해요
  openSharedEvent() {
    const m = /^#event=([^&]+)/.exec(location.hash), id = m && decodeURIComponent(m[1]), ev = id && EVENTS.find(e => e.id === id);
    if (!ev) return;
    this.set({ view: ev.type === 'market' ? 'markets' : 'events', tag: '', q: '', kw: [], free: false, aiSay: '', mapPicks: null, modal: null });
    // 화면이 다시 그려져도 강조가 남도록 몇 번 나눠서 붙여요
    [150, 700, 1400].forEach((ms, i) => setTimeout(() => {
      const el = document.getElementById('ev-' + id);
      if (!el) return;
      if (i === 0) el.scrollIntoView({ block: 'center' });
      el.classList.add('ring-2', 'ring-violet-500');
      setTimeout(() => el.classList.remove('ring-2', 'ring-violet-500'), 3000 - ms);
    }, ms));
  }
  // 행사·마켓 공유: 이 사이트의 행사 링크(#event=id)와 이름·날짜를 보내요 (휴대폰은 공유 시트, 안 되면 클립보드)
  async shareEvent(id) {
    const ev = this.upcomingEvents(400).find(e => e.id === id);
    if (!ev) return;
    const url = location.origin + location.pathname + '#event=' + encodeURIComponent(id);
    const text = `${ev.name} · ${eventWhen(ev)}, ${eventHours(ev)} · ${ev.venue}`;
    const done = t => { this.set({ shareMsg: { id, text: t } }); clearTimeout(this.shareTimer); this.shareTimer = setTimeout(() => { if (this.state.shareMsg) this.set({ shareMsg: null }); }, 2500); };
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {   // 공유 시트는 휴대폰에서만. 컴퓨터 브라우저는 공유 창이 안 뜨거나 반응이 없을 수 있어서 바로 복사해요
      try { await navigator.share({ title: `${ev.name} · Tiny Trips`, text, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); done('Link copied'); }
    catch (e) { window.prompt('Copy this', `${text}\n${url}`); }
  }
  togglePlan(id) {
    const plan = this.state.plan.includes(id) ? this.state.plan.filter(x => x !== id) : [...this.state.plan, id];
    store('spotmate-plan', JSON.stringify(plan));
    this.set({ plan, copyMsg: '', copyText: '' });
  }
  locate() {
    if (!navigator.geolocation) return this.set({ geoMsg: "This browser can't share your location. Pick an area instead." });
    const token = this.geoToken = (this.geoToken || 0) + 1;
    this.set({ geoMsg: 'Finding your location...', geoBusy: true });
    navigator.geolocation.getCurrentPosition(
      p => {
        if (token !== this.geoToken) return; // 그 사이 사용자가 다른 지역을 골랐어요
        const here = { lat: p.coords.latitude, lng: p.coords.longitude, label: 'you' };
        const nearest = Math.min(...SPOTS.map(s => km(here, s)));
        if (nearest > OUT_OF_AREA_KM) {
          this.wizLocScroll();
          return this.set({ nearKey: 'downtown', origin: null, geoBusy: false, ...this.wizLocPatch('downtown'),
            geoMsg: `You look to be about ${Math.round(nearest).toLocaleString()} km from our nearest spot, outside our area. Showing spots near Downtown instead.` });
        }
        this.set({ nearKey: 'here', origin: here, geoMsg: '', geoBusy: false, ...this.wizLocPatch('here') });
        this.wizLocScroll();
      },
      () => {
        if (token !== this.geoToken) return;
        this.set({ geoBusy: false, geoMsg: "We couldn't get your location. Check your browser's location permission, or pick an area instead." });
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }
  async copyPlan() {
    const spots = this.state.plan.map(byId);
    const text = 'My saved spots on Tiny Trips\n\n' + spots.map((s, i) => `${i + 1}. ${s.name} (${s.area})\n   ${mapsUrl(s)}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.set({ copyMsg: 'List copied. Paste it into a chat to share.', copyText: '' });
    } catch (e) {
      this.set({ copyMsg: "Auto-copy is blocked here. Copy the text below instead.", copyText: text });
    }
  }
  async runAI(id) {
    if (!this.sample) return;
    const s = byId(id), { tf, weather } = this.state;
    const key = `${id}|${tf}|${weather}`;
    if (this.aiCtl) this.aiCtl.abort();
    const ctl = new AbortController(); this.aiCtl = ctl;
    this.ai[key] = { status: 'loading', text: '' }; this.render();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const prompt = `You are a Vancouver local-trends analyst. Today is ${today}.
In 2-3 sentences of plain English, explain why the place below is being searched more than usual right now.
- Use only the given signals, the season, and today's weather (${WEATHER[weather].label}) as evidence.
- Do not invent numbers, events, or dates that are not in the data. Phrase guesses as "likely" or "probably".
- End with one short tip for someone planning to go now.
- No greeting, no preamble, no markdown. Body text only.

Data: ${JSON.stringify({ name: s.name, area: s.area, category: CATS[s.cat].label, setting: ENV[s.env], searchesLast3DaysVsUsual: s.rise != null ? fmtRise(s.rise) : 'unknown', risingSearches: (RISE_NOTES[s.id] && RISE_NOTES[s.id].rising) || [], goodWeather: s.weather.map(w => WEATHER[w].label) })}`;
    try {
      const { text } = await this.sample(prompt, {
        modelTier: 'quick', signal: ctl.signal,
        onText: ({ text }) => { this.ai[key].text = text; const out = document.getElementById('ai-out'); if (out) out.textContent = text; }
      });
      this.ai[key] = { status: 'done', text };
    } catch (e) {
      if (e && e.code === 'cancelled') this.ai[key] = { status: 'idle', text: '' };
      else {
        const msg = e && e.code === 'not_granted' ? "AI analysis isn't enabled here."
          : e && e.code === 'rate_limited' ? 'Too many requests right now. Try again in a moment.'
          : "We couldn't load the AI analysis. Try again.";
        this.ai[key] = { status: 'error', text: (e && e.text) || '', msg };
      }
    }
    this.render();
  }

  // ── 렌더 ──
  render() {
    document.documentElement.classList.toggle('dark', this.state.dark);
    // 순위(지금 가 볼 이유)가 스팟 행사를 쓰니 목록보다 먼저 계산해요
    this._spotEvents = this.spotEvents();
    const items = this.list();
    const { view, modal } = this.state;
    const prevModal = this._lastModal;
    this._lastModal = modal;

    // 통째로 다시 그려도 포커스와 스크롤 위치가 유지되도록 기억해 둠
    const a = document.activeElement;
    const keepFocus = a && this.root.contains(a) && a.dataset.act ? this.focusKey(a) : null;
    const scrolls = {};
    this.root.querySelectorAll('[data-keep-scroll]').forEach(el => scrolls[el.dataset.keepScroll] = [el.scrollLeft, el.scrollTop]);
    if (modal !== prevModal) delete scrolls.modal;
    // 검색창에 입력 중이면 다시 그린 뒤에도 포커스와 커서 위치를 되돌려요
    const qEl = document.activeElement && document.activeElement.name === 'q' ? document.activeElement : null;
    const qSel = qEl ? [qEl.selectionStart, qEl.selectionEnd] : null;

    // 지난 지도(Leaflet)는 화면을 다시 그리기 전에 정리해요
    if (this._leaflet) { try { this._leaflet.remove(); } catch (e) {} this._leaflet = null; }
    this._map = null;
    this.root.innerHTML = `
      <div ${modal ? 'inert' : ''}>
        ${this.header()}
        ${this.controls(items)}
        <main class="max-w-6xl mx-auto px-4 md:px-6 pb-16">
          ${this.state.loading || this.state.loadError ? this.statusView() : view === 'plan' ? this.planView() : view === 'about' ? this.aboutView() : view === 'events' || view === 'markets' ? this.eventsView(view) : this.pickMode() && !this.state.q ? this.wizardView()
            : this.pickMode() ? `<button data-act="qclear" class="mt-6 inline-flex items-center gap-1 min-h-[40px] px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200">← Back to the picker</button>${this.planBar()}${this.listView(items)}` : this.state.cat === 'events' ? this.eventsView() : `
            ${this.guideBanner()}
            ${this.planBar()}
            ${view !== 'map' ? this.seasonChips() : ''}
            ${view === 'eats' && (this.state.hh || this.state.lunch) ? '' : this.criteriaBanner(items)}
      
            ${view === 'map' ? this.mapView(items) : this.listView(items)}
          `}
        </main>
        <footer class="max-w-6xl mx-auto px-4 md:px-6 pb-6 text-[11px] text-slate-400 dark:text-slate-500">
          <a class="underline" href="/guides/">Guides by city and kind</a> · Data: <a class="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · <a class="underline" href="https://opendata.vancouver.ca/pages/licence/" target="_blank" rel="noopener">City of Vancouver Open Data</a> · Open-Meteo · Photos: Wikimedia Commons, Pexels
        </footer>

      </div>
      ${modal ? this.modal(byId(modal), items) : ''}
    `;

    if (this._map) this.drawMap();
    this.root.querySelectorAll('[data-keep-scroll]').forEach(el => {
      const s = scrolls[el.dataset.keepScroll];
      if (s) { el.scrollLeft = s[0]; el.scrollTop = s[1]; }
    });
    if (qSel && !modal) { const q2 = this.root.querySelector('input[name="q"]'); if (q2) { q2.focus({ preventScroll: true }); try { q2.setSelectionRange(qSel[0], qSel[1]); } catch (e) {} } }

    const dialog = this.root.querySelector('[role="dialog"]');
    // preventScroll: 처음 여는 순간엔 Tailwind CDN이 모달 클래스 CSS를 아직 안 만들어서
    // 모달이 페이지 맨 아래에 붙어 있어요. 그대로 focus하면 배경이 맨 아래로 스크롤돼요.
    if (modal && modal !== prevModal) dialog.querySelector('button[data-act="close"]').focus({ preventScroll: true });
    else if (!modal && prevModal) { this.refocus(this.opener); this.opener = null; }
    else if (keepFocus && !this.refocus(keepFocus) && dialog) dialog.focus({ preventScroll: true });
  }

  statusView() {
    const { loadError } = this.state;
    return `
      <div class="mt-8 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-12 text-center" role="status">
        <p class="text-lg font-bold">${loadError ? 'Something went wrong' : 'Loading spots...'}</p>
        ${loadError ? `
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${esc(loadError)}</p>
          <button data-act="retry" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Try again</button>` : ''}
      </div>`;
  }

  // 요소를 다시 찾을 수 있는 키: data-act/data-val 셀렉터 + 같은 셀렉터 중 몇 번째인지
  focusKey(el) {
    const sel = `[data-act="${el.dataset.act}"]` + (el.dataset.val ? `[data-val="${el.dataset.val}"]` : '');
    return { sel, idx: [...this.root.querySelectorAll(sel)].indexOf(el) };
  }
  refocus(k) {
    if (!k) return false;
    const all = this.root.querySelectorAll(k.sel);
    const el = all[k.idx] || all[0];
    if (!el) return false;
    el.focus({ preventScroll: true });
    return document.activeElement === el;
  }

  header() {
    const { dark, view, plan, live } = this.state;
    // 지금 밴쿠버 날씨: 넓은 화면은 헤더 오른쪽에 크게, 모바일은 버튼 옆에 작게
    const wx = live ? `<div class="hidden sm:flex items-center gap-3 mt-3 h-12" title="Current weather in Vancouver (Open-Meteo)">
              <span class="text-5xl leading-none" aria-hidden="true">${live.icon}</span>
              <div class="text-right"><p class="text-3xl font-extrabold leading-none">${live.temp}°C</p><p class="mt-1 text-sm text-white/85 capitalize">${esc(live.desc)}</p></div>
            </div>` : '';
    const wxSmall = live ? `<span class="sm:hidden text-sm font-bold" title="Current weather in Vancouver">${live.icon} ${live.temp}°C</span>` : '';
    // 다크 모드 버튼은 날씨와 헷갈리지 않게 해·달 대신 반쪽 원(명암) 아이콘
    const contrast = `<svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>`;
    // 첫 화면에 추천 카드가 보이도록 헤더를 낮게: 모바일은 부제 없이 로고 + 탭만
    const tab = (v, label) => `<button data-act="view" data-val="${v}" class="shrink-0 px-2 sm:px-4 py-2.5 sm:py-2 rounded-full text-[13px] sm:text-sm font-semibold transition-colors ${view === v ? 'bg-white text-indigo-700 shadow' : 'text-white/90 hover:bg-white/15'}">${label}</button>`;
    return `
    <header class="hero relative text-white">
      <div class="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-5 md:pt-9 md:pb-7">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="font-brand text-3xl md:text-5xl font-extrabold tracking-tight leading-none">Tiny Trips</h1>
            <p class="mt-1.5 sm:mt-2 text-white/85 text-sm sm:text-base leading-snug">Big fun for little ones, and the reason to go today</p>
          </div>
          <div class="flex flex-col items-end">
            <div class="flex items-center gap-2">
              ${wxSmall}
              <span class="hidden sm:inline-block text-sm font-semibold text-white/85">Vancouver</span>
              <button data-act="dark" aria-label="${dark ? 'Switch to light mode' : 'Switch to dark mode'}" title="${dark ? 'Light mode' : 'Dark mode'}" class="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center">${contrast}</button>
            </div>
            ${wx || '<div class="hidden sm:block mt-3 h-12" aria-hidden="true"></div>'}
          </div>
        </div>
        <nav class="mt-4 inline-flex max-w-full overflow-x-auto no-scrollbar gap-0 sm:gap-1 p-1 rounded-full bg-white/10 border border-white/25 backdrop-blur">
          ${tab('list', 'Explore')}${tab('map', 'Map')}${EATS_ON ? tab('eats', 'Eats') : ''}${tab('events', 'Events')}${tab('markets', 'Markets')}${tab('plan', `Saved${plan.length ? ` (${plan.length})` : ''}`)}${tab('about', 'About')}
        </nav>
      </div>
      <a href="https://www.pexels.com/photo/7669218/" target="_blank" rel="noopener" class="absolute right-3 bottom-1.5 text-[10px] leading-none text-white/70 hover:text-white underline-offset-2 hover:underline">Photo: Kampus · Pexels</a>
    </header>`;
  }

  controls(items) {
    const s = this.state;
    if (s.view === 'plan' || s.view === 'events' || s.view === 'markets' || s.view === 'about' || (s.view === 'map' && s.mapPicks)) return '';   // 추천 장소만 보는 지도엔 필터가 안 맞아서 숨겨요
    // 단계별 추천 화면(Explore)엔 검색창만 (필터 줄은 지도에서). 검색하면 결과 목록과 위치 줄을 보여줘요
    const lite = this.pickMode();
    if (lite && !s.q && !s.wiz.done) return '';   // 질문 화면엔 보여줄 게 없어서 빈 줄도 안 그려요
    return `
    <section class="bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800">
      <div class="max-w-6xl mx-auto px-4 md:px-6 py-2 sm:py-3 space-y-1.5 sm:space-y-2">
        ${lite && !s.q && !s.wiz.done ? '' : `
        <form data-act="search" role="search" class="flex gap-1.5 sm:gap-2">
          <input name="q" type="search" value="${esc(this.qDraft ?? s.q)}" autocomplete="off" enterkeyhint="search" aria-label="Search"
            placeholder="${s.view === 'eats' ? (innerWidth < 640 ? 'Try “brunch this Saturday”' : 'Try “brunch this Saturday in Richmond”') : 'Try “' + this.exampleQ() + '”'}"
            class="flex-1 min-w-0 min-h-[36px] sm:min-h-[44px] px-3 sm:px-4 text-sm sm:text-base rounded-lg sm:rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500">
          <button type="submit" ${s.qBusy ? 'disabled aria-busy="true"' : ''} class="min-h-[36px] sm:min-h-[44px] px-3 sm:px-4 text-sm sm:text-base rounded-lg sm:rounded-xl font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-70 text-white">${s.qBusy ? 'Thinking…' : AI_SEARCH_URL ? '✨ Search' : 'Search'}</button>
        </form>
        `}
        ${s.q && s.aiSay ? `<p class="text-sm font-semibold text-violet-700 dark:text-violet-300"><span aria-hidden="true">✨</span> ${esc(s.aiSay)}</p>` : ''}
        ${s.q ? (() => {
          // 검색에서 찾는 말만 칩으로 (× 누르면 그 조건만 꺼요). 날짜·영업·아이·실내·가격·딜은 아래 버튼이 켜진 색으로 보여줘서 칩으로 반복하지 않아요.
          // 위치는 모바일에선 필터 안에 접혀 있어서 모바일에서만 칩으로 보여줘요
          const chips = [...s.kw.map(k => [`kw:${k.key}`, k.label]), ...(s.free ? [['free', 'Free']] : [])];
          const near = this.nearActive() ? (s.radius === 'any' ? `Near ${this.originLabel()}` : `Within ${radiusLabel(s.radius)} of ${this.originLabel()}`) : '';
          const chip = (k, label, extra = '') => `<button data-act="qrm" data-val="${esc(k)}" aria-label="Remove ${esc(label)}" class="${extra} inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-full font-semibold bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-200">${esc(label)} <span aria-hidden="true">×</span></button>`;
          return `
        <div class="flex flex-wrap items-center gap-1.5 text-sm">
          <span class="text-slate-500 dark:text-slate-400">${chips.length || near ? 'Looking for:' : `Search: “${esc(s.q)}”`}</span>
          ${chips.map(([k, label]) => chip(k, label)).join('')}
          ${near ? chip('near', near, 'sm:hidden') : ''}
          ${s.unused && s.unused.length ? `<span class="px-2.5 py-1 rounded-full text-slate-500 ring-1 ring-slate-300 dark:text-slate-400 dark:ring-slate-600" title="These words didn't match any filter or place">Not used: ${esc(s.unused.join(', '))}</span>` : ''}
          <button data-act="qclear" class="ml-1 min-h-[32px] font-semibold underline text-slate-600 dark:text-slate-300">Clear search</button>
        </div>`; })() : ''}
        ${lite ? (s.q ? `<div>${this.locationBar(items)}</div><p class="text-xs text-slate-500 dark:text-slate-400">${this.countLine(items)}</p>` : '') : `
        ${(() => {
          // 모바일: 자주 쓰는 필터만 한 줄(옆으로 넘기기) + "Filters" 버튼. 카테고리·음식 종류·정렬·위치는 Filters 안에
          // 데스크톱: 전부 한 줄에 (접는 칸은 display: contents로 같은 줄에 섞여요)
          const open = s.filtersOpen;
          const more = [s.cat !== (hasAll(s.view) ? 'all' : 'food'), !!s.cuisine, s.sort !== 'fresh', this.nearActive()].filter(Boolean).length;
          this._moreCls = open ? 'contents' : 'hidden sm:contents';
          return `
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-x-3 sm:gap-y-2">
          ${s.cat === 'events' ? '' : `
          <button data-act="filters" aria-expanded="${!!open}" class="sm:hidden order-first shrink-0 min-h-[34px] sm:min-h-[44px] px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200">${open ? 'Hide filters' : `Filters${more ? ` · ${more}` : ''}`}</button>`}
          <div class="${s.cat === 'events' ? 'contents' : this._moreCls}">
          <label class="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><span class="${open ? '' : 'hidden sm:inline'}">Category</span>
            <select data-act="cat" aria-label="Category" class="min-h-[34px] sm:min-h-[44px] px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold">
              ${[...(hasAll(s.view) ? [['all', 'All']] : []), ...catOptions(s.view).map(k => [k, k === 'events' ? 'Events' : CATS[k].label])]
                .map(([k, label]) => `<option value="${k}" ${s.cat === k ? 'selected' : ''}>${label}</option>`).join('')}
            </select>
          </label>
          </div>
          ${s.cat === 'events' ? '' : `
          <label class="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><span class="hidden sm:inline">When</span>
            <select data-act="when" aria-label="When are you going" class="max-sm:w-[5.5rem] min-h-[34px] sm:min-h-[44px] px-2 sm:px-3 py-1 sm:py-2 rounded-lg border ${s.when ? 'border-violet-400 bg-violet-50 text-violet-900 dark:border-violet-500 dark:bg-violet-500/15 dark:text-violet-100' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'} text-xs sm:text-sm font-semibold">
              ${['', 'today', 'tomorrow', 'weekend', 'sat', 'sun'].map(w => `<option value="${w}" ${s.when === w ? 'selected' : ''}>${esc(w ? whenLabel(w) : 'Any time')}</option>`).join('')}
            </select>
          </label>`}
          ${s.cat === 'food' ? (() => {
            // 음식 종류: 지금 필터(위치 등)에 걸리는 곳이 있는 종류만, 개수와 함께 알파벳 순으로. 고른 종류는 0곳이어도 남겨요
            const counts = { ...(this._cuisineCounts || {}) };
            if (s.cuisine && !(s.cuisine in counts)) counts[s.cuisine] = 0;
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            return `
          <div class="${this._moreCls}">
          <label class="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><span class="${s.filtersOpen ? '' : 'hidden sm:inline'}">Cuisine</span>
            <select data-act="cuisine" aria-label="Cuisine" class="min-h-[34px] sm:min-h-[44px] px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold">
              <option value="">All cuisines (${total})</option>
              ${Object.keys(counts).sort().map(k => `<option value="${esc(k)}" ${s.cuisine === k ? 'selected' : ''}>${esc(k)} (${counts[k]})</option>`).join('')}
            </select>
          </label>
          </div>`; })() : ''}
          ${s.view === 'eats' ? `
          <div class="inline-flex shrink-0 p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="group" aria-label="Price">
            ${[['$', '$', 'Cheap eats, mostly under $18 a main'], ['$$', '$$', 'Mid-range, mains about $18–35'], ['$$$', '$$$+', 'Upscale, mains $35 and up']].map(([v, label, tip]) => `<button data-act="price" data-val="${v}" aria-pressed="${s.price === v}" title="${tip}" class="min-h-[40px] px-3 rounded-lg text-sm font-bold transition-colors ${s.price === v ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}">${label}</button>`).join('')}
          </div>` : ''}
          ${s.view === 'eats' && s.cat === 'food' && Object.keys(HAPPY).length ? `
          <button data-act="hh" aria-pressed="${s.hh}" title="Places with a happy hour on now or later today" class="shrink-0 whitespace-nowrap min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${s.hh ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white/70 border-amber-300 text-amber-900 dark:bg-slate-800/70 dark:border-amber-500/40 dark:text-amber-200'}">Happy hour${this._hhNow ? `<span class="text-xs font-bold px-1.5 py-0.5 rounded-full ${s.hh ? 'bg-white/25' : 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-100'}">${this._hhNow} on now</span>` : ''}</button>` : ''}
          ${s.view === 'eats' && s.cat === 'food' && Object.keys(LUNCH).length ? `
          <button data-act="lunch" aria-pressed="${s.lunch}" title="Lunch specials on now or later today" class="shrink-0 whitespace-nowrap min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${s.lunch ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white/70 border-emerald-300 text-emerald-900 dark:bg-slate-800/70 dark:border-emerald-500/40 dark:text-emerald-200'}">Lunch specials${this._lunchNow ? `<span class="text-xs font-bold px-1.5 py-0.5 rounded-full ${s.lunch ? 'bg-white/25' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100'}">${this._lunchNow} on now</span>` : ''}</button>` : ''}
          ${s.cat === 'events' || !HOURS_READY ? '' : `
          <button data-act="opennow" aria-pressed="${s.openNow}" class="shrink-0 whitespace-nowrap min-h-[34px] sm:min-h-[44px] px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${s.openNow ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white/70 border-slate-200 text-slate-700 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-200'}">Open now</button>`}
          ${s.cat === 'events' || s.view === 'eats' ? '' : `
          <button data-act="indoor" aria-pressed="${s.indoor}" title="Indoor places, plus places with both indoor and outdoor areas" class="shrink-0 whitespace-nowrap min-h-[34px] sm:min-h-[44px] px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${s.indoor ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white/70 border-slate-200 text-slate-700 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-200'}">Indoor</button>
          ${KIDS_ONLY ? '' : `<button data-act="kids" aria-pressed="${s.kidsOnly}" title="Places that are good for kids and families" class="shrink-0 whitespace-nowrap min-h-[34px] sm:min-h-[44px] px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border transition-colors ${s.kidsOnly ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white/70 border-slate-200 text-slate-700 dark:bg-slate-800/70 dark:border-slate-700 dark:text-slate-200'}">Kids</button>`}`}
          ${s.cat === 'events' ? '' : `
          <div class="${this._moreCls}">
          <label class="sm:ml-auto flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"><span class="${s.filtersOpen ? '' : 'hidden sm:inline'}">Sort</span>
            <select data-act="sort" aria-label="Sort" class="min-h-[34px] sm:min-h-[44px] px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm">
              <option value="fresh" ${s.sort === 'fresh' ? 'selected' : ''}>Worth going now</option>
              <option value="distance" ${s.sort === 'distance' ? 'selected' : ''}>Distance</option>
            </select>
          </label>
          </div>`}
        </div>`; })()}
        <div class="${s.filtersOpen || s.cat === 'events' ? '' : 'hidden sm:block'}">${this.locationBar(items)}</div>
        ${s.geoMsg ? `<p class="text-xs text-slate-600 dark:text-slate-300" role="status">${esc(s.geoMsg)}</p>` : ''}
        <p class="text-xs text-slate-500 dark:text-slate-400">${this.countLine(items)}</p>
        ${s.view === 'eats' && s.price && this._priceUnknown ? `
        <p class="text-xs text-slate-600 dark:text-slate-300">Showing ${esc(s.price === '$$$' ? '$$$ and $$$$' : s.price)} places. ${plural(this._priceUnknown, 'place')} without price info ${this._priceUnknown === 1 ? 'is' : 'are'} hidden. <button data-act="price" data-val="${esc(s.price)}" class="font-semibold underline text-violet-700 dark:text-violet-300">Show all prices</button></p>` : ''}
        ${s.cat !== 'events' && s.openNow && HOURS_READY && (this._hidden.closed + this._hidden.unknown) ? `
        <p class="text-xs text-slate-600 dark:text-slate-300">Hidden: ${this._hidden.closed} closed right now${this._hidden.unknown ? `, ${this._hidden.unknown} with unknown hours` : ''}. <button data-act="opennow" class="font-semibold underline text-violet-700 dark:text-violet-300">Show all</button></p>` : ''}

        `}
      </div>
    </section>`;
  }

  // 위치 기반 필터: 기준 위치(현재 위치 또는 지역) + 반경. 개수·위치 문구는 countLine 한 줄로 합쳤어요
  // withIndoor: 추천 결과 화면에선 위치 옆에 "Indoor only" 버튼도 (비 오는 날 실내만 보기)
  locationBar(items, withIndoor) {
    const s = this.state, near = this.nearActive();
    const seg = (val, label, on) => `<button data-act="radius" data-val="${val}" aria-pressed="${on}" class="whitespace-nowrap min-h-[30px] sm:min-h-[36px] px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${on ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}">${label}</button>`;
    return `
        <div class="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 sm:gap-y-2 text-xs sm:text-sm">
          <button data-act="geo" ${s.geoBusy ? 'disabled' : ''} class="min-h-[36px] sm:min-h-[44px] px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg font-semibold border ${s.nearKey === 'here' && near ? 'bg-violet-100 border-violet-200 text-violet-800 dark:bg-violet-500/20 dark:border-violet-500/30 dark:text-violet-200' : 'border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-500/50 dark:text-violet-300 dark:hover:bg-violet-500/10'} disabled:opacity-60">${s.geoBusy ? 'Locating...' : s.nearKey === 'here' && near ? 'Near me ✓' : 'Near me'}</button>
          <label class="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300 flex-1 basis-0 min-w-[6.5rem] sm:flex-none sm:basis-auto"><span class="hidden sm:inline">or</span>
            <select data-act="near" aria-label="Location" class="w-full min-w-0 sm:w-auto min-h-[36px] sm:min-h-[44px] px-2 sm:px-3 py-1 sm:py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
              <option value="" ${!near ? 'selected' : ''}>Anywhere</option>
              ${s.nearKey === 'here' && near ? '<option value="here" selected>My location</option>' : '<option value="gps">My location</option>'}
              ${Object.entries(ORIGINS).filter(([k, o]) => !o.extra || s.nearKey === k).map(([k, o]) => `<option value="${k}" ${s.nearKey === k ? 'selected' : ''}>Near ${o.label}</option>`).join('')}
            </select>
          </label>
          ${withIndoor ? `<button data-act="indoor" aria-pressed="${s.indoor}" title="Indoor places, plus places with both indoor and outdoor areas" class="min-h-[36px] sm:min-h-[44px] px-2.5 sm:px-3 py-1 sm:py-2 rounded-lg font-semibold border transition-colors ${s.indoor ? 'bg-sky-600 border-sky-600 text-white' : 'border-sky-300 text-sky-800 hover:bg-sky-50 dark:border-sky-500/50 dark:text-sky-300 dark:hover:bg-sky-500/10'}">${s.indoor ? 'Indoor only ✓' : 'Indoor only'}</button>` : ''}
          ${near ? `
          <div class="inline-flex max-w-full p-0.5 sm:p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="group" aria-label="Radius">
            ${RADII.map(r => seg(r, radiusLabel(r), s.radius === r)).join('')}
          </div>
          <button data-act="nearoff" class="min-h-[30px] sm:min-h-[36px] text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline">Clear location</button>` : ''}
        </div>`;
  }
  // 필터 아래 한 줄: 개수 + 위치(반경) + 검색량 데이터 기준 (모바일은 검색량 설명 없이 짧게)
  countLine(items) {
    const s = this.state, near = this.nearActive();
    if (s.cat === 'events') return esc(`${plural(this.upcomingEvents(45).length, 'event')} in the next 6 weeks`);
    const what = plural(items.length, [s.view !== 'eats' && s.kidsOnly && 'kid-friendly', s.view !== 'eats' && s.indoor && 'indoor', 'spot'].filter(Boolean).join(' ')) + (s.openNow && HOURS_READY ? ' open now' : '');
    const where = near ? (s.radius === 'any' ? `, distances from ${this.originLabel()}` : ` ${ORIGINS[s.nearKey] ? 'in or ' : ''}within ${radiusLabel(s.radius)} of ${this.originLabel()}`)
      : s.sort === 'distance' ? ', distances from Downtown (pick a location to change that)' : '';
    const trends = TRENDS_ON && RISE_META.recentThrough ? `<span class="hidden sm:inline"> · Searches vs usual from Google Trends (BC), ${esc(recentLabel())}${RISE_META.updatedAt ? `, updated ${esc(ago(RISE_META.updatedAt))}` : ''}</span>` : '';
    return esc(what + where) + trends;
  }

  // ── 행사 ──
  eventRow(ev, compact = false, hideDay = false) {
    const spot = ev.spotId && byId(ev.spotId);
    return `
      <div id="ev-${esc(ev.id)}" class="flex gap-3 rounded-xl p-4 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
        <div class="w-16 shrink-0 text-center">
          <p class="text-2xl" aria-hidden="true">${esc(ev.icon || '🎪')}</p>
          <p class="mt-1 text-xs font-bold text-violet-700 dark:text-violet-300 leading-tight">${hideDay ? '' : esc(dayLabel(ev.next))}</p>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-bold leading-snug">${esc(ev.name)}${ev.forParents ? ` ${PARENTS_BADGE}` : ''}${RARE_EVENT.includes(ev.type) ? ' <span class="ml-1 align-middle text-[11px] font-bold px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-200">Few days only</span>' : ''}</p>
          <p class="text-sm text-slate-600 dark:text-slate-300">${esc(eventHours(ev))} · ${esc(eventWhen(ev))}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">${esc(EVENT_TYPES[ev.type] || 'Event')} · ${esc(ev.venue)}${ev.dist != null ? ` · ${fmtDist(ev.dist)}` : ''}</p>
          ${compact ? '' : `<p class="mt-1 text-sm text-slate-700 dark:text-slate-300">${esc(ev.summary)}</p>`}
          <p class="mt-1 flex flex-wrap gap-x-4 text-sm font-semibold">
            ${ev.lat != null ? `<a href="${eventMapsUrl(ev)}" target="_blank" rel="noopener" class="inline-flex items-center py-2 text-indigo-700 dark:text-indigo-300">Directions</a>` : ''}
            <a href="${esc(ev.source)}" target="_blank" rel="noopener" class="inline-flex items-center py-2 text-slate-600 dark:text-slate-300 underline">Official info ↗</a>
            ${spot ? `<button data-act="open" data-val="${spot.id}" class="inline-flex items-center py-2 text-violet-700 dark:text-violet-300 text-left">See ${esc(spot.name)} →</button>` : ''}
            <button data-act="shareev" data-val="${esc(ev.id)}" class="inline-flex items-center py-2 text-slate-600 dark:text-slate-300">${this.state.shareMsg && this.state.shareMsg.id === ev.id ? esc(this.state.shareMsg.text) : 'Share'}</button>
          </p>
        </div>
      </div>`;
  }
  // 날짜 계획 막대: 고른 날짜와 날씨 예보, 비가 오면 실내 추천 버튼, 닫힌 곳 수
  planBar() {
    const s = this.state;
    // 밤(8pm~6am)에 장소 목록을 보면 대부분 닫혀 있어서, 내일 계획으로 바로 넘어갈 수 있게 안내해요
    if (!s.when) {
      const h = vanWallClock().getHours();
      return s.view === 'list' && s.cat !== 'events' && (h >= 20 || h < 6) ? `
    <p class="mt-6 text-sm text-slate-600 dark:text-slate-300">It's late, so most places are closed. <button data-act="whenset" data-val="${h < 6 ? 'today' : 'tomorrow'}" class="font-semibold underline text-violet-700 dark:text-violet-300">See what's worth it ${h < 6 ? 'today' : 'tomorrow'} →</button></p>` : '';
    }
    const ds = whenDates(s.when), fc = s.forecast || {};
    const rainy = ds.some(d => fc[d] && (fc[d].pop >= 60 || fc[d].kind === 'rain'));
    const day = d => d === vanDate(0) ? 'Today' : d === vanDate(1) ? 'Tomorrow' : DOW[dowOf(d)];
    return `
    <section class="mt-6 rounded-2xl p-4 bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:ring-violet-500/30" aria-label="Your plan">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p class="font-bold text-violet-900 dark:text-violet-100">Planning for ${esc(whenLabel(s.when))}</p>
        ${ds.map(d => fc[d] ? `<span class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100"><span class="text-xl" aria-hidden="true">${fc[d].icon}</span><span>${esc(day(d))} ${fc[d].max}°C<span class="font-normal text-slate-600 dark:text-slate-300">, ${esc(fc[d].desc)}${fc[d].pop >= 30 ? `, ${fc[d].pop}% chance of rain` : ''}</span></span></span>` : '').join('')}
        <button data-act="whenoff" class="ml-auto text-sm font-semibold underline text-violet-800 dark:text-violet-200">Back to right now</button>
      </div>
      ${rainy && s.view === 'list' && !s.indoor ? `<p class="mt-2 text-sm text-slate-700 dark:text-slate-200">Rain is likely. <button data-act="indoor" class="font-semibold underline text-sky-700 dark:text-sky-300">Show indoor places</button></p>` : ''}
      ${this._hidden && this._hidden.closed && !s.openNow ? `<p class="mt-1 text-xs text-slate-600 dark:text-slate-300">${plural(this._hidden.closed, 'place')} closed ${ds.length > 1 ? 'on both days' : ds[0] === vanDate(0) ? 'for the rest of today' : 'that day'} ${this._hidden.closed === 1 ? 'is' : 'are'} hidden.</p>` : ''}
      ${this.planLater() ? `<p class="mt-1 text-xs text-slate-600 dark:text-slate-300">Cards show the hours for ${ds.length > 1 ? 'those days' : 'that day'}. Check the Google Maps link before you go.</p>` : ''}
    </section>`;
  }
  // 목록 맨 위: 지금 시즌 태그 칩 (누르면 그 태그의 장소만). 순위와 이유는 카드에서 보여줘요
  seasonChips() {
    const tags = activeTags().filter(t => this._tagCounts && this._tagCounts[t.id]);
    const fresh = this._tagCounts && this._tagCounts.justopened, freshOn = this.state.tag === 'justopened';
    if (!tags.length && !fresh) return '';
    const chip = t => { const on = this.state.tag === t.id; return `<button data-act="tag" data-val="${esc(t.id)}" aria-pressed="${on}" title="${esc(t.about || '')}" class="text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 sm:py-2 rounded-full border ${on ? 'bg-orange-500 border-orange-500 text-white' : 'border-orange-200 text-orange-800 hover:border-orange-400 dark:border-orange-500/30 dark:text-orange-300'}">#${esc(t.label)} <span class="font-normal opacity-75">${this._tagCounts[t.id]}</span></button>`; };
    return `
    <div class="mt-3 sm:mt-4 flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-1.5 [&>*]:whitespace-nowrap">
      ${fresh ? `<button data-act="tag" data-val="justopened" aria-pressed="${freshOn}" title="${esc(JUST_OPENED.criteria)}" class="text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 sm:py-2 rounded-full border ${freshOn ? 'bg-violet-600 border-violet-600 text-white' : 'border-violet-200 text-violet-800 hover:border-violet-400 dark:border-violet-500/30 dark:text-violet-300'}">New Rising Spots <span class="font-normal opacity-75">${fresh}</span></button>` : ''}
      ${tags.length ? `<span class="${fresh ? 'ml-2 ' : ''}text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">In season:</span>${tags.map(chip).join('')}` : ''}
    </div>`;
  }
  // Events 탭(마켓 빼고) · Markets 탭(파머스 마켓만). kind 없이 부르면 예전처럼 둘 다 (카테고리 "Events")
  eventsView(kind) {
    const tabPage = kind === 'events' || kind === 'markets';
    // 검색어는 탭을 바꾸면 비워요
    if (this._evqKind !== kind) { this.evq = ''; this._evqKind = kind; }
    const r = this.eventsResults(kind);
    const noun = kind === 'markets' ? 'market' : 'event';
    const note = (tabPage ? `
      <h2 class="mt-6 text-2xl font-extrabold tracking-tight">${kind === 'markets' ? '<span aria-hidden="true">🥕</span> Farmers markets' : 'Events for families'}</h2>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">${kind === 'markets' ? 'Weekly markets with local produce and food trucks.' : 'Festivals, seasonal events and sales in the next 6 weeks.'}</p>
      ${this.state.when ? `<p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-sm bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:ring-violet-500/30"><span class="font-semibold text-violet-900 dark:text-violet-100">Showing ${esc(whenLabel(this.state.when))}</span><button data-act="whenoff" class="font-semibold underline text-violet-800 dark:text-violet-200">Show all dates</button></p>` : ''}
      <div class="mt-4 rounded-2xl p-3 sm:p-4 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
        <input type="search" data-act="evsearch" data-kind="${kind}" value="${esc(this.evq || '')}" autocomplete="off" enterkeyhint="search" aria-label="Search ${noun}s"
          placeholder="${kind === 'markets' ? 'Search markets: name, area, day' : 'Search events: pumpkin, Halloween, Surrey, free'}"
          class="w-full min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 text-sm sm:text-base rounded-lg sm:rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500">
        <p id="ev-count" class="mt-2 sm:mt-3 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">${r.count}</p>
        <div class="mt-2 sm:mt-3">${this.locationBar([])}</div>
      </div>`
      // "See all"로 들어온 행사 목록에서 장소 목록으로 돌아가는 버튼 (카테고리 드롭다운을 몰라도 나갈 수 있게)
      : `<button data-act="cat" data-val="all" class="mt-6 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200">← Back to all spots</button>`) + `
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Check each source before you go.</p>`;
    return `${note}<div id="ev-results">${r.html}</div>`;
  }
  // 검색창에 글을 쓸 때마다 이 부분만 다시 그려요 (입력창이 포커스를 잃지 않게)
  eventsResults(kind) {
    const tabPage = kind === 'events' || kind === 'markets';
    const noun = kind === 'markets' ? 'market' : 'event';
    const words = tabPage ? (this.evq || '').toLowerCase().split(/\s+/).filter(Boolean) : [];
    const only = this.state.when ? whenDates(this.state.when) : null;   // Explore에서 고른 날짜(내일·이번 주말)를 행사·마켓에도 똑같이 적용
    const all = this.upcomingEvents(only ? 8 : 45, only).filter(ev => kind === 'markets' ? ev.type === 'market' : kind === 'events' ? ev.type !== 'market' : true), today = vanDate(0), week = vanDate(6);
    const hay = ev => `${ev.name} ${ev.summary || ''} ${ev.venue || ''} ${ev.area || ''} ${ev.type === 'market' ? 'market farmers' : ev.type} ${ev.schedule && ev.schedule.hoursText || ''} ${/free/i.test(ev.summary || '') ? 'free' : ''}`.toLowerCase();
    const evs = words.length ? all.filter(ev => { const h = hay(ev); return words.every(w => h.includes(w)); }) : all;
    const count = `${plural(evs.length, noun)}${only ? ` on ${esc(whenLabel(this.state.when))}` : ''}${words.length ? ` for “${esc(this.evq.trim())}”` : ''}${this.nearActive() ? `, near ${esc(this.originLabel())}` : ''}`;
    const group = (title, list, hideDay) => list.length ? `<h2 class="mt-8 text-lg font-bold">${title}</h2><div class="mt-3 grid gap-3 md:grid-cols-2">${list.map(ev => this.eventRow(ev, false, hideDay)).join('')}</div>` : '';
    if (!evs.length) return { count, html: `
      <div class="mt-6 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-12 text-center">
        <p class="text-lg font-bold">${words.length ? `No ${noun}s match “${esc(this.evq.trim())}”` : `No ${noun}s ${only ? "on " + esc(whenLabel(this.state.when)) : "coming up"}${this.nearActive() ? ` within ${radiusLabel(this.state.radius)}` : ''}`}</p>
        ${this.nearActive() ? '<button data-act="radius" data-val="any" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Show any distance</button>' : ''}
      </div>` };
    // 몇 주 동안 이어지는 행사(옥수수 미로, 시즌 행사)는 하루짜리 행사와 섞이지 않게 따로 묶어요
    const ongoing = e => e.type !== 'market' && e.schedule.from && e.schedule.to && (Date.parse(e.schedule.to) - Date.parse(e.schedule.from)) / 864e5 > 14;
    const short = evs.filter(e => !ongoing(e));
    return { count, html: group('Today', short.filter(e => e.next === today), true)
      + group('This week', short.filter(e => e.next > today && e.next <= week))
      + group('Coming up', short.filter(e => e.next > week))
      + group('Running all season', evs.filter(ongoing), true) };
  }

  // 리뷰 기준(먹거리)과 히든젬 표시의 기준을 카드마다 반복하지 않고 목록 위에 한 번만 보여줘요
  criteriaBanner(items) {
    const c = CATS[this.state.cat];
    // 장소 목록(Kids 필터 포함)에는 기준 설명을 따로 두지 않아요. 아이 동반 기준은 카드 배지와 모달에서 보여줘요
    if (!c || !c.criteria) return '';
    // 기준은 배지 두 개로 짧게, 순위를 매기는 방법은 접어 두고 필요할 때만 펼쳐요
    return `
    <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
      <span class="font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30" title="${esc(c.criteria)}">${esc(c.label)}: ${esc(REVIEW_MIN[this.state.cat] || 'Google reviews')}</span>
      ${items.some(isJustOpened) ? `<span class="font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" title="${esc(JUST_OPENED.criteria)}">${JUST_OPENED.label}: opened in the last 6 months, 4.9+ · 30+ reviews</span>` : ''}
      <details class="basis-full sm:basis-auto">
        <summary class="cursor-pointer font-semibold text-slate-600 underline dark:text-slate-300">How ranking works</summary>
        <p class="mt-2 max-w-3xl text-sm text-slate-700 dark:text-slate-300">Places with a reason to go now get a # rank: a happy hour or lunch special on now, a new rising spot, a recent article or Reddit post, more searches than usual, or open now and a good fit for the time or weather (breakfast in the morning, late-night spots after 9pm, noodles when it's cold or rainy, ice cream when it's sunny). The rest are in no particular order. Check Google Maps for the latest ratings.</p>
      </details>
    </div>`;
  }

  // 대표 이미지: 데이터에 사진이 있으면 사진, 없으면 스팟별 일러스트 커버
  cover(s, h) {
    const c = CATS[s.cat];
    // 위키미디어 공용 사진: 라이선스상 사진마다 촬영자와 라이선스를 표시해요 (링크 클릭은 카드 열기와 분리)
    if (s.photo) return `<div class="w-full ${h} relative overflow-hidden bg-slate-200 dark:bg-slate-800">
        <img src="${esc(s.photo.url)}" alt="${esc(s.name)}" loading="lazy" class="w-full h-full object-cover">
        <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
        ${s.photo.own ? `<span class="absolute right-2 bottom-2 max-w-[45%] truncate text-[10px] leading-tight px-1.5 py-0.5 rounded bg-black/45 text-white/85">${esc(s.photo.credit)}</span>` : `<a data-act="noop" href="${esc(s.photo.source)}" target="_blank" rel="noopener" title="Photo: ${esc(s.photo.credit)} (${esc(s.photo.license)}), via Wikimedia Commons"
          class="absolute right-2 bottom-2 max-w-[45%] truncate text-[10px] leading-tight px-1.5 py-0.5 rounded bg-black/45 text-white/85 hover:text-white">${esc(s.photo.credit)} · ${esc(s.photo.license)}</a>`}
      </div>`;
    // 실제 사진이 없으면 장소 종류에 맞는 무료 스톡 사진 (Pexels). 그 장소가 아닐 수 있다고 사진 구석에 꼭 밝혀요 (사용자 결정, 2026-10-02)
    if (STOCK_ON && s.cat !== 'food' && s.cat !== 'dessert') {
      // 종류마다 사진 여러 장 중, 아직 덜 쓰인 사진을 골라 같은 종류여도 장소마다 다르게 보여요. 한 번 정한 사진은 카드와 장소 창에서 같게 (stockPick)
      // 데이터에 stockPhoto [Pexels 번호, 촬영자]가 있으면 그 사진을 (예: 호박밭이 보이는 곳에 호박 사진)
      let st = s.stockPhoto || stockPick[s.id];
      if (!st) {
        // 놀이터·물놀이장이 있다고 적힌 공원·트레일·해변은 풍경 대신 놀이터(물놀이) 사진 (사용자 요청, 2026-10-03)
        let kind = kidProfile(s).kind;
        // 이름은 센터·정원인데 설명이 공원이나 도서관이면 설명대로 (Tong Louie YMCA 등)
        const head = s.summary.split(' with ')[0];
        if (kind === 'rec' && /librar/i.test(head)) kind = 'library';
        else if (['rec', 'garden', 'pool'].includes(kind) && /^park\b/i.test(head)) kind = 'park';
        else if (kind === 'farm' && /^museum/i.test(head)) kind = 'museum';
        // 이름이 그냥 "Park"인 곳은 이름·설명에 나온 자연환경(숲·계곡·물가)에 맞는 사진 (예: Boundary Bay Regional Park는 바닷가)
        if (kind === 'park') {
          const nm = `${s.name} ${head}`;
          if (/^(walking )?trail/i.test(head) || /ravine|\bcreek\b|headwaters|watershed|forest|greenway|natural area|conservation|reserve|provincial|mountain|nature (centre|house)/i.test(nm)) kind = 'trail';
          else if (/\bcove\b|\bpoint\b|\bbay\b|harbour|foreshore|landing|waterfront|\bbeach\b|belcarra|\bisland\b|\blake\b|\briver\b/i.test(nm)) kind = 'beach';
        }
        if (['park', 'trail', 'beach'].includes(kind)) kind = /a spray park/.test(s.summary) ? 'water' : /a playground/.test(s.summary) || s.play ? 'play' : kind;
        const list = STOCK[kind] || STOCK.sight, start = [...s.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % list.length;
        st = list[start];
        for (let k = 0; k < list.length; k++) { const c = list[(start + k) % list.length]; if ((stockUse[c[0]] || 0) < (stockUse[st[0]] || 0)) st = c; }
        stockUse[st[0]] = (stockUse[st[0]] || 0) + 1; stockPick[s.id] = st;
      }
      const big = h.includes('h-56');
      return `<div class="w-full ${h} relative overflow-hidden bg-slate-200 dark:bg-slate-800" role="img" aria-label="${esc(s.name)} (stock photo, may differ from the actual place)">
        <img src="https://images.pexels.com/photos/${st[0]}/pexels-photo-${st[0]}.jpeg?auto=compress&cs=tinysrgb&w=${big ? 960 : 640}" alt="" loading="lazy" class="w-full h-full object-cover">
        <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
        <span class="absolute left-2 bottom-2 max-w-[70%] truncate text-[10px] leading-tight px-1.5 py-0.5 rounded bg-black/55 text-white/90"><span class="sm:hidden">Stock photo, may differ</span><span class="hidden sm:inline">Stock photo · may differ from the actual place</span></span>
        ${big ? `<a data-act="noop" href="https://www.pexels.com/photo/${st[0]}/" target="_blank" rel="noopener" class="absolute right-2 bottom-2 max-w-[40%] truncate text-[10px] leading-tight px-1.5 py-0.5 rounded bg-black/45 text-white/85 hover:text-white">Photo: ${esc(st[1])} · Pexels</a>` : ''}
      </div>`;
    }
    // 스톡 사진을 끄면 장소 종류에 맞는 일러스트 (사진처럼 보이지 않게 "Illustration" 표시)
    const sc = sceneSvg(s), center = sc.kind === 'food' || sc.kind === 'dessert';
    return `<div class="w-full ${h} relative overflow-hidden" role="img" aria-label="${esc(s.name)} (illustration)">
        ${sc.svg}
        <div class="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent pointer-events-none"></div>
        <span class="absolute ${center ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl' : 'right-6 top-1/2 -translate-y-1/2 text-5xl'} drop-shadow-lg select-none" aria-hidden="true">${esc(s.emoji || c.icon)}</span>
        <span class="absolute right-2 bottom-2 text-[10px] px-1.5 py-0.5 rounded bg-black/35 text-white/85">Illustration</span>
      </div>`;
  }

  card(s) {
    const c = CATS[s.cat], saved = this.state.plan.includes(s.id);
    const evHere = this._spotEvents && this._spotEvents[s.id];
    // 오른쪽 위 배지: New → 순위 → Classic → 숨은 명소 → 리뷰 추천 → 아이 동반 (해당 없으면 배지 없음)
    // 새로 생겨 뜨는 곳은 순위 배지 밑에 "New Rising Spot" 배지를 하나 더 달아요
    const rising = isJustOpened(s);
    const badge = this.isNew(s) && !rising ? 'New' : this.rankOf(s) ? this.rankLabel(s) : rising ? '' : isVanClassic(s) ? CLASSIC.label
      : c.basis === 'reviews' ? 'Review pick' : isKid(s) && !KIDS_ONLY ? 'Kid-friendly' : '';
    // 순위 배지는 크게, 1~3위는 금색으로 (New 배지일 땐 순위가 아니에요)
    const rank = badge && badge !== 'New' && this.rankOf(s);
    // 지금 가 볼 이유 중 가장 강한 것 하나 (행사·시즌·검색 증가). 순위의 근거라 제목 바로 밑에 둬요
    const tagWhy = spotTags(s).length ? { pick: true, label: tagLabel(spotTags(s).find(x => x.id === this.state.tag) || spotTags(s)[0]), text: (spotTags(s).find(x => x.id === this.state.tag) || spotTags(s)[0]).spots[s.id].why } : null;   // 해시태그가 있으면 이유 박스는 항상 (점수와 상관없이 모든 태그를 같게)
    const baseWhy = this.nowReasons(s).filter(x => x.score >= NOW_MIN)[0] || (s.filler ? this.pickReason(s) : null) || tagWhy;
    // 행사가 있으면 같은 이유 박스 안에 (따로 떠 있는 줄 없이 모든 카드가 같은 구조로)
    const evText = evHere ? eventReason(evHere.ev, s, evHere.next) : '';
    const why = baseWhy || (evText ? { pick: true, label: this.eventTitle(evHere.ev, s), text: evText } : null);
    const evExtra = evText && why && !why.lunch && why.text !== evText ? evText : '';
    return `
    <article data-act="open" data-val="${s.id}" tabindex="0" aria-label="See details for ${esc(s.name)}" class="group cursor-pointer flex flex-col rounded-2xl sm:rounded-[20px] bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.07)] hover:ring-2 hover:ring-violet-400 dark:hover:ring-violet-600 hover:shadow-[0_2px_4px_rgba(15,23,42,.06),0_14px_32px_rgba(15,23,42,.12)] transition overflow-hidden">
      <div class="relative">
        ${this.cover(s, 'h-24 sm:h-40')}
        <span class="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full max-w-[60%] truncate bg-white/90 text-slate-900 shadow-sm">${esc(s.cuisine || c.label)}</span>
        ${badge || rising ? `<div class="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 flex flex-col items-end gap-1 max-sm:scale-90 origin-top-right">
          ${badge ? `<span class="${rank ? `text-sm font-extrabold px-3 py-1 shadow ring-2 ring-white/80 ${rank <= 3 ? 'bg-amber-400 text-slate-950' : 'bg-violet-700 text-white'}` : `text-xs font-bold px-2.5 py-1 text-white ${badge === 'New' ? 'bg-fuchsia-600' : 'bg-slate-900/75'}`} rounded-full">${badge}</span>` : ''}
          ${rising ? `<span class="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white">${JUST_OPENED.label}</span>` : ''}
        </div>` : ''}
      </div>
      <div class="p-2.5 sm:p-5 flex flex-col flex-1">
        <h3 class="text-sm sm:text-lg font-bold leading-snug group-hover:text-violet-700 dark:group-hover:text-violet-300">${esc(s.name)}</h3>
        <div class="flex items-center justify-between gap-2"><p class="min-w-0 text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">${esc(s.area)}${s.dist != null ? `, ${fmtDist(s.dist)}` : ''}</p>${spotTags(s).length ? `<p class="max-sm:hidden shrink-0 flex gap-1">${spotTags(s).slice(0, 2).map(t => `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300">#${esc(t.label)}</span>`).join('')}</p>` : ''}</div>
        ${this.planLater() && HOURS_READY ? (() => {
          // 날짜 계획: 그날(들) 영업시간
          const ph = this.planHours(s);
          if (!ph) return '<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Hours unknown</p>';
          return `<p class="mt-1.5 sm:mt-2 text-xs sm:text-sm font-semibold ${ph.open ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}"><span class="inline-block w-2 h-2 rounded-full ${ph.open ? 'bg-emerald-500' : 'bg-slate-400'} mr-1.5 align-middle"></span> ${esc(ph.text)}</p>`; })()
        : (() => { const oi = openInfo(s); return oi
          ? `<p class="mt-1.5 sm:mt-2 text-xs sm:text-sm font-semibold ${oi.open ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}"><span class="inline-block w-2 h-2 rounded-full ${oi.open ? 'bg-emerald-500' : 'bg-rose-500'} mr-1.5 align-middle"></span> ${esc(oi.text)}</p>`
          : HOURS_READY ? '<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Hours unknown</p>' : ''; })()}
        <p class="hidden sm:block mt-2 sm:mt-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 clamp2">${esc(s.summary)}</p>
        ${why ? why.lunch ? `
        <div class="mt-2 sm:mt-3 border-l-4 border-emerald-500 rounded-r-lg bg-emerald-50 dark:bg-emerald-500/10 pl-2 pr-2 sm:pl-3 sm:pr-3 py-1 sm:py-2">
          <p class="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">${esc(why.label)}</p>
          <p class="mt-0.5 text-xs sm:text-sm leading-snug text-slate-800 dark:text-slate-100 clamp2 max-sm:[-webkit-line-clamp:4]">${esc(why.text)}</p>
        </div>` : `
        <div class="mt-2 sm:mt-3 border-l-4 ${why.hh ? 'border-amber-500' : 'border-amber-400'} rounded-r-lg bg-amber-50 dark:bg-amber-500/10 pl-2 pr-2 sm:pl-3 sm:pr-3 py-1 sm:py-2">
          <p class="text-xs sm:text-sm leading-snug text-slate-800 dark:text-slate-100 clamp2 max-sm:[-webkit-line-clamp:4]">${esc(why.text)}</p>
          ${evExtra ? `<p class="mt-1 text-xs sm:text-sm leading-snug text-slate-800 dark:text-slate-100 clamp2">${esc(evExtra)}</p>` : ''}
        </div>` : ''}
        ${(() => {
          // 이유 박스(Coming up 등)와 별개로, What parents say → Tiny Trips tip 순서, 각각 3줄까지 (사용자 요청, 2026-10-04)
          const tip = this.tipItems(s, 'card')[0];
          // 휴대폰에서는 What parents say → Tiny Trips tip → Good to know(입장료) 중 있는 첫 번째 하나만, 3줄까지 (사용자 요청, 2026-10-04)
          const mobLabel = SAYS[s.id] ? ['What parents say:', SAYS[s.id]] : tip ? ['Tiny Trips tip:', tip] : null;
          const mob = mobLabel ? `<div class="sm:hidden mt-2 text-xs text-sky-900 dark:text-sky-200 bg-sky-50 dark:bg-sky-500/10 rounded-lg px-2 py-1.5"><p class="${LINES3}"><span class="font-semibold">${mobLabel[0]}</span> ${esc(mobLabel[1])}</p></div>` : this.factsLine(s, true);
          if (!tip && !SAYS[s.id]) return mob;
          return mob + `<div class="max-sm:hidden mt-2 sm:mt-3 text-xs sm:text-sm text-sky-900 dark:text-sky-200 bg-sky-50 dark:bg-sky-500/10 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5">${SAYS[s.id] ? `<p class="[display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden"><span class="font-semibold">What parents say:</span> ${esc(SAYS[s.id])}</p>` : ''}${tip ? `<p class="${SAYS[s.id] ? 'mt-1 ' : ''}[display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden" title="Tiny Trips tip, checked on the official site. Open the card for more."><span class="font-semibold">Tiny Trips tip:</span> ${esc(tip)}</p>` : ''}</div>`;
        })()}

        ${TRENDS_ON && s.rise != null && s.rise >= RISING_MIN && !(why && why.icon === RISE_ICON) ? `<p class="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300" title="Google searches in BC over the last 3 days, compared with the 4 weeks before">${riseText(s.rise, 'searches')}</p>` : ''}
        ${(() => { const m = GUIDES[s.id] && GUIDES[s.id].menu; return m && m.length ? `<p class="hidden sm:block mt-2 text-sm text-slate-700 dark:text-slate-300"><span class="font-semibold">Popular:</span> ${m.slice(0, 3).map(esc).join(' · ')}</p>` : ''; })()}
        ${(() => {
          // 해피아워: 지금이면 눈에 띄는 배지(위 이유 박스가 이미 해피아워면 생략), 오늘 이따면 시작 시간, 아니면 주간 일정 한 줄
          // 런치 스페셜도 같은 방식. 한 줄만: 지금 해피아워 → 지금 런치 → 오늘 이따(해피아워 → 런치) → 주간 일정
          const hh = hhState(s), lu = lunchState(s);
          const tone = { hh: ['bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200', 'bg-amber-500', 'text-amber-800 dark:text-amber-300'],
            lu: ['bg-emerald-100 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200', 'bg-emerald-500', 'text-emerald-800 dark:text-emerald-300'] };
          const nowLine = (st, t) => `
        <p class="mt-2 self-start inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md ${tone[t][0]}"><span class="w-2 h-2 rounded-full ${tone[t][1]} animate-pulse" aria-hidden="true"></span>${esc(st.label)} now${st.until ? ` · until ${esc(st.until)}` : ''}${t === 'lu' && st.h.price ? ` · ${esc(st.h.price)}` : ''}</p>`;
          const laterLine = (st, t) => `
        <p class="mt-2 text-xs font-semibold ${tone[t][2]}">${esc(st.label)} today ${esc(hhRange(st.next))}${t === 'lu' && st.h.price ? ` · ${esc(st.h.price)}` : ''}</p>`;
          const later = this.planLater();
          if (later) { const st = hh || lu; return st ? `
        <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">${esc(st.label)}: ${esc(hhSchedule(st.h).map(g => `${g.days} ${g.times}`).join(' · '))}</p>` : ''; }
          if (hh && hh.active) return why && why.hh ? '' : nowLine(hh, 'hh');
          if (lu && lu.active) return why && why.lunch ? '' : nowLine(lu, 'lu');
          if (hh && hh.next) return laterLine(hh, 'hh');
          if (lu && lu.next) return laterLine(lu, 'lu');
          const st = hh || lu;
          return st ? `
        <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">${esc(st.label)}: ${esc(hhSchedule(st.h).map(g => `${g.days} ${g.times}`).join(' · '))}</p>` : ''; })()}
        ${this.factsLine(s)}
        <!-- 태그·나이·시간·가격 줄은 카드 높이와 상관없이 늘 카드 아래쪽(버튼 바로 위)에 맞춰요 -->
        <div class="mt-auto">
        ${KIDS_ONLY && isKid(s) ? (() => {
          // 아이 동반 장소: 무료/유료·실내/야외·종류 태그와 맞는 나이
          const kp = kidProfile(s);
          return `
        <p class="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5">${kp.tags.map(t => `<span class="text-xs font-semibold px-2 py-0.5 rounded-full ${t === 'Free' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">${esc(t)}</span>`).join('')}</p>
        <p class="max-sm:hidden mt-2 sm:mt-3 text-xs sm:text-sm font-semibold text-teal-700 dark:text-teal-300">${esc(kp.agesText)}</p>`; })() : ''}
        <div class="mt-2 sm:mt-3 flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-0.5 sm:gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          ${KIDS_ONLY && isKid(s) ? `<span class="max-sm:hidden">${esc(s.time)}</span>${s.price && !/^free$/i.test(s.price) ? `<span class="max-sm:hidden">${esc(s.price)}</span>` : ''}` : `${s.price ? `<span class="max-sm:hidden">${esc(s.price)}</span>` : ''}<span class="max-sm:hidden">${esc(s.time)}</span><span>${ENV[s.env]}</span>`}${parkShort(s) ? `<span class="max-sm:hidden">${esc(parkShort(s))}</span>` : ''}
          ${isKid(s) && badge !== 'Kid-friendly' && !this.state.kidsOnly && !KIDS_ONLY ? '<span class="font-semibold text-teal-700 dark:text-teal-300">Kid-friendly</span>' : ''}
        </div>
        </div>
        ${this.state.reviewsOn && this.reviewStats(s.id) ? (() => { const st = this.reviewStats(s.id); return `<p class="mt-1.5 sm:mt-2 text-xs sm:text-sm"><span class="text-amber-500" aria-hidden="true">★</span> <span class="font-semibold">${st.avg.toFixed(1)}</span> <span class="text-slate-500 dark:text-slate-400">· ${plural(st.n, 'parent review')}</span></p>`; })() : ''}
        <div class="pt-2.5 sm:pt-4 ${this.state.reviewsOn ? 'flex gap-2' : ''}">
        ${this.state.reviewsOn ? `<button data-act="rvcard" data-val="${s.id}" class="shrink-0 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm border border-slate-200 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200">★ Review</button>` : ''}
          <button data-act="save" data-val="${s.id}" aria-pressed="${saved}" class="w-full py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm border ${saved ? 'bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-300' : 'border-slate-200 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200'}">${saved ? '♥ Saved' : '♡ Save'}</button>

        </div>
      </div>
    </article>`;
  }


  // ── 단계별 추천 (Explore) ──
  // 한 단계의 조건에 맞는지. skip에 든 단계는 보지 않아요 ("Also worth a try"에서 조건을 하나씩 풀 때)
  wizMatch(s, a, skip = []) {
    const kp = kidProfile(s), on = k => !skip.includes(k) && a[k] && a[k] !== 'any' && a[k] !== 'mixed';
    if (on('when')) {
      if (a.when === 'now') {
        const h = vanWallClock().getHours();
        if (isDaylight(s)) { if (h < 7 || h >= 20) return false; }   // 해 지는 시각은 계산하지 않고, 밤(8pm–7am)엔 공원을 빼요
        else { const o = openInfo(s); if (!o || !o.open) return false; }
      } else if (whenDates(a.when).every(d => closedOn(s, d))) return false;
    }
    if (on('place') && s.env !== 'both' && s.env !== a.place) return false;
    if (on('dur')) {
      const [lo, hi] = kp.hours;
      if (a.dur === 'short' && lo > 1) return false;
      if (a.dur === 'mid' && (hi < 1.5 || lo > 3)) return false;
      if (a.dur === 'long' && hi < 3) return false;
    }
    if (on('purpose') && kp.purpose !== 'both' && kp.purpose !== a.purpose) return false;
    if (!skip.includes('age') && a.age === 'mixed' && kp.ages.length < 2) return false;
    if (on('age') && !kp.ages.includes(a.age[0])) return false;
    return true;
  }
  // Explore를 질문(단계별 추천)으로 보는 중인지 (Browse all이면 예전처럼 전체 목록과 필터)
  // 안내 페이지로 들어왔을 때 맨 위 안내 띠: 지금 보는 안내 이름과 전체 보기 버튼
  guideBanner() {
    const g = this.state.guide;
    if (!g) return '';
    return `<div class="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100"><span class="font-semibold">${esc(g.title)}</span><span class="text-teal-700 dark:text-teal-300">${g.set.size} places</span>${this.state.guideAll ? '' : '<button data-act="guideclear" class="ml-auto min-h-[36px] px-3 py-1 rounded-lg font-semibold border border-teal-300 hover:border-teal-500 dark:border-teal-700">Show all places</button>'}</div>`
  }
  pickMode() { return WIZARD && this.state.view === 'list' && !this.state.browse; }
  // 추천 결과에서 위치를 고르면: 그 지역에 맞는 반경(도시 5 km, 동네 2 km, 내 위치 5 km)으로 10곳부터 다시 보여줘요
  wizLocPatch(key) {
    if (!(this.pickMode() && this.state.wiz.done)) return {};
    return { radius: key === 'here' ? 5 : ORIGINS[key] ? placeRadius(key) : this.state.radius, wizMore: 10 };
  }
  // 다시 그린 뒤 새 목록 제목으로 스크롤
  wizLocScroll() {
    if (!(this.pickMode() && this.state.wiz.done)) return;
    setTimeout(() => { const t = document.getElementById('list-top'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0);
  }
  // 결과 보기: "언제"를 날짜 계획(when)으로 옮겨서 카드가 그날 영업시간·행사를 보여주게 해요
  wizFinish(w) {
    const when = { tomorrow: 'tomorrow', weekend: 'weekend' }[w.ans.when] || '';
    this.set({ wiz: { ...w, done: true, editing: false }, wizMore: 10, when, openNow: false, modal: null });
    const top = this.root.querySelector('main');
    if (top) top.scrollIntoView({ block: 'start' });
  }
  // 추천 점수: 그날 이 장소의 행사 > 시즌 > 새로 연 곳 > 밴쿠버 클래식·가족 추천 > 사진 있는 곳. 날마다 조금씩 순서가 바뀌게 날짜로 섞어요
  wizScore(s) {
    const r = this.nowReasons(s).reduce((x, y) => x + y.score, 0);
    const day = vanDate(0); let h = 0; for (const ch of s.id + day) h = (h * 31 + ch.charCodeAt(0)) % 1000;
    return r + (isVanClassic(s) ? 1.5 : 0) + (s.family ? 1 : 0) + (s.kids ? 0.5 : 0) + (s.photo ? 0.7 : 0) + h / 2000 - (s.dist != null ? s.dist * (this.nearActive() ? 0.4 : 0.08) : 0);   // 위치를 골랐으면 가까운 곳이 더 앞으로
  }
  // 종류가 한쪽으로 몰리지 않게 (같은 종류는 3곳까지), 모자라면 나머지로 채워요
  wizPick(list, n, exclude = new Set()) {
    const out = [], per = {};
    for (const s of list) { if (out.length >= n) break; if (exclude.has(s.id)) continue; const k = kidProfile(s).kind; if ((per[k] || 0) < 3) { out.push(s); per[k] = (per[k] || 0) + 1; } }
    for (const s of list) { if (out.length >= n) break; if (!exclude.has(s.id) && !out.includes(s)) out.push(s); }
    return out;
  }
  // 추천 결과: { top: 조건에 모두 맞는 곳(점수 순), also: 조건을 하나씩 풀어서 채운 곳, relaxed: 푼 단계 }
  wizResults() {
    const a = this.state.wiz.ans, origin = this.origin(), radius = this.state.radius;
    const o = ORIGINS[this.state.nearKey], inArea = o ? new RegExp(`(^|[(,] ?)${o.label}\\b`, 'i') : null;
    let pool = SPOTS.filter(s => isKid(s) && !['food', 'dessert'].includes(s.cat) && (!s.venue || EVENTS.some(ev => ev.spotId === s.id && upcomingDates(ev, 14).length)))   // 행사 장소(호박밭 등)는 2주 안에 그곳 행사가 있으면
      .map(s => ({ ...s, dist: origin ? km(origin, s) : null }));
    if (this.nearActive() && radius !== 'any') pool = pool.filter(s => s.dist <= radius || (inArea && inArea.test(s.area || '')));
    if (this.state.indoor) pool = pool.filter(s => s.env === 'indoor' || s.env === 'both');
    pool.forEach(s => { s.score = this.wizScore(s); });
    pool.sort((x, y) => y.score - x.score);
    // 시즌 태그(#FallColours 등)나 New Rising Spots를 골랐으면 그 장소만
    const tagDef = activeTags().find(t => t.id === this.state.tag);
    if (tagDef) pool = pool.filter(s => tagDef.spots[s.id]);
    if (this.state.tag === 'justopened') pool = pool.filter(isJustOpened);
    // 체크 필터: 켠 조건에 모두 맞는 곳만. 칩에 보이는 숫자는 필터를 켜기 전 기준이에요
    const FXF = { free: s => /^free/i.test(s.price || ''), stroller: s => !!strollerInfo(s), rain: s => s.env !== 'outdoor', short: s => kidProfile(s).hours[1] <= 2 };
    const base = pool.filter(s => this.wizMatch(s, a));
    this._fxCounts = Object.fromEntries(Object.keys(FXF).map(k => [k, base.filter(FXF[k]).length]));
    const fxOn = this.state.fxOn;
    pool = pool.filter(s => Object.keys(FXF).every(k => !fxOn[k] || FXF[k](s)));
    const match = pool.filter(s => this.wizMatch(s, a));
    const top = this.wizPick(match, this.state.wizMore);
    let also = [], relaxed = [];
    if (top.length < 10) {
      // 덜 중요한 조건부터 풀어요: 시간 → 목적 → 예산 → 나이 (나이는 첫 질문이라 가장 늦게, 언제는 끝까지 지켜요)
      const order = ['dur', 'purpose', 'age'], shown = new Set(top.map(s => s.id));
      for (let i = 1; i <= order.length && top.length + also.length < 10; i++) {
        const skip = order.slice(0, i);
        const more = this.wizPick(pool.filter(s => this.wizMatch(s, a, skip)), 10 - top.length - also.length, new Set([...shown, ...also.map(s => s.id)]));
        if (more.length) { also.push(...more); relaxed = skip; }
      }
    }
    return { top, also, relaxed, total: match.length };
  }
  wizardView() {
    const w = this.state.wiz, a = w.ans;
    // 결과 위 칩: "Either"만으로는 무슨 조건인지 몰라서 상관없음은 풀어서 써요
    const ANY = { when: 'Any time', place: 'Indoor or outdoor', dur: 'Any length', purpose: 'Any kind of outing', age: 'Any age' };
    const optLabel = (k, v) => v === 'any' ? ANY[k] : ((WIZ.find(x => x.key === k) || { opts: [] }).opts.find(o => o[0] === v) || [])[1] || '';
    if (!w.done) {
      const st = WIZ[w.step], pick = a[st.key];
      return `
      <div class="wiz-wrap"><section class="wiz-card mt-4 sm:mt-6 max-w-2xl mx-auto" aria-label="Find a place">
        <span class="wiz-deco" style="right:-6px;top:-16px;font-size:34px;transform:rotate(12deg)" aria-hidden="true">🎈</span><span class="wiz-deco" style="left:-8px;bottom:-24px;font-size:32px;transform:rotate(-8deg)" aria-hidden="true">🧺</span><span class="wiz-deco max-sm:hidden" style="left:-26px;top:84px;font-size:28px;transform:rotate(-14deg)" aria-hidden="true">🍂</span><span class="wiz-deco max-sm:hidden" style="right:-18px;bottom:46px;font-size:28px;transform:rotate(10deg)" aria-hidden="true">🌳</span>
        <div class="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Step ${w.step + 1} of ${WIZ.length}</span>
          <span class="flex items-center gap-4">
            ${w.step || Object.keys(a).length ? '<button data-act="wizreset" class="underline">Start over</button>' : ''}
          </span>
        </div>
        <div class="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden" role="progressbar" aria-valuemin="1" aria-valuemax="${WIZ.length}" aria-valuenow="${w.step + 1}" aria-label="Progress">
          <div class="h-full rounded-full bg-violet-600 transition-all" style="width:${((w.step + 1) / WIZ.length) * 100}%"></div>
        </div>
        <h2 class="mt-4 sm:mt-6 text-xl sm:text-3xl font-extrabold tracking-tight">${esc(st.q)}</h2>
        <div class="mt-3 sm:mt-5 grid grid-cols-2 gap-2 sm:gap-3" role="radiogroup" aria-label="${esc(st.q)}">
          ${st.opts.map(([v, label, sub]) => { const on = pick === v; return `
          <button data-act="wizopt" data-val="${st.key}:${v}" role="radio" aria-checked="${on}" class="text-left min-h-[56px] sm:min-h-[72px] rounded-xl sm:rounded-2xl px-3 py-2 sm:p-4 border-2 transition-colors ${on ? 'border-violet-600 bg-violet-50 dark:bg-violet-500/15 dark:border-violet-400' : 'border-slate-200 bg-white hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-500/60'}">
            <span class="flex items-center justify-between gap-2"><span class="text-[15px] sm:text-lg font-bold leading-snug ${on ? 'text-violet-800 dark:text-violet-200' : ''}">${esc(label)}</span>${on ? '<span class="w-6 h-6 shrink-0 rounded-full bg-violet-600 text-white text-sm flex items-center justify-center" aria-hidden="true">✓</span>' : ''}</span>
            ${sub ? `<span class="mt-0.5 sm:mt-1 block text-xs sm:text-sm text-slate-600 dark:text-slate-300">${esc(sub)}</span>` : ''}
          </button>`; }).join('')}
        </div>
        <div class="mt-4 sm:mt-6 flex items-center justify-between gap-3">
          <button data-act="wizback" ${w.step ? '' : 'disabled'} class="min-h-[48px] px-5 rounded-xl font-semibold border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-40">← Back</button>
          <button data-act="wiznext" ${pick ? '' : 'disabled'} class="min-h-[48px] px-6 rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40">${w.editing ? 'Update results' : w.step === WIZ.length - 1 ? 'Get recommendations' : 'Next →'}</button>
        </div>
        ${/* 답 옵션과 헷갈리지 않게 Back/Next 아래 별도 동작으로: 5개 질문을 모두 "상관없음"으로 두고 바로 결과 (Browse all 대신, 2026-10-01) */ w.editing ? '' : `
        <div class="mt-4 text-center">
          <button data-act="wizany" class="min-h-[44px] px-5 rounded-full text-sm font-semibold bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">Skip all ${WIZ.length} questions and show results <span aria-hidden="true">⏭</span></button>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">We’ll pick from every age, time, length and kind of outing.</p>
        </div>`}
      </section>
      ${w.editing ? '' : `<div class="max-w-2xl mx-auto mt-8 pt-5 border-t border-slate-200 dark:border-slate-800"><p class="text-sm text-slate-600 dark:text-slate-300">Or jump straight to what's in season:</p>${this.seasonChips()}</div>`}</div>`;
    }
    const r = this.wizResults();
    const grid = list => `<div class="mt-5 grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3">${list.map(s => this.card(s)).join('')}</div>`;
    const late = a.when === 'now' && (() => { const h = vanWallClock().getHours(); return h >= 20 || h < 7; })();
    return `
      <section class="mt-6" aria-label="Your choices">
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          ${WIZ.map((st, i) => `<button data-act="wizedit" data-val="${i}" title="Change: ${esc(st.q)}" class="min-h-[28px] sm:min-h-[36px] px-2.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-violet-100 text-violet-800 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-200">${esc(optLabel(st.key, a[st.key]))}</button>`).join('')}
          ${/* 고른 조건이 하나라도 있으면: 한 번에 모두 "상관없음"으로 바꾸고 목록 새로 */ WIZ.some(st => a[st.key] && a[st.key] !== 'any') ? `<button data-act="wizany" class="ml-1 min-h-[28px] sm:min-h-[36px] px-2.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">Set all to Any <span aria-hidden="true">⏭</span></button>` : ''}
          <button data-act="wizreset" class="ml-1 min-h-[28px] sm:min-h-[36px] text-xs sm:text-sm font-semibold underline text-slate-600 dark:text-slate-300">Start over</button>
        </div>
        ${this.seasonChips()}
        ${this.fxChips()}
        <div class="mt-2 sm:mt-3">${this.locationBar([], true)}</div>
        ${this.state.geoMsg ? `<p class="mt-1 text-xs text-slate-600 dark:text-slate-300" role="status">${esc(this.state.geoMsg)}</p>` : ''}
      </section>
      ${this.planBar()}
      ${late ? `<p class="mt-4 text-sm text-slate-600 dark:text-slate-300">It's late, so most places are closed. <button data-act="wizset" data-val="when:tomorrow" class="font-semibold underline text-violet-700 dark:text-violet-300">See what's good tomorrow →</button></p>` : ''}
      <div id="list-top" class="mt-8 scroll-mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 class="text-2xl font-extrabold tracking-tight">${r.top.length ? (r.top.length >= 10 ? `Your top ${r.top.length}` : `${r.top.length} ${r.top.length === 1 ? 'match' : 'matches'}`) + (this.nearActive() ? ` near ${esc(this.originLabel())}` : '') : 'No places match all your choices'}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">${r.top.length ? `${plural(r.total, 'place')} fit everything you picked. Best picks first.` : 'Here are close matches instead.'}</p>
      </div>
      ${r.top.length ? grid(r.top) : ''}
      ${r.total > r.top.length ? `<div class="mt-6 text-center"><button data-act="wizmore" class="min-h-[44px] px-5 py-2.5 rounded-xl font-semibold border border-slate-300 text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:text-slate-200">Show more matches <span class="font-normal text-slate-500 dark:text-slate-400">(${r.total - r.top.length} left)</span></button></div>` : ''}
      ${r.also.length ? `
      <div class="mt-10">
        <h3 class="text-xl font-bold">Also worth a try</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">Close matches that don't fit your ${r.relaxed.map(k => ({ age: 'age', dur: 'time', purpose: 'outing type', place: 'indoor/outdoor' })[k]).join(', ').replace(/, ([^,]*)$/, ' or $1')} choice${r.relaxed.length > 1 ? 's' : ''}.</p>
      </div>${grid(r.also)}` : ''}`;
  }

  listView(items) {
    const { radius } = this.state;
    if (!items.length && this.nearActive() && radius !== 'any') {
      // 거리 제한 없이 다시 세어서, 가장 가까운 결과까지 한 번에 넓히는 버튼을 보여줘요 (없으면 아래 "Nothing matched"로)
      this.state.radius = 'any';
      const all = this.list();
      this.state.radius = radius;
      if (all.length || !this.state.q) {
        const nearest = all.length ? Math.min(...all.map(s => s.dist)) : null;
        const target = nearest == null ? RADII[RADII.indexOf(radius) + 1] : RADII.find(r => r !== 'any' && r >= nearest) || 'any';
        const n = all.filter(s => target === 'any' || s.dist <= target).length;
        const what = this.state.q ? (this.state.kw.length ? this.state.kw.map(k => k.label).join(' or ') : `matches for “${esc(this.state.q)}”`) : 'spots';
        return `
      <div id="list-top" class="mt-8 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-10 text-center">
        <p class="text-lg font-bold">No ${esc(what)} within ${radiusLabel(radius)} of ${esc(this.originLabel())}</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${nearest != null ? `The nearest is ${fmtDist(nearest)} away.` : `Try a wider radius${this.state.cat !== 'all' ? ' or another category' : ''}.`}</p>
        <button data-act="radius" data-val="${target}" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">${target === 'any' ? `Show ${nearest != null ? plural(n, 'place') : 'any distance'}` : `Show ${nearest != null ? `${plural(n, 'place')} within` : 'within'} ${radiusLabel(target)}`}</button>
      </div>`;
      }
    }
    // 검색 결과가 없을 때: 조건을 하나 빼 보라고 안내하고 예시 검색어를 보여줘요
    if (!items.length && this.state.q) return `
      <div class="mt-8 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-10 text-center">
        <p class="text-lg font-bold">Nothing matched “${esc(this.state.q)}”</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Remove one of the chips above, or try another search.</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          ${(EATS_ON ? ['ramen near me now', 'free things to do with kids this weekend', 'brunch saturday', 'sushi in burnaby', 'rainy day indoor', 'happy hour nearby', 'lunch special tomorrow'] : ['free things to do this weekend', 'spray park near me', 'playground in burnaby', 'rainy day indoor', 'farm this saturday', 'museum tomorrow']).map(x => `<button data-act="qtry" data-val="${esc(x)}" class="px-3 py-1.5 rounded-full text-sm font-semibold border border-slate-300 text-slate-700 hover:border-violet-400 dark:border-slate-600 dark:text-slate-200">${esc(x)}</button>`).join('')}
        </div>
        <button data-act="qclear" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Clear search</button>
      </div>`;
    if (!items.length) return `
      <div class="mt-8 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-12 text-center">
        ${this.state.openNow && this._hidden && (this._hidden.closed + this._hidden.unknown) ? `
        <p class="text-lg font-bold">Nothing here is open right now</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">${this._hidden.closed} closed and ${this._hidden.unknown} with unknown hours are hidden.</p>
        <button data-act="opennow" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Show all, open or not</button>` : this.state.view === 'eats' && this.state.hh ? `
        <p class="text-lg font-bold">No more happy hours today${this.nearActive() ? ' nearby' : ''}</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Most run 2–6pm, and many come back after 9pm.</p>
        <button data-act="hh" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Show all restaurants</button>` : this.state.view === 'eats' && this.state.lunch ? `
        <p class="text-lg font-bold">No more lunch specials today${this.nearActive() ? ' nearby' : ''}</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Most run from about 11:30am to 3pm on weekdays.</p>
        <button data-act="lunch" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Show all restaurants</button>` : this.state.view === 'eats' && this.state.price ? `
        <p class="text-lg font-bold">No ${esc(this.state.price === '$$$' ? '$$$ or $$$$' : this.state.price)} places here</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Try another price range or cuisine.</p>
        <button data-act="price" data-val="${esc(this.state.price)}" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Show all prices</button>` : this.state.view !== 'eats' && (this.state.indoor || this.state.kidsOnly) ? `
        <p class="text-lg font-bold">No ${[this.state.kidsOnly && 'kid-friendly', this.state.indoor && 'indoor'].filter(Boolean).join(' ')} spots here</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Try another category, or loosen the filters.</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          ${this.state.indoor ? '<button data-act="indoor" class="px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Include outdoor places</button>' : ''}
          ${this.state.kidsOnly ? '<button data-act="kids" class="px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Show all ages</button>' : ''}
        </div>` : `
        <p class="text-lg font-bold">No spots here yet</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Try another category.</p>
        <button data-act="cat" data-val="all" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Show all spots</button>`}
      </div>`;
    const grid = list => `<div class="mt-6 grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3">${list.map(s => this.card(s)).join('')}</div>`;
    // 카드 목록 제목: "Events this week"(행사)와 구별되게 크게
    const heading = (id, title, sub) => `
      <div id="${id}" class="mt-8 scroll-mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 class="text-2xl font-extrabold tracking-tight">${title}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">${sub}</p>
      </div>`;
    // 행사·파머스 마켓은 위쪽 Events / Markets 탭으로 옮겼어요 (2026-10-01)
    const events = '';
    // 나머지(언제 가도 같은 곳)는 12개씩 "Show more"
    const more = rest => {
      const shown = rest.slice(0, this.state.restShown);
      return `${grid(shown)}${rest.length > shown.length ? `
      <div class="mt-6 text-center">
        <button data-act="more" class="min-h-[44px] px-5 py-2.5 rounded-xl font-semibold border border-slate-300 text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:text-slate-200">Show more <span class="font-normal text-slate-500 dark:text-slate-400">(${rest.length - shown.length} left)</span></button>
      </div>` : ''}`;
    };
    // 키워드 검색: 관련도 순 결과 하나로 (지금 가 볼 이유 순위는 카드 배지·이유 박스에 그대로 남아요)
    if (this.state.q && this.state.kw.length && !this.state.hh && !this.state.lunch) return heading('list-top', `Results for “${esc(this.state.q)}”`, `${plural(items.length, 'place')}, best match first.`) + more(items);
    // 해피아워 필터를 켰을 때: "지금 하는 곳"(끝나는 시간이 이른 순이 아니라 추천 순) → "오늘 이따 시작하는 곳"(시작 시간 순)
    // 런치 스페셜 필터도 같은 방식 ("지금 하는 곳" → "오늘 이따")
    if (this.state.view === 'eats' && (this.state.hh || this.state.lunch) && this.planLater()) {
      const w = this.state.when, when = w === 'weekend' ? 'this weekend' : w === 'tomorrow' ? 'tomorrow' : `on ${WHEN[w]}`;
      return heading('list-top', `${this.state.hh ? 'Happy hours' : 'Lunch specials'} ${when}`, `${plural(items.length, 'place')}. Each card shows the days and times.`) + grid(items);
    }
    if (this.state.view === 'eats' && (this.state.hh || this.state.lunch)) {
      const fn = this.state.hh ? hhState : lunchState, title = this.state.hh ? 'Happy hour on now' : 'Lunch specials on now';
      const st = new Map(items.map(s => [s.id, fn(s)]));
      const now = items.filter(s => st.get(s.id).active);
      const later = items.filter(s => !st.get(s.id).active).sort((a, b) => hhMin(st.get(a.id).next.f) - hhMin(st.get(b.id).next.f) || (a.dist ?? 0) - (b.dist ?? 0));
      return `
      ${now.length ? heading('list-top', title, `${plural(now.length, 'place')}. Times and deals are checked on each restaurant's site or recent listings, but they change, so confirm before you go.`) + grid(now) : ''}
      ${later.length ? heading(now.length ? 'list-rest' : 'list-top', 'Later today', `${plural(later.length, 'place')}, earliest first.`) + grid(later) : ''}`;
    }
    if (this.state.sort !== 'fresh') return heading('list-top', 'Closest first', plural(items.length, 'spot')) + more(items) + events;
    // 순위(번호)는 지금 가 볼 이유가 있는 곳에만. 10곳을 채운 곳은 번호 없이 "Also worth a try"로
    const ranked = items.filter(s => this.freshRank(s) <= 1 && !s.overflow), fill = items.filter(s => s.filler);
    const rest = items.filter(s => (this.freshRank(s) > 1 || s.overflow) && !s.filler);
    const eats = this.state.view === 'eats';
    const reasons = eats ? 'a happy hour on now, open now and a good fit for the time of day or the weather, talked about lately, newly opened, or searched more than usual'
      : 'an event here or something in season';
    // 날짜 계획: "Worth going this weekend"처럼 그 날 기준으로
    const w = this.state.when, period = w === 'weekend' ? 'this weekend' : w === 'today' ? 'today' : w === 'tomorrow' ? 'tomorrow' : w ? `on ${WHEN[w]}` : '';
    const newCount = ranked.filter(s => this.isNew(s)).length;
    const fillNote = 'Vancouver classics and places Google reviewers love, in no particular order.';
    return `
      ${ranked.length ? `${heading('list-top', period ? `Worth going ${period}` : 'Worth going now', period ? `${plural(ranked.length, 'spot')} with a reason to go ${period}: ${this.planLater() ? 'an event that day, something in season, or newly opened' : reasons}.` : eats ? `${plural(ranked.length, 'spot')} with a reason to go right now.` : `${plural(ranked.length, 'spot')} with a reason to go this week: ${reasons}.`)}
      ${newCount ? `<p class="mt-3 text-sm font-semibold text-fuchsia-700 dark:text-fuchsia-300">${plural(newCount, 'new spot')} since your last visit, shown first.</p>` : ''}
      ${grid(ranked)}` : ''}
      ${fill.length ? (ranked.length ? `
      <div class="mt-8">
        <h3 class="text-lg font-bold">Also worth a try</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">${fillNote}</p>
      </div>` : heading('list-top', 'Top picks', `Nothing stands out ${period || (eats ? 'right now' : 'this week')}, so here are ${fillNote}`)) + grid(fill) : ''}
      ${events}
      ${rest.length ? `${heading('list-rest', ranked.length || fill.length ? 'Good any day' : 'Spots', `${plural(rest.length, 'spot')}. Vancouver classics first, then the rest in no particular order.`)}
      ${more(rest)}` : ''}`;
  }

  mapView(items) {
    const origin = this.origin();
    // Explore 추천 결과에서 왔으면 그 장소들만, 추천 순서 번호(1, 2, 3…)로
    const picks = this.state.mapPicks;
    if (picks) items = picks.map(byId).filter(Boolean).map((s, i) => ({ ...s, pickNo: i + 1, dist: origin ? km(origin, s) : null }));
    const mark = s => (isVanClassic(s) ? '◆' : '★');
    // 실제 지도는 다 그린 뒤 drawMap()이 #lmap에 그려요 (핀·기준 위치·반경 원)
    // 행사·파머스 마켓 핀: Events·Markets 탭과 같은 기준(앞으로 6주, 위치 필터). 추천 장소만 보는 지도엔 안 그려요
    const evAll = picks ? [] : this.upcomingEvents(45).map(ev => { const sp = ev.spotId && byId(ev.spotId); return ev.lat != null ? ev : sp ? { ...ev, lat: sp.lat, lng: sp.lng } : null; }).filter(Boolean).filter(ev => !this.state.kw.length || this.state.kw.some(k => k.re.test(`${ev.name} ${ev.summary || ""} ${ev.venue || ""} ${ev.area || ""} ${ev.type === "market" ? "market farmers market" : ev.type}`)));   // 검색 중이면 검색어에 맞는 행사·마켓만
    const evMarkets = evAll.filter(ev => ev.type === 'market'), evOthers = evAll.filter(ev => ev.type !== 'market');
    const showEv = this.state.mapEvents !== false, showMk = this.state.mapMarkets !== false;
    const evPin = ev => ({ id: ev.id, name: ev.name, forParents: !!ev.forParents, lat: ev.lat, lng: ev.lng, market: ev.type === 'market', icon: ev.icon || (ev.type === 'market' ? '🥕' : '🎪'), when: `${dayLabel(ev.next)} · ${eventHours(ev)}`, spotId: ev.spotId && byId(ev.spotId) ? ev.spotId : '', source: ev.source || '' });
    this._map = { items: items.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, color: CATS[s.cat].dot, mark: mark(s), num: typeof mark(s) === 'number' })), picks: !!picks,
      events: [...(showEv ? evOthers : []), ...(showMk ? evMarkets : [])].map(evPin) };
    const evToggle = (act, on, label, n) => `<button data-act="${act}" aria-pressed="${on}" class="flex items-center gap-1 px-2 py-0.5 rounded-full border ${on ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/20 dark:border-amber-500/40 dark:text-amber-100' : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400'}">${label} <span class="font-normal">${n}</span></button>`;
    const picksBar = picks ? `
    <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-4 bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:ring-violet-500/30">
      <p class="font-semibold text-violet-900 dark:text-violet-100">Showing your ${items.length} picks from Explore</p>
      <button data-act="view" data-val="list" class="text-sm font-semibold underline text-violet-800 dark:text-violet-200">← Back to the list</button>
      <button data-act="mapall" class="ml-auto text-sm font-semibold underline text-slate-600 dark:text-slate-300">Show all places</button>
    </div>` : '';
    return `${picksBar}
    <div class="mt-3 sm:mt-6 grid grid-cols-1 gap-2 sm:gap-4 md:grid-cols-3">
      <div class="min-w-0 md:col-span-2 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden">
        <div class="px-3 sm:px-5 py-1.5 sm:py-3 flex flex-wrap gap-x-2.5 gap-y-0.5 sm:gap-3 text-[11px] sm:text-xs font-semibold border-b border-slate-100 dark:border-slate-800">
          ${Object.entries(CATS).filter(([k]) => EATS_ON || !PAGES.eats.includes(k)).map(([, c]) => `<span class="flex items-center gap-1 sm:gap-1.5"><span class="w-3 h-3 rounded-full" style="background:${c.dot}"></span>${c.label}</span>`).join('')}
          <span class="hidden sm:inline text-slate-500 dark:text-slate-400">★ review pick · ◆ classic</span>
          ${picks ? '' : `${evToggle('mapevents', showEv, '🎪 Events', evOthers.length)}${evToggle('mapmarkets', showMk, '🥕 Markets', evMarkets.length)}<span class="hidden sm:inline text-slate-500 dark:text-slate-400">next 6 weeks</span>`}
        </div>
        <div id="lmap" class="h-[32vh] min-h-[200px] sm:h-[50vh] sm:min-h-[320px] md:h-[calc(100vh-14rem)] md:min-h-[420px] lg:h-[600px] bg-slate-100 dark:bg-slate-800" role="region" aria-label="Map of places"></div>
      </div>
      <div data-keep-scroll="maplist" class="space-y-1.5 sm:space-y-3 max-h-[36vh] overflow-y-auto sm:max-h-[40vh] md:max-h-[calc(100vh-14rem)] lg:max-h-[650px]">
        ${this._map.events.length ? `<p class="px-1 pt-0.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Events & markets · next 6 weeks</p>${this._map.events.map((ev, i) => `
          <div class="relative"><button data-act="evfocus" data-val="${i}" data-maphl="ev:${i}" class="w-full text-left rounded-xl p-2 sm:p-4 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-violet-300 dark:hover:ring-violet-700 flex gap-3">
            <span class="w-7 h-7 shrink-0 rounded-full bg-white text-base flex items-center justify-center border-2 ${ev.market ? 'border-emerald-600' : 'border-fuchsia-700'}" aria-hidden="true">${esc(ev.icon)}</span>
            <span class="flex-1 min-w-0 pr-14">
              <span class="block font-bold truncate">${esc(ev.name)}${ev.forParents ? ' <span class="text-[11px] font-bold text-amber-700 dark:text-amber-300">😉 For parents</span>' : ''}</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400 truncate">${ev.market ? 'Market' : 'Event'}, ${esc(ev.when)}</span>
            </span>
          </button><button data-act="shareev" data-val="${esc(ev.id)}" aria-label="Share ${esc(ev.name)}" class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">${this.state.shareMsg && this.state.shareMsg.id === ev.id ? esc(this.state.shareMsg.text) : 'Share'}</button></div>`).join('')}<p class="px-1 pt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Places</p>` : ''}
        ${items.map(s => `
          <button data-act="open" data-val="${s.id}" data-maphl="${s.id}" class="w-full text-left rounded-xl p-2 sm:p-4 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-violet-300 dark:hover:ring-violet-700 flex gap-3">
            <span class="w-7 h-7 shrink-0 rounded-full text-white text-xs font-extrabold flex items-center justify-center" style="background:${CATS[s.cat].dot}">${mark(s)}</span>
            <span class="flex-1 min-w-0">
              <span class="block font-bold truncate">${esc(s.name)}</span>
              <span class="block text-xs text-slate-500 dark:text-slate-400">${CATS[s.cat].label}, ${esc(s.area)}${s.dist != null ? `, ${fmtDist(s.dist)}` : ''}</span>
            </span>
          </button>`).join('') || '<p class="text-sm text-slate-500">No spots match these filters.</p>'}
      </div>
    </div>`;
  }
  // 목록에서 가리킨 장소의 핀 강조 (맨 위로 올리고, 지도 밖이면 살짝 옮겨 보이게)
  highlightPin(id, on) {
    const p = this._pins && this._pins[id], map = this._leaflet; if (!p || !map || !map._container || !map._container.isConnected) return;
    const el = p.mk.getElement(), pin = el && el.querySelector('.spot-pin');
    if (pin) pin.classList.toggle('hl', on);
    p.mk.setZIndexOffset(on ? 5000 : p.base);
    if (on && !map.getBounds().pad(-0.1).contains(p.mk.getLatLng())) map.panTo(p.mk.getLatLng(), { animate: true });
  }
  // 실제 지도 그리기: 화면을 통째로 다시 그릴 때마다 새로 만들되, 보던 위치·확대는 이어가요
  async drawMap() {
    const el = document.getElementById('lmap'); if (!el || !this._map) return;
    try { await loadLeaflet(); } catch (e) { el.innerHTML = '<p class="p-6 text-sm text-slate-500">The map could not load. Check your connection.</p>'; return; }
    if (!el.isConnected) return;
    const { items, picks } = this._map, L = window.L;
    const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: true });
    L.tileLayer(TILES, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    // 핀: 번호가 작을수록(순위가 높을수록) 위에 오게
    const z = m => typeof m === 'number' ? 1000 - m : 0;
    this._pins = {};
    items.forEach(s => {
      const icon = L.divIcon({ className: '', html: `<div class="spot-pin" style="background:${s.color}">${esc(String(s.mark))}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
      const mk = L.marker([s.lat, s.lng], { icon, title: s.name, keyboard: true, zIndexOffset: z(s.mark) }).addTo(map).on('click', () => { this.opener = null; this.openModal(s.id); });
      this._pins[s.id] = { mk, base: z(s.mark) };
    });
    // 행사·마켓 핀: 누르면 다음 날짜·시간과 장소/공식 정보 링크
    (this._map.events || []).forEach((ev, ei) => {
      const icon = L.divIcon({ className: '', html: `<div class="spot-pin ev${ev.market ? ' mk' : ''}">${esc(ev.icon)}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
      const html = `<div style="min-width:180px"><p style="font-weight:700;margin:0">${esc(ev.name)}${ev.forParents ? ' <span style="font-size:11px;font-weight:700;background:#fef3c7;color:#78350f;padding:1px 6px;border-radius:4px;white-space:nowrap">For parents 😉</span>' : ''}</p><p style="margin:4px 0">${esc(ev.when)}</p>
        <p style="margin:0">${ev.spotId ? `<button data-act="open" data-val="${esc(ev.spotId)}" style="text-decoration:underline;font-weight:600;margin-right:10px">Place details</button>` : ''}${/^https:\/\//.test(ev.source) ? `<a href="${esc(ev.source)}" target="_blank" rel="noopener" style="text-decoration:underline">Official info ↗</a>` : ''}</p></div>`;
      const emk = L.marker([ev.lat, ev.lng], { icon, title: ev.name, keyboard: true, zIndexOffset: 2000 }).addTo(map).bindPopup(html);
      this._pins['ev:' + ei] = { mk: emk, base: 2000 };
    });
    // 기준 위치(내 위치·지역)와 반경 원
    const o = this.origin();
    if (o) {
      const r = this.state.radius;
      if (this.nearActive() && r !== 'any') L.circle([o.lat, o.lng], { radius: r * 1000, color: '#0d9488', weight: 2, dashArray: '6 4', fillOpacity: 0.08 }).addTo(map);
      L.marker([o.lat, o.lng], { icon: L.divIcon({ className: '', html: '<div class="spot-pin origin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), title: this.state.nearKey === 'here' ? 'You' : o.label, interactive: false }).addTo(map);
    }
    // 보던 위치 이어가기: 같은 목록이면 저장한 위치로, 아니면 추천 장소에 맞춰 확대(전체 목록은 메트로 밴쿠버 범위)
    const key = (picks ? 'p:' : 'a:') + items.length + ':' + (items[0] ? items[0].id : '') + ':' + this.state.nearKey + ':' + this.state.radius;
    if (this._mapSaved && this._mapSaved.key === key) map.setView(this._mapSaved.center, this._mapSaved.zoom, { animate: false });
    else if ((picks || this.nearActive()) && items.length) map.fitBounds(L.latLngBounds(items.map(s => [s.lat, s.lng])).pad(0.15), { maxZoom: 14, animate: false });
    else map.fitBounds(METRO_BOUNDS, { animate: false });
    const save = () => { this._mapSaved = { key, center: map.getCenter(), zoom: map.getZoom() }; };
    save(); map.on('moveend zoomend', save);
    this._leaflet = map;
  }
  // Saved 탭 안에서 "Saved"(저장한 곳)와 "My reviews"(내가 리뷰를 쓴 곳) 전환
  // ── 확인된 방문 정보 (data/spot-facts.json): 카드 한 줄 · 모달 상자 · 결과 필터 ──
  // 카드: "Adults $38, kids $27 · Book ahead" (확인된 입장료가 있을 때만)
  factsLine(s, mobile = false) {
    const f = fx(s.id), a = f && f.admission;
    if (!a || !a.text) return '';
    const bk = a.booking === 'required' ? 'Book ahead' : a.booking === 'recommended' ? 'Booking advised' : '';
    return `<p class="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 ${mobile ? 'sm:hidden ' + LINES3 : 'max-sm:hidden'}"><span class="font-semibold">Admission:</span> ${esc(a.text)}${bk ? ` <span class="font-semibold text-amber-700 dark:text-amber-300">${bk}.</span>` : ''}</p>`;
  }
  // 모달 "Good to know": 입장료·예약, 유모차·기저귀·수유, 먹거리, 확인한 날짜와 출처 (다른 두 상자와 같은 모양)
  factsBox(s) {
    const f = fx(s.id), a = (f && f.admission) || {}, m = (f && f.amenities) || {}, fd = (f && f.food) || {};
    const chips = [
      m.stroller === 'yes' ? 'Stroller-friendly' : m.stroller === 'partial' ? 'Partly stroller-friendly' : m.stroller === 'no' ? 'Not stroller-friendly' : strollerInfo(s) === 'big' ? 'Stroller-friendly (large facility)' : '',
      m.stairs === 'none' ? 'No stairs' : m.stairs === 'some' ? 'Some stairs' : m.stairs === 'many' ? 'Many stairs' : '',
      m.changing === true ? 'Changing table' : '', m.nursing === true ? 'Nursing space' : '', m.washrooms === true ? 'Washrooms' : ''
    ].filter(Boolean);
    const food = [
      fd.onsite === 'cafe' ? 'Café on site' : fd.onsite === 'snacks' ? 'Snacks on site' : fd.onsite === 'none' ? 'No food on site' : '',
      fd.outside === 'allowed' ? 'Bring your own food' : fd.outside === 'not-allowed' ? 'Outside food not allowed' : ''
    ].filter(Boolean);
    const label = x => `<span class="font-semibold">${x}:</span> `;
    const booking = a.booking === 'required' ? ` <span class="font-semibold text-amber-700 dark:text-amber-300">Booking required${a.bookingNote ? `: ${esc(a.bookingNote)}` : ''}.</span>`
      : a.booking === 'recommended' ? ` <span class="font-semibold text-amber-700 dark:text-amber-300">Booking recommended${a.bookingNote ? `: ${esc(a.bookingNote)}` : ''}.</span>` : a.booking === 'none' ? ' No booking needed.' : '';
    const items = [];
    if (a.text || booking) items.push(label('Admission') + (a.text ? esc(a.text) + (booking ? '.' : '') : '') + booking);
    if (chips.length || m.note) items.push(label('With little ones') + esc(chips.join(' · ')) + (chips.length && m.note ? '. ' : '') + (m.note ? esc(m.note) : ''));
    if (food.length || fd.nearby) items.push(label('Food') + esc(food.join(' · ')) + (food.length && fd.nearby ? '. ' : '') + (fd.nearby ? `Nearby: ${esc(fd.nearby)}` : ''));
    if (!items.length) return '';
    const src = /^https:\/\//.test(a.source || '') ? ` · <a href="${esc(a.source)}" target="_blank" rel="noopener" class="underline">source</a>` : '';
    const checked = f && f.checked ? `Info checked ${esc(shortDate(f.checked))}${src}` : '';
    return infoBox('slate', 'Good to know', items, checked, 'Good to know');
  }
  // 결과 위 체크 필터 칩 (숫자 = 지금 조건에 맞는 곳 중 그 필터에 해당하는 곳)
  fxChips() {
    const on = this.state.fxOn, n = this._fxCounts || {};
    const chip = (k, label) => `<button data-act="fxtoggle" data-val="${k}" aria-pressed="${on[k]}" class="min-h-[36px] px-3 rounded-full text-xs sm:text-sm font-semibold border ${on[k] ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 bg-white text-slate-800 hover:border-violet-400 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100'}">${label}${n[k] != null ? ` <span class="font-normal opacity-80">${n[k]}</span>` : ''}</button>`;
    return `<div class="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2" role="group" aria-label="Narrow the results"><span class="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">Narrow down:</span>${chip('free', 'Free only')}${chip('stroller', 'Stroller OK')}${chip('rain', 'Rain OK')}${chip('short', '2 hrs or less')}</div>`;
  }
  planView() {
    const on = this.state.savedTab === 'reviews', btn = (v, label) => `<button data-act="savedtab" data-val="${v}" aria-pressed="${(v === 'reviews') === on}" class="min-h-[40px] px-4 rounded-lg text-sm font-bold transition-colors ${(v === 'reviews') === on ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-violet-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'}">${label}</button>`;
    return `<div class="mt-6 inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800" role="group" aria-label="Saved or my reviews">${btn('saved', `Saved${this.state.plan.length ? ` (${this.state.plan.length})` : ''}`)}${btn('reviews', 'My reviews')}</div>${on ? this.myReviewsView() : this.savedList()}`;
  }
  myReviewsView() {
    const { user, reviewsOn } = this.state;
    const box = body => `<div class="mt-6 max-w-2xl rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-8 text-center">${body}</div>`;
    if (!FIREBASE_CONFIG) return box('<p class="font-bold">Reviews aren’t available right now.</p>');
    if (!reviewsOn) return box('<p class="text-slate-600 dark:text-slate-300" role="status">Loading reviews…</p>');
    if (!user) return box('<p class="text-lg font-bold">Sign in to see your reviews</p><p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in with the same Google account you used to write them.</p><button data-act="rvsignin" class="mt-4 min-h-[44px] px-5 rounded-xl font-semibold bg-violet-600 text-white">Sign in with Google</button>');
    const stars = n => `<span class="text-amber-500" aria-label="${n} out of 5 stars">${'★'.repeat(n)}<span class="text-slate-300 dark:text-slate-600">${'★'.repeat(5 - n)}</span></span>`;
    const mine = Object.values(this.reviews || {}).flat().filter(r => r.uid === user.uid && byId(r.spotId)).sort((a, b) => b.date - a.date);
    if (!mine.length) return box('<p class="text-lg font-bold">No reviews yet</p><p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Open a place and tap ★ Review to share how it went.</p><button data-act="view" data-val="list" class="mt-4 min-h-[44px] px-5 rounded-xl font-semibold bg-violet-600 text-white">Browse places</button>');
    return `
    <div class="mt-6 max-w-2xl">
      <h2 class="text-2xl font-bold">My reviews</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400">${plural(mine.length, 'place')} you’ve reviewed, newest first. Tap one to edit or delete your review.</p>
      <div class="mt-4 space-y-2">${mine.map(r => { const s = byId(r.spotId); return `
        <button data-act="open" data-val="${s.id}" class="w-full text-left flex items-start gap-3 rounded-xl p-4 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 hover:ring-violet-300 dark:hover:ring-violet-700">
          <span class="w-8 h-8 shrink-0 rounded-full text-white text-sm flex items-center justify-center" style="background:${CATS[s.cat].dot}" aria-hidden="true">${CATS[s.cat].icon}</span>
          <span class="flex-1 min-w-0">
            <span class="block font-bold truncate">${esc(s.name)}</span>
            <span class="block text-xs text-slate-500 dark:text-slate-400">${esc(s.area)} · ${esc(`${MON[r.date.getMonth()]} ${r.date.getDate()}, ${r.date.getFullYear()}`)}</span>
            <span class="block text-sm mt-0.5">${stars(r.rating)}</span>
            ${r.text ? `<span class="block mt-1 text-sm text-slate-700 dark:text-slate-300 clamp2">${esc(r.text)}</span>` : ''}
          </span>
        </button>`; }).join('')}</div>
    </div>`;
  }
  savedList() {
    const spots = this.state.plan.map(byId);
    if (!spots.length) return `
      <div class="mt-8 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-12 text-center">
        <p class="text-lg font-bold">Nothing saved yet</p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Tap ♡ Save on any card to keep it here. Saved spots stay in this browser.</p>
        <button data-act="view" data-val="list" class="mt-4 px-4 py-2 rounded-lg font-semibold bg-violet-600 text-white">Browse spots</button>
      </div>`;
    let total = 0;
    const rows = spots.map((s, i) => {
      const leg = i > 0 ? km(spots[i - 1], s) : null; if (leg) total += leg;
      return `
      ${leg != null ? `<p class="pl-12 text-xs text-slate-500 dark:text-slate-400">↓ ${leg.toFixed(1)} km straight-line</p>` : ''}
      <div class="flex items-center gap-3 rounded-xl p-4 bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
        <span class="w-8 h-8 shrink-0 rounded-full text-white text-sm font-extrabold flex items-center justify-center" style="background:${CATS[s.cat].dot}">${i + 1}</span>
        <button data-act="open" data-val="${s.id}" class="flex-1 min-w-0 text-left">
          <span class="block font-bold truncate">${esc(s.name)}</span>
          <span class="block text-xs text-slate-500 dark:text-slate-400">${CATS[s.cat].icon} ${CATS[s.cat].label}, ${esc(s.area)}, ${esc(s.time)}</span>
        </button>
        <a href="${dirUrl(s)}" target="_blank" rel="noopener" class="text-sm font-semibold text-violet-700 dark:text-violet-300 px-2">Directions</a>
        <button data-act="save" data-val="${s.id}" class="text-sm font-semibold text-slate-500 hover:text-rose-600 px-2" aria-label="Remove ${esc(s.name)}">Remove</button>
      </div>`;
    }).join('');
    return `
    <div class="mt-8 max-w-2xl">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold">Saved</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">${plural(spots.length, 'spot')}${spots.length > 1 ? `, about ${total.toFixed(1)} km straight-line in the order you saved them` : ''}</p>
        </div>
        <div class="flex gap-2">
          <button data-act="copyplan" class="px-4 py-2 rounded-lg font-semibold bg-violet-600 hover:bg-violet-700 text-white">Copy to share</button>
          <button data-act="clearplan" class="px-4 py-2 rounded-lg font-semibold border border-slate-200 dark:border-slate-700">Clear all</button>
        </div>
      </div>
      ${this.state.copyMsg ? `<p class="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">${esc(this.state.copyMsg)}</p>` : ''}
      ${this.state.copyText ? `<textarea readonly class="mt-2 w-full h-40 p-3 rounded-lg text-sm bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">${esc(this.state.copyText)}</textarea>` : ''}
      <div class="mt-5 space-y-2">${rows}</div>
    </div>`;
  }

  modal(s, items) {
    const c = CATS[s.cat], st = this.state, tf = TF[st.tf];
    const cur = items.find(x => x.id === s.id);
    const rank = cur ? this.rankOf(cur) : null;
    const saved = st.plan.includes(s.id);
    const key = `${s.id}|${st.tf}|${st.weather}`, ai = this.ai[key];
    let aiBlock = '';
    if (this.sample) {
      if (ai && ai.status === 'loading') aiBlock = `
        <div class="mt-3 rounded-lg p-3 bg-white dark:bg-slate-800 ring-1 ring-violet-200 dark:ring-violet-500/30">
          <p id="ai-out" class="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">${esc(ai.text || 'Analyzing...')}</p>
          <button data-act="aistop" class="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">Stop</button>
        </div>`;
      else if (ai && (ai.status === 'done' || ai.status === 'error')) aiBlock = `
        <div class="mt-3 rounded-lg p-3 bg-white dark:bg-slate-800 ring-1 ring-violet-200 dark:ring-violet-500/30">
          ${ai.text ? `<p class="text-xs font-bold text-violet-700 dark:text-violet-300">AI analysis (${tf.label.toLowerCase()}, ${WEATHER[st.weather].label.toLowerCase()})</p><p class="mt-1 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">${esc(ai.text)}</p>` : ''}
          ${ai.msg ? `<p class="mt-1 text-sm text-rose-600 dark:text-rose-400">${esc(ai.msg)}</p>` : ''}
          <button data-act="ai" data-val="${s.id}" class="mt-2 text-xs font-semibold text-violet-700 dark:text-violet-300">Analyze again</button>
        </div>`;
      else aiBlock = `<button data-act="ai" data-val="${s.id}" class="mt-3 px-3 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white">Get an AI take for right now</button>`;
    }

    return `
    <div data-act="close" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center" style="position:fixed; inset:0; z-index:50; padding-top:max(12px, env(safe-area-inset-top, 0px)); padding-bottom:max(12px, env(safe-area-inset-bottom, 0px));">
      <div data-act="noop" role="dialog" aria-modal="true" tabindex="-1" aria-label="${esc(s.name)}" class="outline-none relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col" style="max-height:100%">
        <button data-act="close" aria-label="Close" class="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white text-lg flex items-center justify-center shadow-lg">✕</button>
        <div data-keep-scroll="modal" class="overflow-y-auto">
        <div class="relative">
          ${this.cover(s, 'h-56')}
          <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
        </div>
        <div class="px-6 pt-5">
          <div class="flex items-baseline justify-between gap-3"><p class="text-sm font-semibold text-slate-500 dark:text-slate-400">${c.label}${s.cuisine ? ` · ${esc(s.cuisine)}` : ''}</p><button data-act="report" data-val="${esc(s.id)}" class="shrink-0 text-xs underline font-semibold text-violet-700 dark:text-violet-300">Something wrong? Tell us</button></div>
          <h2 class="mt-1 text-3xl font-bold leading-tight pr-2">${esc(s.name)}</h2>
          <p class="mt-1 text-slate-600 dark:text-slate-300">${esc(s.area)}${cur && cur.dist != null ? `, ${fmtDist(cur.dist)}` : ''}</p>
          ${this.planLater() && HOURS_READY && this.planHours(s) ? (() => { const ph = this.planHours(s); return `
          <p class="mt-1 text-sm font-semibold ${ph.open ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}"><span class="inline-block w-2 h-2 rounded-full ${ph.open ? 'bg-emerald-500' : 'bg-slate-400'} mr-1.5 align-middle"></span> ${esc(ph.text)} <span class="font-normal text-slate-500 dark:text-slate-400">(${WHEN_PHRASE[this.state.when]})</span></p>`; })()
          : (() => { const oi = openInfo(s); return oi ? `
          <p class="mt-1 text-sm font-semibold ${oi.open ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}"><span class="inline-block w-2 h-2 rounded-full ${oi.open ? 'bg-emerald-500' : 'bg-rose-500'} mr-1.5 align-middle"></span> ${esc(oi.text)}</p>${(s.hoursSource === 'osm' || s.hoursSource === 'web') && !isDaylight(s) ? `
          <p class="text-xs text-slate-500 dark:text-slate-400">Hours: ${esc(weekHours(s) || s.hours)}</p>` : ''}`
            : '<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Opening hours unknown. Check Google Maps.</p>'; })()}
          ${TRENDS_ON && s.rise != null ? `
          <p class="mt-2 text-sm ${s.rise >= RISING_MIN ? 'font-semibold text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}">${riseText(s.rise, 'search level')}
            <span class="block text-xs font-normal text-slate-500 dark:text-slate-400">Google searches in BC over ${esc(recentLabel())}, compared with the 4 weeks before.</span></p>` : ''}
        </div>

        <div class="p-6 space-y-6">
          ${(() => {
            // 지금 가 볼 이유: 이 장소의 행사(60일 안) + 시즌 태그를 한 곳에, 영업시간 바로 밑에
            const evs = EVENTS.filter(ev => ev.spotId === s.id).map(ev => ({ ...ev, next: upcomingDates(ev, 60)[0] })).filter(ev => ev.next).sort((a, b) => a.next.localeCompare(b.next));
            const tags = spotTags(s);
            // 먹거리: 최근 기사(링크)·Reddit 글·지금 시간대·날씨에 맞는 이유
            const press = recentPress(s), food = this.nowReasons(s).filter(r => r.label === 'Good right now' || r.label === 'Talked about lately');
            // "Why go now"(행사·시즌)와 Tiny Trips tip(공식 정보)을 한 상자로 합쳤어요 (2026-10-01)
            const notes = NOTES[s.id] ? this.tipItems(s, 'modal') : [], src = (NOTES[s.id] || {}).source || '', host = (/^https:\/\/(?:www\.)?([^/]+)/.exec(src) || [])[1] || '';
            const says = SAYS[s.id];
            if (!evs.length && !tags.length && !press.length && !food.length && !notes.length && !says) return this.factsBox(s);
            // 정리 (사용자 결정, 2026-10-02): 파란 창에는 공식 정보인 Tiny Trips tip만. "지금"(행사·시즌)은 칩 한 줄로, 부모 후기는 파란 창 밖으로. 앞에 나온 말과 겹치는 문장은 숨겨요
            const seen = new Set(); [s.summary, says || '', ...notes].forEach(t => keyWords(t).forEach(w => seen.add(w)));
            const chip = h => `<span class="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">${h}</span>`;
            const line = h => `<p class="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">${h}</p>`;
            const chips = [
              ...evs.map(ev => chip(`<span aria-hidden="true">${esc(ev.icon || '🎪')}</span> ${esc(ev.name)} · ${esc(dayLabel(ev.next))}, ${esc(eventHours(ev))}`)),
              ...tags.map(t => chip(`#${esc(t.label)}`)),
            ].join('');
            const extra = [
              ...food.map(r => line(`<span class="font-semibold">${esc(r.label)}</span> · ${esc(r.text)}`)),
              ...press.map(p => line(`<span class="font-semibold">In the news</span> · ${esc(p.outlet)}, ${esc(shortDate(p.date))}: <a href="${esc(p.url)}" target="_blank" rel="noopener" class="underline">${esc(p.title)} ↗</a>`)),
              ...tags.map(t => { const x = t.spots[s.id]; return overlapsSeen(x.why, seen) ? '' : line(`<span class="font-semibold">#${esc(t.label)}</span> · ${esc(x.why)}${/^https:\/\//i.test(x.source || '') ? ` <a href="${esc(x.source)}" target="_blank" rel="noopener" class="underline text-xs text-slate-500 dark:text-slate-400">Source ↗</a>` : ''}`); }),
            ].join('');
            const chipsBlock = `${chips || extra ? `
          <div>
            ${chips ? `<div class="flex flex-wrap gap-2">${chips}</div>` : ''}${extra}
          </div>` : ''}`;
            const tipBlock = notes.length ? infoBox('sky', 'Tiny Trips tip', notes.slice(0, 2).map(esc), `Checked ${esc(shortDate(NOTES_META.updatedAt))} · ${/^https:\/\//.test(src) ? `<a href="${esc(src)}" target="_blank" rel="noopener" class="underline">${esc(host)} ↗</a>` : 'official site'}. Hours can change.`) : '';
            const saysBlock = says ? infoBox('pink', 'What parents say', [esc(says)]) : '';
            // 순서 (사용자 결정, 2026-10-04): What parents say → Tiny Trips tip → Good to know → 행사·시즌 칩
            return saysBlock + tipBlock + this.factsBox(s) + chipsBlock; })()}


          ${[[lunchState(s), 'emerald', LUNCH_META], [hhState(s), 'amber', HAPPY_META]]
            // 점심 전에는 런치가 먼저 보이도록 (지금 하는 쪽이 있으면 그쪽을 위로)
            .sort((a, b) => !!(b[0] && b[0].active) - !!(a[0] && a[0].active))
            .map(([st, c, meta]) => st ? this.dealSection(st, c, meta) : '').join('')}

          <div class="grid grid-cols-2 gap-3">
            <a href="${mapsUrl(s)}" target="_blank" rel="noopener" class="rounded-xl p-3 text-center bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/20 hover:ring-amber-400">
              <p class="font-bold">Google Reviews ↗</p><p class="text-xs text-slate-500 dark:text-slate-400">Ratings from other parents</p>
            </a>
            <a href="${infoUrl(s)}" target="_blank" rel="noopener" class="rounded-xl p-3 text-center bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-200 dark:ring-emerald-500/20 hover:ring-emerald-400">
              <p class="font-bold">${s.price ? esc(s.price) : 'Prices'} ↗</p><p class="text-xs text-slate-500 dark:text-slate-400">Search prices online</p>
            </a>
          </div>

          ${isRising(s) ? (() => {
            // 평소보다 5% 이상(RISING_MIN) 많이 검색될 때만: 이유(notes.why)와 최근 7일 급상승 연관 검색어
            const n = RISE_NOTES[s.id] || {};
            return `
          <section class="rounded-2xl p-5 bg-gradient-to-br from-rose-50 to-fuchsia-50 dark:from-rose-500/10 dark:to-fuchsia-500/10 ring-1 ring-rose-200 dark:ring-rose-500/20">
            <h3 class="font-bold text-rose-800 dark:text-rose-300">Why more people are searching</h3>
            <p class="mt-2 text-sm text-slate-700 dark:text-slate-300">Searched ${fmtRise(s.rise)} its usual amount over ${esc(recentLabel())}.</p>
            ${n.why ? `<p class="mt-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">${esc(n.why)}${/^https:\/\//i.test(n.source || '') ? ` <a href="${esc(n.source)}" target="_blank" rel="noopener" class="underline text-xs text-slate-500 dark:text-slate-400">Source ↗</a>` : ''}</p>` : ''}
            ${n.rising && n.rising.length ? `
            <p class="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Searches that rose alongside it in the past 7 days (Google Trends, BC)</p>
            <div class="mt-1.5 flex flex-wrap gap-1.5">${n.rising.map(x => `<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/80 dark:bg-slate-800 text-rose-700 dark:text-rose-300">${esc(x)}</span>`).join('')}</div>` : ''}
            ${aiBlock}
          </section>`; })() : ''}

          ${this.reviewSection(s)}
          ${(() => {
            // 주차: 근처(400m) 주차장이 무료인지 유료인지, 요금(OSM에 있으면)과 요금을 확인할 링크. 거리는 보여주지 않아요
            const p = parkingOf(s);
            if (!p) return '';
            // 이름·운영사나 실제 요금이 있는 주차장만 한 줄로 (지상 주차장·유료 같은 일반 설명만 있는 줄은 빼요)
            const lots = p.filter(x => x.name || x.operator || x.charge).map(x => [x.name || x.operator, x.charge ? parkRate(x.charge) : x.fee === 'no' ? 'free' : x.fee === 'yes' ? 'paid' : '', x.customers ? 'customers only' : ''].filter(Boolean).join(' · ')).filter((x, i, a) => x && a.indexOf(x) === i);
            const site = p.map(x => x.site).find(u => /^https?:\/\//.test(u || ''));
            return `
          <section>
            <h3 class="font-bold">Parking</h3>
            <p class="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">${esc(parkSummary(s))}</p>
            ${lots.length ? `<ul class="mt-1.5 space-y-1">${lots.map(x => `<li class="text-sm text-slate-600 dark:text-slate-300">• ${esc(x)}</li>`).join('')}</ul>` : ''}
            ${(() => {
              // 밴쿠버시 길거리 미터: 낮·저녁 요금, 시간 제한, 결제 방법
              const m = METERS.spots[s.id];
              if (!m || m.day == null) return '';
              const range = m.dayMin != null && m.dayMax != null && m.dayMin !== m.dayMax ? ` (${money(m.dayMin)}–${money(m.dayMax)} depending on the block)` : '';
              return `
            <details class="mt-2 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-300">
              <summary class="cursor-pointer font-semibold">City street meters nearby: about ${money(m.day)}/hr daytime</summary>
              <p class="mt-2">Within ${METERS.radius} m: about ${money(m.day)}/hr 9am–6pm${range}${m.eve != null ? `, ${money(m.eve)}/hr 6pm–10pm` : ''}, free 10pm–9am.${m.limit ? ` Usually a ${esc(m.limit.replace(/\s*Hr$/i, '-hour'))} limit.` : ''}</p>
              <p class="mt-1">Pay ${m.card ? 'by card at the meter or ' : ''}with the PayByPhone app.</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Rates: City of Vancouver Open Data, <a href="https://opendata.vancouver.ca/pages/licence/" target="_blank" rel="noopener" class="underline">Open Government Licence – Vancouver</a>.</p>
            </details>`;
            })()}
            <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              <a href="${parkingUrl(s)}" target="_blank" rel="noopener" class="underline text-indigo-700 dark:text-indigo-300">Parking and rates on Google Maps ↗</a>
              ${site ? `<a href="${esc(site)}" target="_blank" rel="noopener" class="underline text-indigo-700 dark:text-indigo-300">Lot website ↗</a>` : ''}
            </p>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Nearby lots from © OpenStreetMap contributors. Rates and time limits change, so check the signs.</p>
          </section>`;
          })()}

          ${(() => {
            // Reddit: 제목에 이 장소가 나온 최근 글 (최대 3개). 사람들이 지금 무슨 얘기를 하는지 보는 근거 링크
            const r = REDDIT.mentions[s.id];
            return r && r.posts && r.posts.length ? `
          <section>
            <h3 class="font-bold">On Reddit lately</h3>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">${plural(r.n, 'post')} naming this place in local subreddits, ${esc(REDDIT.from.slice(0, 7) === REDDIT.to.slice(0, 7) ? `${shortDate(REDDIT.from)}–${+REDDIT.to.slice(8, 10)}` : `${shortDate(REDDIT.from)}–${shortDate(REDDIT.to)}`)}. Opens Reddit.</p>
            <ul class="mt-2 space-y-1.5">${r.posts.filter(p => /^https:\/\/(www\.)?reddit\.com\//.test(p.url)).map(p => `<li class="text-sm"><a href="${esc(p.url)}" target="_blank" rel="noopener" class="underline text-slate-700 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300">${esc(p.title)}</a> <span class="text-xs text-slate-500 dark:text-slate-400">r/${esc(p.sub)} · ${esc(shortDate(p.date))}</span></li>`).join('')}</ul>
          </section>` : '';
          })()}

          ${(() => {
            // 할 거리 · 먹을 것 · 준비물 (안내 파일 + 자동 준비물, 겹치면 한 번만)
            const g = GUIDES[s.id] || {};
            const bring = [...(g.bring || []), ...autoBring(s)].filter((x, i, a) => a.indexOf(x) === i);
            const list = (title, items, mark) => items && items.length ? `
            <div>
              <h3 class="font-bold">${title}</h3>
              <ul class="mt-2 space-y-1.5">${items.map(t => `<li class="text-sm text-slate-700 dark:text-slate-300 flex gap-2"><span class="shrink-0" aria-hidden="true">${mark}</span>${esc(t)}</li>`).join('')}</ul>
            </div>` : '';
            // 음식점·카페는 조사한 인기 메뉴(menu)를 우선 보여주고, 없으면 기존 메모(eat)
            const eats = s.cat === 'food' || s.cat === 'dessert';
            const body = list('Things to do', g.do, '•') + list(eats ? 'Popular menu' : 'What to eat', eats ? (g.menu || g.eat) : g.eat, '•');
            const src = eats && g.menu && /^https:\/\//i.test(g.menuSource || '') ? g.menuSource : '';
            return body ? `
          <section class="space-y-5">
            ${body}
            ${g.do || g.eat || g.menu ? `<p class="text-xs text-slate-500 dark:text-slate-400">${esc(GUIDES_NOTE || 'Check the official site before you go.')}${src ? ` <a href="${esc(src)}" target="_blank" rel="noopener" class="underline">Menu source ↗</a>` : ''}</p>` : ''}
          </section>` : '';
          })()}


          <!-- "How busy is it?" 칸도 뺐어요: 혼잡도는 위의 지도 링크에서 봐요 -->
          <!-- "Tips" 칸은 뺐어요: 위의 Tiny Trips tip과 겹쳐서. 꼭 필요한 안내는 data/spot-notes.json으로 옮겨요 -->


        </div>
        </div>
        <div class="shrink-0 grid grid-cols-[1fr_1fr_auto] gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <a href="${dirUrl(s)}" target="_blank" rel="noopener" class="min-h-[44px] flex items-center justify-center rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700">Directions</a>
          <button data-act="save" data-val="${s.id}" aria-pressed="${saved}" class="min-h-[44px] rounded-xl font-semibold border ${saved ? 'bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-300' : 'border-slate-200 dark:border-slate-700'}">${saved ? '♥ Saved' : '♡ Save'}</button>
          <button data-act="share" data-val="${s.id}" class="min-h-[44px] px-4 rounded-xl font-semibold border border-slate-200 dark:border-slate-700">${st.shareMsg && st.shareMsg.id === s.id ? esc(st.shareMsg.text) : 'Share'}</button>
        </div>
      </div>
    </div>`;
  }
}

const app = new App();
// 맨 위로 가는 버튼: 목록을 600px 넘게 내려오면 나타나고, 누르면 한 번에 올라가요 (다시 그려지는 #app 바깥에 둬서 사라지지 않아요)
(() => {
  const b = document.getElementById('to-top'); if (!b) return;
  const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = () => { b.style.display = window.scrollY < 600 ? 'none' : 'flex'; };
  window.addEventListener('scroll', show, { passive: true }); show();
  b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }));
})();
