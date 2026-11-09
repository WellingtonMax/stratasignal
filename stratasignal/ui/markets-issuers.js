"use strict";

// Curadoria de fatos com links para os documentos originais. Revise as fontes antes de ampliar o recorte.
const marketsIssuerEvidence = {
  reviewed_on: "2026-11-08",
  quality: "reviewed_issuer_disclosure",
  coverage: {activity_country_code: "BR", hs_code: "2601", mineral: "Minério de ferro"},
  records: [
    {
      name: "Vale S.A.",
      activity: "Mineração de ferro nos sistemas Norte, Sudeste e Sul do Brasil.",
      listing: {exchange: "B3", country_code: "BR", ticker: "VALE3", quote_symbol: "BMFBOVESPA:VALE3"},
      sources: [
        {
          fields: ["activity", "listing"],
          title: "Vale · Relatório anual",
          reference_period: "Exercício 2025",
          published_on: null,
          url: "https://www.vale.com/documents/d/guest/relatorio-anual-2025_14042026",
        },
      ],
    },
    {
      name: "CSN Mineração S.A.",
      activity: "Extração e beneficiamento de minério de ferro em Casa de Pedra, em Minas Gerais.",
      listing: {exchange: "B3", country_code: "BR", ticker: "CMIN3", quote_symbol: "BMFBOVESPA:CMIN3"},
      sources: [
        {
          fields: ["activity"],
          title: "CSN Mineração · Perfil corporativo",
          reference_period: null,
          published_on: null,
          url: "https://ri.csnmineracao.com.br/a-companhia/historico-e-perfil-corporativo/",
        },
        {
          fields: ["listing"],
          title: "CSN Mineração · Resultados do 2T26 (CVM)",
          reference_period: "2T26",
          published_on: "2026-08-12",
          url: "https://www.rad.cvm.gov.br/ENETCONSULTA/frmDownloadDocumento.aspx?CodigoInstituicao=1&Tela=99&descTipo=IPE&numProtocolo=1556749&numSequencia=1081455&numVersao=1",
        },
      ],
    },
  ],
};
