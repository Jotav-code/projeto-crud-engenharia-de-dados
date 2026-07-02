import mongoose from "mongoose";
import { fakerPT_BR as faker } from "@faker-js/faker";
import { Curso, Usuario, Estudante, Vinculo, nextSequence } from "./src/models";

const MONGO_URI = "mongodb://54.234.187.26:27017/trabalho_de_dados";

async function gerarDados() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado ao MongoDB");

    const STATUS_PERMITIDOS = ["Ativo", "Trancado", "Concluído", "Cancelado"];
    const DEPARTAMENTOS = ["DCOMP", "MAT", "FIS", "QUI", "BIO"];

    const cursosGerados = [];
    for (let i = 0; i < 10; i++) {
      const id_curso = await nextSequence("id_curso");
      const curso = await Curso.create({
        id_curso,
        nome_curso: faker.person.jobArea(),
        departamento: faker.helpers.arrayElement(DEPARTAMENTOS),
      });
      cursosGerados.push(curso);
    }
    console.log("10 Cursos criados!");

    for (let i = 0; i < 200; i++) {
      const id_usuario = await nextSequence("id_usuario");
      const usuario = await Usuario.create({
        id_usuario,
        email: faker.internet.email().toLowerCase(),
        senha_hash: faker.internet.password({ length: 12 }),
      });

      const cursoAleatorio = faker.helpers.arrayElement(cursosGerados);

      const matricula = faker.number.int({ min: 202000000, max: 202699999 });
      await Estudante.create({
        matricula,
        nome: faker.person.fullName(),
        id_usuario: usuario.id_usuario,
        id_curso: cursoAleatorio.id_curso,
      });

      const id_vinculo = await nextSequence("id_vinculo");
      await Vinculo.create({
        id_vinculo,
        matricula_estudante: matricula,
        status_vinculo: faker.helpers.arrayElement(STATUS_PERMITIDOS),
        data_ingresso: faker.date.past({ years: 4 }),
      });
    }

    console.log("SUCESSO!");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao gerar dados:", error);
    process.exit(1);
  }
}

gerarDados();
