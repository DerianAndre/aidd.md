# Database Engineering — Schema-Driven Data Design

> ERD → Schema → Queries → Verify pattern.

**Effort Tier**: 2 (STANDARD)
**AIDD Skill**: `skills/data-architect/SKILL.md`

---

## Preconditions

- Domain model or data requirements defined
- Database technology chosen (PostgreSQL, SQLite, MongoDB)
- ORM identified (Prisma, Drizzle, TypeORM, raw SQL)

## Sub-Agent Roles

| Role | Focus |
|------|-------|
| **Data Architect** | Schema design, relationships, normalization, indexes |
| **Backend Engineer** | Query implementation, migration scripts, performance |

## Process

### Step 1 — ERD Design
- Entities with attributes and types
- Relationships: 1:1, 1:N, N:M (with junction tables)
- Cardinality and optionality
- Identify natural vs surrogate keys

### Step 2 — Schema/Migration
- Reversible migrations ALWAYS
- Column types: use most restrictive appropriate type
- NOT NULL by default, nullable only when justified
- Default values for new columns on existing tables
- Constraints: CHECK, UNIQUE, FK with ON DELETE strategy

### Step 3 — Indexes
- Query-driven indexing (not speculative)
- Foreign keys: always indexed
- Frequent WHERE clauses: indexed
- Composite indexes: most selective column first
- Partial indexes for filtered queries
- EXPLAIN ANALYZE to verify index usage

### Step 4 — Queries
- Parameterized ALWAYS (never string concatenation)
- No SELECT * (specify columns explicitly)
- N+1 prevention: eager loading, joins, or batch queries
- Pagination: cursor-based (preferred) or offset-based
- Transactions for multi-table operations

### Step 5 — Verification
- EXPLAIN ANALYZE on critical queries
- Check index coverage
- Verify N+1 elimination
- Load test with representative data volume

## ORM-Specific Standards

### Prisma
- Schema as SSOT, `prisma migrate dev`
- Type-safe queries, leverage generated types
- Use `include` and `select` for eager loading
- Batch with `createMany`, `updateMany`

### Drizzle
- Schema in TypeScript, query builder pattern
- Type inference from schema
- Prepared statements for frequently-run queries

### TypeORM
- Decorators for entity definition
- Repository pattern, QueryBuilder for complex queries
- Migration generation and execution

### Raw SQL
- Always parameterized ($1, $2 or ?)
- Stored procedures for complex business logic
- Views for commonly-joined queries

## Quality Gates

- [ ] All migrations reversible
- [ ] No SELECT *
- [ ] Indexes on all FKs and frequent WHERE columns
- [ ] N+1 queries eliminated
- [ ] Data integrity in schema (not just app code)
- [ ] EXPLAIN ANALYZE on critical queries
- [ ] Parameterized queries (no string concatenation)

## Anti-Patterns

- SELECT * in production
- N+1 queries (1 query per related record)
- Non-reversible migrations
- Business logic in SQL queries
- Missing indexes on foreign keys
- Storing computed values that can be derived
- VARCHAR without length limit
- No default values on new columns for existing tables

---

## Cross-References

- **Data Architect skill**: `skills/data-architect/SKILL.md`
- **Backend rules**: `rules/backend.md`
- **Database knowledge**: `knowledge/data/databases/`
- **ORM knowledge**: `knowledge/data/orms/`
- **Security rules**: `rules/security.md`
