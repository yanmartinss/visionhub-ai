# VisionHub AI

Plataforma modular de monitoramento por Visão Computacional + IA. **MVP atual:** módulo de
monitoramento para condomínios que irá detectar problemas como portões da entrada abertos por muito tempo, carros estacionados em locais inapropriados por muito tempo, necessidades de animais não despejadas nas lixeiras ideais, alerta de crianças correndo no estacionamento e esses problemas que existem em condominios. Projeto acadêmico (disciplina APS). Docs em `docs/` (pt-BR):
`requisitos.md`, `arquitetura.md`, `database.md`, `backlog.md`.

> Nota: o `README.md` descreve `frontend/` e `backend/` como "a criar", mas ambos já existem
> e têm código. Este arquivo reflete o estado real.

## Mudança de arquitetura (decisão após conversa com o professor)

Acessar câmeras de condomínio em tempo real é inviável no MVP: elas ficam em DVR/NVR
fechado, com driver proprietário e rede restrita, e exigiria liberação do síndico e da
empresa de segurança. **Decisão: o MVP processa ARQUIVOS de gravação, em lote**, enviados
pelo síndico (upload ou link). O vídeo é analisado, os eventos do dia são montados e salvos
no banco, e o vídeo é comprimido/descartado para não estourar o armazenamento.

**Tempo real (RTSP/ONVIF/IP/driver da câmera) fica como fase 2**, plugado como um novo
adaptador de fonte de vídeo, sem mexer no restante do pipeline (ver "Fonte de vídeo").

Esta mudança **substitui** o fluxo antigo "Câmera (RTSP) → detecção". Onde `docs/` ainda
disser RTSP/tempo real como fluxo principal, atualizar (ver "Docs a atualizar").

## Arquitetura (do arquivo de vídeo ao alerta)

Síndico envia arquivo/link → backend cria o lote do dia → fila de jobs (1 job por segmento)
→ serviço de visão (extração de frames + YOLO + OpenCV) → camada de regras de negócio
(interpreta o evento) → PostgreSQL → dashboard React; quando todos os segmentos do dia
terminam, o Ollama (local) gera o resumo do dia em linguagem natural.

A detecção é genérica; o que conta como "evento" vive só na camada de regras — cada novo
módulo reaproveita os blocos e troca apenas as regras e os tipos de evento.

### Unidade de trabalho: lote do dia

**1 câmera + 1 dia = 1 lote** (`recordingDays`). Um lote é composto por vários **segmentos**
(`segments`): DVRs exportam em pedaços de 15 min a 1 h, e o dia inteiro raramente vem em um
arquivo só. Cada segmento é um job independente (progresso, retentativa só do pedaço que
falhou, paralelismo). O dia fica `completed` quando todos os segmentos terminarem.

Ordem de grandeza: câmera 1080p grava ~10 a 40 GB/dia. Por isso: nunca carregar o vídeo
inteiro na memória, processar em streaming e apagar o original logo após processar.

### Fluxo de processamento

1. **Entrada:** upload direto (preferir upload em partes/retomável para arquivos grandes)
   ou **link** (Drive, OneDrive, servidor do condomínio). No link, o servidor baixa em
   streaming, validando domínio permitido e tamanho antes de baixar.
2. **Fila:** a requisição responde rápido (`202`) e o trabalho roda em segundo plano.
   Status do segmento: `received` → `processing` → `completed` | `failed` (com contagem de
   tentativas).
3. **Pré-processamento:** FFmpeg converte formatos proprietários do DVR na entrada; extrair
   ~1 frame a cada 1–2 s, ou só quando houver movimento.
4. **Detecção:** YOLO sobre os frames → objetos com posição e confiança.
5. **Regras:** interpretam os objetos ao longo do tempo (ex.: portão aberto há mais de N
   minutos, carro parado em área proibida por mais de N minutos, criança em movimento
   rápido no estacionamento). Regras com duração precisam de estado temporal e **devem
   funcionar entre segmentos consecutivos** (evento que começa no fim de um segmento e
   termina no começo do próximo não pode ser quebrado em dois).
6. **Eventos:** salvar no banco com **horário real** = horário inicial do segmento +
   timestamp dentro do vídeo. O horário inicial vem do nome do arquivo, dos metadados ou é
   informado pelo síndico no envio (o arquivo nem sempre traz o horário real).
