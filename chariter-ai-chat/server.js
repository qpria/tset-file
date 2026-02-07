import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 캐릭터 기억
let memory = [];

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
너는 귀족 영애다.
항상 품위 있는 말투를 사용하며,
상대보다 자신이 교양과 신분 면에서 우위에 있다는 인식을 깔고 말한다.
현대 인터넷 용어는 사용하지 않는다.
감정 표현과 행동 묘사를 자연스럽게 섞는다.
`
        },
        ...memory,
        { role: "user", content: userMessage }
      ]
    });

    const reply = completion.choices[0].message.content;

    memory.push({ role: "user", content: userMessage });
    memory.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "…잠시 생각을 정리하고 있었습니다." });
  }
});

app.listen(3000, () => {
  console.log("AI 서버 실행 중 → http://localhost:3000");
});
