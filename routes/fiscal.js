// Proxy pra emissão de nota fiscal (NFC-e/NF-e) via um provedor fiscal terceirizado (ex.: Focus
// NFe, eNotas, PlugNotas). O token de API desse provedor fica aqui no servidor, nunca no
// navegador — e a emissão real de nota fiscal SEMPRE depende de você já ter, no provedor
// escolhido: (1) seu CNPJ cadastrado, (2) um certificado digital A1 (arquivo .pfx) enviado pra
// eles, e (3) ambiente de produção liberado (não só homologação/teste). Sem isso, não tem token
// de API que resolva — é uma exigência da Receita/SEFAZ, não deste sistema.
//
// Este arquivo usa como referência o padrão da API da Focus NFe (https://focusnfe.com.br/doc/)
// pra emissão de NFC-e (nota de venda ao consumidor). Se você contratar a eNotas, a PlugNotas ou
// outro provedor, os nomes dos campos podem mudar um pouco — ajuste FISCAL_API_BASE e o corpo da
// requisição em POST conforme a documentação de quem você escolher.
//
// Enquanto FISCAL_API_TOKEN não estiver preenchido no .env, este arquivo responde com um mock
// (mesmo formato de resposta que o real devolveria), pra não quebrar o front-end enquanto a
// emissão real não estiver configurada.

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const FISCAL_API_BASE = process.env.FISCAL_API_BASE || 'https://api.focusnfe.com.br/v2';

function fiscalConfigurado(){
  return !!process.env.FISCAL_API_TOKEN;
}

// POST /api/fiscal/emitir  { vendaId, total, itens, clienteNome, formaPagamento }
// Emite uma NFC-e (nota de venda ao consumidor) pro provedor fiscal configurado.
router.post('/emitir', async (req, res) => {
  const { vendaId, total, itens, clienteNome, formaPagamento } = req.body || {};
  if(!fiscalConfigurado()){
    return res.json({
      mock: true,
      mensagem: 'Nenhum provedor fiscal configurado neste servidor (falta FISCAL_API_TOKEN no .env) — devolvendo nota simulada. Pra emitir de verdade: contrate um provedor fiscal (Focus NFe, eNotas, PlugNotas...), cadastre seu CNPJ + certificado digital A1 nele, e cole o token de API dele aqui.',
      nota: {
        numero: 'SIM-' + Date.now().toString().slice(-8),
        status: 'emitida',
        link: '',
      }
    });
  }
  try{
    // Corpo de exemplo no formato da Focus NFe pra NFC-e — confira a documentação oficial antes
    // de usar em produção, principalmente os códigos fiscais (CFOP, NCM, CSOSN/CST) que dependem
    // do regime tributário da sua empresa.
    const resp = await fetch(FISCAL_API_BASE + '/nfce', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.FISCAL_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: (itens||[]).map((it, idx) => ({
          numero_item: idx+1,
          descricao: it.descricao,
          quantidade_comercial: it.quantidade,
          valor_unitario_comercial: it.valorUnitario,
          valor_bruto: (it.quantidade * it.valorUnitario).toFixed(2),
        })),
        valor_total: total,
        forma_pagamento: formaPagamento,
        nome_destinatario: clienteNome || 'Consumidor não identificado',
        referencia: vendaId,
      }),
    });
    const json = await resp.json();
    if(!resp.ok) return res.status(resp.status).json({ erro: json });
    res.json({
      mock: false,
      nota: {
        numero: json.numero || json.chave_nfe || '',
        status: json.status || 'processando_autorizacao',
        link: json.caminho_danfe || json.url || '',
      }
    });
  }catch(err){
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
