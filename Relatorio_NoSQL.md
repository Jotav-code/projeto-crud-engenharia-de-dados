# Relatório NoSQL

## 1. Objetivo

Este relatório descreve como o banco relacional definido em `codigo.sql`, no schema PostgreSQL `universidade`, foi mapeado para um banco NoSQL em MongoDB. O projeto mantém duas APIs equivalentes: uma relacional, em `backend`, e uma NoSQL, em `backend_noSQL`. A interface do front-end consome as duas versões para permitir comparação entre os modelos.

O CRUD implementado na aplicação trabalha diretamente com quatro entidades principais:

- `usuario`
- `curso`
- `estudante`
- `vinculo`

As demais tabelas do modelo relacional, como `professor`, `departamento`, `disciplina`, `turma`, `plano`, `projeto`, `leciona`, `cursa` e `alocacao`, aparecem no script de carga NoSQL (`codigoNoSQL.txt`) para representar o domínio acadêmico completo, mas não possuem rotas CRUD na API atual.

## 2. Modelo relacional de origem

No banco relacional, os dados são organizados em tabelas com chaves primárias, chaves estrangeiras, domínios, tipos enumerados e restrições declaradas diretamente no PostgreSQL.

Exemplos de regras do modelo relacional:

- `usuario.cpf` é a chave primária.
- `curso.idCurso` é gerado automaticamente por `SERIAL`.
- `estudante.mat_estudante` é a chave primária.
- `vinculo.idVinculo` é gerado automaticamente por `SERIAL`.
- `vinculo.mat_estudante` referencia `estudante.mat_estudante`.
- `vinculo.curso` referencia `curso.idCurso`.
- `curso` possui unicidade na combinação `nome`, `turno`, `campus` e `nivel`.
- Alguns campos usam enums, como `status_estudante`, `tipo_grau`, `tipo_nivel` e `tipo_turno`.

No PostgreSQL, parte importante da integridade é garantida pelo próprio SGBD. No MongoDB, essas garantias precisaram ser representadas por schemas Mongoose, índices e validações na API.

## 3. Estratégia de mapeamento para MongoDB

O mapeamento adotado foi baseado em coleções equivalentes às tabelas principais, preservando os identificadores originais sempre que possível. Como o MongoDB trabalha com documentos, as chaves primárias relacionais foram mapeadas para o campo `_id` das coleções.

| Modelo relacional | Modelo NoSQL | Chave no MongoDB | Observação |
| --- | --- | --- | --- |
| `universidade.usuario` | `usuarios` | `_id = cpf` | O CPF foi usado como identificador natural do usuário. |
| `universidade.curso` | `cursos` | `_id = idCurso` | O identificador numérico é mantido. |
| `universidade.estudante` | `estudantes` | `_id = mat_estudante` | A matrícula foi usada como identificador natural. |
| `universidade.vinculo` | `vinculos` | `_id = idVinculo` | O identificador numérico é mantido. |
| `SERIAL` do PostgreSQL | `counters` | `name` | Coleção auxiliar para simular sequências. |

Essa escolha preserva a compatibilidade com o front-end e com as rotas REST, porque a API NoSQL devolve os dados com nomes equivalentes aos do backend relacional. Por exemplo, internamente o MongoDB usa `_id`, mas a resposta JSON transforma `_id` em `cpf`, `idcurso`, `mat_estudante` ou `idvinculo`, conforme a entidade.

## 4. Desnormalização e referências

O mapeamento misturou duas estratégias comuns em bancos de documentos:

- incorporação ou achatamento de dados quando isso simplifica a leitura;
- manutenção de referências quando a entidade tem ciclo de vida próprio.

Na coleção `usuarios`, os dados básicos de usuário foram armazenados diretamente no documento. No script `codigoNoSQL.txt`, professores também aparecem dentro da coleção `usuarios`, usando campos como `perfil`, `mat_professor`, `departamento`, `formacao`, `tipo_jornada_trabalho` e `salario`. Isso reduz a necessidade de consultar `usuario` e `professor` separadamente para obter dados de um professor.

Exemplo de documento NoSQL para professor:

```javascript
{
  _id: "11111111100",
  nome: "Prof A",
  data_nascimento: new Date("1980-03-05"),
  email: ["profA@email.com"],
  telefone: ["99998888", "88889999"],
  login: "profa",
  senha: "senha1",
  perfil: "professor",
  mat_professor: "P100",
  departamento: "DCOMP",
  formacao: "Doutorado",
  tipo_jornada_trabalho: "20h",
  salario: 2000
}
```

Já entidades como `vinculos` continuam usando referências por identificador:

```javascript
{
  _id: 1,
  mat_estudante: "E101",
  curso: 3,
  data_entrada: null,
  status: "Ativo",
  data_saida: null
}
```

Nesse caso, `mat_estudante` aponta para a coleção `estudantes` e `curso` aponta para a coleção `cursos`. A decisão de manter referências evita duplicação de dados de curso e estudante em cada vínculo.

## 5. Mapeamento das principais entidades

