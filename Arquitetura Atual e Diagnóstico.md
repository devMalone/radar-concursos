# Arquitetura Atual e Diagnóstico  
O sistema atual (“Radar SP”) utiliza um fluxo centrado em **Google/Gemini**: um agente Google Antigravity (UX/UI) orquestra consultas a motores de busca (via Google Search/Vertex API) e passa resultados para Gemini Flash/Google para gerar respostas JSON estruturadas, gravadas em Supabase. Há chamadas HTTP ao Gemini, e pipelines rodando em GitHub Actions. O *search* e interpretação estão misturados: faz-se uma única busca no Google e o LLM (Gemini) gera a resposta e até filtra URLs, sem validação externa (citação múltipla) além da sanitização final.  

**Problemas-chave detectados:** Dependência de conhecimento interno do LLM (que pode estar desatualizado); motor de busca único (Google) com resultados mistos entre páginas antigas e novas; busca e verificação não separadas (o LLM pode “inventar” informações se faltam evidências); URLs quebrados e sites expirados não detectados antes da resposta. Por exemplo, Gemini tende a usar datas internas do modelo quando falta evidência recente, gerando falsas positivas. Em suma, a arquitetura atual *prompts* a descoberta e validação simultâneas, gerando baixa precisão e muita “alucinação”.  

*Falhas em detalhes:*  Geminis baseados em conhecimento pré-treinado não garantem atualidade. Google Custom Search (CS) usado tem limite (100 consultas grátis/dia) e será desativado em 01/2027, sem substituto grátis conhecido. Bing Search API sofreu descontinuação (sem SLA para frescor). Validação de páginas (“last updated”) não existe. Mistura consulta e síntese impede reranqueamento ou busca adversarial. Conclusão: **não basta ajustar prompt**; é preciso re-arquitetar: separar busca, verificação e síntese, usando múltiplos motores e camadas de checagem.  

## APIs de Busca Web (comparativo)  
Existe um leque de APIs modernas de busca focadas em IA. Destacamos:  

- **Google Custom Search / Vertex AI Site Search:** *CSP* está ativo até Jan/2027 com 100 consultas grátis/dia, $5 por 1000 extras. Não cobre toda web sem configuração extra (limitado por domínios). *Vertex AI Site Search* (site interno) limitado a 50 domínios. Nada nativo mantém a *web* atualizada pós-2027.  
- **Bing Web Search (Azure Cognitive):** Pacotes do Azure: $3/mês para 1k consultas, $30/10k, $300/100k, até $2700/1M. Quer dizer ~0,003$/consulta. Latência tipicamente ~100–200ms. Descontinuado no modo grátis, mas Azure mantém API paga. *Nota:* em 2025 a Microsoft acelerou migração para geradores próprios.  
- **Brave Search API:** Indexa ~30B páginas, atualiza +100M páginas/dia. Plano inicial: 1000 consultas grátis/mês; $5/1000 adicionais. Suporta 50 QPS por chave. Oferece endpoins especializadas (web, notícias, imagens) e filtragem por país/idioma, recência etc. Tem modo “LLM Context” que retorna trechos extraídos (uma busca por chamada). Suporta parâmetro `freshness` (0–24h, 7d, 31d, 1a) baseado em data da página. Inclui “Goggles” (personalização de fontes): permite **priorizar** ou **descartar** domínios (por ex. só sites oficiais). Maturidade alta para RAG (retorna JSON prontos).  
- **SerpApi:** API agregadora comercial (Google, Bing, Yahoo etc). Gratuito 250 consultas/mês; Starter $25 por 1k; Developer $75/5k. Fornece resultados estruturados (JSON) incluindo snippets. Suporta Google Safe API. Largura de banda boa (até 3000 qps no plano Prod). Custo unitário ~ $0.075/consulta (Starter). Latência média ~0.5–1s (depende do motor). Suporta filtros básicas (país, idioma). Não há controle de recência específico além de consulta natural.  
- **Serper (serper.dev):** Focado em Google SERP real-time. Taxa inicial: gratuito 2500 consultas/mês; $50 pelo próximo nível (~$0.02/consulta). Nível Ultimate 12.5M consultas por $3750 (~$0.0003/consulta). Latência ~1–2s por busca. Sem embedding de resposta (retorna somente links/snippets). Vantagem: tende a retornar dados similares ao Google.  
- **Tavily:** API de busca por IA (consulta em linguagem natural). Grátis 1000 “créditos” mensais; $0.008/crédito após. Não há QPS informado publicamente. Voltado a trabalhos de RAG, com endpoint de “search”. (Menos documentação pública sobre cobertura ou recência.)  
- **Exa:** Plataforma IA (search e agentes). API Search: $7/1000 requests (cada com ~10 resultados). “Deep Search” multi-step: $12–15/1k. Tem free $10 créditos/mês. Oferece busca semântica e também agentes. QPS ~25 (Starter) a 50 (Dev). Foco em respostas “prontas” (extratos de páginas).  
- **Linkup/Parallel Search:** Novo player focado em IA-native search. Web RAG API: $0.005/consulta (Turbo $0.001) com ~200ms latência. Algoritmo próprio otimizado para LLM (fornece trechos ricos). Alegam 98% de acurácia SimpleQA. Ainda pouco conhecido, mas relevante pela latência baixa e custo.  
- **Pesquisas Open Source:** Bibliotecas como `duckduckgo_search` (ddgs) podem fazer buscas via APIs não oficiais de DuckDuckGo/Bing/Google sem custo (via scraping). Exemplo: ddgs Python (MIT) suporta DuckDuckGo, Google, Bing, Yahoo e outros. Útil para protótipo, mas cuidado com bloqueios.  

