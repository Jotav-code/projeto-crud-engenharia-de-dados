import { model, Schema } from "mongoose";

export type UsuarioDocument = {
  _id: string;
  nome: string;
  data_nascimento?: Date | null;
  email?: string[] | null;
  telefone?: string[] | null;
  login?: string | null;
  senha?: string | null;
};

export type CursoDocument = {
  _id: number;
  nome: string;
  grau?: string | null;
  turno: string;
  campus?: string | null;
  nivel?: string | null;
};

export type EstudanteDocument = {
  _id: string;
  cpf?: string | null;
  nome?: string | null;
  data_nascimento?: Date | null;
  login?: string | null;
  senha?: string | null;
  MC?: number | null;
  ano_ingresso?: number | null;
};

export type VinculoDocument = {
  _id: number;
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

const baseSchemaOptions = { versionKey: false } as const;

function withJsonTransform(
  transform: (ret: Record<string, unknown>) => Record<string, unknown>,
) {
  return {
    ...baseSchemaOptions,
    toJSON: {
      transform: (_doc: unknown, ret: Record<string, unknown>) => transform(ret),
    },
  };
}

const usuarioOptions = withJsonTransform((ret) => {
  ret.cpf = ret._id;
  delete ret._id;
  ret.data_nascimento = dateToJSON(ret.data_nascimento);
  return ret;
});

const cursoOptions = withJsonTransform((ret) => {
  ret.idcurso = ret._id;
  delete ret._id;
  return ret;
});

const estudanteOptions = withJsonTransform((ret) => {
  ret.mat_estudante = ret._id;
  ret.mc = ret.MC;
  delete ret._id;
  delete ret.MC;
  ret.data_nascimento = dateToJSON(ret.data_nascimento);
  return ret;
});

const vinculoOptions = withJsonTransform((ret) => {
  ret.idvinculo = ret._id;
  delete ret._id;
  ret.data_entrada = dateToJSON(ret.data_entrada);
  ret.data_saida = dateToJSON(ret.data_saida);
  return ret;
});

const usuarioSchema = new Schema<UsuarioDocument>(
  {
    _id: { type: String, required: true, trim: true },
    nome: { type: String, required: true, trim: true },
    data_nascimento: { type: Date, default: null },
    email: { type: [String], default: [] },
    telefone: { type: [String], default: [] },
    login: { type: String, trim: true, default: null },
    senha: { type: String, trim: true, default: null },
  },
  usuarioOptions,
);

const cursoSchema = new Schema<CursoDocument>(
  {
    _id: { type: Number, required: true },
    nome: { type: String, required: true, trim: true },
    grau: { type: String, default: null },
    turno: { type: String, required: true, trim: true },
    campus: { type: String, default: null },
    nivel: { type: String, default: null },
  },
  cursoOptions,
);

const estudanteSchema = new Schema<EstudanteDocument>(
  {
    _id: { type: String, required: true, trim: true, maxlength: 12 },
    cpf: { type: String, trim: true, default: null },
    nome: { type: String, trim: true, default: null },
    data_nascimento: { type: Date, default: null },
    login: { type: String, trim: true, default: null },
    senha: { type: String, trim: true, default: null },
    MC: { type: Number, default: null },
    ano_ingresso: { type: Number, default: null },
  },
  estudanteOptions,
);

const vinculoSchema = new Schema<VinculoDocument>(
  {
    _id: { type: Number, required: true },
    mat_estudante: { type: String, index: true, trim: true, maxlength: 12, default: null },
    curso: { type: Number, index: true, default: null },
    data_entrada: { type: Date, default: null },
    status: { type: String, trim: true, default: null },
    data_saida: { type: Date, default: null },
  },
  vinculoOptions,
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
