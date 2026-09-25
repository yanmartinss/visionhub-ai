# Backlog — VisionHub AI (MVP)

Formato: `US-ID` · Como [persona], quero [ação], para [benefício].

> O MVP processa gravações em lote (1 câmera + 1 dia = 1 lote, com segmentos). Tempo real está na [Fase 2](#fase-2--tempo-real).

## Épico 1 — Detecção de eventos

- **US01** · Como síndico, quero que o sistema detecte portões abertos por tempo excessivo, para não depender de revisar gravações manualmente.
- **US02** · Como porteiro, quero ser avisado quando alguém permanecer muito tempo parado perto da entrada, para identificar situações suspeitas rapidamente.
- **US03** · Como síndico, quero ser notificado quando alguém acessar uma área restrita, para agir rapidamente em caso de invasão.
- **US04** · Como porteiro, quero que objetos abandonados sejam detectados automaticamente, para verificar possíveis riscos.
- **US11** · Como síndico, quero que carros estacionados em locais inapropriados por muito tempo sejam detectados, para agir sobre a irregularidade.
- **US12** · Como síndico, quero que crianças correndo no estacionamento sejam sinalizadas, para prevenir acidentes.
- **US13** · Como síndico, quero que necessidades de animais não despejadas nas lixeiras adequadas sejam detectadas, para cobrar os responsáveis.
- **US14** · Como síndico, quero que eventos que começam no fim de uma gravação e terminam no começo da seguinte sejam tratados como um só, para não receber ocorrências quebradas ou duplicadas.

## Épico 2 — Envio e processamento de gravações

- **US15** · Como síndico, quero enviar a gravação do dia por upload (em partes, para arquivos grandes) ou por link, para que o sistema a analise sem acesso direto às câmeras.
- **US16** · Como síndico, quero informar câmera, data e horário inicial de cada arquivo, para que os eventos tenham o horário real correto.
- **US17** · Como síndico, quero acompanhar o status do lote do dia e o progresso de cada segmento, para saber quando a análise termina.
- **US18** · Como síndico, quero reprocessar apenas o segmento que falhou, para não perder o dia inteiro por causa de um arquivo.
- **US19** · Como síndico, quero que o reenvio do mesmo arquivo não gere eventos duplicados, para manter o histórico confiável.

## Épico 3 — Dashboard e histórico

- **US05** · Como usuário do sistema, quero ver um dashboard com os eventos do dia, disponíveis assim que cada lote é processado, para acompanhar o que aconteceu.
- **US06** · Como síndico, quero consultar o histórico de eventos por data e tipo, para investigar ocorrências passadas.
- **US20** · Como síndico, quero uma timeline dos eventos do dia com thumbnail e clipe de cada um, para ver o que aconteceu sem assistir às horas de gravação.

## Épico 4 — Alertas

- **US07** · Como porteiro, quero receber um alerta assim que um evento relevante for identificado no processamento de um lote, para agir sobre a ocorrência.

## Épico 5 — Resumo com IA

- **US08** · Como síndico, quero receber um resumo do dia em linguagem natural quando todos os segmentos terminarem de processar, para entender rapidamente o que aconteceu sem ler logs técnicos.

## Épico 6 — Configuração

- **US09** · Como administrador, quero configurar o tempo máximo de portão aberto por câmera, para adaptar o sistema à realidade de cada condomínio.
- **US10** · Como administrador, quero marcar áreas da imagem como restritas, para que o sistema saiba onde aplicar essa regra.

## Épico 7 — Armazenamento, retenção e LGPD

- **US21** · Como síndico, quero que o sistema guarde apenas clipes comprimidos dos eventos e descarte o vídeo original, para não estourar o armazenamento.
- **US22** · Como síndico, quero que os clipes sejam apagados após um período definido, mantendo eventos e thumbnails, para cumprir a LGPD.
- **US23** · Como síndico, quero que o acesso aos clipes seja restrito por perfil e, se possível, registrado, para saber quem viu imagens de moradores.

## Épico 8 — Acesso e usuários

- **US26** · Como síndico, quero acessar o sistema com e-mail e senha, para ver as informações de acordo com meu perfil.
- **US27** · Como porteiro, quero solicitar acesso informando nome, e-mail e condomínio, para começar a usar sem cadastro manual.
- **US28** · Como usuário, quero recuperar e trocar minha senha, para não perder o acesso nem depender do administrador.
- **US29** · Como administrador, quero criar, listar, editar e desativar usuários, para controlar quem acessa as imagens do condomínio.

## Épico 9 — Prototipação, configuração e IA (complementos)

- **US30** · Como administrador, quero cadastrar, listar, editar e desativar câmeras, para definir o que será monitorado.
- **US31** · Como síndico, quero navegar por um protótipo das telas antes da implementação, para validar se o fluxo atende à rotina do condomínio.
- **US32** · Como porteiro, quero mudar o status de um evento (pendente → em andamento → resolvido), para que a equipe saiba o que já foi tratado.
- **US33** · Como síndico, quero ver por que cada evento foi gerado (objeto, área, regra, duração, confiança, thumbnail), para confiar no alerta.
- **US34** · Como administrador, quero ver a precisão da IA por tipo de evento, para ajustar regras, áreas e limites.
- **US35** · Como administrador, quero cadastrar os dados do condomínio, para identificá-lo nos relatórios e resumos.
- **US36** · Como síndico, quero sugestão de horário pelo nome do arquivo e avisos de lacuna/sobreposição/horário divergente, para não gerar eventos com horário errado.
- **US37** · Como síndico, quero receber por e-mail o resumo do dia e os alertas graves, para ficar informado sem abrir o sistema.

> A organização completa (épicos, funcionalidades, MoSCoW) está em [documento-requisitos-ageis.md](documento-requisitos-ageis.md).

## Fase 2 — Tempo real

Fora do MVP. Entra como um novo adaptador (`RtspSource`) atrás da interface `VideoSource`, sem mexer em detecção, regras nem banco.

- **US24** · Como porteiro, quero ver eventos em tempo real vindos das câmeras (RTSP/ONVIF/IP), para agir no momento em que ocorrem.
- **US25** · Como porteiro, quero receber alertas em tempo real (Socket.IO), para reagir imediatamente.
- **US38** · Como síndico, quero um aplicativo mobile nativo, para receber alertas no celular.
- **US39** · Como administrador, quero gerenciar vários condomínios na mesma instalação, para atender toda a carteira da administradora.
- **US40** · Como síndico, quero integrar catracas e fechaduras, para acionar o portão a partir do sistema.

---

## Sugestão de organização em Sprints

Trabalho por fatia (backend + frontend juntos), uma por vez, com revisão ao final de cada uma. O serviço Python de visão fica por último; até lá a detecção é simulada por JSON atrás do mesmo contrato.

| Sprint   | Foco                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sprint 1 | Setup (Docker Compose, backend/frontend, banco), modelo de lote/segmento, endpoints e fila/worker (US15–US19, back-end) |
| Sprint 2 | **Fatia A** — telas de envio de gravações e lotes (US15–US19, front) ✅                                                 |
| Sprint 3 | **Fatia B** — regras e áreas: CRUD, novos tipos de evento, editor de áreas (US09, US10) ✅                              |
| Sprint 4 | **Fatia C** — detector simulado, regras, fusão entre segmentos, eventos e alertas (US01–US04, US07, US11–US14) ✅       |
| Sprint 5 | **Fatia D** — dashboard e histórico (US05, US06)                                                                        |
| Sprint 6 | **Fatia E** — clipes/thumbnails, MinIO, retenção e LGPD (US20–US23)                                                     |
| Sprint 7 | **Fatia F** — resumo do dia com Ollama (US08)                                                                           |
| Sprint 8 | **Fatia G** — serviço Python de visão (YOLO) no lugar do detector simulado + testes finais                              |

> Ajuste os sprints conforme o cronograma da disciplina/APS.
