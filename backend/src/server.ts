import express, { Request, Response } from "express";
import client from "./conexao";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

const schema = "universidade";
const graus = ["Bacharelado", "Licenciatura Plena"] as const;
const turnos = ["Matutino", "Vespertino", "Noturno", "Turno Indefinido"] as const;
const niveis = ["Graduação", "Mestrado", "Doutorado", "Lato"] as const;
const statuses = ["Ativo", "Cancelada", "Formando", "Graduado"] as const;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeLookup(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseEnum<T extends readonly string[]>(value: unknown, allowed: T) {
  const lookup = normalizeLookup(value);
  return allowed.find((item) => normalizeLookup(item) === lookup) ?? null;
}

function parseStringArray(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);
}

function isValidCpf(value: unknown) {
  const text = String(value ?? "").trim();
  return /^\d{1,13}$/.test(text);
}

function isValidMatricula(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 && text.length <= 7;
}

function isPositiveInteger(value: unknown) {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) && Number(text) > 0;
}

function isOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return true;
  }
  return /^-?\d+$/.test(String(value).trim());
}

function isOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return true;
  }
  return Number.isFinite(Number(value));
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return Number(value);
}

function isValidOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  const text = normalizeText(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day)
  );
}

function nullableDate(value: unknown) {
  return value === null || value === undefined || value === "" ? null : normalizeText(value);
}

function pgErrorMessage(erro: any, fallback: string) {
  if (erro.code === "23503") {
    return "Erro de integridade: uma referência informada não existe.";
  }
  if (erro.code === "23505") {
    return "Erro de integridade: já existe um registro com chave única equivalente.";
  }
  if (erro.code === "22P02") {
    return "Valor inválido para um dos tipos do banco.";
  }
  return fallback;
}

app.post("/usuarios", async (req: Request, res: Response) => {
  const { cpf, nome, data_nascimento, email, telefone, login, senha } = req.body;
  const nomeUsuario = normalizeText(nome);
  const emails = parseStringArray(email);
  const telefones = parseStringArray(telefone);

  if (!isValidCpf(cpf) || !nomeUsuario) {
    return res.status(400).json({ erro: "Os campos cpf numérico e nome são obrigatórios." });
  }

  if (!isValidOptionalDate(data_nascimento)) {
    return res.status(400).json({ erro: "A data de nascimento é inválida." });
  }

  if ((email !== null && email !== undefined && email !== "" && !emails) || (telefone !== null && telefone !== undefined && telefone !== "" && !telefones)) {
    return res.status(400).json({ erro: "Email e telefone devem ser arrays de texto." });
  }

  try {
    const resultado = await client.query(
      `INSERT INTO ${schema}.usuario (cpf, nome, data_nascimento, email, telefone, login, senha)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        String(cpf).trim(),
        nomeUsuario,
        nullableDate(data_nascimento),
        emails,
        telefones,
        normalizeNullableText(login),
        normalizeNullableText(senha),
      ],
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao criar usuário.") });
  }
});

app.get("/usuarios", async (_req: Request, res: Response) => {
  try {
    const resultado = await client.query(`SELECT * FROM ${schema}.usuario ORDER BY cpf`);
    res.status(200).json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar usuários." });
  }
});

app.put("/usuarios/:cpf", async (req: Request, res: Response) => {
  const { cpf } = req.params;
  const { nome, data_nascimento, email, telefone, login, senha } = req.body;
  const nomeUsuario = normalizeText(nome);
  const emails = parseStringArray(email);
  const telefones = parseStringArray(telefone);

  if (!isValidCpf(cpf) || !nomeUsuario) {
    return res.status(400).json({ erro: "O CPF deve ser numérico e o nome é obrigatório." });
  }

  if (!isValidOptionalDate(data_nascimento)) {
    return res.status(400).json({ erro: "A data de nascimento é inválida." });
  }

  if ((email !== null && email !== undefined && email !== "" && !emails) || (telefone !== null && telefone !== undefined && telefone !== "" && !telefones)) {
    return res.status(400).json({ erro: "Email e telefone devem ser arrays de texto." });
  }

  try {
    const resultado = await client.query(
      `UPDATE ${schema}.usuario
       SET nome = $1, data_nascimento = $2, email = $3, telefone = $4, login = $5, senha = $6
       WHERE cpf = $7 RETURNING *`,
      [
        nomeUsuario,
        nullableDate(data_nascimento),
        emails,
        telefones,
        normalizeNullableText(login),
        normalizeNullableText(senha),
        cpf,
      ],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao atualizar usuário.") });
  }
});

app.delete("/usuarios/:cpf", async (req: Request, res: Response) => {
  const { cpf } = req.params;

  if (!isValidCpf(cpf)) {
    return res.status(400).json({ erro: "O CPF fornecido é inválido." });
  }

  try {
    const resultado = await client.query(
      `DELETE FROM ${schema}.usuario WHERE cpf = $1 RETURNING cpf`,
      [cpf],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(204).send();
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao deletar usuário.") });
  }
});

app.post("/cursos", async (req: Request, res: Response) => {
  const { nome, grau, turno, campus, nivel } = req.body;
  const nomeCurso = normalizeText(nome);
  const grauCurso = grau === null || grau === undefined || grau === "" ? null : parseEnum(grau, graus);
  const turnoCurso = parseEnum(turno, turnos);
  const nivelCurso = nivel === null || nivel === undefined || nivel === "" ? null : parseEnum(nivel, niveis);
  const campusCurso = normalizeNullableText(campus);

  if (!nomeCurso || !turnoCurso) {
    return res.status(400).json({ erro: "Os campos nome e turno são obrigatórios." });
  }
  if ((grau !== null && grau !== undefined && grau !== "" && !grauCurso) || (nivel !== null && nivel !== undefined && nivel !== "" && !nivelCurso)) {
    return res.status(400).json({ erro: "Grau ou nível inválido." });
  }

  try {
    const duplicado = await client.query(
      `SELECT idcurso FROM ${schema}.curso
       WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))
         AND turno = $2
         AND campus IS NOT DISTINCT FROM $3
         AND nivel IS NOT DISTINCT FROM $4
       LIMIT 1`,
      [nomeCurso, turnoCurso, campusCurso, nivelCurso],
    );

    if (duplicado.rows.length > 0) {
      return res.status(400).json({ erro: "Já existe um curso com nome, turno, campus e nível equivalentes." });
    }

    const resultado = await client.query(
      `INSERT INTO ${schema}.curso (nome, grau, turno, campus, nivel)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nomeCurso, grauCurso, turnoCurso, campusCurso, nivelCurso],
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao criar curso.") });
  }
});

