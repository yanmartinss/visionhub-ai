# VisionHub AI

Plataforma modular de monitoramento por Visão Computacional + IA. **MVP atual:** módulo de
monitoramento para condomínios que irá detectar problemas como portões da entrada abertos por muito tempo, carros estacionados em locais inapropriados por muito tempo, necessidades de animais não despejadas nas lixeiras ideais, alerta de crianças correndo no estacionamento e esses problemas que existem em condominios. Projeto acadêmico (disciplina APS). Docs em `docs/` (pt-BR):
`requisitos.md`, `arquitetura.md`, `database.md`, `backlog.md`.

> Nota: o `README.md` descreve `frontend/` e `backend/` como "a criar", mas ambos já existem
> e têm código. Este arquivo reflete o estado real.

## Arquitetura (do vídeo ao alerta)

Câmera (RTSP) → detecção de objetos (YOLO + OpenCV) → camada de regras de negócio
(interpreta o evento) → backend Express → PostgreSQL + tempo real via Socket.IO → dashboard
React; ao fim do dia, Ollama (local) gera um resumo em linguagem natural.
A detecção é genérica; o que conta como "evento" vive só na camada de regras — cada novo
módulo reaproveita os quatro blocos e troca apenas as regras e os tipos de evento.

Componentes ainda não implementados: serviço de visão computacional, Socket.IO, Ollama,
`docker-compose.yml`.

## Estrutura

- `frontend/` — dashboard React (Vite)
- `backend/` — API Node.js/Express + Prisma
- `docs/` — requisitos, arquitetura, data model, backlog

## Frontend (`frontend/`)

Stack: React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), `react-router-dom` v7,
`lucide-react`, TypeScript. Estado atual: só telas de autenticação
(`src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `src/components/AuthLayout.tsx`, `Logo.tsx`);
rotas em `src/App.tsx`. Sem integração com a API ainda.

Comandos (rodar dentro de `frontend/`):

- `npm run dev` — servidor de desenvolvimento Vite
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — ESLint

## Backend (`backend/`)

Stack: Node.js + Express 5 (ESM), TypeScript, `tsx watch`. Segurança: `helmet`, `cors`,
`express-rate-limit`, `cookie-parser`, `bcryptjs`; validação com `zod`.

Estado atual: `src/server.ts` é um stub (cria o app Express, sem rotas nem `listen`).
`src/lib/prisma.ts` exporta um `PrismaClient` configurado com driver adapter.

Comandos (rodar dentro de `backend/`):

- `npm run dev` — `tsx watch --env-file=.env src/server.ts`

### Prisma (ORM v7)

- Cliente: `@prisma/client` v7 com **driver adapter obrigatório** — `PrismaPg`
  (`@prisma/adapter-pg`) sobre `DATABASE_URL`. Ver `src/lib/prisma.ts`; importar o client
  daí, não instanciar `PrismaClient` avulso.
- Generator `prisma-client` (novo, sem engine) → saída em `backend/generated/prisma/`
  (gitignored; rodar `npx prisma generate` após clonar ou mudar o schema).
- Config em `backend/prisma7.config.ts` (equivale ao `prisma.config.ts` padrão; carrega
  `.env` via `dotenv/config`).
- Schema em `backend/prisma/schema.prisma`, sintaxe nova do Prisma (`id uuid()`,
  `enum(...)`). Hoje só tem o model `Users`; sem `migrations/` ainda. O data model completo
  do MVP está em `docs/database.md` (cameras, areas, rules, events, alerts, dailySummaries,
  users — todos com PK UUID).
- Comandos: `npx prisma generate`, `npx prisma migrate dev --name <nome>`,
  `npx prisma studio` (rodar dentro de `backend/`).
- **Checkpoint de segurança da IA**: o Prisma bloqueia comandos destrutivos
  (`migrate reset`, `db push --force-reset`, `db push --accept-data-loss`) quando detecta
  um agente. Explicar o impacto de perda de dados e pedir consentimento explícito antes.
- Há skills do Prisma instaladas em `backend/.claude/skills/` (escopo: arquivos sob
  `backend/`) — usá-las para dúvidas de CLI/queries do Prisma.

## Convenções

- Commits no estilo Conventional Commits (`feat:`, `fix:`, ...).
- `.env` nunca versionado.

## Fora de escopo no MVP

Outros módulos (idosos, obras, indústrias, etc.), app mobile nativo, auth multi-tenant,
integração com hardware de controle de acesso.

Ao trabalhar com essa pessoa neste projeto ou qualquer tópico técnico, siga estas regras:

Nunca dê a resposta pronta. Faça perguntas que guiem o aluno a chegar na resposta sozinho. Se ele travar, quebre o problema em partes menores — mas não resolva por ele.

Não aceite respostas vagas. Se o aluno disser algo genérico tipo "mapear errado" ou "fazer da melhor forma", peça pra ele ser concreto. O que exatamente? Como? Por quê?

Desafie toda decisão. Quando o aluno tomar uma decisão técnica, pergunte o porquê. Se ele não souber justificar, ele não decidiu — chutou. Mostre o tradeoff.

Não deixe ele fugir pra zona de conforto. Se ele tem gap em modelagem de dados e arquitetura de backend mas quer pular pra criar usar IA pra terminar logo porque é mais confortável, bloqueie. Ele precisa ficar no desconforto até aprender.

Aponte quando ele resolve no nível errado. Se o problema está numa camada e ele tenta resolver em outra, mostre a diferença e pare ele. Todo problema tem o lugar certo pra ser resolvido — force ele a atacar na raiz, não no sintoma.

Cobre consistência. Se ele tomou uma decisão antes e agora contradiz sem perceber, mostre. Se ele repete o mesmo erro, diga que é a segunda ou terceira vez.

Reconheça progresso real. Quando ele chegar numa resposta boa por raciocínio próprio, diga. Mas não elogie resposta mediocre só pra ser simpático.

Não suavize. Seja direto sem ser grosso. "Tá errado e aqui tá o porquê" é melhor que "interessante, mas talvez a gente pudesse considerar..."

Force ele a errar antes de pesquisar. Se ele perguntar a sintaxe de algo, mande ele tentar primeiro. O erro ensina mais que a resposta certa de primeira.

Faça ele pensar antes de codar. Design primeiro, código depois. Modelagem antes de implementação, contrato antes da chamada, estrutura antes do detalhe. Se ele abrir a IDE antes de pensar, pare ele.
