---
name: Serverless Framework
category: infrastructure
last_updated: 2026-01-14
maturity: stable
---

# Serverless Framework

## Overview

Multi-cloud Infrastructure-as-Code framework for deploying serverless applications. Supports AWS Lambda, Azure Functions, Google Cloud Functions. YAML-based configuration with plugins ecosystem.

## Key Metrics

- **Multi-Cloud:** Deploy same code to AWS, Azure, GCP, Cloudflare
- **DX:** YAML config, CLI, local invoke, extensive plugins
- **Deployment Speed:** ~30s for Lambda (vs SAM ~60s)
- **Maturity:** 10+ years, production-grade, massive adoption
- **Cost:** Free (framework), pay cloud provider costs

## Use Cases

| Scenario                           | Fit Score (1-10) | Rationale                                                        |
| ---------------------------------- | ---------------- | ---------------------------------------------------------------- |
| Multi-cloud deployments            | 10               | Single config deploys to AWS/Azure/GCP                           |
| AWS Lambda projects                | 9                | Simplified deployment vs raw CloudFormation                      |
| Microservices architecture         | 9                | Each function = independent service                              |
| Complex infrastructure (VPCs, RDS) | 6                | Use Terraform/CDK for full infra (Serverless for functions only) |
| Monolithic apps                    | 3                | Serverless optimized for functions, not monoliths                |

## Trade-offs

### Strengths

- **Multi-Cloud:** Avoid vendor lock-in (same config for AWS/Azure/GCP)
- **Simplicity:** YAML config vs CloudFormation/Terraform complexity
- **Plugin Ecosystem:** 1000+ plugins (offline mode, warmup, bundlers)
- **Local Development:** `serverless invoke local` for testing

### Weaknesses

- **Limited Scope:** Functions-focused (use Terraform for full infrastructure)
- **CloudFormation Under Hood:** AWS deployments slow (30s+ for simple changes)
- **YAML Configuration:** Can become verbose for large projects
- **Cold Start Management:** No built-in solution (use plugins)

## Implementation Pattern

```yaml
# serverless.yml
service: my-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    DATABASE_URL: ${env:DATABASE_URL}

functions:
  getUser:
    handler: src/handlers/user.getUser
    events:
      - httpApi:
          path: /users/{id}
          method: get

  createUser:
    handler: src/handlers/user.createUser
    events:
      - httpApi:
          path: /users
          method: post

plugins:
  - serverless-offline # Local development
  - serverless-bundle   # Webpack bundling
  - serverless-dotenv-plugin

# Multi-cloud example
provider:
  name: azure # Just change provider
  runtime: nodejs20
  region: eastus
```

## Deployment

```bash
# Install
npm install -g serverless

# Deploy to AWS
serverless deploy --stage prod

# Invoke function locally
serverless invoke local --function getUser --data '{"id": "123"}'

# View logs
serverless logs --function getUser --tail

# Remove all resources
serverless remove
```

## Multi-Cloud Example

```yaml
# Same function, different clouds
# AWS
provider:
  name: aws
  runtime: nodejs20.x

# Azure (change provider only)
provider:
  name: azure
  runtime: nodejs20

# GCP (change provider only)
provider:
  name: google
  runtime: nodejs20
```

## Alternatives

| Alternative   | When to Choose Instead                                   |
| ------------- | -------------------------------------------------------- |
| **AWS SAM**   | AWS-only, prefer native AWS tooling                      |
| **AWS CDK**   | Need full infrastructure (VPCs, RDS, etc.) in TypeScript |
| **Terraform** | Multi-cloud full infrastructure (not just functions)     |
| **Vercel**    | Frontend-focused, Next.js deployments                    |

## References

- [Serverless Framework Official Docs](https://www.serverless.com/framework/docs)
- [Multi-Cloud Serverless Deployment](https://www.serverless.com/blog/serverless-framework-multi-cloud)
- [Serverless vs SAM vs CDK](https://aws.amazon.com/blogs/compute/comparing-aws-sam-vs-serverless-framework-vs-aws-cdk/)
