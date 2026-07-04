"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONGO_UNAVAILABLE_MESSAGE = void 0;
exports.connectDB = connectDB;
const dotenv_1 = require("dotenv");
const mongoose_1 = __importDefault(require("mongoose"));
(0, dotenv_1.config)();
mongoose_1.default.set("bufferCommands", false);
const MONGO_URI = process.env.MONGO_URI;
exports.MONGO_UNAVAILABLE_MESSAGE = "Não foi possível acessar o banco NoSQL. O servidor MongoDB hospedado na AWS pode estar desligado, pois a instância foi criada com conta acadêmica e pode ser interrompida automaticamente.";
const MONGO_CONFIG_MESSAGE = "Configure a variável de ambiente MONGO_URI para trocar a conexão do MongoDB sem alterar o código. Use backend_noSQL/.env em desenvolvimento ou o painel de variáveis do serviço em produção.";
async function connectDB() {
    if (!MONGO_URI) {
        console.error(MONGO_CONFIG_MESSAGE);
        process.exit(1);
    }
    try {
        await mongoose_1.default.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 8000,
            socketTimeoutMS: 20000,
        });
        console.log("Conectado ao MongoDB com sucesso");
    }
    catch (error) {
        console.error(`${exports.MONGO_UNAVAILABLE_MESSAGE}\nErro ao conectar ao MongoDB:`, error);
        process.exit(1);
    }
}
