"""Curated release notes matched to official mineral news feeds."""

import hashlib
from datetime import datetime, timezone

# TreeBuilder consumes events only. The Expat reader below rejects DTDs and external entities.
from xml.etree import ElementTree  # nosemgrep: python.lang.security.use-defused-xml.use-defused-xml
from xml.parsers import expat  # nosemgrep: python.lang.security.use-defused-xml.use-defused-xml

from .schema import InputError

SOURCE = "Natural Resources Canada"
FEED_URL = (
    "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=naturalresourcescanada"
    "&sort=publishedDate&orderBy=desc&publishedDate%3E=2021-07-23&pick=50"
    "&format=atom&atomtitle=Natural%20Resources%20Canada"
)
ARTICLE_ROOT = "https://www.canada.ca/en/natural-resources-canada/news/"
CANADA_ARCHIVE_FEED_URL = (
    "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=naturalresourcescanada"
    "&sort=publishedDate&orderBy=desc&publishedDate%3C=2025-03-31&pick=50"
    "&format=atom&atomtitle=Natural%20Resources%20Canada"
)
CANADA_ARCHIVE_ARTICLE = ARTICLE_ROOT + "2025/03/investing-to-make-canada-a-global-critical-minerals-superpower0.html"
CANADA_ARCHIVE_EDITORIAL = {
    CANADA_ARCHIVE_ARTICLE: {
        "title": "Canadá propôs estender incentivo à exploração de minerais críticos",
        "summary": (
            "Na convenção PDAC de 2025, o governo canadense anunciou a intenção de estender "
            "o crédito fiscal para despesas elegíveis de exploração. Grafita e lítio figuravam entre os minerais abrangidos."
        ),
        "possible_impact": (
            "A medida proposta poderia facilitar o financiamento da pesquisa mineral. "
            "O comunicado registra a proposta e deixa em aberto o efeito sobre a oferta."
        ),
        "published_on": "2025-03-03",
        "event_on": "2025-03-03",
        "ncm": "25041000",
        "related_ncms": ["28369100"],
        "countries": ["Canadá"],
        "companies": [],
        "topic": "Política mineral",
    },
}
MDIC_SOURCE = "MDIC · Brasil"
MDIC_ARCHIVE = "https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/setembro"
MDIC_FEED_URL = MDIC_ARCHIVE + "/RSS"
MDIC_ARTICLE = MDIC_ARCHIVE + "/presidente-sanciona-politica-nacional-de-minerais-criticos-e-estrategicos"
MDIC_NOVEMBER_ARCHIVE = "https://www.gov.br/mdic/pt-br/assuntos/noticias/2026/novembro"
MDIC_NOVEMBER_FEED_URL = MDIC_NOVEMBER_ARCHIVE + "/RSS"
MDIC_NOVEMBER_ARTICLE = MDIC_NOVEMBER_ARCHIVE + "/governo-federal-aprova-lista-brasileira-de-minerais-criticos-e-estrategicos"
MDIC_NOVEMBER_SEMINAR = MDIC_NOVEMBER_ARCHIVE + "/agenda-de-minerais-criticos-e-estrategicos-e-prioridade-absoluta-para-o-governo-afirma-marcio-elias"
MDIC_EDITORIAL = {
    MDIC_FEED_URL: ({
        "url": MDIC_ARTICLE,
        "title": "Brasil estabelece política para minerais críticos e estratégicos",
        "summary": (
            "A sanção da política nacional criou instrumentos para desenvolver cadeias minerais no Brasil, "
            "da pesquisa ao beneficiamento e à transformação. O comunicado trata da política setorial."
        ),
        "possible_impact": (
            "A política pode influenciar investimentos na cadeia da grafita. "
            "O efeito depende das medidas de implementação e dos projetos que avancem."
        ),
        "published_on": "2026-09-16",
        "ncm": "25041000",
    },),
    MDIC_NOVEMBER_FEED_URL: ({
        "url": MDIC_NOVEMBER_ARTICLE,
        "title": "Grafita e lítio entram no grupo de maior prioridade da lista federal",
        "summary": (
            "O CIMCE aprovou uma lista de 27 minerais. Grafita e lítio ficaram no grupo "
            "de maior prioridade da política nacional de minerais críticos e estratégicos."
        ),
        "possible_impact": (
            "A classificação pode orientar o fomento a projetos. O efeito sobre investimentos e oferta "
            "dependerá das medidas de implementação e da execução dos projetos."
        ),
        "published_on": "2026-11-05",
        "ncm": "25041000",
        "related_ncms": ["28369100"],
    }, {
        "url": MDIC_NOVEMBER_SEMINAR,
        "title": "MDIC apresenta próximos passos da política mineral em seminário na Câmara",
        "summary": (
            "O ministério apresentou temas para a regulamentação da política mineral, entre eles a lista "
            "de minerais atendidos, as diretrizes de industrialização e a triagem de investimentos. "
            "Grafita e lítio foram citados no debate."
        ),
        "possible_impact": (
            "As regras podem orientar quais projetos entram nas prioridades do governo. "
            "O efeito sobre a indústria depende da regulamentação e da execução."
        ),
        "published_on": "2026-11-03",
        "ncm": "25041000",
        "related_ncms": ["28369100"],
    }),
}
RDF = "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}"
RSS = "{http://purl.org/rss/1.0/}"
DC = "{http://purl.org/dc/elements/1.1/}"
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


