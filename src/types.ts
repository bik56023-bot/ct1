export interface Analogy {
  id: string;
  questionText: string;
  answerText: string;
  explanationText: string;
}

export interface MistakeRecord {
  id: string;
  originalQuestion: string;
  knowledgePoint: string;
  difficultyAnalysis: string;
  analogies: Analogy[];
  savedAt: string;
  subject?: string;
}

export interface SampleQuestion {
  id: string;
  title: string;
  content: string;
  knowledge: string;
}
