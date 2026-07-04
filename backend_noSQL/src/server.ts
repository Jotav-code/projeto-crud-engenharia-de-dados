import express, { Request, Response } from "express";
import { connectDB, MONGO_UNAVAILABLE_MESSAGE } from "./db";
import { Curso, Estudante, nextSequence, Usuario, Vinculo } from "./models";

const app = express();
const port = Number(process.env.PORT ?? 3002);

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

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function duplicateMessage(error: unknown, fallback: string) {
  if (isMongoConnectionError(error)) {
    return MONGO_UNAVAILABLE_MESSAGE;
  }

  return isDuplicateKey(error)
    ? "Erro de integridade: já existe um registro com chave única equivalente."
    : fallback;
}

function isMongoConnectionError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { name, message } = error as { name?: string; message?: string };

  return (
    name === "MongoServerSelectionError" ||
    name === "MongooseServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNotConnectedError" ||
    message?.includes("buffering timed out") === true ||
    message?.includes("ECONNREFUSED") === true ||
    message?.includes("ETIMEDOUT") === true ||
    message?.includes("ENOTFOUND") === true
  );
}

function apiErrorMessage(error: unknown, fallback: string) {
  return isMongoConnectionError(error) ? MONGO_UNAVAILABLE_MESSAGE : fallback;
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
  return value === null || value === undefined || value === ""
    ? null
    : new Date(`${normalizeText(value)}T00:00:00.000Z`);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cursoFilter(
  nome: string,
  turno: string,
  campus: string | null,
  nivel: string | null,
  exceptId?: number,
) {
  return {
    nome: new RegExp(`^\\s*${escapeRegex(nome)}\\s*$`, "i"),
    turno,
    campus,
    nivel,
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  };
}

async function nextCollectionId(
  collection: { findOne: () => { sort: (sort: Record<string, 1 | -1>) => { select: (fields: Record<string, 1>) => { lean: () => Promise<{ _id?: unknown } | null> } } } },
  sequenceName: string,
) {
  const [sequenceValue, lastDocument] = await Promise.all([
    nextSequence(sequenceName),
    collection.findOne().sort({ _id: -1 }).select({ _id: 1 }).lean(),
  ]);
  const lastId = typeof lastDocument?._id === "number" ? lastDocument._id : 0;

  return Math.max(sequenceValue, lastId + 1);
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
    const usuario = await Usuario.create({
      _id: String(cpf).trim(),
      nome: nomeUsuario,
      data_nascimento: nullableDate(data_nascimento),
      email: emails,
      telefone: telefones,
      login: normalizeNullableText(login),
      senha: normalizeNullableText(senha),
    });

    res.status(201).json(usuario.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(400).json({ erro: duplicateMessage(erro, "Erro ao criar usuário.") });
  }
});

