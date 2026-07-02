import crypto from "crypto";
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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDuplicateKey(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

function normalizeDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

app.post("/cursos", async (req: Request, res: Response) => {
  const { nome_curso, departamento } = req.body;

  if (!nome_curso || nome_curso.trim() === "") {
    return res.status(400).json({ erro: "O campo nome_curso é obrigatório." });
  }

  try {
    const curso = await Curso.create({
      id_curso: await nextSequence("id_curso"),
      nome_curso: nome_curso.trim(),
      departamento: departamento?.trim() || null,
    });

    res.status(201).json(curso.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao criar curso." });
  }
});

app.get("/cursos", async (_req: Request, res: Response) => {
  try {
    const cursos = await Curso.find().sort({ id_curso: 1 });
    res.status(200).json(cursos.map((curso) => curso.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar cursos." });
  }
});

app.put("/cursos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome_curso, departamento } = req.body;

  if (isNaN(Number(id))) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  if (!nome_curso || nome_curso.trim() === "") {
    return res.status(400).json({ erro: "O campo nome_curso é obrigatório." });
  }

  try {
    const curso = await Curso.findOneAndUpdate(
      { id_curso: Number(id) },
      {
        nome_curso: nome_curso.trim(),
        departamento: departamento?.trim() || null,
      },
      { new: true },
    );

    if (!curso) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    res.status(200).json(curso.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao atualizar curso." });
  }
});

app.delete("/cursos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const estudanteVinculado = await Estudante.exists({ id_curso: Number(id) });

    if (estudanteVinculado) {
      return res.status(400).json({
        erro: "Não é possível deletar este curso pois existem estudantes vinculados a ele.",
      });
    }

    const curso = await Curso.findOneAndDelete({ id_curso: Number(id) });

    if (!curso) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar curso." });
  }
});

app.post("/usuarios", async (req: Request, res: Response) => {
  const { email, senha_hash } = req.body;

  if (!email || email.trim() === "" || !senha_hash || senha_hash.trim() === "") {
    return res
      .status(400)
      .json({ erro: "Os campos email e senha_hash são obrigatórios." });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ erro: "Formato de e-mail inválido." });
  }

  if (senha_hash.length < 6) {
    return res
      .status(400)
      .json({ erro: "A senha deve ter no mínimo 6 caracteres." });
  }

  try {
    const password_hash = crypto
      .createHash("sha256")
      .update(senha_hash)
      .digest("hex");

    const usuario = await Usuario.create({
      id_usuario: await nextSequence("id_usuario"),
      email: email.trim(),
      senha_hash: password_hash,
    });

    res.status(201).json(usuario.toJSON());
  } catch (erro) {
    console.error(erro);
    if (isDuplicateKey(erro)) {
      return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
    }
    res.status(500).json({ erro: "Erro ao criar usuário." });
  }
});

app.get("/usuarios", async (_req: Request, res: Response) => {
  try {
    const usuarios = await Usuario.find().sort({ id_usuario: 1 });
    res.status(200).json(usuarios.map((usuario) => usuario.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar usuários." });
  }
});

app.put("/usuarios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, senha_hash } = req.body;

  if (isNaN(Number(id))) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  if (!email || email.trim() === "" || !senha_hash || senha_hash.trim() === "") {
    return res
      .status(400)
      .json({ erro: "Os campos email e senha_hash são obrigatórios." });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ erro: "Formato de e-mail inválido." });
  }

  if (senha_hash.length < 6) {
    return res
      .status(400)
      .json({ erro: "A senha deve ter no mínimo 6 caracteres." });
  }

  try {
    const password_hash = crypto
      .createHash("sha256")
      .update(senha_hash)
      .digest("hex");

    const usuario = await Usuario.findOneAndUpdate(
      { id_usuario: Number(id) },
      { email: email.trim(), senha_hash: password_hash },
      { new: true, runValidators: true },
    );

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(200).json(usuario.toJSON());
  } catch (erro) {
    console.error(erro);
    if (isDuplicateKey(erro)) {
      return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
    }
    res.status(500).json({ erro: "Erro ao atualizar usuário." });
  }
});

app.delete("/usuarios/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const estudanteVinculado = await Estudante.exists({ id_usuario: Number(id) });

    if (estudanteVinculado) {
      return res.status(400).json({
        erro: "Não é possível deletar este usuário pois ele está vinculado a um estudante.",
      });
    }

    const usuario = await Usuario.findOneAndDelete({ id_usuario: Number(id) });

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar usuário." });
  }
});

app.post("/estudantes", async (req: Request, res: Response) => {
  const { matricula, nome, id_usuario, id_curso } = req.body;

  if (!matricula || !nome || nome.trim() === "" || !id_usuario || !id_curso) {
    return res.status(400).json({
      erro: "Todos os campos (matricula, nome, id_usuario, id_curso) são obrigatórios.",
    });
  }

  if (
    isNaN(Number(matricula)) ||
    isNaN(Number(id_usuario)) ||
    isNaN(Number(id_curso))
  ) {
    return res
      .status(400)
      .json({ erro: "A matrícula e os IDs devem ser numéricos." });
  }

  try {
    const [usuario, curso] = await Promise.all([
      Usuario.exists({ id_usuario: Number(id_usuario) }),
      Curso.exists({ id_curso: Number(id_curso) }),
    ]);

    if (!usuario || !curso) {
      return res.status(400).json({
        erro: "Erro de integridade: O id_usuario ou o id_curso informado não existe.",
      });
    }

    const estudante = await Estudante.create({
      matricula: Number(matricula),
      nome: nome.trim(),
      id_usuario: Number(id_usuario),
      id_curso: Number(id_curso),
    });

    res.status(201).json(estudante.toJSON());
  } catch (erro) {
    console.error(erro);
    if (isDuplicateKey(erro)) {
      return res.status(400).json({
        erro: "Erro: Já existe um estudante cadastrado com esta matrícula.",
      });
    }
    res.status(500).json({ erro: "Erro ao cadastrar estudante." });
  }
});

