# Master Prompt para o Codex — Productivity Workspace

> Copie este documento para a raiz do novo repositório como `CODEX_MASTER_PROMPT.md` e use-o como a primeira solicitação para o Codex. O nome definitivo do produto é **Foxsit** e deve permanecer centralizado na configuração de produto.

---

## PROMPT PARA O CODEX

Você será o principal engenheiro de produto, arquiteto de software e responsável pela qualidade de um novo web app de produtividade pessoal. Seu trabalho não é apenas gerar telas isoladas: você deve construir um produto coeso, utilizável diariamente, seguro, responsivo, testável e pronto para deploy.

O projeto será mantido no GitHub, publicado por Git integration no Cloudflare Pages e usará Supabase para autenticação, banco de dados e Storage. O produto deverá funcionar muito bem como site responsivo e PWA em celular, tablet e desktop.

Antes de escrever código, leia este documento inteiro. Depois, inspecione todo o workspace, produza um plano executável no repositório e implemente o projeto em fases verificáveis.

---

# 1. Objetivo do produto

Construir um workspace pessoal de produtividade e organização com os seguintes módulos principais:

1. **Home / Today** — visão diária unificada.
2. **Calendar** — eventos, agenda diária, semanal e mensal.
3. **Tasks** — tarefas diárias e tarefas organizadas por projeto.
4. **Focus / Pomodoro** — cronômetro vinculado ou não a uma tarefa.
5. **Habits** — hábitos recorrentes, metas por contagem e histórico.
6. **Workout** — rotinas, treino ativo, séries, repetições, cargas, descanso e evolução.
7. **Settings** — conta, aparência, preferências de calendário e dados.
8. **Rewards** — carteira privada de Silver e Gold, histórico, conversões e créditos resgatáveis por atividades concluídas.

A experiência deve parecer um aplicativo nativo premium, não um painel administrativo, template de SaaS, clone genérico do Notion ou conjunto de páginas sem integração.

O produto é inicialmente para uso pessoal de um único proprietário, mas toda a modelagem deve ser segura por usuário para que o sistema não precise ser refeito caso passe a aceitar mais contas no futuro.

---

# 2. Premissas de escopo

Considere estas decisões como válidas para o MVP, salvo impedimento técnico real:

- O produto será uma aplicação web React instalada opcionalmente como PWA.
- O backend será Supabase.
- O frontend será publicado como aplicação estática no Cloudflare Pages.
- A primeira versão não terá colaboração entre usuários.
- A primeira versão não terá pagamentos, assinatura ou plano premium.
- A primeira versão não terá integração com Google Calendar, Outlook ou Apple Calendar.
- A primeira versão não terá inteligência artificial.
- A primeira versão não terá aplicativo nativo iOS/Android.
- A interface inicial usará textos curtos em inglês, coerentes com os nomes dos módulos fornecidos. Toda a copy deve ficar centralizada para permitir pt-BR depois, sem implementar uma infraestrutura excessiva de internacionalização no MVP.
- A semana começa na segunda-feira por padrão, mas isso deve ser uma preferência editável.
- O fuso horário inicial deve ser detectado pelo navegador e salvo como timezone IANA no perfil.
- Use o nome final **Foxsit** por meio da constante/configuração centralizada `APP_NAME`.

Não expanda o escopo com recursos sociais, chat, e-mail, finanças, anotações, gamificação pública, ranking, marketplace ou recursos não solicitados. A economia privada de Rewards definida na seção 14 é uma exceção expressamente aprovada: ela registra créditos internos e pedidos de resgate, mas não processa pagamentos, transfere dinheiro, coleta dados bancários nem promete liquidação automática.

---

# 3. Auditoria obrigatória do projeto de referência

Existe um projeto legado enviado como referência, normalmente disponível como:

```text
archsyrup-main.zip
```

ou como uma pasta semelhante a:

```text
archsyrup-main/
```

Antes de implementar qualquer módulo:

1. Localize o ZIP ou a pasta no workspace.
2. Se houver apenas ZIP, extraia para `.reference/archsyrup-main/`.
3. Mantenha `.reference/` fora do build, lint, testes e bundle de produção.
4. Não faça commit de arquivos `.env`, caches ou credenciais vindas do projeto legado.
5. Gere `docs/REFERENCE_AUDIT.md` explicando o que será reutilizado, adaptado ou descartado.
6. Nunca copie o projeto inteiro para o produto novo.

## 3.1 O que já foi identificado no projeto de referência

O projeto legado contém peças valiosas que devem ser estudadas e reaproveitadas seletivamente:

### Habits

Inspecione especialmente:

```text
src/features/habits/
src/features/habits/useHabits.js
src/features/habits/habitUtils.js
supabase/schema.sql
```

Há lógica para:

- hábitos diários e por dias específicos da semana;
- `frequency_days`;
- hábitos repetíveis com `target_count`;
- contagem diária;
- logs por data;
- streak atual e maior streak;
- progresso semanal e mensal;
- atualização otimista;
- vínculo entre hábito e treino.

Reaproveite algoritmos e casos de teste, mas converta tudo para TypeScript, adapte ao novo schema e não transporte automaticamente o visual antigo.

### Workout

Inspecione especialmente:

```text
src/features/gym/
src/store/useGymStore.js
scripts/import-workout-exercises.mjs
scripts/import-gym-gifs.mjs
scripts/gymGifTargets.json
public/gym/exercise-catalog.json
public/gym/catalog-meta.json
supabase/gym.sql
supabase/gym_calendar.sql
supabase/gym_habit_link.sql
```

O legado possui:

- catálogo estático com aproximadamente 1.325 exercícios;
- instruções de execução no catálogo;
- taxonomia de grupos musculares;
- rotinas;
- treino ativo persistido localmente;
- séries, carga, repetições e conclusão;
- timer de descanso;
- volume, estimativa de 1RM, PRs e progressão;
- histórico;
- rotina agendada por dias da semana;
- integração treino ↔ hábito;
- pipeline para buscar GIFs uma única vez e hospedá-los no Supabase Storage;
- dezenas de exercícios já associados a GIFs hospedados.

Reaproveite a lógica, os scripts, a taxonomia, o catálogo e os testes úteis. Não faça chamadas à API de exercícios em tempo de execução. Não assuma que URLs de GIF do Supabase legado serão permanentes: crie um script de migração para copiar os GIFs autorizados para o novo bucket ou permita placeholder até a migração.

### Calendar

Inspecione especialmente:

```text
src/features/calendar/
src/features/calendar/useCalendar.js
src/features/calendar/calendarUtils.js
supabase/schema.sql
```

Há lógica para:

- mês, semana e dia;
- eventos com início e fim;
- eventos de dia inteiro;
- navegação temporal;
- overlays derivados de hábitos e rotinas de treino;
- queries por intervalo.

A feature está parcialmente estacionada no projeto legado, portanto deve ser auditada e corrigida, não copiada cegamente.

## 3.2 Conflito visual obrigatório

O design system do projeto legado não é a referência visual deste novo produto. Ele é escuro, compacto e deliberadamente pouco arredondado. As imagens anexadas para este novo projeto mostram outra direção: cartões grandes e suaves, estética próxima de aplicativo iOS, bento grid no desktop, navegação inferior em cápsula, combinação de superfícies claras e escuras e hierarquia mais confortável.

Portanto:

- **reutilize domínio, algoritmos, dados, scripts e testes do legado**;
- **não reutilize automaticamente o design system, layout, tokens, navegação ou aparência do legado**;
- não importe o CSS antigo como fundação;
- não tente “reskinar” o legado inteiro;
- crie uma aplicação nova, enxuta e visualmente coerente com as referências anexadas.

---

# 4. Stack técnica obrigatória

Use uma stack simples, atual, amplamente mantida e adequada ao Cloudflare Pages:

## Frontend

