# Project Progress

## 2026-06-10 Round 1: irregular packing test timeout

### Scope

- Focus only on the timeout risk around `src/algorithms/irregularPacking.test.ts`.
- Do not add new box types.
- Do not refactor the UI.
- Do not remove core tests.
- Do not skip irregular packing logic just to make tests pass.

### Investigation

- The irregular packing entry point is `packDielineOnPaper`.
- The algorithm generates candidate placement points, then checks each candidate against already placed shapes.
- Very large paper sizes or very high requested piece counts can expand the candidate search space and make tests slow.
- The current implementation bounds that search with:
  - `maxRuntimeMs`
  - `maxCandidates`
  - `maxAttempts`
  - `maxPieces`
- When a boundary is reached, the packer returns a specific `reason`, such as `timeout`, `candidate-limit`, `attempt-limit`, or `max-pieces`.
- This keeps the irregular packing path active while preventing unbounded search.

### Work Done

- Kept the existing irregular packing tests intact.
- Verified that the bounded search behavior prevents the large-paper case from expanding without limit.
- Added this progress file with the investigation result, verification commands, and known limits.

### Verification

- `npm.cmd test -- src/algorithms/irregularPacking.test.ts`
  - Passed: 1 test file, 5 tests.
- `npm.cmd test -- src/algorithms/layout.test.ts src/algorithms/dielines.test.ts src/utils/validation.test.ts src/algorithms/irregularPacking.test.ts`
  - Passed: 4 test files, 16 tests.
- `npm.cmd run build`
  - Passed: `tsc -b && vite build`.
- `npm.cmd test`
  - Passed: 4 test files, 16 tests.

### Current Limits

- Irregular packing is still a bounded scan algorithm and does not guarantee a global optimum.
- Large paper cases stop when candidates, attempts, runtime, or max placed pieces reach the configured boundary.
- The stop `reason` is returned from the algorithm, but the current UI primarily displays the layout result and does not fully expose all diagnostic reasons.
- This round did not add box types or change the UI.
