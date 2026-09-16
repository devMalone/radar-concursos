"""
Radar de Concursos — Scanner Inteligente com Gemini IA & Supabase
Monitora concursos, processos seletivos e licitações na região de São José do Rio Preto e interior de SP.
"""

import os
import sys
import json
import re
import urllib.request
import urllib.error
from datetime import datetime

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

# Cidades prioritárias de cobertura (Noroeste Paulista / Região de Rio Preto e Catanduva)
CIDADES_MONITORADAS = [
    "São José do Rio Preto",
    "Catanduva",
    "Mirassol",
    "Potirendaba",
    "Cedral",
    "Bady Bassitt",
    "Votuporanga",
    "Olímpia",
    "Barretos",
    "Bebedouro",
    "Uchoa",
    "Monte Aprazível",
    "Tanabi",
    "Fernandópolis",
    "José Bonifácio"
]

def log(msg):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}")

def consultar_gemini_com_busca():
    """Consulta o Gemini com capacidade de busca no Google para capturar concursos recentes."""
    log("Iniciando varredura com Gemini 3.6 Flash + Google Search...")
    
    ano_atual = datetime.now().year
    cidades_str = ", ".join(CIDADES_MONITORADAS)
    
    prompt = f"""
Você é um especialista em monitoramento de concursos públicos e licitações de bancas organizadoras no estado de São Paulo.
Faça uma pesquisa aprofundada na web para identificar concursos públicos, processos seletivos e licitações de contratação de bancas organizadoras recentes para os seguintes municípios da região de São José do Rio Preto / Catanduva - SP:
{cidades_str}

Ano de referência: {ano_atual} ou notícias recentes dos últimos meses.

Procure por:
1. Editais com inscrições abertas ou prestes a abrir (Prefeituras, Câmaras, Autarquias, SAAE).
2. Licitações para contratação de banca organizadora (Vunesp, IBAM, Avança SP, Consesp, Instituto Consulplan, etc.) que indicam concurso previsto.
3. Concursos em andamento onde as provas já aconteceram ou as inscrições se encerraram e o certame está em fase de gabaritos, recursos ou resultados.
4. Notícias de concursos anunciados ou com comissão formada pelas administrações municipais.
5. Notícias de concursos que foram suspensos, adiados ou cancelados recentemente.

REGRAS OBRIGATÓRIAS DE STATUS:
- "Edital Aberto": use EXCLUSIVAMENTE se as inscrições estiverem abertas hoje e o candidato ainda puder se inscrever.
- "Em Andamento (Recursos / Resultados)": use se as inscrições já fecharam, se as provas já foram aplicadas ou se está em fase de gabarito preliminar, recursos ou convocação de aprovados. NUNCA classifique como "Edital Aberto" se as inscrições já encerraram!
- "Licitação": use quando a prefeitura está contratando a banca examinadora (pregão, dispensa ou aviso de contratação).
- "Previsto": use para comissões formadas ou concursos anunciados sem edital ainda.
- "Cancelado / Suspenso": para certames suspensos por decisões judiciais ou revogados pelo município.

REGRAS OBRIGATÓRIAS DE LINKS:
- NUNCA invente rotas ou URLs genéricas fictícias como /licitacoes ou /concursos se você não verificou que ela existe de fato.
- Retorne APENAS a URL real exata verificada na busca (ex: página da banca examinadora como consulplan.org.br ou vunesp.com.br, ou a página real de serviços do município). Se não tiver o link exato da página interna, forneça o domínio oficial principal da prefeitura (ex: https://www.potirendaba.sp.gov.br).

Retorne EXCLUSIVAMENTE um array JSON (sem blocos de texto ou markdown desnecessários):
[
  {{
    "cidade": "Nome da Cidade",
    "orgao": "Ex: Prefeitura Municipal de Potirendaba",
    "titulo": "Ex: Concurso Público 001/{ano_atual}",
    "status": "Edital Aberto" OU "Em Andamento (Recursos / Resultados)" OU "Licitação" OU "Previsto" OU "Cancelado / Suspenso",
    "cargos": ["Cargo 1", "Cargo 2", "Agente de Licitações"],
    "areas": ["Administrativo", "Licitações", "Educação", "Saúde", "Geral"],
    "salario_resumo": "Ex: R$ 2.400 a R$ 6.800",
    "prazo_inscricao": "Ex: Provas realizadas • Fase de Recursos e Gabaritos ou Inscrições até DD/MM",
    "link_oficial": "URL oficial verificada da banca ou do portal",
    "resumo_ia": "Resumo de 2 a 3 linhas explicando o momento atual do certame (ex: banca organizadora, se provas já ocorreram, se há recursos abertos, etc.)."
  }}
]

Atenção especial para cargos da área de Licitações, Compras, Administrativo, Agente de Trânsito, Fiscal e TI.
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "tools": [
            {"google_search": {}}
        ]
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            
            candidates = res_data.get("candidates", [])
            if not candidates:
                log("Nenhum candidato retornado pelo Gemini.")
                return []
                
            parts = candidates[0].get("content", {}).get("parts", [])
            text_output = ""
            for part in parts:
                if "text" in part:
                    text_output += part["text"]
            
            # Limpa possíveis delimitadores markdown de código ```json ... ```
            cleaned_json = re.sub(r"```json\s*", "", text_output)
            cleaned_json = re.sub(r"```\s*", "", cleaned_json).strip()
            
            # Localiza o primeiro [ e o último ]
            start_idx = cleaned_json.find("[")
            end_idx = cleaned_json.rfind("]")
            
            if start_idx != -1 and end_idx != -1:
                json_str = cleaned_json[start_idx:end_idx + 1]
                concursos = json.loads(json_str)
                log(f"Gemini identificou {len(concursos)} concursos/licitações relevantes.")
                return concursos
            else:
                log("Não foi possível localizar array JSON na resposta do modelo.")
                return []
                
    except Exception as e:
        log(f"Erro ao consultar API do Gemini: {e}")
        return []

def normalizar_id(cidade, orgao, titulo):
    """Gera um slug único e determinístico para o concurso."""
    base = f"{cidade}_{orgao}_{titulo}".lower()
    base = re.sub(r"[^a-z0-9]+", "_", base).strip("_")
    return base[:80]

def buscar_concursos_supabase():
    """Busca concursos já cadastrados no Supabase para comparação."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        log("Credenciais do Supabase não configuradas no ambiente. Rodando em modo local.")
        return {}
        
    url = f"{SUPABASE_URL}/rest/v1/concursos?select=id,status,updated_at"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            dados = json.loads(response.read().decode("utf-8"))
            return {item["id"]: item for item in dados}
    except Exception as e:
        log(f"Aviso ao consultar Supabase: {e}")
        return {}

