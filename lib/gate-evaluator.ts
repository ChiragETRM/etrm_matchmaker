// Gate rule evaluation logic

type Operator = 'EQ' | 'GTE' | 'INCLUDES_ANY' | 'INCLUDES_ALL' | 'IN'

interface GateRule {
  questionKey: string
  operator: Operator
  valueJson: string
}

interface Answers {
  [key: string]: any
}

export function evaluateGates(
  rules: GateRule[],
  answers: Answers
): { passed: boolean; failedRules: string[] } {
  const failedRules: string[] = []

  for (const rule of rules) {
    const answer = answers[rule.questionKey]
    const expectedValue = JSON.parse(rule.valueJson)

    let passed = false

    switch (rule.operator) {
      case 'EQ':
        passed = answer === expectedValue
        break

      case 'GTE':
        passed = Number(answer) >= Number(expectedValue)
        break

      case 'INCLUDES_ANY':
        if (Array.isArray(answer) && Array.isArray(expectedValue)) {
          passed = expectedValue.some((val) => answer.includes(val))
        } else if (Array.isArray(answer)) {
          // If expectedValue is a single value, check if answer includes it
          passed = answer.includes(expectedValue)
        } else {
          passed = false
        }
        break

      case 'INCLUDES_ALL':
        if (Array.isArray(answer) && Array.isArray(expectedValue)) {
          passed = expectedValue.every((val) => answer.includes(val))
        } else {
          passed = false
        }
        break

      case 'IN':
        if (Array.isArray(expectedValue)) {
          passed = expectedValue.includes(answer)
        } else {
          passed = false
        }
        break

      default:
        passed = false
    }

    if (!passed) {
      failedRules.push(rule.questionKey)
    }
  }

  return {
    passed: failedRules.length === 0,
    failedRules,
  }
}