export type Operator = "add" | "sub" | "mul" | "div";

export interface Problem {
  operator: Operator;
  operandA: number;
  operandB: number;
  answer: number;
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function generateAdd(level: number, rng: () => number): Problem {
  let operandA: number;
  let operandB: number;
  switch (level) {
    case 1:
      operandA = randomInt(1, 9, rng);
      operandB = randomInt(1, 9, rng);
      break;
    case 2:
      operandA = randomInt(10, 99, rng);
      operandB = randomInt(1, 9, rng);
      break;
    case 3:
      operandA = randomInt(10, 99, rng);
      operandB = randomInt(10, 99, rng);
      break;
    default:
      throw new Error(`Unsupported level for add: ${level}`);
  }
  return { operator: "add", operandA, operandB, answer: operandA + operandB };
}

function generateSub(level: number, rng: () => number): Problem {
  let operandA: number;
  let operandB: number;
  switch (level) {
    case 1:
      operandA = randomInt(1, 9, rng);
      operandB = randomInt(0, operandA, rng);
      break;
    case 2:
      operandA = randomInt(10, 99, rng);
      operandB = randomInt(0, 9, rng);
      break;
    case 3:
      operandA = randomInt(10, 99, rng);
      operandB = randomInt(10, operandA, rng);
      break;
    default:
      throw new Error(`Unsupported level for sub: ${level}`);
  }
  return { operator: "sub", operandA, operandB, answer: operandA - operandB };
}

function generateMul(level: number, rng: () => number): Problem {
  let operandA: number;
  let operandB: number;
  switch (level) {
    case 1:
      operandA = randomInt(1, 9, rng);
      operandB = randomInt(1, 9, rng);
      break;
    case 2:
      operandA = randomInt(10, 99, rng);
      operandB = randomInt(1, 9, rng);
      break;
    case 3:
      operandA = randomInt(10, 20, rng);
      operandB = randomInt(10, 20, rng);
      break;
    default:
      throw new Error(`Unsupported level for mul: ${level}`);
  }
  return { operator: "mul", operandA, operandB, answer: operandA * operandB };
}

function generateDiv(level: number, rng: () => number): Problem {
  let divisor: number;
  let quotient: number;
  switch (level) {
    case 1:
      divisor = randomInt(1, 9, rng);
      quotient = randomInt(1, 9, rng);
      break;
    case 2:
      divisor = randomInt(1, 9, rng);
      quotient = randomInt(10, 20, rng);
      break;
    case 3:
      divisor = randomInt(2, 12, rng);
      quotient = randomInt(10, 20, rng);
      break;
    default:
      throw new Error(`Unsupported level for div: ${level}`);
  }
  const dividend = divisor * quotient;
  return { operator: "div", operandA: dividend, operandB: divisor, answer: quotient };
}

export function generateProblem(
  operator: Operator,
  level: number,
  rng: () => number = Math.random
): Problem {
  switch (operator) {
    case "add":
      return generateAdd(level, rng);
    case "sub":
      return generateSub(level, rng);
    case "mul":
      return generateMul(level, rng);
    case "div":
      return generateDiv(level, rng);
    default:
      throw new Error(`Unsupported operator: ${operator satisfies never}`);
  }
}

export function generateStageProblems(
  operator: Operator,
  level: number,
  count: number = 20,
  rng: () => number = Math.random
): Problem[] {
  return Array.from({ length: count }, () => generateProblem(operator, level, rng));
}
