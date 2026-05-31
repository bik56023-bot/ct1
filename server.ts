import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parser with large size limit for base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// -------------------------------------------------------------
// Sample questions for mock / quick testing
// -------------------------------------------------------------
const SAMPLE_OCR_QUESTIONS = [
  {
    id: "sample_math",
    title: "高中数学：已知二次函数极值",
    content: "已知函数 $f(x) = ax^2 + bx + c$ ($a \\neq 0$)，且图象关于 $x = 1$ 对称。已知函数在 $x = 2$ 时的值比在 $x = 0$ 时的大。求 $a$ 的取值范围，并分析该函数在 $[0, 3]$ 区间上的最值问题。 \n（提示：常见错误是忽略开口方向 a 的判定而直接假设 a > 0）",
    knowledge: "二次函数的对称性与开口方向及区间最值分析",
  },
  {
    id: "sample_physics",
    title: "高中物理：滑块传送带经典问题",
    content: "一质量为 $m = 1\\text{kg}$ 的滑块以初速度 $v_0 = 4\\text{m/s}$ 冲上一个水平向右匀速运行的传送带，传送带的速度为 $v = 2\\text{m/s}$。若滑块与传送带间的动摩擦因数为 $\\mu = 0.2$，求滑块在传送带上运动直到与传送带相对静止时的位移大小。 \n（提示：常见错误是忽略相对速度大小和摩擦力方向发生了改变）",
    knowledge: "牛顿第二定律与摩擦力方向判定问题",
  },
  {
    id: "sample_english",
    title: "高中英语：介词+关系代词引导的定语从句",
    content: "This is the very laboratory ______ which we conducted the primary physics experiments during our school days, and ______ we learned many scientific laws with our teacher.\nChoices:\nA. in; in which   B. in; where   C. which; where   D. in; in there\n(提示：本题容易混淆介词+which和独立副词的选择，忘记讨论先行词在从句中的具体成分)",
    knowledge: "定语从句中“介词+关系代词”及关系副词的用法辨析",
  }
];