7. **Armazenamento:** guardar só **clipes dos eventos** (ex.: 10 s antes e depois),
   comprimidos com FFmpeg (H.264/H.265, CRF mais alto, resolução reduzida), e thumbnails.
   O restante é descartado.
8. **Retenção:** apagar o original após processar; apagar os clipes após X dias; manter
   eventos e thumbnails.
9. **Resumo do dia:** com o dia concluído, o Ollama gera o resumo a partir dos eventos.

### Regras transversais

- **Idempotência:** calcular hash do arquivo; se o mesmo arquivo/segmento for enviado de
  novo, não duplicar eventos.
- **LGPD:** vídeo de condomínio contém dados pessoais. Acesso restrito por perfil, retenção
  definida e, se possível, log de quem acessou clipes.
- **Erros:** falha em um segmento não derruba o dia; o segmento fica `failed` e pode ser
  reprocessado.

### Fonte de vídeo (preparar para a fase 2)

Isolar a entrada de vídeo atrás de uma interface (ex.: `VideoSource`). Hoje existe uma
implementação (`FileSource`: arquivo enviado / link baixado). Na fase 2 entra `RtspSource`
(RTSP/ONVIF/IP) sem alterar detecção, regras nem banco. Não implementar RTSP agora, só
manter a separação.

### Demo/MVP

Para demonstração, usar um trecho curto (10–30 min) de gravação real, mas com a estrutura
de lote por dia e segmentos já implementada, provando o fluxo completo sem horas de
processamento.

## Componentes ainda não implementados

FFmpeg (corte/compressão de clipe — hoje só o `ffprobe` para metadados), MinIO, Ollama e o
serviço Python de visão (**por último**; o detector simulado da Fatia C faz as vezes dele até
lá). O `docker-compose.yml` define o PostgreSQL e o Redis (API e worker rodam no host; MinIO e
Ollama entram nas fatias correspondentes). Socket.IO deixou de ser essencial: o front usa
**polling** (`hooks/usePolling.ts`).

Decisões tomadas (antes em aberto):

- Serviço de visão: **Python separado** (FastAPI + Ultralytics YOLO + OpenCV + FFmpeg), em
  container próprio; o worker Node o chama por HTTP, um segmento por chamada.
- Fila: **BullMQ + Redis** (1 job por segmento).
- Clipes e thumbnails: **MinIO (S3 compatível)**; `events.clipPath`/`thumbnailPath` guardam
  a object key. Vídeos originais/uploads temporários ficam em `storage/` só até processar.
- Upload: **multipart simples em streaming** (um `POST` por segmento, SHA-256 calculado no
  caminho). Upload retomável/em partes fica para depois, se necessário.
- Links: somente HTTPS e domínios da allowlist `ALLOWED_LINK_DOMAINS`; o download em
  streaming (com checagem de tamanho antes de baixar) é feito pelo worker.
- Worker: processo separado (`src/worker.ts`), 1 job BullMQ por segmento com `jobId =
segmentId` (enfileirar de novo é no-op). Retentativa com backoff exponencial; falha
  irrecuperável (link fora da allowlist, HTML, 4xx, tamanho, IP privado) não é retentada.
  `recoverSegments()` re-enfileira segmentos `received`/`processing` parados, cobrindo jobs
  perdidos (Redis fora no momento do `202`).

## Estrutura

- `frontend/` — dashboard React (Vite)
- `backend/` — API Node.js/Express + Prisma
- `docs/` — requisitos, arquitetura, data model, backlog

## Frontend (`frontend/`)

Stack: React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), `react-router-dom` v7,
`lucide-react`, TypeScript. Estado atual: autenticação (login, cadastro, recuperação e troca
de senha), dashboard, gestão de usuários e solicitações de acesso, cadastro/listagem de
câmeras e configurações (`src/pages/`); rotas em `src/App.tsx` com guardas
`RequireAuth`/`RequireManager`/`RequireAdmin`. Já integrado à API via `src/lib/api.ts`
(`apiFetch`/`apiRequest`, `apiUpload` com progresso via XHR; `http://localhost:8080/api`).

Telas de gravações (Fatia A): `/recordings` (lista de lotes com filtros e progresso por
segmento; gestor/admin cria via "Nova gravação") e `/recordings/:id` (segmentos, envio de
arquivo com progresso/cancelar ou de link, reprocessar). Leitura é liberada a todos os
papéis; escrita só gestor/admin (a API bloqueia com 403). As mensagens da API (em inglês) são
traduzidas em `lib/messages.ts`. Datas de lote (`RecordingDay.date`) chegam como meia-noite
UTC e devem ser formatadas em UTC (`formatDay`). O `ApiError` traz o `status` HTTP.

