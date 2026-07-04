# Front-end do CRUD Universidade

Interface Next.js do trabalho prático. A aplicação consome as duas APIs do projeto e permite alternar entre o backend relacional PostgreSQL e o backend NoSQL MongoDB.

## Telas

- Dashboard com totais de usuários, cursos, estudantes e vínculos.
- Distribuição de estudantes por curso calculada pelos vínculos.
- CRUD de usuários com `cpf`, dados pessoais, login, senha, e arrays de e-mail e telefone.
- CRUD de cursos com enums de grau, turno e nível.
- CRUD de estudantes por `mat_estudante`, vinculando opcionalmente um `cpf` existente.
- CRUD de vínculos com matrícula, curso, datas e status do enum SQL.

## Proxies

O front-end usa rotas proxy para evitar chamada direta dos navegadores aos backends:

- `/api/backend` aponta para o backend relacional
- `/api/backend-nosql` aponta para o backend NoSQL

As URLs dos backends usadas pelos proxies podem ser sobrescritas com:

```env
API_UPSTREAM_URL=http://localhost:3001
API_NOSQL_UPSTREAM_URL=http://localhost:3002
```

Também é possível apontar o cliente diretamente para outra base HTTP com
`NEXT_PUBLIC_API_PROXY_URL` e `NEXT_PUBLIC_API_NOSQL_PROXY_URL`, mas o fluxo
padrão do projeto usa os proxies acima.

## Execução

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Validação

```bash
npm run lint
npm run build
```
