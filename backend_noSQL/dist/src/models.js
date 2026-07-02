"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = exports.Vinculo = exports.Estudante = exports.Usuario = exports.Curso = void 0;
exports.nextSequence = nextSequence;
const mongoose_1 = require("mongoose");
const schemaOptions = {
    versionKey: false,
    toJSON: {
        transform: (_doc, ret) => {
            delete ret._id;
            return ret;
        },
    },
};
const cursoSchema = new mongoose_1.Schema({
    id_curso: { type: Number, required: true, unique: true, index: true },
    nome_curso: { type: String, required: true, trim: true },
    departamento: { type: String, default: null },
}, schemaOptions);
const usuarioSchema = new mongoose_1.Schema({
    id_usuario: { type: Number, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, trim: true },
    senha_hash: { type: String, required: true },
}, schemaOptions);
const estudanteSchema = new mongoose_1.Schema({
    matricula: { type: Number, required: true, unique: true, index: true },
    nome: { type: String, required: true, trim: true },
    id_usuario: { type: Number, required: true, index: true },
    id_curso: { type: Number, required: true, index: true },
}, schemaOptions);
const vinculoSchema = new mongoose_1.Schema({
    id_vinculo: { type: Number, required: true, unique: true, index: true },
    matricula_estudante: { type: Number, required: true, index: true },
    status_vinculo: { type: String, required: true, trim: true },
    data_ingresso: { type: Date, required: true },
}, schemaOptions);
const counterSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
}, { versionKey: false });
exports.Curso = (0, mongoose_1.model)("Curso", cursoSchema, "cursos");
exports.Usuario = (0, mongoose_1.model)("Usuario", usuarioSchema, "usuarios");
exports.Estudante = (0, mongoose_1.model)("Estudante", estudanteSchema, "estudantes");
exports.Vinculo = (0, mongoose_1.model)("Vinculo", vinculoSchema, "vinculos");
exports.Counter = (0, mongoose_1.model)("Counter", counterSchema, "counters");
async function nextSequence(name) {
    const counter = await exports.Counter.findOneAndUpdate({ name }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    return counter.value;
}
