const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const dataPath = path.join(__dirname, 'data.json');

let data = {};
if (fs.existsSync(dataPath)) {
  data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  console.log(`data.json 로드 완료: ${Object.keys(data).length}개`);
} else {
  console.log('data.json 없음. 요청 시 생성합니다.');
}

async function generateFromAPI(mbti1, mbti2) {
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
  return JSON.parse(clean);
}

app.post('/api/analyze', async (req, res) => {
  const { mbti1, mbti2 } = req.body;

  if (!mbti1 || !mbti2) {
    return res.status(400).json({ error: 'MBTI 유형을 모두 입력해주세요' });
  }

  const key1 = `${mbti1}_${mbti2}`;
  const key2 = `${mbti2}_${mbti1}`;

  if (data[key1]) return res.json({ result: data[key1] });
  if (data[key2]) return res.json({ result: data[key2] });

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  try {
    console.log(`API 호출: ${key1}`);
    const parsed = await generateFromAPI(mbti1, mbti2);
    data[key1] = parsed;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`저장 완료: ${key1} (총 ${Object.keys(data).length}개)`);
    res.json({ result: parsed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