- React com TypeScript.
- Vite.
- React Router.
- `@supabase/supabase-js`.
- TanStack Query para estado remoto, cache, invalidação e mutations.
- Zustand com persistência apenas para estado local/transitório que precisa sobreviver a reload, como treino ativo e Pomodoro em andamento.
- React Hook Form + Zod para formulários e validação.
- date-fns para datas.
- Lucide React para ícones.
- dnd-kit apenas onde drag-and-drop trouxer valor real, como reordenar tarefas e exercícios.
- `vite-plugin-pwa` para manifest e service worker.
- Vitest + React Testing Library.
- Playwright para fluxos E2E críticos.

Não adicione Redux, GraphQL, Prisma, Next.js, backend Node separado, Firebase ou múltiplos frameworks sobrepostos.

## UI

Crie componentes próprios usando:

- CSS variables para tokens;
- CSS Modules ou estilos organizados por feature;
- componentes headless acessíveis apenas quando necessário para Dialog, Popover, Dropdown e Tooltip;
- sem visual padrão de shadcn/ui;
- sem copiar um kit visual inteiro;
- sem Tailwind classes gigantes espalhadas em JSX, salvo se o repositório já tiver Tailwind antes do início, o que não é esperado.

## Backend

- Supabase Auth.
- Supabase Postgres.
- Supabase Storage para GIFs de exercícios e futuros assets do usuário.
- SQL migrations versionadas em `supabase/migrations/`.
- tipos TypeScript gerados do banco em `src/types/database.generated.ts`.
- Row Level Security em toda tabela exposta.

## Hospedagem e CI

- Cloudflare Pages conectado ao GitHub.
- GitHub Actions apenas para qualidade: install, lint, typecheck, test e build.
- O deploy deve continuar sendo responsabilidade da integração Git do Cloudflare Pages.

---

# 5. Arquitetura esperada do repositório

Organize o projeto aproximadamente assim, ajustando apenas quando houver justificativa clara:

```text
/
├── AGENTS.md
├── CODEX_MASTER_PROMPT.md
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── icons/
│   ├── exercises/
│   │   ├── exercise-catalog.json
│   │   └── catalog-meta.json
│   └── manifest assets
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── queryClient.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── feedback/
│   ├── features/
│   │   ├── auth/
│   │   ├── home/
│   │   ├── calendar/
│   │   ├── tasks/
│   │   ├── focus/
│   │   ├── habits/
│   │   ├── workout/
│   │   └── settings/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── dates.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   ├── stores/
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   ├── themes.css
│   │   └── responsive.css
│   ├── types/
│   └── test/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── seed.sql
├── scripts/
│   ├── import-exercise-catalog.mjs
│   ├── migrate-exercise-gifs.mjs
│   └── validate-exercise-catalog.mjs
├── tests/
│   └── e2e/
└── docs/
    ├── IMPLEMENTATION_PLAN.md
    ├── REFERENCE_AUDIT.md
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    ├── DESIGN_SYSTEM.md
    ├── DEPLOYMENT.md
    └── TESTING.md
```

Regras de arquitetura:

- Cada feature deve conter seus componentes, hooks, queries, mutations, schemas e utilitários.
- Funções de data, streak, volume e progressão devem ser puras e testáveis.
- Componentes não devem executar queries Supabase diretamente; use hooks/repositories da feature.
- Não crie arquivos monolíticos. Divida componentes ao ultrapassar aproximadamente 300–400 linhas ou quando houver responsabilidades distintas.
- Não crie uma abstração genérica antes de existir repetição real.
- Não esconda regras de negócio importantes dentro de componentes visuais.
- Use import aliases configurados, por exemplo `@/features/...`.
- TypeScript em modo estrito.
- Evite `any`. Quando inevitável, documente a razão localmente.

---

# 6. Direção visual baseada nas referências anexadas

A estética é requisito de produto, não acabamento opcional.

## 6.1 Sensação geral

O app deve ser:

- premium;
- silencioso;
- agradável de tocar;
- denso o suficiente para produtividade, mas nunca apertado;
- visualmente consistente entre módulos;
- próximo da qualidade de um bom app iOS;
- adaptado para web sem parecer uma página web tradicional.

## 6.2 Elementos centrais

Use:

- superfícies claras em off-white e cinza muito suave no tema light;
- preto, carvão e cinzas profundos no tema dark;
- cartões com cantos generosos, normalmente entre 18 e 28 px conforme o tamanho;
- bordas finas e de baixo contraste;
- sombras muito suaves, usadas com moderação;
- cores de destaque dessaturadas, especialmente mint/verde, coral, azul e areia;
- tipografia de sistema com aparência próxima à SF Pro:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

- números, timer e métricas podendo usar `ui-monospace` quando isso melhorar leitura;
- ícones simples em traço;
- microinterações rápidas entre 150 e 220 ms;
- haptics visuais: compressão leve no toque, feedback imediato de check e estados claros;
- respeito a `prefers-reduced-motion`.

## 6.3 Navegação responsiva

### Mobile

- Barra inferior flutuante ou fixa em formato de cápsula escura.
- Item ativo dentro de pill clara, semelhante às referências.
- Máximo de cinco destinos principais visíveis:
  - Today
  - Calendar
  - Tasks
  - Habits
  - More
- Workout e Focus podem ser acessados por `More`, atalhos na Home e contexto de Tasks, mas Workout deve continuar sendo rota de primeiro nível internamente.
- Safe areas de iPhone obrigatórias.
- FAB contextual apenas quando realmente útil.
- Modais complexos devem virar bottom sheets ou páginas dedicadas.
- Alvos de toque mínimos de 44×44 px.

### Tablet

- Rail lateral compacto ou navegação inferior conforme largura/orientação.
- Layout master-detail quando fizer sentido, por exemplo calendário + painel do dia.
- Cards em duas colunas sem simplesmente ampliar o mobile.

### Desktop

- Sidebar/rail persistente.
- Home em bento grid, inspirada na referência escura enviada.
- Calendar e Tasks devem aproveitar largura com painéis laterais.
- Conteúdo não deve ficar preso em uma coluna estreita de celular centralizada.
- Evite excesso de cards pequenos iguais; use hierarquia por tamanho e importância.

## 6.4 Temas

Implemente:

- Light.
- Dark.
- System.

Persistir preferência no perfil e aplicar imediatamente sem flash perceptível.

## 6.5 Antipadrões visuais proibidos

Não usar:

- gradiente roxo/azul genérico;
- glassmorphism exagerado;
- neon;
- cartões igualmente arredondados para absolutamente tudo;
- dashboard corporativo com tabelas e filtros pesados;
- landing page dentro do app autenticado;
- ilustrações decorativas aleatórias;
- emojis Unicode como ícones de interface;
- shadcn/ui sem customização profunda;
- componentes com aparência de template;
- skeletons eternos ou estados sem feedback.

## 6.6 Documento visual obrigatório

Antes de construir as páginas, crie `docs/DESIGN_SYSTEM.md` com:

- paleta light/dark;
- tokens de espaçamento;
- escala tipográfica;
- raios;
- sombras;
- estados de interação;
- anatomia de cards;
- navegação por breakpoint;
- exemplos de botões, inputs, chips, sheets e dialogs;
- regras para gráficos;
- capturas locais das primeiras telas após implementação.

---

# 7. Informação e rotas do produto

Use rotas claras e estáveis:

```text
/login
/signup
/today
/calendar
/calendar/week
/calendar/day/:date
/tasks
/tasks/today
/tasks/upcoming
/tasks/project/:projectId
/focus
/rewards
/habits
/habits/insights
/workout
/workout/routines
/workout/routine/:routineId
/workout/session/active
/workout/history
/workout/exercise/:exerciseId
/settings
/settings/appearance
/settings/data
```

A rota `/` deve redirecionar para `/today` quando autenticado e para `/login` quando não autenticado.

Use lazy loading por feature, sem fragmentar cada componente mínimo em um chunk separado.

---

# 8. Home / Today

A Home deve responder rapidamente: “O que preciso fazer agora?”

## Conteúdo obrigatório

