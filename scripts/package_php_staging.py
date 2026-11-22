#!/usr/bin/env python3
"""Pacote de ensaio PHP, sem ficheiros privados nem estado de produção."""
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
API = ROOT / "backend" / "public" / "api"
OUTPUT = ROOT / "artifacts" / "hospedae-PHP-ENSAIO.zip"


def staging_base(value: str) -> str:
    if not re.fullmatch(r"/(?:[a-z0-9-]+/)*(?:test|staging)/", value):
        raise ValueError("VITE_BASE_PATH deve ser uma subpasta explícita /test/ ou /staging/ (pode ter prefixos).")
    return value


def package(base: str, build: bool = True) -> Path:
    base = staging_base(base)
    # Um ambiente Vite com chave Supabase poderia incluí-la acidentalmente no bundle.
    if any(os.environ.get(k) for k in ("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")):
        raise ValueError("Remova VITE_SUPABASE_* do ambiente antes de gerar o pacote PHP.")
    for filename in (".env", ".env.local", ".env.production", ".env.production.local"):
        envfile = ROOT / filename
        if envfile.exists() and re.search(r"^\s*VITE_SUPABASE_(?:URL|ANON_KEY)\s*=", envfile.read_text(), re.M):
            raise ValueError(f"Remova VITE_SUPABASE_* de {filename} antes do build PHP.")
    if build:
        subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True,
                       env={**os.environ, "VITE_BACKEND": "php", "VITE_BASE_PATH": base})
    html = (DIST / "index.html").read_text() if (DIST / "index.html").is_file() else ""
    if not (DIST / ".htaccess").is_file() or f'{base}assets/' not in html or f'{base}images/' not in html:
        raise ValueError("Build PHP na subpasta incorreto ou incompleto.")
    php_files = sorted(API.glob("*.php"))
    if not php_files or not (API / "index.php").is_file():
        raise ValueError("Endpoints PHP em falta.")
    OUTPUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
        for path in sorted(DIST.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(DIST)
            if path.is_symlink() or any(part.startswith(".env") for part in rel.parts) or rel.parts[0] == "api":
                raise ValueError(f"Ficheiro não permitido: {rel}")
            archive.write(path, rel.as_posix())
        for path in php_files:
            if path.is_symlink():
                raise ValueError(f"Endpoint não permitido: {path.name}")
            archive.write(path, f"api/{path.name}")
        archive.writestr("LEIA-ME-ENSAIO.txt", (
            "HOSPEDAÊ — SOMENTE ENSAIO PHP/MYSQL\n"
            "NÃO PUBLICAR NO SITE REAL NEM USAR DADOS REAIS.\n\n"
            f"Extraia este ZIP na pasta public_html{base} de um domínio de TESTES separado.\n"
            "O ZIP contém apenas o frontend e os endpoints PHP públicos.\n"
            "Crie uma base MySQL descartável, aplique as migrações backend/sql/001 a 006\n"
            "e guarde config.php FORA de public_html. Configure HOSPEDAE_CONFIG_PATH\n"
            "no servidor com o caminho absoluto para esse ficheiro privado; configure\n"
            "trusted_origin e cookie_path corretos. Esses passos NÃO são automáticos.\n"
            "Verifique /api/index.php?action=health no endereço de ensaio.\n"
            "Corra os ensaios descritos em backend/README.md antes de qualquer publicação.\n"
            "O ZIP NÃO contém migrações, configuração privada nem instalador de produção.\n"
        ))
    with zipfile.ZipFile(OUTPUT) as archive:
        if not {"index.html", ".htaccess", "api/index.php", "LEIA-ME-ENSAIO.txt"}.issubset(archive.namelist()):
            OUTPUT.unlink()
            raise ValueError("Pacote incompleto.")
    return OUTPUT


if __name__ == "__main__":
    try:
        result = package(os.environ.get("VITE_BASE_PATH", ""))
        print(f"Pacote de ENSAIO: {result.relative_to(ROOT)} ({result.stat().st_size:,} bytes)")
    except (ValueError, subprocess.CalledProcessError) as error:
        print(f"Pacote não gerado: {error}", file=sys.stderr)
        sys.exit(1)
