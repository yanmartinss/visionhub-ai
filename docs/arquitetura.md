# Arquitetura — VisionHub AI

## Visão geral

O VisionHub AI segue um fluxo de quatro etapas, do vídeo bruto até o alerta entregue ao usuário:

```
Câmera (RTSP/vídeo)
   → Detecção de objetos (YOLO + OpenCV)
   → Camada de regras de negócio (interpretação do evento)
   → Backend (Node.js/Express)
        ├── Persistência (PostgreSQL)
        ├── Tempo real (Socket.IO) → Dashboard (React)
        └── Geração de linguagem natural (Ollama) → Resumo diário
```

## Componentes

### 1. Captura e detecção (Visão Computacional)

- **YOLO**: responsável apenas por detectar objetos na cena (pessoas, portões, veículos, objetos).
- **OpenCV**: pré-processamento de imagem/vídeo (recorte de região de interesse, tracking simples).
- Este componente **não decide** se algo é um evento relevante — apenas identifica "o que" está na cena.

### 2. Camada de regras de negócio

- Recebe as detecções e aplica as regras específicas do domínio condominial:
  - Portão detectado como aberto há mais de X minutos → evento "portão aberto".
  - Pessoa parada em uma região marcada como sensível por mais de Y minutos → evento "permanência suspeita".
  - Detecção de pessoa em região marcada como restrita → evento "acesso a área restrita".
  - Objeto estático sem dono aparente por mais de Z minutos → evento "objeto abandonado".
- É essa camada — e não o YOLO — que decide o que é um "evento". Isso mantém o modelo de detecção genérico e as regras de negócio isoladas e fáceis de estender.

### 3. Backend (Node.js/Express)

- API REST para configuração (câmeras, áreas, limites de tempo).
- Recebe eventos da camada de regras, persiste no PostgreSQL e emite via Socket.IO.
- Orquestra a chamada ao modelo de linguagem para gerar o resumo diário.

### 4. Geração de linguagem natural (Ollama)

- Roda localmente (Llama, Gemma ou Qwen).
- Recebe a lista de eventos técnicos do dia e produz um texto em linguagem natural, por exemplo:
  > "Durante o dia foram detectados dois episódios em que o portão principal permaneceu aberto por mais de três minutos, uma permanência suspeita próxima à entrada e nenhum acesso à área restrita."

### 5. Frontend (React + Vite + Tailwind)

- Dashboard em tempo real (eventos chegando via Socket.IO).
- Histórico de eventos com filtros (data, tipo, câmera/área).
- Tela de resumo diário gerado por IA.
- Configuração de regras (tempo máximo de portão aberto, áreas restritas etc.).

### 6. Infraestrutura

- Cada componente roda em um container (frontend, backend, banco, serviço de visão computacional, Ollama).
- Orquestrado via Docker Compose para facilitar desenvolvimento e implantação.

## Por que modular

Cada novo módulo (idosos, obras, indústrias, estacionamentos, Smart Cities) reaproveita os mesmos quatro blocos — captura, detecção, regras de negócio e comunicação — mudando apenas:

1. As regras de negócio (o que conta como evento no domínio).
2. Os tipos de evento armazenados e exibidos no dashboard.

A camada de detecção (YOLO/OpenCV), a infraestrutura de tempo real (Socket.IO) e a geração de linguagem natural (Ollama) permanecem as mesmas.

## Diagrama de eventos (exemplo simplificado)

```
[Câmera] --vídeo--> [YOLO/OpenCV] --detecções--> [Regras de Negócio]
                                                        |
                                                        v
                                              evento relevante?
                                                 /            \
                                              não              sim
                                               |                |
                                          (descarta)     [Backend: salva + emite]
                                                                |
                                                    +-----------+-----------+
                                                    |                       |
                                          [Socket.IO -> Dashboard]   [Histórico no PostgreSQL]
                                                                            |
                                                                  [Ollama gera resumo diário]
```
