function listarFilaPreparoICP_(){
  return opsRows_('fila').reverse().slice(0,500).map(function(x){
    const y=Object.assign({},x);
    y['Atualização exibida']=formatarDataHora_(x['Atualizado em']);
    return y;
  });
}

function adicionarFilaPreparoICP_(dados){
  dados=dados||{};
  return opsAppend_('fila',{'ID':novoIdICP_('PREP'),'Código':textoICP_(dados.codigo,40),'Amostra':textoICP_(dados.amostra,40),'Embalagem':textoICP_(dados.embalagem,20),'Métodos':Array.isArray(dados.metodos)?dados.metodos.join(', '):textoICP_(dados.metodos,200),'Status':dados.status||'Aguardando preparo','Responsável':textoICP_(dados.responsavel,100),'Criado em':agoraISOICP_(),'Atualizado em':agoraISOICP_(),'Observações':textoICP_(dados.observacoes,500)})
}

function atualizarFilaPreparoICP_(p){
  p=p||{};if(!p.id)throw new Error('ID obrigatório.');
  const atuais=opsRows_('fila');
  const atual=atuais.find(function(x){return String(x.ID)===String(p.id)});
  if(!atual)throw new Error('Registro da fila não encontrado.');
  const ordem=['Aguardando preparo','Em preparo','Preparado','Liberado'];
  const statusAtual=textoICP_(atual.Status||'Aguardando preparo',60);
  const statusNovo=textoICP_(p.status,60);
  const idxAtual=ordem.indexOf(statusAtual), idxNovo=ordem.indexOf(statusNovo);
  if(idxNovo<0)throw new Error('Status de preparo inválido.');
  if(idxAtual>=0 && idxNovo!==Math.min(idxAtual+1,ordem.length-1) && statusNovo!==statusAtual)throw new Error('Transição de preparo inválida.');
  const agora=agoraISOICP_();
  const responsavel=textoICP_(p.responsavel||atual['Responsável'],100);
  opsUpdate_('fila',p.id,{'Status':statusNovo,'Responsável':responsavel,'Atualizado em':agora,'Observações':textoICP_(p.observacoes!=null?p.observacoes:atual['Observações'],500)});
  return {ok:true,id:p.id,statusAnterior:statusAtual,status:statusNovo,responsavel:responsavel,atualizadoEm:agora,atualizacaoExibida:formatarDataHora_(agora)}
}

/**
 * Reconcilia a fila operacional com a planilha oficial de liberação.
 * É idempotente: não duplica registros já existentes na fila.
 * Recupera também amostras registradas quando uma falha secundária impediu
 * a gravação em ICP_OPS_DB.fila.
 */
function sincronizarFilaPreparoICP_(){
  const ss=SpreadsheetApp.openById(ICP_CONFIG.liberacaoSpreadsheetId);
  const existentes=opsRows_('fila');
  const chaves=new Set(existentes.map(x=>String(x.Código||'').replace(/\D/g,'')).filter(Boolean));
  let adicionadas=0, verificadas=0;
  ss.getSheets().forEach(sh=>{
    const last=sh.getLastRow();
    if(last<2)return;
    const vals=sh.getRange(2,1,last-1,16).getValues();
    vals.forEach(r=>{
      const id=String(r[3]==null?'':r[3]).replace(/\D/g,'');
      if(!id)return;
      verificadas++;
      if(chaves.has(id))return;
      const metodos=ICP_CONFIG.metodos.filter((m,i)=>r[5+i]===true||String(r[5+i]).toUpperCase()==='TRUE');
      if(!metodos.length)return;
      adicionarFilaPreparoICP_({
        codigo:id,
        amostra:id.slice(0,6),
        embalagem:id.slice(6,10),
        metodos:metodos,
        status:String(r[2]||'')==='Liberado'?'Liberado':'Aguardando preparo',
        responsavel:String(r[15]||''),
        observacoes:String(r[12]||'')
      });
      chaves.add(id); adicionadas++;
    });
  });
  return {ok:true,adicionadas,verificadas,total:listarFilaPreparoICP_().length};
}
