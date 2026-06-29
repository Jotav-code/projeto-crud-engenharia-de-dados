import { Client } from "pg";
import { config } from "dotenv";

//vai carregar as variáveis do .env
config();

const client = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(() => console.log("Conectado ao AWS com sucesso"))
  .catch((err: Error) =>
    console.error("Erro ao conectar no banco:", err.message),
  );

export default client;
