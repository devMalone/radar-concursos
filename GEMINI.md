# 📡 Radar de Concursos SP — Diretrizes Arquiteturais & Diagnóstico Estratégico

Este documento consolida o conhecimento absorvido do arquivo de diagnóstico e arquitetura (`Arquitetura Atual e Diagnóstico.md`). Todas as decisões de engenharia, refatorações, consultas de IA e implementações de backend/frontend devem obedecer estritamente a estas diretrizes.

---

## 1. O Diagnóstico Fundamental: Por que Apenas Ajustar Prompts Não Basta?

O diagnóstico técnico identificou os seguintes gargalos estruturais no modelo de busca por IA tradicional:
1. **Dependência de Conhecimento Interno / Cache do Modelo:** LLMs tendem a preencher lacunas de informação recente usando dados de treinamento prévio (ex: tratando concursos de 2024 como se estivessem ocorrendo hoje).
2. **Contaminação por SEO de Cursinhos:** Os motores de busca priorizam páginas de grandes portais comerciais de concursos (Gran, Estratégia, PCI, Nova) com manchetes chamativas antigas (*"Edital publicado!"*), fazendo o modelo confundir matérias de anos anteriores com editais vigentes.
3. **Acoplamento de Busca e Síntese:** Fazer uma única busca na web e pedir para o mesmo LLM simultaneamente encontrar, interpretar, classificar e validar URLs gera alucinações e links inexistentes (ex: rotas `/licitacoes` ou `/concursos` que retornam erro 404).
4. **Descontinuidade de APIs Antigas:** O Google Custom Search (CS) possui cota restrita e horizonte de descontinuação (Jan/2027), exigindo migração planejada para motores modernos focados em RAG.

**Conclusão Operacional:** A solução definitiva exige **separação clara entre Busca, Extração, Validação e Síntese**, usando múltiplos motores e barreiras determinísticas de código.

---

## 2. Princípios de Engenharia Mandatórios

### A. Separação Estrita de Responsabilidades (Pipeline Desacoplado)
* **Passo 1 (Busca):** Obter links e trechos brutos de múltiplos motores web (Brave Search API, SerpAPI, Linkup, DuckDuckGo ddgs).
* **Passo 2 (Extração & Limpeza):** Fazer download do HTML ou PDF real do edital/diário oficial (usando `requests`, Playwright quando há JavaScript complexo, ou PyMuPDF/pdfplumber para PDFs).
* **Passo 3 (Validação & Raciocínio Temporal):** Extrair datas explícitas (`Last-Modified`, regex de datas de publicação e de encerramento das inscrições) e testar status HTTP (200 OK vs 404).
* **Passo 4 (Síntese & Classificação):** O LLM recebe apenas evidências documentadas e validadas, proibido de inferir URLs ou inventar fatos ausentes no texto.

### B. Rigor Temporal & Direito Administrativo (Art. 37 da CF/88)
* **Data Atual Oblíqua e Obrigatória:** Toda consulta deve injetar a data presente exata (`DD/MM/AAAA`).
* **Vigência Legal e Cadastro de Reserva:** Concursos homologados possuem validade de **2 anos (prorrogáveis por mais 2)**. Enquanto um concurso estiver vigente com candidatos no cadastro de reserva (ex: Concurso Geral Vunesp 01/2025 de Rio Preto ou GCM 01/2024 em Curso de Formação), a administração pública **não abre novo concurso para os mesmos cargos**.
* **Proibição de Falsos "Previstos":** É terminantemente proibido classificar um certame como "Previsto" ou alegar que a prefeitura "está estudando novo certame" sem ato oficial comprovado no Diário Oficial (portaria de comissão organizadora ou autorização expressa do Prefeito).
* **Definição Estrita de "Edital Aberto":** Permitido **única e exclusivamente** se a data final de inscrição for igual ou posterior ao dia de hoje. Se as provas já foram realizadas ou as inscrições fecharam, o status obrigatório é `Em Andamento (Recursos / Gabarito)` ou `Encerrado`.

### C. Estratégia Multi-Engine & Autoridade de Fontes
* **Diversificação de Motores:** Não depender de um único buscador.
  * *Brave Search API:* Motor primário com filtragem por recência (`freshness`), 5.000 consultas/mês grátis, modo LLM Context e suporte a *Goggles* (priorização de sites oficiais `.gov.br` e bancas organizadoras).
  * *SerpAPI / Serper / Linkup:* Motores secundários para redundância e desempate.
  * *Bibliotecas Locais (`ddgs`):* Opção complementar sem custo para consultas de apoio.
* **Prioridade de Domínios:**
  1. Bancas examinadoras oficiais reconhecidas (Vunesp, IBAM, Consulplan, Consesp, FCC, Cebraspe).
  2. Diários Oficiais dos Municípios e Portais da Transparência oficiais.
  3. Páginas institucionais dos órgãos municipais.
  4. Descarte ou penalização severa de blogs sensacionalistas sem link do edital.

### D. Validação Funcional de URLs (Zero Links Quebrados)
* Todo link retornado deve ser verificado contra:
  1. Protocolo válido e ausência de rotas deduzidas logicamente pelo LLM.
  2. Checagem de status HTTP (200 OK).
  3. Fallback determinístico: caso a URL da IA seja inválida ou vazia, o sistema deve substituir pelo portal oficial comprovado no catálogo [`js/portais.js`](file:///C:/Users/Malone/OneDrive/Área%20de%20Trabalho/Antigravity/Utilidades/Radar%20de%20Concursos/js/portais.js).

### E. Pipeline RAG: Fast Path vs Deep Path
* **Fast Path (Baixa Latência):** Para consultas frequentes e cidades já mapeadas, responder utilizando o cache local e banco estruturado (Supabase), com sincronização em segundo plano.
* **Deep Path (Alta Factualidade):** Para varreduras amplas ou sob demanda detalhada:
  1. Decomposição da consulta em subqueries (ex: `"Prefeitura de Rio Preto" concurso "Edital 2025" Vunesp`).
  2. Busca adversarial (ex: pesquisar termos como `"cancelado"`, `"suspenso"`, `"retificação"` para checar contradições antes de emitir a resposta).
  3. Cálculo de escore de confiança baseado no número de fontes oficiais que confirmam o fato.

---

## 3. Roteiro de Implementação Estratégica (Roadmap)

1. **Fase 1 (Atual - Concluída):** Trava temporal anti-anacronismo em prompts, sanitizador em JavaScript e Python (`sanitizarItemConcurso`), remoção de falsas previsões e correção dos links reais para bancas oficiais.
2. **Fase 2 (Multi-Engine & Brave Search):** Integração opcional da Brave Search API no `scanner.py` com Goggles direcionados a diários oficiais e bancas, reduzindo dependência exclusiva do Google Grounding.
3. **Fase 3 (Extrator de PDFs & Diários Oficiais):** Implementação de leitor de DOE via PyMuPDF/pdfplumber no pipeline de background, identificando portarias de contratação de bancas diretamente nos atos oficiais.
4. **Fase 4 (Vetorização & Armazenamento RAG):** Uso de `pgvector` no Supabase para busca semântica de matérias do edital para o gerador de planos de estudo.

---

> Todas as alterações de código no projeto devem respeitar estas diretrizes de auditoria pública, fidelidade temporal e confiabilidade de links.
