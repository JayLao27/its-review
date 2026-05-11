import questionData from "../../data/questions.json";
import type { QuestionItem } from "../../lib/questions";
import { TestMode } from "../../components/test-mode";

export default function TestPage() {
  return <TestMode questions={questionData as QuestionItem[]} />;
}
