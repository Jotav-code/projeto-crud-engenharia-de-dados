# Trabalho Prático de Engenharia de Dados

Projeto CRUD desenvolvido para a disciplina de Engenharia de Dados. A aplicação gerencia `cursos`, `usuarios`, `estudantes` e `vinculos`, usando PostgreSQL como banco de dados e uma API em Node.js/Express consumida por um front-end em Next.js.

## Visão geral

O sistema foi organizado em duas partes:

- `backend`: API REST em Node.js com Express e acesso ao PostgreSQL via `pg`
- `front-end`: interface em Next.js que consome a API e exibe dashboard e telas de cadastro

O front-end não acessa o banco diretamente. Ele faz requisições para uma rota proxy local do Next.js, que repassa as chamadas para a API principal.

## Tecnologias utilizadas

- Node.js
- Express
- TypeScript
- PostgreSQL
- `pg`
- Next.js
- React
- Tailwind CSS
- AWS, no ambiente de banco utilizado no projeto

## Estrutura do projeto

```text
.
├── backend
│   └── src
│       ├── conexao.ts
│       └── server.ts
├── front-end
│   └── src
│       ├── app
│       ├── components
│       ├── services
│       └── types
└── Readme.md
```

## Modelo de dados

O banco possui quatro tabelas principais:

```sql
CREATE TABLE curso(
  id_curso SERIAL PRIMARY KEY,
  nome_curso VARCHAR NOT NULL,
  departamento VARCHAR
);

CREATE TABLE usuario(
  id_usuario SERIAL PRIMARY KEY,
  email VARCHAR NOT NULL,
  senha_hash VARCHAR NOT NULL
);

CREATE TABLE estudante(
  id_usuario INT REFERENCES usuario(id_usuario),
  id_curso INT REFERENCES curso(id_curso),
  nome VARCHAR NOT NULL,
  matricula INT PRIMARY KEY
);

CREATE TABLE vinculo(
  id_vinculo SERIAL PRIMARY KEY,
  matricula_estudante INT REFERENCES estudante(matricula),
  status_vinculo VARCHAR,
  data_ingresso DATE
);
```

## Observação sobre a senha

O projeto usa `hash` simples com `sha256` apenas para facilitar a implementação do trabalho. A senha recebida na criação ou atualização de usuário é convertida em `senha_hash` antes de ser salva no banco.

Isso significa que:

- a senha não é armazenada em texto puro
- o armazenamento não usa um esquema avançado de autenticação
- o objetivo aqui é atender ao contexto acadêmico do CRUD

## Backend

O backend fica em `backend/src/server.ts` e expõe uma API REST com operações de `CRUD` para todas as entidades.

### Rotas disponíveis

#### Cursos

- `GET /cursos`
- `POST /cursos`
- `PUT /cursos/:id`
- `DELETE /cursos/:id`

#### Usuários

- `GET /usuarios`
- `POST /usuarios`
- `PUT /usuarios/:id`
- `DELETE /usuarios/:id`

#### Estudantes

- `GET /estudantes`
- `POST /estudantes`
- `PUT /estudantes/:matricula`
- `DELETE /estudantes/:matricula`

#### Vínculos

- `GET /vinculos`
- `POST /vinculos`
- `PUT /vinculos/:id`
- `DELETE /vinculos/:id`

### Regras aplicadas na API

- validação de campos obrigatórios
- validação de formato de e-mail
- validação básica de IDs numéricos
- tratamento de conflitos de chave única e integridade referencial
- respostas apropriadas para `400`, `404`, `500` e `204`

### Conexão com o banco

A conexão é feita em `backend/src/conexao.ts`, usando variáveis de ambiente:

- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`

## Front-end

O front-end em `front-end/` é uma aplicação Next.js que:

- carrega um dashboard com contagens e distribuição básica dos dados
- permite listar, criar, editar e excluir registros
- usa uma camada de serviço centralizada para chamadas HTTP

### Fluxo de acesso à API

O front-end chama `"/api/backend"` por padrão. Essa rota proxy, definida em `front-end/src/app/api/backend/[...path]/route.ts`, encaminha a requisição para a API externa.

Se necessário, é possível sobrescrever o endereço da API com:

- `NEXT_PUBLIC_API_PROXY_URL`
- `API_UPSTREAM_URL`

## Como executar localmente

### 1. Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` com as credenciais do banco:

```env
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_HOST=seu_host
DB_PORT=5432
DB_NAME=seu_banco
```

Depois execute:

```bash
npm run dev
```

A API sobe, por padrão, em `http://localhost:3000`.

### 2. Front-end

```bash
cd front-end
npm install
```

Se a API não estiver no endereço padrão do proxy, defina no `.env.local`:

```env
NEXT_PUBLIC_API_PROXY_URL=/api/backend
API_UPSTREAM_URL=http://localhost:3000
```

Depois execute:

```bash
npm run dev
```

O front-end sobe, por padrão, em `http://localhost:3000`. Se os dois projetos forem executados localmente ao mesmo tempo, ajuste as portas conforme necessário.

Uma forma prática de rodar os dois juntos é manter o backend em `3000` e iniciar o front-end em outra porta, por exemplo:

```bash
npm run dev -- -p 3001
```

Nesse caso, acesse o front-end em `http://localhost:3001` e mantenha `API_UPSTREAM_URL` apontando para `http://localhost:3000`.

## Scripts úteis

### Backend

- `npm run dev`
- `npm run build`
- `npm start`

### Front-end

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Observações finais

- O projeto foi pensado como trabalho acadêmico, com foco em CRUD, relacionamento entre tabelas e integração front-end/back-end.
- As mensagens de erro da API foram deixadas explícitas para facilitar validação e demonstração em sala.
- O dashboard do front-end usa os dados cadastrados para gerar uma visão resumida do sistema.