Tela de regras por câmera (Fatia B, refeita como assistente): `/cameras/:id/rules` (só
gestor/admin, aberta pelo botão "Regras e áreas" na tabela de câmeras). A página
(`pages/CameraRulesPage.tsx`) lista só os monitoramentos já configurados
(`components/MonitoringList.tsx`: frase em linguagem natural via `describeRule`, interruptor
Ativar/Desativar que faz `PUT` na hora reenviando `timeLimitSeconds`, "Editar" e aviso âmbar se
falta a área do tipo); "Adicionar monitoramento" abre o assistente (`components/RuleWizard.tsx`,
modal): O que monitorar → Onde (só tipos com área: envio da imagem de referência se faltar +
`PolygonEditor` com `fixedType`, "Continuar" exige ≥1 área do tipo) → Tempo (só tipos com
`requiresTimeLimit`) → Revisão ("Ativar agora" + "Concluir" faz o `PUT`). Passos que não se
aplicam são pulados; editar abre com o tipo travado. Áreas são criadas na hora no passo "Onde"
(cancelar não as desfaz); "Excluir" (lixeira, com `confirm`) chama `DELETE /cameras/:id/rules/:eventType`; `other` fica fora do assistente.
Imagem de referência (`apiUploadImage`): bytes buscados como Blob autenticado via
`apiFetchBlob` e exibidos com `URL.createObjectURL`, nunca `<img src="…">` direto (cookie em
`<img>` cross-origin). `PolygonEditor`: clique adiciona ponto em coordenadas normalizadas
[0,1], "Finalizar área" fecha; editar = apagar e redesenhar. Textos e exigências por tipo
(`lib/eventTypes.ts`) espelham `backend/src/lib/event-types.ts`.

Seção "Eventos" e faixa de avisos de cobertura na tela de gravações (Fatia C):
`pages/RecordingDetailPage.tsx` busca `GET /recording-days/:id/events` no mesmo ciclo do
`refresh()` (sem polling dedicado) e lista tipo/horário/confiança/status
(`components/StatusBadge.tsx` → `EventStatusBadge`), com um `<select>` que chama
`PATCH /events/:id` — liberado a qualquer papel, diferente do resto da tela. A faixa de avisos
(`day.coverage.issues`) usa o mesmo estilo âmbar/`AlertTriangle` do `MonitoringList`.
`components/AddSegmentForm.tsx` tenta `lib/infer-started-at.ts` ao escolher o arquivo e
pré-preenche "Horário de início" com um aviso (sempre editável).

Ainda não há **dashboard/histórico** reais (wireframes em `docs/wireframes/`; isso é a Fatia D
— a lista/seção de eventos da Fatia C é só dentro do detalhe de um lote), clipes visíveis nem
resumo do dia.

Lint: `react-hooks/set-state-in-effect` já acusa 5 erros antigos (`CamerasTable`,
`UsersTable`, `AccessRequestsPanel`, `GeneralSettingsPanel`); código novo deve buscar dados
no efeito com `.then` (setState só dentro do callback), como em `RecordingsPage`.

Comandos (rodar dentro de `frontend/`):

- `npm run dev` — servidor de desenvolvimento Vite
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — ESLint

## Backend (`backend/`)

Stack: Node.js + Express 5 (ESM), TypeScript, `tsx watch`. Segurança: `helmet`, `cors`,
`express-rate-limit`, `cookie-parser`, `bcryptjs`; validação com `zod`.

Estado atual: `src/server.ts` monta o app (helmet, cors, cookies, rate limit, tratamento de
`AppError`) e faz `listen`; as rotas ficam em `src/routes/main.ts` (prefixo `/api`) e
seguem Rota → Controller → Service. Existem auth (JWT em cookie), usuários (RBAC:
`requireAuth`/`requireManager`/`requireAdmin`), solicitações de acesso, condomínio, câmeras
(CRUD + imagem de referência) e regras/áreas por câmera (Fatia B). `src/lib/prisma.ts`
exporta um `PrismaClient` configurado com driver adapter.

Endpoints de câmera, regras e áreas (Fatia B; todos `requireAuth` + `requireManager`):

