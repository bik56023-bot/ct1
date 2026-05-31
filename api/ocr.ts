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
    content: "一质量为 $m = 1\\text{kg}$ 的滑块以初速度 $v_0 = 4\\text{m/s}$ 冲上一个水平向右匀速运行的传送带，传送带的速度为 $v = 2\\text{m/s}$。若滑块与传送带间的动摩擦因数为 $\\mu = 0.2$，求滑块在传送带上运动直到与传送带相对静止时的位移大小。 \n（提示：常见错误是忽略相对速度大小 and 摩擦力方向发生了改变）",
    knowledge: "牛顿第二定律与摩擦力方向判定问题",
  },
  {
    id: "sample_english",
    title: "高中英语：介词+关系代词引导的定语从句",
    content: "This is the very laboratory ______ which we conducted the primary physics experiments during our school days, and ______ we learned many scientific laws with our teacher.\nChoices:\nA. in; in which   B. in; where   C. which; where   D. in; in there\n(提示：本题容易混淆介词+which和独立副词的选择，忘记讨论先行词在从句中的具体成分)",
    knowledge: "定语从句中“介词+关系代词”及关系副词的用法辨析",
  }
];

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { imageBase64, sampleId } = req.body || {};

    // 1. If sampleId is provided, fast respond with the sample
    if (sampleId) {
      const found = SAMPLE_OCR_QUESTIONS.find(q => q.id === sampleId);
      if (found) {
        return res.status(200).json({
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

    // Checking key names strictly under user specification
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

    // Perform Vision call using OpenAI Compatible chat completions format
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
        // ignore JSON parse error, fallback to raw text
      }

      const errorObj = {
        code: parsedError?.error?.code || parsedError?.code || "OCR_API_ERROR",
        message: parsedError?.error?.message || parsedError?.message || rawText || "Volcengine API vision completion error",
        status,
        rawResponse: parsedError || rawText
      };

      console.error("OCR API Error Response status:", status, errorObj);
      return res.status(status).json({
        success: false,
        error: `火山方舟 API OCR报错: ${errorObj.message}`,
        ...errorObj
      });
    }

    const ocrData = await ocrResponse.json();
    const parsedText = ocrData?.choices?.[0]?.message?.content || "未能从该图片识别出题目。请点击手动输入或重试。";

    // Second prompt: ask for the standard knowledge point
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
      } else {
        console.warn("Failed to generate knowledge point, status code is:", kpResponse.status);
      }
    } catch (err) {
      console.error("Error generating knowledge point:", err);
    }

    return res.status(200).json({
      success: true,
      text: parsedText,
      knowledge: knowledgePoint
    });

  } catch (error: any) {
    console.error("OCR API error inside target serverless file:", error);
    return res.status(500).json({ success: false, error: error.message || "OCR 处理失败" });
  }
}
