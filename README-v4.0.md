# Futura Casa Pro v4.0 Full

## Objetivo
Evolução da plataforma para uma versão funcional mais completa, com:
- OpenStreetMap como base do mapa de vendas.
- Marcadores por coordenadas reais dos lotes, evitando poligonais tortas.
- Cadastros de leads, corretores e SDRs IA.
- Central Comercial Autônoma com qualificação, recomendação, handoff, follow-up e forecast.
- Gestão operacional com cronograma da obra, tarefas e ocorrências.
- Pós-venda conectado ao cronograma de implantação e da casa.

## Principais correções desta versão
1. Removida a dependência de imagem estática para o mapa principal.
2. Removidas poligonais tortas dos lotes; agora a visualização padrão usa marcadores georreferenciados.
3. Eliminada a faixa branca/overlay incorreto do mapa ao reestruturar o layout e os containers.
4. Padronizados botões principais: simulação, rota, IA e AR.
5. Inclusão dos cadastros que faltavam: lead, corretor e SDR.
6. Inclusão do módulo de gestão de cronograma e execução da obra, refletindo automaticamente no pós-venda.
7. Inclusão do módulo de ocorrências com geolocalização e fallback para Google Maps fora do empreendimento.

## Módulos entregues
- `index.html` — Vendas com mapa OSM, filtros, lista de lotes e captura rápida de lead.
- `central-comercial.html` — Central IA com SDR IA, ranking de leads, recomendações, objeções e forecast.
- `gestao.html` — Cadastros, cronograma da obra, equipe, tarefas e ocorrências.
- `pos-venda.html` — Minha Obra em duas camadas: loteamento e casa.
- `ocorrencias.html` — Registro georreferenciado de ocorrências.
- `backoffice.html` — Hub operacional.
- `corretores.html` / `backoffice-corretores.html` — Diretório de corretores.
- `painel-corretor.html` — Painel individual do corretor.

## Estrutura técnica
- `styles.css` — Estilos compartilhados.
- `data.js` — Seeds, modelos de dados, regras de negócio e persistência local.
- `app.js` — Renderização dos módulos, mapas e interações.
- `central-comercial.js` — Arquivo de compatibilidade.

## Itens disruptivos incluídos
- Qualificação automática por score de intenção.
- Probabilidade de fechamento.
- Recomendação inteligente de até 3 lotes.
- Handoff automático para corretor ideal.
- Lista diária de prioridades.
- Inteligência de objeções.
- Forecast baseado em probabilidade.
- Governança de ocorrências e tarefas.
- Reflexo operacional do cronograma no pós-venda.

## Limitações desta versão
- Protótipo estático com persistência em `localStorage`.
- Sem backend real, autenticação, upload real de arquivos ou integrações externas.
- Sem publicação automática em Vercel/GitHub.

## Próxima evolução recomendada
1. API real (leads, estoque, ocorrências, cronograma, usuários).
2. Autenticação por perfil.
3. Banco de dados centralizado.
4. Integração WhatsApp, Meta Ads e landing pages.
5. Regras reais de distribuição de leads.
6. Integração com simulação financeira e contratos.
7. Modo supervisor de obra com fotos, evidências e SLA.