app.get("/estudantes", async (_req: Request, res: Response) => {
  try {
    const estudantes = await Estudante.find().sort({ matricula: 1 });
    res.status(200).json(estudantes.map((estudante) => estudante.toJSON()));
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar estudantes." });
  }
});

app.put("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;
  const { nome, id_usuario, id_curso } = req.body;

  if (isNaN(Number(matricula))) {
    return res.status(400).json({ erro: "A matrícula fornecida é inválida." });
  }

  if (!nome || nome.trim() === "" || !id_usuario || !id_curso) {
    return res.status(400).json({
      erro: "Os campos nome, id_usuario e id_curso são obrigatórios.",
    });
  }

  if (isNaN(Number(id_usuario)) || isNaN(Number(id_curso))) {
    return res
      .status(400)
      .json({ erro: "Os IDs fornecidos devem ser numéricos." });
  }

  try {
    const [usuario, curso] = await Promise.all([
      Usuario.exists({ id_usuario: Number(id_usuario) }),
      Curso.exists({ id_curso: Number(id_curso) }),
    ]);

    if (!usuario || !curso) {
      return res
        .status(400)
        .json({ erro: "O id_usuario ou o id_curso informado não existe." });
    }

    const estudante = await Estudante.findOneAndUpdate(
      { matricula: Number(matricula) },
      {
        nome: nome.trim(),
        id_usuario: Number(id_usuario),
        id_curso: Number(id_curso),
      },
      { new: true },
    );

    if (!estudante) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    res.status(200).json(estudante.toJSON());
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao atualizar estudante." });
  }
});

app.delete("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;

  if (isNaN(Number(matricula))) {
    return res.status(400).json({ erro: "A matrícula fornecida é inválida." });
  }

  try {
    const vinculoAtivo = await Vinculo.exists({
      matricula_estudante: Number(matricula),
    });

    if (vinculoAtivo) {
      return res.status(400).json({
        erro: "Não é possível deletar este estudante pois ele possui vínculos ativos.",
      });
    }

    const estudante = await Estudante.findOneAndDelete({
      matricula: Number(matricula),
    });

    if (!estudante) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar estudante." });
  }
});

app.post("/vinculos", async (req: Request, res: Response) => {
  const { matricula_estudante, status_vinculo, data_ingresso } = req.body;

  if (!matricula_estudante || !status_vinculo || !data_ingresso) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
  }

  if (isNaN(Number(matricula_estudante))) {
    return res
      .status(400)
      .json({ erro: "A matrícula fornecida deve ser numérica." });
  }

  try {
    const estudante = await Estudante.exists({
      matricula: Number(matricula_estudante),
    });

    if (!estudante) {
      return res
        .status(400)
        .json({ erro: "A matricula_estudante informada não existe." });
    }

    const vinculo = await Vinculo.create({
      id_vinculo: await nextSequence("id_vinculo"),
      matricula_estudante: Number(matricula_estudante),
      status_vinculo: status_vinculo.trim(),
      data_ingresso: new Date(data_ingresso),
    });

    res.status(201).json({
      ...vinculo.toJSON(),
      data_ingresso: normalizeDate(vinculo.data_ingresso),
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao criar vínculo." });
  }
});

app.get("/vinculos", async (_req: Request, res: Response) => {
  try {
    const vinculos = await Vinculo.find().sort({ id_vinculo: 1 });
    res.status(200).json(
      vinculos.map((vinculo) => ({
        ...vinculo.toJSON(),
        data_ingresso: normalizeDate(vinculo.data_ingresso),
      })),
    );
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao buscar vínculos." });
  }
});

app.put("/vinculos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { matricula_estudante, status_vinculo, data_ingresso } = req.body;

  if (isNaN(Number(id))) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  if (!matricula_estudante || !status_vinculo || !data_ingresso) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
  }

  if (isNaN(Number(matricula_estudante))) {
    return res
      .status(400)
      .json({ erro: "A matrícula fornecida deve ser numérica." });
  }

  try {
    const estudante = await Estudante.exists({
      matricula: Number(matricula_estudante),
    });

    if (!estudante) {
      return res
        .status(400)
        .json({ erro: "A matricula_estudante informada não existe." });
    }

    const vinculo = await Vinculo.findOneAndUpdate(
      { id_vinculo: Number(id) },
      {
        matricula_estudante: Number(matricula_estudante),
        status_vinculo: status_vinculo.trim(),
        data_ingresso: new Date(data_ingresso),
      },
      { new: true },
    );

    if (!vinculo) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(200).json({
      ...vinculo.toJSON(),
      data_ingresso: normalizeDate(vinculo.data_ingresso),
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao atualizar vínculo." });
  }
});

app.delete("/vinculos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const vinculo = await Vinculo.findOneAndDelete({ id_vinculo: Number(id) });

    if (!vinculo) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar vínculo." });
  }
});

connectDB().then(() => {
  app.listen(port, () => {
    console.log(`Servidor NoSQL ativo na porta ${port}!`);
  });
});