- data atual;
- saudação curta sem linguagem motivacional exagerada;
- próximo evento;
- agenda do dia;
- tasks de hoje;
- progresso de hábitos do dia;
- treino agendado ou botão para iniciar quick workout;
- status do Pomodoro atual, se houver;
- resumo curto: tarefas concluídas, hábitos, minutos de foco e workout.

## Comportamento

- Cada item deve abrir seu módulo de origem.
- Não duplique dados em uma tabela `dashboard`; derive de queries dos módulos.
- O estado vazio deve orientar a criação do primeiro item sem ocupar a tela inteira.
- No desktop, use bento grid com tamanhos diferentes.
- No mobile, use fluxo vertical com blocos priorizados por horário e urgência.

---

# 9. Calendar

## 9.1 Funcionalidades do MVP

- visualização de mês;
- visualização de semana com eixo de horas;
- visualização de dia;
- criar, editar e excluir evento;
- título;
- descrição opcional;
- data;
- horário de início;
- horário de término ou duração;
- evento de dia inteiro;
- cor/categoria;
- localização opcional;
- botão “Today”;
- navegação anterior/próximo;
- criação ao tocar em um horário vazio;
- redimensionamento visual de eventos no desktop, apenas se ficar robusto;
- conflito visual quando eventos se sobrepõem;
- lista/agenda alternativa em telas pequenas.

## 9.2 Itens derivados no calendário

O calendário deve mostrar, sem duplicar registros em `calendar_events`:

- tasks com `scheduled_date` ou `due_at`;
- hábitos esperados naquele dia;
- rotinas de workout agendadas;
- sessões de workout concluídas;
- sessões de Pomodoro concluídas como dado opcional em detalhes do dia, não como bloco principal por padrão.

Crie um adaptador de domínio que normalize fontes diferentes em uma estrutura de visualização, por exemplo:

```ts
type CalendarItem = {
  id: string;
  source: 'event' | 'task' | 'habit' | 'workout-plan' | 'workout-session';
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  colorToken: string;
  completed?: boolean;
  route: string;
};
```

Nunca grave overlays derivados como eventos apenas para exibi-los.

## 9.3 Datas e timezone

- Eventos temporais: `timestamptz`, armazenados em UTC e apresentados no timezone do perfil.
- Tarefas e hábitos baseados em dia: coluna `date`, porque representam um dia local, não um instante UTC.
- Não use strings ISO cortadas de forma insegura para converter dia local.
- Teste mudança de mês, DST e horários próximos da meia-noite.

---

# 10. Tasks

O módulo deve combinar a simplicidade do Microsoft To Do com organização suficiente para projetos pessoais.

## 10.1 Estrutura

- Inbox.
- Today.
- Upcoming.
- Completed.
- Projects.

O termo interno pode ser `task_projects`; a UI deve usar “Projects”. Não use “package” no código como conceito técnico.

## 10.2 Campos de tarefa

- título obrigatório;
- notas opcionais;
- projeto opcional;
- data agendada opcional;
- prazo com horário opcional;
- prioridade `none | low | medium | high`;
- estimativa de foco em minutos opcional;
- status `open | completed | archived`;
- ordenação manual;
- subtarefas/checklist simples;
- timestamps de criação e conclusão.

## 10.3 Interações

- quick add sempre acessível;
- Enter cria;
- edição inline para título;
- swipe actions no mobile apenas se acessíveis também por menu;
- drag-and-drop para ordenar dentro de uma lista;
- mover entre projetos;
- concluir/desfazer com feedback imediato;
- filtro de concluídas sem poluir a tela principal;
- “Add to Today” e “Move to another day” rápidos;
- iniciar Pomodoro diretamente de uma tarefa;
- exibir tempo focado acumulado por tarefa.

## 10.4 Fora do MVP

Não implemente no primeiro ciclo:

- dependências entre tarefas;
- Gantt;
- colaboração;
- comentários;
- anexos;
- recorrência complexa por RRULE;
- automações estilo Zapier.

Prepare o schema para recorrência futura apenas se isso não complicar o MVP.

---

# 11. Focus / Pomodoro

O Pomodoro deve ser parte natural de Tasks, mas também possuir tela própria.

## 11.1 Funcionalidades

- presets 25/5, 30/5, 40/5, 50/10 e custom;
- runs de recompensa 25/5 com 3 stacks, 30/5 com 4 stacks e 40/5 com 5 stacks; uma run só é elegível quando todos os seus stacks de foco terminarem;
- descrição opcional da run de Focus, congelada na conclusão para avaliar bônus de conteúdo;
- foco, pausa curta e pausa longa;
- vínculo opcional com task;
- start, pause, resume, skip e stop;
- alerta visual e notificação local quando permitido;
- persistência do estado durante reload, troca de aba e bloqueio de tela;
- cálculo baseado em timestamps, não decremento ingênuo por `setInterval`;
- histórico de sessões;
- minutos focados por dia, semana e task;
- opção de som desativada por padrão ou com controle explícito.

## 11.2 Estado local e persistência

Enquanto ativo, o timer deve ficar em Zustand persistido com:

- `phase`;
- `startedAt`;
- `pausedAt`;
- `accumulatedPausedMs`;
- `durationMs`;
- `taskId`;
- `cycleIndex`.

Ao finalizar uma fase de foco, grave uma linha durável no Supabase. Nunca grave uma atualização no banco a cada segundo.

## 11.3 UX

- timer grande e legível;
- controles com uma ação principal clara;
- mini player persistente no app shell enquanto o timer estiver rodando;
- iniciar foco a partir da task deve manter contexto e voltar à task facilmente.

---

# 12. Habits

## 12.1 Funcionalidades

- criar, editar, arquivar e excluir hábito;
- título;
- descrição opcional;
- ícone Lucide;
- cor por token;
- todos os dias ou dias específicos da semana;
- meta diária por contagem, por exemplo 1 treino ou 5 copos;
- unidade opcional, por exemplo `times`, `glasses`, `pages`, `minutes`;
- ordenação;
- check/incremento rápido;
- desfazer;
- marcar como skipped com motivo opcional;
- histórico por dia;
- streak atual;
- maior streak;
- taxa semanal e mensal;
- heatmap/grade de consistência;
- insights simples baseados em dados reais, sem frases inventadas.

## 12.2 Regras de contagem

- `target_count = 1` funciona como booleano.
- `target_count > 1` permite incrementar de 0 até a meta.
- Um hábito só conta como completo no streak quando atingir a meta do dia.
- `skipped` não deve contar como concluído.
- Defina e documente se `skipped` quebra streak. Para o MVP, considere que quebra streak, salvo configuração futura.
- Dias em que o hábito não estava agendado não quebram streak.
- Faça testes unitários abrangentes para esses casos.

## 12.3 Integrações

- Uma rotina de workout pode estar vinculada a um hábito.
- Finalizar a sessão deve completar ou incrementar o hábito correspondente no dia local do usuário.
- Desfazer manualmente o hábito não deve apagar silenciosamente histórico de treino. O comportamento do projeto legado que apaga sessão ao desfazer deve ser revisto: no novo produto, preserve workout history e apenas remova o vínculo/completion automática, salvo confirmação explícita.

---

# 13. Workout

O módulo deve se aproximar da fluidez de apps como Hevy, sem copiar marca ou layout.

## 13.1 Catálogo de exercícios

- Importe o catálogo estático do projeto de referência.
- Mantenha o catálogo fora do banco se ele for imutável e puder ser servido como JSON versionado.
- Carregue uma vez, faça cache e ofereça busca instantânea.
- Campos mínimos:
  - id;
  - name;
  - muscleGroup;
  - target;
  - secondaryMuscles;
  - bodyPart;
  - equipment;
  - instructions;
  - description;
  - hostedGifUrl opcional.
- Permita custom exercises em tabela separada no Supabase.
- Nunca exponha chave de API de exercícios no navegador.
- Não busque GIF no runtime.
- Use placeholder elegante quando não houver GIF.
- Lazy-load de GIFs e respeito a conexão reduzida.

## 13.2 Rotinas