app.get("/cursos", async (_req: Request, res: Response) => {
  try {
    const resultado = await client.query(`SELECT * FROM ${schema}.curso ORDER BY idcurso`);
    res.status(200).json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar cursos." });
  }
});

app.put("/cursos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, grau, turno, campus, nivel } = req.body;
  const nomeCurso = normalizeText(nome);
  const grauCurso = grau === null || grau === undefined || grau === "" ? null : parseEnum(grau, graus);
  const turnoCurso = parseEnum(turno, turnos);
  const nivelCurso = nivel === null || nivel === undefined || nivel === "" ? null : parseEnum(nivel, niveis);
  const campusCurso = normalizeNullableText(campus);

  if (!isPositiveInteger(id) || !nomeCurso || !turnoCurso) {
    return res.status(400).json({ erro: "ID, nome e turno válidos são obrigatórios." });
  }
  if ((grau !== null && grau !== undefined && grau !== "" && !grauCurso) || (nivel !== null && nivel !== undefined && nivel !== "" && !nivelCurso)) {
    return res.status(400).json({ erro: "Grau ou nível inválido." });
  }

  try {
    const duplicado = await client.query(
      `SELECT idcurso FROM ${schema}.curso
       WHERE LOWER(TRIM(nome)) = LOWER(TRIM($1))
         AND turno = $2
         AND campus IS NOT DISTINCT FROM $3
         AND nivel IS NOT DISTINCT FROM $4
         AND idcurso <> $5
       LIMIT 1`,
      [nomeCurso, turnoCurso, campusCurso, nivelCurso, id],
    );

    if (duplicado.rows.length > 0) {
      return res.status(400).json({ erro: "Já existe um curso com nome, turno, campus e nível equivalentes." });
    }

    const resultado = await client.query(
      `UPDATE ${schema}.curso
       SET nome = $1, grau = $2, turno = $3, campus = $4, nivel = $5
       WHERE idcurso = $6 RETURNING *`,
      [nomeCurso, grauCurso, turnoCurso, campusCurso, nivelCurso, id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao atualizar curso.") });
  }
});

app.delete("/cursos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const resultado = await client.query(
      `DELETE FROM ${schema}.curso WHERE idcurso = $1 RETURNING idcurso`,
      [id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    res.status(204).send();
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao deletar curso.") });
  }
});

