// Backend do "Locadora OS" — guarda credenciais que NÃO podem ficar no navegador (certificado do
// Cora, token da Infosimples/ZapSign/fiscal) e repassa as chamadas pro front-end. A partir de agora
// este mesmo serviço também serve o front-end estático (prototipo_cadastro.html, publicado aqui como
// public/index.html) — visitando a URL do Render (ex.: https://locadora-backend.onrender.com) já
// abre o sistema, de qualquer aparelho (computador ou celular), sem precisar abrir o arquivo local.
// O Google Vision (OCR da CNH) continua direto do navegador — ele é de baixo risco (chave com cota
// grátis limitada, não move dinheiro) e não precisa passar por aqui.
//
// Como rodar local:
// npm install
// cp .env.example .env (e preenche com suas credenciais reais)
// npm start
// Depois é só abrir http://localhost:3000 no navegador.
//
// Como colocar no Render.com:
// 1. Suba esta pasta num repositório do GitHub (Render "Web Service" pede um repo).
// 2. No Render: New > Web Service > conecta o repo > Build command "npm install" > Start command "npm start".
// 3. Em "Environment", cadastra as mesmas chaves do .env.example com os valores reais.
// 4. O Render te dá uma URL tipo https://locadora-backend.onrender.com — é essa mesma URL que
// abre o sistema (front-end) e que atende as chamadas de API (Cora/Infosimples/ZapSign/fiscal).

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());

const allowedOrigin = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin }));

// serve o front-end estático (public/index.html = prototipo_cadastro.html) — precisa vir antes
// das outras rotas pra "/" abrir o sistema em vez de uma resposta JSON.
app.use(express.static(path.join(__dirname, 'public')));

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