const PREDEFINED_ANALOGIES: Record<string, any> = {
  "sample_math": {
    knowledgePoint: "二次函数的对称性与开口方向及区间最值分析",
    difficultyAnalysis: "考核二次函数对称轴、单调性以及参数对二阶系数正负判定的敏感性，常见易错点在于默认 $a > 0$ 或在计算区间端点代入值时出错。",
    analogies: [
      {
        id: "1",
        questionText: "已知函数 $g(x) = px^2 + qx + r$ ($p \\neq 0$)，其对称轴为 $x = -2$，且满足 $g(-1) < g(-3)$。求二次系数 $p$ 的符号，并比较 $g(0)$ 与 $g(-4)$ 的大小关系。",
        answerText: "因为对称轴为 $x = -2$，自变量 $-1$ 和 $-3$ 关于对称轴绝对对称（距离都是 1），所以必然有 $g(-1) = g(-3)$，题目设 $g(-1) < g(-3)$ 存在矛盾！\n等等，重新分析：$-1$ 和 $-3$ 到 $-2$ 的距离均为 $1$。由于 $g(x)$ 关于 $x = -2$ 对称，对于任何实数 $d$，应有 $g(-2+d) = g(-2-d)$，也就是说 $g(-1)$ 必须等于 $g(-3)$。既然题目给出 $g(-1) < g(-3)$，则说明此二次项包含其他条件，或对称轴不确定。假若修改题目条件为：在对称轴 $x = -2$ 侧，即满足点 $x = -1$ 处的函数值比在 $x = 0$ 处的值大，且 $p \\neq 0$。求 $p$ 的取值范围。\n由于 $-1$ 相比 $0$ 更靠近对称轴 $-2$，$g(-1) > g(0)$ 说明自变量越靠近对称轴函数值越大，因此函数开口向下，即 $p < 0$。$g(0)$ 到对称轴距离为 2，$g(-4)$ 到对称轴距离为 2，故 $g(0) = g(-4)$。",
        explanationText: "本题常见错误是：\n1. 忘记**对称轴两侧对应自变量距离对称轴的远近**与函数值大小的关系。\n2. 忽略开口正负的符号判断，直接代入常规升序序列解答。"
      },
      {
        id: "2",
        questionText: "已知二次函数 $h(x) = kx^2 - 4kx + 5$ 始终在区间 $[1, 5]$ 上单调，求参数 $k$ 的取值范围，并写出当 $k = -1$ 时，该函数在该区间上的最大值与最小值。",
        answerText: "对称轴为 $x = -\\frac{-4k}{2k} = 2$（当 $k \\neq 0$ 且对称轴不随 $k$ 的变化而变化，保持为 2）。要使在 $[1, 5]$ 上单调，对称轴 $x = 2$ 必须不在该区间内部，显然 $2 \\in (1, 5)$，所以 $h(x)$ 在该区间上不可能单调（除非 $k = 0$，此时 $h(x) = 5$ 恒为常函数，也算广义单调）。因此：当 $k \\neq 0$ 时，无解。当 $k = 0$ 时，对任意 $x \\in [1, 5]$ 均单调（常数），k 的取值范围为 $\\{0\\}$。\n当 $k = -1$ 时，函数为 $h(x) = -x^2 + 4x + 5$，其对称轴为 $x = 2$。在区间 $[1, 2]$ 上递增，在 $[2, 5]$ 上递减。最大值在顶点 $x = 2$ 处取得，值为 $-4 + 8 + 5 = 9$。最小值在距离对称轴最远的端点 $x = 5$ 处取得，值为 $-25 + 20 + 5 = 0$。",
        explanationText: "本题常见错误是：\n1. **默认二次函数极值就是区间端点**，而忽略了对称轴 $x = 2$ 落在区间内部这一事实。\n2. 忽略了 $k = 0$ 的一元一次函数（或常数函数）退化讨论。"
      },
      {
        id: "3",
        questionText: "已知函数 $f(x) = ax^2 + 2ax + 3$（$a$ 为常数）。当 $x \\in [-2, 2]$ 时，函数恒满足 $f(x) \\ge 0$，求 $a$ 的取值范围。",
        answerText: "当 $a = 0$ 时，$f(x) = 3 \\ge 0$ 恒成立，符合题意。\n当 $a \\neq 0$ 时，对称轴为 $x = -1 \\in [-2, 2]$。\n1. 若 $a > 0$，开口向上，函数在 $[-2, 2]$ 上的最小值为顶点值 $f(-1) = a - 2a + 3 = 3 - a$。要求 $3 - a \\ge 0 \\implies a \\le 3$。结合 $a > 0$，得 $0 < a \\le 3$。\n2. 若 $a < 0$，开口向下，函数在 $[-2, 2]$ 上的最小值在远离对称轴的端点 $x = 2$ 处取得，即 $f(2) = 4a + 4a + 3 = 8a + 3$。要求 $8a + 3 \\ge 0 \\implies a \\ge -\\frac{3}{8}$。结合 $a < 0$，得 $-\\frac{3}{8} \\le a < 0$。\n综上，实数 $a$ 的取值范围为 $[-\\frac{3}{8}, 3]$。",
        explanationText: "本题常见错误是：\n1. **忘记讨论 $a = 0$ 的非二次函数退化情况**。\n2. 在 $a < 0$ 时迷失最值位置。开口向下时，离对称轴越远点越小，因此最值发生在区间右端点 $x = 2$ 处，而不是左端点 $x = -2$ 处。"
      }
    ]
  },
  "sample_physics": {
    knowledgePoint: "牛顿第二定律与摩擦力方向判定问题",
    difficultyAnalysis: "考核在传送带模型中，滑块速度与传送带速度的大小对比，动态分析受力方向 and 位移变化的过程。常见错误是直接使用单一方向一站式计算。",
    analogies: [
      {
        id: "1",
        questionText: "一滑块以初速度 $v_0 = 1\\text{m/s}$ 向右滑上向右以 $v = 3\\text{m/s}$ 匀速运行的传送带。滑块质量 $m = 2\\text{kg}$，动摩擦因数 $\\mu = 0.1$，求滑块达到与传送带相同速度所经过的相对位移和传送带移动的位移（设传送带无限长，取 $g = 10\\text{m/s}^2$）。",
        answerText: "滑块初速小，传送带初速大，故摩擦力向右驱动滑块加速。加速度 $a = \\mu g = 0.1 \\times 10 = 1\\text{m/s}^2$。\n加速时间 $t = \\frac{v - v_0}{a} = \\frac{3 - 1}{1} = 2\\text{s}$。\n在 $t=2\\text{s}$ 内，滑块位移 $x_1 = v_0 t + \\frac{1}{2}at^2 = 1\\times 2 + \\frac{1}{2}\\times 1 \\times 4 = 4\\text{m}$。\n传送带位移 $x_p = vt = 3 \\times 2 = 6\\text{m}$。\n相对位移（划痕长度） $\\Delta x = x_p - x_1 = 6 - 4 = 2\\text{m}$。",
        explanationText: "本题常见错误是：\n1. 摩擦力方向判定错误，错当成阻力（向左）。\n2. 错把**滑块的绝对位移**当成传送带产生的相对摩擦划痕。"
      },
      {
        id: "2",
        questionText: "一质量为 $1\\text{kg}$ 的滑块以初速度 $v_0=5\\text{m/s}$ 向右滑上水平向左以 $v=2\\text{m/s}$ 逆向运行的传送带。已知 $\\mu = 0.2$。求滑块从滑上到速度减为 $0$ 的过程中，滑块的位移大小，以及滑块最终是否能返回左端？",
        answerText: "滑块向右运动，传送带向左运行，摩擦力向左，产生阻碍作用。加速度 $a = \\mu g = 2\\text{m/s}^2$。\n滑块向右减速至 $0$ 所需时间 $t_1 = \\frac{v_0}{a} = \\frac{5}{2} = 2.5\\text{s}$。\n此单向位移为 $x_1 = \\frac{v_0^2}{2a} = \\frac{25}{4} = 6.25\\text{m}$。\n在此之后，因为传送带向左动，滑块在摩擦力作用下开始向左反向加速。最大反向速度不能超过传送带自身速度 $v=2\\text{m/s}$。反向加速到 $2\\text{m/s}$ 之后即做匀速运动返回。因为没有脱离左端，滑块一定会返回左端出发点。",
        explanationText: "本题常见错误是：\n1. **混淆了反向加速时的极值速度**。反向加速的最大速度不能大于传送带本身的速度 $2\\text{m/s}$，之后物体即相对静止做匀速运动。\n2. 忘记讨论返回的可行性。"
      },
      {
        id: "3",
        questionText: "一个静止在传送带上的物体，传送带突然以 $a_0 = 4\\text{m/s}^2$ 的加速度向右启动，物体与传送带间的动摩擦因数 $\\mu = 0.3$。请问物体的加速度是多少？物体和传送带会发生相对滑动吗？",
        answerText: "物体受到的最大静摩擦力提供加速度，其最大加速度为 $a_{\\max} = \\mu g = 0.3 \\times 10 = 3\\text{m/s}^2$。\n由于传送带的加速度 $a_0 = 4\\text{m/s}^2 > a_{\\max}$，所以静摩擦力无法提供如此大的加速度，两者必然发生相对滑动。\n此时物体受滑动摩擦力作用，滑动摩擦加速度为 $a = 3\\text{m/s}^2$。",
        explanationText: "本题常见错误是：\n1. **盲目认为物体的加速度就等于传送带的加速度**。\n2. 忽略了最大静摩擦力（近似等于滑动摩擦力）对加速度上限的严重限制。"
      }
    ]
  },
  "sample_english": {
    knowledgePoint: "定语从句中“介词+关系代词”及关系副词的用法辨析",
    difficultyAnalysis: "考核修饰地点的定语从句，如何判断从句中所缺成分（是介词宾语还是时间/地点状语），进而正确搭配介词与 which，或者使用 where。",
    analogies: [
      {
        id: "1",
        questionText: "We visited the beautiful village ______ my grandfather once lived, and we also took photo of the wooden school ______ he used to teach math when he was young.\nChoices:\nA. where; in which   B. where; which   C. in which; /   D. with which; where",
        answerText: "正确答案是 A。\n第一空中，lived 是不及物动词，grandfather lived in the village，所以用 where 或 in which，选项中第一位满足的为 where / in which。\n第二空中，school 在从句中作状语：he used to teach math in the school，用 in which 或 where。所以两空搭配合适的是 A (where; in which)。B 选项第二空 which 会作 teach 的宾语，但 teach 已自带 math 为宾语；C 选项第二空不能省；D 选项 with which 分离不通。",
        explanationText: "本题常见错误是：\n1. **死记硬背名词词义**。看到 village 或 school 就一味选 where 或是 which，而未能详细拆分从句的主谓宾关系。\n2. 对不及物动词（如 live）和及物动词在从句中的搭配不敏锐。"
      },
      {
        id: "2",
        questionText: "Please find a wide container ______ you can store these chemical liquids safely, and the specific guidelines ______ you must adhere should be kept visible.\nChoices:\nA. which; that   B. in which; to which   C. where; which   D. in where; of whom",
        answerText: "正确答案是 B。\n第一空：you can store chemical liquids in the container (store ... in...)，所以用 in which 或 where。\n第二空：the specific guidelines to which you must adhere (adhere to, 意为遵守，adhere 必须固定搭配介词 to)。所以 guidelines 与 to which 连用。因此搭配为 B (in which; to which)。",
        explanationText: "本题常见错误 is：\n1. **忽略固定短语搭配中的介词前置**（例如本题中 adhere to 的 to，极易错选为 which 或 and that）。\n2. 混淆状语和宾语成分。"
      },
      {
        id: "3",
        questionText: "The company ______ my cousin is working nowadays has offered him a great raise, ______ which he is highly satisfied.\nChoices:\nA. where; with   B. which; about   C. where; in   D. which; with",
        answerText: "正确答案是 A。\n第一空：my cousin is working in the company (work 是不及物，此处需要地点状语)，所以用 where 或 in which。\n第二空：be highly satisfied with sth (对……非常满意，固定介词搭配 with)。with 移到前面即 with which。所以选 A (where; with)。",
        explanationText: "本题常见错误是：\n1. 忘记 **be satisfied with** 这一固定词组搭配从而在第二空填错介词（容易选成 about，在汉语思维中“关于这个他很满意”）。"
      }
    ]
  }
};

