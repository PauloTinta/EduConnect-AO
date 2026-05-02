# EduConnect 🎓

Plataforma de aprendizagem social e colaborativa para estudantes angolanos.

## Tecnologias

- **Next.js 15** (App Router)
- **React 19**
- **Supabase** (Auth + Database + Realtime)
- **Tailwind CSS v4**
- **Motion** (animações)
- **TypeScript**
- **PWA** (instalável em dispositivos)

## Configuração Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um ficheiro `.env.local` na raiz do projecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### 3. Configurar a base de dados

Execute os ficheiros SQL no painel do Supabase na seguinte ordem:

1. `supabase_schema.sql`
2. `supabase_messaging_schema.sql`
3. `supabase_social_schema.sql`
4. `gamification_and_fixes.sql`

### 4. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no browser.

## Deploy no Vercel

### Passo 1: Push para GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-user/educonnect.git
git push -u origin main
```

### Passo 2: Importar no Vercel

1. Aceda a [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe o repositório do GitHub
4. Adicione as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique em "Deploy"

## PWA (Progressive Web App)

O EduConnect é instalável como app em:
- **Android**: Chrome → "Adicionar ao ecrã inicial"
- **iOS**: Safari → Partilhar → "Adicionar ao ecrã de início"
- **Desktop**: Chrome/Edge → Ícone de instalação na barra de endereço

## Estrutura do Projecto

```
/
├── app/               # Páginas (App Router)
│   ├── auth/          # Login / Registo
│   ├── feed/          # Feed social
│   ├── home/          # Dashboard de aprendizagem
│   ├── chat/          # Mensagens
│   ├── profile/       # Perfil do utilizador
│   ├── explore/       # Explorar conteúdo
│   └── onboarding/    # Configuração inicial
├── components/        # Componentes reutilizáveis
├── hooks/             # Custom hooks
├── lib/               # Utilitários e clientes
└── public/            # Assets estáticos + PWA assets
    ├── manifest.json  # Manifesto PWA
    ├── sw.js          # Service Worker
    └── icons/         # Ícones PWA
```
