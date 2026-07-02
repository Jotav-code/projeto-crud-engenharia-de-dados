import { config } from "dotenv";
import mongoose from "mongoose";

config();

mongoose.set("bufferCommands", false);

const fallbackMongoUri = "mongodb://34.234.96.38:27017/trabalho_de_dados";
const MONGO_URI = process.env.MONGO_URI ?? fallbackMongoUri;

function getMongoHost(uri: string) {
  try {
    const parsedUri = new URL(uri);
    return parsedUri.host;
  } catch {
    return "URI inválida";
  }
}

export async function connectDB() {
  if (!process.env.MONGO_URI && process.env.NODE_ENV === "production") {
    console.error(
      "A variável MONGO_URI não está configurada no ambiente de produção.",
    );
    process.exit(1);
  }

  try {
    console.log(`Conectando ao MongoDB em ${getMongoHost(MONGO_URI)}...`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 20000,
    });
    console.log("Conectado ao MongoDB com sucesso");
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error);
    process.exit(1);
  }
}