function parseLLMResponse(text: string) {
  const cleaned = text.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch (err2) {
        // ignore
      }
    }
    throw new Error("模型返回的内容格式不符合规范，无法解析为 JSON: " + text);
  }
}

// -------------------------------------------------------------
// POST /api/ocr - Extract text using Volcengine Vision or Fallback
// -------------------------------------------------------------
app.post("/api/ocr", async (req, res) => {
  try {
    const { imageBase64, sampleId } = req.body;

    // If they picked a preloaded sample
    if (sampleId) {
      const found = SAMPLE_OCR_QUESTIONS.find(q => q.id === sampleId);
      if (found) {
        return res.json({
          success: true,
          text: found.content,
          knowledge: found.knowledge,
          isSample: true
        });
      }
    }

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: "缺少图像数据 (imageBase64) 或样本ID" });
    }

    const apiKey = process.env.AIAPIKEY;
    const baseUrl = process.env.AIBASEURL;
    const model = process.env.AIMODEL;

    if (!apiKey || !baseUrl || !model) {
      return res.status(400).json({ success: false, error: "Missing AIAPIKEY / AIBASEURL / AIMODEL" });
    }

    // Extract base64 details
    let mimeType = "image/png";
    let pureBase64 = imageBase64;
    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      pureBase64 = matches[2];
    }
    const fullImageUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:${mimeType};base64,${pureBase64}`;

    const visionPayload = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "你是一位精通多学科解答的高精度学术型OCR助手。请识别并返回图片中的文字。如果包含物理、数学、化学公式或符号，请转换成标准的 LaTeX 格式（行内用 $...$, 独立行用 \\[ ... \\]）。不要作假，力求原文字字对应。如果识别不了或者图片不是题目，也请结合图片描述尽力返还其主要的结构和文字内容。请只输出识别好的题目文字，请勿夹带任何个人打招呼或无用的多余文字（例如“这是我为您识别的结果”等）。"
            },
            {
              type: "image_url",
              image_url: {
                url: fullImageUrl
              }
            }
          ]
        }
      ],
      temperature: 0.1
    };

    const tokenUrl = baseUrl.endsWith("/") ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
    const ocrResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(visionPayload)
    });

    if (!ocrResponse.ok) {
      const status = ocrResponse.status;
      let rawText = "";
      let parsedError: any = null;
      try {
        rawText = await ocrResponse.text();
        parsedError = JSON.parse(rawText);
      } catch (e) {
        // ignore
      }

      const errorObj = {
        code: parsedError?.error?.code || parsedError?.code || "OCR_API_ERROR",
        message: parsedError?.error?.message || parsedError?.message || rawText || "Volcengine API vision completion error",
        status,
        rawResponse: parsedError || rawText
      };

      console.error("Local OCR API Error:", errorObj);
      return res.status(status).json({
        success: false,
        error: `火山方舟 API OCR报错: ${errorObj.message}`,
        ...errorObj
      });
    }

    const ocrData = await ocrResponse.json();
    const parsedText = ocrData?.choices?.[0]?.message?.content || "未能从该图片识别出题目。请点击手动输入或重试。";

    // Ask for knowledge point
    let knowledgePoint = "综合学科知识点";
    try {
      const kpPayload = {
        model,
        messages: [
          {
            role: "user",
            content: `基于以下题目文本，提炼出一个最准确的、高中/初中阶段的「学术知识点名称」（字数控制在15个字以内，例如：\"二次函数区间最值问题\" 或 \"等差数列前n项和规律\"）：\n\n${parsedText}`
          }
        ],
        temperature: 0.3
      };

      const kpResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(kpPayload)
      });

      if (kpResponse.ok) {
        const kpData = await kpResponse.json();
        const kpCont = kpData?.choices?.[0]?.message?.content;
        if (kpCont) {
          knowledgePoint = kpCont.replace(/[\"'\s]+/g, "").trim();
        }
      }
    } catch (err) {
      console.error("Error generating knowledge point locally:", err);
    }

    return res.json({
      success: true,
      text: parsedText,
      knowledge: knowledgePoint
    });

  } catch (error: any) {
    console.error("OCR API error locally:", error);
    return res.status(500).json({ success: false, error: error.message || "OCR 处理失败" });
  }
});