app.get("/usuarios", async (_req: Request, res: Response) => {
  try {
    const usuarios = await Usuario.find().sort({ _id: 1 });
    res.status(200).json(usuarios.map((usuario) => usuario.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao buscar usuários.") });
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
    const usuario = await Usuario.findOneAndUpdate(
      { _id: cpf },
      {
        nome: nomeUsuario,
        data_nascimento: nullableDate(data_nascimento),
        email: emails,
        telefone: telefones,
        login: normalizeNullableText(login),
        senha: normalizeNullableText(senha),
      },
      { new: true, runValidators: true },
    );

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(200).json(usuario.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(400).json({ erro: duplicateMessage(erro, "Erro ao atualizar usuário.") });
  }
});

app.delete("/usuarios/:cpf", async (req: Request, res: Response) => {
  const { cpf } = req.params;

  if (!isValidCpf(cpf)) {
    return res.status(400).json({ erro: "O CPF fornecido é inválido." });
  }

  try {
    const usuario = await Usuario.findOneAndDelete({ _id: cpf });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    await Estudante.updateMany({ cpf }, { cpf: null });
    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao deletar usuário.") });
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
    const cursoExistente = await Curso.exists(
      cursoFilter(nomeCurso, turnoCurso, campusCurso, nivelCurso),
    );

    if (cursoExistente) {
      return res.status(400).json({ erro: "Já existe um curso com nome, turno, campus e nível equivalentes." });
    }

    const curso = await Curso.create({
      _id: await nextCollectionId(Curso, "idcurso"),
      nome: nomeCurso,
      grau: grauCurso,
      turno: turnoCurso,
      campus: campusCurso,
      nivel: nivelCurso,
    });

    res.status(201).json(curso.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(400).json({ erro: duplicateMessage(erro, "Erro ao criar curso.") });
  }
});

app.get("/cursos", async (_req: Request, res: Response) => {
  try {
    const cursos = await Curso.find().sort({ _id: 1 });
    res.status(200).json(cursos.map((curso) => curso.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao buscar cursos.") });
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
    const cursoExistente = await Curso.exists(
      cursoFilter(nomeCurso, turnoCurso, campusCurso, nivelCurso, Number(id)),
    );

    if (cursoExistente) {
      return res.status(400).json({ erro: "Já existe um curso com nome, turno, campus e nível equivalentes." });
    }

    const curso = await Curso.findOneAndUpdate(
      { _id: Number(id) },
      {
        nome: nomeCurso,
        grau: grauCurso,
        turno: turnoCurso,
        campus: campusCurso,
        nivel: nivelCurso,
      },
      { new: true, runValidators: true },
    );

    if (!curso) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    res.status(200).json(curso.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(400).json({ erro: duplicateMessage(erro, "Erro ao atualizar curso.") });
  }
});

app.delete("/cursos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const curso = await Curso.findOneAndDelete({ _id: Number(id) });

    if (!curso) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    await Vinculo.updateMany({ curso: Number(id) }, { curso: null });
    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao deletar curso.") });
  }
});

app.post("/estudantes", async (req: Request, res: Response) => {
  const { mat_estudante, cpf, mc, ano_ingresso, nome, data_nascimento, login, senha } = req.body;
  const cpfEstudante = cpf === null || cpf === undefined || cpf === "" ? null : String(cpf).trim();

  if (!isValidMatricula(mat_estudante)) {
    return res.status(400).json({ erro: "A matrícula é obrigatória e deve ter no máximo 7 caracteres." });
  }
  if (cpfEstudante && !isValidCpf(cpfEstudante)) {
    return res.status(400).json({ erro: "O CPF deve ser numérico e ter até 13 dígitos." });
  }
  if (!isOptionalNumber(mc) || !isOptionalInteger(ano_ingresso)) {
    return res.status(400).json({ erro: "MC deve ser numérico e ano_ingresso deve ser inteiro." });
  }
  if (!isValidOptionalDate(data_nascimento)) {
    return res.status(400).json({ erro: "A data de nascimento é inválida." });
  }

  try {
    const estudante = await Estudante.create({
      _id: normalizeText(mat_estudante),
      cpf: cpfEstudante,
      nome: normalizeNullableText(nome),
      data_nascimento: nullableDate(data_nascimento),
      login: normalizeNullableText(login),
      senha: normalizeNullableText(senha),
      MC: nullableNumber(mc),
      ano_ingresso: nullableNumber(ano_ingresso),
    });

    res.status(201).json(estudante.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(400).json({ erro: duplicateMessage(erro, "Erro ao cadastrar estudante.") });
  }
});

app.get("/estudantes", async (_req: Request, res: Response) => {
  try {
    const estudantes = await Estudante.find().sort({ _id: 1 });
    res.status(200).json(estudantes.map((estudante) => estudante.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao buscar estudantes.") });
  }
});

app.put("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;
  const { cpf, mc, ano_ingresso, nome, data_nascimento, login, senha } = req.body;
  const cpfEstudante = cpf === null || cpf === undefined || cpf === "" ? null : String(cpf).trim();

  if (!isValidMatricula(matricula)) {
    return res.status(400).json({ erro: "A matrícula fornecida é inválida." });
  }
  if (cpfEstudante && !isValidCpf(cpfEstudante)) {
    return res.status(400).json({ erro: "O CPF deve ser numérico e ter até 13 dígitos." });
  }
  if (!isOptionalNumber(mc) || !isOptionalInteger(ano_ingresso)) {
    return res.status(400).json({ erro: "MC deve ser numérico e ano_ingresso deve ser inteiro." });
  }
  if (!isValidOptionalDate(data_nascimento)) {
    return res.status(400).json({ erro: "A data de nascimento é inválida." });
  }

  try {
    const estudante = await Estudante.findOneAndUpdate(
      { _id: matricula },
      {
        cpf: cpfEstudante,
        ...(nome !== undefined ? { nome: normalizeNullableText(nome) } : {}),
        ...(data_nascimento !== undefined ? { data_nascimento: nullableDate(data_nascimento) } : {}),
        ...(login !== undefined ? { login: normalizeNullableText(login) } : {}),
        ...(senha !== undefined ? { senha: normalizeNullableText(senha) } : {}),
        MC: nullableNumber(mc),
        ano_ingresso: nullableNumber(ano_ingresso),
      },
      { new: true, runValidators: true },
    );

    if (!estudante) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    res.status(200).json(estudante.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(400).json({ erro: duplicateMessage(erro, "Erro ao atualizar estudante.") });
  }
});

app.delete("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;

  if (!isValidMatricula(matricula)) {
    return res.status(400).json({ erro: "A matrícula fornecida é inválida." });
  }

  try {
    const estudante = await Estudante.findOneAndDelete({ _id: matricula });

    if (!estudante) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    await Vinculo.updateMany({ mat_estudante: matricula }, { mat_estudante: null });
    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao deletar estudante.") });
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
    const [estudante, cursoEncontrado] = await Promise.all([
      Estudante.exists({ _id: normalizeText(mat_estudante) }),
      Curso.exists({ _id: Number(curso) }),
    ]);

    if (!estudante || !cursoEncontrado) {
      return res.status(400).json({ erro: "Erro de integridade: estudante ou curso informado não existe." });
    }

    const vinculo = await Vinculo.create({
      _id: await nextCollectionId(Vinculo, "idvinculo"),
      mat_estudante: normalizeText(mat_estudante),
      curso: Number(curso),
      data_entrada: nullableDate(data_entrada),
      status: statusVinculo,
      data_saida: nullableDate(data_saida),
    });

    res.status(201).json(vinculo.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao criar vínculo.") });
  }
});

app.get("/vinculos", async (_req: Request, res: Response) => {
  try {
    const vinculos = await Vinculo.find().sort({ _id: 1 });
    res.status(200).json(vinculos.map((vinculo) => vinculo.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao buscar vínculos.") });
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
    const [estudante, cursoEncontrado] = await Promise.all([
      Estudante.exists({ _id: normalizeText(mat_estudante) }),
      Curso.exists({ _id: Number(curso) }),
    ]);

    if (!estudante || !cursoEncontrado) {
      return res.status(400).json({ erro: "Erro de integridade: estudante ou curso informado não existe." });
    }

    const vinculo = await Vinculo.findOneAndUpdate(
      { _id: Number(id) },
      {
        mat_estudante: normalizeText(mat_estudante),
        curso: Number(curso),
        data_entrada: nullableDate(data_entrada),
        status: statusVinculo,
        data_saida: nullableDate(data_saida),
      },
      { new: true, runValidators: true },
    );

    if (!vinculo) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(200).json(vinculo.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao atualizar vínculo.") });
  }
});

app.delete("/vinculos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const vinculo = await Vinculo.findOneAndDelete({ _id: Number(id) });

    if (!vinculo) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: apiErrorMessage(erro, "Erro ao deletar vínculo.") });
  }
});

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor NoSQL rodando na porta ${port}`);
    });
  })
  .catch((erro) => {
    console.error("Falha ao iniciar servidor NoSQL:", erro);
    process.exit(1);
  });
