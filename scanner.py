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
    
    data_hoje_str = datetime.now().strftime('%d/%m/%Y')
    prompt = f"""
Você é um auditor e pesquisador sênior especializado em diários oficiais e concursos públicos no estado de São Paulo.
Faça uma pesquisa rigorosa na web com o Google Search para identificar concursos públicos, processos seletivos e licitações de contratação de bancas organizadoras para os seguintes municípios da região de São José do Rio Preto / Catanduva - SP:
{cidades_str}

DATA EXATA DE REFERÊNCIA HOJE: {data_hoje_str} (Ano atual: {ano_atual}).

⚠️ DIRETRIZES DE AUDITORIA PÚBLICA E ANTI-ALUCINAÇÃO (MÁXIMA RIGIDEZ):
1. VIGÊNCIA DE CONCURSOS E CADASTRO DE RESERVA (CF/88 art. 37):
   - Concursos homologados possuem validade legal de 2 anos (prorrogáveis por mais 2).
   - Enquanto um concurso estiver vigente (como o Concurso Geral nº 01/2025 da Vunesp em Rio Preto com 506 vagas, ou o Concurso GCM nº 01/2024 da Vunesp em fase de Curso de Formação), o município convoca os aprovados e NÃO pode abrir novo concurso para os mesmos cargos.
   - NUNCA invente que a prefeitura "está estudando novo certame" ou classifique como "Previsto" sem comprovação documental no Diário Oficial (portaria de comissão organizadora ou autorização expressa do Prefeito).
   - Se o concurso recente estiver vigente ou em etapas de nomeação/curso de formação, relate a realidade com precisão: que o concurso está em andamento/vigente chamando os aprovados, e que não há novo certame oficialmente autorizado.
2. VERIFICAÇÃO RIGOROSA DO STATUS:
   - "Edital Aberto": EXCLUSIVAMENTE para certames onde as inscrições estejam formalmente abertas HOJE para novos candidatos (data final >= {data_hoje_str}).
   - "Em Andamento (Recursos / Gabarito)": Use para certames cujas provas já foram realizadas ou inscrições fecharam, e estão em fase de recursos, classificação, curso de formação ou convocações.
   - "Licitação": Quando o município abriu processo formal no Diário Oficial para contratar banca examinadora (pregão ou dispensa).
   - "Previsto": SOMENTE com ato oficial de comissão formada publicado em Diário Oficial.
   - "Cancelado / Suspenso": Certames com atos revogados ou suspensos judicialmente.

⚠️ REGRAS DE LINKS FUNCIONAIS (PROIBIDO LINKS QUEBRADOS):
- Retorne APENAS links reais e acessíveis da banca examinadora (ex: vunesp.com.br, ibamsp-concursos.org.br, institutoconsulplan.org.br) ou a página oficial de concursos da prefeitura.
- NUNCA invente rotas ou URLs falsas (ex: /licitacoes, /concursos-2024) que resultem em erro 404.

Retorne EXCLUSIVAMENTE um array JSON:
[
  {{
    "cidade": "Nome da Cidade",
    "orgao": "Ex: Prefeitura Municipal de Catanduva",
    "titulo": "Título oficial e específico do concurso ou processo seletivo",
    "status": "Edital Aberto" OU "Em Andamento (Recursos / Gabarito)" OU "Licitação" OU "Previsto" OU "Cancelado / Suspenso",
    "cargos": ["Cargo 1", "Cargo 2"],
    "areas": ["Administrativo", "Licitações", "Educação", "Segurança"],
    "salario_resumo": "Ex: R$ 2.400 a R$ 6.800",
    "prazo_inscricao": "Ex: Inscrições abertas até DD/MM/AAAA OU Provas realizadas • Fase de Recursos",
    "link_oficial": "URL oficial verificada da banca ou do portal",
    "resumo_ia": "Resumo de 2 a 3 linhas explicando a banca, a situação real de datas e o momento exato do certame."
  }}
]
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

                # Sanitização defensiva contra anacronismos
                concursos_sanitizados = []
                for item in concursos:
                    texto = f"{item.get('titulo', '')} {item.get('prazo_inscricao', '')} {item.get('resumo_ia', '')}".lower()
                    if item.get("status") == "Edital Aberto":
                        if any(w in texto for w in ["2024", "2023", "2022", "encerrad", "provas realizadas", "provas aplicadas", "ocorreu em", "já ocorreram", "classificação"]):
                            if any(w in texto for w in ["previsto", "estudos", "planeja", "novas vagas", "expansão"]):
                                item["status"] = "Previsto"
                            else:
                                item["status"] = "Em Andamento (Recursos / Gabarito)"
                    concursos_sanitizados.append(item)

                log(f"Gemini identificou {len(concursos_sanitizados)} concursos/licitações relevantes e validados.")
                return concursos_sanitizados
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
