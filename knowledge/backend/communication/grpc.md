---
name: gRPC
category: backend
last_updated: 2026-01-14
maturity: stable
---

# gRPC

## Overview

High-performance RPC framework using HTTP/2 and Protocol Buffers (protobuf). Type-safe, efficient binary serialization. Ideal for internal microservice communication.

## Key Metrics

- **Performance:** 5-10x faster than REST (binary vs JSON)
- **Type Safety:** Schema-first (`.proto` files enforce contracts)
- **Streaming:** Bidirectional streaming (vs REST request-response)
- **DX:** Code generation for all major languages
- **Maturity:** 10+ years (Google origins), production-grade

## Use Cases

| Scenario                    | Fit Score (1-10) | Rationale                                     |
| --------------------------- | ---------------- | --------------------------------------------- |
| Internal microservices      | 10               | Type safety, performance, streaming           |
| High-throughput APIs        | 10               | Binary serialization 5-10x faster than JSON   |
| Polyglot systems            | 9                | Code generation for Go, Java, Python, Node.js |
| Public APIs (external devs) | 4                | Requires protobuf tooling (vs REST cURL)      |
| Browser clients             | 6                | gRPC-Web exists but REST simpler              |

## Trade-offs

### Strengths

- **Performance:** Protobuf binary = smaller payloads, faster parsing
- **Type Safety:** `.proto` schema prevents runtime errors
- **Streaming:** Server/client/bidirectional streaming (vs REST polling)
- **Code Generation:** Auto-generate clients (TypeScript, Go, Python)

### Weaknesses

- **Complexity:** Requires protobuf compilation, tooling setup
- **Browser Support:** Needs gRPC-Web proxy (not native like REST)
- **Debugging:** Binary payloads harder to inspect (vs JSON)
- **Human-Readability:** Protobuf not human-readable (vs REST/JSON)

## Implementation Pattern

```protobuf
// user.proto
syntax = "proto3";

service UserService {
  rpc GetUser (GetUserRequest) returns (User);
  rpc ListUsers (ListUsersRequest) returns (stream User);
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
}
```

```typescript
// Server (Node.js)
import * as grpc from "@grpc/grpc-js";
import { UserService } from "./generated/user_grpc_pb";

const server = new grpc.Server();
server.addService(UserService, {
  getUser: (call, callback) => {
    const user = db.getUser(call.request.getId());
    callback(null, user);
  },
});

// Client
import { UserServiceClient } from "./generated/user_grpc_pb";
const client = new UserServiceClient("localhost:50051");
const user = await client.getUser({ id: "123" });
```

## Alternatives

| Alternative                         | When to Choose Instead                              |
| ----------------------------------- | --------------------------------------------------- |
| **REST**                            | Public APIs, browser clients, human-readable needed |
| **GraphQL**                         | Frontend-driven queries, avoid N+1 problems         |
| **Message Queue (RabbitMQ, Kafka)** | Asynchronous, event-driven communication            |

## References

- [gRPC Official Docs](https://grpc.io/docs/)
- [gRPC vs REST Performance](https://www.nginx.com/blog/nginx-1-13-10-grpc/)
- [gRPC Node.js Guide](https://grpc.io/docs/languages/node/)
