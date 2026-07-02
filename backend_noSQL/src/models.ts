import { model, Schema } from "mongoose";

export type CursoDocument = {
  id_curso: number;
  nome_curso: string;
  departamento?: string | null;
};

export type UsuarioDocument = {
  id_usuario: number;
  email: string;
  senha_hash: string;
};

export type EstudanteDocument = {
  matricula: number;
  nome: string;
  id_usuario: number;
  id_curso: number;
};

export type VinculoDocument = {
  id_vinculo: number;
  matricula_estudante: number;
  status_vinculo: string;
  data_ingresso: Date;
};

type CounterDocument = {
  name: string;
  value: number;
};

const schemaOptions = {
  versionKey: false,
  toJSON: {
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      delete ret._id;
      return ret;
    },
  },
} as const;

const cursoSchema = new Schema<CursoDocument>(
  {
    id_curso: { type: Number, required: true, unique: true, index: true },
    nome_curso: { type: String, required: true, trim: true },
    departamento: { type: String, default: null },
  },
  schemaOptions,
);

const usuarioSchema = new Schema<UsuarioDocument>(
  {
    id_usuario: { type: Number, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, trim: true },
    senha_hash: { type: String, required: true },
  },
  schemaOptions,
);

const estudanteSchema = new Schema<EstudanteDocument>(
  {
    matricula: { type: Number, required: true, unique: true, index: true },
    nome: { type: String, required: true, trim: true },
    id_usuario: { type: Number, required: true, index: true },
    id_curso: { type: Number, required: true, index: true },
  },
  schemaOptions,
);

const vinculoSchema = new Schema<VinculoDocument>(
  {
    id_vinculo: { type: Number, required: true, unique: true, index: true },
    matricula_estudante: { type: Number, required: true, index: true },
    status_vinculo: { type: String, required: true, trim: true },
    data_ingresso: { type: Date, required: true },
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

export const Curso = model<CursoDocument>("Curso", cursoSchema, "cursos");
export const Usuario = model<UsuarioDocument>("Usuario", usuarioSchema, "usuarios");
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