**Tabela comparativa resumida:**  

| API / Engine       | Motores cobertos       | Gratuito        | Custo inicial        | QPS        | Suporte a filtros/recência      | Observações          |
|--------------------|------------------------|-----------------|----------------------|------------|---------------------------------|----------------------|
| Google C. Search | Google (web limitado)      | 100/dia grátis | \$5 / 1000 (≥100/dia) | Baixa      | USA only, via PSE (Custom Search)| Limitado, encerrando 2027    |
| Vertex AI Search   | Domínios próprios    | N/D             | Contato Google       | N/D        | n/d                             | Até 50 domínios   |
| Bing Search | Bing (via Azure)     | –               | \$3 / 1000 (1k)    | >100 QPS   | País, idioma; sem filtro de data | 100-270ms/req, altos volumes |
| Brave Search | Brave (web próprio)       | 5000/mês       | \$5 / 1000         | 50 QPS     | País, idioma, `freshness`, Goggles (fonte) | Excertos prontos para LLM |
| SerpApi     | Google, Bing, etc.      | 250/mês        | \$75 / 5000        | ~1000/h    | País, idioma; recência em “query natural” | JSON estruturado     |
| Serper   | Google SERP          | 2500/mês       | \$50 / (poucas k)  | ~300 qps   | Sem filtros específicos         | Oferece texto real-time (não estudado) |
| Linkup/Parallel | Web RAG (IA)          | –              | \$0.005 / consulta  | ~~         | IA-native, treino focalizado    | 200ms latência, 98% acurácia QA |
| Exa       | Web + (IA agents)    | \$10/mês cred.  | \$7 / 1000         | 25–50 QPS  | País, idioma; sem data explícita | Integra multi-etapas RAG |
| Tavily     | Web (IA)             | 1000 créditos  | \$0.008 / crédito  | —          | N/D                             | Voltado a search-IA   |
| ddgs (DuckDuckGo lib) | DuckDuckGo/Bing/Google | Livre          | Gratuito          | Limitado por bloqueios | Suporta site:, país  | Ferramenta local de scraping |
| API Search genérica  | Apify, Scrape, etc.     | –               | Variável           | –          | –                               | Mais cara, infraestrutura    |

*(Coluna “QPS” é aproximada; dados de preços e limites citados nas fontes. Fontes principais: documentação e blogs oficiais.)*  

## Crawling / Browser Automation  
Após obter URLs relevantes, é preciso extrair conteúdo completo (HTML/PDF) para validar e extrair dados. Ferramentas comuns:  

- **Headless Browsers:** *Playwright* (Microsoft) e *Puppeteer* (Google) controlam navegadores. No geral, Playwright tem suporte multi-browser (Chromium, Firefox, WebKit) e “auto-wait” eficiente; Puppeteer é focado em Chromium, execuções muito rápidas. Ambos são bem integráveis (Node/Python) para SPAs. *Selenium* é mais pesado e detectável (via webdriver flag). Para contornar detecção, podem-se usar serviços cloud gerenciados (Apify, ScrapingBee, ScrapeOps) que roteiam proxies e headless pré-configurados.  