app.post("/estudantes", async (req: Request, res: Response) => {
  const { mat_estudante, cpf, mc, ano_ingresso } = req.body;

  if (!isValidMatricula(mat_estudante)) {
    return res.status(400).json({ erro: "A matrícula é obrigatória e deve ter no máximo 7 caracteres." });
  }
  if (cpf !== null && cpf !== undefined && cpf !== "" && !isValidCpf(cpf)) {
    return res.status(400).json({ erro: "O CPF deve ser numérico e ter até 13 dígitos." });
  }
  if (!isOptionalNumber(mc) || !isOptionalInteger(ano_ingresso)) {
    return res.status(400).json({ erro: "MC deve ser numérico e ano_ingresso deve ser inteiro." });
  }

  try {
    const resultado = await client.query(
      `INSERT INTO ${schema}.estudante (mat_estudante, cpf, mc, ano_ingresso)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        normalizeText(mat_estudante),
        cpf === null || cpf === undefined || cpf === "" ? null : String(cpf).trim(),
        nullableNumber(mc),
        nullableNumber(ano_ingresso),
      ],
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao cadastrar estudante.") });
  }
});

app.get("/estudantes", async (_req: Request, res: Response) => {
  try {
    const resultado = await client.query(`SELECT * FROM ${schema}.estudante ORDER BY mat_estudante`);
    res.status(200).json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar estudantes." });
  }
});

app.put("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;
  const { cpf, mc, ano_ingresso } = req.body;

  if (!isValidMatricula(matricula)) {
    return res.status(400).json({ erro: "A matrícula fornecida é inválida." });
  }
  if (cpf !== null && cpf !== undefined && cpf !== "" && !isValidCpf(cpf)) {
    return res.status(400).json({ erro: "O CPF deve ser numérico e ter até 13 dígitos." });
  }
  if (!isOptionalNumber(mc) || !isOptionalInteger(ano_ingresso)) {
    return res.status(400).json({ erro: "MC deve ser numérico e ano_ingresso deve ser inteiro." });
  }

  try {
    const resultado = await client.query(
      `UPDATE ${schema}.estudante
       SET cpf = $1, mc = $2, ano_ingresso = $3
       WHERE mat_estudante = $4 RETURNING *`,
      [
        cpf === null || cpf === undefined || cpf === "" ? null : String(cpf).trim(),
        nullableNumber(mc),
        nullableNumber(ano_ingresso),
        matricula,
      ],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao atualizar estudante.") });
  }
});

app.delete("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;

  if (!isValidMatricula(matricula)) {
    return res.status(400).json({ erro: "A matrícula fornecida é inválida." });
  }

  try {
    const resultado = await client.query(
      `DELETE FROM ${schema}.estudante WHERE mat_estudante = $1 RETURNING mat_estudante`,
      [matricula],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    res.status(204).send();
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao deletar estudante.") });
  }
});

app.post("/vinculos", async (req: Request, res: Response) => {
  const { mat_estudante, curso, data_entrada, status, data_saida } = req.body;
  const statusVinculo = parseEnum(status, statuses);

  if (!isValidMatricula(mat_estudante) || !isPositiveInteger(curso) || !statusVinculo) {
    return res.status(400).json({ erro: `Matrícula, curso e status válido são obrigatórios. Status: ${statuses.join(", ")}.` });
  }
  if (!isValidOptionalDate(data_entrada) || !isValidOptionalDate(data_saida)) {
    return res.status(400).json({ erro: "Uma das datas informadas é inválida." });
  }

  try {
    const resultado = await client.query(
      `INSERT INTO ${schema}.vinculo (mat_estudante, curso, data_entrada, status, data_saida)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [normalizeText(mat_estudante), curso, nullableDate(data_entrada), statusVinculo, nullableDate(data_saida)],
    );

    res.status(201).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao criar vínculo.") });
  }
});

app.get("/vinculos", async (_req: Request, res: Response) => {
  try {
    const resultado = await client.query(`SELECT * FROM ${schema}.vinculo ORDER BY idvinculo`);
    res.status(200).json(resultado.rows);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar vínculos." });
  }
});

app.put("/vinculos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mat_estudante, curso, data_entrada, status, data_saida } = req.body;
  const statusVinculo = parseEnum(status, statuses);

  if (!isPositiveInteger(id) || !isValidMatricula(mat_estudante) || !isPositiveInteger(curso) || !statusVinculo) {
    return res.status(400).json({ erro: `ID, matrícula, curso e status válido são obrigatórios. Status: ${statuses.join(", ")}.` });
  }
  if (!isValidOptionalDate(data_entrada) || !isValidOptionalDate(data_saida)) {
    return res.status(400).json({ erro: "Uma das datas informadas é inválida." });
  }

  try {
    const resultado = await client.query(
      `UPDATE ${schema}.vinculo
       SET mat_estudante = $1, curso = $2, data_entrada = $3, status = $4, data_saida = $5
       WHERE idvinculo = $6 RETURNING *`,
      [normalizeText(mat_estudante), curso, nullableDate(data_entrada), statusVinculo, nullableDate(data_saida), id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao atualizar vínculo.") });
  }
});

app.delete("/vinculos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const resultado = await client.query(
      `DELETE FROM ${schema}.vinculo WHERE idvinculo = $1 RETURNING idvinculo`,
      [id],
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(204).send();
  } catch (erro: any) {
    console.error(erro);
    res.status(400).json({ erro: pgErrorMessage(erro, "Erro ao deletar vínculo.") });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
