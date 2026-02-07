# Performance: Evidence-Based Profiling and Optimization

> **Activation:** When investigating performance issues, optimizing code, or establishing performance budgets

---

## Core Principle

Profile first, then optimize. Never optimize what you have not measured. Every optimization must be justified by profiling data, measured independently, and verified against baseline metrics.

---

## Preconditions

- [ ] Performance issue identified (user report, monitoring alert, or proactive review)
- [ ] Baseline metrics captured before any changes
- [ ] Reproducible test scenario established (consistent load, data, environment)
- [ ] Performance budget defined (target metrics with acceptable thresholds)

---

## Process

### Step 1 -- Profile and Measure Baseline

Capture current performance before touching any code:

- **Frontend**: Lighthouse scores, Web Vitals (LCP, FID, CLS), bundle size, render counts
- **Backend**: Response times (p50, p95, p99), throughput, database query times, memory usage
- **System**: CPU utilization, memory consumption, I/O wait, network latency
- Record the environment, data set, and load conditions for reproducibility

### Step 2 -- Identify Bottlenecks

Use data, not intuition:

**Frontend Analysis:**

- Web Vitals targets: LCP <= 2.5s, FID <= 100ms, CLS <= 0.1
- Bundle analysis: tree-shaking effectiveness, code splitting opportunities, lazy loading candidates
- React re-render analysis: React DevTools Profiler, identify unnecessary renders
- Image optimization: format (WebP/AVIF), responsive sizes, lazy loading
- Font loading: `font-display: swap`, preload critical fonts
- Critical rendering path: inline critical CSS, defer non-critical JS

**Backend Analysis:**

- Database: EXPLAIN ANALYZE on slow queries, index coverage, N+1 query detection
- Caching: identify cacheable responses, cache hit/miss ratios
- Connection pooling: database and HTTP client pool saturation
- Async operations: event loop blocking, CPU-intensive synchronous work
- Memory: heap snapshots, garbage collection frequency, leak detection

**Measurement Tools:**

| Domain | Tools |
|--------|-------|
| Frontend | Lighthouse, React DevTools Profiler, browser DevTools Performance tab |
| Backend (Node.js) | `--prof` flag, clinic.js, 0x flame graphs |
| Database | EXPLAIN ANALYZE, slow query log, `pg_stat_statements` |

### Step 3 -- Optimize One Change at a Time

For each identified bottleneck:

1. Document the specific bottleneck and its measured impact
2. Implement a single, targeted optimization
3. Measure the impact of that single change in isolation
4. Record: what changed, why, before metric, after metric, improvement percentage
5. Commit the change only if the improvement is confirmed

### Step 4 -- Verify and Regression Check

After all optimizations:

- Re-run the full baseline measurement suite
- Compare before/after for every metric (not just the targeted ones)
- Confirm no regressions in functionality (run test suite)
- Confirm no regressions in other performance metrics

### Step 5 -- Document Results

Produce a performance report:

**Summary (BLUF):** Overall improvement in 2-3 sentences. Key numbers: before and after for the primary metric.

**Optimization Log:**

| Optimization | Bottleneck | Before | After | Improvement | Commit |
|-------------|------------|--------|-------|-------------|--------|
| Description | What was slow | Metric | Metric | Percentage | Hash |

**Remaining Opportunities:** Bottlenecks identified but not addressed, with estimated impact and effort.

---

## Quality Gates

- [ ] Baseline metrics captured and recorded before any optimization
- [ ] Each optimization measured independently (not batched)
- [ ] No regression in other performance metrics after optimization
- [ ] No regression in functionality (test suite passes)
- [ ] Before/after metrics documented for every change
- [ ] Remaining opportunities cataloged for future work

---

## Anti-Patterns

| Anti-Pattern | Mitigation |
|-------------|------------|
| **Premature Optimization** | Always profile first. Optimize only what the data shows is slow. |
| **Optimizing Without Measuring** | Every optimization must have a baseline metric and a post-change measurement. |
| **Breaking Functionality for Speed** | Run the full test suite after every optimization. Performance is not worth bugs. |
| **Micro-Optimizing Non-Bottlenecks** | Focus on the critical path. A 50% improvement on a 1ms operation saves 0.5ms. |
| **Caching Without Invalidation** | Every cache must define: what triggers invalidation, TTL, and stale data tolerance. |
| **Batching All Changes** | One change at a time. Batching makes it impossible to know which change helped. |

---

**Cross-references:** [rules/frontend.md](frontend.md) (frontend performance), [rules/backend.md](backend.md) (backend performance, caching), [rules/testing.md](testing.md) (regression testing)

**Version:** 1.0.0
**Last Updated:** 2026-02-06
**Applies To:** All projects with performance requirements
