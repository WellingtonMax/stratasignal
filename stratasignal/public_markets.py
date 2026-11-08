"""Reviewed official export totals and the selection of listed companies."""

SNAPSHOT = {
    "schema_version": 1,
    "dataset_kind": "public_markets_snapshot",
    "mineral": "iron_ore",
    "reviewed_on": "2026-11-07",
    "countries": {
        "BR": {
            "published_on": "2026-11-06",
            "source": "SECEX/MDIC · Resultados do Comércio Exterior Brasileiro",
            "source_url": "https://balanca.economia.gov.br/balanca/publicacoes_dados_consolidados/pg.html",
            "trade_currency": "USD",
            "value_basis": "FOB",
            "volume_unit": "toneladas",
            "exchange": "B3",
            "exchange_symbol": "BMFBOVESPA",
            "quote_currency": "BRL",
            "periods": [
                {"label": "Jan–out/2025", "value_millions": 23512.9, "volume_mt": 341.9},
                {"label": "Jan–out/2026", "value_millions": 22182.6, "volume_mt": 334.3},
            ],
            "assets": [
                {"symbol": "VALE3", "name": "Vale"},
                {"symbol": "CMIN3", "name": "CSN Mineração"},
            ],
        },
        "AU": {
            "published_on": "2026-10-02",
            "source": "Commonwealth da Austrália · DISR · REQ set/2026, tabela 3.3 (CC BY 4.0)",
            "source_url": "https://www.industry.gov.au/sites/default/files/2026-10/resources-and-energy-quarterly-september-2026.pdf#page=39",
            "trade_currency": "AUD",
            "value_basis": "valores correntes",
            "volume_unit": "toneladas secas",
            "exchange": "ASX",
            "exchange_symbol": "ASX",
            "quote_currency": "AUD",
            "periods": [
                {"label": "2024–25 (fiscal)", "value_millions": 116326, "volume_mt": 900},
                {"label": "2025–26 (fiscal)", "value_millions": 118727, "volume_mt": 944},
            ],
            "assets": [
                {"symbol": "BHP", "name": "BHP Group"},
                {"symbol": "RIO", "name": "Rio Tinto Limited"},
            ],
        },
    },
}
