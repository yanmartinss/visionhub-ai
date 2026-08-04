# VisionHub AI

Plataforma modular de monitoramento inteligente baseada em Visão Computacional e Inteligência Artificial, capaz de transformar câmeras comuns em sensores inteligentes que detectam eventos relevantes e auxiliam na tomada de decisão.

> **MVP atual:** módulo de monitoramento para condomínios.
> A plataforma foi projetada para ser modular e escalável a outros mercados (ver [docs/arquitetura.md](docs/arquitetura.md)).

## Problema

Condomínios ainda dependem de CFTV tradicional: câmeras que gravam, mas não interpretam. Porteiros e síndicos precisam revisar horas de vídeo manualmente para identificar eventos como portão aberto por tempo excessivo, permanência suspeita, acesso a áreas restritas e objetos abandonados.

## Solução

O VisionHub AI detecta esses eventos automaticamente a partir das câmeras já existentes, interpreta o que eles significam por meio de regras de negócio e gera alertas em tempo real e resumos diários em linguagem natural.

## Stack

| Camada                  | Tecnologia                           |
| ----------------------- | ------------------------------------ |
| Frontend                | React, Vite, Tailwind CSS            |
| Backend                 | Node.js, Express                     |
| Banco de dados          | PostgreSQL                           |
| Infraestrutura          | Docker, Docker Compose               |
| Tempo real              | Socket.IO                            |
| Visão Computacional     | YOLO, OpenCV                         |
| Inteligência Artificial | Ollama (Llama / Gemma / Qwen, local) |

## Estrutura do projeto

```
├── README.md
├── docs/
│   ├── requisitos.md      # requisitos funcionais e não funcionais
│   ├── arquitetura.md     # como o sistema funciona, do vídeo ao alerta
│   ├── backlog.md         # backlog do produto / sprints
│   ├── database.md        # data model
│   └── wireframes/        # protótipos de telas
├── backend/                # (a criar) API Node.js/Express
├── frontend/                # (a criar) dashboard React
└── docker-compose.yml       # (a criar) orquestração dos serviços
```

## Como rodar (em construção)

```bash
git clone https://github.com/seu-usuario/visionhub-ai.git
cd visionhub-ai
docker compose up --build
```

> Instruções detalhadas de setup serão adicionadas conforme o backend/frontend forem implementados.

## Documentação

- [Requisitos](docs/requisitos.md)
- [Arquitetura](docs/arquitetura.md)
- [Backlog](docs/backlog.md)
- [Database model](docs/database.md)
- [Wireframes](docs/wireframes/)

## Autores

- Yan Martins de Sousa

Projeto desenvolvido como parte da disciplia de APS ofertada pelo professor Carlos Henrique Leitão.