def _reject_xml_declaration(*_):
    raise InputError("Declaração XML proibida no feed de notícias")


def _expanded_name(name):
    # Expat emits uri}local. ElementTree looks up {uri}local.
    return "{" + name if "}" in name else name


def _read_xml(raw):
    if len(raw) > MAX_FEED_BYTES:
        raise InputError("Feed de notícias excede 512 KiB")
    tree = ElementTree.TreeBuilder()
    parser = expat.ParserCreate(namespace_separator="}")
    parser.StartDoctypeDeclHandler = _reject_xml_declaration
    parser.ExternalEntityRefHandler = _reject_xml_declaration

    def start(name, attrs):
        tree.start(_expanded_name(name), {_expanded_name(key): value for key, value in attrs.items()})

    parser.StartElementHandler = start
    parser.EndElementHandler = lambda name: tree.end(_expanded_name(name))
    parser.CharacterDataHandler = tree.data
    try:
        parser.Parse(raw.decode("utf-8"), True)
    except (UnicodeDecodeError, expat.ExpatError) as error:
        raise InputError("Feed de notícias inválido") from error
    return tree.close()


def parse_feed(raw, fetched_at, *, editorial=EDITORIAL):
    """Read bounded Atom metadata. All displayed text and links are editorially reviewed."""
    feed = _read_xml(raw)
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
        for url, item in editorial.items()
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


def parse_mdic_feed(raw, fetched_at, *, feed_url=MDIC_FEED_URL):
    """Match reviewed Brazilian policy announcements to their official monthly RSS archive."""
    feed = _read_xml(raw)
    channel = feed.find(RSS + "channel")
    editorial = MDIC_EDITORIAL.get(feed_url)
    if editorial is None or feed.tag != RDF + "RDF" or channel is None or channel.get(RDF + "about") != feed_url:
        raise InputError("Identidade inesperada no feed do MDIC")
    entries = feed.findall(RSS + "item")
    if len(entries) > MAX_FEED_ENTRIES:
        raise InputError("Feed do MDIC excede o limite de entradas")
    items = []
    for story in editorial:
        article = story["url"]
        matched = [
            entry for entry in entries
            if entry.get(RDF + "about") == article and entry.findtext(RSS + "link") == article
        ]
        if not matched:
            continue
        published_on = story["published_on"]
        for entry in matched:
            try:
                date = datetime.fromisoformat(entry.findtext(DC + "date", ""))
                if date.utcoffset() is None or date.date().isoformat() != published_on or date > fetched_at:
                    raise ValueError
            except ValueError as error:
                raise InputError("Data de publicação divergente no feed do MDIC") from error
        items.append({
            **story,
            "source_id": "mdic",
            "feed_url": feed_url,
            "event_on": published_on,
            "countries": ["Brasil"],
            "companies": [],
            "topic": "Política mineral",
        })
    return {
        "source": MDIC_SOURCE,
        "feed_url": feed_url,
        "feed_updated_at": None,
        "fetched_at": fetched_at.isoformat(timespec="seconds"),
        "feed_sha256": hashlib.sha256(raw).hexdigest(),
        "feed_entries": len(entries),
    }, items