### 5.1 Usuários

No relacional, a tabela `universidade.usuario` possui `cpf`, `nome`, `data_nascimento`, `email`, `telefone`, `login` e `senha`.

No MongoDB, a coleção `usuarios` usa:

- `_id` para armazenar o CPF;
- `email` e `telefone` como arrays de strings;
- `data_nascimento` como `Date`;
- índice único parcial em `login`, quando o login existe.

No retorno da API, o campo `_id` é convertido para `cpf`.

### 5.2 Cursos

No relacional, `universidade.curso` usa `idCurso SERIAL` e possui restrição única para a combinação `nome`, `turno`, `campus` e `nivel`.

No MongoDB, a coleção `cursos` usa:

- `_id` numérico equivalente ao `idCurso`;
- campos `nome`, `grau`, `turno`, `campus` e `nivel`;
- validação na API para impedir duplicidade da combinação `nome`, `turno`, `campus` e `nivel`;
- coleção `counters` para gerar o próximo identificador.

### 5.3 Estudantes

No relacional, `universidade.estudante` possui `mat_estudante`, `cpf`, `MC` e `ano_ingresso`. O CPF referencia `usuario.cpf`.

No MongoDB, a coleção `estudantes` usa:

- `_id` como matrícula;
- `cpf` como referência ao usuário;
- `MC` como número;
- `ano_ingresso` como número;
- índice único parcial em `cpf`, quando o CPF existe.

No retorno da API, `_id` é convertido para `mat_estudante` e `MC` é convertido para `mc`, mantendo o formato usado pelo front-end.

### 5.4 Vínculos

No relacional, `universidade.vinculo` liga estudante e curso por chaves estrangeiras.

No MongoDB, a coleção `vinculos` usa:

- `_id` numérico equivalente ao `idVinculo`;
- `mat_estudante` como referência à coleção `estudantes`;
- `curso` como referência à coleção `cursos`;
- `status` como texto validado pela API;
- datas armazenadas como `Date`.

Antes de inserir ou atualizar um vínculo, a API consulta se o estudante e o curso existem. Dessa forma, a integridade que era feita por chave estrangeira no PostgreSQL passa a ser garantida pela camada de aplicação.

## 6. Tratamento das restrições

No banco relacional, restrições como `PRIMARY KEY`, `UNIQUE`, `FOREIGN KEY`, `CHECK` e `ENUM` são declaradas no schema SQL. No MongoDB, nem todas essas restrições existem nativamente da mesma forma. Por isso, o projeto usa três mecanismos:

- `_id` do MongoDB para representar chaves primárias.
- Índices únicos do Mongoose para regras como login único e CPF único de estudante.
- Validações na API Express para formatos, enums, datas e existência de documentos relacionados.

Principais restrições implementadas no backend NoSQL:

- CPF deve conter exatamente 11 dígitos.
- Matrícula deve ter no máximo 12 caracteres.
- `usuario.nome` é obrigatório.
- `curso.nome` e `curso.turno` são obrigatórios.
- `curso.grau` aceita apenas `Bacharelado` ou `Licenciatura Plena`.
- `curso.turno` aceita apenas `Matutino`, `Vespertino`, `Noturno` ou `Turno Indefinido`.
- `curso.nivel` aceita apenas `Graduação`, `Mestrado`, `Doutorado` ou `Lato`.
- `vinculo.status` aceita apenas `Ativo`, `Cancelada`, `Formando` ou `Graduado`.
- Datas devem seguir o formato `YYYY-MM-DD`.
- Um vínculo só pode ser criado se o estudante e o curso existirem.
- Ao excluir um usuário, o CPF dos estudantes relacionados é atualizado para `null`, simulando `ON DELETE SET NULL`.
- Ao excluir um curso, os vínculos relacionados têm `curso` atualizado para `null`.
- Ao excluir um estudante, os vínculos relacionados têm `mat_estudante` atualizado para `null`.

## 7. Exemplo de coleção e suas restrições/proteções

Um exemplo direto é a coleção `cursos`, que foi criada para representar a tabela relacional `universidade.curso`.

No MongoDB, um documento dessa coleção possui a seguinte estrutura:

```javascript
{
  _id: 1,
  nome: "Ciência da Computação",
  grau: "Bacharelado",
  turno: "Vespertino",
  campus: "São Cristóvão",
  nivel: "Graduação"
}
```

Essa coleção tem as seguintes proteções no backend NoSQL:

- `_id` funciona como chave primária do documento, equivalente ao `idCurso` do PostgreSQL.
- `nome` é obrigatório.
- `turno` é obrigatório.
- `grau` só aceita valores equivalentes a `Bacharelado` ou `Licenciatura Plena`.
- `turno` só aceita `Matutino`, `Vespertino`, `Noturno` ou `Turno Indefinido`.
- `nivel` só aceita `Graduação`, `Mestrado`, `Doutorado` ou `Lato`.
- A combinação `nome + turno + campus + nivel` não pode se repetir.

No schema Mongoose, parte da proteção aparece na definição dos campos:

