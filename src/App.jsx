import { useEffect, useMemo, useState } from "react";
import "./App.css";

const QUESTIONS = [
  {
    category: "ACM",
    question: "What does ACM stand for?",
    options: [
      "Association for Computing Machinery",
      "American Computing Magazine",
      "Advanced Computer Management",
      "Association of Computer Manufacturers",
    ],
    answer: 0,
  },
  {
    category: "ACM-W",
    question: "What is ACM-W primarily focused on?",
    options: [
      "Supporting and celebrating women in computing",
      "Manufacturing computer hardware",
      "Creating programming languages",
      "Managing computer networks",
    ],
    answer: 0,
  },
  {
    category: "ACM",
    question: "ACM is best known as a professional organization for which field?",
    options: [
      "Computing",
      "Medicine",
      "Architecture",
      "Agriculture",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "What does AI stand for?",
    options: [
      "Artificial Intelligence",
      "Automated Internet",
      "Advanced Information",
      "Artificial Interface",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "Which of these is an example of Artificial Intelligence?",
    options: [
      "A voice assistant recognizing speech",
      "A basic light switch",
      "A normal calculator performing 2 + 2",
      "A USB cable",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "What is Machine Learning?",
    options: [
      "A method where computers learn patterns from data",
      "A method of physically repairing computers",
      "A technique for increasing monitor brightness",
      "A type of computer keyboard",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "Which technology is commonly used to recognize objects in images?",
    options: [
      "Computer Vision",
      "Bluetooth",
      "Spreadsheet software",
      "Word processing",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "What is a dataset?",
    options: [
      "A collection of data used for analysis or learning",
      "A computer's power supply",
      "A type of programming language",
      "A network cable",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "In Machine Learning, what is a model?",
    options: [
      "A learned representation used to make predictions",
      "A physical computer case",
      "A type of monitor",
      "A database cable",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "Which of these is a common application of Natural Language Processing?",
    options: [
      "Understanding human language",
      "Charging a laptop battery",
      "Controlling screen brightness",
      "Printing documents",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "What is training data used for in Machine Learning?",
    options: [
      "Teaching a model to recognize patterns",
      "Cleaning a computer screen",
      "Increasing internet speed",
      "Formatting a hard drive",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "What does a classification model typically predict?",
    options: [
      "A category or class",
      "The physical size of a computer",
      "The battery voltage only",
      "The screen resolution only",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "Which is an example of generative AI?",
    options: [
      "An AI system that generates text from a prompt",
      "A basic calculator",
      "A USB flash drive",
      "A computer mouse",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "What is an algorithm?",
    options: [
      "A step-by-step procedure for solving a problem",
      "A computer monitor",
      "A type of battery",
      "A network connector",
    ],
    answer: 0,
  },
  {
    category: "AI",
    question: "Why is data important in many AI systems?",
    options: [
      "Data can provide examples from which systems learn patterns",
      "Data automatically increases processor speed",
      "Data replaces the need for electricity",
      "Data physically cools the computer",
    ],
    answer: 0,
  },
];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function App() {
  const [screen, setScreen] = useState("welcome");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(180);
  const [bestScore, setBestScore] = useState(
    () => Number(localStorage.getItem("acmBestScore")) || 0
  );

  const score = useMemo(
    () =>
      questions.reduce(
        (total, question, index) =>
          total + (answers[index] === question.answer ? 1 : 0),
        0
      ),
    [questions, answers]
  );

  useEffect(() => {
    if (screen !== "quiz") return;

    if (timeLeft <= 0) {
      finishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((time) => time - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [screen, timeLeft]);

  function startQuiz() {
    setQuestions(shuffle(QUESTIONS));
    setAnswers({});
    setCurrent(0);
    setTimeLeft(180);
    setScreen("quiz");
  }

  function selectAnswer(optionIndex) {
    setAnswers((previous) => ({
      ...previous,
      [current]: optionIndex,
    }));
  }

  function nextQuestion() {
    if (current < questions.length - 1) {
      setCurrent((value) => value + 1);
    }
  }

  function previousQuestion() {
    if (current > 0) {
      setCurrent((value) => value - 1);
    }
  }

  function finishQuiz() {
    setScreen("result");

    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("acmBestScore", score);
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

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
            <div className="eyebrow">RECRUITMENT CHALLENGE</div>

            <h1>
              ACM-W <span>×</span> AI
              <br />
              <strong>QUIZ</strong>
            </h1>

            <p className="hero-description">
              Test your knowledge of computing, ACM-W, Artificial Intelligence,
              and the fundamentals shaping our digital future.
            </p>

            <div className="stats">
              <div>
                <strong>15</strong>
                <span>Questions</span>
              </div>
              <div>
                <strong>03:00</strong>
                <span>Time Limit</span>
              </div>
              <div>
                <strong>4</strong>
                <span>Options</span>
              </div>
            </div>

            {bestScore > 0 && (
              <div className="best-score">
                Your best score: <strong>{bestScore}/15</strong>
              </div>
            )}

            <button className="primary-button" onClick={startQuiz}>
              Start Quiz
              <span>→</span>
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
      </main>
    );
  }

  if (screen === "quiz") {
    const question = questions[current];
    const selected = answers[current];
    const progress = ((current + 1) / questions.length) * 100;

    return (
      <main className="app quiz-app">
        <div className="quiz-container">
          <header className="quiz-header">
            <div className="brand">
              <span className="brand-mark">A</span>
              <span>ACM-W × AI</span>
            </div>

            <div className={`timer ${timeLeft <= 30 ? "danger" : ""}`}>
              <span>◷</span>
              {formatTime(timeLeft)}
            </div>
          </header>

          <div className="progress-section">
            <div className="progress-info">
              <span>
                QUESTION <strong>{current + 1}</strong> OF{" "}
                <strong>{questions.length}</strong>
              </span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <section className="question-card">
            <div className="category">{question.category}</div>

            <h2>{question.question}</h2>

            <div className="options">
              {question.options.map((option, index) => (
                <button
                  key={option}
                  className={`option ${
                    selected === index ? "selected" : ""
                  }`}
                  onClick={() => selectAnswer(index)}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                  <span className="option-check">
                    {selected === index ? "✓" : ""}
                  </span>
                </button>
              ))}
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

            {current === questions.length - 1 ? (
              <button
                className="primary-button submit-button"
                onClick={finishQuiz}
              >
                Finish Quiz ✓
              </button>
            ) : (
              <button className="primary-button" onClick={nextQuestion}>
                Next Question →
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const percentage = Math.round((score / questions.length) * 100);

  let message = "Keep exploring!";
  if (percentage >= 80) message = "Excellent work!";
  else if (percentage >= 60) message = "Great job!";
  else if (percentage >= 40) message = "Good start!";

  return (
    <main className="app result-app">
      <div className="result-card">
        <div className="result-icon">
          {percentage >= 80 ? "★" : percentage >= 50 ? "✓" : "◆"}
        </div>

        <div className="eyebrow">QUIZ COMPLETE</div>

        <h1>{message}</h1>

        <div className="score-circle">
          <strong>{score}</strong>
          <span>/ {questions.length}</span>
        </div>

        <p className="result-message">
          You scored <strong>{percentage}%</strong> on the ACM-W × AI Quiz.
        </p>

        <div className="result-stats">
          <div>
            <strong>{score}</strong>
            <span>Correct</span>
          </div>
          <div>
            <strong>{questions.length - score}</strong>
            <span>Incorrect</span>
          </div>
          <div>
            <strong>{bestScore}</strong>
            <span>Best Score</span>
          </div>
        </div>

        <div className="review">
          <h3>Answer Review</h3>

          {questions.map((question, index) => (
            <div
              className={`review-item ${
                answers[index] === question.answer ? "correct" : "wrong"
              }`}
              key={index}
            >
              <div>
                <span className="review-number">Q{index + 1}</span>
                <strong>{question.question}</strong>
              </div>

              <span>
                {answers[index] === question.answer
                  ? "Correct"
                  : `Correct: ${question.options[question.answer]}`}
              </span>
            </div>
          ))}
        </div>

        <button className="primary-button" onClick={startQuiz}>
          Try Again ↻
        </button>
      </div>
    </main>
  );
}

export default App;