---
name: WebSockets
category: backend
last_updated: 2026-01-14
maturity: stable
---

# WebSockets

## Overview

Full-duplex communication protocol over TCP for real-time, bidirectional client-server communication. Standard for chat apps, notifications, live updates, and collaborative tools.

## Key Metrics

- **Latency:** <10ms bidirectional messaging (vs HTTP polling ~1s)
- **Throughput:** Single connection handles thousands of messages
- **Scalability:** Requires sticky sessions or Redis Pub/Sub for multi-server
- **DX:** Socket.IO (batteries-included) vs uWebSockets.js (performance)
- **Maturity:** 15+ years (RFC 6455), production-grade

## Use Cases

| Scenario                            | Fit Score (1-10) | Rationale                               |
| ----------------------------------- | ---------------- | --------------------------------------- |
| Real-time chat (Slack, Discord)     | 10               | Bidirectional, instant message delivery |
| Live notifications                  | 10               | Server push without polling overhead    |
| Collaborative editing (Google Docs) | 9                | Operational transforms over WebSocket   |
| Stock tickers / live data feeds     | 10               | Push updates as they happen             |
| HTTP-only APIs (REST CRUD)          | 2                | WebSockets overkill, use HTTP           |

## Trade-offs

### Strengths

- **Real-Time:** Bidirectional, no polling overhead
- **Efficiency:** Single connection vs repeated HTTP requests
- **Push Capability:** Server initiates messages (not request-response)
- **Standard:** Native browser API, wide support

### Weaknesses

- **Scaling Complexity:** Requires Redis Pub/Sub for multi-server sync
- **Sticky Sessions:** Load balancers must route same user to same server
- **Debugging:** Harder than HTTP (no browser DevTools request log)
- **Firewall Issues:** Some corporate proxies block non-HTTP

## Implementation Options

| Technology               | When to Use                                               |
| ------------------------ | --------------------------------------------------------- |
| **Socket.IO**            | Batteries-included, fallback to polling, rooms/namespaces |
| **uWebSockets.js**       | Maximum performance (C++), millions of connections        |
| **Native WebSocket API** | Simple use case, no framework needed                      |

## Alternatives

| Alternative                  | When to Choose Instead                            |
| ---------------------------- | ------------------------------------------------- |
| **Server-Sent Events (SSE)** | One-way server → client (simpler than WebSocket)  |
| **HTTP Polling**             | Infrequent updates, simplicity over efficiency    |
| **gRPC Streaming**           | Microservice communication, prefer typed protobuf |

## References

- [WebSocket Scale (2025)](https://www.videosdk.live/developer-hub/websocket/websocket-scale)
- [Socket.IO vs WebSocket Guide](https://velt.dev/blog/socketio-vs-websocket-guide-developers)
- [uWebSockets.js Performance Discussion](https://github.com/socketio/socket.io/discussions/4566)
