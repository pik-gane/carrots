# Commitment Logic and Liability Calculation

## Overview

This document provides a detailed technical specification for the commitment logic and liability calculation algorithm used in the Carrots application.

## Theoretical Foundation

The liability calculation is based on the game-theoretic framework described in:
**"Game-theoretic approaches to conditional commitment"** (https://www.mdpi.com/2073-4336/16/6/58)

### Key Concepts

1. **Conditional Commitment**: A promise to perform an action, contingent on others meeting certain conditions
2. **Liability**: The actual obligation a person has after all commitments are evaluated
3. **Fixed-Point**: A stable state where no liabilities change when commitments are re-evaluated

## Commitment Structure

### Basic Format

Each commitment consists of two parts:

```typescript
{
  condition: {
    type: 'single_user' | 'aggregate',
    targetUserId?: string,  // For single_user type
    action: string,
    minAmount: number,
    unit: string
  },
  promise: {
    action: string,
    minAmount: number,
    unit: string
  }
}
```

### Commitment Types

#### 1. Single-User Condition

A commitment based on one specific person's action:

```
"If Alice does at least 5 hours of work, I will do at least 3 hours of work"
```

Structure:
```json
{
  "condition": {
    "type": "single_user",
    "targetUserId": "alice-id",
    "action": "work",
    "minAmount": 5,
    "unit": "hours"
  },
  "promise": {
    "action": "work",
    "minAmount": 3,
    "unit": "hours"
  }
}
```

#### 2. Aggregate Condition

A commitment based on combined actions of all others:

```
"If others collectively do at least 10 hours of work, I will do at least 5 hours of work"
```

Structure:
```json
{
  "condition": {
    "type": "aggregate",
    "action": "work",
    "minAmount": 10,
    "unit": "hours"
  },
  "promise": {
    "action": "work",
    "minAmount": 5,
    "unit": "hours"
  }
}
```

## Liability Calculation Algorithm

### Mathematical Foundation

For each user i and action a, the liability L_i(a) is defined as:

```
L_i(a) = max { c_i(a, C_j) | j ∈ active commitments, condition(C_j) is satisfied }
```

Where:
- `L_i(a)` = liability of user i for action a
- `c_i(a, C_j)` = promised amount from commitment C_j
- Condition satisfaction depends on current liabilities (creating interdependency)

### Fixed-Point Iteration

Since commitments can depend on other commitments, we use iterative calculation:

1. **Initialize**: Set all liabilities to 0
2. **Iterate**:
   - For each commitment C:
     - Evaluate condition based on current liabilities
     - If condition is met, update promise liability
   - Check for convergence
3. **Converge**: Stop when liabilities no longer change
4. **Result**: Return final liabilities

### Pseudocode

```
function calculateLiabilities(commitments, users):
    // Initialize
    L = {}
    for each user u in users:
        L[u] = {} // Empty action map
    
    // Extract all actions
    actions = extractAllActions(commitments)
    
    // Initialize all liabilities to 0
    for each user u in users:
        for each action a in actions:
            L[u][a] = 0
    
    // Fixed-point iteration
    iterations = 0
    maxIterations = 100
    
    do:
        L_prev = copy(L)
        
        for each commitment C in commitments:
            conditionMet = evaluateCondition(C.condition, L)
            
            if conditionMet:
                creator = C.creator
                action = C.promise.action
                amount = C.promise.minAmount
                
                // Take maximum (monotonic)
                L[creator][action] = max(L[creator][action], amount)
        
        iterations++
        
    while not converged(L, L_prev) and iterations < maxIterations
    
    if iterations >= maxIterations:
        throw Error("Did not converge")
    
    return L
```

### Condition Evaluation

#### Single-User Condition

```
function evaluateSingleUserCondition(condition, L):
    targetUser = condition.targetUserId
    action = condition.action
    minAmount = condition.minAmount
    
    currentLiability = L[targetUser][action] || 0
    
    return currentLiability >= minAmount
```

#### Aggregate Condition

```
function evaluateAggregateCondition(condition, L):
    action = condition.action
    minAmount = condition.minAmount
    
    totalLiability = 0
    for each user u in L:
        totalLiability += L[u][action] || 0
    
    return totalLiability >= minAmount
```

## Examples

### Example 1: Simple Chain

**Scenario:**
- Alice: "If Bob does 5 hours, I'll do 3 hours"
- Bob: "I'll do 5 hours unconditionally" (via external commitment or baseline)

**Calculation:**
1. Initial: Alice = 0, Bob = 0
2. Iteration 1:
   - Bob's condition met (unconditional): Bob = 5
3. Iteration 2:
   - Alice's condition met (Bob >= 5): Alice = 3
   - Bob still 5
4. Converged!

**Result:** Alice = 3 hours, Bob = 5 hours

### Example 2: Circular Dependency

**Scenario:**
- Alice: "If Bob does 3 hours, I'll do 3 hours"
- Bob: "If Alice does 3 hours, I'll do 3 hours"

**Calculation:**
1. Initial: Alice = 0, Bob = 0
2. Iteration 1:
   - Alice's condition not met (Bob = 0)
   - Bob's condition not met (Alice = 0)
3. Converged at zero

**Result:** Alice = 0 hours, Bob = 0 hours

### Example 3: Mutual Support

**Scenario:**
- Alice: "If others do 2 hours total, I'll do 5 hours"
- Bob: "If others do 2 hours total, I'll do 3 hours"
- Charlie: "If others do 2 hours total, I'll do 2 hours"

**Calculation:**
1. Initial: All = 0
2. Iteration 1:
   - No conditions met (total = 0)
3. Converged at zero

**Alternative Scenario** - Add Bob's unconditional 1 hour:
1. Initial: Alice = 0, Bob = 1, Charlie = 0
2. Iteration 1:
   - Total others for Alice = 1 (not enough)
   - Total others for Bob = 0 (not enough)
   - Total others for Charlie = 1 (not enough)
3. Converged at: Alice = 0, Bob = 1, Charlie = 0

### Example 4: Bootstrap Scenario

**Scenario:**
- Alice: "If Bob does 2 hours, I'll do 5 hours"
- Bob: "If others do 3 hours, I'll do 2 hours"
- Charlie: "I'll do 3 hours" (unconditional)

**Calculation:**
1. Initial: Alice = 0, Bob = 0, Charlie = 3
2. Iteration 1:
   - Bob's condition met (others = 3): Bob = 2
3. Iteration 2:
   - Alice's condition met (Bob = 2): Alice = 5
   - Bob still = 2
4. Converged!

**Result:** Alice = 5, Bob = 2, Charlie = 3

## Edge Cases

### 1. No Commitments
- **Result**: All liabilities are 0

### 2. No Active Commitments
- **Result**: All liabilities are 0

### 3. Non-Converging Commitments
- **Detection**: After MAX_ITERATIONS without convergence
- **Handling**: Throw error, log warning
- **Prevention**: Set reasonable MAX_ITERATIONS (e.g., 100)

### 4. Multiple Commitments for Same Action
- **Handling**: Take maximum (monotonic operator)
- **Tracking**: Record all effective commitment IDs

### 5. Different Units
- **Current**: No unit conversion
- **Assumption**: Same action should use consistent units
- **Future**: Add unit validation or conversion

## Convergence Properties

### Monotonicity

The algorithm is monotonic - liabilities never decrease:
```
L[i][a] = max(L[i][a], promised_amount)
```

This ensures convergence in finite iterations.

### Convergence Threshold

We use a small threshold (0.001) to detect convergence:
```
|L_new - L_old| < threshold
```

### Guaranteed Convergence

The algorithm is guaranteed to converge because:
1. Liabilities are bounded (finite number of commitments)
2. Updates are monotonic (only increase)
3. Maximum operator ensures stability

## Performance Considerations

### Complexity

- **Time**: O(n * m * k)
  - n = number of iterations (typically < 10)
  - m = number of commitments
  - k = number of users
- **Space**: O(u * a)
  - u = number of users
  - a = number of unique actions

### Optimization Strategies

1. **Early Termination**: Stop when no changes occur
2. **Caching**: Store intermediate results
3. **Indexing**: Index commitments by condition type
4. **Lazy Evaluation**: Only recalculate affected liabilities

## Testing Strategy

### Unit Tests

- Test individual condition evaluation
- Test liability update logic
- Test convergence detection
- Test edge cases

### Integration Tests

- Test with real commitment data
- Test various commitment patterns
- Test convergence scenarios
- Test performance with large datasets

### Property-Based Tests

- Test monotonicity property
- Test convergence property
- Test idempotency (running twice gives same result)

## Future Enhancements

1. **Weighted Commitments**: Different priorities or weights
2. **Time-Based Conditions**: Deadlines and time windows
3. **Partial Fulfillment**: Track actual vs. liability
4. **Nested Conditions**: More complex logical expressions
5. **Probabilistic Commitments**: Uncertainty in conditions

## References

- Original paper: https://www.mdpi.com/2073-4336/16/6/58
- Fixed-point theory: https://en.wikipedia.org/wiki/Fixed-point_theorem
- Game theory basics: https://plato.stanford.edu/entries/game-theory/
