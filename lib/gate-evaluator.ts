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

export interface FailedRuleDetail {
  questionKey: string
  operator: Operator
  expectedValue: any
  actualValue: any
}

export function evaluateGates(
  rules: GateRule[],
  answers: Answers
): { passed: boolean; failedRules: string[]; failedRuleDetails: FailedRuleDetail[] } {
  const failedRules: string[] = []
  const failedRuleDetails: FailedRuleDetail[] = []

  for (const rule of rules) {
    const answer = answers[rule.questionKey]
    const expectedValue = JSON.parse(rule.valueJson)

    let passed = false

    switch (rule.operator) {
      case 'EQ':
        // Support multi-select: pass if user's selected values include the job's expected value
        if (Array.isArray(answer)) {
          passed = answer.includes(expectedValue)
        } else {
          passed = answer === expectedValue
        }
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
        // Support multi-select: pass if any of user's selected values is in the job's expected set
        if (Array.isArray(answer)) {
          passed = Array.isArray(expectedValue)
            ? expectedValue.some((val) => answer.includes(val))
            : answer.includes(expectedValue)
        } else if (Array.isArray(expectedValue)) {
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
      failedRuleDetails.push({
        questionKey: rule.questionKey,
        operator: rule.operator,
        expectedValue,
        actualValue: answer,
      })
    }
  }

  return {
    passed: failedRules.length === 0,
    failedRules,
    failedRuleDetails,
  }
}