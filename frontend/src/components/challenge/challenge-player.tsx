"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { useSound } from "@/components/app/sound-provider";
import { CountdownBanner, LevelBadge, LevelUpText, TimeUpBanner } from "@/components/challenge/challenge-banners";
import { ChallengeResult, type ChallengeOutcome } from "@/components/challenge/challenge-result";
import { ChallengeTimer } from "@/components/challenge/challenge-timer";
import { NumericKeypad } from "@/components/numeric-keypad";
import { ComboText } from "@/components/play/combo-text";
import { FeedbackText, poseFor, type Feedback } from "@/components/play/feedback-text";
import { FeverFriends } from "@/components/play/fever-friends";
import { FeverBanner, FeverStage } from "@/components/play/fever-stage";
import { GaugeBar } from "@/components/play/gauge-bar";
import { PointsPopup } from "@/components/play/points-popup";
import { ProblemText } from "@/components/play/problem-text";
import { ScoreCounter } from "@/components/play/score-counter";
import { useSpeedPlay } from "@/components/play/use-speed-play";
import { isTimeUp, levelPoints, nextProblem, secondsFor, type ChallengeModeId } from "@/lib/game/challenge-rules";
import { answerChallenge, INITIAL_CHALLENGE, type ChallengeState } from "@/lib/game/challenge-session";
import { isChallengeUnlocked } from "@/lib/game/progression";
import type { Problem } from "@/lib/game/problem-rules";
import { recordChallengeResult, useProgress } from "@/lib/progress-store";
import { SPRU_POSES } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const FEEDBACK_DELAY_MS = 600;
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 700;
const TIME_UP_MS = 1500;

type Phase = "countdown" | "playing" | "timeup" | "result";

