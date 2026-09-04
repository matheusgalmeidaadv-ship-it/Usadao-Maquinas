
const express = require("express");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new DatabaseSync(path.join(__dirname, "usadao.db"));

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));

db.exec(`
CREATE TABLE IF NOT EXISTS equipamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  categoria TEXT,
  setor TEXT,
  estado TEXT,
  ano INTEGER,
  lance_inicial REAL NOT NULL DEFAULT 0,
  data_leilao TEXT,
  localizacao TEXT,
  descricao TEXT,
  imagem TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Migração segura: adiciona somente colunas novas, sem apagar ou substituir dados existentes.
const colunas = db.prepare("PRAGMA table_info(equipamentos)").all().map(x => x.name);
const novasColunas = {
  numero_lote: "TEXT",
  numero_serial: "TEXT",
  horimetro: "TEXT",
  incremento: "REAL DEFAULT 0",
  data_abertura: "TEXT",
  data_encerramento: "TEXT",
  comissao: "REAL DEFAULT 5",
  fotos_json: "TEXT DEFAULT '[]'"
};
for (const [nome, tipo] of Object.entries(novasColunas)) {
  if (!colunas.includes(nome)) db.exec(`ALTER TABLE equipamentos ADD COLUMN ${nome} ${tipo}`);
}

const seed = db.prepare("SELECT COUNT(*) AS total FROM equipamentos").get().total;
if (seed === 0) {
  const insert = db.prepare(`
    INSERT INTO equipamentos
    (titulo, marca, modelo, categoria, setor, estado, ano, lance_inicial, data_leilao, localizacao, descricao, imagem, status)
    VALUES (@titulo,@marca,@modelo,@categoria,@setor,@estado,@ano,@lance_inicial,@data_leilao,@localizacao,@descricao,@imagem,@status)
  `);
  insert.run({
    titulo: "Trator agrícola — exemplo",
    marca: "John Deere",
    modelo: "Exemplo",
    categoria: "Tratores",
    setor: "Agrícola",
    estado: "Usado",
    ano: 2020,
    lance_inicial: 150000,
    data_leilao: "2026-09-22T13:00:00",
    localizacao: "A confirmar no edital",
    descricao: "Equipamento de demonstração para testar o cadastro.",
    imagem: "",
    status: "publicado"
  });
}

function validarEquipamento(body) {
  const erros = [];
  if (!body.titulo || !String(body.titulo).trim()) erros.push("Título é obrigatório.");
  const lance = Number(body.lance_inicial);
  if (!Number.isFinite(lance) || lance < 0) erros.push("Lance inicial deve ser um número maior ou igual a zero.");
  if (body.ano !== undefined && body.ano !== "" && (!Number.isInteger(Number(body.ano)) || Number(body.ano) < 1900 || Number(body.ano) > 2100)) {
    erros.push("Ano inválido.");
  }
  return erros;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, sistema: "Usadão Máquinas API", versao: "1.0.0" });
});

app.get("/api/equipamentos", (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db.prepare("SELECT * FROM equipamentos WHERE status = ? ORDER BY id DESC").all(status);
  } else {
    rows = db.prepare("SELECT * FROM equipamentos ORDER BY id DESC").all();
  }
  res.json(rows);
});

app.get("/api/equipamentos/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM equipamentos WHERE id = ?").get(Number(req.params.id));
  if (!row) return res.status(404).json({ erro: "Equipamento não encontrado." });
  res.json(row);
});

app.post("/api/equipamentos", (req, res) => {
  const erros = validarEquipamento(req.body);
  if (erros.length) return res.status(400).json({ erros });

  const data = {
    titulo: String(req.body.titulo).trim(),
    marca: req.body.marca || "",
    modelo: req.body.modelo || "",
    categoria: req.body.categoria || "",
    setor: req.body.setor || "",
    estado: req.body.estado || "",
    ano: req.body.ano ? Number(req.body.ano) : null,
    lance_inicial: Number(req.body.lance_inicial || 0),
    data_leilao: req.body.data_leilao || req.body.data_abertura || "",
    localizacao: req.body.localizacao || "",
    descricao: req.body.descricao || "",
    imagem: req.body.imagem || "",
    status: req.body.status || "rascunho",
    numero_lote: req.body.numero_lote || "",
    numero_serial: req.body.numero_serial || "",
    horimetro: req.body.horimetro || "",
    incremento: Number(req.body.incremento || 0),
    data_abertura: req.body.data_abertura || req.body.data_leilao || "",
    data_encerramento: req.body.data_encerramento || "",
    comissao: Number(req.body.comissao ?? 5),
    fotos_json: JSON.stringify(Array.isArray(req.body.fotos) ? req.body.fotos : [])
  };

  const result = db.prepare(`
    INSERT INTO equipamentos
    (titulo,marca,modelo,categoria,setor,estado,ano,lance_inicial,data_leilao,localizacao,descricao,imagem,status,numero_lote,numero_serial,horimetro,incremento,data_abertura,data_encerramento,comissao,fotos_json)
    VALUES (@titulo,@marca,@modelo,@categoria,@setor,@estado,@ano,@lance_inicial,@data_leilao,@localizacao,@descricao,@imagem,@status,@numero_lote,@numero_serial,@horimetro,@incremento,@data_abertura,@data_encerramento,@comissao,@fotos_json)
  `).run(data);

  res.status(201).json(db.prepare("SELECT * FROM equipamentos WHERE id = ?").get(result.lastInsertRowid));
});

app.put("/api/equipamentos/:id", (req, res) => {
  const id = Number(req.params.id);
  const atual = db.prepare("SELECT * FROM equipamentos WHERE id = ?").get(id);
  if (!atual) return res.status(404).json({ erro: "Equipamento não encontrado." });

  const merged = { ...atual, ...req.body };
  const erros = validarEquipamento(merged);
  if (erros.length) return res.status(400).json({ erros });

  db.prepare(`
    UPDATE equipamentos SET
      titulo=@titulo, marca=@marca, modelo=@modelo, categoria=@categoria,
      setor=@setor, estado=@estado, ano=@ano, lance_inicial=@lance_inicial,
      data_leilao=@data_leilao, localizacao=@localizacao, descricao=@descricao,
      imagem=@imagem, status=@status, numero_lote=@numero_lote, numero_serial=@numero_serial,
      horimetro=@horimetro, incremento=@incremento, data_abertura=@data_abertura,
      data_encerramento=@data_encerramento, comissao=@comissao, fotos_json=@fotos_json,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({
    id,
    titulo: String(merged.titulo).trim(),
    marca: merged.marca || "",
    modelo: merged.modelo || "",
    categoria: merged.categoria || "",
    setor: merged.setor || "",
    estado: merged.estado || "",
    ano: merged.ano ? Number(merged.ano) : null,
    lance_inicial: Number(merged.lance_inicial || 0),
    data_leilao: merged.data_leilao || merged.data_abertura || "",
    localizacao: merged.localizacao || "",
    descricao: merged.descricao || "",
    imagem: merged.imagem || "",
    status: merged.status || "rascunho",
    numero_lote: merged.numero_lote || "",
    numero_serial: merged.numero_serial || "",
    horimetro: merged.horimetro || "",
    incremento: Number(merged.incremento || 0),
    data_abertura: merged.data_abertura || merged.data_leilao || "",
    data_encerramento: merged.data_encerramento || "",
    comissao: Number(merged.comissao ?? 5),
    fotos_json: Array.isArray(merged.fotos) ? JSON.stringify(merged.fotos) : (merged.fotos_json || "[]")
  });

  res.json(db.prepare("SELECT * FROM equipamentos WHERE id = ?").get(id));
});

app.patch("/api/equipamentos/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").toLowerCase();
  if (!["rascunho", "publicado", "encerrado"].includes(status)) {
    return res.status(400).json({ erro: "Status inválido." });
  }
  const result = db.prepare("UPDATE equipamentos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
  if (!result.changes) return res.status(404).json({ erro: "Equipamento não encontrado." });
  res.json(db.prepare("SELECT * FROM equipamentos WHERE id = ?").get(id));
});

app.delete("/api/equipamentos/:id", (req, res) => {
  const result = db.prepare("DELETE FROM equipamentos WHERE id = ?").run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({ erro: "Equipamento não encontrado." });
  res.json({ ok: true });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Usadão Máquinas API rodando em http://localhost:${PORT}`);
});
