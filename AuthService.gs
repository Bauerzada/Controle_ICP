const ICP_AUTH = Object.freeze({
  usuariosProperty:'ICP_AUTH_USUARIOS_V1',
  sessoesProperty:'ICP_AUTH_SESSOES_V1',
  sessionHours:12,
  perfis:['ADMINISTRADOR','GESTOR','OPERADOR']
});

function getAuthBootstrapICP() {
  const usuarios = authUsuarios_();
  return {instalado:usuarios.length>0, perfis:ICP_AUTH.perfis.slice(), version:ICP_VERSION};
}

function instalarAdministradorICP(payload) {
  payload=payload||{};
  const usuarios=authUsuarios_();
  if (usuarios.length) throw new Error('O Controle ICP já possui administrador.');
  const nome=String(payload.nome||'').trim();
  const usuario=normalizarUsuarioICP_(payload.usuario);
  const senha=String(payload.senha||'');
  validarCredenciaisNovasICP_(nome,usuario,senha);
  const registro={id:Utilities.getUuid(),nome,usuario,perfil:'ADMINISTRADOR',ativo:true,salt:Utilities.getUuid(),criadoEm:new Date().toISOString()};
  registro.senhaHash=hashSenhaICP_(senha,registro.salt);
  salvarUsuariosICP_([registro]);
  return loginICP({usuario,senha});
}

function loginICP(payload) {
  payload=payload||{};
  limparSessoesExpiradasICP_();
  const usuario=normalizarUsuarioICP_(payload.usuario);
  const senha=String(payload.senha||'');
  const registro=authUsuarios_().find(u=>u.usuario===usuario);
  if (!registro || !registro.ativo || hashSenhaICP_(senha,registro.salt)!==registro.senhaHash) throw new Error('Usuário ou senha inválidos.');
  const token=Utilities.getUuid()+Utilities.getUuid();
  const agora=Date.now(), expira=agora+ICP_AUTH.sessionHours*60*60*1000;
  const sessoes=authSessoes_();
  sessoes[token]={usuarioId:registro.id,criadoEm:agora,expiraEm:expira};
  salvarSessoesICP_(sessoes);
  return {ok:true,token,usuario:usuarioPublicoICP_(registro),expiraEm:new Date(expira).toISOString()};
}

function validarSessaoICP(token) {
  try { const u=exigirSessaoICP_(token); return {ok:true,usuario:usuarioPublicoICP_(u)}; }
  catch(e){ return {ok:false,mensagem:e.message}; }
}
function logoutICP(token){const s=authSessoes_();if(token&&s[token]){delete s[token];salvarSessoesICP_(s)}return {ok:true};}
function listarUsuariosICP(token){exigirPerfilICP_(token,['ADMINISTRADOR']);return authUsuarios_().map(usuarioPublicoICP_);}
function salvarUsuarioICP(token,payload){
  exigirPerfilICP_(token,['ADMINISTRADOR']); payload=payload||{};
  const usuarios=authUsuarios_(), id=String(payload.id||''), nome=String(payload.nome||'').trim(), usuario=normalizarUsuarioICP_(payload.usuario), perfil=String(payload.perfil||'OPERADOR').toUpperCase(), senha=String(payload.senha||'');
  if(!nome||!usuario) throw new Error('Informe nome e usuário.');
  if(ICP_AUTH.perfis.indexOf(perfil)<0) throw new Error('Perfil inválido.');
  if(usuarios.some(u=>u.usuario===usuario&&u.id!==id)) throw new Error('Este usuário já está cadastrado.');
  let reg=usuarios.find(u=>u.id===id);
  if(reg){reg.nome=nome;reg.usuario=usuario;reg.perfil=perfil;reg.ativo=payload.ativo!==false;if(senha){if(senha.length<6)throw new Error('A senha deve ter pelo menos 6 caracteres.');reg.salt=Utilities.getUuid();reg.senhaHash=hashSenhaICP_(senha,reg.salt);}}
  else{if(senha.length<6)throw new Error('A senha deve ter pelo menos 6 caracteres.');reg={id:Utilities.getUuid(),nome,usuario,perfil,ativo:payload.ativo!==false,salt:Utilities.getUuid(),criadoEm:new Date().toISOString()};reg.senhaHash=hashSenhaICP_(senha,reg.salt);usuarios.push(reg);}
  salvarUsuariosICP_(usuarios); return usuarioPublicoICP_(reg);
}
function alterarMinhaSenhaICP(token,payload){
  payload=payload||{};
  const atual=String(payload.senhaAtual||''), nova=String(payload.novaSenha||''), confirmacao=String(payload.confirmacao||'');
  const sessao=exigirSessaoICP_(token);
  if(hashSenhaICP_(atual,sessao.salt)!==sessao.senhaHash) throw new Error('Senha atual incorreta.');
  if(nova.length<6) throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
  if(nova!==confirmacao) throw new Error('A confirmação da nova senha não confere.');
  if(nova===atual) throw new Error('A nova senha deve ser diferente da senha atual.');
  const usuarios=authUsuarios_(), reg=usuarios.find(u=>u.id===sessao.id);
  if(!reg) throw new Error('Usuário não localizado.');
  reg.salt=Utilities.getUuid(); reg.senhaHash=hashSenhaICP_(nova,reg.salt);
  salvarUsuariosICP_(usuarios);
  const sessoes=authSessoes_(); Object.keys(sessoes).forEach(k=>{if(sessoes[k]&&sessoes[k].usuarioId===reg.id&&k!==String(token))delete sessoes[k];}); salvarSessoesICP_(sessoes);
  return {ok:true,mensagem:'Senha alterada com sucesso.'};
}

