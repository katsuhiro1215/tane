import { cn } from "@/lib/utils";

export type Feedback = "correct" | "incorrect" | null;

export function FeedbackText({ feedback }: { feedback: Feedback }) {
  return (
    <p
      key={feedback ?? "none"}
      aria-live="polite"
      className={cn(
        "h-8 font-display text-2xl font-black",
        feedback === "correct" && "animate-pop-in text-primary",
        feedback === "incorrect" && "animate-pop-in text-destructive"
      )}
    >
      {feedback === "correct" ? "せいかい！" : feedback === "incorrect" ? "おしい！" : " "}
    </p>
  );
}

export function poseFor(feedback: Feedback): "happy" | "sad" | "think" {
  return feedback === "correct" ? "happy" : feedback === "incorrect" ? "sad" : "think";
}
