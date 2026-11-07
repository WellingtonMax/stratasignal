"""Curated release notes matched to the official Natural Resources Canada feed."""

import hashlib
from datetime import datetime, timezone
from xml.etree import ElementTree

from .schema import InputError

SOURCE = "Natural Resources Canada"
FEED_URL = (
    "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=naturalresourcescanada"
    "&sort=publishedDate&orderBy=desc&publishedDate%3E=2021-07-23&pick=50"
    "&format=atom&atomtitle=Natural%20Resources%20Canada"
)
ARTICLE_ROOT = "https://www.canada.ca/en/natural-resources-canada/news/"
MAX_FEED_BYTES = 512 * 1024
MAX_FEED_ENTRIES = 50
ATOM = "{http://www.w3.org/2005/Atom}"

# Reviewed publication and event dates come from the articles, independently of Atom's updated field.
EDITORIAL = {
    ARTICLE_ROOT + "2026/10/canada-invests-to-unlock-lithium-potential-and-improve-connectivity-and-industry-in-northern-quebec.html": {
        "title": "Projeto de lítio no Quebec recebe apoio para acesso rodoviário",
        "summary": (
            "O governo canadense anunciou mais de C$ 1,2 milhão para recuperar cerca de 20 km "
            "da estrada que dá acesso ao projeto Shaakichiuwaanaan, no norte do Quebec."
        ),
        "possible_impact": (
            "Uma estrada mais confiável pode reduzir riscos de transporte. Qualquer efeito sobre "
            "a oferta de lítio depende do avanço do projeto."
        ),
        "published_on": "2026-10-28",
        "event_on": "2026-10-28",
        "ncm": "28369100",
        "countries": ["Canadá"],
        "companies": ["Lithium Innova Inc.", "PMET Resources Inc."],
        "topic": "Logística",
    },
    ARTICLE_ROOT + "2026/08/canada-and-chile-advance-critical-minerals-partnership-to-diversify-trade-grow-our-economy-and-create-jobs.html": {
        "title": "Canadá e Chile apresentam iniciativas de cooperação em mineração",
        "summary": (
            "O Canadá apresentou iniciativas de capacitação e inovação na conferência de mineração "
            "em Santiago. O comunicado cita o lítio entre os minerais produzidos pelo Chile."
        ),
        "possible_impact": (
            "A cooperação pode facilitar investimentos no setor. O efeito sobre a oferta de lítio "
            "depende de projetos específicos e ainda é incerto."
        ),
        "published_on": "2026-08-28",
        "event_on": None,
        "ncm": "28369100",
        "countries": ["Canadá", "Chile"],
        "companies": [],
        "topic": "Política e cooperação",
    },
}


def parse_feed(raw, fetched_at):
    """Read bounded Atom metadata. All displayed text and links are editorially reviewed."""
    if len(raw) > MAX_FEED_BYTES:
        raise InputError("Feed do Natural Resources Canada excede 512 KiB")
    try:
        xml = raw.decode("utf-8")
        if "<!DOCTYPE" in xml or "<!ENTITY" in xml:
            raise InputError("Declaração XML proibida no feed de notícias")
        feed = ElementTree.fromstring(xml)
    except (UnicodeDecodeError, ElementTree.ParseError, ValueError) as error:
        raise InputError("Feed de notícias inválido") from error
    if feed.tag != ATOM + "feed" or feed.findtext(ATOM + "title") != SOURCE:
        raise InputError("Identidade inesperada no feed de notícias")
    try:
        updated = datetime.fromisoformat(feed.findtext(ATOM + "updated", ""))
        if updated.utcoffset() is None or updated > fetched_at:
            raise ValueError
    except ValueError as error:
        raise InputError("Atualização inválida no feed de notícias") from error

    entries = feed.findall(ATOM + "entry")
    if len(entries) > MAX_FEED_ENTRIES:
        raise InputError("Feed de notícias excede o limite de entradas")
    observed = {
        link.get("href")
        for entry in entries
        for link in entry.findall(ATOM + "link")
        if link.get("rel", "alternate") == "alternate" and link.get("href") == entry.findtext(ATOM + "id")
    }
    items = [
        {"url": url, **item}
        for url, item in EDITORIAL.items()
        if url in observed and item["published_on"] <= updated.date().isoformat()
    ]
    items.sort(key=lambda item: item["published_on"], reverse=True)
    return {
        "schema_version": 1,
        "dataset_kind": "public_curated_news",
        "source": SOURCE,
        "feed_updated_at": updated.astimezone(timezone.utc).isoformat(timespec="seconds"),
        "fetched_at": fetched_at.isoformat(timespec="seconds"),
        "feed_sha256": hashlib.sha256(raw).hexdigest(),
        "feed_entries": len(entries),
        "items": items,
    }