def salvar_concurso_supabase(item):
    """Insere ou atualiza um concurso no Supabase via upsert."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
        
    url = f"{SUPABASE_URL}/rest/v1/concursos"
    req = urllib.request.Request(
        url,
        data=json.dumps([item]).encode("utf-8"),
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.status in (200, 201)
    except Exception as e:
        log(f"Erro ao salvar concurso no Supabase ({item['id']}): {e}")
        return False

def executar_scanner():
    log("=== INICIANDO RADAR DE CONCURSOS ===")
    
    if not GEMINI_API_KEY:
        log("ERRO: GEMINI_API_KEY não encontrada nas variáveis de ambiente.")
        sys.exit(1)
        
    concursos_encontrados = consultar_gemini_com_busca()
    if not concursos_encontrados:
        log("Varredura finalizada sem novos registros.")
        return
        
    banco_existente = buscar_concursos_supabase()
    
    novos = 0
    atualizados = 0
    inalterados = 0
    
    now_iso = datetime.now().isoformat()
    
    for c in concursos_encontrados:
        c_id = normalizar_id(c.get("cidade", ""), c.get("orgao", ""), c.get("titulo", ""))
        status_atual = c.get("status", "Previsto")
        
        item_banco = banco_existente.get(c_id)
        
        c_payload = {
            "id": c_id,
            "cidade": c.get("cidade", "Interior SP"),
            "orgao": c.get("orgao", "Prefeitura"),
            "titulo": c.get("titulo", "Concurso Público"),
            "status": status_atual,
            "cargos": c.get("cargos", []),
            "areas": c.get("areas", ["Geral"]),
            "salario_resumo": c.get("salario_resumo", "A consultar"),
            "prazo_inscricao": c.get("prazo_inscricao", "Em breve"),
            "link_oficial": c.get("link_oficial", ""),
            "resumo_ia": c.get("resumo_ia", ""),
            "updated_at": now_iso
        }
        
        if not item_banco:
            c_payload["created_at"] = now_iso
            salvar_concurso_supabase(c_payload)
            novos += 1
            log(f"🌟 NOVO CONCURSO: [{c_payload['cidade']}] {c_payload['titulo']} ({c_payload['status']})")
        elif item_banco.get("status") != status_atual:
            salvar_concurso_supabase(c_payload)
            atualizados += 1
            log(f"🔄 STATUS ATUALIZADO: [{c_payload['cidade']}] {item_banco.get('status')} -> {status_atual}")
        else:
            inalterados += 1
            
    log(f"Resumo da execução: {novos} novos, {atualizados} atualizados, {inalterados} inalterados.")
    log("=== RADAR FINALIZADO COM SUCESSO ===")

if __name__ == "__main__":
    executar_scanner()
