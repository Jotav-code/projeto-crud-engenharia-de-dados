# Trabalho Prático de Engenharia de Dados

Projeto CRUD para comparar uma API relacional em PostgreSQL e uma API NoSQL em MongoDB usando a mesma interface Next.js.

O modelo atual segue o arquivo `codigo.sql` e usa o schema PostgreSQL `universidade`. O CRUD do projeto permanece restrito a quatro entidades:

- `usuario`
- `curso`
- `estudante`
- `vinculo`

As demais tabelas do SQL, como `professor`, `departamento`, `disciplina`, `turma`, `projeto` e `plano`, fazem parte do schema acadêmico, mas não possuem rotas CRUD nesta aplicação.

## Estrutura

```text
.
├── backend        # API Express + PostgreSQL
├── backend_noSQL  # API Express + MongoDB/Mongoose
├── front-end      # Next.js com alternância Relacional/NoSQL
├── codigo.sql     # especificação do schema universidade
└── Readme.md
```

O front-end consome proxies locais:

- `/api/backend` para o backend relacional
- `/api/backend-nosql` para o backend NoSQL

## Modelo Relacional

O backend relacional consulta tabelas prefixadas por `universidade.`:

| Entidade | Chave | Campos expostos na API |
| --- | --- | --- |
| `usuario` | `cpf` | `cpf`, `nome`, `data_nascimento`, `email`, `telefone`, `login`, `senha` |
| `curso` | `idcurso` | `idcurso`, `nome`, `grau`, `turno`, `campus`, `nivel` |
| `estudante` | `mat_estudante` | `mat_estudante`, `cpf`, `mc`, `ano_ingresso` |
| `vinculo` | `idvinculo` | `idvinculo`, `mat_estudante`, `curso`, `data_entrada`, `status`, `data_saida` |

### Enums

`curso.grau`:

- `Bacharelado`
- `Licenciatura Plena`

`curso.turno`:

- `Matutino`
- `Vespertino`
- `Noturno`
- `Turno Indefinido`

`curso.nivel`:

- `Graduação`
- `Mestrado`
- `Doutorado`
- `Lato`

`vinculo.status`:

- `Ativo`
- `Cancelada`
- `Formando`
- `Graduado`

### Validações Aplicadas

- `usuario.cpf` deve ser numérico com até 13 dígitos.
- `usuario.nome` é obrigatório.
- `usuario.email` e `usuario.telefone` são arrays JSON na API.
- `curso.nome` e `curso.turno` são obrigatórios.
- `curso` não pode repetir a combinação `nome + turno + campus + nivel`.
- `estudante.mat_estudante` deve ter até 7 caracteres.
- `estudante.cpf`, quando informado, deve existir em `usuario.cpf`.
- `vinculo.mat_estudante` deve existir em `estudante.mat_estudante`.
- `vinculo.curso` deve existir em `curso.idcurso`.
- Datas devem usar `YYYY-MM-DD` quando informadas.

As chaves estrangeiras seguem o `codigo.sql`, incluindo `ON DELETE SET NULL` onde definido.

## Rotas REST

As mesmas rotas existem nos dois backends:

```text
GET    /usuarios
POST   /usuarios
PUT    /usuarios/:cpf
DELETE /usuarios/:cpf

GET    /cursos
POST   /cursos
PUT    /cursos/:id
DELETE /cursos/:id

GET    /estudantes
POST   /estudantes
PUT    /estudantes/:matricula
DELETE /estudantes/:matricula

GET    /vinculos
POST   /vinculos
PUT    /vinculos/:id
DELETE /vinculos/:id
```

## MongoDB

O backend NoSQL usa coleções equivalentes:

| PostgreSQL | MongoDB | Observação |
| --- | --- | --- |
| `universidade.usuario` | `usuarios` | `cpf` é chave única |
| `universidade.curso` | `cursos` | `idcurso` é gerado por contador |
| `universidade.estudante` | `estudantes` | `mat_estudante` é chave única |
| `universidade.vinculo` | `vinculos` | `idvinculo` é gerado por contador |

A coleção `counters` simula apenas campos equivalentes a `SERIAL`: `idcurso` e `idvinculo`.

As FKs são simuladas na API:

- estudante só aceita `cpf` existente, quando informado
- vínculo só aceita matrícula e curso existentes
- remoções de usuário, curso e estudante atualizam documentos dependentes para `null`, acompanhando o comportamento `ON DELETE SET NULL`

Exemplo de `usuario`:

```json
{
  "cpf": "11111111100",
  "nome": "Maria Silva",
  "data_nascimento": "2000-03-10",
  "email": ["maria@ufs.br"],
  "telefone": ["79999990000"],
  "login": "maria",
  "senha": "senha1"
}
```

Exemplo de `vinculo`:

```json
{
  "idvinculo": 1,
  "mat_estudante": "E100001",
  "curso": 1,
  "data_entrada": "2024-03-01",
  "status": "Ativo",
  "data_saida": null
}
```

## Front-end

A interface possui:

- dashboard com totais gerais
- distribuição de estudantes por curso calculada a partir de `vinculo.curso`
- CRUD de usuários
- CRUD de cursos
- CRUD de estudantes
- CRUD de vínculos
- alternância entre banco relacional e NoSQL

Campos `email` e `telefone` são editados como texto separado por vírgula e enviados para a API como arrays.

## Execução

Instale dependências em cada pasta:

```bash
cd backend && npm install
cd ../backend_noSQL && npm install
cd ../front-end && npm install
```

Configure o PostgreSQL em `backend/.env`:

```env
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=5432
DB_NAME=...
```

Configure o MongoDB em `backend_noSQL/.env`:

```env
MONGO_URI=...
PORT=3002
```

Para trocar a conexão do MongoDB com segurança, não altere `backend_noSQL/src/db.ts`.
Atualize apenas `MONGO_URI` no arquivo `.env` local ou no painel de variáveis de ambiente do serviço onde a API NoSQL está hospedada. O arquivo `.env` é ignorado pelo Git, então a URI, usuário e senha não entram em commit.

Existe um modelo seguro em `backend_noSQL/.env.example`:

```bash
cp backend_noSQL/.env.example backend_noSQL/.env
```

Em deploy, cadastre a nova URI como variável `MONGO_URI` e reinicie o serviço. Assim, quando a instância AWS acadêmica desligar e você subir outra, basta trocar a variável no ambiente.

Para apontar os proxies do Next.js para os backends locais, configure em `front-end/.env.local`:

```env
API_UPSTREAM_URL=http://localhost:3001
API_NOSQL_UPSTREAM_URL=http://localhost:3002
```

Execute os serviços:

```bash
cd backend
npm run dev
```

```bash
cd backend_noSQL
npm run dev
```

```bash
cd front-end
npm run dev
```

Por padrão:

- backend relacional: `http://localhost:3001`
- backend NoSQL: `http://localhost:3002`
- front-end: `http://localhost:3000`

## Validação

```bash
cd backend && npm run build
cd ../backend_noSQL && npm run build
cd ../front-end && npm run lint
cd ../front-end && npm run build
```