export function ChallengePlayer({ modeId }: { modeId: ChallengeModeId }) {
  const router = useRouter();
  const { play } = useSound();
  const { stars } = useProgress();
  const unlocked = isChallengeUnlocked(stars);

  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [round, setRound] = useState(0);
  const [challenge, setChallenge] = useState<ChallengeState>(INITIAL_CHALLENGE);
  // 問題は Math.random で作るため、ChallengePlayerLoader が ssr: false で読み込む
  const [problem, setProblem] = useState<Problem>(() => nextProblem(modeId, 1, null));
  const [asked, setAsked] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [levelUpAt, setLevelUpAt] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<ChallengeOutcome | null>(null);
  // 残り時間の見張りと答えの両方から時間切れが来ても、記録は1回だけにする
  const endedRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const speed = useSpeedPlay({
    secondsPerProblem: secondsFor(modeId, challenge.level, problem),
    answerable: phase === "playing" && feedback === null,
    questionKey: asked,
  });

  useEffect(() => {
    if (!unlocked) router.replace("/");
  }, [unlocked, router]);

  useEffect(() => {
    if (phase !== "countdown") return;
    const id = setTimeout(() => (count > 0 ? setCount(count - 1) : setPhase("playing")), COUNTDOWN_STEP_MS);
    return () => clearTimeout(id);
  }, [phase, count]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => timeouts.forEach(clearTimeout);
  }, []);

  function schedule(fn: () => void, ms: number) {
    timeoutsRef.current.push(setTimeout(fn, ms));
  }

  function clearScheduled() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.length = 0;
  }

  // 記録はこの中で1回だけ行う（effect に置くと開発時の二重実行で2回走る）
  function timeUp() {
    if (endedRef.current) return;
    endedRef.current = true;
    const session = speed.finish();
    const record = recordChallengeResult(modeId, session.score);
    setOutcome({
      score: session.score,
      correctCount: challenge.correctCount,
      topLevel: challenge.topLevel,
      ...record,
    });
    setFeedback(null);
    setInputValue("");
    setPhase("timeup");
    play("allCorrect");
    schedule(() => setPhase("result"), TIME_UP_MS);
  }

  function handleSubmit() {
    if (phase !== "playing" || inputValue === "" || feedback !== null) return;
    // 0びょうを過ぎてから押した答えは数えない（設計書2.2）
    if (isTimeUp(speed.getElapsedMs())) return timeUp();
    const correct = Number(inputValue) === problem.answer;
    const step = answerChallenge(challenge, correct);
    speed.submit(correct, Number.POSITIVE_INFINITY, levelPoints(challenge.level));
    setFeedback(correct ? "correct" : "incorrect");
    play(correct ? "correct" : "incorrect");
    setInputValue("");
    schedule(() => {
      setChallenge(step.state);
      setProblem(nextProblem(modeId, step.state.level, problem));
      setAsked((n) => n + 1);
      setLevelUpAt(step.leveledUp ? step.state.correctCount : null);
      if (step.leveledUp) play("levelUp");
      setFeedback(null);
    }, FEEDBACK_DELAY_MS);
  }

  function retry() {
    clearScheduled();
    speed.reset();
    endedRef.current = false;
    setChallenge(INITIAL_CHALLENGE);
    setProblem(nextProblem(modeId, 1, null));
    setAsked(0);
    setLevelUpAt(null);
    setOutcome(null);
    setFeedback(null);
    setInputValue("");
    setCount(COUNTDOWN_FROM);
    setPhase("countdown");
    setRound((n) => n + 1);
  }

  if (!unlocked) return null;
  if (phase === "result" && outcome) return <ChallengeResult modeId={modeId} outcome={outcome} onRetry={retry} />;

  const inFever = speed.session.feverLeft > 0;

  return (
    <main
      data-phase={phase}
      data-fever={inFever ? "true" : "false"}
      className="relative isolate flex flex-1 flex-col gap-2 pb-4"
    >
      <FeverStage active={inFever} />
      <header className="flex items-center gap-2 px-3 pt-3">
        <Link href="/challenge" aria-label="やめる" className={appButtonVariants({ variant: "cream", size: "icon" })}>
          <X className="h-6 w-6" strokeWidth={3} />
        </Link>
        <LevelBadge level={challenge.level} />
        {/* もういちどのたびに作り直し、前の回の残り時間を引き継がない */}
        <ChallengeTimer key={round} getElapsedMs={speed.getElapsedMs} running={phase === "playing"} onTimeUp={timeUp} />
      </header>
      <div className="flex items-center gap-2 px-4">
        <GaugeBar gauge={speed.session.gauge} feverLeft={speed.session.feverLeft} />
        <ScoreCounter score={speed.session.score} />
      </div>
      {inFever && <FeverFriends hopKey={speed.session.answered} />}
      <Panel
        className={cn(
          "relative mx-4 flex flex-1 flex-col items-center justify-center gap-2",
          feedback === "incorrect" && "animate-shake"
        )}
      >
        <ComboText combo={speed.session.combo} />
        <LevelUpText at={levelUpAt} />
        <span key={speed.session.answered} className={feedback === "correct" ? "block animate-spru-hop" : "block"}>
          <Image src={SPRU_POSES[poseFor(feedback)]} alt="" width={80} height={100} className="h-20 w-auto" />
        </span>
        {/* カウントダウン中は問題を見せない（先に考えられないように） */}
        {phase === "countdown" ? <p className="h-10" /> : <ProblemText problem={problem} />}
        <p className="min-w-28 rounded-2xl bg-muted/60 px-4 py-1 text-center font-display text-5xl font-black">
          {inputValue || " "}
        </p>
        <FeedbackText feedback={feedback} />
        <PointsPopup gain={feedback === "correct" ? speed.lastGain : null} />
      </Panel>
      <div className="flex w-full justify-center px-4">
        <NumericKeypad
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={phase !== "playing" || feedback !== null}
        />
      </div>
      <FeverBanner show={speed.banner} />
      {phase === "countdown" && <CountdownBanner count={count} />}
      {phase === "timeup" && <TimeUpBanner />}
    </main>
  );
}
