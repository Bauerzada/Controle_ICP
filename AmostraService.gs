function registrarAmostraICP(payload) {
  payload = payload || {};
  const codigo = normalizarCodigoBipagem_(payload.codigo || payload.id || '');
  if (!codigo.id) throw new Error('Informe ou bipe uma amostra válida.');

  const metodos = Array.isArray(payload.metodos)
    ? payload.metodos.filter(m => ICP_CONFIG.metodos.indexOf(m) >= 0)
    : [];
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
    sh.getRange(row, 1, 1, 16).setValues([[
      '', dataRegistro, payload.liberacao || 'Pendente', Number(codigo.id), payload.cq || '',
      metodoFlags[0], metodoFlags[1], metodoFlags[2], metodoFlags[3], metodoFlags[4], metodoFlags[5],
      payload.diluicao || '', payload.observacao || '',
      payload.ml === '' || payload.ml == null ? '' : Number(payload.ml),
      payload.itrio || '', payload.tecnico || Session.getActiveUser().getEmail() || ''
    ]]);
    sh.getRange(row, 2).setNumberFormat('dd/mm/yyyy');
    sh.getRange(row, 4).setNumberFormat('0');
    sh.getRange(row, 6, 1, 6).insertCheckboxes().setValues([metodoFlags]);
    SpreadsheetApp.flush();

    return {ok:true, linha:row, aba:nomeAba, id:codigo.id, embalagem:codigo.embalagem, prefixo:codigo.prefixo, metodos};
  } finally {
    lock.releaseLock();
  }
}

function interpretarCodigoICP(codigo) {
  return normalizarCodigoBipagem_(codigo);
}

function normalizarCodigoBipagem_(raw) {
  const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (!digits) return {raw:String(raw || ''), prefixo:'', id:'', idAmostra:'', embalagem:''};

  let prefixo = '';
  let core = digits;
  if (digits.length === 12) {
    prefixo = digits.slice(0, 2);
    core = digits.slice(2);
  }
  if (core.length !== 10) {
    throw new Error('Código inválido. Esperado 10 dígitos (ID + embalagem) ou 12 dígitos com prefixo.');
  }

  return {raw:digits, prefixo, id:core, idAmostra:core.slice(0,6), embalagem:core.slice(6,10)};
}

function localizarAmostra_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const vals = sh.getRange(2, 4, last - 1, 1).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === String(id)) return i + 2;
  }
  return 0;
}

function proximaLinhaLiberacao_(sh) {
  const last = Math.max(sh.getLastRow(), 1);
  const vals = sh.getRange(2, 4, Math.max(last - 1, 1), 1).getDisplayValues();
  for (let i = 0; i < vals.length; i++) {
    if (!String(vals[i][0]).trim()) return i + 2;
  }
  return last + 1;
}
