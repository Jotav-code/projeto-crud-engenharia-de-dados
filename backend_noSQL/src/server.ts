import express, { Request, Response } from "express";
import { connectDB } from "./db";
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
  return isDuplicateKey(error)
    ? "Erro de integridade: já existe um registro com chave única equivalente."
    : fallback;
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

function cursoKey(nome: string, turno: string, campus: string | null, nivel: string | null) {
  return [nome, turno, campus ?? "", nivel ?? ""]
    .map((item) => normalizeLookup(item))
    .join("|");
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
      cpf: String(cpf).trim(),
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
    const usuarios = await Usuario.find().sort({ cpf: 1 });
    res.status(200).json(usuarios.map((usuario) => usuario.toJSON()));
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
    const usuario = await Usuario.findOneAndUpdate(
      { cpf },
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
    const usuario = await Usuario.findOneAndDelete({ cpf });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    await Estudante.updateMany({ cpf }, { cpf: null });
    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar usuário." });
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
    const curso = await Curso.create({
      idcurso: await nextSequence("idcurso"),
      nome: nomeCurso,
      grau: grauCurso,
      turno: turnoCurso,
      campus: campusCurso,
      nivel: nivelCurso,
      chave_unica: cursoKey(nomeCurso, turnoCurso, campusCurso, nivelCurso),
    });

    res.status(201).json(curso.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(400).json({ erro: duplicateMessage(erro, "Erro ao criar curso.") });
  }
});

app.get("/cursos", async (_req: Request, res: Response) => {
  try {
    const cursos = await Curso.find().sort({ idcurso: 1 });
    res.status(200).json(cursos.map((curso) => curso.toJSON()));
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
    const curso = await Curso.findOneAndUpdate(
      { idcurso: Number(id) },
      {
        nome: nomeCurso,
        grau: grauCurso,
        turno: turnoCurso,
        campus: campusCurso,
        nivel: nivelCurso,
        chave_unica: cursoKey(nomeCurso, turnoCurso, campusCurso, nivelCurso),
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
    const curso = await Curso.findOneAndDelete({ idcurso: Number(id) });

    if (!curso) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    await Vinculo.updateMany({ curso: Number(id) }, { curso: null });
    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar curso." });
  }
});

app.post("/estudantes", async (req: Request, res: Response) => {
  const { mat_estudante, cpf, mc, ano_ingresso } = req.body;
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

  try {
    if (cpfEstudante) {
      const usuario = await Usuario.exists({ cpf: cpfEstudante });
      if (!usuario) {
        return res.status(400).json({ erro: "Erro de integridade: o CPF informado não existe em usuários." });
      }
    }

    const estudante = await Estudante.create({
      mat_estudante: normalizeText(mat_estudante),
      cpf: cpfEstudante,
      mc: nullableNumber(mc),
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
    const estudantes = await Estudante.find().sort({ mat_estudante: 1 });
    res.status(200).json(estudantes.map((estudante) => estudante.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar estudantes." });
  }
});

app.put("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;
  const { cpf, mc, ano_ingresso } = req.body;
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

  try {
    if (cpfEstudante) {
      const usuario = await Usuario.exists({ cpf: cpfEstudante });
      if (!usuario) {
        return res.status(400).json({ erro: "Erro de integridade: o CPF informado não existe em usuários." });
      }
    }

    const estudante = await Estudante.findOneAndUpdate(
      { mat_estudante: matricula },
      {
        cpf: cpfEstudante,
        mc: nullableNumber(mc),
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
    const estudante = await Estudante.findOneAndDelete({ mat_estudante: matricula });

    if (!estudante) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    await Vinculo.updateMany({ mat_estudante: matricula }, { mat_estudante: null });
    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar estudante." });
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
      Estudante.exists({ mat_estudante: normalizeText(mat_estudante) }),
      Curso.exists({ idcurso: Number(curso) }),
    ]);

    if (!estudante || !cursoEncontrado) {
      return res.status(400).json({ erro: "Erro de integridade: estudante ou curso informado não existe." });
    }

    const vinculo = await Vinculo.create({
      idvinculo: await nextSequence("idvinculo"),
      mat_estudante: normalizeText(mat_estudante),
      curso: Number(curso),
      data_entrada: nullableDate(data_entrada),
      status: statusVinculo,
      data_saida: nullableDate(data_saida),
    });

    res.status(201).json(vinculo.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao criar vínculo." });
  }
});

app.get("/vinculos", async (_req: Request, res: Response) => {
  try {
    const vinculos = await Vinculo.find().sort({ idvinculo: 1 });
    res.status(200).json(vinculos.map((vinculo) => vinculo.toJSON()));
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
    const [estudante, cursoEncontrado] = await Promise.all([
      Estudante.exists({ mat_estudante: normalizeText(mat_estudante) }),
      Curso.exists({ idcurso: Number(curso) }),
    ]);

    if (!estudante || !cursoEncontrado) {
      return res.status(400).json({ erro: "Erro de integridade: estudante ou curso informado não existe." });
    }

    const vinculo = await Vinculo.findOneAndUpdate(
      { idvinculo: Number(id) },
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
    res.status(500).json({ erro: "Erro ao atualizar vínculo." });
  }
});

app.delete("/vinculos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isPositiveInteger(id)) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const vinculo = await Vinculo.findOneAndDelete({ idvinculo: Number(id) });

    if (!vinculo) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar vínculo." });
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
