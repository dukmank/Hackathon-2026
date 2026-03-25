import * as React from "react"
import { useState, useEffect } from "react"
import { parseCSVtoJSON } from "../utils/csvParser.js"
import scoreCharacter from "../utils/matching.js"
import "../styles/index.css"
import HeroCard from "../components/HeroCard"

import questions from "../constants/questions.js"
import defaultCharacterPreferences from "../constants/defaultCharacterPreferences.js"
import Quiz from "../components/Quiz.js"
import Navbar from "../components/Navbar.js"

const IndexPage = () => {
  const [heroes, setHeroes] = useState([])
  const [filteredHeroes, setFilteredHeroes] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [loadingText, setLoadingText] = useState("Analyzing your personality...")
  const [userPreferences, setUserPreferences] = useState(defaultCharacterPreferences)
  const [saved, setSaved] = useState(false)
  const [savedHeroes, setSavedHeroes] = useState([])
  const [selectedHero, setSelectedHero] = useState(null)
  const [funFact, setFunFact] = useState("")

  useEffect(() => {
    parseCSVtoJSON()
      .then(data => setHeroes(data))
      .catch(err => console.error("Error loading CSV:", err))
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("savedHeroes")
      if (raw) {
        setSavedHeroes(JSON.parse(raw))
      }
    } catch (err) {
      console.error("Error loading saved heroes:", err)
    }
  }, [])

  useEffect(() => {
    if (submitted) {
      setFunFact(getFunFact())
    }
  }, [submitted])

  useEffect(() => {
    if (!loading) return

    const steps = [
      "Analyzing your personality...",
      "Matching your preferences...",
      "Finding your hero..."
    ]

    let i = 0
    const interval = setInterval(() => {
      i++
      if (i < steps.length) setLoadingText(steps[i])
    }, 500)

    return () => clearInterval(interval)
  }, [loading])

  const [answers, setAnswers] = useState({})

  const handleAnswerChange = (questionId, value, updatePreferences = {}) => {
    const previousSelection = answers[questionId]
    const isDeselect = previousSelection === value

    setAnswers(prev => {
      const next = { ...prev }
      if (isDeselect) delete next[questionId]
      else next[questionId] = value
      return next
    })

    setUserPreferences(prev => {
      const nextBool = { ...(prev.boolPreferences ?? {}) }
      const nextStat = { ...(prev.statPreferences ?? {}) }

      const apply = (prefs, dir = 1) => {
        if (!prefs) return

        if (prefs.boolPreferences) {
          for (const [k, v] of Object.entries(prefs.boolPreferences)) {
            if (dir === 1) nextBool[k] = v
            else delete nextBool[k]
          }
        }

        if (prefs.statPreferences) {
          for (const [k, v] of Object.entries(prefs.statPreferences)) {
            const val = (nextStat[k] ?? 0) + dir * Number(v)
            nextStat[k] = Math.max(-10, Math.min(10, val))
          }
        }
      }

      const prevQ = questions.find(q => q.id === questionId)
      const prevOpt = prevQ?.options?.find(o => o.value === previousSelection)

      if (isDeselect && prevOpt?.updatePreferences) {
        apply(prevOpt.updatePreferences, -1)
      } else {
        if (prevOpt?.updatePreferences) apply(prevOpt.updatePreferences, -1)
        apply(updatePreferences, 1)
      }

      return {
        ...prev,
        boolPreferences: nextBool,
        statPreferences: nextStat,
      }
    })
  }

  const runScoring = () => {
    let pool = [...heroes]
    const { isVillain } = userPreferences.boolPreferences ?? {}

    const scored = pool
      .filter(h => {
        if (isVillain === true) return h.isVillain === true
        if (isVillain === false) return h.isVillain === false
        return true
      })
      .map(h => ({
        ...h,
        score: scoreCharacter(h, userPreferences),
      }))
      .sort((a, b) => b.score - a.score)

    setFilteredHeroes(scored)
    setSubmitted(true)
  }

  const handleQuizComplete = () => {
    setLoading(true)
    setTimeout(() => {
      runScoring()
      setLoading(false)
      setTimeout(() => setRevealed(true), 300)
    }, 1200)
  }

  const resetQuiz = () => {
    setAnswers({})
    setUserPreferences(defaultCharacterPreferences)
    setFilteredHeroes([])
    setSubmitted(false)
    setRevealed(false)
    setSaved(false)
    setSelectedHero(null)
  }

  const getTopHeroes = () => filteredHeroes.slice(0, 3)

  const getPersonalityType = () => {
    const stats = userPreferences.statPreferences || {}

    if (stats.intelligence > 4) return "🧠 Strategic Genius"
    if (stats.strength > 4) return "💪 Power Fighter"
    if (stats.speed > 4) return "⚡ Speedster"
    if (stats.magic > 4) return "✨ Mystic User"
    return "⚖️ Balanced Hero"
  }

  const getExplanation = (hero) => {
    const prefs = userPreferences.statPreferences || {}

    let reasons = []

    if (prefs.speed > 3) reasons.push("high speed")
    if (prefs.strength > 3) reasons.push("strong power")
    if (prefs.intelligence > 3) reasons.push("high intelligence")
    if (prefs.magic > 3) reasons.push("magical ability")

    if (reasons.length === 0) {
      return "This hero is a well-balanced match for your personality."
    }
    return `Because you value ${reasons.join(", ")}, this hero fits you well.`
  }

  const getNegativeExplanation = (hero) => {
    const prefs = userPreferences.statPreferences || {}
    let reasons = []

    if (prefs.intelligence > 3 && hero.intelligence < 4) {
      reasons.push("you value intelligence but this character lacks strategy")
    }
    if (prefs.strength < 0 && hero.strength > 7) {
      reasons.push("you avoid aggression but this character is highly aggressive")
    }
    if (prefs.magic < 0 && hero.magic > 7) {
      reasons.push("you dislike mystical abilities")
    }
    if (hero.evilness > 7) {
      reasons.push("this character is extremely evil")
    }

    if (reasons.length === 0) {
      return "This character does not align with your personality."
    }
    return reasons.join(", ")
  }

  const getHeroTitle = (hero) => {
    if (hero.speed > 7) return "⚡ Speedster"
    if (hero.strength > 7) return "💪 Power Fighter"
    if (hero.intelligence > 7) return "🧠 Mastermind"
    if (hero.magic > 7) return "✨ Mystic User"
    return "⚖️ Balanced Hero"
  }


  const getFunFact = () => {
    const facts = [
      "🔥 Your personality is more unique than 92% of users!",
      "🧬 You belong to a rare hero profile (top 8%)!",
      "⚡ Only a small fraction of players get this match!",
      "🎯 Your traits align with a high-tier hero type!",
      "🧠 You show uncommon decision patterns compared to others!"
    ]
    return facts[Math.floor(Math.random() * facts.length)]
  }
  const getMatchPercent = (score) => Math.min(100, Math.round(score / 10))

  const getConfidenceLevel = (score) => {
    const percent = getMatchPercent(score)
    if (percent >= 85) return "HIGH"
    if (percent >= 65) return "MEDIUM"
    return "LOW"
  }

  const getPreferenceBreakdown = () => {
    const stats = userPreferences.statPreferences || {}
    return [
      { key: "speed", label: "Speed", value: Math.max(0, stats.speed || 0) },
      { key: "strength", label: "Strength", value: Math.max(0, stats.strength || 0) },
      { key: "intelligence", label: "Intelligence", value: Math.max(0, stats.intelligence || 0) },
      { key: "magic", label: "Magic", value: Math.max(0, stats.magic || 0) },
    ]
  }

  const saveHeroToCollection = (hero) => {
    const next = [hero, ...savedHeroes.filter(h => h.name !== hero.name)].slice(0, 8)
    setSavedHeroes(next)
    localStorage.setItem("savedHeroes", JSON.stringify(next))
    setSaved(true)
    alert("✅ Hero saved successfully!")
  }

  const removeSavedHero = (heroName) => {
    const next = savedHeroes.filter(h => h.name !== heroName)
    setSavedHeroes(next)
    localStorage.setItem("savedHeroes", JSON.stringify(next))
  }

  const surpriseMe = () => {
    if (!heroes.length) return
    const randomHero = heroes[Math.floor(Math.random() * heroes.length)]
    const pool = [...heroes]
      .map(h => ({ ...h, score: h.name === randomHero.name ? 999 : scoreCharacter(h, userPreferences) }))
      .sort((a, b) => b.score - a.score)
    setFilteredHeroes(pool)
    setSubmitted(true)
    setLoading(false)
    setRevealed(true)
    setSelectedHero(randomHero)
  }

  const topHeroes = filteredHeroes?.length ? getTopHeroes() : []
  const bestHero = topHeroes?.[0]
  const leastPerfectHero = filteredHeroes?.length
    ? filteredHeroes[filteredHeroes.length - 1]
    : null

  return (
    <div className="container">
      <main className="page">
        <Navbar />

        {!submitted && (
          <Quiz
            questions={questions}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onComplete={handleQuizComplete}
          />
        )}

        {loading && <div className="loading">🤖 {loadingText}</div>}

        {submitted && filteredHeroes.length > 0 && (
          <section className="results">
            <div className={`personality ${revealed ? "fade-in" : "hidden"}`}>
              Your Type: {getPersonalityType()}
            </div>

            <div className={`fun-fact ${revealed ? "fade-in" : "hidden"}`}>
              {funFact}
            </div>

            {bestHero && (
              <div className={`best-match ${revealed ? "fade-in" : "hidden"}`}>
                <h3>🏆 Your Perfect Match</h3>

                <HeroCard hero={{ ...bestHero, explanation: getExplanation(bestHero) }} highlight />

                <div className="positive-explain">
                  <p>{getExplanation(bestHero)}</p>

                  <div className="hero-actions-row">
                    <button
                      className="save-btn"
                      onClick={() => {
                        saveHeroToCollection(bestHero)
                      }}
                    >
                      {saved ? "✅ Saved" : "💾 Save Hero"}
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={() => setSelectedHero(bestHero)}
                    >
                      🔍 View Profile
                    </button>

                    <button
                      className="secondary-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `I got ${bestHero.name} (${getHeroTitle(bestHero)}) in Superhero Matchmaker!`
                        )
                        alert("📤 Result copied to clipboard!")
                      }}
                    >
                      📤 Share Result
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={`top-heroes ${revealed ? "reveal" : "hidden"}`}>
              {topHeroes.slice(1).map((hero, index) => (
                <div key={index} className="hero-wrapper">
                  <div className="hero-extra">
                    <div className="hero-title">{getHeroTitle(hero)}</div>
                    <div className="match-percent">🔥 {getMatchPercent(hero.score)}% Match</div>
                    <div className={`confidence-badge ${getConfidenceLevel(hero.score).toLowerCase()}`}>
                      {getConfidenceLevel(hero.score)} confidence
                    </div>
                  </div>

                  <HeroCard
                    hero={{ ...hero, explanation: getExplanation(hero) }}
                    title={`#${index + 2} Match`}
                  />
                  <div className="mini-actions">
                    <button className="secondary-btn" onClick={() => setSelectedHero(hero)}>
                      🔍 View
                    </button>
                    <button className="secondary-btn" onClick={() => saveHeroToCollection(hero)}>
                      💾 Save
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {topHeroes.length === 3 && (
              <div className={`compare-section ${revealed ? "fade-in" : "hidden"}`}>
                <h3>📊 Compare Heroes</h3>

                <div className="compare-header-row">
                  <span className="compare-label"></span>
                  {topHeroes.map((hero, i) => (
                    <span key={i} className="compare-header-name">
                      {hero.name}
                    </span>
                  ))}
                </div>

                {["speed","strength","intelligence","magic","defense","evilness"].map(stat => {
                  const max = Math.max(...topHeroes.map(h => h[stat] || 0)) || 1

                  return (
                    <div key={stat} className="compare-row">
                      <span className="compare-label">
                        {stat.charAt(0).toUpperCase() + stat.slice(1)}
                      </span>

                      <div className="compare-bars">
                        {topHeroes.map((hero, i) => {
                          const value = hero[stat] || 0
                          const percent = (value / max) * 100
                          const colors = ["#22c55e","#3b82f6","#f59e0b"]

                          return (
                            <div key={i} className="compare-col">
                              <div className="compare-bar">
                                <div
                                  className="compare-fill"
                                  style={{
                                    width: revealed ? `${percent}%` : "0%",
                                    minWidth: "4px",
                                    height: "100%",
                                    background: `linear-gradient(90deg, ${colors[i]}, ${colors[i]}aa)`
                                  }}
                                />
                              </div>
                              <div className="compare-text">
                                {hero.name} ({value})
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className={`profile-breakdown ${revealed ? "fade-in" : "hidden"}`}>
              <h3>🧬 Your Personality Breakdown</h3>
              <div className="profile-stats-grid">
                {getPreferenceBreakdown().map(stat => (
                  <div key={stat.key} className="profile-stat-card">
                    <div className="profile-stat-top">
                      <span>{stat.label}</span>
                      <strong>{stat.value}/10</strong>
                    </div>
                    <div className="profile-stat-bar">
                      <div
                        className="profile-stat-fill"
                        style={{ width: `${Math.min(100, stat.value * 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {leastPerfectHero && (
              <div className={`worst-match ${revealed ? "fade-in" : "hidden"}`}>
                <h3>⚠️ Your Worst Match</h3>

                <HeroCard hero={leastPerfectHero} />

                <div className="negative-explain">
                  ❌ Why this hero is NOT for you:
                  <p>{getNegativeExplanation(leastPerfectHero)}</p>
                </div>
              </div>
            )}

            <div className={`saved-collection ${revealed ? "fade-in" : "hidden"}`}>
              <h3>📚 My Heroes Collection</h3>
              {savedHeroes.length === 0 ? (
                <p className="saved-empty">No saved heroes yet. Save your favorites to build a collection.</p>
              ) : (
                <div className="saved-grid">
                  {savedHeroes.map(hero => (
                    <div key={hero.name} className="saved-card">
                      <div className="saved-card-head">
                        <strong>{hero.name}</strong>
                        <button className="remove-btn" onClick={() => removeSavedHero(hero.name)}>
                          ✕
                        </button>
                      </div>
                      <div className="saved-card-meta">{getHeroTitle(hero)}</div>
                      <div className="saved-card-actions">
                        <button className="secondary-btn" onClick={() => setSelectedHero(hero)}>
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="actions">
              <button className="secondary-btn" onClick={surpriseMe}>
                🎲 Surprise Me
              </button>
              <button className="primary-btn" onClick={resetQuiz}>
                🔄 Try Again
              </button>
            </div>
          </section>
        )}

        {selectedHero && (
          <div className="hero-modal-overlay" onClick={() => setSelectedHero(null)}>
            <div className="hero-modal" onClick={(e) => e.stopPropagation()}>
              <div className="hero-modal-head">
                <h3>🔍 Hero Profile</h3>
                <button className="remove-btn" onClick={() => setSelectedHero(null)}>
                  ✕
                </button>
              </div>

              <HeroCard
                hero={{
                  ...selectedHero,
                  explanation: getExplanation(selectedHero),
                }}
                highlight={selectedHero.name === bestHero?.name}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default IndexPage
export const Head = () => <title>Superhero Search Engine</title>