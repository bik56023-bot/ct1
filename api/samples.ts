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

export default function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  return res.status(200).json({ success: true, samples: SAMPLE_OCR_QUESTIONS });
}
