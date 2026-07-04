"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = exports.Vinculo = exports.Estudante = exports.Curso = exports.Usuario = void 0;
exports.nextSequence = nextSequence;
const mongoose_1 = require("mongoose");
function dateToJSON(value) {
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}
const schemaOptions = {
    versionKey: false,
    toJSON: {
        transform: (_doc, ret) => {
            delete ret._id;
            delete ret.chave_unica;
            ret.data_nascimento = dateToJSON(ret.data_nascimento);
            ret.data_entrada = dateToJSON(ret.data_entrada);
            ret.data_saida = dateToJSON(ret.data_saida);
            return ret;
        },
    },
};
const usuarioSchema = new mongoose_1.Schema({
    cpf: { type: String, required: true, unique: true, index: true, trim: true },
    nome: { type: String, required: true, trim: true },
    data_nascimento: { type: Date, default: null },
    email: { type: [String], default: null },
    telefone: { type: [String], default: null },
    login: { type: String, trim: true, default: null },
    senha: { type: String, trim: true, default: null },
}, schemaOptions);
const cursoSchema = new mongoose_1.Schema({
    idcurso: { type: Number, required: true, unique: true, index: true },
    nome: { type: String, required: true, trim: true },
    grau: { type: String, default: null },
    turno: { type: String, required: true, trim: true },
    campus: { type: String, default: null },
    nivel: { type: String, default: null },
    chave_unica: { type: String, required: true, unique: true, index: true },
}, schemaOptions);
const estudanteSchema = new mongoose_1.Schema({
    mat_estudante: { type: String, required: true, unique: true, index: true, trim: true },
    cpf: { type: String, trim: true, default: null },
    mc: { type: Number, default: null },
    ano_ingresso: { type: Number, default: null },
}, schemaOptions);
const vinculoSchema = new mongoose_1.Schema({
    idvinculo: { type: Number, required: true, unique: true, index: true },
    mat_estudante: { type: String, index: true, trim: true, default: null },
    curso: { type: Number, index: true, default: null },
    data_entrada: { type: Date, default: null },
    status: { type: String, trim: true, default: null },
    data_saida: { type: Date, default: null },
}, schemaOptions);
const counterSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
}, { versionKey: false });
usuarioSchema.index({ login: 1 }, { unique: true, partialFilterExpression: { login: { $type: "string" } } });
estudanteSchema.index({ cpf: 1 }, { unique: true, partialFilterExpression: { cpf: { $type: "string" } } });
exports.Usuario = (0, mongoose_1.model)("Usuario", usuarioSchema, "usuarios");
exports.Curso = (0, mongoose_1.model)("Curso", cursoSchema, "cursos");
exports.Estudante = (0, mongoose_1.model)("Estudante", estudanteSchema, "estudantes");
exports.Vinculo = (0, mongoose_1.model)("Vinculo", vinculoSchema, "vinculos");
exports.Counter = (0, mongoose_1.model)("Counter", counterSchema, "counters");
async function nextSequence(name) {
    const counter = await exports.Counter.findOneAndUpdate({ name }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    return counter.value;
}
