import { ApiError } from "./api";

// The API answers in English; these are the texts shown to the user.
const API_MESSAGES: Record<string, string> = {
  "Link domain not allowed":
    "Este domínio não está liberado para envio por link. Peça ao administrador para incluí-lo.",
  "Link must use https": "O link precisa começar com https://.",
  "Link must not contain credentials": "Remova usuário e senha do link.",
  "Invalid link URL": "O link informado é inválido.",
  "File exceeds the maximum allowed size":
    "O arquivo excede o tamanho máximo permitido.",
  "File is empty": "O arquivo está vazio.",
  "File is required": "Selecione um arquivo.",
  "Expected multipart/form-data": "Não foi possível enviar o arquivo.",
  "Upload interrupted": "O envio foi interrompido. Tente novamente.",
  "Invalid segment data": "Dados inválidos. Confira o horário de início.",
  "Recording day not found": "Lote não encontrado.",
  "Segment not found": "Segmento não encontrado.",
  "Only failed segments can be reprocessed":
    "Só segmentos com falha podem ser reprocessados.",
  "Camera not found": "Câmera não encontrada.",
  "Camera is inactive": "Esta câmera está inativa.",
  "Invalid recording day data": "Escolha uma câmera e uma data válidas.",
  "Too many requests, please try again later":
    "Muitas requisições em pouco tempo. Aguarde alguns minutos e tente de novo.",
};

export function describeError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  return API_MESSAGES[err.message] ?? err.message ?? fallback;
}

// `segments.error` is written by the worker (also in English).
const SEGMENT_ERRORS: [RegExp, (match: RegExpMatchArray) => string][] = [
  [
    /^Link is not a direct file download$/,
    () =>
      "O link não aponta para o arquivo (é uma página web). Use um link de download direto.",
  ],
  [/^Download failed \(HTTP (\d+)\)$/, (m) => `O servidor do link respondeu erro ${m[1]}.`],
  [/^Could not connect to the link$/, () => "Não foi possível acessar o link."],
  [/^(Download|Connection) timed out$/, () => "O link demorou demais para responder."],
  [/^Download interrupted$/, () => "O download foi interrompido."],
  [/^Downloaded file is empty$/, () => "O arquivo baixado está vazio."],
  [/^Too many redirects$/, () => "O link redireciona demais."],
  [/^(Redirect without a location|Invalid redirect location)$/, () => "O link tem um redirecionamento inválido."],
  [/^Link resolves to a private address$/, () => "O link aponta para um endereço não permitido."],
  [/^Link domain not allowed$/, () => "O domínio do link não está liberado."],
  [/^Link must use https$/, () => "O link precisa usar https."],
  [/^File exceeds the maximum allowed size$/, () => "O arquivo excede o tamanho máximo permitido."],
  [/^Stored file is missing or empty$/, () => "O arquivo armazenado não foi encontrado."],
  [/^Segment has no stored file$/, () => "O segmento não tem arquivo armazenado."],
  [/^Processing failed$/, () => "Falha no processamento."],
  [
    /^Duplicate of segment [\w-]+, skipped$/,
    () => "Conteúdo duplicado: já existe outro segmento igual neste lote.",
  ],
  [/^Duplicate of another segment, skipped$/, () => "Conteúdo duplicado: já existe outro segmento igual neste lote."],
];

export function describeSegmentError(message: string): string {
  for (const [pattern, toText] of SEGMENT_ERRORS) {
    const match = message.match(pattern);
    if (match) return toText(match);
  }
  return message;
}