- criar, editar, duplicar e arquivar rotina;
- nome e nota;
- exercícios ordenados;
- séries padrão;
- reps alvo ou faixa de reps;
- carga inicial opcional;
- descanso por exercício;
- dias da semana agendados;
- horário opcional;
- vínculo opcional com hábito.

## 13.3 Treino ativo

- iniciar rotina ou quick workout;
- título editável;
- cronômetro total;
- adicionar/remover/reordenar exercício;
- série de aquecimento e série normal;
- carga em kg;
- repetições;
- RIR opcional;
- concluir/desfazer série;
- preencher próxima série a partir da anterior;
- mostrar referência do treino anterior;
- timer de descanso automático ao concluir série;
- editar descanso;
- adicionar nota por exercício;
- persistir localmente para sobreviver a refresh e perda de internet;
- finalizar apenas após confirmação se houver séries incompletas;
- descartar com confirmação forte.

## 13.4 Histórico e progressão

- lista de sessões;
- detalhes da sessão;
- volume total;
- duração;
- séries concluídas;
- melhor série;
- estimativa de 1RM;
- histórico por exercício;
- gráfico de carga/1RM/volume;
- PRs;
- frequência semanal;
- distribuição por grupo muscular.

Reaproveite e teste funções do legado como:

- volume por série;
- 1RM estimado;
- PR;
- séries anteriores;
- duração;
- séries temporais;
- frequência semanal.

## 13.5 Persistência

Não preserve o modelo JSONB do legado apenas por conveniência. Para o novo produto, use schema normalizado para sessões, exercícios e séries, porque isso simplifica análises e integridade.

O treino ativo pode permanecer como documento local durante a sessão. Ao finalizar, converta-o para inserts transacionais no schema normalizado.

---

# 14. Rewards

Rewards é uma carteira privada e auditável de créditos internos. Ela recompensa atividades já existentes, mas não altera o resultado funcional de Focus ou Workout, não cria rankings nem recursos sociais e não é uma solução de pagamento. Qualquer crédito em R$ é um pedido de resgate registrado no produto; a liquidação, se houver, ocorre fora do app e nunca deve ser apresentada como automática.

## 14.1 Fonte única de regras e tempo

- Centralize valores de recompensa, limites, catálogo de loja, taxas de conversão e textos de justificativa em uma única configuração versionada, lida pelo frontend apenas para exibição e aplicada de forma autoritativa pelas RPCs do banco.
- A configuração ativa deve começar com exatamente os valores desta seção. Não espalhe números mágicos em componentes, mutations ou testes.
- Registre a versão da configuração em cada movimentação para preservar o histórico se regras futuras mudarem.
- Calcule dia e mês usando o timezone IANA do perfil no momento da operação. `local_month` representa o primeiro dia do mês local; o cliente não pode fornecê-lo como fonte de verdade.
- Saldo é sempre inteiro e não negativo. Silver e Gold não têm frações.
- Toda alteração de carteira, contador mensal e histórico deve ocorrer na mesma transação do Postgres, com bloqueio da carteira/counter do usuário. O cliente nunca informa saldo, valor premiado ou contador final.

## 14.2 Focus recompensado

Uma **Focus run** é uma sequência configurada de stacks de foco e pausa. Somente uma run com todos os stacks de foco concluídos é elegível. Pausas, stops, skips, runs incompletas ou fases isoladas não concedem moedas nem incrementam a predominância mensal.

| Modalidade | Stacks completos exigidos | Silver base | Gold base | Bônus de descrição | Limite mensal de Silver de Focus | Limite global mensal de Gold |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 25/5 | 3 | +2 | +1 | +1 Silver com descrição de pelo menos 500 caracteres | 150 | 100 |
| 30/5 | 4 | +4 | +3 | +1 Silver com descrição de pelo menos 500 caracteres | 200 | 150 |
| 40/5 | 5 | +6 | +5 | +1 Silver com descrição de pelo menos 500 caracteres | 250 | 200 |

- Conte a descrição por pontos de código Unicode após `trim`; 500 caracteres exatos qualificam. A descrição que qualificou deve permanecer no snapshot da run concluída para que edição posterior não altere uma recompensa já concedida.
- O bônus de descrição entra no limite mensal de Silver de Focus.
- Ao concluir a segunda run 40/5 no mesmo dia local, conceda uma única vez mais +1 Silver de bônus diário. A terceira ou posterior run 40/5 no mesmo dia não cria outro bônus.
- A recompensa deve ser limitada ao saldo disponível no teto aplicável: Silver de Focus é limitado pelo teto da modalidade predominante e Gold pelo teto global. Ao cruzar um teto, credite apenas a parcela inteira restante; depois dele, a atividade continua registrada sem a moeda esgotada.
- Casos de aceite mínimos: cinco runs 25/5 completas sem bônus rendem 10 Silver; três runs 30/5 rendem 12 Silver; duas runs 40/5 no mesmo dia rendem 13 Silver contando o bônus diário.

## 14.3 Modalidade predominante e limites mensais

- Para cada mês local, conte as Focus runs completas por modalidade, inclusive as que ficaram sem Gold ou Silver porque um teto já foi atingido.
- A modalidade com mais runs completas define tanto o teto de Silver de Focus quanto o teto global de Gold. Em empate, escolha a modalidade de menor teto: 25/5 antes de 30/5, antes de 40/5.
- Antes de cada crédito, recalcule a modalidade predominante sob a transação. Se a predominância mudar, o novo teto vale somente para créditos futuros; nunca revogue moedas já lançadas nem gere saldo negativo.
- Enquanto não houver uma Focus run completa no mês, use preventivamente os tetos de 25/5 (150 Silver de Focus e 100 Gold globais).
- O contador de Gold considera todos os Gold positivos ganhos por Focus, musculação, cardio, bônus de cardio e conversão Silver→Gold. Gastos em loja e conversões Gold→Silver não liberam novamente a cota mensal.
- Contadores e predominância são isolados por mês local e reiniciam naturalmente na primeira operação do mês seguinte; não use cron obrigatório para “zerar” dados históricos.

## 14.4 Recompensas de Workout

Classifique cada `workout_session` concluída como `strength` ou `cardio`; a classificação é durável e não pode ser alterada para reemitir recompensa.

### Musculação

- Cada sessão `strength` concluída e elegível concede +2 Silver e +4 Gold.
- No máximo uma musculação pode ser recompensada por dia local.
- No máximo 25 musculações podem ser recompensadas em um mês local.
- Ao completar 25 musculações elegíveis no mês, o resultado, antes de eventual teto global já usado, é 50 Silver e 100 Gold.

### Cardio

- Cada sessão `cardio` concluída, com duração confirmada de pelo menos 30 minutos, concede +2 Silver e +4 Gold.
- No máximo um cardio pode ser recompensado por dia local e 15 cardios podem ser recompensados no mês local.
- Na 15ª sessão de cardio elegível do mês, conceda uma única vez +20 Silver e +40 Gold de bônus mensal. Antes de eventual uso anterior do teto global, 15 cardios totalizam 50 Silver e 100 Gold.
- Musculação e cardio têm limites diários independentes; uma sessão de cada categoria pode ser elegível no mesmo dia.
- O teto global de Gold pode reduzir somente a parcela de Gold. Silver e o registro da atividade continuam sujeitos aos seus próprios limites de categoria.

## 14.5 Limite global de Gold

- Os Gold positivos de Focus, musculação, cardio, bônus mensal de cardio e conversão Silver→Gold compartilham uma única cota mensal.
- O teto é 100, 150 ou 200 Gold segundo a modalidade de Focus predominante de 25/5, 30/5 ou 40/5, respectivamente.
- Ao chegar a zero Gold disponível, as atividades continuam sendo salvas e auditadas, mas não recebem Gold até o mês local seguinte. O histórico deve mostrar o valor efetivamente creditado, inclusive quando for menor que a recompensa-base pelo último espaço do teto.

## 14.6 Lojas de créditos

