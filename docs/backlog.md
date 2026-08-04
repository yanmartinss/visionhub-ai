# Backlog — VisionHub AI (MVP)

Formato: `US-ID` · Como [persona], quero [ação], para [benefício].

## Épico 1 — Detecção de eventos

- **US01** · Como síndico, quero que o sistema detecte portões abertos por tempo excessivo, para não depender de revisar gravações manualmente.
- **US02** · Como porteiro, quero ser avisado quando alguém permanecer muito tempo parado perto da entrada, para identificar situações suspeitas rapidamente.
- **US03** · Como síndico, quero ser notificado quando alguém acessar uma área restrita, para agir rapidamente em caso de invasão.
- **US04** · Como porteiro, quero que objetos abandonados sejam detectados automaticamente, para verificar possíveis riscos.

## Épico 2 — Dashboard e histórico

- **US05** · Como usuário do sistema, quero ver um dashboard em tempo real com os eventos do dia, para acompanhar o que está acontecendo agora.
- **US06** · Como síndico, quero consultar o histórico de eventos por data e tipo, para investigar ocorrências passadas.

## Épico 3 — Alertas

- **US07** · Como porteiro, quero receber um alerta automático assim que um evento relevante for detectado, para agir no momento certo.

## Épico 4 — Resumo com IA

- **US08** · Como síndico, quero receber um resumo diário em linguagem natural dos eventos do dia, para entender rapidamente o que aconteceu sem ler logs técnicos.

## Épico 5 — Configuração

- **US09** · Como administrador, quero configurar o tempo máximo de portão aberto por câmera, para adaptar o sistema à realidade de cada condomínio.
- **US10** · Como administrador, quero marcar áreas da imagem como restritas, para que o sistema saiba onde aplicar essa regra.

---

## Sugestão de organização em Sprints

| Sprint   | Foco                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| Sprint 1 | Setup do projeto (Docker Compose, estrutura backend/frontend, banco de dados) |
| Sprint 2 | Integração YOLO/OpenCV + captura de vídeo                                     |
| Sprint 3 | Camada de regras de negócio (US01–US04)                                       |
| Sprint 4 | Backend + persistência + Socket.IO (US05–US07)                                |
| Sprint 5 | Dashboard React (US05, US06)                                                  |
| Sprint 6 | Integração com Ollama + resumo diário (US08)                                  |
| Sprint 7 | Configurações (US09, US10) + ajustes finais + testes                          |

> Ajuste os sprints conforme o cronograma da disciplina/APS.
