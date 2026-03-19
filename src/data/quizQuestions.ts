export interface QuizOption {
  label: string;
  value: string;
}

export interface QuizVariation {
  question: string;
  options: QuizOption[];
}

export const emocionalVariations: QuizVariation[] = [
  {
    question: 'Se o seu dia de hoje fosse uma paisagem, qual seria?',
    options: [
      { label: 'Tempestade se aproximando', value: 'ansioso' },
      { label: 'Tarde nublada e pesada', value: 'cansado' },
      { label: 'Amanhecer com luz dourada', value: 'esperancoso' },
      { label: 'Mar calmo e cinzento', value: 'indiferente' },
    ],
  },
  {
    question: 'Que som descreve o que você carrega por dentro agora?',
    options: [
      { label: 'Ruído constante que não para', value: 'ansioso' },
      { label: 'Silêncio pesado e vazio', value: 'cansado' },
      { label: 'Melodia que está começando', value: 'esperancoso' },
      { label: 'Eco distante, quase inaudível', value: 'indiferente' },
    ],
  },
  {
    question: 'Se você fosse um personagem numa história agora, como estaria?',
    options: [
      { label: 'Correndo sem saber para onde', value: 'ansioso' },
      { label: 'Parado no meio do caminho', value: 'cansado' },
      { label: 'Subindo uma colina com leveza', value: 'esperancoso' },
      { label: 'Sentado observando tudo', value: 'indiferente' },
    ],
  },
  {
    question: 'Se seu coração fosse um ambiente hoje, ele seria...',
    options: [
      { label: 'Um corredor cheio de portas fechadas', value: 'ansioso' },
      { label: 'Um quarto com cortinas fechadas', value: 'cansado' },
      { label: 'Uma varanda aberta para o horizonte', value: 'esperancoso' },
      { label: 'Uma sala arrumada, mas fria', value: 'indiferente' },
    ],
  },
  {
    question: 'Qual imagem traduz como você chegou até aqui hoje?',
    options: [
      { label: 'Água agitada sem direção', value: 'ansioso' },
      { label: 'Pedra que pesa nos ombros', value: 'cansado' },
      { label: 'Luz entrando pela janela', value: 'esperancoso' },
      { label: 'Estrada vazia e silenciosa', value: 'indiferente' },
    ],
  },
];

export const contextoVariations: QuizVariation[] = [
  {
    question: 'Se você pudesse pausar o tempo para resolver uma coisa, qual seria?',
    options: [
      { label: 'Uma conversa que ficou pela metade', value: 'relacionamento' },
      { label: 'Uma escolha que não posso adiar', value: 'decisao' },
      { label: 'Um problema prático que consome energia', value: 'trabalho' },
      { label: 'Algo que não sei nomear', value: 'indefinido' },
    ],
  },
  {
    question: 'O que costuma voltar à sua mente nos momentos de silêncio?',
    options: [
      { label: 'O rosto ou palavras de alguém', value: 'relacionamento' },
      { label: 'Uma bifurcação que preciso escolher', value: 'decisao' },
      { label: 'Números, prazos ou obrigações', value: 'trabalho' },
      { label: 'Um peso sem forma definida', value: 'indefinido' },
    ],
  },
  {
    question: 'Que capítulo da sua vida você está vivendo agora?',
    options: [
      { label: 'Um capítulo sobre pessoas e laços', value: 'relacionamento' },
      { label: 'Um capítulo de encruzilhada', value: 'decisao' },
      { label: 'Um capítulo de conquista e esforço', value: 'trabalho' },
      { label: 'Um capítulo que não tem título', value: 'indefinido' },
    ],
  },
  {
    question: 'Onde está o nó que você mais sente hoje?',
    options: [
      { label: 'Num vínculo com outra pessoa', value: 'relacionamento' },
      { label: 'Numa escolha que não se resolve', value: 'decisao' },
      { label: 'No que precisa ser feito', value: 'trabalho' },
      { label: 'Em algo que não consigo ver', value: 'indefinido' },
    ],
  },
  {
    question: 'Se você escrevesse uma linha sobre o que mais pesa, seria sobre...',
    options: [
      { label: 'Alguém que amo ou que me dói', value: 'relacionamento' },
      { label: 'Um caminho que preciso escolher', value: 'decisao' },
      { label: 'O que preciso alcançar', value: 'trabalho' },
      { label: 'Algo que não encontrou palavras', value: 'indefinido' },
    ],
  },
];

export const necessidadeVariations: QuizVariation[] = [
  {
    question: 'Se Deus fosse te dar um presente hoje, qual tocaria mais fundo?',
    options: [
      { label: 'A certeza de que não estou sozinho', value: 'conforto' },
      { label: 'Um mapa claro para onde ir', value: 'direcao' },
      { label: 'Energia para continuar de pé', value: 'forca' },
      { label: 'Silêncio e quietude por dentro', value: 'paz' },
    ],
  },
  {
    question: 'Que frase você mais precisaria ouvir agora?',
    options: [
      { label: '"Estou aqui com você"', value: 'conforto' },
      { label: '"O caminho certo é este"', value: 'direcao' },
      { label: '"Você é mais capaz do que imagina"', value: 'forca' },
      { label: '"Tudo vai se resolver no tempo certo"', value: 'paz' },
    ],
  },
  {
    question: 'O que você mais gostaria de sentir ao deitar hoje à noite?',
    options: [
      { label: 'Que fui acolhido e não estou só', value: 'conforto' },
      { label: 'Que sei para onde vou', value: 'direcao' },
      { label: 'Que resisti e dei o meu melhor', value: 'forca' },
      { label: 'Que meu coração descansou', value: 'paz' },
    ],
  },
  {
    question: 'Se sua alma fosse um vaso, o que mais precisaria receber?',
    options: [
      { label: 'Calor — algo que aquece', value: 'conforto' },
      { label: 'Luz — algo que clareia', value: 'direcao' },
      { label: 'Raiz — algo que me firme', value: 'forca' },
      { label: 'Água — algo que acalma', value: 'paz' },
    ],
  },
  {
    question: 'Que tipo de encontro com Deus você mais anseia hoje?',
    options: [
      { label: 'O Pai que me abraça sem perguntar', value: 'conforto' },
      { label: 'O Guia que aponta o caminho', value: 'direcao' },
      { label: 'O Guerreiro que luta ao meu lado', value: 'forca' },
      { label: 'O Pastor que me leva a águas tranquilas', value: 'paz' },
    ],
  },
];

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
