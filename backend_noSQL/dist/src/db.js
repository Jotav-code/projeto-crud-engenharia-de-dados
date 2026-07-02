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
const MONGO_URI = (_a = process.env.MONGO_URI) !== null && _a !== void 0 ? _a : "mongodb://34.234.96.38:27017/trabalho_de_dados";
async function connectDB() {
    try {
        await mongoose_1.default.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 8000,
            socketTimeoutMS: 20000,
        });
        console.log("Conectado ao MongoDB com sucesso");
    }
    catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error);
        process.exit(1);
    }
}
