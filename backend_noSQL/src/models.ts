import { model, Schema } from "mongoose";

export type UsuarioDocument = {
  cpf: string;
  nome: string;
  data_nascimento?: Date | null;
  email?: string[] | null;
  telefone?: string[] | null;
  login?: string | null;
  senha?: string | null;
};

export type CursoDocument = {
  idcurso: number;
  nome: string;
  grau?: string | null;
  turno: string;
  campus?: string | null;
  nivel?: string | null;
  chave_unica: string;
};

export type EstudanteDocument = {
  mat_estudante: string;
  cpf?: string | null;
  mc?: number | null;
  ano_ingresso?: number | null;
};

export type VinculoDocument = {
  idvinculo: number;
  mat_estudante?: string | null;
  curso?: number | null;
  data_entrada?: Date | null;
  status?: string | null;
  data_saida?: Date | null;
};

type CounterDocument = {
  name: string;
  value: number;
};

function dateToJSON(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

const schemaOptions = {
  versionKey: false,
  toJSON: {
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret._id;
      delete ret.chave_unica;
      ret.data_nascimento = dateToJSON(ret.data_nascimento);
      ret.data_entrada = dateToJSON(ret.data_entrada);
      ret.data_saida = dateToJSON(ret.data_saida);
      return ret;
    },
  },
} as const;

const usuarioSchema = new Schema<UsuarioDocument>(
  {
    cpf: { type: String, required: true, unique: true, index: true, trim: true },
    nome: { type: String, required: true, trim: true },
    data_nascimento: { type: Date, default: null },
    email: { type: [String], default: null },
    telefone: { type: [String], default: null },
    login: { type: String, trim: true, default: null },
    senha: { type: String, trim: true, default: null },
  },
  schemaOptions,
);

const cursoSchema = new Schema<CursoDocument>(
  {
    idcurso: { type: Number, required: true, unique: true, index: true },
    nome: { type: String, required: true, trim: true },
    grau: { type: String, default: null },
    turno: { type: String, required: true, trim: true },
    campus: { type: String, default: null },
    nivel: { type: String, default: null },
    chave_unica: { type: String, required: true, unique: true, index: true },
  },
  schemaOptions,
);

const estudanteSchema = new Schema<EstudanteDocument>(
  {
    mat_estudante: { type: String, required: true, unique: true, index: true, trim: true },
    cpf: { type: String, trim: true, default: null },
    mc: { type: Number, default: null },
    ano_ingresso: { type: Number, default: null },
  },
  schemaOptions,
);

const vinculoSchema = new Schema<VinculoDocument>(
  {
    idvinculo: { type: Number, required: true, unique: true, index: true },
    mat_estudante: { type: String, index: true, trim: true, default: null },
    curso: { type: Number, index: true, default: null },
    data_entrada: { type: Date, default: null },
    status: { type: String, trim: true, default: null },
    data_saida: { type: Date, default: null },
  },
  schemaOptions,
);

const counterSchema = new Schema<CounterDocument>(
  {
    name: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

usuarioSchema.index(
  { login: 1 },
  { unique: true, partialFilterExpression: { login: { $type: "string" } } },
);

estudanteSchema.index(
  { cpf: 1 },
  { unique: true, partialFilterExpression: { cpf: { $type: "string" } } },
);

export const Usuario = model<UsuarioDocument>("Usuario", usuarioSchema, "usuarios");
export const Curso = model<CursoDocument>("Curso", cursoSchema, "cursos");
export const Estudante = model<EstudanteDocument>(
  "Estudante",
  estudanteSchema,
  "estudantes",
);
export const Vinculo = model<VinculoDocument>("Vinculo", vinculoSchema, "vinculos");
export const Counter = model<CounterDocument>("Counter", counterSchema, "counters");

export async function nextSequence(name: string) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return counter.value;
}