- `GET /api/cameras/:id` — detalhe de uma câmera (`hasReferenceImage`, sem expor o caminho).
- `POST /api/cameras/:id/reference-image` — multipart (campo `image`; JPEG/PNG/WebP, limite
  `MAX_REFERENCE_IMAGE_BYTES`), troca a imagem e apaga a anterior (sem sobra em
  `storage/camera-images/`). `GET /api/cameras/:id/reference-image` serve os bytes (404 se
  não houver).
- `GET /api/cameras/:id/rules` — regras já configuradas na câmera.
- `PUT /api/cameras/:id/rules/:eventType` — upsert `{timeLimitSeconds?, active?}` (uma regra
  por câmera+tipo, `Rule.@@unique([cameraId, eventType])`); a exigência de `timeLimitSeconds`
  depende do tipo (ver tabela em `docs/database.md` e `lib/event-types.ts`).
- `DELETE /api/cameras/:id/rules/:eventType` — delete físico (204; 404 se não existe) e
  refinaliza os lotes recentes, o que remove os eventos que a regra gerava; áreas ficam.
- `GET /api/cameras/:id/areas`, `POST /api/cameras/:id/areas` `{type, polygon}` (polígono em
  coordenadas normalizadas [0,1], 3–20 pontos), `PATCH /api/areas/:id`, `DELETE
/api/areas/:id` (delete físico — `Area` não tem `active`, não é referenciada por outra
  tabela).
- **Sem FK entre `Rule` e `Area`**: ligados só pelo `type` em comum, verificado no front (aviso,
  não bloqueia) e usado pela camada de regras na Fatia C.
- Tipos de evento novos desta fatia: `illegalParking` (carro em área `noParking`),
  `childRunning` (criança em área `parkingLot`), `petWaste` (dejeto fora de área `trash`).
  `abandonedObject` passou a exigir `timeLimitSeconds` (antes não exigia).

Endpoints de lote/segmento (Etapa 2). Cada segmento criado ou reprocessado é enfileirado
(`tryEnqueueSegment`) e processado pelo worker. Escrita exige `requireManager`; leitura, só `requireAuth`:

- `POST /api/recording-days` `{cameraId, date: "YYYY-MM-DD"}` — busca ou cria o lote (201/200).
- `GET /api/recording-days?cameraId&date&status` — lista lotes com `progress` por status.
- `GET /api/recording-days/:id` — lote + segmentos + `progress`.
- `GET /api/recording-days/:id/events` — eventos do dia, ordenados por horário real.
- `POST /api/recording-days/:id/segments/link` `{url, startedAt}` — valida https + allowlist (202).
- `POST /api/recording-days/:id/segments/upload` — multipart (`file` + `startedAt`), grava em
  streaming em `STORAGE_DIR/uploads/` e calcula SHA-256; arquivo repetido no lote devolve o
  segmento existente (200 em vez de 202).
- `POST /api/segments/:id/reprocess` — segmento `failed` **ou `completed`** volta a `received`
  (202); `completed` foi liberado na Fatia C para poder redetectar sem reenviar o arquivo
  (nova área marcada, fixture do detector simulado trocada). `received`/`processing` seguem
  bloqueados (já em andamento).
- `PATCH /api/events/:id` `{status: "pending"|"inProgress"|"resolved"}` — `requireAuth`
  (qualquer papel; é triagem operacional de alerta, não configuração de câmera).

`startedAt` é ISO 8601 **com offset** (ex.: `2026-09-20T08:00:00-03:00`). A resposta dos
segmentos não inclui `sourceRef` (para links é a URL, que pode ter token) nem `storagePath`.
`lib/compute-day-status.ts` deriva o status do lote a partir dos segmentos e
`refreshRecordingDayStatus` (`services/recording-day.service.ts`) o grava; a API e o worker
chamam essa função a cada mudança de status de segmento.

### Fila e worker (Etapa 3)

Fluxo do worker (`services/segment-processing.service.ts`): reivindica o segmento
(`received`/`processing` → `processing`, `attempts`+1) → se for link sem arquivo local,
baixa em streaming (`lib/download-file.ts`) para `STORAGE_DIR/uploads/<segmentId>` e grava
`fileHash`/`storagePath` → `processSegmentFile` (**stub** em `services/segment-processor.ts`,
ponto de plug da Etapa 4) → `completed` e recalcula o lote. Falha final (`attempts` esgotadas
ou irrecuperável) → `failed` com `error` curto e seguro (é visível a todo usuário
autenticado; detalhes só no log).

