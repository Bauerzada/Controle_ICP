const ICP_VERSION = '0.1.0-PREPARO-BASE';

const ICP_CONFIG = Object.freeze({
  pastaProjetoId: '11PzRQcARs-Dz9qpGNWuDB3cF_wsbrB3v',
  liberacaoSpreadsheetId: '1iZKcE__TOzTjGvvq6XnHJWoAC-iDPSER7h8gQrld_RU',
  estoqueOrigemXlsxId: '1MAdbJDibPeg5fAhukQ5i5ILTpnFHVHUb',
  estoqueBancoNome: 'Controle ICP - Banco de Estoque',
  estoqueBancoIdProperty: 'ICP_ESTOQUE_BANCO_ID',
  abas: {
    estoque: 'Estoque',
    movimentacoes: 'Movimentações',
    pedidos: 'Pedidos'
  },
  metodos: ['Total', 'Gerador', 'Dissolvido', 'Dissolvido Gerador', 'Urânio', 'Urânio Dissolvido']
});

const ICP_ESTOQUE_INICIAL = [
  ['Consumível','Ácido Nítrico P.A.','80625 - ICP','L',3042,4,1000,'','2026-08-23',''],
  ['Consumível','Ácido Nítrico P.A.','82919 - ICP','L',548.5,1,1000,'','2026-08-23','Foi aberto RI? Qual o número da RI?'],
  ['Consumível','Ácido Clorídrico 37%','83248 - ICP','L',1600,2,1000,'','2026-08-23',''],
  ['Consumível','Membrana filtrante','20250220YGEXM','un',104,2,50,'','2026-08-23',''],
  ['Consumível','Fita de pH','pH 0,14 GENE - ICP','un',230,1,30,'','2026-08-23',''],
  ['Consumível','Filtro para seringa','335052210 - ICP','un',100,1,30,'','2026-08-23',''],
  ['Consumível','Filtro para seringa','342038163 - ICP','un',100,1,30,'','2026-08-23',''],
  ['Reagente','Borohidreto de sódio','220006653','g',105,1,100,'','2026-08-23',''],
  ['Reagente','Peróxido de Hidrogênio P.A.','80794 - ICP','L',2000,2,1000,'','2026-08-23',''],
  ['Consumível','Seringa plástica','SSLLAB179A - ICP','un',120,2,30,'','2026-08-23',''],
  ['Reagente','Hidróxido de Sódio','220005822 - ICP','g',200,1,100,'','2026-08-23',''],
  ['Reagente','Hidróxido de Sódio','230008401','g',1000,1,100,'','2026-08-23',''],
  ['Reagente','Hidróxido de Sódio','77583 - ICP','g',1000,1,100,'','2026-08-23',''],
  ['Consumível','Papel filtro Quantitativo Faixa Preta','1091441110 - ICP','un',100,1,50,'','2026-08-23',''],
  ['Consumível','Papel filtro Quantitativo Faixa Preta','0635 - ICP','un',500,1,50,'','2026-08-23',''],
  ['Reagente','Bicarbonato de Sódio P.A.','76384 - ICP','g',2000,1,500,'','2026-08-23',''],
  ['Padrão','Itrio','F26B0505C - ICP','mL',500,1,200,'','2026-08-23','']
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('sistema')
    .setTitle('Controle ICP')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getBootstrapICP() {
  const estoque = getEstoqueICP_();
  return {
    version: ICP_VERSION,
    metodos: ICP_CONFIG.metodos.slice(),
    estoque,
    resumo: buildResumoEstoque_(estoque),
    abaLiberacaoAtual: nomeAbaMes_(new Date()),
    categorias: ['Consumível','Solução','Padrão','Insumo','Reagente','Outro']
  };
}

function instalarControleICP() {
  const ss = getOrCreateEstoqueBanco_();
  return {
    ok: true,
    mensagem: 'Banco de estoque preparado.',
    spreadsheetId: ss.getId(),
    url: ss.getUrl()
  };
}

function registrarAmostraICP(payload) {
  payload = payload || {};
  const codigo = normalizarCodigoBipagem_(payload.codigo || payload.id || '');
  if (!codigo.id) throw new Error('Informe ou bipe uma amostra válida.');

  const metodos = Array.isArray(payload.metodos) ? payload.metodos.filter(m => ICP_CONFIG.metodos.indexOf(m) >= 0) : [];
  if (!metodos.length) throw new Error('Selecione pelo menos um método.');

  const dataRegistro = payload.data ? new Date(payload.data + 'T12:00:00') : new Date();
  if (isNaN(dataRegistro.getTime())) throw new Error('Data de registro inválida.');

  const ss = SpreadsheetApp.openById(ICP_CONFIG.liberacaoSpreadsheetId);
  const nomeAba = nomeAbaMes_(dataRegistro);
  const sh = ss.getSheetByName(nomeAba);
  if (!sh) throw new Error('Aba mensal não encontrada: ' + nomeAba + '.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const duplicada = localizarAmostra_(sh, codigo.id);
    if (duplicada) {
      throw new Error('A amostra ' + codigo.id + ' já está registrada na linha ' + duplicada + ' de ' + nomeAba + '.');
    }

    const row = proximaLinhaLiberacao_(sh);
    const metodoFlags = ICP_CONFIG.metodos.map(m => metodos.indexOf(m) >= 0);
    const values = [[
      '',
      dataRegistro,
      payload.liberacao || 'Pendente',
      Number(codigo.id),
      payload.cq || '',
      metodoFlags[0], metodoFlags[1], metodoFlags[2], metodoFlags[3], metodoFlags[4], metodoFlags[5],
      payload.diluicao || '',
      payload.observacao || '',
      payload.ml === '' || payload.ml == null ? '' : Number(payload.ml),
      payload.itrio || '',
      payload.tecnico || Session.getActiveUser().getEmail() || ''
    ]];
    sh.getRange(row, 1, 1, 16).setValues(values);
    sh.getRange(row, 2).setNumberFormat('dd/mm/yyyy');
    sh.getRange(row, 4).setNumberFormat('0');
    sh.getRange(row, 6, 1, 6).insertCheckboxes().setValues([metodoFlags]);
    SpreadsheetApp.flush();

    return {
      ok: true,
      linha: row,
      aba: nomeAba,
      id: codigo.id,
      embalagem: codigo.embalagem,
      prefixo: codigo.prefixo,
      metodos
    };
  } finally {
    lock.releaseLock();
  }
}

function interpretarCodigoICP(codigo) {
  return normalizarCodigoBipagem_(codigo);
}

function salvarItemEstoqueICP(payload) {
  payload = payload || {};
  const item = String(payload.item || '').trim();
  const lote = String(payload.lote || '').trim();
  const unidade = String(payload.unidade || '').trim();
  if (!item) throw new Error('Informe o item.');
  if (!unidade) throw new Error('Informe a unidade.');

  const quantidade = numeroNaoNegativo_(payload.quantidade, 'Quantidade em estoque');
  const embalagens = numeroNaoNegativo_(payload.embalagens, 'Qtde de lotes/embalagens');
  const minimo = payload.minimo === '' || payload.minimo == null ? '' : numeroNaoNegativo_(payload.minimo, 'Estoque mínimo');
  const categoria = String(payload.categoria || 'Outro').trim();
  const responsavel = String(payload.responsavel || Session.getActiveUser().getEmail() || '').trim();
  const observacoes = String(payload.observacoes || '').trim();

  const ss = getOrCreateEstoqueBanco_();
  const sh = ss.getSheetByName(ICP_CONFIG.abas.estoque);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const id = payload.id ? String(payload.id) : Utilities.getUuid();
    const row = localizarItemEstoquePorId_(sh, id);
    const status = calcularStatusEstoque_(quantidade, minimo);
    const values = [[id,categoria,item,lote,unidade,quantidade,embalagens,minimo,status,responsavel,new Date(),observacoes]];
    if (row) sh.getRange(row, 1, 1, values[0].length).setValues(values);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, values[0].length).setValues(values);
    SpreadsheetApp.flush();
    return {ok:true,id,status};
  } finally {
    lock.releaseLock();
  }
}

