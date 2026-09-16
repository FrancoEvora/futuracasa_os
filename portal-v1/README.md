# Futura Casa — Portal de vendas

Versão publicada em 16/09/2026.

- Portal: https://futuracasa-os.vercel.app/
- Gestão: https://futuracasa-os.vercel.app/admin.html
- Vercel: projeto `futuracasa-os`, conectado à branch `main` deste repositório.
- Build: `node build-portal.mjs`. Somente `dist/` é publicado.

## Publicação isolada

O código anterior permanece no repositório para referência, mas não integra a saída de publicação. Não remova a configuração `outputDirectory: dist` do `vercel.json` sem revisar a segurança. O Enterprise não é publicado dentro deste portal.

## Operação

O portal oferece catálogo vivo, filtros, favoritos locais, comparação, detalhes, pedidos de atendimento/visita/proposta e um simulador matemático de desembolso. O simulador não representa condições comerciais de um produto. O catálogo inicial contém Solaris e Parque das Árvores; estoque individual e tabelas vigentes devem ser cadastrados pela equipe.

A gestão contém empreendedores, empreendimentos, unidades, interessados, conhecimento aprovado da Bia, auditoria e autorização de contas existentes. Rascunhos não aparecem no portal. Preços exigem validade. Materiais e imagens cadastrados para divulgação são públicos: não envie documentos pessoais por esses campos.

## Autenticação e backend

A gestão usa Supabase Auth e exige associação específica em `fcp_members`. Não há inscrição administrativa pública nem senha padrão. A conta autorizada do administrador foi preservada. Tokens de sessão ficam na aba; não há senha no código.

O backend utiliza o projeto Supabase já existente, com tabelas próprias `fcp_*` e políticas RLS. A separação é lógica, não um novo projeto físico de banco. Os cadastros e as políticas legadas `fc_*` de outros protótipos não foram alterados.

A função Supabase `futura-portal` atende o portal. Conversas possuem credencial aleatória, expiração e limites de requisições. Dados de interessados não podem ser lidos anonimamente. Pedidos possuem identificador idempotente para evitar duplicação em tentativas repetidas. O backend registra o pedido, mas não confirma agenda, não reserva unidade e não envia mensagens externas automaticamente.

## Bia e disponibilidade do provedor

A integração de IA usa a credencial já armazenada de forma criptografada na infraestrutura, sem copiá-la para o navegador ou para este repositório. A ponte de servidor utiliza `fcp_ai_begin` e `fcp_ai_result`, restritas ao serviço. O endpoint do provedor é fixo. O modelo configurado nessa ponte é `gpt-5.4-mini`, disponível para a conta consultada.

**No teste de 16/09/2026, o provedor retornou HTTP 429, `credit_balance_exhausted` / `insufficient_quota`.** A IA generativa não deve ser declarada operacional enquanto a conta não voltar a autorizar as chamadas. Nenhuma recarga foi contratada. O atendimento continua em **modo guiado**, identificado na interface. A próxima conversa tenta a integração novamente; uma credencial configurada não prova que existe saldo.

## Verificação

`build-portal.mjs` verifica sintaxe, regras básicas de seleção, segurança de URLs e hashes das imagens. `verify-portal.mjs` testa serviços públicos com dados sintéticos e registra separadamente o modo efetivo da Bia. O workflow de verificação não trata o fallback como sucesso generativo. Registros de teste são identificados explicitamente e devem ser removidos pelo UUID de envio indicado no relatório após a conferência.

A interface foi exercitada separadamente em navegador com respostas de teste, incluindo filtros, favoritos, comparação, simulação, formulário e editor administrativo. Isso não substitui autenticação real com a senha pessoal do administrador.

## Domínio

A publicação atual utiliza o domínio Vercel acima. Esta entrega não alterou os servidores DNS nem o Registro.br e não declara concluída a vinculação de `futuracasa.terraragroup.com.br`.
