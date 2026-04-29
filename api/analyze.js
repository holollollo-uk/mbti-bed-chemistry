export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mbti1, mbti2 } = req.body;

  if (!mbti1 || !mbti2) {
    return res.status(400).json({ error: 'MBTI 유형을 모두 입력해주세요' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  const prompt = `반드시 순수 JSON만 출력해. { 로 시작해서 } 로 끝나야 해. 마크다운, ---, 설명, 코드블록 절대 금지.

너는 성인 전용 MBTI 침대 궁합 전문가야. ${mbti1} 남자와 ${mbti2} 여자의 침대 궁합을 분석해서 아래 키를 가진 JSON 객체로만 답해줘.

summary: 케미 한 줄 요약. 읽자마자 우리 얘기잖아 싶게. 강렬하게.
attraction_male: ${mbti1} 남자가 ${mbti2} 여자한테 끌리는 이유. 2~3문장. 반말. 짧게.
attraction_female: ${mbti2} 여자가 ${mbti1} 남자한테 끌리는 이유. 2~3문장. 반말. 짧게.
bedroom_male: ${mbti1} 남자가 침대에서 어떻게 움직이는지. 구체적으로. 반말. 직접적으로.
bedroom_female: ${mbti2} 여자가 침대에서 어떻게 반응하는지. 구체적으로. 반말. 직접적으로.
hotpoint_male: ${mbti1} 남자 입장에서 가장 뜨거운 순간. 다른 조합에서 못 느끼는 것. 반말.
hotpoint_female: ${mbti2} 여자 입장에서 가장 뜨거운 순간. 다른 조합에서 못 느끼는 것. 반말.
conflict: 침대에서 생기는 문제. 속도 안 맞을 때, 원하는 게 다를 때. 짧게. 반말.
solution: 침대 안에서의 해결법만. 짧게. 반말.
try1: 오늘 밤 새로운 시도 1번. 구체적으로. 읽으면 해보고 싶게.
try2: 오늘 밤 새로운 시도 2번. 구체적으로. 읽으면 해보고 싶게.
try3: 오늘 밤 새로운 시도 3번. 구체적으로. 읽으면 해보고 싶게.

규칙: 반말. 전문용어 금지. 이모지 금지. 한국어. JSON만.
다시 강조: { 로 시작해서 } 로 끝나는 JSON 객체만. 그 외 어떤 텍스트도 절대 금지.`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 4096 }
          })
        }
      );

      const result = await response.json();
      if (result.error) throw new Error(result.error.message);

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.status(200).json({ result: parsed });

    } catch (e) {
      const isOverload = e.message.includes('high demand') || e.message.includes('overloaded');
      if (isOverload && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 3000));
      } else {
        return res.status(500).json({ error: '잠시 후 다시 시도해주세요.' });
      }
    }
  }
}
