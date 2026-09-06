// Proxy pra ZapSign (assinatura eletrônica de contratos/promissórias). O token de API da
// ZapSign dá acesso a criar e consultar documentos em nome da sua conta — por isso fica aqui
// no servidor, nunca no navegador.
//
// Confirme os nomes exatos dos endpoints na documentação oficial da ZapSign
// (https://docs.zapsign.com.br) antes de usar em produção — este código segue o padrão
// publicamente documentado (Bearer token + POST /docs/ pra criar um documento a partir de um
// PDF em base64 ou URL, com signatários por e-mail/telefone), mas detalhes podem mudar.
//
// Enquanto ZAPSIGN_API_TOKEN não estiver preenchido no .env, este arquivo responde com um mock
// (mesmo formato de resposta que o real devolveria), pra não quebrar o front-end enquanto o
// token real não chega.

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const ZAPSIGN_API_BASE = process.env.ZAPSIGN_API_BASE || 'https://api.zapsign.com.br/api/v1';

function zapsignConfigurado(){
  return !!process.env.ZAPSIGN_API_TOKEN;
}

// POST /api/zapsign/enviar  { contratoId, contratoTexto, clienteNome, clienteEmail, clienteTelefone }
// Cria o documento na ZapSign e devolve o link de assinatura.
router.post('/enviar', async (req, res) => {
  const { contratoId, contratoTexto, clienteNome, clienteEmail, clienteTelefone } = req.body || {};
  if(!zapsignConfigurado()){
    return res.json({
      mock: true,
      mensagem: 'ZapSign ainda não configurado neste servidor (falta ZAPSIGN_API_TOKEN no .env) — devolvendo link de assinatura simulado.',
      documento: {
        token: 'mock-' + Date.now(),
        link: 'https://assinatura.mock/' + (contratoId || '').toString().slice(0, 8),
        status: 'pending',
      }
    });
  }
  try{
    const resp = await fetch(ZAPSIGN_API_BASE + '/docs/', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.ZAPSIGN_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Contrato de locação — ' + (clienteNome || contratoId || ''),
        base64_pdf: null, // preencher com o PDF real do contrato em base64, ou usar url_pdf se hospedado
        url_pdf: null,
        signers: [{ name: clienteNome, email: clienteEmail || undefined, phone_country: '55', phone_number: (clienteTelefone||'').replace(/\D/g,'') || undefined }],
      }),
    });
    const json = await resp.json();
    if(!resp.ok) return res.status(resp.status).json({ erro: json });
    res.json({
      mock: false,
      documento: {
        token: json.token,
        link: (json.signers && json.signers[0] && json.signers[0].sign_url) || json.original_file || '',
        status: json.status || 'pending',
      }
    });
  }catch(err){
    res.status(500).json({ erro: err.message });
  }
});

// GET /api/zapsign/status/:token  — consulta o status atual de um documento enviado
router.get('/status/:token', async (req, res) => {
  const { token } = req.params;
  if(!zapsignConfigurado() || (token||'').startsWith('mock-')){
    // Em modo simulado, alterna aleatoriamente pra dar sensação de progresso — não é preciso
    // confiar nisso pra nada real; o botão "marcar assinado" continua manual no front-end.
    return res.json({ mock: true, status: Math.random() > 0.5 ? 'signed' : 'pending' });
  }
  try{
    const resp = await fetch(ZAPSIGN_API_BASE + '/docs/' + encodeURIComponent(token) + '/', {
      headers: { 'Authorization': 'Bearer ' + process.env.ZAPSIGN_API_TOKEN },
    });
    const json = await resp.json();
    if(!resp.ok) return res.status(resp.status).json({ erro: json });
    res.json({ mock: false, status: json.status });
  }catch(err){
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
