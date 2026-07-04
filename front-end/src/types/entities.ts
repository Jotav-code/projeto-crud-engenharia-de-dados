export type Usuario = {
  cpf: string;
  nome: string;
  data_nascimento: string | null;
  email: string[] | null;
  telefone: string[] | null;
  login: string | null;
  senha: string | null;
};

export type Curso = {
  idcurso: number;
  nome: string;
  grau: CursoGrau | null;
  turno: CursoTurno;
  campus: string | null;
  nivel: CursoNivel | null;
};

export type Estudante = {
  mat_estudante: string;
  cpf: string | null;
  nome?: string | null;
  data_nascimento?: string | null;
  login?: string | null;
  senha?: string | null;
  mc: number | null;
  ano_ingresso: number | null;
};

export type Vinculo = {
  idvinculo: number;
  mat_estudante: string | null;
  curso: number | null;
  data_entrada: string | null;
  status: VinculoStatus | null;
  data_saida: string | null;
};

export const cursoGraus = ["Bacharelado", "Licenciatura Plena"] as const;
export const cursoTurnos = [
  "Matutino",
  "Vespertino",
  "Noturno",
  "Turno Indefinido",
] as const;
export const cursoNiveis = ["Graduação", "Mestrado", "Doutorado", "Lato"] as const;
export const vinculoStatuses = [
  "Ativo",
  "Cancelada",
  "Formando",
  "Graduado",
] as const;

export type CursoGrau = (typeof cursoGraus)[number];
export type CursoTurno = (typeof cursoTurnos)[number];
export type CursoNivel = (typeof cursoNiveis)[number];
export type VinculoStatus = (typeof vinculoStatuses)[number];

export type ApiError = {
  erro?: string;
};
