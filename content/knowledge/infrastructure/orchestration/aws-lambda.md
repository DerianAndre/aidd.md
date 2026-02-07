---
name: AWS Lambda (Serverless)
category: infrastructure
last_updated: 2026-01-14
maturity: stable
---

# AWS Lambda (Serverless)

## Overview

Function-as-a-Service (FaaS) platform running code in response to events. Pay-per-execution pricing, auto-scaling, zero ops. Ideal for unpredictable traffic and event-driven workloads.

## Key Metrics

- **Cold Start:** 50-200ms (Node.js/Bun), 500ms+ (Java)
- **Pricing:** $0.20 per 1M requests + compute time
- **Scaling:** Automatic (0 to thousands of instances)
- **DX:** Serverless Framework, AWS SAM, CDK
- **Maturity:** 10+ years, production-grade (AWS flagship)

## Use Cases

| Scenario                           | Fit Score (1-10) | Rationale                                        |
| ---------------------------------- | ---------------- | ------------------------------------------------ |
| Unpredictable traffic (news sites) | 10               | Auto-scale from 0 to millions, pay-per-use       |
| Event-driven (S3 upload → process) | 10               | Native triggers (S3, DynamoDB, SQS)              |
| Prototype/MVP                      | 9                | Zero infrastructure management                   |
| Sustained high traffic (24/7)      | 4                | Kubernetes 70-80% cheaper at high sustained load |
| Long-running tasks (>15 min)       | 1                | Lambda max timeout 15 minutes                    |

## Trade-offs

### Strengths

- **Zero Ops:** No servers to manage, auto-scaling, auto-patching
- **Cost Efficiency (low traffic):** Pay only for execution time
- **Event Integration:** Native triggers (API Gateway, S3, DynamoDB, SQS)
- **Instant Scaling:** 0 → 1000 instances in seconds

### Weaknesses

- **Cold Start:** 50-200ms latency (critical for user-facing APIs)
- **Cost at Scale:** High sustained traffic = expensive vs Kubernetes
- **15-Minute Limit:** Not suitable for long batch jobs
- **Vendor Lock-in:** AWS-specific (though Serverless Framework helps)

## Cost Comparison

| Traffic                    | Lambda Cost | Kubernetes Cost     | Winner     |
| -------------------------- | ----------- | ------------------- | ---------- |
| 1M req/month (sporadic)    | $5-10       | $50-100 (always-on) | Lambda     |
| 100M req/month (sustained) | $500-1000   | $150-300            | Kubernetes |

## Implementation Pattern

```typescript
// handler.ts (Node.js/Bun)
export const handler = async (event: APIGatewayEvent) => {
  const user = await db.getUser(event.pathParameters.id);
  return {
    statusCode: 200,
    body: JSON.stringify(user)
  };
};

// serverless.yml
functions:
  getUser:
    handler: handler.getUser
    events:
      - httpApi:
          path: /users/{id}
          method: get
```

## Alternatives

| Alternative          | When to Choose Instead                                  |
| -------------------- | ------------------------------------------------------- |
| **Kubernetes**       | Sustained high traffic, need control, cost optimization |
| **Vercel/Netlify**   | Frontend-focused, need edge deployment                  |
| **Google Cloud Run** | Prefer containers over functions, need longer timeouts  |

## References

- [AWS Lambda Official Docs](https://docs.aws.amazon.com/lambda/)
- [Serverless vs Containers (2025)](https://innomizetech.com/blog/serverless-vs-containers-2025-aws-lambda-managed-instances-decision-guide)
- [Lambda Cold Starts](https://mikhail.io/serverless/coldstarts/aws/)
