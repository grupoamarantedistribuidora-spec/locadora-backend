// Proxy pra Infosimples (SPC/Serasa, pontos de CNH, restrições do veículo, multas).
// Guarda o token aqui no servidor em vez de no navegador, porque é uma consulta paga por
// requisição — se o token vazasse (visível pra quem abrisse o .html), qualquer um poderia
// gastar a sua cota.
//
// Confirme os nomes exatos dos endpoints na documentação da Infosimples (api.infosimples.com)
// antes de usar em produção — cada tipo de consulta tem sua própria URL.

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

function infosimplesConfigurado(){
  return !!process.env.INFOSIMPLES_TOKEN;
}

async function chamarInfosimples(caminho, params){
  const url = new URL('https://api.infosimples.com/api/v2/consultas/' + caminho);
  url.searchParams.set('token', process.env.INFOSIMPLES_TOKEN);
  Object.entries(params||{}).forEach(([k,v])=> url.searchParams.set(k, v));
  const resp = await fetch(url.toString());
  const json = await resp.json();
  return json;
}

// POST /api/consultas/cnh  { numeroRegistro, cpf }
router.post('/cnh', async (req, res) => {
  const { numeroRegistro, cpf } = req.body || {};
  if(!infosimplesConfigurado()){
    return res.json({ mock: true, mensagem: 'Infosimples não configurado — resposta simulada.',
      resultado: { situacao: 'regular', categoria: 'AB', validade: '2029-01-01', pontos: Math.floor(Math.random()*20) } });
  }
  try{
    const json = await chamarInfosimples('senatran/validar-cnh', { numero_registro: numeroRegistro, cpf });
    res.json({ mock: false, resultado: json });
  }catch(err){ res.status(500).json({ erro: err.message }); }
});

// POST /api/consultas/spc-serasa  { cpf }
router.post('/spc-serasa', async (req, res) => {
  const { cpf } = req.body || {};
  if(!infosimplesConfigurado()){
    const score = Math.floor(300 + Math.random()*700);
    return res.json({ mock: true, mensagem: 'Infosimples não configurado — resposta simulada.',
      resultado: { score, restricao: score < 500 } });
  }
  try{
    const json = await chamarInfosimples('spc/consulta', { cpf });
    res.json({ mock: false, resultado: json });
  }catch(err){ res.status(500).json({ erro: err.message }); }
});

// POST /api/consultas/restricao-veiculo  { placa, renavam }
router.post('/restricao-veiculo', async (req, res) => {
  const { placa, renavam } = req.body || {};
  if(!infosimplesConfigurado()){
    return res.json({ mock: true, mensagem: 'Infosimples não configurado — resposta simulada.',
      resultado: { furtoRoubo: false, sinistro: false, leilao: false, gravame: Math.random() < 0.25 } });
  }
  try{
    const json = await chamarInfosimples('detran/restricoes', { placa, renavam });
    res.json({ mock: false, resultado: json });
  }catch(err){ res.status(500).json({ erro: err.message }); }
});

// POST /api/consultas/telefone-endereco  { cpf, telefone, endereco }
router.post('/telefone-endereco', async (req, res) => {
  const { cpf, telefone, endereco } = req.body || {};
  if(!infosimplesConfigurado()){
    const confere = Math.random() > 0.2;
    return res.json({ mock: true, mensagem: 'Infosimples não configurado — resposta simulada.',
      resultado: { confere } });
  }
  try{
    const json = await chamarInfosimples('validacao/telefone-endereco', { cpf, telefone, endereco });
    res.json({ mock: false, resultado: json });
  }catch(err){ res.status(500).json({ erro: err.message }); }
});

// POST /api/consultas/protesto-acoes  { cpf }
router.post('/protesto-acoes', async (req, res) => {
  const { cpf } = req.body || {};
  if(!infosimplesConfigurado()){
    return res.json({ mock: true, mensagem: 'Infosimples não configurado — resposta simulada.',
      resultado: { encontrado: Math.random() < 0.15 } });
  }
  try{
    const json = await chamarInfosimples('protestos/consulta', { cpf });
    res.json({ mock: false, resultado: json });
  }catch(err){ res.status(500).json({ erro: err.message }); }
});

// POST /api/consultas/cheque-sem-fundo  { cpf }
router.post('/cheque-sem-fundo', async (req, res) => {
  const { cpf } = req.body || {};
  if(!infosimplesConfigurado()){
    return res.json({ mock: true, mensagem: 'Infosimples não configurado — resposta simulada.',
      resultado: { consta: Math.random() < 0.1 } });
  }
  try{
    const json = await chamarInfosimples('bacen/ccf', { cpf });
    res.json({ mock: false, resultado: json });
  }catch(err){ res.status(500).json({ erro: err.message }); }
});

module.exports = router;
