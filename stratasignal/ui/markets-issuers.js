"use strict";

// Curadoria de fatos com links para os documentos originais. Revise as fontes antes de ampliar o recorte.
const marketsIssuerEvidence = {
  reviewed_on: "2026-11-08",
  quality: "reviewed_issuer_disclosure",
  coverage: {activity_country_code: "BR", hs_code: "2601", mineral: "Minério de ferro"},
  corridor: {
    title: "De Carajás a Ponta da Madeira",
    operator: "Vale S.A.",
    reference_period: "Exercício 2025",
    reviewed_on: "2026-11-10",
    quality: "Relato da empresa sobre o Sistema Norte e cadastro de concessão da ANTT.",
    stages: [
      {stage: "Extração", location: "Carajás (PA)", detail: "Complexos minerários Serra Norte, Serra Sul e Serra Leste."},
      {stage: "Transporte ferroviário", location: "Estrada de Ferro Carajás (PA e MA)", detail: "A ferrovia liga Carajás ao terminal em São Luís."},
      {stage: "Embarque marítimo", location: "Terminal de Ponta da Madeira (MA)", detail: "Terminal marítimo do Sistema Norte em São Luís."},
    ],
    sources: [
      {title: "Vale · Relatório anual 2025 · Sistema Norte", url: "https://www.vale.com/documents/d/guest/relatorio-anual-2025_14042026"},
      {title: "ANTT · Concessão da Estrada de Ferro Carajás", url: "https://www.gov.br/antt/pt-br/assuntos/ferrovias/concessoes-ferroviarias/vale-estrada-de-ferro-carajas"},
    ],
    limits: "O caso documenta a logística do Sistema Norte. Embarques, destinos por mina e participação da Vale nos valores BACI exigem evidências próprias.",
  },
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