function registrarMovimentacaoEstoqueICP(payload) {
  payload = payload || {};
  const id = String(payload.id || '').trim();
  const tipo = String(payload.tipo || '').trim().toUpperCase();
  if (!id) throw new Error('Item de estoque não informado.');
  if (['ENTRADA','SAIDA','AJUSTE'].indexOf(tipo) < 0) throw new Error('Tipo de movimentação inválido.');

  const quantidadeMov = numeroNaoNegativo_(payload.quantidade, 'Quantidade');
  const embalagensMov = payload.embalagens === '' || payload.embalagens == null ? 0 : numeroNaoNegativo_(payload.embalagens, 'Embalagens');
  const responsavel = String(payload.responsavel || Session.getActiveUser().getEmail() || '').trim();
  const observacoes = String(payload.observacoes || '').trim();

  const ss = getOrCreateEstoqueBanco_();
  const estoqueSh = ss.getSheetByName(ICP_CONFIG.abas.estoque);
  const movSh = ss.getSheetByName(ICP_CONFIG.abas.movimentacoes);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const row = localizarItemEstoquePorId_(estoqueSh, id);
    if (!row) throw new Error('Item não localizado no estoque.');
    const data = estoqueSh.getRange(row,1,1,12).getValues()[0];
    const atual = Number(data[5]) || 0;
    const embAtual = Number(data[6]) || 0;
    let novaQtd = atual;
    let novasEmb = embAtual;
    if (tipo === 'ENTRADA') { novaQtd = atual + quantidadeMov; novasEmb = embAtual + embalagensMov; }
    if (tipo === 'SAIDA') { novaQtd = atual - quantidadeMov; novasEmb = embAtual - embalagensMov; }
    if (tipo === 'AJUSTE') { novaQtd = quantidadeMov; novasEmb = embalagensMov; }
    if (novaQtd < 0) throw new Error('A saída deixaria o estoque negativo.');
    if (novasEmb < 0) throw new Error('A movimentação deixaria a quantidade de embalagens negativa.');
    const minimo = data[7] === '' ? '' : Number(data[7]);
    const status = calcularStatusEstoque_(novaQtd, minimo);
    estoqueSh.getRange(row,6,1,6).setValues([[novaQtd,novasEmb,minimo,status,responsavel,new Date()]]);
    movSh.appendRow([Utilities.getUuid(),new Date(),id,data[2],data[3],tipo,quantidadeMov,embalagensMov,atual,novaQtd,responsavel,observacoes]);
    SpreadsheetApp.flush();
    return {ok:true,id,quantidade:novaQtd,embalagens:novasEmb,status};
  } finally {
    lock.releaseLock();
  }
}