- **Frameworks crawlers:** *Scrapy* (Python) e *BeautifulSoup* para sites simples estáticos. Útil para extrair listas de links ou catálogos (ex. consultar RSS ou busca interna de Diários Oficiais). Complementar: *Algumas bibliotecas open-source*, como `ddgs` (web search) e plugins de Puppeteer para captura, mas sem suporte total JS (headless).  

- **OCR para PDFs:** Muitos Diários Oficiais (DOE) são PDFs escaneados. Extrair texto: usar bibliotecas como *PyMuPDF* (fitz) ou *pdfplumber* (já detectam texto em PDFs nativos; caso seja imagem, usam fallback OCR). Para OCR puro: *Tesseract* (via `pytesseract`) em páginas escaneadas. Parche importante: converter PDF em imagens por página e rodar OCR só se necessário.  

- **APIs integradas (SaaS):** Plataformas como *Firecrawl* oferecem “Search+Scrape” via uma só API. Ex.: Firecrawl cobra 2 créditos por 10 resultados de busca, 1 crédito por página raspada (busca com extração já inclusa). Ele entrega Markdown/HTML pronto (JSON estruturado) sem configuração de navegador local, mas tem custo por crédito (grátis 1000/mês, depois $5/1000 créditos). Ou *Apify* e *ScrapingBee* que expõem scraping como serviço (pagos).  

- **Quando usar fetch vs browser:** Se página é estática (HTML simples, pode-se usar `requests`). Se tem JavaScript complexo ou login, usar *headless* (Playwright/Puppeteer). Em geral, para diários oficiais e PDFs, basta download HTTP e processamento interno; para sites de notícias, normalmente `requests` + BeautifulSoup é suficiente; para interações dinâmicas (formular ou login), usar Playwright.  

## Estratégia Multi-Engine (A/B/C/D)  
Não confiar em apenas uma fonte. Uma boa estratégia: **usar vários mecanismos em paralelo ou sequência**, por redundância e cobertura: por ex. (A) Brave Search como primária, (B) fallback SerpAPI Google/Bing se Brave retornar pouco, (C) ddgs para consultas alternativas (scraping), (D) buscadores regionais (ex. Yahoo JP ou Baidu para conteúdo internacional). Isso aumenta recall e reduz riscos de falha.  

- *Custo vs cobertura:* Usar Brave para consultas gerais (baixo custo), e ocasionalmente SerpAPI/Linkup para reconciliação (custo maior). Modelos de fallback podem ativar segundo motor só se o primeiro falhar ou confiança baixa. Estratégias A/B podem alternar motores periodicamente (monitorar performance histórica).  

- *Redundância e recorte geográfico:* Incluir filtros de localização (ex. Bing country=BR, Brave country=BR) para dados locais. Pode-se usar um motor “genérico” e outro “específico de Brasil” simultaneamente.  

- *Arquitetura:* Um diagrama sugerido:  

```mermaid
flowchart LR
  subgraph Consulta
    Q((Consulta do usuário)) --> S1[Brave Search API]
    Q --> S2[SerpAPI (Google/Bing)]
    Q --> S3[Paralela (Parallel/Linkup)]
  end
  subgraph Agregação
    S1 --> R[Coletor de URLs]
    S2 --> R
    S3 --> R
    R --> F[Filtro/Validação (HTTPS, status 200, canonicalização)]
  end
  subgraph Extração
    F --> B[Fetch URLs (requests / Playwright)]
    B --> C[Extração de Conteúdo (scraping/pdf -> texto)]
  end
  subgraph RAG
    C --> LLM[Pipeline RAG (Embeddings + LLM Multi-etapa)]
    LLM --> Resp[Resposta Final com Citações]
  end
```  
Acima, múltiplos motores alimentam um coletor comum. URLs válidas são raspadas, texto e metadados extraídos, então passa para o pipeline RAG.

