"use client";

import { EntityCrudPage } from "@/components/EntityCrudPage";
import { cursoGraus, cursoNiveis, cursoTurnos, type Curso } from "@/types/entities";

export default function CursosPage() {
  return (
    <EntityCrudPage<Curso>
      title="Cursos"
      endpoint="/cursos"
      idField="idcurso"
      columns={[
        { name: "idcurso", label: "ID" },
        { name: "nome", label: "Nome" },
        { name: "grau", label: "Grau" },
        { name: "turno", label: "Turno" },
        { name: "campus", label: "Campus" },
        { name: "nivel", label: "Nível" },
      ]}
      formFields={[
        { name: "nome", label: "Nome", required: true },
        { name: "grau", label: "Grau", type: "select", options: cursoGraus },
        { name: "turno", label: "Turno", type: "select", options: cursoTurnos, required: true },
        { name: "campus", label: "Campus" },
        { name: "nivel", label: "Nível", type: "select", options: cursoNiveis },
      ]}
      emptyForm={{ nome: "", grau: "", turno: "", campus: "", nivel: "" }}
      serializeForm={(form) => ({
        nome: form.nome.trim(),
        grau: form.grau || null,
        turno: form.turno,
        campus: form.campus.trim() || null,
        nivel: form.nivel || null,
      })}
      getDeleteLabel={(curso) => curso.nome}
    />
  );
}
