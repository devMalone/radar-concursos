# 📡 Radar de Concursos SP (PWA & IA Scanner)

> Monitor inteligente e autônomo de **concursos públicos**, **processos seletivos** e **licitações para contratação de bancas examinadoras** na região de **São José do Rio Preto**, **Catanduva** e municípios vizinhos do interior de São Paulo.

---

## ⚡ Como Funciona

1. **Scanner 100% em Nuvem com IA (GitHub Actions + Gemini 3.6 Flash)**:
   - Roda automaticamente todos os dias às **08:00** e às **18:00** (Horário de Brasília) ou sob demanda com 1 clique no GitHub.
   - Utiliza **Google Search Grounding** para pesquisar diários oficiais, portais de prefeituras e notícias da região.
   - Detecta mudanças de status (*Licitação de Banca* ➔ *Edital Publicado* ➔ *Inscrições Abertas* ➔ *Cancelado/Suspenso*).
   - Salva os dados atualizados diretamente no banco **Supabase** compartilhado.

2. **Frontend PWA Instalável no Celular (GitHub Pages)**:
   - Interface rápida, visual escuro premium e responsiva.
   - Filtros por cidade (*Rio Preto, Catanduva, Mirassol, Potirendaba, Cedral, Votuporanga, Olímpia, etc.*).
   - Abas por status (*Editais Abertos, Em Licitação, Previstos, Cancelados, Meus Favoritos*).
   - Destaque especial para cargos da área de **Licitações & Compras** (Lei 14.133/21), **Administrativo**, **Trânsito** e **Fiscal**.
   - **Gerador de Plano de Estudos Integrado**: cria a grade de matérias essenciais e permite copiar para o seu aplicativo de estudos com 1 clique.
   - **Web Push Notifications**: Alertas direto na barra superior e tela de bloqueio do celular.

---

## 🚀 Passo a Passo para Ativar

### 1. Configurar os Secrets no Repositório do GitHub
No repositório `devMalone/radar-concursos` no GitHub:
1. Vá em **Settings** ➔ **Secrets and variables** ➔ **Actions**.
2. Clique no botão verde **New repository secret** e adicione os 3 segredos:

| Nome do Secret | Valor |
|----------------|-------|
| `GEMINI_API_KEY` | `AQ.Ab8RN6IZjgrC1I-xoRogm2MEYerM6EOJyEMs4CB-HWnI70zvdw` |
| `SUPABASE_URL` | `https://vbnzvyxhfnsmbmgxahvn.supabase.co` |
| `SUPABASE_KEY` | *Sua anon public key ou service_role key do Supabase* |

---

### 2. Ativar o GitHub Pages (Para Acessar no Celular)
1. No repositório, vá em **Settings** ➔ **Pages**.
2. Em **Build and deployment** / **Branch**, selecione a branch `main` e a pasta `/(root)`.
3. Clique em **Save**.
4. Em instantes o GitHub gerará o link do seu app:
   `https://devmalone.github.io/radar-concursos/`

---

### 3. Rodar a Primeira Varredura com IA
1. No GitHub, acesse a aba **Actions**.
2. Na lateral esquerda, clique em **Radar de Concursos Scanner**.
3. Clique no botão à direita **Run workflow** ➔ **Run workflow**.
4. O robô Python com Gemini 2.5 Flash fará a pesquisa na web e preencherá a tabela `concursos` no Supabase instantaneamente!

---

## 🛠️ Tecnologias Utilizadas
- **Python 3.11** com `urllib` nativo (sem dependências pesadas externas).
- **Gemini 2.5 Flash API** com ferramenta `google_search` para busca em tempo real na web.
- **Supabase (PostgreSQL / REST)** para persistência e sincronização em tempo real.
- **PWA (HTML5, CSS3, JS Vanilla, Lucide Icons)** com Service Worker offline e Web Push.
- **GitHub Actions** para automação de cron agendado e sem custos de servidor.
