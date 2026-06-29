import express, { Request, Response } from "express";
import client from "./conexao";

const app = express();
app.use(express.json());

app.post("/curso", async (req: Request, res: Response) => {
  const { nome_curso, departamento } = req.body;

  try {
    const query = `INSERT INTO curso (nome_curso,departamento) VALUES($1,$2) RETURNING *`;
    const resultado = await client.query(query, [nome_curso, departamento]);

    res.status(200).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Error ${error}` });
  }
});

app.get("/curso", async (req: Request, res: Response) => {
  try {
    const response = await client.query("SELECT * FROM curso");
    res.status(200).json(response.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao buscar cursos" });
  }
});

app.listen(3000, () => {
  console.log("Server ativo");
});
