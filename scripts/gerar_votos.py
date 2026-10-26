#!/usr/bin/env python3
"""
Gera data/votos.json com o total de votos de cada deputado federal e senador,
a partir dos arquivos oficiais do TSE (Portal de Dados Abertos).

Como usar (precisa só do Python 3, sem instalar nada):
    python scripts/gerar_votos.py              # baixa 2018 e 2022 (mandatos atuais)
    python scripts/gerar_votos.py 2026         # depois que o TSE publicar 2026 (Congresso de 2027)

Por que 2018 e 2022?  Os deputados atuais foram eleitos em 2022.
Os senadores têm mandato de 8 anos: metade foi eleita em 2018 e metade em 2022.

O arquivo do TSE é grande (centenas de MB). Rode no seu computador, não no servidor.
"""
import csv
import io
import json
import os
import sys
import unicodedata
import urllib.request
import zipfile

URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_{ano}.zip"
CARGOS = {"DEPUTADO FEDERAL", "SENADOR"}
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "votos.json")


def normalizar(texto):
    """Mesma regra do site (js/politicos.js): sem acento, maiúsculas, só letras."""
    t = unicodedata.normalize("NFD", texto or "")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").upper()
    t = "".join(c if "A" <= c <= "Z" or c == " " else "" for c in t)
    return " ".join(t.split())


def coluna_votos(cabecalho):
    for nome in ("QT_VOTOS_NOMINAIS_VALIDOS", "QT_VOTOS_NOMINAIS"):
        if nome in cabecalho:
            return nome
    raise ValueError("Coluna de votos não encontrada. Colunas: %s" % ", ".join(cabecalho))


def somar_arquivo(arquivo_csv, ano, totais):
    leitor = csv.DictReader(io.TextIOWrapper(arquivo_csv, encoding="latin-1"), delimiter=";")
    col = coluna_votos(leitor.fieldnames)
    for linha in leitor:
        cargo = (linha.get("DS_CARGO") or "").upper().strip()
        if cargo not in CARGOS or linha.get("NR_TURNO", "1") != "1":
            continue
        uf = linha["SG_UF"].strip()
        chave_id = (cargo, uf, linha.get("SQ_CANDIDATO") or linha["NM_CANDIDATO"])
        try:
            votos = int(linha[col] or 0)
        except ValueError:
            votos = 0
        item = totais.setdefault(chave_id, {
            "cargo": cargo, "uf": uf, "ano": ano,
            "urna": linha.get("NM_URNA_CANDIDATO", ""),
            "nome": linha.get("NM_CANDIDATO", ""),
            "partido": linha.get("SG_PARTIDO", ""),
            "situacao": linha.get("DS_SIT_TOT_TURNO", ""),
            "votos": 0,
        })
        item["votos"] += votos


def processar_ano(ano, zip_local=None):
    if zip_local:
        dados = open(zip_local, "rb").read()
    else:
        url = URL.format(ano=ano)
        print("Baixando", url, "(pode demorar alguns minutos)…")
        with urllib.request.urlopen(url) as r:
            dados = r.read()
    totais = {}
    with zipfile.ZipFile(io.BytesIO(dados)) as z:
        nomes = [n for n in z.namelist() if n.lower().endswith(".csv")]
        # o zip traz um arquivo por UF e às vezes um "_BRASIL"; usamos só os por UF para não contar em dobro
        por_uf = [n for n in nomes if "BRASIL" not in n.upper()] or nomes
        for nome in por_uf:
            with z.open(nome) as f:
                somar_arquivo(f, ano, totais)
    print("  %d candidatos somados em %d" % (len(totais), ano))
    return totais


def montar_saida(lista_totais):
    saida = {}
    for totais in lista_totais:  # anos mais recentes por último sobrescrevem
        for item in totais.values():
            registro = {k: item[k] for k in ("votos", "ano", "partido", "situacao")}
            for nome in (item["urna"], item["nome"]):
                if nome:
                    chave = "%s|%s|%s" % (item["cargo"], item["uf"], normalizar(nome))
                    atual = saida.get(chave)
                    if not atual or atual["ano"] < item["ano"] or (atual["ano"] == item["ano"] and atual["votos"] < item["votos"]):
                        saida[chave] = registro
    return saida


def main(args):
    anos = sorted(int(a) for a in args if a.isdigit()) or [2018, 2022]
    resultados = [processar_ano(a) for a in anos]
    saida = montar_saida(resultados)
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))
    print("Pronto! %d registros salvos em %s" % (len(saida), os.path.normpath(SAIDA)))


if __name__ == "__main__":
    main(sys.argv[1:])
