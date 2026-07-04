"use client";

import { EntityCrudPage } from "@/components/EntityCrudPage";
import type { Usuario } from "@/types/entities";

function splitList(value: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

export default function UsuariosPage() {
  return (
    <EntityCrudPage<Usuario>
      title="Usuários"
      endpoint="/usuarios"
      idField="cpf"
      columns={[
        { name: "cpf", label: "CPF" },
        { name: "nome", label: "Nome" },
        { name: "data_nascimento", label: "Nascimento" },
        { name: "email", label: "E-mail" },
        { name: "telefone", label: "Telefone" },
        { name: "login", label: "Login" },
      ]}
      formFields={[
        { name: "cpf", label: "CPF", required: true, readOnlyOnEdit: true },
        { name: "nome", label: "Nome", required: true },
        { name: "data_nascimento", label: "Data de nascimento", type: "date" },
        { name: "email", label: "E-mails separados por vírgula", type: "arrayText" },
        { name: "telefone", label: "Telefones separados por vírgula", type: "arrayText" },
        { name: "login", label: "Login" },
        { name: "senha", label: "Senha", type: "password" },
      ]}
      emptyForm={{
        cpf: "",
        nome: "",
        data_nascimento: "",
        email: "",
        telefone: "",
        login: "",
        senha: "",
      }}
      serializeForm={(form) => ({
        cpf: form.cpf.trim(),
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento || null,
        email: splitList(form.email),
        telefone: splitList(form.telefone),
        login: form.login.trim() || null,
        senha: form.senha.trim() || null,
      })}
      getDeleteLabel={(usuario) => `${usuario.cpf} - ${usuario.nome}`}
    />
  );
}