- Download seguro: cada salto (inclusive redirects, máx. 5) precisa ser https, estar na
  allowlist e resolver para IP público (`lib/is-private-ip.ts`; o IP validado é o usado na
  conexão, contra DNS rebinding). `Content-Length` é conferido antes de baixar e os bytes são
  contados durante o streaming. Resposta `text/html` é rejeitada.
- **Só links de download direto funcionam.** Links de compartilhamento do Google Drive
  (`/file/d/…/view`) devolvem HTML e falham; OneDrive exige `?download=1`. Se um redirect sair da
  allowlist (ex.: `*.googleusercontent.com`), inclua o domínio em `ALLOWED_LINK_DOMAINS`.
- Arquivo baixado com o mesmo hash de outro segmento do lote: o segmento fica `completed` com
  `error = "Duplicate of segment <id>, skipped"` e `fileHash` nulo, sem processar de novo.
- Os originais ainda **não** são apagados após processar (fica para as Etapas 4/6).
- O `bullmq` exige um cliente `ioredis` construído por nós (ESM): ver `src/queue/connection.ts`.
  O Redis sobe com `docker compose up -d redis` (na raiz do repo).

### Detecção simulada → eventos (Fatia C)

O passo "processar" (`services/segment-processor.ts`) deixou de ser stub: roda em dois passos.

- **Passo A — por segmento** (`services/segment-detection.service.ts`, chamado pelo worker):
  1. `lib/probe-video.ts` (ffprobe) grava `Segment.durationSec`/`metadataStartedAt`; se o
     horário do metadado divergir do informado por mais de `START_TIME_MISMATCH_MIN`, grava
     `Segment.warning` (aviso, não bloqueia; nunca falha o segmento).
  2. `lib/detector.ts#runDetector` (despachado por `DETECTOR`) devolve `Detection[]` (`label`,
     caixa normalizada, confiança, `timeSec`). Hoje só existe `simulated`
     (`services/simulated-detector.service.ts`): lê `storage/uploads/<segmentId>.json`
     (mesmo nome-base do vídeo); sem arquivo → `[]` (sem detecções, seguro para uploads reais
     sem fixture). Formato de referência em `backend/fixtures/example-detections.json`. Para
     testar manualmente: enviar o segmento, anotar o id devolvido pela API, gravar o JSON
     nesse caminho e **reprocessar o segmento** (`POST /segments/:id/reprocess`, funciona em
     `completed` desde esta fatia) para rodar a detecção com a fixture.
  3. Cada detecção é resolvida em 0+ candidatos de tipo de evento (`lib/event-types.ts` →
     `detectionLabel`/`containment`, casando o rótulo e testando o centro da caixa contra as
     `Area`s da câmera **no momento do processamento** — `lib/point-in-polygon.ts`), depois
     agrupada e fundida em `DetectionInterval` por tolerância (`DETECTION_GAP_TOLERANCE_SEC`).
     Reprocessar um segmento substitui só os intervalos dele (idempotente).
- **Passo B — finalização do lote** (`services/recording-day-finalization.service.ts`,
  `finalizeRecordingDay`): funde intervalos de segmentos **contíguos**
  (`lib/compute-coverage.ts#segmentsAreContiguous`, mesma tolerância `SEGMENT_GAP_TOLERANCE_SEC`
  usada nos avisos de cobertura) do mesmo tipo, aplica o `timeLimitSeconds` da `Rule` ativa
  correspondente, e grava `Event` por upsert manual em `(cameraId, type, occurredAt)` — uma
  atualização nunca toca `status` (preserva o que o usuário já definiu); cria um `Alert` só na
  criação; remove eventos de uma finalização anterior que não aparecem mais (regra desativada,
  intervalos mudaram). Roda **inline** (sem fila — é só banco/CPU), chamada por
  `refreshRecordingDayStatus` quando o lote vira `completed`/`partial`, e por
  `rule.service.ts#upsertRule` (até 20 lotes mais recentes da câmera) depois de salvar uma
  regra — mudar regra não exige reprocessar vídeo; mudar área, exige (contenção é do Passo A).
- **Limitações conhecidas**: `abandonedObject` não rastreia objeto individual (câmera inteira,
  qualquer detecção `object`) — tracking de verdade é da Fatia G. `EventType.other` nunca é
  gerado automaticamente (sem `detectionLabel`).

