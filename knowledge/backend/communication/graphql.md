---
name: GraphQL
category: backend
last_updated: 2026-01-14
maturity: stable
---

# GraphQL

## Overview

Query language for APIs enabling clients to request exactly the data they need. Single endpoint, type-safe schemas, eliminates over-fetching. Alternative to REST for flexible data requirements.

## Key Metrics

- **Flexibility:** Clients specify exact fields needed (no over/under-fetching)
- **Type Safety:** Schema-first (auto-generated TypeScript types)
- **Performance:** Single request vs multiple REST calls (but N+1 query risk)
- **DX:** GraphiQL explorer, schema introspection, codegen
- **Maturity:** 10+ years (Facebook origins), production-grade

## Use Cases

| Scenario                                 | Fit Score (1-10) | Rationale                                          |
| ---------------------------------------- | ---------------- | -------------------------------------------------- |
| Frontend-driven data needs               | 10               | Clients request exact fields (avoid over-fetching) |
| Mobile apps (bandwidth-limited)          | 9                | Request only needed data = less bandwidth          |
| Multiple clients (web, mobile, partners) | 9                | One API, clients query differently                 |
| Simple CRUD                              | 5                | REST simpler (less schema overhead)                |
| Internal microservices                   | 4                | gRPC more efficient for service-to-service         |

## Trade-offs

### Strengths

- **No Over-Fetching:** Request `{ user { id, name } }` (skip email, address)
- **Single Request:** Fetch user + posts + comments in one query (vs 3 REST calls)
- **Type Safety:** Schema enforces types (codegen for TypeScript)
- **Versioning:** Additive (add fields, deprecate old) vs REST /v1, /v2

### Weaknesses

- **N+1 Query Problem:** Naive resolvers cause database query explosion
- **Complexity:** Requires schema design, dataloader for performance
- **Caching:** HTTP caching harder than REST (POST requests, not GET)
- **Learning Curve:** Steeper than REST for backend developers

## Implementation Pattern

```graphql
# schema.graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}
```

```typescript
// server.ts (Apollo Server)
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./schema";

const resolvers = {
  Query: {
    user: async (_, { id }, { db }) => {
      return db.query.users.findFirst({ where: eq(users.id, id) });
    },
  },
  User: {
    posts: async (user, _, { db }) => {
      // N+1 problem: This runs for each user!
      // Solution: Use DataLoader
      return db.query.posts.findMany({ where: eq(posts.authorId, user.id) });
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });
```

## Client Usage

```typescript
// Frontend (React + Apollo Client)
import { gql, useQuery } from "@apollo/client";

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      posts {
        id
        title
      }
    }
  }
`;

function UserProfile({ userId }) {
  const { data } = useQuery(GET_USER, { variables: { id: userId } });
  return <div>{data.user.name}</div>;
}
```

## Alternatives

| Alternative | When to Choose Instead                                            |
| ----------- | ----------------------------------------------------------------- |
| **REST**    | Simple CRUD, stable endpoints, caching important                  |
| **gRPC**    | Internal microservices, need binary efficiency                    |
| **tRPC**    | TypeScript full-stack, want end-to-end type safety without schema |

## References

- [GraphQL Official Docs](https://graphql.org/)
- [Apollo Server Documentation](https://www.apollographql.com/docs/apollo-server/)
- [N+1 Problem and DataLoader](https://github.com/graphql/dataloader)
