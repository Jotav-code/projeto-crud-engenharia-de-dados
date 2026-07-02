"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const dotenv_1 = require("dotenv");
const mongoose_1 = __importDefault(require("mongoose"));
(0, dotenv_1.config)();
mongoose_1.default.set("bufferCommands", false);
const fallbackMongoUri = "mongodb://54.234.187.26:27017/trabalho_de_dados";
const MONGO_URI = (_a = process.env.MONGO_URI) !== null && _a !== void 0 ? _a : fallbackMongoUri;
function getMongoHost(uri) {
    try {
        const parsedUri = new URL(uri);
        return parsedUri.host;
    }
    catch (_a) {
        return "URI inválida";
    }
}
async function connectDB() {
    if (!process.env.MONGO_URI && process.env.NODE_ENV === "production") {
        console.error("A variável MONGO_URI não está configurada no ambiente de produção.");
        process.exit(1);
    }
    try {
        console.log(`Conectando ao MongoDB em ${getMongoHost(MONGO_URI)}...`);
        await mongoose_1.default.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 20000,
        });
        console.log("Conectado ao MongoDB com sucesso");
    }
    catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error);
        process.exit(1);
    }
}
