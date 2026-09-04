// Proxy pro Cora (boletos e PIX). O Cora usa OAuth2 + certificado digital (mTLS) — por isso
// isso não pode rodar direto do navegador: o certificado dá acesso a emitir cobrança em nome
// da sua conta, e um arquivo .html aberto por qualquer um exporia esse certificado pra qualquer um.
//
// Fluxo real (confirme os detalhes exatos na documentação oficial do Cora antes de usar em
// produção — https://developers.cora.com.br — os nomes de endpoint podem ter mudado):
//   1. POST /token na base mTLS do Cora, autenticando com o certificado (.pem/.key) + client_id,
//      devolve um access_token (Bearer) de curta duração.
//   2. Com esse Bearer, POST /v2/invoices (boleto) ou /v2/pix (PIX) na mesma base.
//
// Enquanto CORA_CLIENT_ID/CORA_CERT_PATH não estiverem preenchidos no .env, este arquivo
// responde com um mock (mesmo formato de resposta que o real devolveria), pra não quebrar o
// front-end enquanto o certificado real não chega.

const express = require('express');
const fs = require('fs');
const https = require('https');
const fetch = require('node-fetch');

const router = express.Router();

function coraConfigurado(){
  return !!(process.env.CORA_CLIENT_ID && process.env.CORA_CERT_PATH && process.env.CORA_KEY_PATH
    && fs.existsSync(process.env.CORA_CERT_PATH) && fs.existsSync(process.env.CORA_KEY_PATH));
}

async function obterTokenCora(){
  const agent = new https.Agent({
    cert: fs.readFileSync(process.env.CORA_CERT_PATH),
    key: fs.readFileSync(process.env.CORA_KEY_PATH),
  });
  const resp = await fetch(process.env.CORA_API_BASE + '/token', {
    method: 'POST',
    agent,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&client_id=' + encodeURIComponent(process.env.CORA_CLIENT_ID),
  });
  if(!resp.ok) throw new Error('Falha ao autenticar no Cora (HTTP ' + resp.status + ')');
  const json = await resp.json();
  return json.access_token;
}

// POST /api/cora/boleto  { valor, vencimento, descricao, clienteNome, clienteCpf }
router.post('/boleto', async (req, res) => {
  const { valor, vencimento, descricao, clienteNome, clienteCpf } = req.body || {};
  if(!coraConfigurado()){
    return res.json({
      mock: true,
      mensagem: 'Cora ainda não configurado neste servidor (faltam CORA_CLIENT_ID / certificado no .env) — devolvendo boleto simulado.',
      boleto: {
        id: 'mock-' + Date.now(),
        linhaDigitavel: '00190.00009 03449.640007 06011.632040 4 91780000' + Math.floor(Math.random()*10000),
        valor, vencimento, descricao, status: 'emitido_mock',
      }
    });
  }
  try{
    const token = await obterTokenCora();
    const agent = new https.Agent({
      cert: fs.readFileSync(process.env.CORA_CERT_PATH),
      key: fs.readFileSync(process.env.CORA_KEY_PATH),
    });
    const resp = await fetch(process.env.CORA_API_BASE + '/v2/invoices', {
      method: 'POST', agent,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: valor, due_date: vencimento, description: descricao,
        customer: { name: clienteNome, document: clienteCpf },
      }),
    });
    const json = await resp.json();
    if(!resp.ok) return res.status(resp.status).json({ erro: json });
    res.json({ mock: false, boleto: json });
  }catch(err){
    res.status(500).json({ erro: err.message });
  }
});

// POST /api/cora/pix  { valor, descricao, clienteNome, clienteCpf }
router.post('/pix', async (req, res) => {
  const { valor, descricao, clienteNome, clienteCpf } = req.body || {};
  if(!coraConfigurado()){
    return res.json({
      mock: true,
      mensagem: 'Cora ainda não configurado neste servidor — devolvendo PIX simulado.',
      pix: { id: 'mock-' + Date.now(), copiaECola: '00020126580014BR.GOV.BCB.PIX' + Math.random().toString(36).slice(2), valor, descricao, status: 'emitido_mock' }
    });
  }
  try{
    const token = await obterTokenCora();
    const agent = new https.Agent({
      cert: fs.readFileSync(process.env.CORA_CERT_PATH),
      key: fs.readFileSync(process.env.CORA_KEY_PATH),
    });
    const resp = await fetch(process.env.CORA_API_BASE + '/v2/pix', {
      method: 'POST', agent,
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: valor, description: descricao, customer: { name: clienteNome, document: clienteCpf } }),
    });
    const json = await resp.json();
    if(!resp.ok) return res.status(resp.status).json({ erro: json });
    res.json({ mock: false, pix: json });
  }catch(err){
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/cora/saldo
router.get('/saldo', async (req, res) => {
  if(!coraConfigurado()){
    return res.json({ mock: true, saldo: 18342.57, mensagem: 'Cora não configurado — saldo simulado.' });
  }
  try{
    const token = await obterTokenCora();
    const agent = new https.Agent({
      cert: fs.readFileSync(process.env.CORA_CERT_PATH),
      key: fs.readFileSync(process.env.CORA_KEY_PATH),
    });
    const resp = await fetch(process.env.CORA_API_BASE + '/v2/balance', { agent, headers: { 'Authorization': 'Bearer ' + token } });
    const json = await resp.json();
    if(!resp.ok) return res.status(resp.status).json({ erro: json });
    res.json({ mock: false, saldo: json });
  }catch(err){
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
