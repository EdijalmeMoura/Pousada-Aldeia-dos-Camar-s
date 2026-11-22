#!/usr/bin/env python3
"""Cria um ZIP para extrair diretamente em public_html, sem credenciais ou código-fonte."""
import argparse
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUTPUT = ROOT / "artifacts"


def content(demo: bool) -> str:
    kind = "DEMONSTRAÇÃO LOCAL" if demo else "PRODUÇÃO — REQUER TESTES DO BACKEND"
    return (
        f"HOSPEDAÊ — {kind}\n\n"
        "Instalação na Hostinger Premium Web Hosting:\n"
        "1. No painel Hostinger, abra o Gestor de Ficheiros do domínio.\n"
        "2. Entre em public_html e guarde uma cópia de segurança do site anterior.\n"
        "3. Carregue este ZIP e extraia-o DIRETAMENTE em public_html.\n"
        "4. Confirme que index.html, .htaccess, assets/ e images/ ficam em public_html (sem subpasta extra).\n"
        "5. Abra o domínio e atualize /login para confirmar que as rotas funcionam.\n\n"
        + ("AVISO: os dados desta demonstração ficam apenas no navegador de cada visitante.\n"
           "Não a use para receber reservas reais nem introduza dados reais de hóspedes.\n"
           if demo else
           "Antes de aceitar reservas, aplique as migrações e funções Supabase e teste RLS,\n"
           "reservas e pagamentos num ambiente de ensaio. O ZIP contém apenas o frontend.\n")
        + "Nunca coloque chaves privadas, .env ou ficheiros PHP de instalação em public_html.\n"
    )


def package(demo: bool, build: bool = True) -> Path:
    if build:
        command = ["npm", "run", "build" if demo else "build:production"]
        subprocess.run(command, cwd=ROOT, check=True)
    if not (DIST / "index.html").is_file() or not (DIST / ".htaccess").is_file():
        raise RuntimeError("Build incompleto: faltam dist/index.html ou dist/.htaccess")
    OUTPUT.mkdir(exist_ok=True)
    destination = OUTPUT / ("hospedae-hostinger-DEMONSTRACAO.zip" if demo else "hospedae-hostinger-PRODUCAO.zip")
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
        for path in sorted(DIST.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(DIST)
            if any(part.startswith(".env") for part in relative.parts) or path.is_symlink():
                raise RuntimeError(f"Ficheiro não permitido no build: {relative}")
            archive.write(path, relative.as_posix())
        archive.writestr("LEIA-ME-INSTALACAO.txt", content(demo))
    with zipfile.ZipFile(destination) as archive:
        names = set(archive.namelist())
        if not {"index.html", ".htaccess", "LEIA-ME-INSTALACAO.txt"}.issubset(names):
            destination.unlink()
            raise RuntimeError("O ZIP não contém os ficheiros essenciais")
    return destination


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pacote Hostinger (produção por defeito)")
    parser.add_argument("--demo", action="store_true", help="gera uma demonstração local explicitamente identificada")
    args = parser.parse_args()
    try:
        result = package(args.demo)
        print(f"Pacote gerado: {result.relative_to(ROOT)} ({result.stat().st_size:,} bytes)")
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Pacote não gerado: {error}", file=sys.stderr)
        sys.exit(1)
