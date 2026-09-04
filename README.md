# Backend do Locadora OS (Cora + Infosimples)

Servidor pequeno cuja única função é seguar as credenciais que **não podem** ficar dentro do
`prototipo_cadastro.html` (que é um arquivo estático, aberto no navegador — qualquer segredo
colocado nele fica visível pra quem abrir o arquivo). O Google Vision (OCR da CNH) **não** passa
por aqui — continua sendo chamado direto do navegador, porque é uma chave de baixo risco (cota
grátis limitada, não movimenta dinheiro nem dado pago).

## O que ele resolve

| Endpoint | Pra que serve | Sem credencial configurada |
|---|---|---|
| `POST /api/cora/boleto` | Emitir boleto | Devolve boleto simulado (mesmo formato) |
| `POST /api/cora/pix` | Gerar cobrança PIX | Devolve PIX simulado |
| `GET /api/cora/saldo` | Saldo em conta | Devolve saldo simulado |
| `POST /api/consultas/cnh` | Situação/pontos da CNH | Devolve resultado simulado |
| `POST /api/consultas/spc-serasa` | Score SPC/Serasa | Devolve resultado simulado |
| `POST /api/consultas/restricao-veiculo` | Furto/roubo, sinistro, leilão, gravame | Devolve resultado simulado |
| `POST /api/consultas/telefone-endereco` | Validar telefone/endereço | Devolve resultado simulado |
| `POST /api/consultas/protesto-acoes` | Protestos e ações judiciais | Devolve resultado simulado |
| `POST /api/consultas/cheque-sem-fundo` | CCF (Bacen) | Devolve resultado simulado |

Ou seja: dá pra subir isso HOJE, sem nenhuma credencial real, e ele funciona exatamente como o
mock que já existe no front-end — só que agora com um lugar pronto pra colocar as credenciais
reais assim que você contratar o Cora e a Infosimples, sem precisar tocar no front-end de novo.

## Rodando local

```bash
npm install
cp .env.example .env      # preenche com suas credenciais reais (ou deixa em branco pra usar mock)
npm start
```

Testa: `curl http://localhost:3000/api/health`

## Colocando no Render.com

1. Cria um repositório no GitHub com esta pasta (pode usar o botão "Upload files" do próprio
   GitHub pelo navegador — não precisa de linha de comando).
2. No Render: **New > Web Service** (não "Static Site" — esse aqui roda código, precisa de
   "Web Service").
3. Conecta esse repositório.
4. Build command: `npm install` — Start command: `npm start`.
5. Na aba **Environment**, cadastra as mesmas variáveis do `.env.example` com os valores reais
   (ou deixa em branco por enquanto pra rodar em modo simulado).
6. O Render te dá uma URL fixa, tipo `https://locadora-backend.onrender.com`.

## Ligando no front-end

No `prototipo_cadastro.html`, os botões que hoje geram boleto/PIX/consulta "mock" localmente
passam a chamar essa URL, por exemplo:

```js
const BACKEND_URL = 'https://locadora-backend.onrender.com'; // troca pela sua URL do Render

async function gerarBoletoReal(dados){
  const resp = await fetch(BACKEND_URL + '/api/cora/boleto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  });
  return resp.json(); // { mock: true/false, boleto: {...} }
}
```

O campo `mock` na resposta diz se aquele resultado é simulado (credencial ainda não configurada
no servidor) ou real — dá pra usar isso pra manter a mesma etiqueta "simulado"/"real" que já
existe na tela de Integrações.

## Segurança

- Nunca commite o `.env` de verdade nem os arquivos de `certs/` num repositório público — o
  `.gitignore` já bloqueia os dois.
- Troque `FRONTEND_ORIGIN=*` pela URL real do seu site assim que ele estiver publicado, pra só
  esse site poder chamar o backend.
- Confirme os nomes exatos dos endpoints do Cora e da Infosimples na documentação oficial deles
  antes de apontar pra produção — este código foi escrito com base no padrão documentado
  publicamente (OAuth2 + mTLS pro Cora, token por query string pra Infosimples), mas cada
  provedor pode ajustar detalhes com o tempo.
