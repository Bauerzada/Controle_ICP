function instalarOperacaoICP(){const ss=getOpsDb_();ensureOpsTabs_(ss);return {ok:true,id:ss.getId(),url:ss.getUrl()}}

/**
 * Bootstrap operacional resiliente.
 * Um módulo secundário ausente/quebrado não pode derrubar dashboard, estoque
 * ou fila de preparo. Cada leitor é isolado e devolve [] em falha, registrando
 * o erro no log de execução.
 */
function getOperacaoBootstrap_(){
  const safe=(nome,fn)=>{try{const v=fn();return Array.isArray(v)?v:[]}catch(e){console.error('[OPS:'+nome+'] '+(e&&e.stack?e.stack:e));return[]}};
  const fila=safe('fila',()=>listarFilaPreparoICP_());
  const ativ=safe('atividades',()=>listarAtividadesICP_());
  const curvas=safe('curvas',()=>listarCurvasICP_());
  const cq=safe('cq',()=>listarCQICP_());
  const seq=safe('sequencias',()=>listarSequenciasICP_());
  const eq=safe('equipamento',()=>listarEquipamentoICP_());
  const erros=safe('erros',()=>listarErrosICP_());
  return {fila,atividades:ativ,curvas,cq,sequencias:seq,equipamento:eq,erros,resumo:{
    filaAberta:fila.filter(x=>!['Liberado','Concluído'].includes(String(x.Status))).length,
    atividadesAbertas:ativ.filter(x=>String(x.Status).toLowerCase()!=='resolvida').length,
    cqFora:cq.filter(x=>x.Status==='Fora do limite').length,
    sequenciasAbertas:seq.filter(x=>!['Concluída','Finalizada'].includes(String(x.Status))).length,
    ocorrenciasAbertas:eq.filter(x=>String(x.Status).toLowerCase()!=='concluído').length
  }}
}
