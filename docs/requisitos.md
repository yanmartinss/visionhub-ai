# Requisitos — VisionHub AI (MVP · Módulo Condomínios)

> O MVP processa **arquivos de gravação em lote** (1 câmera + 1 dia = 1 lote, composto por segmentos), enviados pelo síndico. Monitoramento em tempo real é fase 2. Ver `arquitetura.md`.

## Requisitos Funcionais (RF)

| ID   | Descrição                                                                                                                                                                  | Prioridade |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RF01 | O sistema deve detectar quando um portão permanece aberto por tempo superior a um limite configurável.                                                                     | Alta       |
| RF02 | O sistema deve detectar pessoas permanecendo por tempo excessivo em áreas específicas (ex.: portaria, entrada).                                                            | Alta       |
| RF03 | O sistema deve detectar acesso a áreas marcadas como restritas.                                                                                                            | Alta       |
| RF04 | O sistema deve detectar objetos abandonados em áreas monitoradas.                                                                                                          | Média      |
| RF05 | O sistema deve exibir um dashboard com os eventos do dia, disponíveis assim que o lote (ou cada segmento) é processado.                                                    | Alta       |
| RF06 | O sistema deve manter um histórico consultável de eventos detectados.                                                                                                      | Alta       |
| RF07 | O sistema deve emitir alertas automáticos quando um evento relevante for identificado durante o processamento de um lote.                                                  | Alta       |
| RF08 | O sistema deve gerar, quando todos os segmentos do dia terminarem de processar, um resumo em linguagem natural dos eventos ocorridos, usando um modelo de linguagem local. | Média      |
| RF09 | O sistema deve permitir configurar parâmetros por câmera/área (ex.: tempo máximo de portão aberto, áreas restritas).                                                       | Média      |
| RF10 | O síndico deve poder enviar gravações por upload direto (preferencialmente em partes/retomável) ou por link (Drive, OneDrive, servidor do condomínio).                     | Alta       |
| RF11 | O sistema deve organizar as gravações em um lote por câmera e dia, composto por vários segmentos, cada um processado como um job independente.                             | Alta       |
| RF12 | O horário real dos eventos deve ser calculado a partir do horário inicial do segmento (nome do arquivo, metadados ou informado pelo síndico) + timestamp dentro do vídeo.  | Alta       |
| RF13 | O sistema deve exibir o status do lote e o progresso por segmento (`received`, `processing`, `completed`, `failed`).                                                       | Alta       |
| RF14 | O sistema deve permitir reprocessar apenas o segmento que falhou, sem reprocessar o dia inteiro.                                                                           | Média      |
| RF15 | Eventos com duração (ex.: portão aberto por N minutos) devem ser detectados corretamente mesmo quando atravessam segmentos consecutivos.                                   | Alta       |
| RF16 | O sistema deve guardar apenas clipes comprimidos dos eventos (ex.: 10 s antes e depois) e thumbnails, descartando o vídeo original após o processamento.                   | Alta       |
| RF17 | O sistema deve apagar os clipes após um período de retenção configurável, mantendo eventos e thumbnails.                                                                   | Média      |
| RF18 | O reenvio do mesmo arquivo/segmento não deve duplicar eventos (idempotência por hash do arquivo).                                                                          | Média      |

## Requisitos Não Funcionais (RNF)

| ID    | Descrição                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RNF01 | O processamento de IA (modelo de linguagem) deve rodar localmente via Ollama, sem depender de serviços pagos por requisição.                                                         |
| RNF02 | O processamento de vídeo deve rodar em segundo plano (fila de jobs); a API deve responder rapidamente (`202`) e o progresso deve ser consultável.                                    |
| RNF03 | O sistema deve ser containerizado (Docker/Docker Compose), permitindo implantação em diferentes ambientes.                                                                           |
| RNF04 | A arquitetura deve ser modular, permitindo adicionar novos cenários (outros módulos) sem alterar a estrutura principal.                                                              |
| RNF05 | O sistema não deve exigir acesso à câmera nem hardware específico: deve funcionar com gravações exportadas de DVR/NVR existentes, inclusive formatos proprietários (via FFmpeg).     |
| RNF06 | O histórico de eventos deve ser persistido em banco relacional (PostgreSQL), garantindo consulta futura.                                                                             |
| RNF07 | O vídeo nunca deve ser carregado inteiro na memória: processamento em streaming; o original é apagado logo após processar (câmeras 1080p geram ~10 a 40 GB/dia).                     |
| RNF08 | LGPD: vídeos de condomínio contêm dados pessoais. O acesso a clipes deve ser restrito por perfil, com retenção definida e, se possível, registro (log) de quem acessou.              |
| RNF09 | Falha em um segmento não deve derrubar o dia: o segmento fica `failed` (com número de tentativas e erro) e pode ser reprocessado.                                                    |
| RNF10 | A fonte de vídeo deve ficar isolada atrás de uma interface (`VideoSource`), de modo que a fase 2 (tempo real) só adicione um novo adaptador, sem alterar detecção, regras nem banco. |
| RNF11 | Links de gravação devem ser baixados em streaming (pelo worker), validando https, domínio permitido, destino em IP público (também nos redirecionamentos) e tamanho antes de baixar. |

## Fora de escopo no MVP

- **Monitoramento em tempo real** (RTSP/ONVIF/IP/driver da câmera) e alertas em tempo real via Socket.IO — **fase 2**, como novo adaptador `RtspSource`.
- Módulos além de condomínios (idosos, obras, indústrias, estacionamentos, Smart Cities).
- Aplicativo mobile nativo.
- Autenticação multi-tenant / múltiplos condomínios simultâneos.
- Integração com hardware de controle de acesso (catracas, fechaduras).