function salvarPedidoICP(payload) {
  payload = payload || {};
  const item = String(payload.item || '').trim();
  if (!item) throw new Error('Informe o item do pedido.');
  const quantidade = numeroNaoNegativo_(payload.quantidade, 'Quantidade a comprar');
  const statusPermitido = ['Pendente','Enviado','Recebido'];
  const status = statusPermitido.indexOf(payload.status) >= 0 ? payload.status : 'Pendente';
  const ss = getOrCreateEstoqueBanco_();
  const sh = ss.getSheetByName(ICP_CONFIG.abas.pedidos);
  sh.appendRow([
    Utilities.getUuid(), new Date(), item, quantidade,
    String(payload.fornecedor || ''), payload.dataPedido ? new Date(payload.dataPedido + 'T12:00:00') : '',
    status, String(payload.observacoes || ''), Session.getActiveUser().getEmail() || ''
  ]);
  return {ok:true};
}

function getEstoqueICP() {
  return getEstoqueICP_();
}

function getEstoqueICP_() {
  const ss = getOrCreateEstoqueBanco_();
  const sh = ss.getSheetByName(ICP_CONFIG.abas.estoque);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const rows = sh.getRange(2,1,last-1,12).getValues();
  return rows.filter(r => r[0]).map(r => ({
    id:String(r[0]), categoria:r[1], item:r[2], lote:r[3], unidade:r[4],
    quantidade:Number(r[5]) || 0, embalagens:Number(r[6]) || 0,
    minimo:r[7] === '' ? '' : Number(r[7]), status:calcularStatusEstoque_(Number(r[5]) || 0, r[7] === '' ? '' : Number(r[7])),
    responsavel:r[9] || '', ultimaAtualizacao:formatarDataHora_(r[10]), observacoes:r[11] || ''
  }));
}

function getOrCreateEstoqueBanco_() {
  const props = PropertiesService.getScriptProperties();
  const salvo = props.getProperty(ICP_CONFIG.estoqueBancoIdProperty);
  if (salvo) {
    try { return SpreadsheetApp.openById(salvo); } catch (e) { props.deleteProperty(ICP_CONFIG.estoqueBancoIdProperty); }
  }

  const folder = DriveApp.getFolderById(ICP_CONFIG.pastaProjetoId);
  const files = folder.getFilesByName(ICP_CONFIG.estoqueBancoNome);
  if (files.hasNext()) {
    const file = files.next();
    const ssExistente = SpreadsheetApp.openById(file.getId());
    props.setProperty(ICP_CONFIG.estoqueBancoIdProperty, ssExistente.getId());
    return ssExistente;
  }

  const ss = SpreadsheetApp.create(ICP_CONFIG.estoqueBancoNome);
  const file = DriveApp.getFileById(ss.getId());
  file.moveTo(folder);
  prepararAbasEstoque_(ss);
  props.setProperty(ICP_CONFIG.estoqueBancoIdProperty, ss.getId());
  return ss;
}