```typescript
const cursoSchema = new Schema<CursoDocument>(
  {
    _id: { type: Number, required: true },
    nome: { type: String, required: true, trim: true },
    grau: { type: String, default: null },
    turno: { type: String, required: true, trim: true },
    campus: { type: String, default: null },
    nivel: { type: String, default: null },
  },
  cursoOptions,
);
```

Além disso, a API protege os valores de enum antes de salvar:

```typescript
const graus = ["Bacharelado", "Licenciatura Plena"] as const;
const turnos = ["Matutino", "Vespertino", "Noturno", "Turno Indefinido"] as const;
const niveis = ["Graduação", "Mestrado", "Doutorado", "Lato"] as const;

const grauCurso = grau === null || grau === undefined || grau === ""
  ? null
  : parseEnum(grau, graus);
const turnoCurso = parseEnum(turno, turnos);
const nivelCurso = nivel === null || nivel === undefined || nivel === ""
  ? null
  : parseEnum(nivel, niveis);
```

Essa validação impede que sejam gravados cursos com turno, grau ou nível fora dos valores aceitos no modelo relacional.

## 8. Exemplo de script NoSQL e sua restrição

O trecho abaixo representa a criação de um curso no MongoDB. Ele equivale a uma inserção na tabela relacional `universidade.curso`.

```javascript
db.cursos.insertOne({
  _id: 1,
  nome: "Ciência da Computação",
  grau: "Bacharelado",
  turno: "Vespertino",
  campus: "São Cristóvão",
  nivel: "Graduação"
});
```

No modelo relacional, a tabela `curso` possui a seguinte restrição:

```sql
CONSTRAINT uq_curso UNIQUE(nome, turno, campus, nivel)
```

No MongoDB, essa restrição não foi deixada apenas para o banco. A API NoSQL verifica antes da inserção se já existe um curso equivalente:

```typescript
const cursoExistente = await Curso.exists(
  cursoFilter(nomeCurso, turnoCurso, campusCurso, nivelCurso),
);

if (cursoExistente) {
  return res.status(400).json({
    erro: "Já existe um curso com nome, turno, campus e nível equivalentes.",
  });
}
```

Essa validação impede a criação de dois cursos com o mesmo `nome`, `turno`, `campus` e `nivel`, reproduzindo na aplicação a regra que no PostgreSQL era garantida por `UNIQUE`. Portanto, a proteção dessa coleção não depende apenas do formato do documento: ela também depende das verificações feitas pela API antes de executar o `Curso.create`.

## 9. Exemplo de integridade referencial

O trecho abaixo cria um vínculo entre estudante e curso:

```javascript
db.vinculos.insertOne({
  _id: 1,
  mat_estudante: "E101",
  curso: 3,
  data_entrada: null,
  status: "Ativo",
  data_saida: null
});
```

No PostgreSQL, `mat_estudante` e `curso` são chaves estrangeiras. No MongoDB, a API verifica manualmente a existência dos documentos:

```typescript
const [estudante, cursoEncontrado] = await Promise.all([
  Estudante.exists({ _id: normalizeMatricula(mat_estudante) }),
  Curso.exists({ _id: Number(curso) }),
]);

if (!estudante || !cursoEncontrado) {
  return res.status(400).json({
    erro: "Erro de integridade: estudante ou curso informado não existe.",
  });
}
```

A restrição desse script é que ele só pode ser executado corretamente se já existirem:

- um documento em `estudantes` com `_id: "E101"`;
- um documento em `cursos` com `_id: 3`;
- um status válido dentro do conjunto permitido.

## 10. Limitações do mapeamento

O mapeamento para MongoDB mantém a estrutura necessária para o CRUD da aplicação, mas algumas garantias deixam de ser responsabilidade exclusiva do banco e passam para a API. Isso significa que operações feitas diretamente no MongoDB, sem passar pela API, podem inserir documentos que violam regras de negócio, como referências inexistentes ou valores fora dos enums.

Outra limitação é que o MongoDB não executa `JOINs` automaticamente como o PostgreSQL. Quando uma tela precisa combinar estudante, curso e vínculo, essa combinação deve ser feita pela aplicação ou por consultas de agregação. O projeto atual opta por manter documentos separados e resolver as relações por identificadores, o que simplifica o CRUD e mantém o comportamento próximo ao modelo relacional original.

## 11. Conclusão

O banco NoSQL foi construído a partir do modelo relacional preservando as entidades principais, suas chaves e suas relações. As chaves primárias foram mapeadas para `_id`, os campos multivalorados foram mantidos como arrays, os identificadores automáticos foram simulados com a coleção `counters` e as chaves estrangeiras foram representadas por referências simples.

A principal mudança está na forma de garantir integridade. No PostgreSQL, grande parte das regras está no schema. No MongoDB, o projeto distribui essas regras entre schemas Mongoose, índices e validações da API. Essa abordagem permite manter o mesmo comportamento funcional do CRUD, ao mesmo tempo em que adapta o modelo para o paradigma de documentos.
