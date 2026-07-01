"use client";

import { EntityCrudPage } from "@/components/EntityCrudPage";
import type { Vinculo } from "@/types/entities";

export default function VinculosPage() {
  return (
    <EntityCrudPage<Vinculo>
      title="Vínculos"
      endpoint="/vinculos"
      idField="id_vinculo"
      columns={[
        { name: "id_vinculo", label: "ID" },
        { name: "matricula_estudante", label: "Matrícula" },
        { name: "status_vinculo", label: "Status" },
        { name: "data_ingresso", label: "Data de ingresso" },
      ]}
      formFields={[
        { name: "matricula_estudante", label: "Matrícula do estudante", type: "number", required: true },
        { name: "status_vinculo", label: "Status do vínculo", required: true },
        { name: "data_ingresso", label: "Data de ingresso", type: "date", required: true },
      ]}
      emptyForm={{
        matricula_estudante: "",
        status_vinculo: "",
        data_ingresso: "",
      }}
      getDeleteLabel={(vinculo) => `Vínculo ${vinculo.id_vinculo}`}
    />
  );
}
