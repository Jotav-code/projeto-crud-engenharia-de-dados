import { config } from "dotenv";
import mongoose from "mongoose";

config();

mongoose.set("bufferCommands", false);

const MONGO_URI = process.env.MONGO_URI;

export const MONGO_UNAVAILABLE_MESSAGE =
  "Não foi possível acessar o banco NoSQL. O servidor MongoDB hospedado na AWS pode estar desligado, pois a instância foi criada com conta acadêmica e pode ser interrompida automaticamente.";
const MONGO_CONFIG_MESSAGE =
  "Configure a variável de ambiente MONGO_URI para trocar a conexão do MongoDB sem alterar o código. Use backend_noSQL/.env em desenvolvimento ou o painel de variáveis do serviço em produção.";

export async function connectDB() {
  if (!MONGO_URI) {
    console.error(MONGO_CONFIG_MESSAGE);
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 20000,
    });
    console.log("Conectado ao MongoDB com sucesso");
  } catch (error) {
    console.error(`${MONGO_UNAVAILABLE_MESSAGE}\nErro ao conectar ao MongoDB:`, error);
    process.exit(1);
  }
}
