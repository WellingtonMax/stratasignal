"""Local CLI. All output paths are explicit and existing files are never replaced."""

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from .analytics import analyze
from .demo import demo_bundle
from .market import import_comex, market_summary
from .report import write_private, write_report
from .schema import InputError, read_json


def serialized(value):
    return json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"


def digest_file(path):
    digest = hashlib.sha256()
    size = 0
    with Path(path).open("rb") as stream:
        stat = stream.fileno()
        import os
        metadata = os.fstat(stat)
        while True:
            block = stream.read(65536)
            if not block:
                break
            size += len(block)
            if size > 64 * 1024 * 1024:
                raise InputError("Documento excede 64 MiB")
            digest.update(block)
    return {"sha256": digest.hexdigest(), "size_bytes": size,
            "filesystem_modified_utc": datetime.fromtimestamp(metadata.st_mtime, timezone.utc).isoformat(),
            "scope": "Metadados do arquivo local; não extrai XMP, OCR, conteúdo, assinatura ou certificação. Data do sistema de arquivos não é data de emissão."}


def parser():
    root = argparse.ArgumentParser(description="StrataSignal — análise privada de abastecimento de minerais críticos")
    commands = root.add_subparsers(dest="command", required=True)
    for name in ("demo", "analyze"):
        command = commands.add_parser(name)
        command.add_argument("--out", required=True, help="Diretório novo para o relatório")
        command.add_argument("--without-ml", action="store_true")
        command.add_argument("--shock-country", default="CN")
        command.add_argument("--shock-days", type=int, default=45)
        command.add_argument("--reduction", type=float, default=1.0)
        if name == "analyze":
            command.add_argument("--input", required=True)
            command.add_argument("--market", help="Snapshot agregado gerado por import-comex")
    sample = commands.add_parser("sample", help="Gerar conjunto sintético editável")
    sample.add_argument("--out", required=True)
    market = commands.add_parser("import-comex", help="Agregar CSV oficial local; não faz downloads")
    market.add_argument("--input", required=True)
    market.add_argument("--out", required=True)
    market.add_argument("--ncm", required=True)
    market.add_argument("--from", dest="start", required=True)
    market.add_argument("--to", dest="end", required=True)
    market.add_argument("--flow", choices=("import", "export"), required=True)
    digest = commands.add_parser("digest", help="Calcular metadados básicos e hash de arquivo local")
    digest.add_argument("--input", required=True)
    digest.add_argument("--out", required=True)
    return root


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        if args.command == "sample":
            write_private(args.out, serialized(demo_bundle()))
            print("Amostra sintética criada.")
        elif args.command == "digest":
            write_private(args.out, serialized(digest_file(args.input)))
            print("Metadados locais criados; autenticidade não verificada.")
        elif args.command == "import-comex":
            snapshot = import_comex(args.input, args.ncm, args.start, args.end, args.flow)
            write_private(args.out, serialized(snapshot))
            print(f"Snapshot criado: {snapshot['source_rows_matched']} linhas selecionadas.")
        else:
            if args.command == "demo":
                data = demo_bundle()
                raw = serialized(data)
                fingerprint = hashlib.sha256(raw.encode()).hexdigest()
            else:
                data, fingerprint = read_json(args.input)
            report = analyze(data, fingerprint, shock_country=args.shock_country, duration_days=args.shock_days,
                             reduction=args.reduction, enable_ml=not args.without_ml)
            if args.command == "analyze" and args.market:
                snapshot, snapshot_hash = read_json(args.market)
                report["market_context"] = market_summary(snapshot, data["as_of"])
                report["market_snapshot_sha256"] = snapshot_hash
            directory = write_report(report, args.out)
            if args.command == "demo":
                write_private(directory / "input.synthetic.json", raw)
            print(f"Relatório criado em {directory / 'report.html'}")
            print("Natureza dos dados:", report["dataset_kind"], "| Modelo:", report["delay_model"]["status"])
        return 0
    except (InputError, OSError, ValueError) as exc:
        # Raw input rows and document contents never enter diagnostics.
        print("Não foi possível concluir: " + (str(exc) if isinstance(exc, InputError) else "verifique formato, permissões e se o destino já existe."), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
