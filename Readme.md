## Trabalho prático de engenharia de dados

### Código usado para criar as tabelas:

```sql
-- Tabela de curso
CREATE TABLE curso(
	id_curso SERIAL PRIMARY KEY,
	nome_curso VARCHAR NOT NULL,
	departamento VARCHAR
);
-- Tabela de Usuário
CREATE TABLE usuario(
	id_usuario SERIAL PRIMARY KEY,
	email VARCHAR NOT NULL,
	senha_hash VARCHAR NOT NULL
);
-- Tabela de estudante
CREATE TABLE estudante(
	id_usuario INT REFERENCES usuario(id_usuario),
	id_curso INT REFERENCES curso(id_curso),
	nome VARCHAR NOT NULL,
	matricula INT PRIMARY KEY
);
-- Tabela de vinculo
CREATE TABLE vinculo(
	id_vinculo SERIAL PRIMARY KEY,
	matricula_estudante INT REFERENCES estudante(matricula),
	status_vinculo VARCHAR,
	data_ingresso DATE
);

```
