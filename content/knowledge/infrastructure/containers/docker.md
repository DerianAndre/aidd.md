---
name: Docker
category: infrastructure
last_updated: 2026-01-14
maturity: stable
---

# Docker

## Overview

Industry-standard container platform with centralized daemon, Docker Desktop GUI, and massive ecosystem. Ubiquitous but security concerns drive adoption of Podman in sensitive environments.

## Key Metrics

- **Ecosystem:** Largest (most images, tutorials, Stack Overflow answers)
- **DX:** Docker Desktop GUI, docker-compose mature
- **Security:** Daemon runs as root (attack surface)
- **Maturity:** 10+ years, production-grade, Docker Inc. backing
- **Cost:** Docker Desktop free for individuals, paid for enterprise

## Use Cases

| Scenario                                | Fit Score (1-10) | Rationale                                       |
| --------------------------------------- | ---------------- | ----------------------------------------------- |
| Development environments                | 10               | Docker Desktop GUI, docker-compose simplicity   |
| CI/CD pipelines (non-security-critical) | 9                | Ubiquitous, all CI platforms support natively   |
| Teams familiar with Docker              | 10               | No learning curve, works everywhere             |
| Security-critical environments          | 5                | Root daemon = attack surface (use Podman)       |
| Multi-user systems                      | 6                | Daemon shared across users (isolation concerns) |

## Trade-offs

### Strengths

- **Ecosystem:** Largest community, most Docker Hub images
- **Docker Desktop:** GUI for managing containers (Mac/Windows)
- **docker-compose:** Mature multi-container orchestration
- **Ubiquity:** Every developer knows Docker

### Weaknesses

- **Security:** Daemon runs as root (privilege escalation risk)
- **Daemon Dependency:** Requires dockerd service running
- **Licensing:** Desktop paid for enterprises (>250 employees)
- **Resource Usage:** Daemon overhead (~100MB baseline)

## Alternatives

| Alternative    | When to Choose Instead                              |
| -------------- | --------------------------------------------------- |
| **Podman**     | Security-critical, rootless containers, daemonless  |
| **Kubernetes** | Production orchestration (Docker is dev/build tool) |

## References

- [Docker Official Docs](https://docs.docker.com/)
- [Docker vs Podman (2025)](https://www.pass4sure.com/blog/2025-container-showdown-podman-or-docker-whats-best-for-you/)
- [Tauri vs Electron Benchmark](https://www.reddit.com/r/programming/comments/1jwjw7b/tauri_vs_electron_benchmark_58_less_memory_96/)
