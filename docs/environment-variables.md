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

| Variável                  | Usado em | Obrigatória | Descrição                          |
| ------------------------- | -------- | ----------- | ---------------------------------- |
| `DATABASE_URL`            | API      | Sim         | Connection string do PostgreSQL    |
| `JWT_SECRET`              | API      | Sim         | Secret para assinar tokens JWT     |
| `PORT`                    | API      | Não         | Porta da API (padrão: `4000`)      |
| `FRONTEND_ORIGIN`         | API      | Não         | Origem para CORS (padrão: `http://localhost:3000`) |
| `STRIPE_SECRET_KEY`       | API      | Sim         | Chave secreta do Stripe            |
| `STRIPE_WEBHOOK_SECRET`   | API      | Sim         | Secret do webhook do Stripe        |
| `STRIPE_STARTER_PRICE_ID` | API      | Não         | Price ID do plano Starter          |
| `NEXT_PUBLIC_API_URL`     | Web      | Não         | URL da API (padrão: `http://localhost:4000`) |

## Stripe (desenvolvimento local)

Para testar webhooks do Stripe localmente, use o túnel do Stripe CLI:

```bash
pnpm stripe:listen
```

Isso encaminha eventos do Stripe para `http://localhost:4000/webhooks/stripe`. Requer o [Stripe CLI](https://docs.stripe.com/stripe-cli) instalado e autenticado (`stripe login`).