Variáveis de ambiente novas (`backend/.env`, não versionado):

- `STORAGE_DIR` — raiz de `uploads/` e `tmp/` (default `storage`, relativo ao `backend/`).
- `ALLOWED_LINK_DOMAINS` — domínios aceitos em links, separados por vírgula (igualdade ou
  subdomínio); vazio = nenhum link aceito. Ex.: `drive.google.com,onedrive.live.com,1drv.ms`.
- `MAX_SEGMENT_SIZE_BYTES` — tamanho máximo de um upload ou download (default 5 GiB); acima
  disso, 413 (upload) ou falha do segmento (link).
- `MAX_REFERENCE_IMAGE_BYTES` — tamanho máximo da imagem de referência da câmera (default 8 MiB); acima disso, 413.
- `REDIS_URL` — Redis do BullMQ (default `redis://localhost:6379`).
- `DETECTOR` — `simulated` (default) ou `python` (Fatia G, ainda não implementado).
- `DETECTION_GAP_TOLERANCE_SEC` — tolerância para fundir detecções cruas num intervalo, dentro
  de um mesmo segmento (default 3s).
- `SEGMENT_GAP_TOLERANCE_SEC` — tolerância de contiguidade entre segmentos (default 5s), usada
  tanto nos avisos de cobertura quanto para decidir se um evento pode atravessar a borda.
- `START_TIME_MISMATCH_MIN` — divergência (minutos) entre o horário informado e o do metadado
  do arquivo que dispara `Segment.warning` (default 5).
- Opcionais, com default no código: `WORKER_CONCURRENCY` (1), `SEGMENT_MAX_ATTEMPTS` (3) e
  `SEGMENT_RETRY_BACKOFF_MS` (30000) — estes dois são lidos por **quem enfileira** (API e
  worker devem usar o mesmo `.env`) —, `RECOVERY_INTERVAL_MS` (5 min), `STALE_PROCESSING_MS`
  (30 min), `DOWNLOAD_CONNECT_TIMEOUT_MS` (15 s) e `DOWNLOAD_IDLE_TIMEOUT_MS` (60 s).

Comandos (rodar dentro de `backend/`):

- `npm run dev` — `tsx watch --env-file=.env src/server.ts`
- `npm run worker` — worker da fila (`tsx watch --env-file=.env src/worker.ts`); `npm run
start:worker` roda sem watch. Precisa do Redis no ar.

### Prisma (ORM v7)

- Cliente: `@prisma/client` v7 com **driver adapter obrigatório** — `PrismaPg`
  (`@prisma/adapter-pg`) sobre `DATABASE_URL`. Ver `src/lib/prisma.ts`; importar o client
  daí, não instanciar `PrismaClient` avulso.
- Generator `prisma-client` (novo, sem engine) → saída em `backend/generated/prisma/`
  (gitignored; rodar `npx prisma generate` após clonar ou mudar o schema).
- Config em `backend/prisma7.config.ts` (equivale ao `prisma.config.ts` padrão; carrega
  `.env` via `dotenv/config`).
- Schema em `backend/prisma/schema.prisma`, sintaxe nova do Prisma (`id uuid()`,
  `enum(...)`). Models: `User`, `Request`, `Condominium`, `Camera`, `Area`, `Rule`, `Event`,
  `Alert`, `DailySummary`, `RecordingDay`, `Segment`, `DetectionInterval` (PK UUID). Migrations
  em `backend/prisma/migrations/` (aplicar com `npx prisma migrate deploy`). O data model está
  em `docs/database.md`. Os valores dos enums são em minúsculas (`received`, `completed`, ...).
