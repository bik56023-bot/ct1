import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  BookOpen, 
  Sparkles, 
  Printer, 
  Clock, 
  Trash2, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  RefreshCw, 
  FileText, 
  ChevronRight, 
  AlertCircle,
  HelpCircle,
  FolderMinus,
  Check,
  RotateCcw
} from "lucide-react";
import LaTeXRenderer from "./components/LaTeXRenderer";
import ExplanationCard from "./components/ExplanationCard";
import { MistakeRecord, SampleQuestion, Analogy } from "./types";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"ocr" | "workbook">("ocr");

  // OCR state
  const [isDragging, setIsDragging] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [knowledgePoint, setKnowledgePoint] = useState("");
  const [subject, setSubject] = useState("数学");
  const [ocrError, setOcrError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generatedResults, setGeneratedResults] = useState<{
    knowledgePoint: string;
    difficultyAnalysis: string;
    analogies: Analogy[];
  } | null>(null);
  
  // Custom generate requirements (like difficulty, specific topic change)
  const [promptHint, setPromptHint] = useState("");

  // Mistake Book state
  const [records, setRecords] = useState<MistakeRecord[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Previewing / Printing target
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printRecords, setPrintRecords] = useState<MistakeRecord[]>([]);
  const [showPrintAnswersInPdf, setShowPrintAnswersInPdf] = useState(true);

  // Ready-to-use Sample Questions
  const [samples, setSamples] = useState<SampleQuestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification Banner
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Load samples lists and localStorage workbook on mount
  useEffect(() => {
    fetchSamples();
    const stored = localStorage.getItem("ai_mistake_records");
    if (stored) {
      try {
        setRecords(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse local stored records:", err);
      }
    }
  }, []);

  const fetchSamples = async () => {
    try {
      const res = await fetch("/api/samples");
      const d = await res.json();
      if (d.success) {
        setSamples(d.samples);
      }
    } catch (e) {
      console.error("Failed to fetch preloaded samples:", e);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      triggerToast("请上传有效的图片文件", "error");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerOCR(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Run Google Gemini OCR API (with fallback if key isn't provided)
  const triggerOCR = async (imageBase64: string) => {
    setOcrLoading(true);
    setOcrError("");
    setOriginalText("");
    setGeneratedResults(null);

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 })
      });
      const data = await response.json();
      
      if (data.success) {
        setOriginalText(data.text);
        setKnowledgePoint(data.knowledge || "待分析知识点");
        if (data.isMock) {
          triggerToast("演示环境：为您载入了高保真模拟 OCR 识别题目！", "info");
        } else {
          triggerToast("OCR 识别成功！您可以对照下方进行编辑校验。", "success");
        }
      } else {
        setOcrError(data.error || "OCR 识别失败，请检查图片或重试");
        triggerToast("OCR 识别未能成功返回结果", "error");
      }
    } catch (error) {
      setOcrError("连接服务器 OCR 模块出错");
      triggerToast("网络连接异常", "error");
    } finally {
      setOcrLoading(false);
    }
  };

  // Directly select sample questions
  const selectSample = async (sampleId: string) => {
    setOcrLoading(true);
    setOcrError("");
    setOriginalText("");
    setGeneratedResults(null);
    setImagePreview(null);
    
    // Auto populate subject
    if (sampleId.includes("math")) setSubject("数学");
    else if (sampleId.includes("physics")) setSubject("物理");
    else if (sampleId.includes("english")) setSubject("英语");

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleId })
      });
      const data = await response.json();
      if (data.success) {
        setOriginalText(data.text);
        setKnowledgePoint(data.knowledge);
        triggerToast(`成功导入「${data.knowledge}」经典示范题`, "success");
      } else {
        setOcrError("示范题导入失败");
      }
    } catch (err) {
      setOcrError("无法连接至服务器示范端");
    } finally {
      setOcrLoading(false);
    }
  };

  // Call Gemini API to generate the 3 analogies
  const generateAnalogies = async () => {
    if (!originalText.trim()) {
      triggerToast("请先上传错题或手动填写题干噢", "error");
      return;
    }
    setGenerating(true);
    setGenerationError("");
    
    // Prepare a dynamic offline hint descriptor to match preset dictionaries (instant fast test responses)
    let hintKey = "";
    if (originalText.includes("已知函数 $f(x) = ax^2")) hintKey = "sample_math";
    else if (originalText.includes("滑块以初速度 $v_0 = 4")) hintKey = "sample_physics";
    else if (originalText.includes("This is the very laboratory")) hintKey = "sample_english";

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalQuestion: originalText,
          knowledgePoint: knowledgePoint,
          promptHint: hintKey || promptHint
        })
      });
      
      const resData = await response.json();
      if (resData.success && resData.data) {
        setGeneratedResults(resData.data);
        // Automatically adopt high-accuracy Gemini knowledge point if empty or generic
        if (resData.data.knowledgePoint) {
          setKnowledgePoint(resData.data.knowledgePoint);
        }
        triggerToast("举一反三生成完毕！已提供 3 道不同考向维度的变式题。", "success");
      } else {
        setGenerationError(resData.error || "大模型未能完成变式生成，请稍后重试");
        triggerToast("大模型生成出错", "error");
      }
    } catch (error) {
      setGenerationError("服务器生成响应超时，请检查网络");
      triggerToast("生成失败，网络状态差", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Save everything to mistake book list
  const saveToWorkbook = () => {
    if (!originalText || !generatedResults) {
      triggerToast("需要先输入原题并成功生成相似练习题，才能保存噢！", "error");
      return;
    }

    const newRecord: MistakeRecord = {
      id: "mistake_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      originalQuestion: originalText,
      knowledgePoint: knowledgePoint || "通用重点要点",
      difficultyAnalysis: generatedResults.difficultyAnalysis || "考点易错特征分析",
      analogies: generatedResults.analogies,
      savedAt: new Date().toISOString(),
      subject: subject
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem("ai_mistake_records", JSON.stringify(updated));
    triggerToast("成功保存至手机/浏览器本地错题本！", "success");
    // Switch to workbook tab automatically to inspect saving
    setActiveTab("workbook");
  };

  // Selection toggle logic
  const toggleSelectRecord = (id: string) => {
    if (selectedRecordIds.includes(id)) {
      setSelectedRecordIds(selectedRecordIds.filter(x => x !== id));
    } else {
      setSelectedRecordIds([...selectedRecordIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRecordIds.length === records.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(records.map(r => r.id));
    }
  };

  // Remove records
  const deleteSelected = () => {
    if (selectedRecordIds.length === 0) return;
    if (!confirm(`确认要删除已选的 ${selectedRecordIds.length} 项错题记录吗？`)) return;

    const remaining = records.filter(r => !selectedRecordIds.includes(r.id));
    setRecords(remaining);
    localStorage.setItem("ai_mistake_records", JSON.stringify(remaining));
    setSelectedRecordIds([]);
    triggerToast("删除成功", "info");
  };

  const deleteSingleRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定要删除这条错题记录吗？")) return;
    const remaining = records.filter(r => r.id !== id);
    setRecords(remaining);
    localStorage.setItem("ai_mistake_records", JSON.stringify(remaining));
    setSelectedRecordIds(selectedRecordIds.filter(x => x !== id));
    triggerToast("记录已被移除", "info");
  };

  // Print function
  const startPrintFlow = (selectedOnly: boolean = false) => {
    let targetsToPrint = records;
    if (selectedOnly) {
      targetsToPrint = records.filter(r => selectedRecordIds.includes(r.id));
      if (targetsToPrint.length === 0) {
        triggerToast("请先勾选需要打印的题库！", "error");
        return;
      }
    } else if (records.length === 0) {
      triggerToast("错题本还是空的，快去识别并保存一些吧！", "error");
      return;
    }

    setPrintRecords(targetsToPrint);
    setIsPrintPreviewOpen(true);
  };

  // Execute PDF standard driver call
  const triggerSystemPrint = () => {
    // Brief timeout to let renderer compile in background before print menu shows
    setTimeout(() => {
      window.print();
    }, 450);
  };

  // Quick reset for OCR space to scan new题
  const resetOcrWorkspace = () => {
    setImagePreview(null);
    setOriginalText("");
    setKnowledgePoint("");
    setGeneratedResults(null);
    setPromptHint("");
    triggerToast("已清空当前编辑区", "info");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative antialiased" id="mistake-app-container">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 max-w-md ${
            toast.type === "success" ? "bg-emerald-600 text-white" : 
            toast.type === "error" ? "bg-rose-600 text-white" : "bg-sky-600 text-white"
          }`}>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium tracking-wide leading-snug">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Screen Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 no-print shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md shadow-blue-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                举一反三错题本
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold tracking-wide rounded-md border border-blue-100">AI 智能强练</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">高精 OCR 主力推知考点 • 跨变式出题提优 • A4 规整打包排版</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if(records.length > 0) {
                  startPrintFlow(false);
                } else {
                  triggerToast("错题本暂无记录，可先用样例试用保存！", "info");
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              一键打印全部题 ({records.length})
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEW AREA */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24 no-print">
        
        {/* ==================== TAB 1: 错题识别生成页 ==================== */}
        {activeTab === "ocr" && (
          <div className="space-y-6">
            
            {/* Quick Presets for Demo validation */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/80 rounded-2xl p-4.5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  智能初体验：免拍照快速导入示范题
                </span>
                <span className="text-xs text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  支持高等学科公式规范
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectSample(s.id)}
                    className="p-3.5 bg-white hover:bg-slate-50 text-left border border-slate-200 hover:border-blue-400 rounded-xl transition-all shadow-xs group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="p-1 bg-slate-100 group-hover:bg-blue-50 text-[10px] font-bold text-slate-600 group-hover:text-blue-700 rounded-md shrink-0">
                        {s.id.includes("math") ? "数学" : s.id.includes("physics") ? "物理" : "英语"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{s.title}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-1">考点: {s.knowledge}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Left/Right Grid for input and dynamic outcome */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Box 1 (5cols): Question input & Image extraction */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* Image Upload card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-blue-600 rounded-full inline-block"></span>
                    图像识别与订正区域
                  </h3>

                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                      isDragging 
                        ? "border-blue-500 bg-blue-50/50" 
                        : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />

                    {imagePreview ? (
                      <div className="relative w-full max-h-48 overflow-hidden rounded-lg group">
                        <img 
                          src={imagePreview} 
                          alt="OCR upload file" 
                          className="w-full h-auto object-contain mx-auto max-h-40" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-xs text-white font-medium flex items-center gap-1">
                            <Upload className="w-4 h-4" /> 重新点击或拖入更换图片
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2.5">
                          <Upload className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-800 font-semibold mb-1">拖拽图片、或点击此框上传错题照片</p>
                        <p className="text-[11px] text-slate-400">支持手写拍照、教材截图、数学公式/理化符号</p>
                      </div>
                    )}
                  </div>

                  {ocrLoading && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center gap-2.5">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-blue-700 font-medium animate-pulse">Gemini 高能学术 OCR 并推导核心考点中...</span>
                    </div>
                  )}

                  {ocrError && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-md flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-xs text-rose-700">{ocrError}</span>
                    </div>
                  )}

                  {/* Manual Editor Inputs */}
                  <div className="mt-5 space-y-3.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          学科科目:
                        </label>
                        <div className="flex gap-1.5">
                          {["数学", "物理", "英语", "综合"].map(sub => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setSubject(sub)}
                              className={`px-2 py-0.5 text-xs rounded-md transition-all font-medium ${
                                subject === sub 
                                  ? "bg-slate-800 text-white" 
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        识别/订正后题干内容 (支持含有 $ 的 LaTeX 公式):
                      </label>
                      <textarea
                        value={originalText}
                        onChange={(e) => setOriginalText(e.target.value)}
                        placeholder="输入或上传后自动识别出的错题主体。您可以在这里任意修正或补充细节错误，以保证后续举一反三生成的绝对准确..."
                        rows={7}
                        className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-hidden leading-relaxed font-sans scrollbar-thin resize-y"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        核心考察知识点 (可点击示范题自动装填，也可手动修改):
                      </label>
                      <input
                        type="text"
                        value={knowledgePoint}
                        onChange={(e) => setKnowledgePoint(e.target.value)}
                        placeholder="例：二次函数对称轴及区间最值分析"
                        className="w-full text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-hidden font-medium"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={resetOcrWorkspace}
                        disabled={!originalText && !imagePreview}
                        className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl text-xs transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        清空内容
                      </button>

                      <button
                        onClick={generateAnalogies}
                        disabled={generating || !originalText.trim()}
                        className="flex-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition duration-150 shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {generating ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>深度变式计算中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                            <span>生成举一反三题库</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Additional Settings / Advanced instruction guidelines */}
                <div className="bg-slate-100 rounded-2xl p-4 text-xs text-slate-600 border border-slate-200/80">
                  <div className="flex items-start gap-1.5">
                    <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800 mb-0.5">💡 高级微调 (选填)</p>
                      <p className="leading-relaxed mb-2">您可以指导 AI 的出题侧重或出题难度细节：</p>
                      <input 
                        type="text"
                        value={promptHint}
                        onChange={(e) => setPromptHint(e.target.value)}
                        placeholder="例：'适当增加多项式计算量' | '偏向解答中的第一项讨论'"
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Box 2 (7cols): Analogy Presentation Panel & Saves */}
              <div className="lg:col-span-7">
                
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-full min-h-[500px]">
                  
                  {/* Card head tabs */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span className="text-sm font-bold text-slate-800">举一反三变式练习区</span>
                    </div>

                    {generatedResults && (
                      <button
                        onClick={generateAnalogies}
                        disabled={generating}
                        className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 px-2.5 py-1 bg-blue-50/60 rounded-md hover:bg-blue-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${generating ? "animate-spin" : ""}`} />
                        重新生成这组
                      </button>
                    )}
                  </div>

                  {/* Empty state: Waiting to generate */}
                  {!generatedResults && !generating && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30 rounded-b-2xl">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3.5">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">暂无生成的强化练习题</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
                        您可以在左侧框内导入或填入错题，点击“生成举一反三题库”。大模型后台将根据知识点，瞬间编织 3 道针对性、高水平的变式题！
                      </p>
                    </div>
                  )}

                  {/* Loading state */}
                  {generating && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/10">
                      <div className="relative mb-4">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Sparkles className="w-5 h-5 text-indigo-500 absolute top-3.5 left-3.5 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 animate-pulse">大模型正在深度磨炼变式题干中...</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-2 mx-auto leading-relaxed">
                        不仅为您生成不同变换视角的题目，还将精心撰写一步一环扣的答案步骤，并在解析中高亮学生一错再错的盲点！
                      </p>
                    </div>
                  )}

                  {/* Display generated list when complete */}
                  {generatedResults && !generating && (
                    <div className="flex-1 p-5 space-y-5 overflow-y-auto max-h-[600px] bg-slate-50/30 rounded-b-2xl">
                      
                      {/* Sub header analytic breakdown */}
                      <div className="p-4 bg-indigo-50/70 border border-indigo-100/50 rounded-xl">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-indigo-600 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-indigo-950">
                              高分必练提纯 • 命题大纲分析
                            </p>
                            <p className="text-xs text-indigo-800 leading-relaxed mt-1">
                              {generatedResults.difficultyAnalysis}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Display original question for comparison */}
                      <div className="p-4 bg-white border border-slate-200 rounded-xl relative overflow-hidden shadow-xs">
                        <div className="absolute top-0 right-0 bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-bl">
                          原错题题干
                        </div>
                        <div className="text-xs font-semibold text-slate-400 mb-2">ORIGINAL TOPIC</div>
                        <div className="text-sm font-medium">
                          <LaTeXRenderer text={originalText} />
                        </div>
                      </div>

                      {/* Analogy Question iteration loop */}
                      <div className="space-y-4">
                        <div className="text-xs font-bold text-slate-500 tracking-wider flex items-center justify-between">
                          <span>3 道举一反三相似递增题</span>
                          <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg text-[10px]" style={{ contentVisibility: "auto" }}>已就绪</span>
                        </div>

                        {generatedResults.analogies.map((analogy: Analogy, i: number) => (
                          <div 
                            key={analogy.id || i}
                            className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-xl p-4 shadow-xs transition-all relative overflow-hidden group"
                          >
                            <div className="absolute top-3 left-4 w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {i + 1}
                            </div>

                            <div className="pl-7 mt-0.5">
                              <div className="text-sm font-medium text-slate-900 leading-relaxed">
                                <LaTeXRenderer text={analogy.questionText} />
                              </div>

                              {/* Answer block */}
                              <div className="mt-4 pt-3.5 border-t border-slate-100">
                                <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md mb-2">
                                  答案与精推解析
                                </span>
                                <div className="text-slate-800 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-sm">
                                  <LaTeXRenderer text={analogy.answerText} />
                                </div>
                              </div>

                              {/* Custom diagnostic highlight warning list */}
                              <ExplanationCard explanationText={analogy.explanationText} />

                            </div>
                          </div>
                        ))}
                      </div>

                      {/* SAVE ACTION PREFER BAR */}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between bg-white p-4.5 rounded-xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="text-xs font-bold text-slate-800">满足目前的题目排布吗？</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">保存到列表后，随时可支持自定义勾选批量打印纸质练习</p>
                        </div>
                        <button
                          onClick={saveToWorkbook}
                          className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          保存到错题历史本
                        </button>
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 2: 错题历史本页 ==================== */}
        {activeTab === "workbook" && (
          <div className="space-y-6">
            
            {/* Header controls toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
              
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <input 
                  type="checkbox"
                  checked={records.length > 0 && selectedRecordIds.length === records.length}
                  onChange={handleSelectAll}
                  disabled={records.length === 0}
                  className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500 cursor-pointer"
                />
                <button
                  onClick={handleSelectAll}
                  disabled={records.length === 0}
                  className="text-xs text-slate-600 hover:text-slate-900 font-bold disabled:opacity-50"
                >
                  {selectedRecordIds.length === records.length && records.length > 0 ? "取消全选" : `全选 (${records.length})`}
                </button>

                {selectedRecordIds.length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                    已选 {selectedRecordIds.length} 项
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {selectedRecordIds.length > 0 && (
                  <button
                    onClick={deleteSelected}
                    className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    批量删除 ({selectedRecordIds.length})
                  </button>
                )}

                <button
                  onClick={() => startPrintFlow(true)}
                  disabled={selectedRecordIds.length === 0}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-300" />
                  打印选定错题 ({selectedRecordIds.length})
                </button>
              </div>

            </div>

            {/* Empty states in Workbook */}
            {records.length === 0 && (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-xs">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <FolderMinus className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800">还没有任何保存的记录哦</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                  错题本会持久地保存在本设备，请返回底部的「错题识别」中进行图片扫描或经典题导入，并在生成举一反三结果后，轻点“保存到错题历史本”。
                </p>
                <button
                  onClick={() => setActiveTab("ocr")}
                  className="mt-5 inline-flex items-center gap-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  立即去上传我的第一道错题
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* History Records List */}
            {records.length > 0 && (
              <div className="space-y-3">
                {records.map((record) => {
                  const isExpanded = expandedRecordId === record.id;
                  const isChecked = selectedRecordIds.includes(record.id);
                  const formattedTime = new Date(record.savedAt).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div 
                      key={record.id}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                        isChecked 
                          ? "border-blue-500 ring-2 ring-blue-50/70" 
                          : "border-slate-200 hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      {/* Record Header Line */}
                      <div 
                        onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          
                          {/* Left Checkbox */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectRecord(record.id);
                            }}
                            className="p-1 hover:bg-slate-100 rounded-md shrink-0 cursor-pointer"
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Controlled by outer element
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500 cursor-pointer"
                            />
                          </div>

                          {/* Subject Tag */}
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-bold leading-none shrink-0" style={{ contentVisibility: "auto" }}>
                            {record.subject || "数学"}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                                {record.knowledgePoint}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formattedTime}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-1 leading-normal font-sans pr-4">
                              {record.originalQuestion.replace(/\$|\\\[|\\\]/g, "")}
                            </p>
                          </div>

                        </div>

                        {/* Right operations */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => deleteSingleRecord(record.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="从错题本中移除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="px-1 text-slate-400">
                            {isExpanded ? (
                              <ChevronRight className="w-4 h-4 rotate-90 transition-transform" />
                            ) : (
                              <ChevronRight className="w-4 h-4 transition-transform" />
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Expanded Details Body */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-5">
                          
                          {/* Original Question Display */}
                          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs relative">
                            <div className="absolute top-0 right-0 bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-bl">
                              原题重新审视
                            </div>
                            <h4 className="text-xs font-bold text-slate-400 mb-2">ORIGINAL QUESTION</h4>
                            <div className="text-sm font-medium leading-relaxed">
                              <LaTeXRenderer text={record.originalQuestion} />
                            </div>
                          </div>

                          {/* Analysis Statement */}
                          {record.difficultyAnalysis && (
                            <div className="p-3.5 bg-blue-50 border-l-4 border-blue-500 text-blue-950 text-xs leading-relaxed rounded-r-lg">
                              <span className="font-bold text-blue-900 block mb-0.5">💡 本组重难考纲说明：</span>
                              {record.difficultyAnalysis}
                            </div>
                          )}

                          {/* Dynamic Similarity Analogies in expanded records */}
                          <div className="space-y-3.5">
                            <h5 className="text-xs font-bold text-slate-500 tracking-wider">
                              当时由大模型生成的 3 道强化变式题：
                            </h5>

                            {record.analogies.map((analogy, subIdx) => (
                              <div 
                                key={analogy.id || subIdx}
                                className="bg-white border border-slate-150/80 rounded-xl p-4 shadow-2xs relative"
                              >
                                <div className="absolute top-3.5 left-4 w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                                  {subIdx + 1}
                                </div>
                                <div className="pl-7">
                                  <div className="text-sm font-medium text-slate-900 leading-relaxed">
                                    <LaTeXRenderer text={analogy.questionText} />
                                  </div>

                                  <div className="mt-3.5 pt-3 border-t border-slate-100 text-sm">
                                    <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mb-1.5">
                                      答案推断
                                    </span>
                                    <div className="bg-slate-50 p-2.5 rounded-lg text-slate-800">
                                      <LaTeXRenderer text={analogy.answerText} />
                                    </div>
                                  </div>

                                  <ExplanationCard explanationText={analogy.explanationText} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Action controls within the opened details box */}
                          <div className="flex justify-end pt-2">
                            <button
                              onClick={() => {
                                setPrintRecords([record]);
                                setIsPrintPreviewOpen(true);
                              }}
                              className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              仅打印这一道题与变式
                            </button>
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER TAB NAVIGATION (两页式布局：底部导航栏切换) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/90 no-print z-40 py-2 shadow-lg">
        <div className="max-w-md mx-auto px-6 flex justify-around items-center">
          
          <button
            onClick={() => setActiveTab("ocr")}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === "ocr" 
                ? "text-blue-600 font-bold scale-105" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sparkles className="w-5.5 h-5.5 mb-1" />
            <span className="text-xs">错题识别/生成</span>
          </button>

          <button
            onClick={() => setActiveTab("workbook")}
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all cursor-pointer ${
              activeTab === "workbook" 
                ? "text-blue-600 font-bold scale-105" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className="relative">
              <BookOpen className="w-5.5 h-5.5 mb-1" />
              {records.length > 0 && (
                <div className="absolute -top-1 -right-2 bg-rose-500 text-white font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                  {records.length}
                </div>
              )}
            </div>
            <span className="text-xs">错题历史本</span>
          </button>

        </div>
      </footer>

      {/* ==================== HIGH-FIDELITY PRINT & PDF PREVIEW DIALOG ==================== */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 no-print" id="print-preview-modal-overlay">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            
            {/* Modal Head Controls */}
            <div className="px-6 py-4.5 bg-slate-950 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <Printer className="w-5 h-5 text-emerald-400" />
                  智能 A4 练习卷 - 排版打印预览
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  将进行结构化重组排列：每道原题与它的 3 道举一反三变式题顺次排列，再紧扣解析，供学生极佳的打印训练体验。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-300 flex items-center gap-1.5 mr-2 cursor-pointer bg-white/10 px-2.5 py-1.5 rounded-lg hover:bg-white/15">
                  <input 
                    type="checkbox"
                    checked={showPrintAnswersInPdf}
                    onChange={(e) => setShowPrintAnswersInPdf(e.target.checked)}
                    className="rounded-sm border-white/20 text-blue-500 focus:ring-0"
                  />
                  <span>包含答案与易错解析</span>
                </label>

                <button
                  onClick={triggerSystemPrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  调用系统打印/导出PDF
                </button>

                <button
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  关闭
                </button>
              </div>
            </div>

            {/* Print paper wrapper scrollbox */}
            <div className="flex-1 overflow-y-auto bg-slate-200 p-8 flex justify-center">
              
              {/* Simulated Page A4 preview sheet */}
              <div className="w-full max-w-2xl bg-white shadow-lg border border-slate-300 p-10 min-h-[11in] text-slate-900 typography-layout tracking-normal select-text relative" id="a4-document-preview-sheet">
                
                {/* Paper header template styling */}
                <div className="text-center pb-6 border-b border-dashed border-slate-300 mb-8">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 font-serif">
                    【智能错题巩固】举一反三强化训练卷
                  </h2>
                  <div className="mt-3 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
                    <span>训练日期：_________________</span>
                    <span>班级：___________</span>
                    <span>姓名：___________</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 italic">
                    * 本练习卷经过智能诊断自动生成，由原错题引申三大不同视角的类似变式，请独立思考突破。
                  </p>
                </div>

                {/* Iterate A4 question slots */}
                <div className="space-y-8">
                  {printRecords.map((record, recIdx) => (
                    <div 
                      key={record.id} 
                      className={`space-y-6 pb-6 border-b border-slate-100 last:border-0 ${
                        recIdx > 0 ? "pt-4" : ""
                      }`}
                      style={{ pageBreakInside: "avoid" }}
                    >
                      
                      {/* Original Question Block */}
                      <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-200/80 px-2 py-0.5 rounded">
                            考题原点 (序号 #{recIdx + 1})
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            考点：{record.knowledgePoint}
                          </span>
                        </div>
                        <div className="text-sm leading-relaxed text-slate-800 font-serif">
                          <LaTeXRenderer text={record.originalQuestion} />
                        </div>
                      </div>

                      {/* 3 Similar Analogies continuous sequence */}
                      <div className="space-y-4">
                        <div className="text-xs font-bold text-slate-400 tracking-wider">
                          【巩固练习段】请在下方作答
                        </div>

                        {record.analogies.map((analogy, anaIdx) => (
                          <div 
                            key={analogy.id} 
                            className="p-4 border border-slate-200 rounded-lg relative style-print-box"
                            style={{ pageBreakInside: "avoid" }}
                          >
                            <span className="absolute top-3 left-4 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                              {anaIdx + 1}
                            </span>
                            
                            <div className="pl-7 mt-0.5">
                              {/* Question stems */}
                              <div className="text-sm leading-relaxed text-slate-900 font-serif">
                                <LaTeXRenderer text={analogy.questionText} />
                              </div>

                              {/* Student answering lines grid if printing sheet (leaves blank workspace) */}
                              <div className="mt-8 mb-4 border-b border-dotted border-slate-300 h-10 w-full opacity-60"></div>
                              <div className="border-b border-dotted border-slate-300 h-10 w-full opacity-60"></div>

                              {/* Answer block showing */}
                              {showPrintAnswersInPdf && (
                                <div className="mt-4 pt-3 border-t border-slate-100 text-xs bg-slate-50/70 p-3 rounded-md">
                                  <div className="font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                                    <span className="w-1.5 h-3 bg-emerald-600 rounded"></span>
                                    解析与标准推算解答
                                  </div>
                                  <div className="text-slate-700 leading-relaxed font-sans mb-2">
                                    <LaTeXRenderer text={analogy.answerText} />
                                  </div>
                                  
                                  {/* Custom highlights for incorrect patterns */}
                                  <ExplanationCard explanationText={analogy.explanationText} />
                                </div>
                              )}

                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  ))}
                </div>

                {/* Printable Document Footer watermark */}
                <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-4">
                  “举一反三错题训练法，不仅做对一题，更能掌握一类题。”
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ==================== REAL HIDDEN DIRECT-PRINT ACTION SCREEN CONTAINER ==================== */}
      {/* This element will only be triggered and visual inside native print streams via @media print */}
      <div className="hidden print-only print-container" id="real-print-only-container">
        
        <div className="text-center pb-5 border-b-2 border-slate-800 mb-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-black font-serif">
            【智能错题巩固】举一反三强化训练卷
          </h2>
          <div className="mt-4 flex items-center justify-center gap-12 text-xs text-black font-medium">
            <span>训练日期：_________________</span>
            <span>班级：___________</span>
            <span>姓名：___________</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 italic">
            * 本练习卷经过智能诊断自动生成，由原错题引申三大不同视角的类似变式。
          </p>
        </div>

        <div className="space-y-8 max-w-4xl mx-auto">
          {printRecords.map((record, recIdx) => (
            <div 
              key={record.id} 
              className="space-y-6 pb-6 border-b border-slate-300 print-card"
            >
              
              <div className="p-4 bg-slate-100 border border-slate-300 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">
                    考题原点 #{recIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    考件知识点：{record.knowledgePoint}
                  </span>
                </div>
                <div className="text-sm leading-relaxed text-black font-serif">
                  <LaTeXRenderer text={record.originalQuestion} />
                </div>
              </div>

              <div className="space-y-5">
                {record.analogies.map((analogy, anaIdx) => (
                  <div 
                    key={analogy.id} 
                    className="p-4 border border-slate-300 rounded-md relative"
                    style={{ pageBreakInside: "avoid" }}
                  >
                    <span className="absolute top-4 left-4 w-6 h-6 rounded-full border border-slate-400 text-black text-sm font-bold flex items-center justify-center">
                      {anaIdx + 1}
                    </span>
                    
                    <div className="pl-9 mt-0.5">
                      <div className="text-sm leading-relaxed text-black font-serif font-medium">
                        <LaTeXRenderer text={analogy.questionText} />
                      </div>

                      {/* Line heights for manual writing */}
                      <div className="mt-8 mb-4 border-b border-dotted border-slate-400 h-10 w-full"></div>
                      <div className="border-b border-dotted border-slate-400 h-10 w-full"></div>

                      {showPrintAnswersInPdf && (
                        <div className="mt-5 pt-3 border-t border-slate-200 text-xs bg-slate-50 p-3 rounded-sm print-show">
                          <div className="font-bold text-black mb-1.5 label text-xs uppercase flex items-center">
                            • 解析与解答步骤:
                          </div>
                          <div className="text-black mb-2 whitespace-pre-wrap leading-relaxed">
                            <LaTeXRenderer text={analogy.answerText} />
                          </div>
                          <div className="text-black bg-white border border-slate-200 p-2.5 rounded-sm my-1 text-[11px] leading-relaxed font-sans">
                            <span className="font-bold block text-slate-800">诊断避坑分析:</span>
                            <LaTeXRenderer text={analogy.explanationText} />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-[10px] text-gray-500 border-t border-slate-300 pt-4">
          智能错题变式本 • 举一反三稳固考点强化
        </div>

      </div>

    </div>
  );
}