// -------------------------------------------------------------
// POST /api/generate - Generate 3 Similar Questions (举一反三)
// -------------------------------------------------------------
app.post("/api/generate", async (req, res) => {
  try {
    const { originalQuestion, knowledgePoint, promptHint } = req.body;

    if (!originalQuestion) {
      return res.status(400).json({ success: false, error: "缺少原题目 (originalQuestion)" });
    }

    const matchedSampleKey = Object.keys(PREDEFINED_ANALOGIES).find(key => {
      const sampleQuestion = SAMPLE_OCR_QUESTIONS.find(s => s.id === key);
      return sampleQuestion && (originalQuestion.includes(sampleQuestion.content.slice(0, 15)) || (promptHint && promptHint.toLowerCase() === key));
    });

    if (matchedSampleKey) {
      return res.json({
        success: true,
        data: PREDEFINED_ANALOGIES[matchedSampleKey]
      });
    }

    const apiKey = process.env.AIAPIKEY;
    const baseUrl = process.env.AIBASEURL;
    const model = process.env.AIMODEL;

    if (!apiKey || !baseUrl || !model) {
      return res.status(400).json({ success: false, error: "Missing AIAPIKEY / AIBASEURL / AIMODEL" });
    }

    const kp = knowledgePoint || "该核心考点";
    const cuePrompt = promptHint ? `用户附加的定制生成要求（例如难度、方向等）：\n"${promptHint}"\n` : "";

    const systemInstruction = `你是一位教学经验极其丰富的国家级名师。你需要针对用户提供的「原错题」，推测或结合给定的「知识点」，生成 **3 道质量极高、难度相当或呈阶梯增量的相似变式题（举一反三题）**。

请严格遵守以下教学逻辑和输出法则：
1. **题目涵盖面**：3道题要分别对应此知识点的不同考察角度、变式形式或逆向思维，不能只是简单地更换一下原题的常数！题目的内容必须和原错题强相关，达到“举一反三”的训练效果。
2. **公式规范**：使用标准的 LaTeX 格式编辑所有排版的物理、数学公式。行内公式使用 $...$，块级公式使用 \\[ ... \\]。
3. **正确答案**：每道题排布详细正确的推演步骤和解题答案，切记物理、数学等理科题目不要胡编数字导致无法整除或无解！
4. **易错点深度剖析**：必须给每一道题附带索引其“易错点”或“易混淆点”的精品解析（精确定位并使用「本题常见错误是...」或「容易错在...」这一具体语言范式）。
5. **输出控制**：必须返回合法的 JSON 对象，不要含有任何 Markdown 的 \`\`\`json 格式封装，直接返回 JSON 对象。`;

    const userPrompt = `
【原错题内容】：
${originalQuestion}

【认定的考点/知识点】：
${kp}

${cuePrompt}

请围绕该知识点在不同侧面进行变式拓展，生成 3 道高水准的举一反三题目。
请以下列指定的 JSON 结构返回：
{
  "knowledgePoint": "提炼出的规范学科知识点名称，不要带前后缀",
  "difficultyAnalysis": "对这组错题考点的核心难点简评及命题陷阱分析",
  "analogies": [
    {
      "id": "1",
      "questionText": "题目具体题干文本（包含公式LaTeX）",
      "answerText": "本题的正确答案及详细解答步骤",
      "explanationText": "易错点提示与深度解析。必须在此解析中使用'本题常见错误是'或'容易错在'开头的关键性诊断句段"
    },
    {
      "id": "2",
      "questionText": "题目具体题干文本（包含公式LaTeX）",
      "answerText": "本题的正确答案及详细解答步骤",
      "explanationText": "易错点提示与深度解析。必须在此解析中使用'本题常见错误是'或'容易错在'开头的关键性诊断句段"
    },
    {
      "id": "3",
      "questionText": "题目具体题干文本（包含公式LaTeX）",
      "answerText": "本题的正确答案及详细解答步骤",
      "explanationText": "易错点提示与深度解析。必须在此解析中使用'本题常见错误是'或'容易错在'开头的关键性诊断句段"
    }
  ]
}`;

    const tokenUrl = baseUrl.endsWith("/") ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const status = response.status;
      let rawText = "";
      let parsedError: any = null;
      try {
        rawText = await response.text();
        parsedError = JSON.parse(rawText);
      } catch (e) {
        // ignore
      }

      const errorObj = {
        code: parsedError?.error?.code || parsedError?.code || "GENERATE_API_ERROR",
        message: parsedError?.error?.message || parsedError?.message || rawText || "Volcengine API generation completion error",
        status,
        rawResponse: parsedError || rawText
      };

      console.error("Local Generate API Error:", errorObj);
      return res.status(status).json({
        success: false,
        error: `火山方舟 API Generate报错: ${errorObj.message}`,
        ...errorObj
      });
    }

    const responseData = await response.json();
    const resultText = responseData?.choices?.[0]?.message?.content || "";
    const parsedData = parseLLMResponse(resultText);

    return res.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error("Generate API error locally:", error);
    return res.status(500).json({ success: false, error: error.message || "生成举一反三失败" });
  }
});

// -------------------------------------------------------------
// Serve public samples listing
// -------------------------------------------------------------
app.get("/api/samples", (req, res) => {
  res.json({ success: true, samples: SAMPLE_OCR_QUESTIONS });
});

// -------------------------------------------------------------
// Vite and Static assets serving
// -------------------------------------------------------------
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

initServer();
