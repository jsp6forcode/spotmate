# SpotMate AI 검색 Worker

검색창 문장을 Claude Haiku 4.5가 필터(JSON)로 바꿔 주는 Cloudflare Worker예요. API 키는 이 Worker의 Secret에만 두고, 사이트(브라우저)에는 절대 넣지 않아요.

## 설정 (한 번만)

1. **Anthropic 키**: console.anthropic.com
   - Billing에서 크레딧을 충전해요 ($5면 충분해요).
   - Limits에서 월 사용 한도를 걸어요 (예: $10).
   - API Keys에서 키를 만들어요. 키는 한 번만 보이니 바로 2번에서 붙여 넣어요.
2. **Cloudflare Worker**: dash.cloudflare.com (무료 플랜)
   - Workers & Pages > Create > Worker로 새 Worker를 만들어요. 이름은 `spotmate-ai`로 하고 Deploy해요.
   - Edit code에서 기존 코드를 지우고 `ai-search.js` 내용을 붙여 넣은 뒤 Deploy해요.
   - Settings > Variables and Secrets > Add에서 Type은 **Secret**, 이름은 `ANTHROPIC_API_KEY`, 값은 1번의 키로 넣고 Deploy해요.
3. **사이트 연결**: Worker 주소(`https://spotmate-ai.<계정>.workers.dev`)를 `index.html`의 `AI_SEARCH_URL`에 넣어요.

## 동작

- 허용된 사이트만 호출할 수 있어요: `tinytripsvan.ca`(그리고 www, 예전 `jsp6forcode.github.io`)와 로컬 `localhost:8765`. 다른 주소를 더하려면 `ALLOWED_ORIGINS` 변수(쉼표로 구분)를 설정해요.
- IP당 1분에 12회까지 호출할 수 있고, 검색어는 200자까지만 받아요.
- AI는 필터만 골라요. 장소 목록과 순위는 사이트가 자체 데이터로 정해요. 그래서 없는 장소를 지어내지 않아요.
- Worker가 실패하거나 8초 안에 응답하지 않으면, 사이트는 기존 규칙 검색으로 결과를 보여 줘요.

## 비용 (대략)

- 검색 1회에 입력 약 1,500토큰, 출력 약 100토큰이 들어요. Haiku 4.5 기준으로 약 $0.002예요.
- 검색 1,000회에 약 $2가 들어요.
- Cloudflare Workers 무료 플랜은 하루 100,000회까지 호출할 수 있어요.
