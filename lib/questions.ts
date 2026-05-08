export type QuestionItem = {
  id?: string | number;
  question: string;
  answer: unknown;
  category?: string;
  tags?: string[];
  explanation?: string;
  options?: string[];
  correctAnswerIndex?: number;
};

export type NormalizedQuestionItem = QuestionItem & {
  id: string;
};

export function normalizeQuestions(questions: QuestionItem[]): NormalizedQuestionItem[] {
  return questions.map((question, index) => ({
    ...question,
    id: String(question.id ?? index + 1),
  }));
}