function executarAcaoICP(token,acao,args){
  const mapa={
    listarUsuariosICP:{perfis:['ADMINISTRADOR'],fn:()=>authUsuarios_().map(usuarioPublicoICP_)},
    salvarUsuarioICP:{perfis:['ADMINISTRADOR'],fn:a=>salvarUsuarioAutenticadoICP_(a[0])},
    alterarMinhaSenhaICP:{perfis:ICP_AUTH.perfis,fn:a=>alterarMinhaSenhaAutenticadoICP_(token,a[0])},
    getBootstrapICP:{perfis:ICP_AUTH.perfis,fn:()=>getBootstrapICP_()},
    interpretarCodigoICP:{perfis:ICP_AUTH.perfis,fn:a=>interpretarCodigoICP(a[0])},
    registrarAmostraICP:{perfis:ICP_AUTH.perfis,fn:a=>registrarAmostraICP(a[0])},
    salvarItemEstoqueICP:{perfis:['ADMINISTRADOR','GESTOR'],fn:a=>salvarItemEstoqueICP(a[0])},
    registrarMovimentacaoEstoqueICP:{perfis:ICP_AUTH.perfis,fn:a=>registrarMovimentacaoEstoqueICP(a[0])},
    salvarPedidoICP:{perfis:['ADMINISTRADOR','GESTOR'],fn:a=>salvarPedidoICP(a[0])},
    getOperacaoBootstrap:{perfis:ICP_AUTH.perfis,fn:()=>getOperacaoBootstrap_()},
    atualizarFilaPreparoICP:{perfis:ICP_AUTH.perfis,fn:a=>atualizarFilaPreparoICP_(a[0])},
    salvarAtividadeICP:{perfis:ICP_AUTH.perfis,fn:a=>salvarAtividadeICP_(a[0])},
    registrarCurvaICP:{perfis:['ADMINISTRADOR','GESTOR'],fn:a=>registrarCurvaICP_(a[0])},
    registrarCQICP:{perfis:ICP_AUTH.perfis,fn:a=>registrarCQICP_(a[0])},
    salvarSequenciaICP:{perfis:ICP_AUTH.perfis,fn:a=>salvarSequenciaICP_(a[0])},
    registrarEquipamentoICP:{perfis:['ADMINISTRADOR','GESTOR'],fn:a=>registrarEquipamentoICP_(a[0])},
    registrarErroICP:{perfis:['ADMINISTRADOR','GESTOR'],fn:a=>registrarErroICP_(a[0])},
    listarRequisicoesICP:{perfis:ICP_AUTH.perfis,fn:()=>listarRequisicoesICP_()},
    atualizarRequisicaoICP:{perfis:['ADMINISTRADOR','GESTOR'],fn:a=>atualizarRequisicaoICP_(a[0])},
    listarCaixasICP:{perfis:ICP_AUTH.perfis,fn:()=>listarCaixasICP_()},
    registrarCaixaICP:{perfis:ICP_AUTH.perfis,fn:a=>registrarCaixaICP_(a[0])}
  };
  const item=mapa[String(acao||'')]; if(!item)throw new Error('Ação não permitida.');
  exigirPerfilICP_(token,item.perfis); return item.fn(Array.isArray(args)?args:[]);
}
function exigirSessaoICP_(token){limparSessoesExpiradasICP_();const s=authSessoes_(),sess=s[String(token||'')];if(!sess)throw new Error('Sessão expirada. Entre novamente.');const u=authUsuarios_().find(x=>x.id===sess.usuarioId);if(!u||!u.ativo)throw new Error('Usuário sem acesso ao sistema.');return u;}
function exigirPerfilICP_(token,perfis){const u=exigirSessaoICP_(token);if(perfis.indexOf(u.perfil)<0)throw new Error('Seu perfil não possui permissão para esta ação.');return u;}
function authUsuarios_(){try{return JSON.parse(PropertiesService.getScriptProperties().getProperty(ICP_AUTH.usuariosProperty)||'[]')}catch(e){return[]}}
function salvarUsuariosICP_(v){PropertiesService.getScriptProperties().setProperty(ICP_AUTH.usuariosProperty,JSON.stringify(v));}
function authSessoes_(){try{return JSON.parse(PropertiesService.getScriptProperties().getProperty(ICP_AUTH.sessoesProperty)||'{}')}catch(e){return{}}}
function salvarSessoesICP_(v){PropertiesService.getScriptProperties().setProperty(ICP_AUTH.sessoesProperty,JSON.stringify(v));}
function limparSessoesExpiradasICP_(){const s=authSessoes_(),agora=Date.now();let mudou=false;Object.keys(s).forEach(k=>{if(!s[k]||Number(s[k].expiraEm)<=agora){delete s[k];mudou=true}});if(mudou)salvarSessoesICP_(s);}
function normalizarUsuarioICP_(v){return String(v||'').trim().toLowerCase();}
function validarCredenciaisNovasICP_(nome,usuario,senha){if(!nome||!usuario)throw new Error('Informe nome e usuário.');if(senha.length<6)throw new Error('A senha deve ter pelo menos 6 caracteres.');}
function hashSenhaICP_(senha,salt){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+'|'+String(senha),Utilities.Charset.UTF_8);return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');}
function usuarioPublicoICP_(u){return {id:u.id,nome:u.nome,usuario:u.usuario,perfil:u.perfil,ativo:u.ativo!==false};}

