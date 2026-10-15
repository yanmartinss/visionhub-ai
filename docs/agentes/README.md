# Divisão de agentes — VisionHub AI

Documento **fixo** que separa o que falta no projeto entre três agentes que trabalham em
paralelo: **backend**, **frontend** e **IA local**. Cada agente lê primeiro o
[`CLAUDE.md`](../../CLAUDE.md) (estado real do projeto) e depois este arquivo.

Os subagentes do Claude Code ficam em `.claude/agents/` (`backend`, `frontend`, `ia-local`) e
apontam para cá. Mudou a divisão? Mude **aqui**; os subagentes só repetem as fronteiras.

## 1. Regras gerais

- Uma fatia por vez por agente: explorar, **propor um plano em etapas**, implementar uma etapa e
  parar para revisão.
- Backend segue **Rota → Controller → Service**; trabalho pesado vai para o worker, nunca para a
  requisição.
- Commits em Conventional Commits (`feat:`, `fix:`, `docs:`…), um commit por etapa.
- **Não editar arquivo de outro agente.** Precisa de algo do outro lado? Registre em
  [Pedidos entre agentes](#6-pedidos-entre-agentes) e siga com um mock/stub do seu lado.
- Arquivos compartilhados (seção 2) só mudam com o pedido registrado e aceito.
- Fora de escopo para todos: ver [seção 7](#7-fora-de-escopo).

## 2. Mapa de propriedade

| Agente       | É dono de                                                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | `backend/src/**` (exceto os arquivos da IA abaixo); `backend/prisma/**` — **dono único** do schema e das migrations; `docker-compose.yml` (serviços `db`, `redis`, `minio`); `docs/database.md`, `docs/arquitetura.md`, `docs/requisitos.md`                                                                  |
| **Frontend** | `frontend/**`; `docs/wireframes/`                                                                                                                                                                                                                                                                             |
| **IA local** | `vision/` (_a criar_: serviço Python); no backend, só `src/lib/detector.ts` (ramo `python`), `src/services/python-detector.service.ts` (_a criar_), `src/lib/ollama.ts` (_a criar_), `src/services/daily-summary.service.ts` (_a criar_); no `docker-compose.yml`, só o bloco dos serviços `ollama` e `vision` |

**Compartilhados** (mudança combinada, registrada na seção 6):

- `backend/src/routes/main.ts` — backend é o dono; IA pede a rota do resumo.
- `backend/src/lib/event-types.ts` ↔ `frontend/src/lib/eventTypes.ts` — um espelha o outro;
  quem mudar um tipo de evento avisa o outro lado. Os `detectionLabel` são contrato com a IA.
- `backend/prisma/schema.prisma` — IA e frontend **pedem** campos; só o backend altera e migra.
- `CLAUDE.md`, `docs/backlog.md`, este arquivo — cada agente atualiza só a parte da própria fatia.

## 3. Contratos entre agentes

### 3.1 Detector (IA local ↔ backend)

O contrato já existe em `backend/src/lib/detector.ts`:

```ts
type Detection = {
  label: string; // ver lista abaixo
  box: { x: number; y: number; width: number; height: number }; // normalizada [0,1], origem no topo-esquerdo
  confidence: number; // 0..1
  timeSec: number; // offset dentro do vídeo do segmento, >= 0
};
type Detector = (input: { segmentId: string; filePath: string }) => Promise<Detection[]>;
```

- Labels reconhecidos (`detectionLabel` em `lib/event-types.ts`): `gate_open`, `person`,
  `object`, `car`, `child_running`, `pet_waste`. Label desconhecido é ignorado. `gate_open`,
  `child_running` e `pet_waste` **não** são classes COCO: o serviço Python precisa derivá-los
  (modelo treinado, heurística sobre `person`/movimento, etc.) — decisão do agente de IA.
- Serviço Python (HTTP), chamado pelo worker, **um segmento por chamada**:
  - `POST /detect` `{ "segmentId": "...", "filePath": "uploads/<segmentId>" }` →
    `{ "detections": Detection[] }`. `filePath` é **relativo a `STORAGE_DIR`**; o container monta o
    mesmo diretório.
  - `GET /health` → `{ "status": "ok", "model": "..." }`.
- Troca do detector: `DETECTOR=python` + `VISION_URL` (ex.: `http://localhost:8000`). O
  `simulated` continua sendo o default até a Fatia G ser aprovada.
- Erro do serviço = exceção no `Detector` → o segmento segue o fluxo normal de retentativa.

### 3.2 Resumo do dia (IA local ↔ backend)

- `generateDailySummary(recordingDayId: string): Promise<void>` em
  `services/daily-summary.service.ts`: lê os eventos do lote, chama o Ollama e faz upsert em
  `DailySummary` (`recordingDayId` único).
- Disparo: o backend chama depois de `finalizeRecordingDay` quando o lote fica `completed`
  (sem bloquear e sem derrubar o lote se o Ollama estiver fora — só log).
- Env: `OLLAMA_URL` (default `http://localhost:11434`), `OLLAMA_MODEL`.
- Leitura pelo front: `GET /api/recording-days/:id/summary` → `{ generatedText, createdAt }` ou 404.

### 3.3 API para o frontend (backend → frontend)

O backend registra o formato de cada endpoint **aqui, antes de implementar**; o front pode
começar com mock no mesmo formato.

| Endpoint (proposta)                        | Fatia | Uso no front                                         |
| ------------------------------------------ | ----- | ---------------------------------------------------- |
| `GET /api/dashboard?date=YYYY-MM-DD`       | D     | contadores por tipo/status, lotes do dia, últimos eventos |
| `GET /api/events?from&to&type&cameraId&status&page` | D | histórico paginado com filtros                      |
| `GET /api/events/:id`                      | D/US33 | detalhe "por que este evento" (área, regra, duração, confiança) |
| `GET /api/events/:id/clip`, `/thumbnail`   | E     | bytes via `apiFetchBlob` (nunca `<img src>` direto)  |
| `GET /api/recording-days/:id/summary`      | F     | resumo do dia no detalhe do lote / dashboard         |
| `GET /api/stats/accuracy`                  | US34  | precisão por tipo de evento                          |

## 4. O que falta, por agente

### Backend

- [ ] **D** — endpoints de dashboard e histórico (US05, US06) e detalhe do evento (US33).
- [ ] **E** — FFmpeg: corte do clipe (10 s antes/depois) comprimido + thumbnail; MinIO no
      compose e cliente S3 (`clipPath`/`thumbnailPath` = object key); apagar o original após a
      finalização; retenção dos clipes após X dias; log de acesso aos clipes (LGPD) (US20–US23).
- [ ] Disparar `generateDailySummary` ao concluir o lote (gancho da Fatia F).
- [ ] US34 — métricas de precisão (eventos marcados como falso positivo, por tipo).
- [ ] US37 — e-mail do resumo e de alertas graves via `lib/mailer.ts`.
- [ ] Manter `docs/arquitetura.md`, `docs/database.md`, `docs/requisitos.md` coerentes.

### Frontend

- [ ] **D** — dashboard real e histórico de eventos conforme `docs/wireframes/` (US05, US06).
- [ ] Timeline do dia com thumbnail e clipe (US20) — depende da Fatia E.
- [ ] Exibir o resumo do dia (US08) — depende da Fatia F.
- [ ] "Por que este evento foi gerado" (US33) e tela de precisão (US34).
- [ ] Manter o padrão atual: polling (`hooks/usePolling.ts`), mensagens em `lib/messages.ts`,
      datas de lote em UTC, busca de dados no efeito com `.then` (regra de lint).

### IA local

- [ ] **F** — serviço `ollama` no compose, `lib/ollama.ts`, prompt em pt-BR a partir dos eventos
      do dia (tipos, horários, status), `daily-summary.service.ts` gravando `DailySummary` (US08).
- [ ] **G** — serviço `vision/` (FastAPI + Ultralytics YOLO + OpenCV + FFmpeg, Dockerfile
      próprio): amostrar ~1 frame a cada 1–2 s em streaming (nunca carregar o vídeo inteiro),
      rodar YOLO, mapear classes → labels do contrato (3.1), devolver `Detection[]`.
- [ ] **G** — `python-detector.service.ts` + ramo `python` em `lib/detector.ts`.
- [ ] **G** — validar com o trecho de demo (10–30 min de gravação real) comparando com o
      detector simulado.

## 5. Ordem e dependências

| Entrega                 | Depende de                    | Libera                      |
| ----------------------- | ----------------------------- | --------------------------- |
| Backend D (API)         | —                             | Frontend D                  |
| Backend E (clipes/MinIO)| —                             | Frontend timeline (US20)    |
| IA F (resumo)           | gancho do backend (seção 4)   | Frontend resumo (US08)      |
| IA G (Python)           | — (contrato 3.1 já existe)    | `DETECTOR=python` na demo   |
| Frontend D              | Backend D (ou mock do formato)| —                           |

Os três agentes podem começar ao mesmo tempo: backend em D, frontend em D com mock,
IA em F ou G.

## 6. Pedidos entre agentes

Modelo — adicione uma linha por pedido e marque quando atendido:

| De → Para          | Pedido                                   | Status   |
| ------------------ | ---------------------------------------- | -------- |
| _ex.: front → back_ | _campo `cameraName` em `GET /api/events`_ | _aberto_ |

## 7. Fora de escopo

RTSP/ONVIF/tempo real (`RtspSource`), Socket.IO, app mobile, multi-condomínio e integração com
catracas — tudo Fase 2 (ver `docs/backlog.md`).
