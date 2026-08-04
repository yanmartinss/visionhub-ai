# Requisitos — VisionHub AI (MVP · Módulo Condomínios)

## Requisitos Funcionais (RF)

| ID   | Descrição                                                                                                                         | Prioridade |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF01 | O sistema deve detectar quando um portão permanece aberto por tempo superior a um limite configurável.                            | Alta       |
| RF02 | O sistema deve detectar pessoas permanecendo por tempo excessivo em áreas específicas (ex.: portaria, entrada).                   | Alta       |
| RF03 | O sistema deve detectar acesso a áreas marcadas como restritas.                                                                   | Alta       |
| RF04 | O sistema deve detectar objetos abandonados em áreas monitoradas.                                                                 | Média      |
| RF05 | O sistema deve exibir um dashboard com eventos em tempo real.                                                                     | Alta       |
| RF06 | O sistema deve manter um histórico consultável de eventos detectados.                                                             | Alta       |
| RF07 | O sistema deve emitir alertas automáticos quando um evento relevante for identificado.                                            | Alta       |
| RF08 | O sistema deve gerar, ao final do dia, um resumo em linguagem natural dos eventos ocorridos, usando um modelo de linguagem local. | Média      |
| RF09 | O sistema deve permitir configurar parâmetros por câmera/área (ex.: tempo máximo de portão aberto, áreas restritas).              | Média      |

## Requisitos Não Funcionais (RNF)

| ID    | Descrição                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| RNF01 | O processamento de IA (modelo de linguagem) deve rodar localmente via Ollama, sem depender de serviços pagos por requisição. |
| RNF02 | Eventos detectados devem chegar ao dashboard em tempo real (via Socket.IO), com latência perceptível baixa.                  |
| RNF03 | O sistema deve ser containerizado (Docker/Docker Compose), permitindo implantação em diferentes ambientes.                   |
| RNF04 | A arquitetura deve ser modular, permitindo adicionar novos cenários (outros módulos) sem alterar a estrutura principal.      |
| RNF05 | O sistema deve funcionar com câmeras já existentes, sem exigir hardware específico.                                          |
| RNF06 | O histórico de eventos deve ser persistido em banco relacional (PostgreSQL), garantindo consulta futura.                     |

## Fora de escopo no MVP

- Módulos além de condomínios (idosos, obras, indústrias, estacionamentos, Smart Cities).
- Aplicativo mobile nativo.
- Autenticação multi-tenant / múltiplos condomínios simultâneos.
- Integração com hardware de controle de acesso (catracas, fechaduras).