function salvarUsuarioAutenticadoICP_(payload){
  payload=payload||{}; const usuarios=authUsuarios_(),id=String(payload.id||''),nome=String(payload.nome||'').trim(),usuario=normalizarUsuarioICP_(payload.usuario),perfil=String(payload.perfil||'OPERADOR').toUpperCase(),senha=String(payload.senha||'');
  if(!nome||!usuario)throw new Error('Informe nome e usuário.'); if(ICP_AUTH.perfis.indexOf(perfil)<0)throw new Error('Perfil inválido.');
  if(usuarios.some(u=>u.usuario===usuario&&u.id!==id))throw new Error('Este usuário já está cadastrado.');
  let reg=usuarios.find(u=>u.id===id);
  if(reg){reg.nome=nome;reg.usuario=usuario;reg.perfil=perfil;reg.ativo=payload.ativo!==false;if(senha){if(senha.length<6)throw new Error('A senha deve ter pelo menos 6 caracteres.');reg.salt=Utilities.getUuid();reg.senhaHash=hashSenhaICP_(senha,reg.salt);}}
  else{if(senha.length<6)throw new Error('A senha deve ter pelo menos 6 caracteres.');reg={id:Utilities.getUuid(),nome,usuario,perfil,ativo:payload.ativo!==false,salt:Utilities.getUuid(),criadoEm:new Date().toISOString()};reg.senhaHash=hashSenhaICP_(senha,reg.salt);usuarios.push(reg);}
  salvarUsuariosICP_(usuarios); return usuarioPublicoICP_(reg);
}
function alterarMinhaSenhaAutenticadoICP_(token,payload){
  payload=payload||{}; const atual=String(payload.senhaAtual||''),nova=String(payload.novaSenha||''),confirmacao=String(payload.confirmacao||''),sessao=exigirSessaoICP_(token);
  if(hashSenhaICP_(atual,sessao.salt)!==sessao.senhaHash)throw new Error('Senha atual incorreta.'); if(nova.length<6)throw new Error('A nova senha deve ter pelo menos 6 caracteres.'); if(nova!==confirmacao)throw new Error('A confirmação da nova senha não confere.'); if(nova===atual)throw new Error('A nova senha deve ser diferente da senha atual.');
  const usuarios=authUsuarios_(),reg=usuarios.find(u=>u.id===sessao.id); reg.salt=Utilities.getUuid();reg.senhaHash=hashSenhaICP_(nova,reg.salt);salvarUsuariosICP_(usuarios);
  const sessoes=authSessoes_();Object.keys(sessoes).forEach(k=>{if(sessoes[k]&&sessoes[k].usuarioId===reg.id&&k!==String(token))delete sessoes[k];});salvarSessoesICP_(sessoes);return {ok:true};
}
