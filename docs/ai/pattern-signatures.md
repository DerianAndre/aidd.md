# Pattern Detection System

## Built-in Signatures (12)

| # | Pattern | Cat |
|---|---------|-----|
| 1 | `\blet me\b` | filler |
| 2 | `\bcertainly\b` | filler |
| 3 | `\bI'd be happy to\b` | filler |
| 4 | `\babsolutely\b` | filler |
| 5 | `\bgreat question\b` | filler |
| 6 | `\bit's worth noting\b` | hedge |
| 7 | `\bI should mention\b` | hedge |
| 8 | `\bas an AI\b` | hedge |
| 9 | `\bin order to\b` | verbosity |
| 10 | `\bit is important to note\b` | verbosity |
| 11 | `\blet's dive into\b` | verbosity |
| 12 | `Firstly.*Secondly.*(?:Finally\|Thirdly)` | structure |

All `/gi`. DB `banned_patterns` extends at runtime.

## Fingerprint (7 metrics)
avgSentenceLength, sentenceLengthVariance, typeTokenRatio, avgParagraphLength, passiveVoiceRatio, fillerDensity, questionFrequency

## Audit Score (5x20=100)

| Dim | Calc |
|-----|------|
| lexicalDiversity | min(20, TTR*40) |
| structuralVariation | max(0, 20-\|variance-30\|*0.3) |
| voiceAuthenticity | 20-passivePen-fillerPen |
| patternAbsence | 20-min(20, matches*3) |
| semanticPreservation | 15 (default) |

Verdict: >=70 pass | >=40 retry | <40 escalate

## False Positive Protocol
Report→useCount*=0.85→auto-deactivate at useCount<2 (learned only)