- **Modelo do novo fluxo** (já aplicado):
  - `RecordingDay`: `cameraId`, `date`, `status` (`pending`/`processing`/`completed`/
    `partial`/`failed`), `createdBy`, timestamps. Única por (`cameraId`, `date`).
  - `Segment`: `recordingDayId`, `sourceType` (`upload`/`link`), `sourceRef` (URL do link ou
    nome original do arquivo), `storagePath` (arquivo local, relativo a `STORAGE_DIR`),
    `fileHash` (idempotência; única por lote), `startedAt` (horário real de início),
    `durationSec`, `metadataStartedAt`/`warning` (ffprobe, Fatia C), `status`
    (`received`/`processing`/`completed`/`failed`), `attempts`, `error`.
  - `DetectionInterval` (Fatia C): `segmentId`, `eventType`, `startSec`/`endSec`,
    `touchesStart`/`touchesEnd`, `maxConfidence` — saída do Passo A, consumida só pela
    finalização (Passo B) do mesmo lote; apagada e recriada a cada (re)processamento do segmento.
  - `Event`: `status` (`pending`/`inProgress`/`resolved`, Fatia C), `segmentId`, `occurredAt`
    (horário real), `confidence`, `thumbnailPath`, `clipPath` (todos nullable);
    `startedAt`/`endedAt` continuam os limites do evento — nos eventos automáticos,
    `startedAt === occurredAt`. `@@unique([cameraId, type, occurredAt])` é a chave de upsert da
    finalização.
  - `Alert`: `onDelete: Cascade` na FK para `Event` (Fatia C) — apagar um evento obsoleto na
    finalização apaga o alerta junto.
  - `DailySummary`: `recordingDayId` (nullable, único); gerado quando o `RecordingDay` fica
    `completed`.
- Comandos: `npx prisma generate`, `npx prisma migrate dev --name <nome>`,
  `npx prisma studio` (rodar dentro de `backend/`).
- **Checkpoint de segurança da IA**: o Prisma bloqueia comandos destrutivos
  (`migrate reset`, `db push --force-reset`, `db push --accept-data-loss`) quando detecta
  um agente. Explicar o impacto de perda de dados e pedir consentimento explícito antes.
- Há skills do Prisma instaladas em `backend/.claude/skills/` (escopo: arquivos sob
  `backend/`) — usá-las para dúvidas de CLI/queries do Prisma.

### Padrão de Arquitetura do Backend

- As implementações do backend devem sempre seguir, por preferência e convenção do projeto, o fluxo estrutural: **Rota → Controller → Service**.
- Trabalho pesado (download, FFmpeg, detecção) **não roda dentro da requisição**: o
  Service enfileira o job e responde; o worker executa em segundo plano.

## Docs a atualizar

Ao implementar, manter `docs/` coerente com esta mudança: `arquitetura.md` (fluxo por
arquivo/lote, fonte de vídeo como interface, tempo real na fase 2), `database.md` (novas
tabelas e campos), `requisitos.md` (upload/link, lote do dia, retenção, LGPD) e
`backlog.md` (itens novos e fase 2).

## Como trabalhar neste projeto (instruções para o Claude Code)

- Antes de editar, explorar o código e **propor um plano em etapas**; implementar **uma
  etapa por vez** e parar para revisão.
- **Roteiro atual** (Python/visão por último; trabalho por fatia, backend + frontend juntos, uma
  fatia por vez com revisão): Etapas 1–3 prontas (modelo, endpoints, fila/worker).
  - **A** — envio de gravações e lotes (front) — _feita_.
  - **B** — regras e áreas: CRUD completo, novos tipos de evento (carro parado, criança
    correndo, dejeto de animal), imagem de referência da câmera e editor de polígonos —
    _feita_.
  - **C** — detecção simulada → eventos: contrato `Detector`, detector simulado por JSON,
    intervalos por segmento, fusão entre segmentos, eventos, alertas, `Event.status`
    (`pending`/`inProgress`/`resolved`), ffprobe (`ffmpeg-static`/`ffprobe-static`), sugestão
    de horário do segmento pelo nome do arquivo e avisos de lacuna/sobreposição na cobertura
    do dia — _feita_.
  - **D** — dashboard e histórico (wireframes em `docs/wireframes/`).
  - **E** — clipes/thumbnails (FFmpeg), MinIO, retenção e log de acesso (LGPD).
  - **F** — resumo do dia com Ollama.
  - **G** (última) — serviço Python de visão implementando o contrato `Detector`.
- Sem o Python, a detecção é **simulada** a partir de JSON, atrás do mesmo contrato que o Python
  implementará (trocar = variável de ambiente). A fusão de eventos entre segmentos é feita numa
  etapa de finalização do lote (independe da ordem de upload); os originais só são apagados
  depois dela.
- Não implementar RTSP/tempo real agora.
- Rate limit global da API: 1500 req/15 min por IP (o polling do front consome uma parte).

## Convenções

- Commits no estilo Conventional Commits (`feat:`, `fix:`, ...).
- `.env` nunca versionado.
- Vídeos, clipes e uploads temporários ficam fora do git (`storage/` e `tmp/` já estão no
  `.gitignore`).
