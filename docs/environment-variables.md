# Variáveis de Ambiente

Todas as variáveis de ambiente do projeto ficam centralizadas na pasta `/envs` na raiz do monorepo.

## Estrutura

```
envs/
├── .env.example        # Template com todas as variáveis (commitado no git)
├── .env.development    # Valores para desenvolvimento local (gitignored)
└── .env.production     # Valores para produção (gitignored)
```

## Como funciona

- O arquivo carregado é baseado no `NODE_ENV` (`development` ou `production`).
- O `.env.example` serve como fallback — se uma variável não existir no arquivo do ambiente, o valor do `.env.example` é usado.
- Ambos os apps (API e Web) leem da mesma pasta `/envs`.

## Setup inicial

1. Copie o template:
   ```bash
   cp envs/.env.example envs/.env.development
   ```
2. Preencha os valores reais no `envs/.env.development`.

## Variáveis disponíveis

### Core

| Variável                  | Usado em | Obrigatória | Descrição                          |
| ------------------------- | -------- | ----------- | ---------------------------------- |
| `DATABASE_URL`            | API      | Sim         | Connection string do PostgreSQL    |
| `JWT_SECRET`              | API      | Sim         | Secret para assinar tokens JWT     |
| `PORT`                    | API      | Não         | Porta da API (padrão: `4000`)      |
| `FRONTEND_ORIGIN`         | API      | Não         | Origem para CORS (padrão: `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL`     | Web      | Não         | URL da API (padrão: `http://localhost:4000`) |

### Stripe

| Variável                  | Usado em | Obrigatória | Descrição                          |
| ------------------------- | -------- | ----------- | ---------------------------------- |
| `STRIPE_SECRET_KEY`       | API      | Sim         | Chave secreta do Stripe            |
| `STRIPE_WEBHOOK_SECRET`   | API      | Sim         | Secret do webhook do Stripe        |
| `STRIPE_STARTER_PRICE_ID` | API      | Não         | Price ID do plano Starter          |

### Redis

| Variável                  | Usado em | Obrigatória | Descrição                          |
| ------------------------- | -------- | ----------- | ---------------------------------- |
| `REDIS_URL`               | API      | Sim         | Connection string do Redis (ex: `redis://localhost:6379`) |

### RabbitMQ

| Variável                  | Usado em | Obrigatória | Descrição                          |
| ------------------------- | -------- | ----------- | ---------------------------------- |
| `RABBITMQ_URL`            | API      | Sim         | Connection string do RabbitMQ (ex: `amqp://guest:guest@localhost:5672`) |

### Object Storage (MinIO / S3)

| Variável                  | Usado em | Obrigatória | Descrição                          |
| ------------------------- | -------- | ----------- | ---------------------------------- |
| `S3_ENDPOINT`             | API      | Sim         | Endpoint do MinIO/S3 (ex: `http://localhost:9000`) |
| `S3_ACCESS_KEY`           | API      | Sim         | Access key do MinIO/S3             |
| `S3_SECRET_KEY`           | API      | Sim         | Secret key do MinIO/S3             |
| `S3_BUCKET`               | API      | Não         | Nome do bucket (padrão: `avatars`) |
| `S3_REGION`               | API      | Não         | Região S3 (padrão: `us-east-1`)   |
| `S3_PUBLIC_URL`           | API      | Não         | URL pública para acessar avatares  |

### ISR Revalidation

| Variável                  | Usado em | Obrigatória | Descrição                          |
| ------------------------- | -------- | ----------- | ---------------------------------- |
| `REVALIDATION_SECRET`     | Ambos    | Sim         | Secret compartilhado entre API e Web para revalidação on-demand |

## Stripe (desenvolvimento local)

Para testar webhooks do Stripe localmente, use o túnel do Stripe CLI:

```bash
pnpm stripe:listen
```

Isso encaminha eventos do Stripe para `http://localhost:4000/webhooks/stripe`. Requer o [Stripe CLI](https://docs.stripe.com/stripe-cli) instalado e autenticado (`stripe login`).

## Docker Compose

Os valores padrão para desenvolvimento local (já configurados no `docker-compose.yml`):

| Serviço      | Variável relevante | Valor padrão                                    |
| ------------ | ------------------ | ----------------------------------------------- |
| PostgreSQL   | `DATABASE_URL`     | `postgresql://app:app@localhost:5432/app`        |
| Redis        | `REDIS_URL`        | `redis://localhost:6379`                         |
| RabbitMQ     | `RABBITMQ_URL`     | `amqp://guest:guest@localhost:5672`              |
| MinIO        | `S3_ENDPOINT`      | `http://localhost:9000`                          |
| MinIO        | `S3_ACCESS_KEY`    | `minioadmin`                                     |
| MinIO        | `S3_SECRET_KEY`    | `minioadmin`                                     |