## Pipeline RAG Multi-etapa (Fast Path vs Deep Path)  
Para melhorar precisão, adota-se RAG iterativo em vez de um único LLM. Exemplos de **padrões**:  
- **Geração de consulta expandida:** O LLM recebe a query inicial e gera subqueries (ex: inclui sinônimos, termos específicos). Cada subquery é pesquisada em separado, agregando respostas.  
- **Recuperação iterativa:** Estruturas como “iterative retrieval-generation”: o agente alterna entre geração de texto e busca, refinando a cada rodada. Ex.: fazer uma busca inicial, gerar resumo, depois buscar detalhes desse resumo, e assim por diante.  
- **Desagregação de consulta (Question Decomposition):** Decopos de consulta em partes independentes, cada uma busca e responde, depois combinadas (vários passos RAG encadeados).  
- **Reranking e validação:** Após buscar e ler evidências, reprocura por evidências contraditórias. Por exemplo, se afirma “concurso novo anunciado”, faz-se uma consulta adversarial com termos como “cancelado” ou “adiado” para checar contradição. Modelos de NLI/rátios (contradiction/neutral) podem flagrar inconsistências, como em pipelines de verificação de fatos.  
- **Loop de calibração:** Usar confiança do LLM ou critério de entropia para decidir se novas buscas são necessárias (Adaptive-RAG).  

*Exemplo de fluxo:*  

```mermaid
flowchart LR
    A((Consulta)) 
    subgraph Caminho Rápido
      A --> SAR[Busca rápida (uma só vez)] --> LLM1[LLM gera resposta imediata] --> Out[(Saída)]
    end
    subgraph Caminho Profundo
      A --> Decomp[Decomposição da consulta] 
      Decomp --> MultiSearch[Múltiplas buscas e refinamentos]
      MultiSearch --> AG[Sintetizar e verificar evidências (LLM)]
      AG --> Out
    end
```  

No **“Fast Path”**, faz-se uma pesquisa simples e síntese direta para respostas simples ou quando a confiança é alta (por exemplo, pergunta já indexada). No **“Deep Path”**, para casos complexos ou onde há incerteza, procede-se com várias iterações de busca, agregação de documentos e re-síntese, garantindo múltiplas fontes e checagem de datas. O uso de RAG multi-step aumenta factualidade e robustez.

## Classificação de Autoridade de Fontes  
Para evitar fontes pouco confiáveis, adota-se um **ranking de autoridade**:  
- **Whitelist e quotas:** Manter lista (sites oficiais do governo, portais de notícias reconhecidos) e priorizar resultados desses domínios. Ex.: uso das *Goggles* do Brave para reforçar (ou restringir) sites confiáveis.  
- **Domínio e idade:** Pesos maiores para sites do governo (.gov.br, etc) ou entidades oficiais. Menos peso a sites em fóruns ou blogs desconhecidos. Pode-se usar métricas como *Domain Authority*, ou basear-se em manual de fontes.  
- **Recência:** Favorecer documentos mais recentes (usar parâmetro `freshness` em APIs que suportam). Por exemplo, isolar resultados publicados nos últimos meses/dias. Se páginas antigas aparecem, penalizar sua relevância.  
- **Relevância:** Mesmo dentro de fontes boas, rankear por relevância textual (embedding score ou TF-IDF) antes de passar ao LLM. Em RAG, rankeamos evidências por similaridade com a consulta antes de sintetizar.  
- **Agregação de escore:** Pode-se calcular um *score* final combinando autoridade, data e relevância: por exemplo, 𝑠𝑐𝑜𝑟𝑒=0.5⋅(autoridade do site)+0.3⋅(idade em dias normalizada)+0.2⋅(score semântico). Isso evita números arbitrários e facilita interpretação. Fontes sem metadados de data se consideram “velhas”.

## Raciocínio Temporal  
É crucial extrair informações de tempo para verificar atualidade. Abordagens:  
- **Metadados HTML:** Muitas páginas de notícias e portais têm tags `<meta name="date">` ou `<meta property="article:published_time">`, ou mesmo timestamps no conteúdo (ex.: `<time datetime>`). Ferramentas como [extruct] podem extrair JSON-LD ou meta.  
- **Cabeçalhos HTTP:** Quando disponível, o campo `Last-Modified` indica última modificação. Útil se a página não muda layout mas o conteúdo (como DOE).  
- **Conteúdo textual:** Extrair datas presentes no texto (ex.: “Publicado em 12/09/2026”) usando *regex* ou bibliotecas de NLP. Ferramentas como *HeidelTime* automaticamente detectam e normalizam expressões temporais em diversos formatos. Por exemplo, “HeidelTime extrai expressões temporais e as normaliza (TIMEX3)”.  
- **OCR/Datas em PDFs:** Extraia texto do PDF e procure por datas (ex. cabeçalhos do diário oficial). PyMuPDF permite ler texto; se estiver como imagem, aplique Tesseract por página. Muitos DO incluem a data no nome do arquivo ou primeiras linhas.  
- **Heurística final:** Ao agregar evidências, comparar datas extraídas. Se os resultados mais relevantes têm data recente (ou dentro do intervalo buscado), confiar. Caso contrário, marcar como possivelmente “estaleiro”. Parâmetros de frescor nas APIs (quando disponíveis) ajudam a filtrar antecipadamente.