Uma compra cria um `redemption` imutável, debita a moeda em transação e registra o crédito em centavos. Não há gateway, saque automático, PIX, cartão ou transferência no MVP. A interface deve deixar claro que se trata de um crédito/pedido interno e mostrar seu status.

### Loja Silver

| Crédito | Preço |
| ---: | ---: |
| R$ 5 | 7 Silver |
| R$ 7 | 10 Silver |
| R$ 10 | 15 Silver |
| R$ 15 | 22 Silver |
| R$ 20 | 30 Silver |
| R$ 30 | 45 Silver |
| R$ 40 | 60 Silver |
| R$ 50 | 70 Silver |
| R$ 60 | 85 Silver |
| R$ 70 | 100 Silver |
| R$ 80 | 115 Silver |
| R$ 90 | 130 Silver |
| R$ 100 | 145 Silver |

### Loja Gold

| Crédito | Preço |
| ---: | ---: |
| R$ 100 | 150 Gold |
| R$ 200 | 300 Gold |
| R$ 300 | 450 Gold |
| R$ 500 | 750 Gold |
| R$ 800 | 1.200 Gold |
| R$ 1.000 | 1.500 Gold |
| R$ 1.500 | 2.250 Gold |
| R$ 2.000 | 3.000 Gold |
| R$ 3.000 | 4.500 Gold |
| R$ 4.000 | 6.000 Gold |

- Antes de confirmar, mostre item, preço, saldo atual e saldo que restará. Recuse a operação inteira se a moeda for insuficiente; nunca permita saldo negativo ou débito parcial.
- Congele no redemption o SKU, valor em centavos, moeda, preço e versão da configuração. Alterar o catálogo futuro não muda compras antigas.

## 14.7 Conversões

- Silver→Gold: 20 Silver inteiros geram 1 Gold.
- Gold→Silver: 1 Gold inteiro gera 10 Silver; a perda relativa é intencional.
- As duas direções compartilham no máximo cinco operações por mês local. Uma operação pode converter várias unidades, mas nunca valores fracionados.
- Exija diálogo de confirmação com moeda removida, moeda recebida, saldo atual e saldo resultante. Só atualize a UI após persistência durável, ou use update otimista com rollback e erro visível.
- Silver→Gold só é aceita se o Gold inteiro que seria recebido couber totalmente na cota global ainda disponível; caso contrário, rejeite sem debitar Silver e informe o máximo conversível. Gold→Silver não consome a cota de Gold.
- Registre cada conversão no histórico e incremente o contador compartilhado apenas após a transação terminar com sucesso.

## 14.8 Histórico, idempotência e interface

- O histórico é um ledger imutável. Cada item mostra tipo/razão, delta de Silver, delta de Gold, data e hora, atividade relacionada quando houver, versão de regra e os dois saldos imediatamente após a operação.
- Razões mínimas: `focus_base`, `focus_description_bonus`, `focus_daily_40_bonus`, `strength_reward`, `cardio_reward`, `cardio_monthly_bonus`, `silver_store_purchase`, `gold_store_purchase`, `silver_to_gold_conversion`, `gold_to_silver_conversion` e `admin_adjustment`.
- A mesma fonte só pode lançar a mesma razão uma vez. Use chaves de idempotência/constraints para Focus run, sessão de workout, bônus diário, bônus mensal de cardio, conversão e redemption; retries de rede nunca podem duplicar moedas.
- Ajustes administrativos, se futuramente liberados, exigem razão, ator, auditoria e RPC separada. Não exponha edição de saldo no cliente autenticado comum.
- Crie `/rewards` como área autenticada, responsiva e coerente com o design existente: cartões de saldo Silver/Gold, progresso de Silver de Focus e Gold global do mês, modalidade predominante e contador de conversões restantes, histórico paginado, loja Silver, loja Gold e ações de conversão.
- Trate loading, vazio, erro, sucesso, saldo insuficiente, teto atingido, conversões esgotadas, atividade inelegível e confirmação destrutiva/financeira com estados explícitos. Em mobile, lojas e conversões podem usar bottom sheets; todos os controles exigem teclado, foco visível e alvos de 44 px.
- Silver pode usar o tom neutro/prateado e Gold um destaque quente e dessaturado, sem brilho, cassino, animações celebratórias excessivas ou linguagem manipulativa.

---

# 15. Modelo de dados inicial

Crie migrations reais. Não use somente um arquivo SQL solto e não dependa de clicar manualmente no SQL Editor para reconstruir o projeto.

Todas as tabelas de usuário devem conter `user_id uuid not null references auth.users(id) on delete cascade`, RLS e índices adequados.

## 15.1 Profiles

```text
profiles
- id uuid PK = auth.users.id
- display_name text
- avatar_url text
- timezone text not null
- week_starts_on smallint not null default 1
- theme text not null default 'system'
- created_at timestamptz
- updated_at timestamptz
```

## 15.2 Calendar

```text
calendar_events
- id uuid PK
- user_id uuid
- title text
- description text nullable
- start_at timestamptz nullable
- end_at timestamptz nullable
- all_day boolean
- start_date date nullable
- end_date date nullable
- category text nullable
- color_token text
- location text nullable
- created_at timestamptz
- updated_at timestamptz
```

Constraint: eventos temporais usam `start_at/end_at`; eventos all-day usam `start_date/end_date`. Valide combinações inválidas.

## 15.3 Tasks

```text
task_projects
- id uuid PK
- user_id uuid
- name text
- color_token text
- icon text nullable
- position numeric
- archived_at timestamptz nullable
- created_at timestamptz
- updated_at timestamptz

tasks
- id uuid PK
- user_id uuid
- project_id uuid nullable
- title text
- notes text nullable
- status text
- priority text
- scheduled_date date nullable
- due_at timestamptz nullable
- estimate_minutes integer nullable
- position numeric
- completed_at timestamptz nullable
- archived_at timestamptz nullable
- created_at timestamptz
- updated_at timestamptz

task_checklist_items
- id uuid PK
- user_id uuid
- task_id uuid
- title text
- completed boolean
- position numeric
- created_at timestamptz
- updated_at timestamptz
```

## 15.4 Focus

```text
focus_sessions
- id uuid PK
- user_id uuid
- focus_run_id uuid nullable
- task_id uuid nullable
- started_at timestamptz
- ended_at timestamptz
- planned_seconds integer
- focused_seconds integer
- session_type text
- completed boolean
- created_at timestamptz
```

```text
focus_runs
- id uuid PK
- user_id uuid
- mode text (`25_5` | `30_5` | `40_5` | `other`)
- focus_seconds_per_stack integer
- break_seconds integer
- required_stack_count integer
- completed_stack_count integer
- description text nullable
- started_at timestamptz
- completed_at timestamptz nullable
- created_at timestamptz
```

Somente runs cujo modo e quantidade de stacks correspondam à configuração de Rewards podem receber recompensa. `focus_sessions.focus_run_id` permite preservar o histórico de cada fase sem confundir uma fase concluída com uma run elegível.

## 15.5 Habits

```text
habits
- id uuid PK
- user_id uuid
- title text
- description text nullable
- icon text
- color_token text
- schedule_type text
- weekdays smallint[] nullable
- target_count integer not null default 1
- unit text nullable
- position numeric
- is_active boolean
- created_at timestamptz
- updated_at timestamptz

habit_logs
- id uuid PK
- user_id uuid
- habit_id uuid
- local_date date
- count integer not null default 0
- status text
- note text nullable
- source text nullable
- source_id uuid nullable
- created_at timestamptz
- updated_at timestamptz
- unique(habit_id, local_date)
```

## 15.6 Workout

