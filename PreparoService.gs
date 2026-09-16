function listarFilaPreparoICP_(){return opsRows_('fila').reverse().slice(0,500)}

function adicionarFilaPreparoICP_(dados){
  dados=dados||{};
  return opsAppend_('fila',{'ID':novoIdICP_('PREP'),'Código':textoICP_(dados.codigo,40),'Amostra':textoICP_(dados.amostra,40),'Embalagem':textoICP_(dados.embalagem,20),'Métodos':Array.isArray(dados.metodos)?dados.metodos.join(', '):textoICP_(dados.metodos,200),'Status':dados.status||'Aguardando preparo','Responsável':textoICP_(dados.responsavel,100),'Criado em':agoraISOICP_(),'Atualizado em':agoraISOICP_(),'Observações':textoICP_(dados.observacoes,500)})
}

function atualizarFilaPreparoICP_(p){
  p=p||{};if(!p.id)throw new Error('ID obrigatório.');
  opsUpdate_('fila',p.id,{'Status':textoICP_(p.status,60),'Responsável':textoICP_(p.responsavel,100),'Atualizado em':agoraISOICP_(),'Observações':textoICP_(p.observacoes,500)});
  return {ok:true}
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
