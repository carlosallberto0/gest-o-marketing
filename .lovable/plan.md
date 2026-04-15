<final-text># Corrigir geração da rota automática + ajuste responsivo do diálogo

## Diagnóstico
- A geração automática não está falhando na lógica da rota; ela nem chega nela. O endpoint `optimize-route` está respondendo `OPTIONS 404`, e não há logs de execução nem rotas gravadas no banco.
- O botão `Rota Auto` ainda usa pacotes “prontos para OS” como fonte, mas o fluxo correto agora é usar as OS abertas do fornecedor (`supplier_work_orders` com status `pending`/`in_progress`).
- O diálogo `Criar Rota` continua estourando horizontalmente porque alguns outdoors chegam com `location`/link muito longo e a linha atual não contém esse conteúdo de forma segura.

## Plano
1. **Restabelecer a função de otimização**
   - Garantir que `optimize-route` fique acessível/deployada.
   - Validar preflight + POST da função e alinhar bootstrap/CORS ao padrão das funções já ativas, sem afrouxar autenticação.
   - Confirmar que a função responde antes de mexer em qualquer lógica de UI.

2. **Trocar a fonte da rota automática para a OS do fornecedor**
   - Em vez de `useReadyForServiceOrderPackages`, usar as OS abertas do fornecedor como fonte principal.
   - O botão `Rota Auto` deve:
     - gerar direto quando existir 1 OS aberta válida;
     - abrir seleção quando existir mais de 1;
     - ignorar OS sem itens georreferenciados;
     - bloquear duplicidade quando já existir rota ativa/rascunho para o mesmo pacote + fornecedor.
   - A rota deve ser criada com os itens atuais da OS, herdando `package_id` e `supplier_id`.

3. **Corrigir o UX do diálogo “Criar Rota”**
   - Passar também `location_url`/metadados necessários para o diálogo.
   - Parar de renderizar URL crua na linha principal.
   - Exibir informações em 2 linhas seguras:
     - linha 1: código + badges;
     - linha 2: PDV + localização resumida;
     - link do mapa como label curta/ação secundária.
   - Forçar contenção horizontal (`overflow-x-hidden`, `min-w-0`, `break-all`/`truncate` no lugar certo) e ajustar largura/altura para mobile e desktop.

4. **Ajustar a UX da seleção automática**
   - No seletor da rota automática, mostrar OS aberta com fornecedor, pacote, quantidade de itens válidos e data.
   - Mensagens mais claras para:
     - sem OS aberta;
     - OS sem coordenadas;
     - rota já existente;
     - otimização indisponível.

5. **Validação final**
   - Testar ponta a ponta:
     - abrir mapa;
     - gerar rota automática a partir de OS aberta;
     - abrir “Criar Rota” e confirmar que nenhuma informação corta;
     - validar em viewport desktop e mobile.

## Arquivos
- `supabase/functions/optimize-route/index.ts`
- `src/hooks/useRoutes.ts`
- `src/pages/StrategicMapMapbox.tsx`
- `src/components/map/CreateRouteDialog.tsx`
- `src/hooks/useSupplierWorkOrders.ts` (se precisar expor/normalizar melhor os itens da OS)
- opcionalmente `supabase/config.toml` apenas se a função precisar de configuração específica para voltar a responder

## Resultado esperado
- `Rota Auto` passa a usar exatamente o que está na OS aberta do fornecedor.
- A função de otimização volta a responder corretamente.
- O diálogo `Criar Rota` deixa de cortar/invadir conteúdo, mesmo com links longos.</final-text>