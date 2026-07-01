export type Curso = {
  id_curso: number;
  nome_curso: string;
  departamento: string | null;
};

export type Usuario = {
  id_usuario: number;
  email: string;
};

export type Estudante = {
  matricula: number;
  nome: string;
  id_usuario: number;
  id_curso: number;
};

export type Vinculo = {
  id_vinculo: number;
  matricula_estudante: number;
  status_vinculo: string;
  data_ingresso: string;
};

export type ApiError = {
  erro?: string;
};
