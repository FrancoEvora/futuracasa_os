# Futura Casa 3.0

Nova apresentação pública, inspirada na clareza de descoberta de portais imobiliários, com identidade própria: laranja, verde profundo, marfim, tipografia Manrope/DM Sans e imagens dos empreendimentos já publicados.

## Entrega

- Catálogo existente preservado: favoritos, comparação, consulta de unidades e atendimento Bia via o mesmo proxy Enterprise.
- Páginas de empreendimento e sitemap; fotos locais preparadas com `node scripts/finish-pages.mjs` a partir do catálogo público.
- Área profissional com autenticação Supabase, carteira privada, etapas, anotações, próximos passos, exportação CSV.
- Perfil público opcional, endereço por slug e formulário de interesse entregue ao CRM do profissional.
- Conteúdos editáveis por modelos baseados no catálogo (legenda, roteiro, stories e argumentos). Não utiliza geração por LLM.
- Rascunhos, calendário e exportação ICS para publicação manual.
- Comunidade autenticada com publicação e exclusão de conteúdo próprio.
- Links de indicação com origem incluída no formulário central. Sem apuração financeira ou pagamento de comissões.

## Dependências que continuam externas

Conexão OAuth e postagem automática nas redes não estão ativadas. Exigem apps oficiais, permissões dos canais e consentimento do titular. O painel informa essa condição. Cadastro e recuperação de conta dependem da configuração de e-mail do Supabase e de seus redirects autorizados. A entrega de e-mail não foi testada mediante envio a uma pessoa real.

Perfis são autodeclarados, não certificados pela plataforma. A seleção de empreendimentos da landing page é o catálogo publicado. O formulário não confirma visita, reserva ou contrato.

## Segurança e verificação

Migrações aditivas em `supabase/migrations/20261014_professional*.sql`. Políticas por proprietário em contatos e rascunhos, perfil público somente por opt-in, posts restritos a usuários autenticados. RPC público aceita somente solicitações consentidas para corretores publicados, com idempotência e limite por destinatário. Não expõe a carteira ao visitante.

- `node build-portal.mjs`: sintaxe e verificações de seleção/URL/assets.
- `node scripts/qa-v3.cjs`: navegação pública, catálogo real, favoritos, comparação, Bia, detalhe/contato, indicação, privacidade e celular.
- `node scripts/qa-professional.cjs`: UI autenticada com backend simulado; criação/edição de contato, perfil, conteúdo, calendário, comunidade e logout. Nenhum cliente real inserido.
- `tests/professional-isolation.sql`: testes reais de RLS, entrada pública, consentimento e idempotência dentro de transação revertida, sem dados residuais.

Os scripts de browser usam Playwright/Chrome do ambiente local; ajuste os caminhos de instalação se executar em outra máquina. O build de produção usa somente Node, sem dependências de browser.
