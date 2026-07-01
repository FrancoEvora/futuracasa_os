(function(){
  const FC = window.FCData;
  const $ = (s,ctx=document)=>ctx.querySelector(s);
  const $$ = (s,ctx=document)=>[...ctx.querySelectorAll(s)];
  const el = (tag, cls, html)=>{const n=document.createElement(tag); if(cls)n.className=cls; if(html!==undefined)n.innerHTML=html; return n};
  const state = { maps:{}, selectedLot:null, selectedLead:null, postTrack:'infra', occPoint:null };

  function showToast(msg){ const t=$('#toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); clearTimeout(showToast._t); showToast._t=setTimeout(()=>t.classList.remove('show'),2200); }
  function openModal(html){ const m=$('#modal'); if(!m) return; m.innerHTML=`<div class="modal-card">${html}</div>`; m.classList.add('show'); m.onclick=(e)=>{ if(e.target===m) closeModal(); }; setTimeout(()=>{ Object.values(state.maps).forEach(x=>x.invalidateSize && x.invalidateSize()); }, 80); }
  function closeModal(){ const m=$('#modal'); if(m) m.classList.remove('show'); }
  window.closeModal = closeModal;

  function tagClass(status=''){
    const s=FC.statusTag(status);
    if(s.includes('dispon')) return 'available';
    if(s.includes('reserv')) return 'reservado';
    if(s.includes('vend')) return 'vendido';
    if(s.includes('concl')) return 'concluido';
    if(s.includes('andamento')) return 'em-andamento';
    if(s.includes('pend')) return 'pendente';
    if(s.includes('alta')) return 'alta';
    if(s.includes('media')) return 'media';
    if(s.includes('baixa')) return 'baixa';
    return '';
  }

  function initNav(){
    const btn=$('.nav-toggle'); const shell=$('.nav-shell');
    if(btn && shell){ btn.onclick=()=>shell.classList.toggle('open'); }
  }

  function nearestLot(lat,lng){
    let best=null, dist=Infinity;
    FC.lots().forEach(l=>{
      const d = Math.hypot(Number(l.lat)-lat, Number(l.lng)-lng);
      if(d<dist){ dist=d; best=l; }
    });
    return best;
  }

  function markerIcon(lot){
    const cls = String(lot.status).toLowerCase().includes('reserv') ? 'reservado' : String(lot.status).toLowerCase().includes('vend') ? 'vendido' : '';
    return L.divIcon({className:'', html:`<div class="marker-pill ${cls}">${lot.quadra}-${lot.lote}</div>`, iconSize:[54,28], iconAnchor:[27,14]});
  }

  function renderLotDetail(lot, mount){
    if(!mount || !lot) return;
    mount.innerHTML = `
      <article class="list-card">
        <header>
          <div>
            <span class="badge ${String(lot.status).toLowerCase().includes('dispon')?'green':'brand'}">${lot.status}</span>
            <h3 style="margin-top:10px">Quadra ${lot.quadra} · Lote ${lot.lote}</h3>
          </div>
          <span class="badge brand">Lote</span>
        </header>
        <div class="kv">
          <div><span>Área</span><b>${lot.area} m²</b></div>
          <div><span>Valor</span><b>${FC.brl(lot.preco)}</b></div>
          <div><span>Rua</span><b>${lot.rua}</b></div>
          <div><span>Empreendimento</span><b>${lot.empreendimento}</b></div>
          <div><span>Status</span><b>${lot.status}</b></div>
          <div><span>Coordenadas</span><b>${Number(lot.lat).toFixed(6)}, ${Number(lot.lng).toFixed(6)}</b></div>
        </div>
        <p style="margin:14px 0 0">Narrativa sugerida: ${lot.area>=500 ? 'metragem generosa, ' : ''}${String(lot.status).toLowerCase().includes('dispon') ? 'disponibilidade imediata, ' : ''}produto adequado para moradia, construção e preservação de valor.</p>
        <div class="actions" style="margin-top:16px">
          <button class="btn primary" data-act="simular">Simular proposta</button>
          <button class="btn secondary" data-act="rota">Abrir rota</button>
          <button class="btn secondary" data-act="ia">Gerar imagem por IA</button>
          <button class="btn ghost" data-act="ar">Ver no local (AR)</button>
        </div>
      </article>`;
    $$('[data-act]', mount).forEach(btn=>btn.onclick=()=>{
      const act=btn.dataset.act;
      if(act==='rota') window.open(`https://www.google.com/maps?q=${lot.lat},${lot.lng}`,'_blank');
      else if(act==='ar') openModal(`
        <div class="page-title"><span class="badge brand">Realidade aumentada</span><h3>Você está aqui</h3><p>Confirme a posição do lote e use a câmera do dispositivo no local para apontar o lote selecionado.</p></div>
        <div class="map-box small"><div id="arMap" class="map"></div></div>
        <div class="actions" style="margin-top:16px"><button class="btn primary" onclick="closeModal()">Fechar</button></div>`), setTimeout(()=>{
          if(state.maps.arMap){ state.maps.arMap.remove(); }
          const map=L.map('arMap',{zoomControl:true}).setView([lot.lat,lot.lng],19);
          state.maps.arMap=map; L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
          L.marker([lot.lat,lot.lng],{icon:markerIcon(lot)}).addTo(map); setTimeout(()=>map.invalidateSize(),120);
        },60);
      else showToast(act==='simular'?'Simulação preparada para o lote selecionado.':'Ação preparada no protótipo funcional.');
    });
  }

  function createLotMap(id, options={}){
    const elMap = document.getElementById(id); if(!elMap || typeof L==='undefined') return null;
    if(state.maps[id]) state.maps[id].remove();
    const map = L.map(id,{zoomControl:true, attributionControl:true}).fitBounds([[FC.enterpriseBounds.south, FC.enterpriseBounds.west],[FC.enterpriseBounds.north, FC.enterpriseBounds.east]],{padding:[20,20]});
    state.maps[id]=map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'&copy; OpenStreetMap'}).addTo(map);
    const fg = L.featureGroup().addTo(map);
    const featuredCodes = options.featuredCodes || ['A-12','A-39','B-08','D-07','F-09','H-14'];
    FC.lots().forEach(lot=>{
      const isFeatured = featuredCodes.includes(`${lot.quadra}-${lot.lote}`);
      const marker = isFeatured ? L.marker([lot.lat,lot.lng],{icon:markerIcon(lot)}) : L.circleMarker([lot.lat,lot.lng],{radius:5,weight:1,color:'#fff',fillColor:String(lot.status).toLowerCase().includes('reserv')?'#c57a58':String(lot.status).toLowerCase().includes('vend')?'#7a8088':'#2b7a7a',fillOpacity:.95});
      marker.addTo(fg).on('click',()=>options.onSelect && options.onSelect(lot));
      if(!isFeatured) marker.bindTooltip(`${lot.quadra}-${lot.lote}`,{direction:'top',offset:[0,-2],opacity:.9});
      if(options.selectCode && `${lot.quadra}-${lot.lote}`===options.selectCode){ map.setView([lot.lat,lot.lng],18); }
    });
    if(options.currentPoint){ L.marker([options.currentPoint.lat, options.currentPoint.lng]).addTo(map).bindPopup('Sua localização'); }
    setTimeout(()=>map.invalidateSize(),80);
    return map;
  }

  function lotFiltersHtml(){
    const quads=[...new Set(FC.lots().map(l=>l.quadra))].sort();
    return `
      <div class="filter-box">
        <div class="field" style="min-width:130px"><label>Quadra</label><select id="fQuadra"><option value="">Todas</option>${quads.map(q=>`<option value="${q}">${q}</option>`).join('')}</select></div>
        <div class="field" style="min-width:160px"><label>Status</label><select id="fStatus"><option value="">Todos</option><option value="disponível">Disponível</option><option value="reservado">Reservado</option><option value="vendido">Vendido</option></select></div>
        <div class="field" style="min-width:180px"><label>Buscar lote</label><input id="fSearch" placeholder="Ex.: D-07 ou H-14"></div>
      </div>`;
  }

  function filteredLots(){
    const q=$('#fQuadra')?.value||''; const s=$('#fStatus')?.value||''; const term=($('#fSearch')?.value||'').trim().toLowerCase();
    return FC.lots().filter(l=>{
      if(q && l.quadra!==q) return false;
      if(s && String(l.status).toLowerCase()!==s.toLowerCase()) return false;
      if(term && !(`${l.quadra}-${l.lote}`.toLowerCase().includes(term) || String(l.rua).toLowerCase().includes(term))) return false;
      return true;
    });
  }

  function attachSalesInteractions(){
    const list=$('#lotsList'); const detail=$('#lotDetail');
    function renderList(){
      const rows = filteredLots().slice(0,60);
      list.innerHTML = rows.map(l=>`<div class="tile" data-code="${l.quadra}-${l.lote}"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>Quadra ${l.quadra} · Lote ${l.lote}</b><span class="tag ${tagClass(l.status)}">${l.status}</span></div><small class="muted">${l.area} m² · ${FC.brl(l.preco)}</small></div>`).join('') || '<div class="note">Nenhum lote encontrado com os filtros selecionados.</div>';
      $$('.tile[data-code]', list).forEach(item=>item.onclick=()=>{
        const lot = FC.lots().find(l=>`${l.quadra}-${l.lote}`===item.dataset.code); state.selectedLot=lot; renderLotDetail(lot, detail); if(state.maps.salesMap) state.maps.salesMap.setView([lot.lat, lot.lng], 19);
      });
    }
    ['#fQuadra','#fStatus','#fSearch'].forEach(s=>$(s)?.addEventListener('input',renderList));
    renderList();
    const defaultLot = FC.lots().find(l=>`${l.quadra}-${l.lote}`==='H-14') || FC.lots()[0]; state.selectedLot=defaultLot; renderLotDetail(defaultLot, detail);
    createLotMap('salesMap',{selectCode:`${defaultLot.quadra}-${defaultLot.lote}`, onSelect:(lot)=>{ state.selectedLot=lot; renderLotDetail(lot,detail);} });
    $('#quickLeadForm')?.addEventListener('submit',e=>{
      e.preventDefault(); const fd=new FormData(e.currentTarget);
      const lead = FC.createLead(Object.fromEntries(fd.entries())); showToast(`Lead ${lead.name} cadastrado e qualificado.`); e.currentTarget.reset();
      const recs = FC.recommendProducts(lead); $('#leadPreview').innerHTML = recs.map(r=>`<div class="tile"><b>Quadra ${r.quadra} · Lote ${r.lote}</b><small>${r.reason}</small><small class="muted">Próxima ação: ${r.nextAction}</small></div>`).join('');
    });
  }

  function renderSales(root){
    root.innerHTML = `
    <section class="hero">
      <div class="wrap hero-grid">
        <article class="hero-card">
          <span class="badge">Futura Casa Pro</span>
          <h1>Escolha o produto certo e avance para a venda.</h1>
          <p class="lead">Mapa em OpenStreetMap com coordenadas reais dos lotes, ações padronizadas, recomendação comercial e captura de lead integrada.</p>
          <div class="benefits">
            <div class="benefit"><i>1</i><div><b>Escolha a jornada</b><small>lote, lote + casa ou casa no seu lote.</small></div></div>
            <div class="benefit"><i>2</i><div><b>Enxergue antes de decidir</b><small>mapa real, rota, AR e simulação comercial.</small></div></div>
            <div class="benefit"><i>3</i><div><b>Registre o lead</b><small>o sistema qualifica e recomenda o próximo passo.</small></div></div>
          </div>
        </article>
        <article class="mock-card">
          <div class="page-title"><span class="badge green">Lead rápido</span><h3>Qualifique um lead em segundos</h3><p>Este cadastro alimenta a Central IA automaticamente.</p></div>
          <form id="quickLeadForm" class="form-grid">
            <div class="field c6"><label>Nome</label><input name="name" required></div>
            <div class="field c6"><label>Telefone</label><input name="phone" required></div>
            <div class="field c4"><label>Cidade</label><input name="city"></div>
            <div class="field c4"><label>Objetivo</label><select name="goal"><option>Morar</option><option>Investir</option><option>Construir</option><option>Comprar para família</option><option>Comprar para revenda</option><option>Uso comercial</option></select></div>
            <div class="field c4"><label>Perfil</label><select name="profile"><option>família</option><option>investidor</option><option>construtor</option><option>comerciante</option><option>comprador indefinido</option></select></div>
            <div class="field c4"><label>Entrada disponível</label><input name="downPayment" type="number" value="120000"></div>
            <div class="field c4"><label>Parcela ideal</label><input name="monthly" type="number" value="4500"></div>
            <div class="field c4"><label>Prazo de compra</label><select name="buyWhen"><option>30 dias</option><option>60 dias</option><option>90 dias</option><option>120 dias</option><option>180 dias</option></select></div>
            <div class="field c6"><label>Objeção principal</label><input name="objection" placeholder="Ex.: entrada alta"></div>
            <div class="field c6"><label>Campanha/origem</label><input name="origin" value="Cadastro manual"></div>
            <div class="c12 actions"><button class="btn primary">Cadastrar e qualificar</button></div>
          </form>
          <div id="leadPreview" class="card-list"></div>
        </article>
      </div>
    </section>
    <section class="page">
      <div class="wrap section-stack">
        <div class="panel">
          <div class="panel-head"><div><span class="badge green">Mapa comercial</span><h2 style="margin-top:10px">Lotes com coordenadas reais no OpenStreetMap</h2><p>Para evitar distorções, esta versão usa marcadores posicionados por coordenadas. As ações de rota, AR, IA e simulação seguem o mesmo padrão visual.</p></div></div>
          ${lotFiltersHtml()}
          <div class="grid cols-main" style="margin-top:16px">
            <div class="map-shell">
              <div class="legend"><span><i style="background:#2b7a7a"></i>Disponível</span><span><i style="background:#c57a58"></i>Reservado</span><span><i style="background:#7a8088"></i>Vendido</span></div>
              <div class="map-box"><div id="salesMap" class="map"></div></div>
            </div>
            <div class="map-side">
              <div id="lotDetail"></div>
              <div class="panel" style="padding:16px"><div class="panel-head"><h3>Lista de lotes</h3><p class="muted">Toque em um lote para centralizar no mapa.</p></div><div id="lotsList" class="card-list" style="max-height:480px;overflow:auto"></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
    attachSalesInteractions();
  }

  function renderLeadRow(l){
    const recs = FC.recommendProducts(l); const broker = FC.chooseBroker(l);
    return `<tr>
      <td><b>${l.name}</b><br><small>${l.phone||''}</small></td>
      <td>${l.profile}<br><small>${l.goal}</small></td>
      <td><span class="tag ${tagClass(l.intent)}">${l.intent}</span><br><small>Score ${l.score} · ${l.probability}%</small></td>
      <td>${recs[0]?`Quadra ${recs[0].quadra} · Lote ${recs[0].lote}`:'-'}</td>
      <td>${l.objection||'-'}</td>
      <td>${l.nextAction}</td>
      <td>${broker?broker.name:'-'}</td>
    </tr>`;
  }

  function centralKPIs(){
    const k=FC.kpis(), leads=FC.leads();
    return `<div class="grid cols-4">
      <div class="stat-card"><small>Leads totais</small><b>${k.leads}</b><span class="sub">${k.hot} com alta intenção</span></div>
      <div class="stat-card"><small>Forecast provável</small><b>${FC.brl(k.revenue)}</b><span class="sub">Receita ponderada pelas probabilidades</span></div>
      <div class="stat-card"><small>Ocorrências abertas</small><b>${k.occurrences}</b><span class="sub">Integração entre campo, gestão e pós-venda</span></div>
      <div class="stat-card"><small>Negociações</small><b>${FC.proposals().length}</b><span class="sub">Propostas/hand-offs registrados</span></div>
    </div>`;
  }

  function topObjections(){
    const freq={}; FC.leads().forEach(l=>{ const k=(l.objection||'sem objeção').toLowerCase(); freq[k]=(freq[k]||0)+1; });
    const hints={
      'entrada alta':'Oferecer composição de entrada, tese patrimonial e escalonamento de fluxo.',
      'parcela alta':'Enviar simulação com opções e reforçar adequação de prazo.',
      'localização':'Usar mapa da região, acessos e narrativa de centralidade.',
      'valorização':'Enviar histórico da região, liquidez e drivers de valorização.',
      'metragem ideal':'Cruzar metragem, frente e implantação com o objetivo do cliente.',
      'sem objeção':'Aprofundar visita, prova de obra e proposta.'
    };
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`<div class="tile"><b>${k}</b><small>${v} ocorrência(s)</small><small class="muted">${hints[k]||'Sugerir material de apoio e próximo passo comercial.'}</small></div>`).join('');
  }

  function renderCentral(root){
    const leads=FC.leads().sort((a,b)=>b.probability-a.probability); const focus=leads[0]; const recs=focus?FC.recommendProducts(focus):[];
    root.innerHTML = `
      <section class="page">
        <div class="wrap section-stack">
          <div class="page-title"><span class="badge brand">Central Comercial Autônoma</span><h1>Todo lead recebe o produto certo, o argumento certo, o próximo passo certo e o corretor certo.</h1><p>MVP completo com SDR IA, recomendação de estoque, handoff inteligente, follow-up contextual, objeções, forecast, cadastro operacional e governança.</p></div>
          ${centralKPIs()}
          <div class="grid cols-main">
            <div class="panel">
              <div class="panel-head"><div><span class="badge green">Agente SDR IA</span><h2 style="margin-top:10px">Fila qualificada de leads</h2><p>Leads classificados automaticamente por intenção, probabilidade e próxima ação.</p></div><button class="btn ghost" id="seedProposal">Gerar proposta do lead foco</button></div>
              <div class="table-wrap"><table><thead><tr><th>Lead</th><th>Perfil</th><th>Intenção</th><th>Produto recomendado</th><th>Objeção</th><th>Próxima ação</th><th>Corretor ideal</th></tr></thead><tbody>${leads.map(renderLeadRow).join('')}</tbody></table></div>
            </div>
            <div class="section-stack">
              <div class="panel"><div class="panel-head"><div><span class="badge">Prioridades do dia</span><h3 style="margin-top:10px">Torre de controle</h3></div></div><ol class="priority-list">${FC.dailyPriorities().map((x,i)=>`<li><b>${i+1}</b><div>${x}</div></li>`).join('')}</ol></div>
              <div class="panel"><div class="panel-head"><div><span class="badge brand">Lead foco</span><h3 style="margin-top:10px">Handoff inteligente</h3></div></div>${focus?`<div class="list-card"><b>${focus.name}</b><p style="margin:.4rem 0">${focus.profile} · ${focus.goal} · Entrada ${FC.brl(focus.downPayment)} · Parcela ${FC.brl(focus.monthly)}</p><div class="kv"><div><span>Probabilidade</span><b>${focus.probability}%</b></div><div><span>Objeção</span><b>${focus.objection}</b></div><div><span>Próximo passo</span><b>${focus.nextAction}</b></div><div><span>Corretor ideal</span><b>${(FC.chooseBroker(focus)||{}).name||'-'}</b></div></div></div>`:'<div class="note">Sem leads para exibir.</div>'}</div>
            </div>
          </div>
          <div class="grid cols-2">
            <div class="panel"><div class="panel-head"><div><span class="badge green">Recomendação inteligente</span><h2 style="margin-top:10px">Top 3 opções para o lead foco</h2></div></div><div class="card-list">${recs.map(r=>`<div class="list-card"><header><div><b>Quadra ${r.quadra} · Lote ${r.lote}</b><div class="muted">${FC.brl(r.preco)} · ${r.area} m²</div></div><span class="badge ${String(r.status).toLowerCase().includes('dispon')?'green':'brand'}">Score ${r.compatScore}</span></header><p>${r.reason}</p><div class="kv"><div><span>Argumento sugerido</span><b>${r.narrative}</b></div><div><span>Risco de objeção</span><b>${r.objection}</b></div><div><span>Próxima ação</span><b>${r.nextAction}</b></div><div><span>Parcela estimada</span><b>${FC.brl(r.estMonthly)}</b></div></div></div>`).join('')}</div></div>
            <div class="panel"><div class="panel-head"><div><span class="badge brand">Inteligência de objeções</span><h2 style="margin-top:10px">Objeções mais frequentes</h2></div></div><div class="card-list">${topObjections()}</div></div>
          </div>
          <div class="grid cols-2">
            <div class="panel"><div class="panel-head"><div><span class="badge">Follow-up autônomo</span><h3 style="margin-top:10px">Fila de reativação e seguimento</h3></div></div><div class="card-list">${FC.leads().filter(l=>['sem retorno','seguimento','reativação'].includes(l.status)).map(l=>`<div class="list-card"><header><div><b>${l.name}</b><div class="muted">${l.profile} · ${l.goal}</div></div><span class="tag ${tagClass(l.intent)}">${l.intent}</span></header><p>${String(l.profile).includes('invest')?'Enviar tese de valorização, mapa e liquidez.':String(l.profile).includes('fam')?'Enviar segurança, infraestrutura e convite para visita.':String(l.profile).includes('construtor')?'Enviar metragem, implantação e potencial de revenda.':'Enviar prova de obra e material do empreendimento.'}</p><div class="actions"><button class="btn secondary btn-sm">Mensagem sugerida</button><button class="btn ghost btn-sm">Pausar automação</button></div></div>`).join('')}</div></div>
            <div class="panel"><div class="panel-head"><div><span class="badge green">Forecast comercial</span><h3 style="margin-top:10px">Leitura objetiva do pipeline</h3></div></div><div class="card-list">
              <div class="tile"><b>Vendas prováveis no mês</b><small>${FC.leads().filter(l=>l.probability>=70).length} oportunidades quentes</small></div>
              <div class="tile"><b>Vendas possíveis</b><small>${FC.leads().filter(l=>l.probability>=55).length} leads com potencial de avanço</small></div>
              <div class="tile"><b>Vendas em risco</b><small>${FC.leads().filter(l=>l.probability<45).length} oportunidades com baixa tração</small></div>
              <div class="tile"><b>Gargalo do funil</b><small>Concentração em objeções de entrada/parcela e falta de follow-up rápido.</small></div>
            </div></div>
          </div>
        </div>
      </section>`;
    $('#seedProposal')?.addEventListener('click',()=>{ if(!focus) return; FC.createProposal(focus); showToast('Proposta criada para o lead foco.'); location.reload(); });
  }

  function workRow(w, track){
    return `<tr>
      <td><b>${w.phase}</b><br><small>${w.responsible}</small></td>
      <td><span class="tag ${tagClass(w.status)}">${w.status}</span></td>
      <td>${w.start||'-'} → ${w.end||'-'}</td>
      <td><div class="progress"><span style="width:${w.percent}%"></span></div><small>${w.percent}%</small></td>
      <td>${w.notes||''}</td>
      <td>
        <div class="actions">
          <select data-work-status="${track}|${w.id}"><option ${w.status==='pendente'?'selected':''}>pendente</option><option ${w.status==='em andamento'?'selected':''}>em andamento</option><option ${w.status==='concluído'?'selected':''}>concluído</option></select>
          <input data-work-percent="${track}|${w.id}" type="number" min="0" max="100" value="${w.percent}" style="width:90px">
          <button class="btn secondary sm" data-work-save="${track}|${w.id}">Salvar</button>
        </div>
      </td>
    </tr>`;
  }

  function bindGestao(){
    $('#formLead')?.addEventListener('submit',e=>{ e.preventDefault(); const lead=FC.createLead(Object.fromEntries(new FormData(e.currentTarget).entries())); showToast(`Lead ${lead.name} cadastrado.`); e.currentTarget.reset(); renderGestao($('#appRoot')); });
    $('#formBroker')?.addEventListener('submit',e=>{ e.preventDefault(); FC.createBroker(Object.fromEntries(new FormData(e.currentTarget).entries())); showToast('Corretor cadastrado.'); e.currentTarget.reset(); renderGestao($('#appRoot')); });
    $('#formSDR')?.addEventListener('submit',e=>{ e.preventDefault(); FC.createSDR(Object.fromEntries(new FormData(e.currentTarget).entries())); showToast('SDR cadastrado.'); e.currentTarget.reset(); renderGestao($('#appRoot')); });
    $('#formTask')?.addEventListener('submit',e=>{ e.preventDefault(); FC.createTask(Object.fromEntries(new FormData(e.currentTarget).entries())); showToast('Tarefa criada.'); e.currentTarget.reset(); renderGestao($('#appRoot')); });
    $$('[data-occ-action]').forEach(btn=>btn.onclick=()=>{ const [id, action]=btn.dataset.occAction.split('|'); FC.updateOccurrence(id, action==='resolve'?{status:'resolvida'}:{status:'em análise'}); showToast('Ocorrência atualizada.'); renderGestao($('#appRoot')); });
    $$('[data-task-action]').forEach(btn=>btn.onclick=()=>{ const [id, action]=btn.dataset.taskAction.split('|'); FC.updateTask(id,{status: action==='done'?'concluída':'em andamento'}); showToast('Tarefa atualizada.'); renderGestao($('#appRoot')); });
    $$('[data-work-save]').forEach(btn=>btn.onclick=()=>{ const [track,id]=btn.dataset.workSave.split('|'); const status=$(`[data-work-status="${track}|${id}"]`).value; const percent=Number($(`[data-work-percent="${track}|${id}"]`).value||0); FC.updateWork(track,id,{status,percent}); showToast('Cronograma atualizado.'); renderGestao($('#appRoot')); });
  }

  function renderGestao(root){
    const k=FC.kpis(), works=FC.works(), openOcc=FC.occurrences();
    root.innerHTML = `
      <section class="page">
        <div class="wrap section-stack">
          <div class="page-title"><span class="badge brand">Gestão Full</span><h1>Operação comercial, cadastros, cronograma e resolução integrados.</h1><p>Esta versão inclui cadastros de leads, corretores e SDRs, gestão do cronograma de obra, tratamento de ocorrências e reflexo direto no pós-venda.</p></div>
          <div class="grid cols-4">
            <div class="stat-card"><small>Leads cadastrados</small><b>${k.leads}</b><span class="sub">registro automático ou manual</span></div>
            <div class="stat-card"><small>Corretores ativos</small><b>${FC.brokers().filter(b=>b.status==='ativo').length}</b><span class="sub">com especialidade e performance</span></div>
            <div class="stat-card"><small>SDRs ativos</small><b>${FC.sdrs().filter(s=>s.status==='ativo').length}</b><span class="sub">multi-canais</span></div>
            <div class="stat-card"><small>Ocorrências abertas</small><b>${openOcc.filter(o=>o.status!=='resolvida').length}</b><span class="sub">campo + cliente + gestão</span></div>
          </div>
          <div class="grid cols-3">
            <div class="panel"><div class="panel-head"><div><span class="badge green">Cadastro de lead</span><h3 style="margin-top:10px">Entrada manual/operacional</h3></div></div>
              <form id="formLead" class="form-grid">
                <div class="field c6"><label>Nome</label><input name="name" required></div>
                <div class="field c6"><label>Telefone</label><input name="phone" required></div>
                <div class="field c4"><label>Cidade</label><input name="city"></div>
                <div class="field c4"><label>Objetivo</label><input name="goal" value="Morar"></div>
                <div class="field c4"><label>Perfil</label><input name="profile" value="família"></div>
                <div class="field c4"><label>Entrada</label><input name="downPayment" type="number"></div>
                <div class="field c4"><label>Parcela ideal</label><input name="monthly" type="number"></div>
                <div class="field c4"><label>Prazo</label><input name="buyWhen" value="90 dias"></div>
                <div class="field c6"><label>Origem</label><input name="origin" value="Cadastro manual"></div>
                <div class="field c6"><label>Objeção</label><input name="objection"></div>
                <div class="c12"><button class="btn primary block">Cadastrar lead</button></div>
              </form>
            </div>
            <div class="panel"><div class="panel-head"><div><span class="badge">Cadastro de corretor</span><h3 style="margin-top:10px">Time humano</h3></div></div>
              <form id="formBroker" class="form-grid">
                <div class="field c6"><label>Nome</label><input name="name" required></div>
                <div class="field c6"><label>Telefone</label><input name="phone"></div>
                <div class="field c4"><label>CRECI</label><input name="creci"></div>
                <div class="field c4"><label>Especialidade</label><select name="specialty"><option>moradia</option><option>investimento</option><option>construção</option><option>comercial</option></select></div>
                <div class="field c4"><label>Região</label><input name="region"></div>
                <div class="field c4"><label>Resp. média (min)</label><input name="responseMinutes" type="number" value="10"></div>
                <div class="field c4"><label>Conversão (%)</label><input name="conversion" type="number" value="12"></div>
                <div class="field c4"><label>Status</label><select name="status"><option>ativo</option><option>inativo</option></select></div>
                <div class="c12"><button class="btn primary block">Cadastrar corretor</button></div>
              </form>
            </div>
            <div class="panel"><div class="panel-head"><div><span class="badge brand">Cadastro SDR IA</span><h3 style="margin-top:10px">Agentes artificiais</h3></div></div>
              <form id="formSDR" class="form-grid">
                <div class="field c6"><label>Nome do agente</label><input name="name" required></div>
                <div class="field c6"><label>Canal</label><input name="channel"></div>
                <div class="field c4"><label>Idioma</label><input name="language" value="pt-BR"></div>
                <div class="field c4"><label>Status</label><select name="status"><option>ativo</option><option>treinamento</option></select></div>
                <div class="field c4"><label>Tempo médio (s)</label><input name="speedSeconds" type="number" value="20"></div>
                <div class="field c12"><label>Política de segurança</label><textarea name="policy">Somente produtos disponíveis e condições aprovadas.</textarea></div>
                <div class="c12"><button class="btn primary block">Cadastrar SDR</button></div>
              </form>
            </div>
          </div>
          <div class="grid cols-2">
            <div class="panel"><div class="panel-head"><div><span class="badge green">Cronograma da implantação</span><h2 style="margin-top:10px">Reflete diretamente no pós-venda</h2></div></div><div class="table-wrap"><table><thead><tr><th>Etapa</th><th>Status</th><th>Período</th><th>Avanço</th><th>Notas</th><th>Ação</th></tr></thead><tbody>${works.infra.map(w=>workRow(w,'infra')).join('')}</tbody></table></div></div>
            <div class="panel"><div class="panel-head"><div><span class="badge brand">Cronograma das casas</span><h2 style="margin-top:10px">Andamento da obra da unidade</h2></div></div><div class="table-wrap"><table><thead><tr><th>Etapa</th><th>Status</th><th>Período</th><th>Avanço</th><th>Notas</th><th>Ação</th></tr></thead><tbody>${works.house.map(w=>workRow(w,'house')).join('')}</tbody></table></div></div>
          </div>
          <div class="grid cols-2">
            <div class="panel"><div class="panel-head"><div><span class="badge">Ocorrências</span><h3 style="margin-top:10px">Gestão, resolução e prioridade</h3></div></div><div class="table-wrap"><table><thead><tr><th>Ocorrência</th><th>Prioridade</th><th>Status</th><th>Lote próximo</th><th>Responsável</th><th>Ações</th></tr></thead><tbody>${openOcc.map(o=>`<tr><td><b>${o.category}</b><br><small>${o.description}</small></td><td><span class="tag ${tagClass(o.priority)}">${o.priority}</span></td><td><span class="tag ${tagClass(o.status)}">${o.status}</span></td><td>${o.nearestLot||'-'}</td><td>${o.responsible||'-'}</td><td><div class="actions"><button class="btn secondary sm" data-occ-action="${o.id}|analysis">Em análise</button><button class="btn ok sm" data-occ-action="${o.id}|resolve">Resolver</button></div></td></tr>`).join('')}</tbody></table></div></div>
            <div class="panel"><div class="panel-head"><div><span class="badge brand">Tarefas</span><h3 style="margin-top:10px">Backlog operacional</h3></div></div>
              <form id="formTask" class="form-grid" style="margin-bottom:16px">
                <div class="field c8"><label>Tarefa</label><input name="title" required></div>
                <div class="field c4"><label>Tipo</label><select name="type"><option>lead</option><option>visita</option><option>proposta</option><option>obra</option><option>ocorrência</option></select></div>
                <div class="field c4"><label>Responsável</label><input name="owner"></div>
                <div class="field c4"><label>Prioridade</label><select name="priority"><option>alta</option><option>média</option><option>baixa</option></select></div>
                <div class="field c4"><label>Prazo</label><input name="due" type="date"></div>
                <div class="c12"><button class="btn primary block">Criar tarefa</button></div>
              </form>
              <div class="card-list">${FC.tasks().map(t=>`<div class="list-card"><header><div><b>${t.title}</b><div class="muted">${t.owner||'-'} · ${t.due||'-'}</div></div><span class="tag ${tagClass(t.priority)}">${t.priority}</span></header><div class="actions"><span class="tag ${tagClass(t.status)}">${t.status}</span><button class="btn secondary sm" data-task-action="${t.id}|doing">Em andamento</button><button class="btn ok sm" data-task-action="${t.id}|done">Concluir</button></div></div>`).join('')}</div>
            </div>
          </div>
          <div class="grid cols-2">
            <div class="panel"><div class="panel-head"><h3>Corretores cadastrados</h3></div><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Especialidade</th><th>Região</th><th>Resposta</th><th>Conversão</th></tr></thead><tbody>${FC.brokers().map(b=>`<tr><td><b>${b.name}</b><br><small>${b.creci||''}</small></td><td>${b.specialty}</td><td>${b.region||'-'}</td><td>${b.responseMinutes} min</td><td>${b.conversion}%</td></tr>`).join('')}</tbody></table></div></div>
            <div class="panel"><div class="panel-head"><h3>SDRs cadastrados</h3></div><div class="table-wrap"><table><thead><tr><th>Agente</th><th>Canal</th><th>Tempo</th><th>Status</th><th>Governança</th></tr></thead><tbody>${FC.sdrs().map(s=>`<tr><td><b>${s.name}</b></td><td>${s.channel}</td><td>${s.speedSeconds}s</td><td><span class="tag ${tagClass(s.status)}">${s.status}</span></td><td>${s.policy}</td></tr>`).join('')}</tbody></table></div></div>
          </div>
        </div>
      </section>`;
    bindGestao();
  }

  function renderWorksTrack(track){
    const items=FC.works()[track];
    const wrap=$('#postContent'); if(!wrap) return;
    const title = track==='infra'?'Implantação do loteamento':'Obras da casa';
    const intro = track==='infra'?'Acompanhe terraplenagem, drenagem, pavimentação, portaria e paisagismo.':'Acompanhe projeto, fundação, estrutura, instalações, acabamento e entrega.';
    const overall = Math.round(items.reduce((s,i)=>s+Number(i.percent||0),0)/items.length);
    wrap.innerHTML = `
      <div class="panel"><div class="panel-head"><div><span class="badge ${track==='infra'?'green':'brand'}">${title}</span><h2 style="margin-top:10px">${intro}</h2></div><div style="min-width:220px"><small class="muted">Avanço geral</small><div class="progress" style="margin-top:8px"><span style="width:${overall}%"></span></div><div style="margin-top:6px;font-weight:900">${overall}%</div></div></div>
        <div class="timeline">${items.map((w,idx)=>`<div class="phase ${w.status==='concluído'?'done':w.status==='em andamento'?'active':''}"><div class="dot">${idx+1}</div><b>${w.phase}</b><small>${w.status}</small><div class="progress"><span style="width:${w.percent}%"></span></div><small>${w.percent}%</small></div>`).join('')}</div>
      </div>
      <div class="grid cols-2">
        <div class="panel"><div class="panel-head"><h3>Cronograma detalhado</h3></div><div class="card-list">${items.map(w=>`<div class="list-card"><header><div><b>${w.phase}</b><div class="muted">${w.start} → ${w.end}</div></div><span class="tag ${tagClass(w.status)}">${w.status}</span></header><p>${w.notes||''}</p><div class="progress"><span style="width:${w.percent}%"></span></div><small class="muted">${w.percent}% executado · responsável: ${w.responsible}</small></div>`).join('')}</div></div>
        <div class="panel"><div class="panel-head"><h3>Solicitações e ocorrências relacionadas</h3></div><div class="card-list">${FC.occurrences().slice(0,6).map(o=>`<div class="tile"><b>${o.category}</b><small>${o.description}</small><small class="muted">${o.status} · ${o.nearestLot||'sem lote'} · ${o.responsible||'-'}</small></div>`).join('')}</div></div>
      </div>`;
  }

  function renderPost(root){
    root.innerHTML = `
      <section class="page">
        <div class="wrap section-stack">
          <div class="page-title"><span class="badge brand">Pós-venda completo</span><h1>Minha Obra em duas camadas conectadas à gestão.</h1><p>As atualizações feitas em Gestão alimentam automaticamente esta área: implantação do loteamento, obra da casa, serviços, documentos e ocorrências.</p></div>
          <div class="panel">
            <div class="segmented" id="postSwitch"><button data-track="infra" class="active">Obras do loteamento</button><button data-track="house">Obras da casa</button></div>
          </div>
          <div id="postContent"></div>
        </div>
      </section>`;
    renderWorksTrack(state.postTrack);
    $$('#postSwitch button').forEach(btn=>btn.onclick=()=>{ state.postTrack=btn.dataset.track; $$('#postSwitch button').forEach(b=>b.classList.toggle('active', b===btn)); renderWorksTrack(state.postTrack); });
  }

  function renderOccurrenceList(){
    const mount=$('#occList'); if(!mount) return;
    mount.innerHTML = FC.occurrences().map(o=>`<div class="list-card"><header><div><b>${o.category}</b><div class="muted">${new Date(o.createdAt).toLocaleString('pt-BR')}</div></div><span class="tag ${tagClass(o.status)}">${o.status}</span></header><p>${o.description}</p><div class="kv"><div><span>Prioridade</span><b>${o.priority}</b></div><div><span>Lote próximo</span><b>${o.nearestLot||'-'}</b></div><div><span>Responsável</span><b>${o.responsible||'-'}</b></div><div><span>Origem</span><b>${o.source||'-'}</b></div></div></div>`).join('');
  }

  function setupOccurrenceMap(lat,lng,inside){
    const box=$('#occMapBox'); const note=$('#occGeoNote');
    if(!box) return;
    if(!inside){
      box.innerHTML = `<div class="panel" style="margin:0;height:100%"><div class="page-title"><span class="badge brand">Fora do empreendimento</span><h3>Mapa operacional</h3><p>Como a localização está fora do perímetro do empreendimento, a referência principal passa a ser o Google Maps.</p></div><div class="actions"><a class="btn primary" target="_blank" href="https://www.google.com/maps?q=${lat},${lng}">Abrir no Google Maps</a><button class="btn ghost" id="backToEnterprise">Voltar ao mapa do empreendimento</button></div><p class="muted" style="margin-top:12px">Coordenadas detectadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}</p></div>`;
      $('#backToEnterprise')?.addEventListener('click',()=>{ box.innerHTML='<div id="occMap" class="map"></div>'; createLotMap('occMap',{}); note.textContent='Mapa do empreendimento exibido novamente.'; });
      return;
    }
    box.innerHTML='<div id="occMap" class="map"></div>';
    createLotMap('occMap',{currentPoint:{lat,lng}});
    const near=nearestLot(lat,lng); note.textContent = near ? `Localização capturada dentro do empreendimento. Lote mais próximo: ${near.quadra}-${near.lote}.` : 'Localização capturada dentro do empreendimento.';
    state.occPoint = {lat,lng, nearestLot: near?`${near.quadra}-${near.lote}`:''};
  }

  function renderOccurrences(root){
    root.innerHTML = `
      <section class="page">
        <div class="wrap section-stack">
          <div class="page-title"><span class="badge brand">Ocorrências</span><h1>Registro por geolocalização real</h1><p>Se a ocorrência estiver dentro do perímetro do empreendimento, o mapa operacional usa o OpenStreetMap com os lotes. Fora dele, o sistema prioriza o Google Maps.</p></div>
          <div class="grid cols-main">
            <div class="panel"><div class="panel-head"><div><span class="badge green">Ponto da ocorrência</span><h2 style="margin-top:10px">Localização operacional</h2><p id="occGeoNote">Use a geolocalização do aparelho ou informe coordenadas manualmente.</p></div></div><div class="actions" style="margin-bottom:12px"><button class="btn primary" id="geoBtn">Usar minha localização</button><button class="btn secondary" id="enterpriseBtn">Mostrar empreendimento</button></div><div class="map-box small" id="occMapBox"><div id="occMap" class="map"></div></div></div>
            <div class="panel"><div class="panel-head"><div><span class="badge">Nova ocorrência</span><h2 style="margin-top:10px">Cadastro e despacho</h2></div></div>
              <form id="occForm" class="form-grid">
                <div class="field c6"><label>Categoria</label><select name="category"><option>infraestrutura</option><option>segurança</option><option>atendimento</option><option>manutenção</option><option>cliente</option></select></div>
                <div class="field c6"><label>Prioridade</label><select name="priority"><option>alta</option><option>média</option><option>baixa</option></select></div>
                <div class="field c6"><label>Responsável</label><input name="responsible" value="Equipe Obras"></div>
                <div class="field c6"><label>Origem</label><input name="source" value="app campo"></div>
                <div class="field c12"><label>Descrição</label><textarea name="description" required></textarea></div>
                <div class="field c6"><label>Foto / evidência</label><input name="photoName" placeholder="Nome do arquivo ou observação"></div>
                <div class="field c3"><label>Latitude</label><input name="lat" id="occLat" readonly></div>
                <div class="field c3"><label>Longitude</label><input name="lng" id="occLng" readonly></div>
                <div class="c12"><button class="btn primary block">Registrar ocorrência</button></div>
              </form>
            </div>
          </div>
          <div class="panel"><div class="panel-head"><div><span class="badge green">Histórico</span><h3 style="margin-top:10px">Ocorrências registradas</h3></div></div><div id="occList" class="card-list"></div></div>
        </div>
      </section>`;
    createLotMap('occMap',{});
    renderOccurrenceList();
    $('#enterpriseBtn').onclick=()=>{ state.occPoint=null; $('#occLat').value=''; $('#occLng').value=''; $('#occGeoNote').textContent='Mapa do empreendimento exibido.'; $('#occMapBox').innerHTML='<div id="occMap" class="map"></div>'; createLotMap('occMap',{}); };
    $('#geoBtn').onclick=()=>{
      if(!navigator.geolocation){ showToast('Geolocalização indisponível neste dispositivo.'); return; }
      navigator.geolocation.getCurrentPosition(pos=>{
        const lat=pos.coords.latitude, lng=pos.coords.longitude; $('#occLat').value=lat.toFixed(6); $('#occLng').value=lng.toFixed(6);
        setupOccurrenceMap(lat,lng,FC.withinEnterprise(lat,lng));
      },()=>showToast('Não foi possível capturar a localização.'));
    };
    $('#occForm').addEventListener('submit',e=>{
      e.preventDefault(); const obj=Object.fromEntries(new FormData(e.currentTarget).entries());
      obj.lat = obj.lat?Number(obj.lat):state.occPoint?.lat||null; obj.lng=obj.lng?Number(obj.lng):state.occPoint?.lng||null; obj.nearestLot=state.occPoint?.nearestLot||'';
      FC.createOccurrence(obj); showToast('Ocorrência registrada.'); e.currentTarget.reset(); $('#occLat').value=''; $('#occLng').value=''; state.occPoint=null; renderOccurrences($('#appRoot'));
    });
  }

  function renderBackoffice(root){
    root.innerHTML = `
    <section class="page"><div class="wrap section-stack">
      <div class="page-title"><span class="badge brand">Backoffice</span><h1>Centro operacional da plataforma</h1><p>Acesso rápido aos módulos críticos, cadastros e governança.</p></div>
      <div class="grid cols-4">
        <a class="stat-card" href="central-comercial.html"><small>Central IA</small><b>Funil ativo</b><span class="sub">SDR IA, recomendações, handoff e follow-up</span></a>
        <a class="stat-card" href="gestao.html"><small>Gestão</small><b>Cronograma</b><span class="sub">obras, tarefas, cadastros e resolução</span></a>
        <a class="stat-card" href="ocorrencias.html"><small>Campo</small><b>Ocorrências</b><span class="sub">geolocalização, despacho e histórico</span></a>
        <a class="stat-card" href="pos-venda.html"><small>Pós-venda</small><b>Minha Obra</b><span class="sub">reflexo automático do cronograma</span></a>
      </div>
      <div class="panel"><div class="panel-head"><h2>Check operacional</h2></div><ul class="priority-list"><li><b>1</b><div>Todos os arquivos principais existem localmente e as dependências usadas pela interface foram incluídas.</div></li><li><b>2</b><div>Os módulos de lead, corretores, SDRs, ocorrências, tarefas e cronograma persistem em localStorage.</div></li><li><b>3</b><div>O pós-venda consome o mesmo cronograma atualizado na gestão, evitando divergência.</div></li><li><b>4</b><div>O mapa de vendas usa OpenStreetMap com coordenadas reais e marcadores em vez de poligonais tortas.</div></li></ul></div>
    </div></section>`;
  }

  function renderBrokersPage(root){
    root.innerHTML = `<section class="page"><div class="wrap section-stack"><div class="page-title"><span class="badge green">Corretores</span><h1>Diretório e performance</h1><p>Modelo simples para gestão do time comercial humano.</p></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Corretor</th><th>Especialidade</th><th>Região</th><th>Resposta</th><th>Conversão</th><th>Status</th></tr></thead><tbody>${FC.brokers().map(b=>`<tr><td><b>${b.name}</b><br><small>${b.creci||''}</small></td><td>${b.specialty}</td><td>${b.region||'-'}</td><td>${b.responseMinutes} min</td><td>${b.conversion}%</td><td><span class="tag ${tagClass(b.status)}">${b.status}</span></td></tr>`).join('')}</tbody></table></div></div></div></section>`;
  }

  function renderBrokerPanel(root){
    const brokers=FC.brokers(); const first=brokers[0];
    root.innerHTML = `<section class="page"><div class="wrap section-stack"><div class="page-title"><span class="badge brand">Painel do corretor</span><h1>Leads e propostas por corretor</h1><p>Selecione um corretor para ver suas oportunidades.</p></div><div class="panel"><div class="field" style="max-width:320px"><label>Corretor</label><select id="selBroker">${brokers.map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}</select></div><div id="brokerPanelBody" style="margin-top:16px"></div></div></div></section>`;
    function draw(){ const id=$('#selBroker').value; const leadRows=FC.leads().filter(l=>l.assignedBrokerId===id); const props=FC.proposals().filter(p=>p.brokerId===id); const broker=brokers.find(b=>b.id===id); $('#brokerPanelBody').innerHTML=`<div class="grid cols-4"><div class="stat-card"><small>Leads</small><b>${leadRows.length}</b></div><div class="stat-card"><small>Propostas</small><b>${props.length}</b></div><div class="stat-card"><small>Conversão</small><b>${broker.conversion}%</b></div><div class="stat-card"><small>Especialidade</small><b style="font-size:20px">${broker.specialty}</b></div></div><div class="table-wrap" style="margin-top:18px"><table><thead><tr><th>Lead</th><th>Perfil</th><th>Produto</th><th>Probabilidade</th><th>Próxima ação</th></tr></thead><tbody>${leadRows.map(l=>`<tr><td><b>${l.name}</b><br><small>${l.phone||''}</small></td><td>${l.profile}<br>${l.goal}</td><td>${l.lotName||l.lotCode||'-'}</td><td>${l.probability}%</td><td>${l.nextAction}</td></tr>`).join('')}</tbody></table></div>`; }
    $('#selBroker').onchange=draw; draw();
  }

  function renderWellness(root){
    root.innerHTML = `<section class="page"><div class="wrap section-stack"><div class="page-title"><span class="badge green">Wellness</span><h1>Hub complementar</h1><p>Módulo mantido como extensão editorial e de relacionamento.</p></div><div class="panel"><p>Espaço reservado para conteúdos, check-in wellness e blog. A base desta versão prioriza a evolução comercial, operacional e de pós-venda.</p></div></div></section>`;
  }

  function route(){
    const page = document.body.dataset.page || 'sales';
    const root = $('#appRoot'); if(!root) return;
    if(page==='sales') renderSales(root);
    else if(page==='central') renderCentral(root);
    else if(page==='gestao') renderGestao(root);
    else if(page==='post') renderPost(root);
    else if(page==='occ') renderOccurrences(root);
    else if(page==='backoffice') renderBackoffice(root);
    else if(page==='corretores') renderBrokersPage(root);
    else if(page==='painel-corretor') renderBrokerPanel(root);
    else if(page==='wellness') renderWellness(root);
    else renderSales(root);
  }

  document.addEventListener('DOMContentLoaded',()=>{ initNav(); route(); });
})();
