import questionData from "../data/questions.json";
import type { QuestionItem } from "../lib/questions";
import { QuestionApp } from "../components/question-app";

export default function HomePage() {
  return <QuestionApp questions={questionData as QuestionItem[]} />;
}