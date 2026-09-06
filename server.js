// Backend mínimo do protótipo "Locadora OS".
// Existe só pra guardar credenciais que NÃO podem ficar no navegador (certificado do Cora,
// token da Infosimples) e repassar as chamadas pro front-end estático (o mesmo prototipo_cadastro.html
// que já roda hoje sozinho). O Google Vision (OCR da CNH) continua direto do navegador — ele é de
// baixo risco (chave com cota grátis limitada, não move dinheiro) e não precisa passar por aqui.
//
// Como rodar local:
//   npm install
//   cp .env.example .env   (e preenche com suas credenciais reais)
//   npm start
//
// Como colocar no Render.com:
//   1. Suba esta pasta num repositório do GitHub (Render "Web Service" pede um repo).
//   2. No Render: New > Web Service > conecta o repo > Build command "npm install" > Start command "npm start".
//   3. Em "Environment", cadastra as mesmas chaves do .env.example com os valores reais.
//   4. O Render te dá uma URL tipo https://locadora-backend.onrender.com — é essa URL que o
//      front-end vai chamar em vez de bater direto no Cora/Infosimples.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

app.get('/', (req, res) => {
  res.json({ ok: true, servico: 'locadora-backend' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, servico: 'locadora-backend', hora: new Date().toISOString() });
});

app.use('/api/cora', require('./routes/cora'));
app.use('/api/consultas', require('./routes/infosimples'));
app.use('/api/zapsign', require('./routes/zapsign'));
app.use('/api/fiscal', require('./routes/fiscal'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('locadora-backend rodando na porta ' + PORT);
});
