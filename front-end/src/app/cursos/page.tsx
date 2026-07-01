"use client";

import { EntityCrudPage } from "@/components/EntityCrudPage";
import type { Curso } from "@/types/entities";

export default function CursosPage() {
  return (
    <EntityCrudPage<Curso>
      title="Cursos"
      endpoint="/cursos"
      idField="id_curso"
      columns={[
        { name: "id_curso", label: "ID" },
        { name: "nome_curso", label: "Nome do curso" },
        { name: "departamento", label: "Departamento" },
      ]}
      formFields={[
        { name: "nome_curso", label: "Nome do curso", required: true },
        { name: "departamento", label: "Departamento" },
      ]}
      emptyForm={{ nome_curso: "", departamento: "" }}
      getDeleteLabel={(curso) => curso.nome_curso}
    />
  );
}
