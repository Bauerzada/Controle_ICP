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

function salvarItemEstoqueICP(payload) {
  payload = payload || {};
  const item = String(payload.item || '').trim();
  const unidade = String(payload.unidade || '').trim();
  if (!item) throw new Error('Informe o item.');
  if (!unidade) throw new Error('Informe a unidade.');

  const quantidade = numeroNaoNegativo_(payload.quantidade, 'Quantidade em estoque');
  const embalagens = numeroNaoNegativo_(payload.embalagens, 'Qtde de lotes/embalagens');
  const minimo = payload.minimo === '' || payload.minimo == null ? '' : numeroNaoNegativo_(payload.minimo, 'Estoque mínimo');
  const responsavel = String(payload.responsavel || Session.getActiveUser().getEmail() || '').trim();

  const sh = getOrCreateEstoqueBanco_().getSheetByName(ICP_CONFIG.abas.estoque);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const id = payload.id ? String(payload.id) : Utilities.getUuid();
    const row = localizarItemEstoquePorId_(sh, id);
    const status = calcularStatusEstoque_(quantidade, minimo);
    const values = [[
      id, String(payload.categoria || 'Outro').trim(), item, String(payload.lote || '').trim(), unidade,
      quantidade, embalagens, minimo, status, responsavel, new Date(), String(payload.observacoes || '').trim()
    ]];
    if (row) sh.getRange(row, 1, 1, 12).setValues(values);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, 12).setValues(values);
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
    if (tipo === 'ENTRADA') { novaQtd += quantidadeMov; novasEmb += embalagensMov; }
    if (tipo === 'SAIDA') { novaQtd -= quantidadeMov; novasEmb -= embalagensMov; }
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
  getOrCreateEstoqueBanco_().getSheetByName(ICP_CONFIG.abas.pedidos).appendRow([
    Utilities.getUuid(), new Date(), item, quantidade, String(payload.fornecedor || ''),
    payload.dataPedido ? new Date(payload.dataPedido + 'T12:00:00') : '', status,
    String(payload.observacoes || ''), Session.getActiveUser().getEmail() || ''
  ]);
  return {ok:true};
}

function getEstoqueICP() { return getEstoqueICP_(); }

function getEstoqueICP_() {
  const sh = getOrCreateEstoqueBanco_().getSheetByName(ICP_CONFIG.abas.estoque);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2,1,last-1,12).getValues().filter(r => r[0]).map(r => ({
    id:String(r[0]), categoria:r[1], item:r[2], lote:r[3], unidade:r[4], quantidade:Number(r[5]) || 0,
    embalagens:Number(r[6]) || 0, minimo:r[7] === '' ? '' : Number(r[7]),
    status:calcularStatusEstoque_(Number(r[5]) || 0, r[7] === '' ? '' : Number(r[7])),
    responsavel:r[9] || '', ultimaAtualizacao:formatarDataHora_(r[10]), observacoes:r[11] || ''
  }));
}

function getOrCreateEstoqueBanco_() {
  const props = PropertiesService.getScriptProperties();
  const salvo = props.getProperty(ICP_CONFIG.estoqueBancoIdProperty);
  if (salvo) {
    try {
      const file = DriveApp.getFileById(salvo);
      if (typeof file.isTrashed === 'function' && file.isTrashed()) throw new Error('Banco na lixeira');
      const parents = file.getParents();
      let noEscopo = false;
      while (parents.hasNext()) if (parents.next().getId() === ICP_CONFIG.pastaProjetoId) noEscopo = true;
      if (!noEscopo) throw new Error('Banco fora da pasta do projeto');
      return SpreadsheetApp.openById(salvo);
    } catch (e) {
      props.deleteProperty(ICP_CONFIG.estoqueBancoIdProperty);
    }
  }

  const folder = DriveApp.getFolderById(ICP_CONFIG.pastaProjetoId);
  const files = folder.getFilesByName(ICP_CONFIG.estoqueBancoNome);
  while (files.hasNext()) {
    const file = files.next();
    if (typeof file.isTrashed === 'function' && file.isTrashed()) continue;
    const ssExistente = SpreadsheetApp.openById(file.getId());
    props.setProperty(ICP_CONFIG.estoqueBancoIdProperty, ssExistente.getId());
    return ssExistente;
  }

  const ss = SpreadsheetApp.create(ICP_CONFIG.estoqueBancoNome);
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  prepararAbasEstoque_(ss);
  props.setProperty(ICP_CONFIG.estoqueBancoIdProperty, ss.getId());
  return ss;
}

function prepararAbasEstoque_(ss) {
  const estoque = ss.getSheets()[0];
  estoque.setName(ICP_CONFIG.abas.estoque);
  estoque.clear();
  estoque.getRange(1,1,1,12).setValues([['ID','Categoria','Item','Lote','Unidade','Quantidade em estoque','Qtde de lotes/embalagens','Estoque mínimo','Status','Responsável','Última atualização','Observações']]);
  const rows = ICP_ESTOQUE_INICIAL.map(r => [Utilities.getUuid(),r[0],r[1],r[2],r[3],r[4],r[5],r[6],calcularStatusEstoque_(r[4],r[6]),r[7],new Date(r[8]+'T12:00:00'),r[9]]);
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
  pedidos.getRange('G2:G').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pendente','Enviado','Recebido'],true).setAllowInvalid(false).build());

  [estoque,mov,pedidos].forEach(sh => {
    sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#2563EB').setFontColor('#FFFFFF');
    sh.autoResizeColumns(1,sh.getLastColumn());
  });
}

function localizarItemEstoquePorId_(sh,id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const finder = sh.getRange(2,1,last-1,1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return finder ? finder.getRow() : 0;
}

function calcularStatusEstoque_(quantidade,minimo) {
  if (minimo === '' || minimo == null || isNaN(Number(minimo))) return 'Definir mínimo';
  return Number(quantidade) <= Number(minimo) ? 'Baixo estoque' : 'OK';
}

function buildResumoEstoque_(items) {
  return {
    itens:items.length,
    baixo:items.filter(i => i.status === 'Baixo estoque').length,
    definirMinimo:items.filter(i => i.status === 'Definir mínimo').length,
    ok:items.filter(i => i.status === 'OK').length
  };
}
