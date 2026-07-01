import express, { Request, Response } from "express";
import client from "./conexao";
import crypto from "crypto";

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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post("/cursos", async (req: Request, res: Response) => {
  const { nome_curso, departamento } = req.body;

  if (!nome_curso || nome_curso.trim() === "") {
    return res.status(400).json({ erro: "O campo nome_curso é obrigatório." });
  }

  try {
    const query = `INSERT INTO curso (nome_curso, departamento) VALUES($1, $2) RETURNING *`;
    const resultado = await client.query(query, [nome_curso, departamento]);

    res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao criar curso." });
  }
});

app.get("/cursos", async (req: Request, res: Response) => {
  try {
    const response = await client.query("SELECT * FROM curso");
    res.status(200).json(response.rows);
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
    const query =
      "UPDATE curso SET nome_curso = $1, departamento = $2 WHERE id_curso = $3 RETURNING *";
    const resultado = await client.query(query, [nome_curso, departamento, id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
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
    const query = "DELETE FROM curso WHERE id_curso = $1 RETURNING *";
    const resultado = await client.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Curso não encontrado." });
    }

    res.status(204).send();
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23503") {
      return res.status(400).json({
        erro: "Não é possível deletar este curso pois existem estudantes vinculados a ele.",
      });
    }
    res.status(500).json({ erro: "Erro ao deletar curso." });
  }
});

app.post("/usuarios", async (req: Request, res: Response) => {
  const { email, senha_hash } = req.body;

  if (
    !email ||
    email.trim() === "" ||
    !senha_hash ||
    senha_hash.trim() === ""
  ) {
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

    const query = `INSERT INTO usuario (email, senha_hash) VALUES($1, $2) RETURNING id_usuario, email, senha_hash`;
    const resultado = await client.query(query, [email, password_hash]);

    res.status(201).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23505") {
      return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
    }
    res.status(500).json({ erro: "Erro ao criar usuário." });
  }
});

app.get("/usuarios", async (req: Request, res: Response) => {
  try {
    const response = await client.query(
      "SELECT id_usuario, email, senha_hash FROM usuario",
    );
    res.status(200).json(response.rows);
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

  if (
    !email ||
    email.trim() === "" ||
    !senha_hash ||
    senha_hash.trim() === ""
  ) {
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

    const query =
      "UPDATE usuario SET email = $1, senha_hash = $2 WHERE id_usuario = $3 RETURNING id_usuario, email, senha_hash";
    const resultado = await client.query(query, [email, password_hash, id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23505") {
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
    const query =
      "DELETE FROM usuario WHERE id_usuario = $1 RETURNING id_usuario, email";
    const resultado = await client.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado." });
    }

    res.status(204).send();
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23503") {
      return res.status(400).json({
        erro: "Não é possível deletar este usuário pois ele está vinculado a um estudante.",
      });
    }
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
    const query =
      "INSERT INTO estudante (matricula, nome, id_usuario, id_curso) VALUES ($1, $2, $3, $4) RETURNING *";
    const resultado = await client.query(query, [
      matricula,
      nome,
      id_usuario,
      id_curso,
    ]);

    res.status(201).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23503") {
      return res.status(400).json({
        erro: "Erro de integridade: O id_usuario ou o id_curso informado não existe.",
      });
    }
    if (erro.code === "23505") {
      return res.status(400).json({
        erro: "Erro: Já existe um estudante cadastrado com esta matrícula.",
      });
    }
    res.status(500).json({ erro: "Erro ao cadastrar estudante." });
  }
});

app.get("/estudantes", async (req: Request, res: Response) => {
  try {
    const resultado = await client.query("SELECT * FROM estudante");
    res.status(200).json(resultado.rows);
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
    const query =
      "UPDATE estudante SET nome = $1, id_usuario = $2, id_curso = $3 WHERE matricula = $4 RETURNING *";
    const resultado = await client.query(query, [
      nome,
      id_usuario,
      id_curso,
      matricula,
    ]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23503") {
      return res
        .status(400)
        .json({ erro: "O id_usuario ou o id_curso informado não existe." });
    }
    res.status(500).json({ erro: "Erro ao atualizar estudante." });
  }
});

app.delete("/estudantes/:matricula", async (req: Request, res: Response) => {
  const { matricula } = req.params;

  if (isNaN(Number(matricula))) {
    return res.status(400).json({ erro: "A matrícula fornecida é inválida." });
  }

  try {
    const query = "DELETE FROM estudante WHERE matricula = $1 RETURNING *";
    const resultado = await client.query(query, [matricula]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Estudante não encontrado." });
    }

    res.status(204).send();
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23503") {
      return res.status(400).json({
        erro: "Não é possível deletar este estudante pois ele possui vínculos ativos.",
      });
    }
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
    const query =
      "INSERT INTO vinculo (matricula_estudante, status_vinculo, data_ingresso) VALUES ($1, $2, $3) RETURNING *";
    const resultado = await client.query(query, [
      matricula_estudante,
      status_vinculo,
      data_ingresso,
    ]);

    res.status(201).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23503") {
      return res
        .status(400)
        .json({ erro: "A matricula_estudante informada não existe." });
    }
    res.status(500).json({ erro: "Erro ao criar vínculo." });
  }
});

app.get("/vinculos", async (req: Request, res: Response) => {
  try {
    const resultado = await client.query("SELECT * FROM vinculo");
    res.status(200).json(resultado.rows);
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
    const query =
      "UPDATE vinculo SET matricula_estudante = $1, status_vinculo = $2, data_ingresso = $3 WHERE id_vinculo = $4 RETURNING *";
    const resultado = await client.query(query, [
      matricula_estudante,
      status_vinculo,
      data_ingresso,
      id,
    ]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(200).json(resultado.rows[0]);
  } catch (erro: any) {
    console.error(erro);
    if (erro.code === "23503") {
      return res
        .status(400)
        .json({ erro: "A matricula_estudante informada não existe." });
    }
    res.status(500).json({ erro: "Erro ao atualizar vínculo." });
  }
});

app.delete("/vinculos/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (isNaN(Number(id))) {
    return res.status(400).json({ erro: "O ID fornecido é inválido." });
  }

  try {
    const query = "DELETE FROM vinculo WHERE id_vinculo = $1 RETURNING *";
    const resultado = await client.query(query, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Vínculo não encontrado." });
    }

    res.status(204).send();
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: "Erro ao deletar vínculo." });
  }
});

app.listen(3000, () => {
  console.log("Servidor ativo na porta 3000!");
});
