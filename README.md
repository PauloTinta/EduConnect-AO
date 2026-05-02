# EduConnect Angola

Plataforma de aprendizagem social e colaborativa para estudantes angolanos.

## Tecnologias

- **Next.js 14** (App Router)
- **React 18**
- **Tailwind CSS v3**
- **Supabase** (Auth + Database + Realtime + Storage)
- **Motion** (animações)
- **TypeScript**

## Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Variáveis de ambiente

Crie um ficheiro `.env.local` com:
```env
NEXT_PUBLIC_SUPABASE_URL=https://sgjzjqqntrgygixthpdm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Executar localmente
```bash
npm run dev
```

### 4. Build para produção
```bash
npm run build
```

## Deploy no Vercel

1. Faça push do código para o GitHub
2. Conecte o repositório no [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente no painel do Vercel
4. Deploy!

## Base de Dados (Supabase)

Execute os ficheiros SQL na seguinte ordem:
1. `supabase_schema.sql`
2. `supabase_social_schema.sql`
3. `supabase_messaging_schema.sql`
4. `gamification_and_fixes.sql`
