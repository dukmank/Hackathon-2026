import React, { useMemo, useState, useEffect } from "react";
import "../styles/index.css";

const Quiz = ({
  questions,
  answers,
  onAnswerChange,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const question = questions?.[currentIndex];

  const goBack = () => {
    if (currentIndex > 0 && !animating) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (animating) return;

      if (e.key === "ArrowLeft") goBack();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [animating, currentIndex]);

  useEffect(() => {
    const canvas = document.querySelector(".starfield");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let stars = Array.from({ length: 60 }).map(() => ({
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * width,
    }));

    let baseSpeed = 3;

    let lastTime = 0;
    const animate = (time = 0) => {
      if (time - lastTime < 16) {
        requestAnimationFrame(animate);
        return;
      }
      lastTime = time;

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      const progressRatio = (currentIndex + 1) / questions.length;
      stars.forEach(star => {
        const speed = baseSpeed + progressRatio * 6; // faster near end
        star.z -= speed;
        if (star.z <= 0) {
          star.x = (Math.random() - 0.5) * width;
          star.y = (Math.random() - 0.5) * height;
          star.z = width;
        }

        const k = width / star.z;
        const sx = star.x * k + width / 2;
        const sy = star.y * k + height / 2;
        const size = (1 - star.z / width) * 3; // bigger stars when close

        // color shift based on depth
        const depth = 1 - star.z / width;

        let color;
        if (depth > 0.8) color = "#a78bfa"; // purple
        else if (depth > 0.6) color = "#60a5fa"; // blue
        else if (depth > 0.4) color = "#c084fc"; // light purple
        else color = "rgba(255,255,255,0.6)";

        ctx.fillStyle = color;

        ctx.fillRect(sx, sy, size, size);
      });

      requestAnimationFrame(animate);
    };

    animate();

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const isLastQuestion = useMemo(
    () => currentIndex >= questions.length - 1,
    [currentIndex, questions.length]
  );

  const handleAdvance = (selectedValue, updatePreferences) => {
    if (animating) return;
    setAnimating(true);

    onAnswerChange(question.id, selectedValue, updatePreferences);

    setTimeout(() => {
      setAnimating(false);
      if (isLastQuestion) {
        onComplete?.();
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 200);
  };

  if (!question) {
    return (
      <div className="quiz-empty">
        <p>No questions available.</p>
      </div>
    );
  }

  return (
    <div className="quiz-container fade-in">
      <div className="starfield-wrapper">
        <canvas className="starfield" />
      </div>
      <div className="quiz-header">

        <h1 className="quiz-title">🧠 Build Your Hero</h1>

        <div className="quiz-meta">
          <span>Question {currentIndex + 1} / {questions.length}</span>
          <span className="progress-percent">
            {Math.round(((currentIndex + 1) / questions.length) * 100)}%
          </span>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="progress-dots">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`dot ${i <= currentIndex ? "active" : ""}`}
            />
          ))}
        </div>

        <div className={`quiz-content ${animating ? "fade" : ""}`}>
          <div className="quiz-prompt-wrapper">
            <h2 className="quiz-prompt">
              {question.prompt}
            </h2>
          </div>
        </div>

      </div>

      <div className="quiz-nav">
        {currentIndex > 0 && (
          <button className="back-btn" onClick={goBack}>
            ← Back
          </button>
        )}
      </div>

      {question.type === "radio" && (
        <div className="quiz-options fade-slide">
          {question.options.map((opt) => (
            <button
              key={`${question.id}-${opt.value}`}
              type="button"
              className={`quiz-option ${answers[question.id] === opt.value ? "selected" : ""}`}
              onClick={() => handleAdvance(opt.value, opt.updatePreferences)}
            >
              <div className="option-inner">
                <div className="option-key">
                  {String.fromCharCode(65 + question.options.indexOf(opt))}
                </div>
                <span>{opt.label}</span>
              </div>
              <div className="option-glow" />
            </button>
          ))}
        </div>
      )}

      {!question.type && (
        <p>Unsupported question type: {question.type}</p>
      )}

      <div className="floating-deco">
        ✨ ⚡ 🧬
      </div>

      <div className="quiz-footer-hint">
        Tip: Click an option to continue or use ← to go back
      </div>
    </div>
  );
};

export default Quiz;
