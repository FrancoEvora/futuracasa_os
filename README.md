# Futura Casa OS — Bia

Plataforma publicada com a nova direção visual e funcional da Futura Casa, inspirada nas referências anexadas: identidade escura, laranja, presença da Bia, inteligência imobiliária, marketing e vendas.

## Módulos publicados

- **Início**: posicionamento comercial da Futura Casa e CTA para a Bia.
- **Bia**: entrevista consultiva para transformar desejo vago em mandato imobiliário.
- **Oportunidades**: ranking de produtos com score, argumento, objeção provável e lacunas documentais.
- **Central IA**: visão de leads, alta intenção, corretores, SDRs e prioridades do dia.
- **Admin**: cadastro de empreendimentos, unidades, leads, corretores, SDRs, cronograma e ocorrências.
- **Pós-venda**: leitura do cronograma cadastrado na gestão.
- **Ocorrências**: registro e listagem de ocorrências.

## Supabase

A plataforma está integrada ao projeto Supabase `evora-gestao` (`qsdffayasuzsmngteika`) com tabelas prefixadas por `fc_`:

- `fc_enterprises`
- `fc_units`
- `fc_leads`
- `fc_bia_sessions`
- `fc_brokers`
- `fc_sdrs`
- `fc_tasks`
- `fc_occurrences`
- `fc_work_schedules`
- `fc_agent_logs`

## Observação de segurança

Esta versão usa políticas públicas de protótipo para leitura, inserção e atualização via chave pública. Em produção, substituir por autenticação, RLS por papel, Edge Functions e trilha de auditoria.

## Publicação

- Frontend: GitHub + Vercel
- Backend/protótipo: Supabase
- Commit de publicação: `468901f2750cdedcbbe3651ed55b0db2c795854d`
