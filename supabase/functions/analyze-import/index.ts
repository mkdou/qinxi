type ImportPayload = {
  url?: string;
  title?: string;
  text?: string;
  image?: {
    name?: string;
    type?: string;
    dataUrl?: string;
  } | null;
  requestedSource?: "xiaohongshu" | string;
};

type TrainingQuestion = {
  prompt: string;
  options: string[];
  answer: string;
  explain: string;
};

type ImportAnalysis = {
  type: string;
  theory: string[];
  practice: string[];
  scoreDraft: string;
  training: TrainingQuestion[];
  backendNote?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function splitSourceText(text: string) {
  return text
    .split(/[\n。；;.!！?？]/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function buildTrainingQuestions(source: string): TrainingQuestion[] {
  const questions: TrainingQuestion[] = [];
  const has = (pattern: RegExp) => pattern.test(source);

  if (has(/五线谱|谱号|高音谱|低音谱|加线|线间/)) {
    questions.push(
      { prompt: "高音谱号第 2 线是什么音？", options: ["G", "F", "C"], answer: "G", explain: "高音谱号也叫 G 谱号，第 2 线是 G，也就是 sol。" },
      { prompt: "高音谱号下加一线是什么？", options: ["中央 C", "高音 C", "低音 F"], answer: "中央 C", explain: "高音谱号下加一线是中央 C。" }
    );
  }

  if (has(/黑键|升号|降号|#|♯|b|♭/i)) {
    questions.push(
      { prompt: "C 右边的黑键可以叫什么？", options: ["C# / Db", "E# / Fb", "B# / Cb"], answer: "C# / Db", explain: "同一黑键可按左边白键升高叫 C#，也可按右边白键降低叫 Db。" },
      { prompt: "升号 # 表示什么？", options: ["升高半音", "降低半音", "延长一拍"], answer: "升高半音", explain: "升号表示把当前音升高半音。" }
    );
  }

  if (has(/半音|全音/)) {
    questions.push(
      { prompt: "E 到 F 是什么距离？", options: ["半音", "全音", "八度"], answer: "半音", explain: "E 和 F 中间没有黑键，所以是半音。" },
      { prompt: "两个半音组成什么？", options: ["全音", "四分音符", "和弦"], answer: "全音", explain: "两个连续半音就是一个全音。" }
    );
  }

  if (has(/节拍|拍号|4\/4|节奏|时值|休止/)) {
    questions.push(
      { prompt: "4/4 拍一小节通常有几拍？", options: ["4 拍", "3 拍", "2 拍"], answer: "4 拍", explain: "4/4 拍的上方数字表示每小节 4 拍。" },
      { prompt: "遇到休止符应该怎样？", options: ["不弹但继续数拍", "跳过这一拍", "马上加速"], answer: "不弹但继续数拍", explain: "休止符也是节奏的一部分。" }
    );
  }

  if (has(/和弦|三和弦|135|1-3-5|C大|C 大/)) {
    questions.push(
      { prompt: "C 大三和弦是哪三个音？", options: ["C E G", "C D E", "D F A"], answer: "C E G", explain: "C 大三和弦由 1、3、5 级组成。" },
      { prompt: "三和弦最基础的级数关系是？", options: ["1 3 5", "1 2 3", "2 4 6"], answer: "1 3 5", explain: "先按音阶的 1、3、5 构成三和弦理解。" }
    );
  }

  if (has(/手型|指法|坐姿|放松|慢练|节拍器|分手|合手/)) {
    questions.push(
      { prompt: "新片段练不稳时，优先怎么做？", options: ["慢练小片段", "从头弹很快", "只看不弹"], answer: "慢练小片段", explain: "慢练和小片段循环更容易固定动作。" },
      { prompt: "合手前更稳的步骤是？", options: ["先分手练", "直接加速", "只练右手"], answer: "先分手练", explain: "分手稳定后再用很慢速度合手。" }
    );
  }

  if (!questions.length) {
    questions.push(
      { prompt: "只有链接时，下一步最有效的整理方式是什么？", options: ["补充字幕/截图/笔记", "直接背链接", "删除素材"], answer: "补充字幕/截图/笔记", explain: "没有官方内容授权时，后端不能凭链接读取视频内容。" },
      { prompt: "导入素材最终应该变成什么？", options: ["可练习的知识点", "只收藏链接", "一个空卡片"], answer: "可练习的知识点", explain: "琴习会把可见文字整理成知识点和小测题。" }
    );
  }

  return questions.slice(0, 8);
}

function heuristicAnalyze(payload: ImportPayload): ImportAnalysis {
  const source = [payload.title, payload.text, payload.url, payload.image?.name ? `图片素材：${payload.image.name}` : ""]
    .filter(Boolean)
    .join("\n");
  const lines = splitSourceText(source);
  const lower = source.toLowerCase();
  const hasTheory = /五线谱|简谱|音阶|和弦|节拍|拍号|调号|升号|降号|半音|全音|谱号|音符/.test(source);
  const hasPractice = /手型|坐姿|放松|节拍器|慢练|双手|左手|右手|指法|练习|速度|错音/.test(source);
  const hasScore = /(^|[\s,，|:：])([1-7][#b]?|[a-g](#|b)?m?)(?=$|[\s,，|:：])|和弦|旋律|谱/.test(lower);

  return {
    type: hasScore ? "可能包含琴谱/和弦" : hasPractice ? "练琴技巧" : hasTheory ? "乐理知识" : "待整理素材",
    theory: hasTheory
      ? lines.filter(line => /五线谱|简谱|音阶|和弦|节拍|拍号|调号|升号|降号|半音|全音|谱号|音符/.test(line)).slice(0, 6)
      : ["已保存素材。补充文稿、字幕或截图 OCR 后，可提取更准确的乐理知识。"],
    practice: hasPractice
      ? lines.filter(line => /手型|坐姿|放松|节拍器|慢练|双手|左手|右手|指法|练习|速度|错音/.test(line)).slice(0, 6)
      : ["看完素材后，用 10 分钟慢练验证是否真的有效。"],
    scoreDraft: hasScore
      ? "检测到可能的音名、简谱数字、和弦或谱相关内容。后续可接入 OCR/谱面识别做校对。"
      : "暂未检测到明显琴谱信息。",
    training: buildTrainingQuestions(source),
    backendNote: "当前使用后端规则解析；配置 OPENAI_API_KEY 后可升级为 AI 结构化解析。"
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI response did not contain JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

async function analyzeWithOpenAI(payload: ImportPayload): Promise<ImportAnalysis | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const contentParts: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: [
        "你是钢琴零基础学习助手。请把用户导入的小红书/截图/文稿素材整理成琴习 App 可以使用的结构化学习内容。",
        "只基于用户提供的内容，不要声称已经读取了未提供的视频。",
        "输出 JSON：type, theory[], practice[], scoreDraft, training[]。",
        "training 每项包含 prompt, options(3个), answer, explain。问题要适合零基础钢琴学习，尽量生成可反复练习的小测题。",
        `标题：${payload.title || ""}`,
        `链接：${payload.url || ""}`,
        `文字：${payload.text || ""}`
      ].join("\n")
    }
  ];

  if (payload.image?.dataUrl) {
    contentParts.push({
      type: "input_image",
      image_url: payload.image.dataUrl
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_IMPORT_MODEL") || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: contentParts
        }
      ]
    })
  });

  if (!response.ok) throw new Error(await response.text());
  const result = await response.json();
  const text = result.output_text || result.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((part: { text?: string }) => part.text || "").join("\n");
  const parsed = extractJson(text || "");
  return {
    type: parsed.type || "AI 解析素材",
    theory: Array.isArray(parsed.theory) ? parsed.theory.slice(0, 8) : [],
    practice: Array.isArray(parsed.practice) ? parsed.practice.slice(0, 8) : [],
    scoreDraft: parsed.scoreDraft || "未检测到明确琴谱。",
    training: Array.isArray(parsed.training) ? parsed.training.slice(0, 10) : [],
    backendNote: "已使用后端 AI 解析。"
  };
}

async function tryOfficialXiaohongshuImport(_payload: ImportPayload) {
  const clientId = Deno.env.get("XHS_CLIENT_ID");
  const clientSecret = Deno.env.get("XHS_CLIENT_SECRET");
  const contentApiBase = Deno.env.get("XHS_CONTENT_API_BASE");

  if (!clientId || !clientSecret || !contentApiBase) {
    return null;
  }

  // Placeholder for a future official OAuth/content API integration.
  // Do not add cookie scraping, private API calls, or anti-bot bypass here.
  return null;
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const payload = (await request.json()) as ImportPayload;
    const officialContent = await tryOfficialXiaohongshuImport(payload);
    const enrichedPayload = officialContent ? { ...payload, text: [payload.text, officialContent].filter(Boolean).join("\n") } : payload;
    const analysis = (await analyzeWithOpenAI(enrichedPayload)) || heuristicAnalyze(enrichedPayload);
    return json({ analysis });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