## Extração de PDFs e Diários Oficiais  
O “Radar” coleta publicações de concursos no Diário Oficial. Essas são tipicamente PDFs (às vezes escaneados). Estratégia:  
- Baixar automaticamente PDFs relevantes via URLs encontrados. Usar `requests` ou a API de *fetch* do headless se necessário.  
- **Parse de texto:** Primeira tentativa com PyMuPDF (`fitz`) ou pdfminer.six (textos nativos). Se o PDF for imagem, detectar (PyMuPDF indica se há texto) e então usar OCR (Tesseract via Python ou TesseractJS). LlamaIndex destaca que *vector search tolera erros de OCR*, dado que embeddings lidam bem com ruído.  
- **Chunking e vetores:** Para PDFs grandes, divida em parágrafos ou seções (ex.: por tópico do edital). Gere embeddings de cada chunk e armazene em um vetor DB (ex.: Supabase + pgvector, Weaviate, Pinecone). Assim, consultas pontuais podem buscar só no trecho relevante. Segundo LlamaIndex, embeddings permitem recuperação sem exigir a palavra-chave exata.  
- **Metadados:** Armazene data do documento (via texto ou nome do arquivo), identificação do órgão, número do edital, etc. Isso suporta ordenação por data/autoridade depois.  
- **Armazenamento de evidências:** Pode salvar PDFs ou trechos no banco (Supabase) para referência futura, junto com URL canônico e hash de conteúdo.  

## Detecção de Conteúdo Duplicado  
Para evitar apresentar a mesma notícia de diversas fontes, detecte duplicatas assim:  
- **Canonicalização de URL:** Normalize URLs (remover http/https, “www.”, parâmetros de rastreamento) usando bibliotecas como `url-normalize`. Isso garante que `http://exemplo.com/` e `https://exemplo.com` sejam tratados como iguais.  
- **Hash do conteúdo:** Gere hashes de HTML/texto (ex.: SHA-256 do corpo limpo) ou fingerprints (SimHash) para flagrar conteúdos idênticos. Se dois URLs dão hash igual, considere duplicatas (exclua o de menor autoridade).  
- **Similaridade semântica:** Para casos quase-duplicados (mesmo conteúdo re-publicado com pequenas diferenças), compare embeddings de texto. Se cosine similarity > 0.95, ou se vários parágrafos batem fortemente, trate como duplicata. Clustering incremental ajuda (ex. minhash ou trec eval heurístico).  
- **Uso de `<link rel="canonical">`:** Se presente no HTML, indica a URL preferida pelo site (usá-la diretamente evita duplicatas internas). 

