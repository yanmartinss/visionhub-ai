# Arquitetura — VisionHub AI

## Decisão de arquitetura: processamento de gravações em lote

Acessar câmeras de condomínio em tempo real é inviável no MVP: elas ficam em DVR/NVR fechado, com driver proprietário e rede restrita, e exigiria liberação do síndico e da empresa de segurança. **O MVP processa arquivos de gravação, em lote**, enviados pelo síndico (upload ou link). O vídeo é analisado, os eventos do dia são montados e salvos no banco, e o vídeo é comprimido/descartado para não estourar o armazenamento.

**Tempo real (RTSP/ONVIF/IP/driver da câmera) fica como fase 2**, plugado como um novo adaptador de fonte de vídeo, sem alterar detecção, regras nem banco (ver [Fonte de vídeo](#fonte-de-vídeo)).

## Visão geral

O VisionHub AI segue um fluxo do arquivo de vídeo até o alerta entregue ao usuário:

```
Síndico envia arquivo/link
   → Backend cria o lote do dia (1 câmera + 1 dia)
   → Fila de jobs (1 job por segmento) — BullMQ + Redis
   → Serviço de visão (extração de frames + YOLO + OpenCV)
   → Camada de regras de negócio (interpretação do evento)
   → PostgreSQL (eventos) + MinIO (clipes e thumbnails)
   → Dashboard (React)
   → Dia concluído: Ollama gera o resumo em linguagem natural
```

## Unidade de trabalho: lote do dia

**1 câmera + 1 dia = 1 lote** (`recordingDays`). Um lote é composto por vários **segmentos** (`segments`): DVRs exportam em pedaços de 15 min a 1 h, e o dia inteiro raramente vem em um arquivo só. Cada segmento é um job independente (progresso, retentativa só do pedaço que falhou, paralelismo). O dia fica `completed` quando todos os segmentos terminarem.

Ordem de grandeza: câmera 1080p grava ~10 a 40 GB/dia. Por isso: nunca carregar o vídeo inteiro na memória, processar em streaming e apagar o original logo após processar.

Status:

- Segmento: `received` → `processing` → `completed` | `failed` (com contagem de tentativas).
- Lote: `pending` → `processing` → `completed` | `partial` (alguns segmentos falharam) | `failed`.

**Cobertura do dia:** com a duração real de cada segmento (ffprobe), a API confere se os segmentos do lote se encaixam
sem buraco nem sobreposição (tolerância curta, poucos segundos) e devolve os avisos no detalhe do lote — não bloqueia o
envio. A mesma checagem de contiguidade decide se um evento pode atravessar a borda entre dois segmentos na fusão
(abaixo); segmento sem duração conhecida nunca é fundido/cruzado.

## Fluxo de processamento

1. **Entrada:** upload direto (preferir upload em partes/retomável para arquivos grandes) ou **link** (Drive, OneDrive, servidor do condomínio). No link, o servidor baixa em streaming, validando domínio permitido e tamanho antes de baixar.
2. **Fila:** a requisição responde rápido (`202`) e o trabalho roda em segundo plano, em um worker separado da API.
3. **Pré-processamento:** FFmpeg converte formatos proprietários do DVR na entrada; extrai ~1 frame a cada 1–2 s, ou só quando houver movimento.
4. **Detecção:** YOLO sobre os frames → objetos com posição e confiança.
5. **Regras:** interpretam os objetos ao longo do tempo (ex.: portão aberto há mais de N minutos, carro parado em área proibida por mais de N minutos, criança em movimento rápido no estacionamento). Regras com duração precisam de estado temporal e **funcionam entre segmentos consecutivos**: um evento que começa no fim de um segmento e termina no começo do próximo não pode ser quebrado em dois.
6. **Eventos:** salvos no banco com **horário real** = horário inicial do segmento + timestamp dentro do vídeo. O horário inicial vem do nome do arquivo, dos metadados ou é informado pelo síndico no envio (o arquivo nem sempre traz o horário real).
7. **Armazenamento:** só **clipes dos eventos** (ex.: 10 s antes e depois), comprimidos com FFmpeg (H.264/H.265, CRF mais alto, resolução reduzida), e thumbnails, no MinIO. O restante é descartado.
8. **Retenção:** apagar o original após processar; apagar os clipes após X dias; manter eventos e thumbnails.
9. **Resumo do dia:** com o dia concluído, o Ollama gera o resumo a partir dos eventos.

## Componentes

### 1. Serviço de visão computacional (Python)

- Serviço separado (FastAPI) com **YOLO (Ultralytics)**, **OpenCV** e **FFmpeg**, em container próprio. O worker Node o chama por HTTP, um segmento por chamada.
- **YOLO**: apenas detecta objetos na cena (pessoas, portões, veículos, animais, objetos).
- **OpenCV/FFmpeg**: extração de frames, recorte de região de interesse, tracking simples.
- Este componente **não decide** se algo é um evento relevante — apenas identifica "o que" está na cena.

### 2. Camada de regras de negócio

- Recebe as detecções e aplica as regras específicas do domínio condominial, por exemplo:
  - Portão da entrada aberto há mais de X minutos → evento "portão aberto".
  - Carro estacionado em local inapropriado por mais de Y minutos → evento correspondente.
  - Pessoa em região marcada como restrita → evento "acesso a área restrita".
  - Criança correndo no estacionamento → evento correspondente.
  - Necessidades de animais não despejadas na lixeira adequada → evento correspondente.
  - Objeto estático sem dono aparente por mais de Z minutos → evento "objeto abandonado".
- É essa camada — e não o YOLO — que decide o que é um "evento". Isso mantém a detecção genérica e as regras isoladas e fáceis de estender.
- Mantém estado temporal persistido entre segmentos consecutivos do mesmo lote.

### 3. Backend (Node.js/Express)

- API REST (Rota → Controller → Service) para configuração (câmeras, áreas, regras), criação de lotes, recebimento de segmentos, consulta de status/progresso e eventos.
- Trabalho pesado (download, FFmpeg, detecção) **não roda dentro da requisição**: o Service enfileira o job e responde; o worker executa em segundo plano.
- Worker (BullMQ) consome a fila, chama o serviço de visão, aplica as regras, persiste eventos e atualiza o status do segmento e do lote.
- Orquestra a chamada ao modelo de linguagem para gerar o resumo do dia.

Endpoints de lote/segmento (prefixo `/api`; escrita só para gestores, leitura para usuários autenticados):

| Rota                                              | Função                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `POST /recording-days`                            | busca ou cria o lote (câmera + dia)                                                          |
| `GET /recording-days` · `GET /recording-days/:id` | lista lotes / detalha lote com segmentos e progresso                                         |
| `GET /recording-days/:id/events`                  | eventos do dia, por horário real                                                             |
| `POST /recording-days/:id/segments/link`          | anexa segmento por link (https + domínios permitidos)                                        |
| `POST /recording-days/:id/segments/upload`        | anexa segmento por upload multipart em streaming (hash SHA-256; reenvio não duplica)         |
| `POST /segments/:id/reprocess`                    | reprocessa um segmento `failed` ou `completed` (redetecta sem reenviar o arquivo)            |
| `PATCH /events/:id`                               | muda o status de um evento (`pending`/`inProgress`/`resolved`/`falsePositive`; qualquer usuário autenticado) |
| `GET /recording-days/:id/summary`                 | resumo do dia em linguagem natural (404 = ainda não gerado)                                  |

Endpoints de dashboard e histórico (somente leitura, qualquer usuário autenticado; formato completo em
`docs/agentes/README.md` §3.3). As datas são a **data do lote** (`RecordingDay.date`), não o horário do evento:
sem conversão de fuso e coerente com a tela de gravações.

| Rota                     | Função                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /dashboard?date`    | painel do dia (padrão: hoje em `America/Sao_Paulo`): contadores por tipo/status, total do dia anterior, eventos em aberto, câmeras, lotes e últimos eventos |
| `GET /events`            | histórico paginado; filtros `from`/`to` (data do lote), `type`, `cameraId`, `status`; `page`/`pageSize`                                                 |
| `GET /events/:id`        | detalhe "por que este evento": rótulo do detector, contenção, regra e áreas atuais do tipo, duração, confiança, segmento e posição no vídeo             |

Endpoints de mídia e métricas (somente leitura, `requireAuth`, exceto onde indicado):

| Rota                                  | Função                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `GET /events/:id/clip`                | bytes do clipe (`video/mp4`); cada acesso é registrado em `mediaAccessLogs` (LGPD); `404` se ainda não gerado ou expirado     |
| `GET /events/:id/thumbnail`           | bytes da miniatura (`image/jpeg`)                                                                                            |
| `GET /stats/accuracy` (**admin**)     | precisão por tipo de evento: `resolved / (resolved + falsePositive)`, a partir da triagem feita pelos usuários (US34)         |

### 4. Fila (BullMQ + Redis)

- 1 job por segmento (`jobId = segmentId`, então enfileirar duas vezes é no-op); retentativa com backoff exponencial; `attempts` e `error` persistidos no segmento.
- Falha em um segmento não derruba o dia: o segmento fica `failed` e pode ser reprocessado.
- O **worker** é um processo separado da API (`npm run worker`). Ele reivindica o segmento, baixa o link (se for o caso), executa o processamento e atualiza o status do segmento e do lote. Falhas irrecuperáveis (link fora da allowlist, resposta HTML, 4xx, tamanho excedido, IP privado) não são retentadas.
- **Recuperação:** se o Redis estiver fora quando o segmento é criado, a API ainda responde `202` e o segmento fica `received`; o worker re-enfileira segmentos `received` e `processing` parados ao iniciar e a cada intervalo.
- **Download de link:** somente https, domínio na allowlist, cada redirecionamento revalidado e destino resolvendo para IP público (proteção contra SSRF/DNS rebinding); tamanho conferido antes e durante o download; funciona apenas com links de download direto (links de compartilhamento que devolvem HTML são rejeitados).
- Conteúdo duplicado (mesmo hash já existente no lote) é detectado após o download: o segmento é concluído sem reprocessar, para não duplicar eventos.
- Detecção atrás de um contrato `Detector` (por frame: rótulo, caixa normalizada, confiança, tempo no vídeo), selecionado
  por variável de ambiente. Hoje só existe o **detector simulado**: lê as detecções de um JSON por segmento
  (`storage/uploads/<segmentId>.json`); sem arquivo, nenhuma detecção (seguro para uploads reais). O serviço Python de
  visão (YOLO) implementa o mesmo contrato por último.
- Cada detecção crua vira 0+ candidatos de tipo de evento (rótulo bate com o exigido pelo tipo e, se o tipo precisar de
  área, o centro da caixa está dentro/fora — conforme o tipo — de uma área da câmera do tipo certo, testada com as áreas
  configuradas **no momento do processamento**). Candidatos do mesmo tipo, próximos no tempo, são fundidos num
  intervalo por segmento (tolerância curta, dentro do próprio segmento).
- Ao final do lote (todos os segmentos `completed`/`failed`), uma **finalização** funde os intervalos de segmentos
  **contíguos** (mesma tolerância dos avisos de cobertura, abaixo) do mesmo tipo, aplica o tempo limite da regra ativa
  da câmera, e grava/atualiza o evento — sem duplicar em reprocessamentos e sem apagar o status que o usuário já tiver
  definido. Roda inline (sem fila: é só banco/CPU), disparada quando o lote termina ou quando uma regra é salva.

### 5. Armazenamento de objetos (MinIO)

- Compatível com S3. Guarda clipes comprimidos e thumbnails dos eventos; `events.clipPath` e `events.thumbnailPath` guardam a _object key_.
- Vídeos originais e uploads temporários ficam em disco local (`storage/`, fora do git) só até serem processados; o original é apagado depois da finalização do lote e dos clipes.
- **Clipes e thumbnails** são gerados por uma fila própria (`media-queue`, FFmpeg) **depois** da finalização do lote: H.264 sem áudio, até 480p, janela de 10 s antes/depois do evento. O evento aparece antes da mídia (`hasClip`/`hasThumbnail` falsos por alguns instantes).
- **Retenção:** um job periódico apaga os clipes após `CLIP_RETENTION_DAYS` (padrão 30; 0 desliga) e varre objetos órfãos; eventos e thumbnails permanecem.
- **LGPD:** só o acesso ao clipe é registrado (`mediaAccessLogs`: quem e quando). Reprocessar um segmento de upload cujo original já foi apagado exige reenviar o mesmo arquivo (`409` caso contrário); segmentos de link são baixados de novo.

### 6. Geração de linguagem natural (Ollama)

- Roda localmente (Llama, Gemma ou Qwen).
- Disparada, sem `await`, quando o lote fica `completed` **ou `partial`** (em `partial` o texto avisa da cobertura incompleta) e a cada refinalização (upsert em `dailySummaries`). Os fatos (tipos, horários, durações, status) são montados pelo código; o modelo só redige. Dia sem eventos recebe texto fixo, sem chamar o modelo. Recebe a lista de eventos técnicos do dia e produz um texto em linguagem natural, por exemplo:
  > "Durante o dia foram detectados dois episódios em que o portão principal permaneceu aberto por mais de três minutos, um carro estacionado por tempo excessivo na área de manobra e nenhum acesso à área restrita."

### 7. Notificações por e-mail (US37)

- `lib/mailer.ts` (nodemailer/SMTP) e `services/notification.service.ts`. Sem SMTP configurado, só há log. Falha de envio nunca afeta o lote (disparo sem `await`).
- Destinatários: usuários **ativos** com perfil gestor ou administrador (um condomínio no MVP), em cópia oculta.
- **Resumo do dia:** enviado uma vez por lote, depois que o texto é salvo (`dailySummaries.emailedAt` evita duplicar em refinalizações; se o envio falhar, tenta de novo na próxima).
- **Alerta grave:** `childRunning`, `restrictedArea` e `occupancy`, enviado uma vez, na **criação** do evento (atualizações na refinalização não reenviam). Os demais tipos aparecem só no resumo.
- Conteúdo mínimo: tipo, câmera, horário e link para o sistema; sem imagem, clipe nem dados pessoais.

### 8. Frontend (React + Vite + Tailwind)

- Envio de gravação (upload/link, câmera, data, horário inicial).
- Lista de lotes do dia com status e progresso por segmento (via polling; Socket.IO opcional só para progresso).
- Timeline de eventos do dia com thumbnail/clipe; histórico com filtros (data, tipo, câmera, status).
- Resumo do dia gerado por IA.
- Configuração de regras (tempo máximo de portão aberto, áreas restritas etc.).

### 9. Infraestrutura

- Cada componente roda em um container: frontend, backend (API), worker, serviço de visão, PostgreSQL, Redis, MinIO e Ollama.
- Orquestrado via Docker Compose. O `docker-compose.yml` define PostgreSQL, Redis, MinIO, Ollama e o serviço de visão (`vision/`, Python); a API e o worker rodam no host. `DETECTOR=simulated` continua o padrão; `DETECTOR=python` + `VISION_URL` usa o serviço de visão.

## Fonte de vídeo

A entrada de vídeo fica isolada atrás de uma interface (`VideoSource`). Hoje existe uma implementação: `FileSource` (arquivo enviado / link baixado). Na fase 2 entra `RtspSource` (RTSP/ONVIF/IP) sem alterar detecção, regras nem banco. RTSP **não** é implementado no MVP; só se mantém a separação.

## Regras transversais

- **Idempotência:** hash do arquivo; se o mesmo arquivo/segmento for reenviado, não duplicar eventos.
- **LGPD:** vídeo de condomínio contém dados pessoais. Acesso restrito por perfil, retenção definida e, se possível, log de quem acessou clipes.
- **Erros:** falha em um segmento não derruba o dia; o segmento fica `failed` e pode ser reprocessado.

## Por que modular

Cada novo módulo (idosos, obras, indústrias, estacionamentos, Smart Cities) reaproveita os mesmos blocos — fonte de vídeo, detecção, regras de negócio e comunicação — mudando apenas:

1. As regras de negócio (o que conta como evento no domínio).
2. Os tipos de evento armazenados e exibidos no dashboard.

A camada de detecção (YOLO/OpenCV), a fila de processamento e a geração de linguagem natural (Ollama) permanecem as mesmas.

## Demo/MVP

Para demonstração, usa-se um trecho curto (10–30 min) de gravação real, com a estrutura de lote por dia e segmentos já implementada, provando o fluxo completo sem horas de processamento.

## Diagrama (exemplo simplificado)

```
[Síndico] --arquivo/link--> [API: cria lote/segmento] --job--> [Fila BullMQ]
                                                                    |
                                                                    v
                                              [Worker] --frames--> [Visão: YOLO/OpenCV]
                                                                    |
                                                                detecções
                                                                    v
                                                         [Regras de Negócio]
                                                                    |
                                                          evento relevante?
                                                             /          \
                                                          não            sim
                                                           |              |
                                                      (descarta)   [Salva evento no PostgreSQL
                                                                    + clipe/thumbnail no MinIO]
                                                                          |
                                                        +-----------------+-----------------+
                                                        |                                   |
                                                [Dashboard (polling)]        [Lote completed → Ollama gera resumo]
```
