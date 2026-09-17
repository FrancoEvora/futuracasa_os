# Futura Casa — Portal de vendas 2.0

## Endereços e publicação

- Portal: https://www.futuracasa.com.br/
- Alternativa: https://futuracasa-os.vercel.app/
- Gestão do catálogo e formulários: https://www.futuracasa.com.br/admin.html
- Central da Bia: https://enterprise.terraragroup.com.br/bia/gestao
- Landing oficial Solaris: https://enterprise.terraragroup.com.br/atendimento/solaris/cadastro

Vercel: projeto `futuracasa-os`, branch `main`, build `node build-portal.mjs`. Somente `dist/` e a função autorizada `api/bia.js` integram a publicação. O Enterprise não é servido dentro deste projeto. As rotas públicas não concedem acesso administrativo ao Enterprise.

## Uma única Bia

A conversa do portal usa exatamente o gateway `enterprise-bia-agent-gateway`, o mesmo invocado pelo worker `bia-whatsapp-replies`. Não mantém outro prompt, modelo, vetor de conhecimento ou agente guiado como substituto.

Fluxo:

`Navegador → /api/bia → futura-enterprise-bia → enterprise-bia-agent-gateway`

`WhatsApp → bia-whatsapp-replies → enterprise-bia-agent-gateway`

`futura-enterprise-bia` é um adaptador de transporte e sessão, não um agente. O texto da resposta do gateway é devolvido sem reescrita. Modelo e raciocínio seguem a configuração central do Enterprise. Estoque, condições comerciais, simulações e materiais vêm das ferramentas autorizadas desse mesmo agente. Uma indisponibilidade central é informada; não é substituída por respostas inventadas por outro modelo.

A experiência atual é `solaris`, a mesma utilizada pelo canal WhatsApp consultado. O catálogo multimarcas do portal continua com gestão própria. Publicar outro empreendimento no catálogo visual não o adiciona automaticamente ao estoque ou ao conhecimento comercial do Enterprise; essa habilitação precisa ocorrer também na central.

## Landing Solaris no conhecimento compartilhado

O endereço de apresentação e cadastro foi adicionado aos fatos aprovados e às orientações da experiência `solaris`, preservando os demais registros. Assim, site e WhatsApp recebem a mesma referência nas próximas consultas.

A Bia pode informar o link quando o visitante pedir site, apresentação, página ou cadastro. A orientação compartilhada esclarece que o book pode ser acessado sem cadastro, que abrir a página não significa cadastro concluído e que o formulário não reserva lote. Preços, disponibilidade e condições continuam dependentes das consultas em tempo real.

Foi criado também o item de conhecimento de URL na central. A entrega à IA é feita diretamente pelos fatos aprovados; não se declara que esse item foi indexado em um armazenamento vetorial.

## Sessões e proteção de informações

Uma conversa nova recebe token aleatório e um vínculo exclusivo com uma conversa central. O adaptador não aceita do navegador outro empreendimento, identificador de conversa, prompt, modelo ou condição de operador. A autorização administrativa do navegador nunca é encaminhada ao gateway público.

O mesmo agente não implica unir históricos pessoais automaticamente. Um telefone digitado no site não dá acesso a conversas anteriores de WhatsApp. As credenciais de sessão são específicas, e acesso por token de outra sessão é negado.

A sessão local expira em 24 horas. Encerrar ou reiniciar remove o vínculo local e fecha a sessão correspondente na central, sem apagar o histórico comercial do Enterprise. A interface informa isso antes de iniciar e antes de reiniciar. Sessões antigas do agente separado não são importadas silenciosamente para a nova central. O usuário precisa iniciar uma nova conversa e confirmar a versão de consentimento `enterprise-bia-v1`.

## Catálogo e solicitações

O portal mantém filtros, favoritos locais, comparação, detalhes, pedidos de atendimento/visita/proposta e planejamento matemático hipotético. Esse planejamento não é a simulação comercial: quando solicitada à Bia, a simulação comercial usa o cálculo canônico do Enterprise.

As conversas e ações comerciais da Bia são registradas na central Enterprise. Os formulários do portal continuam registrados em `fcp_leads`, no módulo Interessados deste painel, com identificador idempotente para evitar duplicações. O adaptador usa a função legada `futura-portal` apenas para a operação de formulário `lead`, nunca para gerar as respostas do chat.

A tela Conhecimento da Bia passa a orientar a gestão pela central Enterprise. Os antigos registros `fcp_knowledge` não alimentam a nova conversa. Eles foram preservados como dados legados, não apagados.

## Verificações

- `build-portal.mjs`: sintaxe dos módulos, regras de URLs/seleção e integridade das imagens.
- `tests/bia-enterprise-contract.mjs`: compara a resposta do adaptador com o replay da mesma requisição no gateway nativo, usando apenas a sessão de teste. Também verifica o link oficial na resposta, consulta de estoque por ferramenta nativa, recusa de token incorreto e encerramento da sessão.
- `tests/bia-enterprise-browser.mjs`: testa os fluxos publicados em navegador desktop e viewport móvel, incluindo link clicável, identificação do agente, transporte de mesma origem e encerramento com preservação do histórico.

O teste de contrato passou na implantação 2.0, com runtime central `bia-commercial-v10`, resposta canônica idêntica e consulta real de ferramenta comercial. A disponibilidade atual deve ser aferida novamente pelos testes. Os testes não enviam mensagens a números de WhatsApp nem solicitam reservas.