## Fluxo de Validação de URLs  
Todo link coletado passa por uma validação:  
1. **Verificação de formato:** Confirma que a URL é bem-formada (ex. regex, adiciona “https://” se faltar, bloqueia `data:` ou links internos não acessíveis).  
2. **DNS e Acesso:** Opcional: checar DNS (sist. `socket.gethostbyname`) para ver se o domínio existe.  
3. **Requisição HTTP:** Fazer uma requisição HEAD ou GET leve para checar *HTTP status*. Se 2xx, OK; 3xx trate redirecionamento (seguir e marcar URL final). Se 4xx/5xx, descartar.  
4. **Tipo de conteúdo:** Verificar cabeçalho `Content-Type`: só permitir `text/html`, `application/pdf` ou formatos esperados. Negar imagens ou arquivos binários inesperados.  
5. **Bloqueios e erros:** Detectar conteúdo “página de erro” (alguns sites retornam 200 com mensagem de erro). Se o LLM ou regex detectar frases como “página não encontrada”, “acesso negado”, rejeitar.  
6. **Canonical / Redirecionamento:** Após seguir redirecionamentos, use URL final (seguindo `<link rel="canonical">` se presente) como referência única.  

A cada etapa, anotar latência e status (para métricas). URLs inválidas são registradas (e.g. `400 Bad Request`, `404 Not Found`) para análise posterior. Isso ajuda métricas de “valid-URL rate” no benchmarking.

## Pipeline de Modelos (Multi-Model)  
Para equilibrar custo/desempenho, use uma cadeia de modelos de diferentes tamanhos:  
- **Modelos leves (SLMs):** Primeira triagem ou tarefas menores (detecção de idioma, NER simples, classificação binária). Ex.: modelos ~1-4B (Gemma-2, Mistral-mini, Phi-3-mini) são rápidos e baratos. Exemplo: classificar se uma notícia é sobre *novo concurso* vs *outro tópico*.  
- **Modelos médios:** Extração de informações pontuais (p.ex. data do concurso, órgão), geração de queries expandidas, sumarização de artigos. Podem usar LLMs ~7B (Gemini-mini, Llama-2) ou serviços tipo GPT-3.5 Turbo.  
- **Modelos grandes:** Apenas para síntese final e verificação de evidências cruzadas. Por exemplo, Gemini 3 ou GPT-4 forçando resultado final com citações. Minimizar chamadas.  

Assim, perguntas simples usam apenas o modelo barato; apenas quando incerto, sobe para modelo mais caro (metodologia “pipeline hierárquico”). Isso reduz tokens gastos e custos. Relatos de SLMs mostram que modelos menores podem atingir desempenho operacional com fine-tuning, economizando ~5–10× em custo.  

## Recomendação de Stack (Antigravity + Infra)  
- **Linguagem/Framework:** Dado o front-end React existente, usar **Node.js** (TypeScript) no backend facilita integração (mesma base de JavaScript). Playwright/Puppeteer têm SDK nativo JS. Porém, **Python** oferece bibliotecas robustas para IA/NLP (OpenAI SDK, HuggingFace, PyMuPDF). Uma opção híbrida: orquestrar no Node e chamar microserviços Python para LLM/extração.  
- **Banco de dados:** Supabase (Postgres) já usado. Idealmente manter para facil integração com Antigravity. Armazenar tabelas de cidades, vagas, evidências, logs de busca. Usar **pgvector** (já suportado) para armazenar embeddings de documentos (p.ex. anúncios de concurso).  
- **Filas/Jobs:** Empregar um gerenciador de filas (RabbitMQ, Redis Queue ou Google Pub/Sub) para pipeline de busca e scraping. Isso isola tasks (ex.: “Buscar novas vagas”, “Extrair PDF de URL”) e permite retries. GCP Cloud Tasks/Cloud Run ou Workers pode servir para escalonamento automático.  
- **Autenticação / Secrets:** Chaves de APIs (Brave, LLM, Supabase) em **Secret Manager** ou variáveis de ambiente criptografadas (não comitar). Monitore e rotacione periodicamente.  
- **Integração Contínua:** GitHub Actions pode disparar coleta periódica (cron) ou monitorar “issue” com cidade lista. Porém, para escalas médias/grandes pode migrar para Cloud Scheduler/Run.  
- **Observabilidade:** Log de cada passo (busca, fetch, parse, LLM) no banco e/ou sistemas de logs (Datadog, Stackdriver) para análises futuras. Monitorar métricas: latência de busca, taxa de erros 4xx/5xx, hits de duplicatas, custo mensal de APIs.  
- **Layout de Código:** Modularizar: separação clara entre *Buscador (search) → Coletor (fetch) → Validador → Pipeline RAG → API de resposta*. Cada módulo com testes próprios. Por exemplo, um módulo de “validação de URL” reutilizável.  
- **Plataforma:** Deploy pode ser em Node (Azure Functions/Cloud Run) e Python (Cloud Functions/Run). GitHub + Vercel (para front-end) ou CloudRun em Node foram sugeridos por usuários no contexto Antigravity.

## Segurança  
- **Proteção de Chaves:** Jamais expor as keys em logs/respostas. Usar vault. Limitar permissões por key (e.g., Brave Search key restrita apenas ao host do backend).  
- **SSRF:** Validar URLs (como acima) e usar listas de bloqueio para evitar chamadas a intranets privadas (ex.: 127.0.0.1). Configurar `allowlist` de domínios, quando possível (ex: na *Goggles* do Brave se for o caso).  
- **Injeção de prompt:** Sanitizar todo conteúdo coletado antes de passar ao modelo. Ex.: remover scripts, tags HTML, encerrar strings inesperadas. Modelos já não executam código, mas evitar prompts formados por dados do site que possam quebrar JSON.  
- **Sandbox:** Se usar execução de código ou navegadores, rodar em containers isolados (uso de Docker ou VMs). Células com timeout para evitar loops infinitos. Monitorar outbound.  
- **Rate Limits:** Honrar limites das APIs; implementar throttling por domínio (evitar bloqueio). Detecção de CAPTCHA (alguns sites podem bloquear se raspados demais).  

## Metodologia de Benchmark / Testes  
- **Casos de teste:** Liste queries desafiadoras (base real ou simulada): e.g. nome de cidade + “concursos abertos”; termos negados (“suspenso”, “rejeitado”); concursos de áreas específicas; palavras ambíguas. Para cada, defina “resposta esperada” (vagas ou `nenhum concurso`).  
- **Métricas:** Precisão/Recall das fontes: quantos resultados válidos vs irrelevantes? Taxa de URLs válidas no output; percentagem de saídas fantasiosas. Factualidade: comparar respostas com ground truth (um avaliador humano ou base de dados oficial). Recência: fração de respostas citando fontes publicadas nos últimos *n* dias. Latência total por consulta. Custo por consulta.  
- **Ferramentas:** Automatizar via scripts: alimentar o sistema e comparar outputs. Usar frameworks de teste (pytest/unittest) e planilhas para acompanhar métricas. Incluir métricas genéricas de RAG: diversidade de fontes, cumprimento de citações.  
- **Exemplos onde Gemini falha:** (i) Novo concurso anunciado recentemente (Gemini possivelmente não saber, buscando em cache antigo). (ii) Dois municípios com nomes parecidos (confusão). (iii) Informações desencontradas – ex. site A diz “inscrições abertas”, site B “adiado” (testar detecção de contradição). Documentar cada caso com data e fonte real.  

## Custos e Latência (15/50/100+ cidades)  
Estimativas de componente para diferentes escalas (ordenar 15, 50, 100 cidades):  
- **Número de consultas:** Suponha 1–2 queries por cidade (vagas SP, vagas MG etc). Com 100 cidades, até ~200 consultas/dia.  
- **API Search:** Ex: Brave a $0.005/query → 200 * 0.005 = \$1/dia. Em 15 cidades: 30 * 0.005 = \$0.15/dia. (SerpAPI seria muito mais caro nessa escala).  
- **LLM:** Se usar GPT-3.5-turbo (0.03$/1k tokens), cada resposta (ex. 500 tokens) gasta ~\$0.015. Com 200 consultas e 3 chamadas cada (~600 tokens total) = ~\$3.6/dia. GPT-4 seria >>.  
- **Fetch de páginas:** 200 consultas * supor 3 links cada *digamos* 20ms= 12s CPU/dia (mínimo). Latência de rede (~100ms cada) 600 chamadas ~60s total.  
- **OCR/PDF:** Depende de quantos PDF; se 10% dos links (20 PDF), OCR Tesseract leva ~1s/página. Custo computacional modesto.  
- **Armazenamento:** Pouco (textos e metadata). Vetores 100 cidades * supor 500 docs * 512-d= ~25M floats (<1GB).  
- **Resumo:** Em escala pequena (15 cidades), custos de API = poucos dólares/dia (<< \$100/mês). Em média (50 cidades), dezenas de dólares; grande (100+), centenas (se usar GPT-4 ou muitas queries extras). Latência de busca domina (~200ms * consultas). 

## Escore de Confiança por Evidências  
Cada resposta final deve ter um escore de confiança calculado **com base em evidências**. Componentes sugeridos:  
- **Número de fontes:** mais fontes relevantes = maior confiança (log ou normalizado).  
- **Autoridade das fontes:** média ponderada das pontuações dos domínios (gov, site grande = +1, blog pequeno = -1).  
- **Recência:** se todas as fontes são recentes (ex. <30 dias) soma pontos; fontes antigas perdem pontos.  
- **Consistência:** se fontes concordam (mesmo dado-chave), aumenta confiança; se divergentes, penaliza (ver contradições).  
- **Modelo semântico:** similaridade (cosine) entre resposta do LLM e evidências fonte (quanto mais próxima, mais confiança).  
Uma fórmula possível:  
```
conf = sigmoid( a·numFontes + b·autoridade + c·(1 - idade_norm) + d·consistencia )
```  
Os pesos a,b,c,d definem a importância de cada. **Evitar scores arbitrários:** use probabilidades ou normalizações (0–100%). Por exemplo, % de fontes confiáveis. Ao apresentar, listar fontes com score próprio ajuda o usuário avaliar. 

## Roteiro por Fases e Arquitetura Recomendada  
1. **Prova de Conceito (PoC):** Integrar Brave Search + Parsers. Testar pipeline básico: query->Busca->fetch->LLM. Usar ddgs e Checagem manual. Ajustar formatos de prompts, extrair JSON básico.  
2. **Multi-Engine:** Adicionar SerpAPI/Linkup. Implementar lógica de fallback/mescla.  
3. **Validação/Filtragem:** Construir módulo de validação de URLs; integrar htdocs e PDF extractor (PyMuPDF+OCR).  
4. **RAG Iterativo:** Criar as etapas de decomposição (usando LLM interno) e recuperações múltiplas. Treinar prompt para avaliar contradições.  
5. **Armazenamento e Vetorização:** Configurar Supabase+pgvector. Armazenar chunks de PDFs (O serviço pgvector custa pouco e facilita buscas sem rede). Testar buscas internas via embeddings.  
6. **Segurança e Infra:** Codificar proteção de secrets, rate limit, logs e alertas. Colocar métricas. Usar queue e Workers.  
7. **Teste e Iteração:** Rodar benchmarks (15/50/100 cidades). Ajustar filtros, pesos de scoring. Planejar fases por dificuldade crescente.  
8. **Entrega Final:** Documento arquitetural (proposto abaixo) e refino.

**Arquitetura Final Recomendada (exemplo):**

```mermaid
graph LR
  UI[Front-end (Dashboard React)] --> API{API Backend (Node/Python)} 
  subgraph Busca e Extração
    API --> SVC[Serviço de Busca Múltipla (Brave/Linkup/etc)]
    API --> Crawl[Serviço de Crawling (Playwright/Puppeteer)]
  end
  SVC --> Aggr[Agregador de URLs & Filtragem]
  Crawl --> Aggr
  Aggr --> DB[(Supabase)] 
  subgraph RAG e Modelos
    DB --> Emb[Serviço de Vetorização (pgvector)]
    API --> LLM{LLM Pipeline}
    Emb --> LLM
    LLM --> DB
  end
  DB --> Frontend(Storage de dados)
  subgraph Infra  
    GitHub[CI/CD (GitHub Actions)] 
    GitHub --> API
    Vault[Secret Manager]
    API -->|Keys| Vault
    Scheduler[Cloud Scheduler] --> API
  end
```

Nesta arquitetura, consultas do usuário invocam a API backend. Ele consulta **motores de busca** paralelos (Brave Search API, Linkup, ddgs, etc.) e um serviço de crawling (para páginas dinâmicas e PDFs). Resultados passam por um agregador central que valida URLs (HTTP status, canonicalização) e remove duplicatas. Conteúdo válido é salvo no Supabase (texto extraído, metadados de data). Um sub-sistema de **vetorização** armazena trechos em pgvector para consultas semânticas futuras. O módulo **RAG** consome esses dados: LLMs menores efetuam busca semântica/filtragem, LLMs maiores sintetizam a resposta final com base nas evidências. Toda comunicação com APIs de busca e modelagem usa chaves seguras (Vault). Logs de desempenho (latência, custo) são coletados para ajuste.  

**Conclusão:** Em 2026, construir um motor de busca interno deve focar em **busca viva e validação robusta**. Use APIs modernas (p.ex. Brave Context API) para obter trechos de texto já filtrados e tokenizados. Combine buscas em múltiplos mecanismos para cobertura. Empregue crawling headless só quando necessário, preferindo APIs que retornem conteúdo pronto. A filtragem de fontes (com Goggles ou listas próprias) evita resultados junk. Preserve data temporal de cada fonte (usando metadados ou extração via HeidelTime) para descartar conteúdo obsoleto. Utilize RAG multi-step com LLMs diferenciados para refinar respostas e buscar evidências contradictórias. Em suma, a busca deve ser “em tempo real” e multi-fonte, com redundância e validação sistemáticas, minimizando informações desatualizadas ou errôneas. 

**Fontes:** Documentação oficial (Brave, Azure, Google) e estudos de RAG. Diagramas e tabelas acima sintetizam dados atuais (2025-2026) para cada tecnologia.