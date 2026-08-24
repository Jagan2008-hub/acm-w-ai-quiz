import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import "./App.css";

const QUIZ_TIME = 600;
const MAX_ATTEMPTS = 3;

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

/* =========================================================
   CORRECT ANSWER CONVERTER
========================================================= */

function getCorrectIndex(question) {
  const raw = question.correct_answer;

  if (raw === null || raw === undefined) return -1;

  const value = String(raw).trim();

  if (/^[0-3]$/.test(value)) {
    return Number(value);
  }

  if (/^[ABCD]$/i.test(value)) {
    return "ABCD".indexOf(value.toUpperCase());
  }

  const prefixedMatch = value
    .toUpperCase()
    .match(/^([ABCD])[\s.)-]/);

  if (prefixedMatch) {
    return "ABCD".indexOf(prefixedMatch[1]);
  }

  const normalized = value.toLowerCase();

  const index = question.options.findIndex(
    (option) =>
      String(option).trim().toLowerCase() === normalized
  );

  return index;
}

/* =========================================================
   NAME NORMALIZATION
========================================================= */

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [screen, setScreen] = useState("welcome");

  const [playerName, setPlayerName] = useState("");
  const [questions, setQuestions] = useState([]);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState({});

  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [leaderboard, setLeaderboard] = useState([]);

  const [showFinishConfirm, setShowFinishConfirm] =
    useState(false);

  const [showAttemptConfirm, setShowAttemptConfirm] =
    useState(false);

  const [existingAttempts, setExistingAttempts] = useState(0);

  const [currentAttempt, setCurrentAttempt] = useState(1);

  const totalQuestions = questions.length;

  const answeredCount = Object.keys(answers).length;

  const skippedCount = Object.values(status).filter(
    (value) => value === "skipped"
  ).length;

  const unansweredCount = Math.max(
    0,
    totalQuestions - answeredCount - skippedCount
  );

  const percentage = totalQuestions
    ? Math.round((score / totalQuestions) * 100)
    : 0;

  const currentQuestion = questions[current];

  /* =========================================================
     SCORE
  ========================================================= */

  const calculatedScore = useMemo(() => {
    return questions.reduce((total, question, index) => {
      return (
        total +
        (answers[index] === getCorrectIndex(question)
          ? 1
          : 0)
      );
    }, 0);
  }, [questions, answers]);

  /* =========================================================
     TIMER
  ========================================================= */

  useEffect(() => {
    if (screen !== "quiz") return;

    if (timeLeft <= 0) {
      finishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((value) => value - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, timeLeft]);

  /* =========================================================
     LOAD LEADERBOARD
  ========================================================= */

  async function loadLeaderboard() {
    const { data, error: leaderboardError } =
      await supabase
        .from("leaderboard")
        .select("*")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(10);

    if (!leaderboardError) {
      setLeaderboard(data || []);
    }
  }

  /* =========================================================
     CHECK PARTICIPANT ATTEMPTS
  ========================================================= */

  async function checkNameAttempts(name) {
    const normalized = normalizeName(name);

    const { data, error: attemptError } =
      await supabase
        .from("leaderboard")
        .select("player_name, attempt_number")
        .ilike("player_name", name.trim());

    if (attemptError) {
      console.error(attemptError);

      setError(
        "Unable to verify participant details. Please try again."
      );

      return null;
    }

    const matches = (data || []).filter(
      (entry) =>
        normalizeName(entry.player_name) === normalized
    );

    return matches.length;
  }

  /* =========================================================
     START QUIZ
  ========================================================= */

  async function startQuiz() {
    const cleanName = playerName.trim();

    if (!cleanName) {
      setError("Please enter your name before starting.");
      return;
    }

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    setError("");

    const attempts = await checkNameAttempts(cleanName);

    if (attempts === null) {
      setLoading(false);
      return;
    }

    setExistingAttempts(attempts);

    if (attempts >= MAX_ATTEMPTS) {
      setCurrentAttempt(MAX_ATTEMPTS);
      setShowAttemptConfirm(true);
      setLoading(false);
      return;
    }

    if (attempts > 0) {
      setCurrentAttempt(attempts + 1);
      setShowAttemptConfirm(true);
      setLoading(false);
      return;
    }

    setCurrentAttempt(1);

    await actuallyStartQuiz();
  }

  /* =========================================================
     ACTUALLY START
  ========================================================= */

  async function actuallyStartQuiz() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } =
      await supabase
        .from("quiz_questions")
        .select("*");

    if (fetchError) {
      console.error(fetchError);

      setError(
        "Could not load questions. Please try again."
      );

      setLoading(false);
      return;
    }

    const formattedQuestions = shuffle(
      (data || []).map((item) => ({
        id: item.id,
        category: item.category,
        question: item.question,

        options: [
          item.option_a,
          item.option_b,
          item.option_c,
          item.option_d,
        ],

        correct_answer: item.correct_answer,
      }))
    );

    setQuestions(formattedQuestions);
    setAnswers({});
    setStatus({});
    setCurrent(0);
    setTimeLeft(QUIZ_TIME);
    setScore(0);

    setShowFinishConfirm(false);
    setShowAttemptConfirm(false);

    setScreen("quiz");
    setLoading(false);
  }

  /* =========================================================
     CONTINUE SAME PARTICIPANT
  ========================================================= */

  async function continueWithSameName() {
    setLoading(true);
    setError("");

    const latestAttempts =
      await checkNameAttempts(playerName);

    if (latestAttempts === null) {
      setLoading(false);
      return;
    }

    if (latestAttempts >= MAX_ATTEMPTS) {
      setExistingAttempts(latestAttempts);
      setCurrentAttempt(MAX_ATTEMPTS);
      setLoading(false);
      return;
    }

    setCurrentAttempt(latestAttempts + 1);

    await actuallyStartQuiz();
  }

  /* =========================================================
     SELECT
  ========================================================= */

  function selectAnswer(optionIndex) {
    setAnswers((previous) => ({
      ...previous,
      [current]: optionIndex,
    }));

    setStatus((previous) => ({
      ...previous,
      [current]: "answered",
    }));
  }

  /* =========================================================
     CLEAR
  ========================================================= */

  function clearAnswer() {
    setAnswers((previous) => {
      const updated = { ...previous };
      delete updated[current];
      return updated;
    });

    setStatus((previous) => {
      const updated = { ...previous };
      delete updated[current];
      return updated;
    });
  }

  /* =========================================================
     SKIP
  ========================================================= */

  function skipQuestion() {
    setAnswers((previous) => {
      const updated = { ...previous };
      delete updated[current];
      return updated;
    });

    setStatus((previous) => ({
      ...previous,
      [current]: "skipped",
    }));

    if (current < totalQuestions - 1) {
      setCurrent((value) => value + 1);
    }
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function nextQuestion() {
    if (current < totalQuestions - 1) {
      setCurrent((value) => value + 1);
    }
  }

  function previousQuestion() {
    if (current > 0) {
      setCurrent((value) => value - 1);
    }
  }

  function jumpToQuestion(index) {
    setCurrent(index);
  }

  /* =========================================================
     FINISH CONFIRM
  ========================================================= */

  function requestFinishQuiz() {
    setShowFinishConfirm(true);
  }

  /* =========================================================
     FINISH QUIZ
  ========================================================= */

  async function finishQuiz() {
    if (loading) return;

    setLoading(true);
    setShowFinishConfirm(false);

    const finalScore = questions.reduce(
      (total, question, index) => {
        return (
          total +
          (answers[index] === getCorrectIndex(question)
            ? 1
            : 0)
        );
      },
      0
    );

    setScore(finalScore);

    if (finalScore > bestScore) {
      setBestScore(finalScore);
    }

    /* -----------------------------------------
       FINAL ATTEMPT VERIFICATION
    ----------------------------------------- */

    const latestAttempts =
      await checkNameAttempts(playerName);

    if (latestAttempts === null) {
      setLoading(false);
      return;
    }

    if (latestAttempts >= MAX_ATTEMPTS) {
      setError(
        "This participant has already reached the maximum number of attempts."
      );
      setLoading(false);
      setScreen("welcome");
      return;
    }

    const actualAttempt = latestAttempts + 1;

    /* -----------------------------------------
       SAVE RESULT
    ----------------------------------------- */

    const { error: insertError } =
      await supabase
        .from("leaderboard")
        .insert({
          player_name: playerName.trim(),
          score: finalScore,
          total_questions: totalQuestions,
          attempt_number: actualAttempt,
        });

    if (insertError) {
      console.error(
        "Leaderboard insert error:",
        insertError
      );

      setError(
        "Your result could not be saved. Please contact the organizer."
      );

      setLoading(false);
      return;
    }

    setCurrentAttempt(actualAttempt);

    await loadLeaderboard();

    setLoading(false);
    setScreen("result");
  }

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remaining).padStart(2, "0")}`;
  }

  /* =========================================================
     QUESTION STATUS
  ========================================================= */

  function getQuestionStatus(index) {
    if (index === current) return "current";

    if (status[index] === "answered") {
      return "answered";
    }

    if (status[index] === "skipped") {
      return "skipped";
    }

    return "unanswered";
  }

  /* =========================================================
     RESET
  ========================================================= */

  function resetForNewAttempt() {
    setAnswers({});
    setStatus({});
    setCurrent(0);
    setTimeLeft(QUIZ_TIME);
    setScore(0);
    setShowFinishConfirm(false);
    setShowAttemptConfirm(false);
    setError("");
    setScreen("welcome");
  }

  /* =========================================================
     WELCOME
  ========================================================= */

  if (screen === "welcome") {
    return (
      <main className="app">
        <div className="background-glow glow-one"></div>
        <div className="background-glow glow-two"></div>

        <section className="welcome-card">
          <div className="brand">
            <span className="brand-mark">A</span>
            <span>ACM-W</span>
          </div>

          <div className="hero-content">
            <div className="eyebrow">
              RECRUITMENT CHALLENGE
            </div>

            <h1>
              ACM-W <span>×</span> AI
              <br />
              <strong>QUIZ</strong>
            </h1>

            <p className="hero-description">
              Test your knowledge of computing,
              ACM-W, Artificial Intelligence, and
              the technologies shaping our digital
              future.
            </p>

            <div className="stats">
              <div>
                <strong>{questions.length || 15}</strong>
                <span>Questions</span>
              </div>

              <div>
                <strong>10:00</strong>
                <span>Time Limit</span>
              </div>

              <div>
                <strong>3</strong>
                <span>Attempts / Participant</span>
              </div>
            </div>

            <div className="attempt-policy">
              <span className="policy-icon">✓</span>
              <div>
                <strong>Maximum 3 attempts per participant</strong>
                <small>
                  Same-name participants will be asked
                  to identify themselves with a different name.
                </small>
              </div>
            </div>

            <div className="name-section">
              <label htmlFor="player-name">
                Enter your name
              </label>

              <input
                id="player-name"
                type="text"
                value={playerName}
                placeholder="Enter your full name"
                maxLength={60}
                onChange={(event) => {
                  setPlayerName(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    startQuiz();
                  }
                }}
              />
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="primary-button start-button"
              onClick={startQuiz}
              disabled={loading}
            >
              {loading
                ? "Verifying participant..."
                : "Start Quiz →"}
            </button>
          </div>

          <div className="welcome-footer">
            <span>COMPUTING</span>
            <span>•</span>
            <span>ARTIFICIAL INTELLIGENCE</span>
            <span>•</span>
            <span>ACM-W</span>
          </div>
        </section>

        {/* ATTEMPT MODAL */}

        {showAttemptConfirm && (
          <div className="finish-overlay">
            <div className="finish-modal attempt-modal">
              {existingAttempts >= MAX_ATTEMPTS ? (
                <>
                  <div className="finish-icon danger-icon">
                    !
                  </div>

                  <div className="eyebrow">
                    PARTICIPANT LIMIT REACHED
                  </div>

                  <h2>
                    Maximum attempts completed
                  </h2>

                  <p>
                    The participant name{" "}
                    <strong>
                      "{playerName.trim()}"
                    </strong>{" "}
                    has already completed{" "}
                    <strong>
                      {existingAttempts}
                    </strong>{" "}
                    attempts.
                  </p>

                  <div className="attempt-limit-card">
                    <div className="attempt-limit-number">
                      3
                    </div>

                    <div>
                      <strong>
                        Maximum 3 attempts per participant
                      </strong>

                      <span>
                        No additional attempt can be
                        registered under this name.
                      </span>
                    </div>
                  </div>

                  <div className="same-name-help">
                    <strong>
                      Are you a different person with
                      the same name?
                    </strong>

                    <span>
                      Please add an identifier so the
                      leaderboard can distinguish you.
                    </span>

                    <div className="name-examples">
                      <span>Jagan S</span>
                      <span>Jagan Kumar</span>
                      <span>Jagan 2</span>
                    </div>
                  </div>

                  <div className="finish-actions">
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setShowAttemptConfirm(false);
                        setPlayerName("");
                        setError("");
                      }}
                    >
                      Change Name
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="finish-icon">
                    {existingAttempts + 1}
                  </div>

                  <div className="eyebrow">
                    PARTICIPANT FOUND
                  </div>

                  <h2>
                    This name already has an attempt
                  </h2>

                  <p>
                    <strong>
                      "{playerName.trim()}"
                    </strong>{" "}
                    has already been used{" "}
                    <strong>{existingAttempts}</strong>{" "}
                    time
                    {existingAttempts === 1
                      ? ""
                      : "s"}.
                  </p>

                  <div className="attempt-progress">
                    {[1, 2, 3].map((attempt) => (
                      <div
                        key={attempt}
                        className={`attempt-dot ${
                          attempt <= existingAttempts
                            ? "used"
                            : attempt ===
                              existingAttempts + 1
                            ? "next"
                            : ""
                        }`}
                      >
                        <span>{attempt}</span>
                        <small>
                          {attempt <= existingAttempts
                            ? "Used"
                            : attempt ===
                              existingAttempts + 1
                            ? "Next"
                            : "Available"}
                        </small>
                      </div>
                    ))}
                  </div>

                  <div className="same-name-help">
                    <strong>
                      Is this the same participant?
                    </strong>

                    <span>
                      If yes, continue with your{" "}
                      <strong>
                        Attempt {existingAttempts + 1}
                      </strong>
                      .
                    </span>

                    <span className="different-person">
                      If you are a different person with
                      the same name, please choose a
                      different name to avoid leaderboard
                      confusion.
                    </span>
                  </div>

                  <div className="finish-actions">
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setShowAttemptConfirm(false);
                        setPlayerName("");
                        setError("");
                      }}
                    >
                      Change Name
                    </button>

                    <button
                      className="primary-button"
                      onClick={
                        continueWithSameName
                      }
                      disabled={loading}
                    >
                      {loading
                        ? "Verifying..."
                        : `Continue — Attempt ${
                            existingAttempts + 1
                          } →`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  /* =========================================================
     QUIZ
  ========================================================= */

  if (screen === "quiz" && currentQuestion) {
    const selected = answers[current];

    const progress =
      totalQuestions > 0
        ? ((current + 1) / totalQuestions) * 100
        : 0;

    return (
      <main className="app quiz-app">
        <div className="quiz-container">
          <header className="quiz-header">
            <div className="brand">
              <span className="brand-mark">A</span>
              <span>ACM-W × AI</span>
            </div>

            <div
              className={`attempt-badge ${
                currentAttempt === 3
                  ? "last-attempt"
                  : ""
              }`}
            >
              ATTEMPT {currentAttempt}/{MAX_ATTEMPTS}
            </div>

            <div
              className={`timer ${
                timeLeft <= 30 ? "danger" : ""
              }`}
            >
              <span>◷</span>
              {formatTime(timeLeft)}
            </div>
          </header>

          <div className="progress-section">
            <div className="progress-info">
              <span>
                QUESTION{" "}
                <strong>{current + 1}</strong>{" "}
                OF{" "}
                <strong>{totalQuestions}</strong>
              </span>

              <span>
                {Math.round(progress)}%
              </span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>

          <section className="question-navigation">
            <div className="question-navigation-header">
              <strong>
                Question Navigator
              </strong>

              <div className="legend">
                <span>
                  <i className="legend-box answered"></i>
                  Answered
                </span>

                <span>
                  <i className="legend-box skipped"></i>
                  Skipped
                </span>

                <span>
                  <i className="legend-box unanswered"></i>
                  Unanswered
                </span>
              </div>
            </div>

            <div className="question-numbers">
              {questions.map((_, index) => (
                <button
                  key={index}
                  className={`question-number ${getQuestionStatus(
                    index
                  )}`}
                  onClick={() =>
                    jumpToQuestion(index)
                  }
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </section>

          <section className="question-card">
            <div className="question-top-line">
              <div className="category">
                {currentQuestion.category}
              </div>

              <span className="question-counter">
                {current + 1} / {totalQuestions}
              </span>
            </div>

            <h2>
              {currentQuestion.question}
            </h2>

            <div className="options">
              {currentQuestion.options.map(
                (option, index) => (
                  <button
                    key={`${index}-${option}`}
                    className={`option ${
                      selected === index
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectAnswer(index)
                    }
                  >
                    <span className="option-letter">
                      {String.fromCharCode(
                        65 + index
                      )}
                    </span>

                    <span className="option-text">
                      {option}
                    </span>

                    <span className="option-check">
                      {selected === index
                        ? "✓"
                        : ""}
                    </span>
                  </button>
                )
              )}
            </div>
          </section>

          <div className="navigation">
            <button
              className="secondary-button"
              onClick={previousQuestion}
              disabled={current === 0}
            >
              ← Previous
            </button>

            <button
              className="clear-button"
              onClick={clearAnswer}
              disabled={
                selected === undefined
              }
            >
              Clear Answer
            </button>

            <button
              className="skip-button"
              onClick={skipQuestion}
            >
              Skip →
            </button>

            {current === totalQuestions - 1 ? (
              <button
                className="primary-button submit-button"
                onClick={requestFinishQuiz}
              >
                Finish Quiz ✓
              </button>
            ) : (
              <button
                className="primary-button"
                onClick={nextQuestion}
              >
                Next Question →
              </button>
            )}
          </div>

          <div className="quiz-summary">
            <span className="summary-answered">
              ● Answered{" "}
              <strong>{answeredCount}</strong>
            </span>

            <span className="summary-skipped">
              ● Skipped{" "}
              <strong>{skippedCount}</strong>
            </span>

            <span className="summary-unanswered">
              ● Unanswered{" "}
              <strong>{unansweredCount}</strong>
            </span>
          </div>

          {/* FINISH MODAL */}

          {showFinishConfirm && (
            <div className="finish-overlay">
              <div className="finish-modal">
                <div className="finish-icon">
                  ✓
                </div>

                <div className="eyebrow">
                  READY TO SUBMIT?
                </div>

                <h2>
                  Finish your quiz?
                </h2>

                <p>
                  Review your progress before
                  submitting Attempt{" "}
                  <strong>
                    {currentAttempt}
                  </strong>
                  .
                </p>

                <div className="finish-summary">
                  <div className="finish-stat answered-stat">
                    <strong>
                      {answeredCount}
                    </strong>
                    <span>Answered</span>
                  </div>

                  <div className="finish-stat skipped-stat">
                    <strong>
                      {skippedCount}
                    </strong>
                    <span>Skipped</span>
                  </div>

                  <div className="finish-stat unanswered-stat">
                    <strong>
                      {unansweredCount}
                    </strong>
                    <span>Unanswered</span>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <div className="finish-warning">
                    ⚠ You still have{" "}
                    <strong>
                      {unansweredCount}
                    </strong>{" "}
                    unanswered question
                    {unansweredCount > 1
                      ? "s"
                      : ""}.
                  </div>
                )}

                <div className="finish-actions">
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setShowFinishConfirm(false)
                    }
                  >
                    ← Go Back
                  </button>

                  <button
                    className="primary-button"
                    onClick={finishQuiz}
                    disabled={loading}
                  >
                    {loading
                      ? "Submitting..."
                      : "Confirm & Finish ✓"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  /* =========================================================
     RESULT
  ========================================================= */

  let message = "Keep exploring!";

  if (percentage >= 80) {
    message = "Excellent work!";
  } else if (percentage >= 60) {
    message = "Great job!";
  } else if (percentage >= 40) {
    message = "Good start!";
  }

  const wrongCount = answeredCount - score;

  const correctDeg =
    totalQuestions > 0
      ? (score / totalQuestions) * 360
      : 0;

  const wrongDeg =
    totalQuestions > 0
      ? (wrongCount / totalQuestions) * 360
      : 0;

  const skippedDeg =
    totalQuestions > 0
      ? (skippedCount / totalQuestions) * 360
      : 0;

  const correctEnd = correctDeg;
  const wrongEnd = correctEnd + wrongDeg;
  const skippedEnd = wrongEnd + skippedDeg;

  return (
    <main className="app result-app">
      <div className="result-card">
        <div className="result-top">
          <div className="result-icon">
            {percentage >= 80
              ? "★"
              : percentage >= 50
              ? "✓"
              : "◆"}
          </div>

          <div className="eyebrow">
            QUIZ COMPLETE
          </div>

          <h1>{message}</h1>

          <p className="player-result">
            Well done,{" "}
            <strong>{playerName}</strong>!
          </p>

          <div className="attempt-result-badge">
            ATTEMPT {currentAttempt} /{" "}
            {MAX_ATTEMPTS}
          </div>

          <div className="score-circle">
            <strong>{score}</strong>
            <span>/ {totalQuestions}</span>
          </div>

          <p className="result-message">
            You scored{" "}
            <strong>{percentage}%</strong>{" "}
            on the ACM-W × AI Quiz.
          </p>
        </div>

        <div className="result-stats">
          <div className="result-stat correct-stat">
            <span className="stat-symbol">✓</span>
            <strong>{score}</strong>
            <span>Correct</span>
          </div>

          <div className="result-stat wrong-stat">
            <span className="stat-symbol">✕</span>
            <strong>{wrongCount}</strong>
            <span>Wrong</span>
          </div>

          <div className="result-stat skipped-stat">
            <span className="stat-symbol">→</span>
            <strong>{skippedCount}</strong>
            <span>Skipped</span>
          </div>

          <div className="result-stat unanswered-stat">
            <span className="stat-symbol">○</span>
            <strong>{unansweredCount}</strong>
            <span>Unanswered</span>
          </div>
        </div>

        {/* =================================================
            LEADERBOARD FIRST
        ================================================= */}

        <section className="leaderboard-section">
          <div className="eyebrow">
            TOP PARTICIPANTS
          </div>

          <div className="leaderboard-heading">
            <div>
              <h2>🏆 Leaderboard</h2>
              <p>
                Top scores from all registered attempts
              </p>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <p className="empty-leaderboard">
              No scores yet.
            </p>
          ) : (
            <div className="leaderboard">
              {leaderboard.map((entry, index) => {
                const samePlayer =
                  normalizeName(
                    entry.player_name
                  ) === normalizeName(playerName);

                const sameScore =
                  Number(entry.score) ===
                  Number(score);

                const attempt =
                  entry.attempt_number ||
                  "?";

                return (
                  <div
                    className={`leaderboard-row ${
                      samePlayer && sameScore
                        ? "highlight"
                        : ""
                    }`}
                    key={
                      entry.id ||
                      `${entry.player_name}-${attempt}-${index}`
                    }
                  >
                    <span className="rank">
                      {index === 0
                        ? "🥇"
                        : index === 1
                        ? "🥈"
                        : index === 2
                        ? "🥉"
                        : `#${index + 1}`}
                    </span>

                    <div className="leader-player">
                      <strong>
                        {entry.player_name}
                      </strong>

                      <div className="leader-meta">
                        <span>
                          ATTEMPT {attempt}
                        </span>

                        {samePlayer && (
                          <span className="your-result-tag">
                            YOUR RESULT
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="leader-score">
                      <strong>
                        {entry.score}
                      </strong>
                      <span>
                        /{entry.total_questions}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =================================================
            PERFORMANCE AFTER LEADERBOARD
        ================================================= */}

        <section className="performance-section">
          <div className="eyebrow">
            PERFORMANCE ANALYTICS
          </div>

          <h2>
            Performance Breakdown
          </h2>

          <p className="review-description">
            A visual breakdown of how you performed
            in Attempt {currentAttempt}.
          </p>

          <div className="performance-layout">
            <div
              className="pie-chart"
              style={{
                background: `conic-gradient(
                  #34d399 0deg ${correctEnd}deg,
                  #fb5c68 ${correctEnd}deg ${wrongEnd}deg,
                  #f59e0b ${wrongEnd}deg ${skippedEnd}deg,
                  #60a5fa ${skippedEnd}deg 360deg
                )`,
              }}
            >
              <div className="pie-center">
                <strong>{percentage}%</strong>
                <span>YOUR SCORE</span>
              </div>
            </div>

            <div className="chart-legend">
              <div>
                <i className="chart-dot correct-dot"></i>
                <span>Correct</span>
                <strong>{score}</strong>
              </div>

              <div>
                <i className="chart-dot wrong-dot"></i>
                <span>Wrong</span>
                <strong>{wrongCount}</strong>
              </div>

              <div>
                <i className="chart-dot skipped-dot"></i>
                <span>Skipped</span>
                <strong>{skippedCount}</strong>
              </div>

              <div>
                <i className="chart-dot unanswered-dot"></i>
                <span>Unanswered</span>
                <strong>{unansweredCount}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            ANSWER REVIEW
        ================================================= */}

        <section className="answer-review-section">
          <div className="eyebrow">
            ANSWER ANALYSIS
          </div>

          <h2>Answer Review</h2>

          <p className="review-description">
            Review every question, your answer,
            and the correct answer.
          </p>

          <div className="answer-review">
            {questions.map((question, index) => {
              const selectedAnswer =
                answers[index];

              const correctIndex =
                getCorrectIndex(question);

              const isSkipped =
                status[index] === "skipped";

              const isUnanswered =
                selectedAnswer === undefined &&
                !isSkipped;

              const isCorrect =
                selectedAnswer !== undefined &&
                selectedAnswer === correctIndex;

              return (
                <div
                  className={`review-card ${
                    isCorrect
                      ? "review-correct"
                      : isSkipped
                      ? "review-skipped"
                      : isUnanswered
                      ? "review-unanswered"
                      : "review-wrong"
                  }`}
                  key={question.id || index}
                >
                  <div className="review-card-header">
                    <span className="review-number">
                      QUESTION {index + 1}
                    </span>

                    <span className="review-status">
                      {isCorrect
                        ? "✓ CORRECT"
                        : isSkipped
                        ? "→ SKIPPED"
                        : isUnanswered
                        ? "○ UNANSWERED"
                        : "✕ WRONG"}
                    </span>
                  </div>

                  <h3>
                    {question.question}
                  </h3>

                  <div className="review-answer">
                    <div className="answer-box your-answer">
                      <span>
                        YOUR ANSWER
                      </span>

                      <strong>
                        {isSkipped
                          ? "Skipped"
                          : isUnanswered
                          ? "Not answered"
                          : `${String.fromCharCode(
                              65 + selectedAnswer
                            )}. ${
                              question.options[
                                selectedAnswer
                              ]
                            }`}
                      </strong>
                    </div>

                    <div className="answer-box correct-answer">
                      <span>
                        CORRECT ANSWER
                      </span>

                      <strong>
                        {correctIndex >= 0
                          ? `${String.fromCharCode(
                              65 + correctIndex
                            )}. ${
                              question.options[
                                correctIndex
                              ]
                            }`
                          : "Answer not configured"}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="result-actions">
          {currentAttempt < MAX_ATTEMPTS ? (
            <button
              className="primary-button"
              onClick={resetForNewAttempt}
            >
              Try Again — Attempt{" "}
              {currentAttempt + 1} ↻
            </button>
          ) : (
            <button
              className="secondary-button"
              onClick={resetForNewAttempt}
            >
              Return to Start
            </button>
          )}
        </div>

        <div className="result-footer">
          ACM-W × AI • PARTICIPANT ASSESSMENT SYSTEM
        </div>
      </div>
    </main>
  );
}

export default App;