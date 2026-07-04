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

function cpfDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatCpfInput(value: unknown) {
  const digits = cpfDigits(String(value ?? ""));

  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCpf(value: unknown) {
  const digits = cpfDigits(String(value ?? ""));

  if (digits.length !== 11) {
    return String(value ?? "-");
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function UsuariosPage() {
  return (
    <EntityCrudPage<Usuario>
      title="Usuários"
      endpoint="/usuarios"
      idField="cpf"
      columns={[
        { name: "cpf", label: "CPF", formatDisplay: formatCpf },
        { name: "nome", label: "Nome" },
        { name: "data_nascimento", label: "Nascimento" },
        { name: "email", label: "E-mail" },
        { name: "telefone", label: "Telefone" },
        { name: "login", label: "Login" },
      ]}
      formFields={[
        {
          name: "cpf",
          label: "CPF",
          required: true,
          readOnlyOnEdit: true,
          maxLength: 14,
          formatInput: formatCpfInput,
          normalizeInput: formatCpfInput,
        },
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
        cpf: cpfDigits(form.cpf),
        nome: form.nome.trim(),
        data_nascimento: form.data_nascimento || null,
        email: splitList(form.email),
        telefone: splitList(form.telefone),
        login: form.login.trim() || null,
        senha: form.senha.trim() || null,
      })}
      getDeleteLabel={(usuario) => `${formatCpf(usuario.cpf)} - ${usuario.nome}`}
    />
  );
}
