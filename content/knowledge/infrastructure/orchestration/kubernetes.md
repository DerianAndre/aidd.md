---
name: Kubernetes
category: infrastructure
last_updated: 2026-01-14
maturity: stable
---

# Kubernetes

## Overview

Container orchestration platform for deploying, scaling, and managing containerized applications. Industry standard for production workloads but complex—overkill for most startups.

## Key Metrics

- **Scalability:** Handles thousands of containers across clusters
- **Complexity:** High learning curve (YAML configs, networking, storage)
- **DX:** kubectl CLI, Helm charts, complex debugging
- **Maturity:** 10+ years (Google origins), production-grade
- **Cost:** Infrastructure + operational overhead (need dedicated team)

## Use Cases

| Scenario                               | Fit Score (1-10) | Rationale                                         |
| -------------------------------------- | ---------------- | ------------------------------------------------- |
| Microservices at scale (100+ services) | 10               | Designed for managing complex distributed systems |
| High-traffic production apps           | 9                | Auto-scaling, self-healing, rolling updates       |
| Multi-cloud deployments                | 10               | Vendor-agnostic (AWS, GCP, Azure)                 |
| Startups (<10 engineers)               | 3                | Operational complexity outweighs benefits         |
| Serverless-first apps                  | 4                | Use Lambda/Vercel instead (simpler)               |

## Trade-offs

### Strengths

- **Orchestration:** Auto-scaling, load balancing, self-healing
- **Vendor-Agnostic:** Portable across AWS, GCP, Azure, on-prem
- **Ecosystem:** Massive (Helm, Istio, Prometheus, Grafana)
- **Production-Grade:** Battle-tested at Google, Netflix, Airbnb

### Weaknesses

- **Complexity:** YAML hell, networking concepts, steep learning curve
- **Operational Overhead:** Requires dedicated DevOps/SRE team
- **Cost:** Infrastructure (control plane, worker nodes) + expertise
- **Overkill:** Most apps don't need K8s-level orchestration

## Alternatives

| Alternative                         | When to Choose Instead                                    |
| ----------------------------------- | --------------------------------------------------------- |
| **Serverless (AWS Lambda, Vercel)** | Unpredictable traffic, want zero ops                      |
| **Docker Compose**                  | Single-server deployments, simpler stack                  |
| **Nomad**                           | Simpler orchestration, mixed workloads (containers + VMs) |

## References

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [The Myths of Running Node.js on Kubernetes](https://www.youtube.com/watch?v=XIKFkigJSOA)
- [Serverless vs Containers (2025)](https://innomizetech.com/blog/serverless-vs-containers-2025-aws-lambda-managed-instances-decision-guide)
