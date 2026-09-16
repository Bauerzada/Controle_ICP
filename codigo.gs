const ICP_VERSION = '1.0.8-BOOTSTRAP-NODRIVE-HOTFIX';

const ICP_CONFIG = Object.freeze({
  pastaProjetoId: '11PzRQcARs-Dz9qpGNWuDB3cF_wsbrB3v',
  liberacaoSpreadsheetId: '1iZKcE__TOzTjGvvq6XnHJWoAC-iDPSER7h8gQrld_RU',
  estoqueOrigemXlsxId: '1MAdbJDibPeg5fAhukQ5i5ILTpnFHVHUb',
  estoqueBancoNome: 'Controle ICP - Banco de Estoque',
  estoqueBancoIdProperty: 'ICP_ESTOQUE_BANCO_ID',
  abas: {estoque:'Estoque',movimentacoes:'Movimentações',pedidos:'Pedidos'},
  metodos: ['Total','Gerador','Dissolvido','Dissolvido Gerador','Urânio','Urânio Dissolvido'],
  categorias: ['Consumível','Solução','Padrão','Insumo','Reagente','Outro']
});

function includeICP_(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
function doGet() {
  return HtmlService.createTemplateFromFile('sistema').evaluate()
    .setTitle('Controle ICP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function getBootstrapICP() { throw new Error('Acesso direto bloqueado. Use uma sessão autenticada.'); }
function getBootstrapICP_() {
  const estoque = getEstoqueICP_();
  const ops=getOperacaoBootstrap_(); return {version:ICP_VERSION,metodos:ICP_CONFIG.metodos.slice(),categorias:ICP_CONFIG.categorias.slice(),estoque:estoque,resumo:buildResumoEstoque_(estoque),operacaoResumo:ops.resumo,abaLiberacaoAtual:nomeAbaMes_(new Date())};
}
function instalarControleICP() {
  const ss=getOrCreateEstoqueBanco_(); const ops=getOpsDb_(); ensureOpsTabs_(ops);
  return {ok:true,mensagem:'Bancos de estoque e operação preparados.',estoqueId:ss.getId(),estoqueUrl:ss.getUrl(),operacaoId:ops.getId(),operacaoUrl:ops.getUrl()};
}
function numeroNaoNegativo_(value,label) {
  const n=Number(String(value==null?'':value).replace(',','.'));
  if(!isFinite(n)||n<0)throw new Error(label+' deve ser um número maior ou igual a zero.');
  return n;
}
function nomeAbaMes_(date) {
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return meses[date.getMonth()];
}
function formatarDataHora_(date) {
  if(!date)return '';
  return Utilities.formatDate(new Date(date),Session.getScriptTimeZone()||'America/Sao_Paulo','dd/MM/yyyy HH:mm');
}
