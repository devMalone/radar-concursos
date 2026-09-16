---
trigger: always_on
description: Diretrizes de auditoria pública, temporalidade anti-anacronismo e separação de pipeline do Radar de Concursos SP
---

# Regras de Arquitetura e Diagnóstico — Radar de Concursos SP

## 1. Separação de Pipeline (Busca != Validação != Síntese)
- Não confiar na busca única do LLM para descobrir, verificar e validar URLs em uma só etapa.
- Tratar dados externos como não confiáveis até que passem por validação de status HTTP, checagem de domínio oficial e extração de datas.

## 2. Temporalidade e Vigência Constitucional (CF/88 art. 37)
- Sempre injetar a data atual explícita nas consultas.
- Concursos com validade vigente (2 anos + 2 anos) ou com candidatos em fases de homologação/curso de formação/nomeação não podem ser classificados como "Previstos", a menos que haja portaria expressa no Diário Oficial autorizando novo concurso.
- "Edital Aberto" só é admitido quando o prazo de inscrição estiver formalmente ativo hoje. Editais de anos anteriores já encerrados devem ser classificados como "Em Andamento (Recursos / Gabarito)" ou "Encerrados".

## 3. Integridade de Links
- Links oficiais devem apontar para a banca organizadora ou portal oficial comprovado.
- Nenhuma URL fictícia ou deduzida pela IA (ex: `/licitacoes`, `/concursos-2024`) pode ser enviada ao usuário. Fallback obrigatório para `PORTAIS_CIDADES`.

## 4. Multi-Engine e Autoridade de Fontes
- Priorizar diários oficiais e bancas examinadoras (Vunesp, IBAM, Consulplan, Consesp).
- Empregar arquitetura multi-motor (Brave Search API com Goggles e recência, SerpAPI, `ddgs`) para eliminar ponto único de falha.
