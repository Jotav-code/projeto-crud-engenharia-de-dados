"use client";

import { EntityCrudPage } from "@/components/EntityCrudPage";
import type { Usuario } from "@/types/entities";

type UsuarioForm = Usuario & {
  senha_hash: string;
};

export default function UsuariosPage() {
  return (
    <EntityCrudPage<UsuarioForm>
      title="Usuários"
      endpoint="/usuarios"
      idField="id_usuario"
      columns={[
        { name: "id_usuario", label: "ID" },
        { name: "email", label: "E-mail" },
        { name: "senha_hash", label: "Senha hashada" },
      ]}
      formFields={[
        { name: "email", label: "E-mail", type: "email", required: true },
        { name: "senha_hash", label: "Senha", type: "password", required: true },
      ]}
      emptyForm={{ email: "", senha_hash: "" }}
      getDeleteLabel={(usuario) => usuario.email}
    />
  );
}
