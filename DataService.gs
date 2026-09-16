const ICP_OPS_DB = Object.freeze({property:'ICP_OPERACAO_BANCO_ID',name:'Controle ICP - Operação',tabs:{
  fila:['ID','Código','Amostra','Embalagem','Métodos','Status','Responsável','Criado em','Atualizado em','Observações'],
  atividades:['ID','Nº Atividade','CR','Amostra','Cliente','Parâmetro','Motivo','Responsável','Status','Repetindo','Resolução','Resultado','Criado em','Atualizado em'],
  curvas:['ID','Tipo','Identificação','Padrão/Item estoque','Volume consumido','Unidade','Responsável','Status','Data','Observações','Criado em'],
  cq:['ID','Tipo','Método','Resultado','Unidade','Limite inferior','Limite superior','Status','Curva ID','Responsável','Data','Observações','Criado em'],
  sequencias:['ID','Nome','Método','Amostras','Quantidade','Responsável','Status','Início','Fim','Observações','Criado em','Atualizado em'],
  equipamento:['ID','Tipo','Descrição','Status','Responsável','Data','Próxima ação','Observações','Criado em','Atualizado em'],
  erros:['ID','Código','Título','Sintoma','Causa','Solução','Responsável','Data','Evidência','Criado em','Atualizado em'],
  caixas:['ID','Caixa','Amostra','Embalagem','Status','Responsável','Data','Observações']
}});
function getOpsDb_(){
  const p=PropertiesService.getScriptProperties();
  const id=p.getProperty(ICP_OPS_DB.property);
  if(id){
    try{
      const ss=SpreadsheetApp.openById(id);
      ensureOpsTabs_(ss);
      return ss;
    }catch(e){
      console.error('ICP_OPS_DB: falha ao abrir banco configurado '+id+': '+(e&&e.message?e.message:e));
    }
  }
  const ss=SpreadsheetApp.create(ICP_OPS_DB.name);
  p.setProperty(ICP_OPS_DB.property,ss.getId());
  ensureOpsTabs_(ss);
  return ss;
}
function ensureOpsTabs_(ss){const defs=ICP_OPS_DB.tabs;Object.keys(defs).forEach((k,idx)=>{let sh=ss.getSheetByName(k);if(!sh){sh=idx===0&&ss.getSheets().length===1&&ss.getSheets()[0].getLastRow()===0?ss.getSheets()[0].setName(k):ss.insertSheet(k)}const h=defs[k];if(sh.getLastRow()===0)sh.getRange(1,1,1,h.length).setValues([h]).setFontWeight('bold').setBackground('#E8EEF9');});}
function opsRows_(tab){const ss=getOpsDb_();ensureOpsTabs_(ss);const sh=ss.getSheetByName(tab),v=sh.getDataRange().getValues(),h=v.shift()||[];return v.filter(r=>r.some(x=>x!==''&&x!=null)).map(r=>Object.fromEntries(h.map((x,i)=>[x,r[i] instanceof Date?formatarDataHora_(r[i]):r[i]])))}
function opsAppend_(tab,row){const lock=LockService.getScriptLock();lock.waitLock(20000);try{const ss=getOpsDb_();ensureOpsTabs_(ss);const sh=ss.getSheetByName(tab),h=ICP_OPS_DB.tabs[tab];sh.appendRow(h.map(x=>row[x]??''));return row}finally{lock.releaseLock()}}
function opsUpdate_(tab,id,patch){const lock=LockService.getScriptLock();lock.waitLock(20000);try{const ss=getOpsDb_();ensureOpsTabs_(ss);const sh=ss.getSheetByName(tab),v=sh.getDataRange().getValues(),h=v[0],ix=h.indexOf('ID');for(let r=1;r<v.length;r++)if(String(v[r][ix])===String(id)){Object.keys(patch).forEach(k=>{const c=h.indexOf(k);if(c>=0)sh.getRange(r+1,c+1).setValue(patch[k])});return true}throw new Error('Registro não localizado.')}finally{lock.releaseLock()}}
function novoIdICP_(prefix){return prefix+'-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMddHHmmss')+'-'+Utilities.getUuid().slice(0,6).toUpperCase()}
function agoraISOICP_(){return new Date().toISOString()}
function textoICP_(v,max){const s=String(v??'').trim();return max?s.slice(0,max):s}
