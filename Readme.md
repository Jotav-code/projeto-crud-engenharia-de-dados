# Trabalho Prático de Engenharia de Dados

Projeto CRUD desenvolvido para a disciplina de Engenharia de Dados. A aplicação gerencia `cursos`, `usuarios`, `estudantes` e `vinculos` usando duas representações do mesmo domínio:

- PostgreSQL como banco relacional
- MongoDB como banco não relacional

O mesmo front-end em Next.js consome as duas APIs e permite alternar entre `Relacional` e `NoSQL`.

## Escolha a documentação

- [Visão geral do projeto](#visão-geral-do-projeto)
- [Documentação do banco relacional PostgreSQL](#documentação-do-banco-relacional-postgresql)
- [Documentação do banco NoSQL MongoDB](#documentação-do-banco-nosql-mongodb)
- [Front-end e alternância entre bancos](#front-end-e-alternância-entre-bancos)
- [Como executar localmente](#como-executar-localmente)
- [Scripts úteis](#scripts-úteis)
- [Link de acesso](#link-de-acesso)

## Visão geral do projeto

O sistema foi organizado em três partes:

- `backend`: API REST em Node.js com Express e acesso ao PostgreSQL via `pg`
- `backend_noSQL`: API REST em Node.js com Express e acesso ao MongoDB via `mongoose`
- `front-end`: interface em Next.js que consome as APIs e exibe dashboard e telas de cadastro

O front-end não acessa os bancos diretamente. Ele chama rotas proxy locais do Next.js:

- `"/api/backend"` para o modo relacional
- `"/api/backend-nosql"` para o modo NoSQL

No modo NoSQL, a interface muda as cores principais de azul para verde para representar o MongoDB.

### Tecnologias utilizadas

- Node.js
- Express
- TypeScript
- PostgreSQL
- `pg`
- MongoDB
- `mongoose`
- Next.js
- React
- Tailwind CSS
- AWS/Render/Vercel para ambiente publicado

### Estrutura do projeto

```text
.
├── backend
│   └── src
│       ├── conexao.ts
│       └── server.ts
├── backend_noSQL
│   └── src
│       ├── db.ts
│       ├── models.ts
│       └── server.ts
├── front-end
│   └── src
│       ├── app
│       ├── components
│       ├── services
│       └── types
└── Readme.md
```

## Documentação do banco relacional PostgreSQL

### Objetivo

O banco relacional representa o projeto lógico trabalhado na disciplina. Ele usa tabelas, chaves primárias e chaves estrangeiras para manter a estrutura acadêmica do sistema.

### Modelo lógico relacional

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

### Entidades e relacionamentos

- `curso`: armazena os cursos acadêmicos.
- `usuario`: armazena os usuários ligados aos estudantes.
- `estudante`: representa o aluno, identificado por `matricula`, e referencia `usuario` e `curso`.
- `vinculo`: representa o vínculo acadêmico de um estudante, referenciando `estudante.matricula`.

Relacionamentos:

- um `curso` pode ter vários `estudantes`
- um `usuario` pode estar ligado a um `estudante`
- um `estudante` pode ter vínculos acadêmicos

### Restrições no relacional

- Chave primária:
  - `curso.id_curso`
  - `usuario.id_usuario`
  - `estudante.matricula`
  - `vinculo.id_vinculo`
- Integridade referencial:
  - `estudante.id_usuario` referencia `usuario.id_usuario`
  - `estudante.id_curso` referencia `curso.id_curso`
  - `vinculo.matricula_estudante` referencia `estudante.matricula`
- Not null e domínio:
  - a API valida campos obrigatórios antes de salvar
  - e-mail precisa ter formato válido
  - matrícula precisa ser numérica, positiva e ter no máximo 12 dígitos
  - status do vínculo só aceita `Ativo`, `Trancado`, `Concluído` ou `Cancelado`
  - data de ingresso precisa ser uma data válida no formato `YYYY-MM-DD`
- Unicidade:
  - matrícula não pode repetir
  - e-mail não pode repetir
  - nome de curso não pode repetir, considerando comparação normalizada

### Backend relacional

O backend relacional fica em `backend/src/server.ts` e expõe rotas REST para todas as entidades:

- `GET /cursos`, `POST /cursos`, `PUT /cursos/:id`, `DELETE /cursos/:id`
- `GET /usuarios`, `POST /usuarios`, `PUT /usuarios/:id`, `DELETE /usuarios/:id`
- `GET /estudantes`, `POST /estudantes`, `PUT /estudantes/:matricula`, `DELETE /estudantes/:matricula`
- `GET /vinculos`, `POST /vinculos`, `PUT /vinculos/:id`, `DELETE /vinculos/:id`

A conexão é feita em `backend/src/conexao.ts`, usando:

- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`

## Documentação do banco NoSQL MongoDB

### Pesquisa e escolha do SGBD NoSQL

Para a etapa NoSQL, foram considerados bancos que representam dados de forma diferente do modelo relacional tradicional. Entre as opções comuns estão:

- bancos orientados a documentos, como MongoDB
- bancos chave-valor, como Redis
- bancos orientados a colunas, como Cassandra
- bancos orientados a grafos, como Neo4j

O SGBD escolhido foi o MongoDB, por ser orientado a documentos e permitir representar entidades em coleções com documentos JSON/BSON. Essa escolha facilita o mapeamento de tabelas relacionais para coleções e mantém uma estrutura próxima ao domínio já usado no CRUD.

### Método de mapeamento relacional para MongoDB

O mapeamento adotado foi a representação por coleções, preservando as entidades principais do modelo relacional. Cada tabela foi representada por uma coleção equivalente no MongoDB.

A decisão principal foi manter referências por IDs numéricos, em vez de embutir todos os dados relacionados dentro de um único documento. Isso foi escolhido porque:

- o CRUD já trabalha com entidades separadas
- o front-end consome as mesmas rotas nos dois modos
- fica mais claro comparar o modelo relacional com o NoSQL
- as restrições de integridade podem ser demonstradas manualmente na API

### Mapeamento das tabelas para coleções

| Modelo relacional | MongoDB | Identificador preservado |
| --- | --- | --- |
| `curso` | `cursos` | `id_curso` |
| `usuario` | `usuarios` | `id_usuario` |
| `estudante` | `estudantes` | `matricula` |
| `vinculo` | `vinculos` | `id_vinculo` |

Além dessas coleções, existe a coleção auxiliar `counters`, usada para simular o comportamento de `SERIAL` do PostgreSQL em campos como `id_curso`, `id_usuario` e `id_vinculo`.

### Representação dos documentos

Exemplo de documento em `cursos`:

```json
{
  "id_curso": 1,
  "nome_curso": "Ciência da Computação",
  "nome_curso_normalizado": "ciência da computação",
  "departamento": "DCOMP"
}
```

Exemplo de documento em `usuarios`:

```json
{
  "id_usuario": 1,
  "email": "aluno@ufs.br",
  "senha_hash": "hash_sha256"
}
```

Exemplo de documento em `estudantes`:

```json
{
  "matricula": 202400000001,
  "nome": "Maria Silva",
  "id_usuario": 1,
  "id_curso": 1
}
```

Exemplo de documento em `vinculos`:

```json
{
  "id_vinculo": 1,
  "matricula_estudante": 202400000001,
  "status_vinculo": "Ativo",
  "data_ingresso": "2024-03-01"
}
```

O campo `nome_curso_normalizado` é auxiliar e não é exposto nas respostas da API. Ele existe para apoiar a proteção contra cursos duplicados.

### Como as restrições são garantidas no MongoDB

MongoDB não aplica chaves estrangeiras automaticamente como um banco relacional. Por isso, as restrições foram implementadas combinando schema do Mongoose, índices únicos e validações na API.

Restrições de chave:

- `id_curso`, `id_usuario`, `matricula` e `id_vinculo` possuem índice único no schema Mongoose.
- `counters` gera sequências numéricas para manter IDs similares aos `SERIAL` do PostgreSQL.

Restrições de integridade referencial:

- antes de criar estudante, a API verifica se `id_usuario` existe em `usuarios`
- antes de criar estudante, a API verifica se `id_curso` existe em `cursos`
- antes de criar vínculo, a API verifica se `matricula_estudante` existe em `estudantes`
- antes de remover curso, usuário ou estudante, a API verifica se existem registros dependentes

Restrições de domínio:

- matrícula precisa ser numérica, positiva e ter no máximo 12 dígitos
- e-mail precisa ter formato válido
- status de vínculo só aceita `Ativo`, `Trancado`, `Concluído` ou `Cancelado`
- data de ingresso precisa ser uma data válida no formato `YYYY-MM-DD`
- senha precisa ter no mínimo 6 caracteres antes de ser transformada em hash

Restrições not null:

- campos obrigatórios são verificados no schema Mongoose e também na API
- `nome_curso`, `email`, `senha_hash`, `nome`, `id_usuario`, `id_curso`, `matricula_estudante`, `status_vinculo` e `data_ingresso` não podem ser enviados vazios nas operações de cadastro/edição

Restrições de unicidade:

- `email` é salvo normalizado em minúsculas e possui índice único
- `matricula` possui índice único
- `nome_curso_normalizado` possui índice único para impedir curso repetido

### Backend NoSQL

O backend NoSQL fica em `backend_noSQL/src/server.ts` e expõe as mesmas rotas REST do backend relacional:

- `GET /cursos`, `POST /cursos`, `PUT /cursos/:id`, `DELETE /cursos/:id`
- `GET /usuarios`, `POST /usuarios`, `PUT /usuarios/:id`, `DELETE /usuarios/:id`
- `GET /estudantes`, `POST /estudantes`, `PUT /estudantes/:matricula`, `DELETE /estudantes/:matricula`
- `GET /vinculos`, `POST /vinculos`, `PUT /vinculos/:id`, `DELETE /vinculos/:id`

A conexão usa:

- `MONGO_URI`
- `PORT`

## Front-end e alternância entre bancos

O front-end em `front-end/` é uma aplicação Next.js que:

- carrega um dashboard com contagens e distribuição básica dos dados
- permite listar, criar, editar e excluir registros
- usa uma camada de serviço centralizada para chamadas HTTP
- permite alternar entre PostgreSQL e MongoDB pelo seletor lateral

No cadastro de vínculo, o usuário não precisa digitar a matrícula manualmente. A tela lista os estudantes cadastrados e exibe opções no formato:

```text
matricula - nome do estudante
```

O front-end chama `"/api/backend"` no modo relacional e `"/api/backend-nosql"` no modo NoSQL. Por padrão, o proxy NoSQL aponta para:

- `https://projeto-crud-engenharia-de-dados-1.onrender.com`

Variáveis disponíveis para sobrescrever as APIs:

- `NEXT_PUBLIC_API_PROXY_URL`
- `NEXT_PUBLIC_API_NOSQL_PROXY_URL`
- `API_UPSTREAM_URL`
- `API_NOSQL_UPSTREAM_URL`

## Observação sobre a senha

O projeto usa `hash` simples com `sha256` apenas para facilitar a implementação do trabalho. A senha recebida na criação ou atualização de usuário é convertida em `senha_hash` antes de ser salva no banco.

Isso significa que:

- a senha não é armazenada em texto puro
- o armazenamento não usa um esquema avançado de autenticação
- o objetivo aqui é atender ao contexto acadêmico do CRUD

## Como executar localmente

### 1. Backend relacional

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

A API relacional sobe, por padrão, em `http://localhost:3000`.

### 2. Backend NoSQL

```bash
cd backend_noSQL
npm install
```

Crie um arquivo `.env` com a conexão do MongoDB, se quiser sobrescrever o padrão:

```env
MONGO_URI=mongodb://localhost:27017/trabalho_de_dados
PORT=3002
```

Depois execute:

```bash
npm run dev
```

A API NoSQL sobe, por padrão, em `http://localhost:3002`.

### 3. Front-end

```bash
cd front-end
npm install
```

Se as APIs não estiverem no endereço padrão do proxy, defina no `.env.local`:

```env
NEXT_PUBLIC_API_PROXY_URL=/api/backend
NEXT_PUBLIC_API_NOSQL_PROXY_URL=/api/backend-nosql
API_UPSTREAM_URL=http://localhost:3000
API_NOSQL_UPSTREAM_URL=http://localhost:3002
```

Depois execute:

```bash
npm run dev -- -p 3001
```

Acesse o front-end em `http://localhost:3001`.

## Scripts úteis

Backend relacional:

- `npm run dev`
- `npm run build`
- `npm start`

Backend NoSQL:

- `npm run dev`
- `npm run build`
- `npm start`

Front-end:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

## Observações finais

- O projeto foi pensado como trabalho acadêmico, com foco em CRUD, relacionamento entre tabelas e integração front-end/back-end.
- As mensagens de erro da API foram deixadas explícitas para facilitar validação e demonstração em sala.
- O dashboard do front-end usa os dados cadastrados para gerar uma visão resumida do sistema.
- A documentação NoSQL descreve o mapeamento do projeto lógico relacional para MongoDB e a forma como as restrições foram implementadas.

## Link de acesso

[Acessar aplicação publicada](https://projeto-crud-engenharia-de-dados-vz.vercel.app/)