```text
workout_routines
- id uuid PK
- user_id uuid
- habit_id uuid nullable
- name text
- notes text nullable
- weekdays smallint[] nullable
- start_time time nullable
- is_active boolean
- created_at timestamptz
- updated_at timestamptz

workout_routine_exercises
- id uuid PK
- user_id uuid
- routine_id uuid
- exercise_id text
- position numeric
- target_sets integer
- target_reps_min integer nullable
- target_reps_max integer nullable
- default_weight_kg numeric nullable
- rest_seconds integer
- notes text nullable

custom_exercises
- id uuid PK
- user_id uuid
- name text
- muscle_group text nullable
- equipment text nullable
- instructions text[] nullable
- created_at timestamptz
- updated_at timestamptz

workout_sessions
- id uuid PK
- user_id uuid
- routine_id uuid nullable
- habit_id uuid nullable
- activity_type text (`strength` | `cardio`)
- title text
- started_at timestamptz
- finished_at timestamptz
- notes text nullable
- created_at timestamptz

workout_session_exercises
- id uuid PK
- user_id uuid
- session_id uuid
- exercise_id text nullable
- custom_exercise_id uuid nullable
- position numeric
- notes text nullable

workout_sets
- id uuid PK
- user_id uuid
- session_exercise_id uuid
- set_number integer
- set_type text
- weight_kg numeric
- reps integer
- rir numeric nullable
- completed_at timestamptz nullable
```

Adicione constraints que garantam que cada `workout_session_exercise` aponte para um exercício do catálogo ou custom exercise, mas não ambos.

## 15.7 Rewards

```text
reward_rule_sets
- id uuid PK
- version text unique
- is_active boolean
- rules jsonb
- checksum text
- created_at timestamptz

reward_wallets
- user_id uuid PK = auth.users.id
- silver_balance bigint not null default 0
- gold_balance bigint not null default 0
- version integer not null default 0
- created_at timestamptz
- updated_at timestamptz

reward_monthly_counters
- id uuid PK
- user_id uuid
- local_month date
- focus_25_5_completed integer not null default 0
- focus_30_5_completed integer not null default 0
- focus_40_5_completed integer not null default 0
- focus_silver_credited integer not null default 0
- gold_credited integer not null default 0
- strength_rewarded_count integer not null default 0
- cardio_rewarded_count integer not null default 0
- cardio_monthly_bonus_granted boolean not null default false
- conversion_count integer not null default 0
- created_at timestamptz
- updated_at timestamptz
- unique(user_id, local_month)

reward_transactions
- id uuid PK
- user_id uuid
- reason text
- silver_delta bigint not null
- gold_delta bigint not null
- silver_balance_after bigint not null
- gold_balance_after bigint not null
- source_type text
- source_key text not null
- source_id uuid nullable
- rule_version text
- metadata jsonb nullable
- created_at timestamptz
- unique(user_id, reason, source_key)

reward_redemptions
- id uuid PK
- user_id uuid
- catalog_sku text
- currency text (`silver` | `gold`)
- coins_spent bigint
- credit_cents integer
- status text (`requested` | `fulfilled` | `cancelled`)
- rule_version text
- created_at timestamptz
- updated_at timestamptz
```

`reward_rule_sets.rules` é a única configuração ativa de economia e catálogo; JSONB é aceitável aqui por ser configuração versionada, não estado de domínio por usuário. Guarde no metadata de cada lançamento o snapshot mínimo necessário para auditoria, sem dados sensíveis. Use uma `source_key` determinística, por exemplo o UUID da run ou sessão, `40_5:2026-08-17` para bônus diário e `cardio:2026-08-01` para bônus mensal.

Crie constraints para saldos/counters não negativos, deltas não simultaneamente nulos, tipos permitidos, duração de cardio e as FKs de fonte aplicáveis. Aplique RLS de leitura própria para carteira, contadores, ledger e redemptions. Usuários autenticados não recebem `insert`, `update` ou `delete` direto em carteira, contadores, transações, config ou redemptions: mutations ocorrem apenas por RPCs estreitas e auditáveis. A configuração pode ser lida por `authenticated`, mas só papel administrativo a altera.

Índices mínimos: `reward_transactions(user_id, created_at desc)`, `reward_monthly_counters(user_id, local_month)`, `focus_runs(user_id, completed_at)`, `workout_sessions(user_id, activity_type, finished_at)` e as chaves de idempotência usadas pelas RPCs.

## 15.8 Segurança e performance

- Ative RLS em todas as tabelas expostas.
- Policies específicas para `authenticated`.
- Use `(select auth.uid()) = user_id` quando adequado.
- Indexe todas as FKs usadas em joins.
- Indexe consultas por usuário + data:
  - `calendar_events(user_id, start_at)`;
  - `tasks(user_id, scheduled_date, status)`;
  - `habit_logs(user_id, local_date)`;
  - `workout_sessions(user_id, finished_at desc)`;
  - `focus_sessions(user_id, started_at desc)`.
- Nunca coloque service role key em código frontend, variáveis `VITE_*`, logs ou documentação commitada.
- A publishable/anon key pode estar no frontend, mas a segurança depende de RLS correta.
- Gere testes ou scripts de verificação de RLS para confirmar que um usuário não acessa dados de outro.

---

# 16. Operações atômicas importantes

Crie funções Postgres/RPC apenas onde houver ganho claro de consistência:

## Finalizar workout

Uma operação `finish_workout_session` deve:

1. validar o usuário;
2. criar/atualizar sessão;
3. inserir exercícios;
4. inserir sets;
5. finalizar a sessão;
6. se houver `habit_id`, fazer upsert do log daquele hábito para o dia local;
7. retornar a sessão finalizada.

A operação deve ser transacional para evitar sessões pela metade.

## Reordenar itens

Não envie dezenas de updates a cada drag. Use posições espaçadas ou RPC em lote quando necessário.

Não crie RPC para CRUD simples que o cliente Supabase executa de forma segura e legível.

## Conceder Rewards

Implemente RPCs pequenas e idempotentes para `complete_focus_run_and_award`, `award_workout_rewards`, `convert_reward_currency` e `redeem_reward_credit` (os nomes podem variar, mas as responsabilidades não). Todas devem:

1. obter `auth.uid()` e o timezone do próprio perfil;
2. validar a fonte real no banco, sem confiar em modo, duração, descrição, valor ou saldo enviados pelo cliente;
3. carregar a versão ativa de regras, calcular mês/dia local, locks de carteira e contador mensal e limites aplicáveis;
4. verificar idempotência antes de alterar saldos;
5. inserir/atualizar a fonte de atividade quando for parte da operação, atualizar carteira e contadores, inserir ledger e retornar os valores efetivamente aplicados;
6. falhar por inteiro em saldo insuficiente, fonte inelegível, conversão inválida, teto de conversões, preço alterado ou conflito de idempotência.

`complete_focus_run_and_award` deve validar todos os stacks antes de criar os lançamentos de base, descrição e bônus diário. `award_workout_rewards` valida sessão finalizada, categoria, duração de cardio, limites diário/mensal e bônus da 15ª sessão. `convert_reward_currency` rejeita o pedido se a saída inteira de Gold não couber no teto global restante. `redeem_reward_credit` confirma SKU/preço da configuração ativa e debita a carteira junto com o redemption. Nenhuma RPC deve fazer chamadas de rede externas.

---

# 17. Estado, cache e sincronização

## Estado remoto

TanStack Query deve controlar:

- profiles;
- events;
- tasks e projects;
- habits e logs;
- routines;
- workout history;
- focus history;
- carteira, contador mensal, regras ativas, ledger e redemptions de Rewards.

Use query keys consistentes e documentadas.

## Estado local

Zustand persistido deve controlar apenas:

- active workout draft;
- active Pomodoro;
- preferências temporárias de UI que não pertencem ao servidor.

Não duplique todo o banco em Zustand.

## Optimistic updates

Use updates otimistas para:

- completar task;
- incrementar hábito;
- reordenar task;
- editar título simples.

Para Rewards, não trate saldo, compra, conversão ou recompensa como sucesso antes da resposta da RPC. Prefira reconciliar a carteira com o retorno durável; se houver atualização otimista localizada, ela deve restaurar carteira, contadores e ledger integralmente em erro.

Sempre implemente rollback em caso de erro e feedback visível.

## Offline do MVP

Obrigatório:

- app shell e assets estáticos disponíveis após primeira visita;
- catálogo de exercícios cacheado;
- workout ativo sobrevive offline e a reload;
- Pomodoro ativo sobrevive offline e a reload;
- indicador de conexão;
- mutações que exigem servidor devem falhar honestamente ou permanecer claramente pendentes.

Fila offline completa para todos os CRUDs pode ser uma fase posterior. Não simule sincronização bem-sucedida quando não houve persistência.

---

# 18. Autenticação

Implemente Supabase Auth com:

- e-mail e senha ou magic link, escolhendo a opção mais simples e robusta para o MVP;
- sessão persistida;
- AuthGuard;
- logout;
- recuperação de senha se usar senha;
- criação automática de `profiles` por trigger;
- tela de conta e exclusão de conta com confirmação forte.

O layout autenticado não deve piscar antes de resolver a sessão.

Não implemente OAuth social no primeiro ciclo.

---

# 19. PWA

Configure:

- manifest;
- ícones adequados;
- `theme_color` coerente por tema quando possível;
- display standalone;
- safe areas;
- service worker com atualização clara;
- aviso discreto quando houver nova versão;
- cache de app shell;
- cache do catálogo de exercícios;
- não cachear respostas privadas de Supabase de maneira insegura no service worker;
- navegação SPA funcionando em refresh de rotas internas.

Teste em viewport de iPhone, Android comum, iPad e desktop.

---

# 20. Cloudflare Pages e Supabase

Crie `docs/DEPLOYMENT.md` com passos exatos.

## Cloudflare Pages

Configuração esperada:

```text
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
Production branch: main
```

Variáveis de build:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_APP_ENV
```

Não use service role no Cloudflare Pages frontend.

A aplicação deve funcionar como SPA em rotas internas. Não crie um `404.html` que desative o fallback SPA do Pages, salvo decisão documentada. Se usar `_redirects`, mantenha-o simples e teste refresh direto em `/tasks`, `/calendar`, `/workout` e `/rewards`.

## Supabase

Documente:

- criação/vinculação do projeto;
- instalação do Supabase CLI;
- `supabase init`;
- migrations;
- seed;
- geração de types;
- aplicação em projeto remoto;
- configuração das URLs de autenticação para localhost e produção;
- criação do bucket `exercise-gifs`;
- policies de Storage;
- migração opcional de GIFs do legado.

## GitHub Actions

Crie workflow que rode em push e pull request:

```text
npm ci
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

Adicione Playwright em workflow separado ou etapa apropriada quando o ambiente E2E estiver estável.

---

# 21. Qualidade, acessibilidade e observabilidade

## Qualidade

- nenhuma tela principal pode depender de mock data após a fase de integração;
- sem botões sem ação;
- sem `TODO` de funcionalidade essencial;
- sem erro silencioso;
- loading, empty, error e success states reais;
- formulários com validação e mensagens claras;
- operações destrutivas com confirmação;
- todos os timestamps e datas tratados de forma consistente.
- créditos e preços apresentados com precisão em centavos, sem alegar pagamento ou resgate concluído antes de uma confirmação administrativa real.

## Acessibilidade

- HTML semântico;
- labels reais;
- navegação por teclado;
- foco visível;
- dialogs com focus trap e retorno de foco;
- contraste adequado nos dois temas;
- ícones decorativos com `aria-hidden`;
- botões apenas com ícone devem ter `aria-label`;
- não depender somente de cor para status;
- touch target mínimo de 44 px;
- suporte a reduced motion.

## Observabilidade

Crie logger pequeno que:

- não vaze dados pessoais ou tokens;
- diferencie debug/info/warn/error;
- possa ser conectado ao Sentry no futuro;
- mostre mensagens úteis ao usuário sem expor detalhes internos.

Sentry não é obrigatório no MVP.

---

# 22. Estratégia de testes

Crie `docs/TESTING.md` e cubra ao menos:

## Unit tests

- cálculo de streak;
- hábitos por dias da semana;
- meta por contagem;
- progresso semanal/mensal;
- conversões de data local;
- duração de eventos;
- timer por timestamps;
- volume de workout;
- 1RM;
- PR;
- séries anteriores;
- normalização do catálogo.
- elegibilidade de Focus somente após todos os stacks, limite de 500 caracteres e bônus diário único de 40/5;
- modalidade predominante, desempate conservador, mudança de teto no mês e reset por timezone;
- tetos de Silver de Focus e Gold global compartilhado, inclusive créditos parciais no último espaço;
- elegibilidade diária/mensal de musculação e cardio, duração mínima e bônus da 15ª sessão;
- taxas, valores inteiros, limite compartilhado de cinco conversões e rejeição sem débito quando Gold exceder a cota;
- cálculo de saldo/ledger e idempotência de cada fonte.

## Component/integration tests

- criação e conclusão de task;
- incremento de hábito;
- criação/edição de evento;
- formulário de rotina;
- restauração de workout ativo;
- Pomodoro retomado após reload simulado.
- tela de Rewards com loading, vazio, erro, saldo, tetos e histórico paginado;
- confirmação de compra/conversão, saldo insuficiente e cache reconciliado após retorno da RPC;
- integração de Focus/Workout com uma carteira real/local e rollback visível em falhas.

## E2E

Fluxos críticos:

1. cadastrar/logar;
2. criar uma task para hoje e concluí-la;
3. iniciar Pomodoro na task e finalizar uma sessão;
4. criar hábito com meta 3 e completar três incrementos;
5. criar evento e vê-lo em mês e dia;
6. criar rotina, iniciar workout, completar sets e finalizar;
7. recarregar durante workout ativo e confirmar restauração;
8. validar navegação mobile e desktop.
9. concluir runs de Focus e sessões de Workout elegíveis, conferir ledger/saldos/limites após reload, converter moedas e solicitar um crédito sem permitir duplicação em retry.

---

# 23. Plano de implementação por fases

Crie `docs/IMPLEMENTATION_PLAN.md` com checkboxes e mantenha-o atualizado. Cada fase deve terminar com lint, typecheck, testes relevantes e build.

## Fase 0 — Auditoria e decisões

- [ ] Inspecionar todo o workspace.
- [ ] Extrair e auditar o projeto legado.
- [ ] Criar `REFERENCE_AUDIT.md`.
- [ ] Confirmar stack disponível e conflitos.
- [ ] Criar ADRs curtos para decisões relevantes.
- [ ] Identificar assets que podem ser legalmente e tecnicamente reutilizados.
- [ ] Garantir que nenhum segredo do legado seja copiado.

Saída obrigatória: documentação e plano, ainda sem implementar features grandes.

## Fase 1 — Fundação

- [ ] Scaffold React + TypeScript + Vite.
- [ ] Configurar lint, format, typecheck, Vitest e aliases.
- [ ] Configurar Supabase client.
- [ ] Configurar React Query e Router.
- [ ] Criar app shell responsivo.
- [ ] Criar tokens light/dark.
- [ ] Implementar componentes base.
- [ ] Configurar Auth.
- [ ] Configurar PWA básica.
- [ ] Criar CI.
- [ ] Garantir build no Cloudflare Pages.

Critério: login e shell funcionando em mobile/desktop com deploy de preview.

## Fase 2 — Banco e contratos de domínio

- [ ] Criar migrations.
- [ ] Criar RLS.
- [ ] Criar índices.
- [ ] Criar seed mínimo.
- [ ] Gerar tipos.
- [ ] Criar repositories/hooks por feature.
- [ ] Criar testes de segurança e schemas Zod.

Critério: banco reproduzível localmente e sem tabelas abertas.

## Fase 3 — Tasks + Focus

- [ ] Projects e Inbox.
- [ ] Today, Upcoming e Completed.
- [ ] CRUD e reordenação.
- [ ] Checklist.
- [ ] Pomodoro persistido.
- [ ] Histórico de foco.
- [ ] Integração task ↔ focus.
- [ ] Testes e E2E.

Critério: fluxo diário completo de planejar, focar e concluir.