function prepararAbasEstoque_(ss) {
  const estoque = ss.getSheets()[0];
  estoque.setName(ICP_CONFIG.abas.estoque);
  estoque.clear();
  estoque.getRange(1,1,1,12).setValues([['ID','Categoria','Item','Lote','Unidade','Quantidade em estoque','Qtde de lotes/embalagens','Estoque mínimo','Status','Responsável','Última atualização','Observações']]);
  const hoje = new Date();
  const rows = ICP_ESTOQUE_INICIAL.map((r,i) => [
    Utilities.getUuid(),r[0],r[1],r[2],r[3],r[4],r[5],r[6],calcularStatusEstoque_(r[4],r[6]),r[7],r[8] ? new Date(r[8] + 'T12:00:00') : hoje,r[9]
  ]);
  if (rows.length) estoque.getRange(2,1,rows.length,12).setValues(rows);
  estoque.setFrozenRows(1);
  estoque.getRange('K:K').setNumberFormat('dd/mm/yyyy HH:mm');

  const mov = ss.insertSheet(ICP_CONFIG.abas.movimentacoes);
  mov.getRange(1,1,1,12).setValues([['ID Movimento','Data/Hora','ID Item','Item','Lote','Tipo','Quantidade','Embalagens','Quantidade anterior','Quantidade nova','Responsável','Observações']]);
  mov.setFrozenRows(1);
  mov.getRange('B:B').setNumberFormat('dd/mm/yyyy HH:mm');

  const pedidos = ss.insertSheet(ICP_CONFIG.abas.pedidos);
  pedidos.getRange(1,1,1,9).setValues([['ID Pedido','Criado em','Item','Quantidade a comprar','Fornecedor','Data do pedido','Status do pedido','Observações','Responsável']]);
  pedidos.setFrozenRows(1);
  pedidos.getRange('B:B').setNumberFormat('dd/mm/yyyy HH:mm');
  pedidos.getRange('F:F').setNumberFormat('dd/mm/yyyy');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Pendente','Enviado','Recebido'], true).setAllowInvalid(false).build();
  pedidos.getRange('G2:G').setDataValidation(rule);

  [estoque,mov,pedidos].forEach(sh => {
    sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#2563EB').setFontColor('#FFFFFF');
    sh.autoResizeColumns(1, sh.getLastColumn());
  });
}

function normalizarCodigoBipagem_(raw) {
  const digits = String(raw == null ? '' : raw).replace(/\D/g,'');
  if (!digits) return {raw:String(raw || ''), prefixo:'', id:'', idAmostra:'', embalagem:''};

  // A planilha histórica armazena IDs no formato observado: 6 dígitos de amostra + 4 de embalagem.
  // Alguns leitores podem enviar um prefixo de 2 dígitos antes desse bloco; ele é removido quando presente.
  let prefixo = '';
  let core = digits;
  if (digits.length === 12) { prefixo = digits.slice(0,2); core = digits.slice(2); }
  if (core.length !== 10) throw new Error('Código inválido. Esperado 10 dígitos (ID + embalagem) ou 12 dígitos com prefixo.');
  return {
    raw: digits,
    prefixo,
    id: core,
    idAmostra: core.slice(0,6),
    embalagem: core.slice(6,10)
  };
}

function localizarAmostra_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const vals = sh.getRange(2,4,last-1,1).getDisplayValues();
  for (let i=0;i<vals.length;i++) if (String(vals[i][0]).trim() === String(id)) return i + 2;
  return 0;
}

function proximaLinhaLiberacao_(sh) {
  const last = Math.max(sh.getLastRow(),1);
  const vals = sh.getRange(2,4,Math.max(last-1,1),1).getDisplayValues();
  for (let i=0;i<vals.length;i++) if (!String(vals[i][0]).trim()) return i+2;
  return last+1;
}

function localizarItemEstoquePorId_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const finder = sh.getRange(2,1,last-1,1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return finder ? finder.getRow() : 0;
}

function calcularStatusEstoque_(quantidade, minimo) {
  if (minimo === '' || minimo == null || isNaN(Number(minimo))) return 'Definir mínimo';
  return Number(quantidade) <= Number(minimo) ? 'Baixo estoque' : 'OK';
}

function buildResumoEstoque_(items) {
  return {
    itens: items.length,
    baixo: items.filter(i => i.status === 'Baixo estoque').length,
    definirMinimo: items.filter(i => i.status === 'Definir mínimo').length,
    ok: items.filter(i => i.status === 'OK').length
  };
}

function numeroNaoNegativo_(value, label) {
  const n = Number(String(value == null ? '' : value).replace(',','.'));
  if (!isFinite(n) || n < 0) throw new Error(label + ' deve ser um número maior ou igual a zero.');
  return n;
}

function nomeAbaMes_(date) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return meses[date.getMonth()];
}

function formatarDataHora_(date) {
  if (!date) return '';
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm');
}
