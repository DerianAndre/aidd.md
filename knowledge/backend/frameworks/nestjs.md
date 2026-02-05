---
name: NestJS
category: backend
last_updated: 2026-01-14
maturity: stable
---

# NestJS

## Overview

Progressive TypeScript-first Node.js framework with Angular-inspired architecture. Enterprise-grade with dependency injection, modular design, and comprehensive microservices support. Industry standard for large-scale backend applications.

## Key Metrics

- **Performance:** Similar to Express (~25k req/s), optimized for maintainability over raw speed
- **DX:** Decorators, dependency injection, CLI scaffolding, excellent TypeScript support
- **Microservices:** Native support for gRPC, NATS, RabbitMQ, Kafka
- **Maturity:** 7+ years, production-grade, massive adoption in enterprises
- **Cost:** Free, open-source

## Use Cases

| Scenario                            | Fit Score (1-10) | Rationale                                                            |
| ----------------------------------- | ---------------- | -------------------------------------------------------------------- |
| Enterprise applications (teams >10) | 10               | Modular architecture, DI, testability, clear structure               |
| Microservices architecture          | 10               | Native gRPC/NATS/Kafka support, service orchestration                |
| TypeScript-first projects           | 10               | TypeScript by default, decorators, metadata reflection               |
| Speed-critical APIs                 | 6                | Use Fastify under the hood for better performance (NestJS supported) |
| Simple CRUD APIs                    | 5                | Overhead vs Fastify/Hono for small projects                          |

## Trade-offs

### Strengths

- **Enterprise Architecture:** Dependency injection, modules, guards, interceptors
- **TypeScript-First:** Decorators (`@Controller()`, `@Injectable()`), strong typing
- **Microservices:** Built-in support for message brokers, gRPC
- **Testing:** Built-in test utilities, E2E testing support

### Weaknesses

- **Performance:** ~25k req/s (vs Fastify 60k+, Hono 80k+)
- **Learning Curve:** Angular-inspired patterns may be unfamiliar
- **Boilerplate:** More setup than Fastify/Express for simple APIs
- **Bundle Size:** Larger than minimalist frameworks

## Implementation Pattern

```bash
npm i -g @nestjs/cli
nest new my-api
cd my-api
npm run start:dev
```

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { AuthGuard } from "@nestjs/passport";

@Controller("users")
@UseGuards(AuthGuard("jwt"))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}

// src/users/users.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  findOne(id: number): Promise<User> {
    return this.usersRepository.findOneBy({ id });
  }

  create(user: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }
}
```

## NestJS vs Alternatives

| Aspect             | NestJS                      | Fastify       | Hono           |
| ------------------ | --------------------------- | ------------- | -------------- |
| **Performance**    | ~25k req/s                  | ~60k req/s ✅ | ~80k req/s ✅  |
| **Architecture**   | Enterprise (DI, modules) ✅ | Minimal       | Minimal        |
| **Microservices**  | Built-in ✅                 | Manual        | Manual         |
| **TypeScript**     | First-class ✅              | Supported     | First-class ✅ |
| **Learning Curve** | High (Angular-like)         | Low ✅        | Low ✅         |

## Alternatives

| Alternative | When to Choose Instead                                           |
| ----------- | ---------------------------------------------------------------- |
| **Fastify** | Speed-critical, minimal architecture, Plugin-based extensibility |
| **Hono**    | Edge computing, multi-runtime, ultralight bundle                 |
| **Express** | Simple APIs, team familiar with Express, minimal structure       |

## References

- [NestJS Official Docs](https://docs.nestjs.com/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
- [NestJS vs Fastify Performance](https://dev.to/nestjs/nestjs-vs-fastify-performance-comparison-2026)