## Fase 4 — Calendar

- [ ] Month.
- [ ] Week.
- [ ] Day/agenda.
- [ ] CRUD de eventos.
- [ ] Timezone.
- [ ] Overlays de tasks.
- [ ] Responsividade e conflitos.
- [ ] Testes.

Critério: agenda utilizável no mobile e desktop, com refresh direto de rota funcionando.

## Fase 5 — Habits

- [ ] Portar e revisar algoritmos do legado.
- [ ] CRUD.
- [ ] Dias da semana.
- [ ] Target count.
- [ ] Logs.
- [ ] Streaks e insights.
- [ ] Calendar overlay.
- [ ] Testes de edge cases.

Critério: hábito simples e hábito por contagem funcionam sem inconsistência de datas.

## Fase 6 — Workout

- [ ] Importar catálogo estático.
- [ ] Criar busca e filtro.
- [ ] Rotinas normalizadas.
- [ ] Workout ativo local-first.
- [ ] Sets, cargas, reps, RIR e descanso.
- [ ] Finalização transacional.
- [ ] Histórico.
- [ ] Progressão e PRs.
- [ ] GIFs/placeholder.
- [ ] Integração habit e calendar.
- [ ] Testes e E2E.

Critério: iniciar, registrar, sobreviver a reload e finalizar um treino real.

## Fase 7 — Today e integrações

- [ ] Home unificada.
- [ ] Próximo evento.
- [ ] Tasks do dia.
- [ ] Habits do dia.
- [ ] Workout agendado.
- [ ] Focus mini player.
- [ ] Estatísticas derivadas.
- [ ] Empty/error states.

Critério: a Home substitui a necessidade de abrir todos os módulos para entender o dia.

## Fase 8 — Rewards

- [ ] Criar migration de configuração, carteira, contador mensal, ledger e redemptions com RLS e tipos gerados.
- [ ] Criar runs de Focus, classificação de Workout e RPCs transacionais idempotentes.
- [ ] Centralizar regras, catálogo e cópias de Rewards em configuração versionada.
- [ ] Implementar saldo, progresso mensal, histórico, loja Silver/Gold e conversões confirmadas.
- [ ] Cobrir limites, timezone, concorrência, RLS, idempotência, compra e conversão em testes unitários, banco, componente e E2E.
- [ ] Revisar cópia para nunca prometer pagamento, saque ou resgate automático.

Critério: atividades elegíveis rendem créditos uma única vez, saldos nunca ficam negativos, todos os limites mensais são corretos no timezone do perfil e cada movimentação é auditável.

## Fase 9 — Polimento e release

- [ ] Auditoria visual em todos os breakpoints.
- [ ] Auditoria de acessibilidade.
- [ ] Performance e lazy loading.
- [ ] Update flow da PWA.
- [ ] Security Advisor e Performance Advisor do Supabase.
- [ ] Testes E2E completos.
- [ ] Documentação de deploy.
- [ ] README final.
- [ ] Remover mocks, dead code e flags temporárias.

Critério: produção estável, documentada e reproduzível.

---

# 24. Processo operacional obrigatório para o Codex

## 24.1 Antes de alterar código

1. Leia `AGENTS.md`, este prompt, README e docs existentes.
2. Inspecione o repositório e o projeto de referência.
3. Execute os testes/build existentes para conhecer o baseline.
4. Registre decisões no plano.
5. Explique resumidamente o que fará na fase atual.

## 24.2 Durante a implementação

- Trabalhe em fatias verticais pequenas.
- Não gere o projeto inteiro em um único patch.
- Não mude contratos de uma feature sem atualizar testes e documentação.
- Não instale dependência sem explicar o problema que ela resolve.
- Prefira remover complexidade a adicionar abstração.
- Após cada tarefa relevante, execute os checks adequados.
- Corrija erros encontrados; não os esconda com disable global.
- Não use dados falsos para mascarar backend incompleto.
- Preserve alterações legítimas já existentes no repositório.
- Não reescreva arquivos alheios à tarefa sem necessidade.

## 24.3 Ao finalizar cada fase

Informe:

1. O que foi implementado.
2. Arquivos principais alterados.
3. Decisões tomadas.
4. Comandos executados.
5. Resultado de lint, typecheck, tests e build.
6. Pendências reais.
7. Próxima fase recomendada.

Se Git estiver disponível e o usuário tiver autorizado commits, use commits pequenos e semânticos. Não faça push sem autorização explícita.

## 24.4 Quando perguntar ao usuário

Só interrompa para perguntar quando houver uma decisão que bloqueie de verdade, como:

- nome final e branding;
- escolha de método de autenticação quando ambas impactarem experiência;
- confirmação de direitos/credenciais para migrar GIFs;
- alteração importante de escopo;
- necessidade de acesso externo não disponível.

Para decisões técnicas comuns, escolha a opção mais simples, documente e siga.

---

# 25. Definition of Done global

Uma feature só está pronta quando:

- funciona com Supabase real ou ambiente local reproduzível;
- possui loading, empty, error e success;
- funciona em 390 px, 768 px e 1280+ px;
- pode ser usada por teclado;
- não quebra tema light/dark;
- trata timezone/data corretamente;
- possui testes para regra de negócio central;
- passa lint, typecheck e build;
- não contém segredo;
- não deixa botão ou rota falsa;
- está documentada o suficiente para manutenção;
- visualmente pertence ao mesmo produto.

---

# 26. Critérios de aceitação finais do produto

O trabalho final deve permitir que o usuário:

- abra o app no celular e veja o dia em poucos segundos;
- crie evento com início e duração;
- visualize mês, semana e dia;
- crie tarefas em Today ou dentro de Projects;
- conclua e reorganize tarefas;
- inicie Pomodoro por uma tarefa e preserve o timer ao recarregar;
- crie hábitos por dias da semana e por contagem;
- acompanhe streak e histórico;
- crie rotina de treino;
- encontre exercício no catálogo;
- registre séries, carga e reps;
- use timer de descanso;
- recarregue no meio do treino sem perder dados;
- finalize treino e veja progressão;
- veja tasks, habits e workout refletidos no calendário e na Home;
- veja uma carteira privada de Silver e Gold, histórico auditável, limites mensais e conversões confirmadas;
- solicite créditos da loja apenas com saldo suficiente, sem que o produto alegue pagamento ou resgate automático;
- use o sistema em light e dark;
- instalar a PWA;
- acessar diretamente qualquer rota publicada no Cloudflare sem 404;
- ter seus dados isolados por RLS.

---

# 27. Primeira resposta esperada do Codex

Na primeira execução deste prompt, não comece despejando dezenas de arquivos. Faça exatamente nesta ordem:

1. Inspecione o workspace.
2. Localize e audite `archsyrup-main.zip` ou a pasta equivalente.
3. Resuma a arquitetura existente que pode ser reaproveitada.
4. Identifique conflitos e riscos, especialmente o conflito entre o visual legado e as novas referências.
5. Proponha a estrutura final do repositório.
6. Crie ou atualize:
   - `AGENTS.md`;
   - `docs/REFERENCE_AUDIT.md`;
   - `docs/IMPLEMENTATION_PLAN.md`;
   - `docs/ARCHITECTURE.md`;
   - `docs/DESIGN_SYSTEM.md` inicial;
   - `docs/DATABASE.md` inicial.
7. Execute o baseline existente.
8. Mostre o plano da Fase 1 com arquivos e critérios de aceitação.
9. Em seguida, comece a Fase 1, salvo se encontrar um bloqueio real.

Não peça confirmação para decisões já definidas neste documento.

---

# 28. Instrução final

Construa este produto como um aplicativo pessoal que será realmente usado todos os dias. Priorize confiabilidade, rapidez de interação, continuidade entre dispositivos, clareza visual e integração entre módulos. Reutilize do projeto legado apenas o que for comprovadamente útil. Não permita que a complexidade e o visual do legado contaminem a nova aplicação.

Comece agora pela auditoria do workspace e pela Fase 0.
