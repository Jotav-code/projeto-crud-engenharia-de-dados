import { config } from "dotenv";
import mongoose from "mongoose";

config();

const MONGO_URI =
  process.env.MONGO_URI ?? "mongodb://54.234.187.26:27017/trabalho_de_dados";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado ao MongoDB com sucesso");
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error);
    process.exit(1);
  }
}
