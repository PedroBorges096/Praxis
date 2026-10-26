# PRAXIS: Análise Política e Conjuntura com Sthephanye Silva

Manual do site. Para colocar no ar pela primeira vez, siga o **PASSO-A-PASSO.md**.

---

## 1. O que o site tem

| Página | O que faz |
|---|---|
| **Home** | Manchete, Em Foco, Últimas, cotações e gráficos ao vivo, podcast, ferramentas, Explicando, colunistas, "Quem faz a PRAXIS", newsletter e Pix |
| **Caixa de leitura** | Abre ao clicar numa notícia da home, com vídeo ou foto, ⏱ Em 30 segundos, 📌 Fatos, 🔍 Análise, 💬 Opinião, 💡 O que muda para você e a linha do tempo |
| **Página da matéria** | Texto completo, galeria com zoom, fontes, correção, tags, 🔊 Ouvir, 📸 card para Instagram e "Leia também" |
| **Podcast** | 🎧 Ouvir ou 🎬 Assistir, capítulos clicáveis, velocidade de 1x a 2x, transcrição e mini player |
| **Busca** | Busca por palavra, tema (#6x1) e editoria. Os itens do menu abrem aqui. |
| **Quem Governa** (`/politicos`) | Presidência, ministros, presidentes da Câmara e do Senado, 81 senadores, 513 deputados, 27 governadores e STF, com foto, idade, salário, mandato e projetos. Tem **mapa do Brasil clicável** por estado. |
| **Eleições 2026** (`/eleicoes`) | Presidente (1º e 2º turnos), mapa dos governadores eleitos por partido, os 54 senadores eleitos e o calendário de posse |
| **Páginas institucionais** | `/quem-somos`, `/linha-editorial`, `/privacidade` (LGPD) e `/contato` (com formulário) |
| **Card "Apoie"** | Ao clicar em "Apoie a PRAXIS", abre um card com a chave Pix e um botão de copiar |
| **Calculadora** | Salário vs. inflação, com o IPCA oficial ao vivo |
| **Extras** | Modo escuro 🌙, botões A− / A+ para a letra, app instalável no celular, RSS e sitemap para o Google |

---

## 2. Como publicar uma notícia

1. Acesse **seusite/admin** e clique em **Login with GitHub**.
2. Clique em **Notícias → Nova Notícia**.
3. Preencha o **Título**, a **Linha fina**, a **Editoria** e o **Tipo de texto**:
   - **Reportagem**: só fatos
   - **Análise**: interpretação com dados
   - **Opinião**: posição da autora
   - **Explicador**: vai para o bloco "Explicando" da home
4. Suba a **Foto principal**. A dica de tamanho aparece embaixo do campo.
5. Preencha os blocos da caixa de leitura: *Em 30 segundos*, Fatos, Análise, Opinião e O que muda.
6. Escreva o **Texto completo**. Galeria, linha do tempo, fontes e tags são opcionais.
7. Para virar **manchete**, marque **"Destacar na capa"**.
8. Clique em **Salvar** (a notícia vira rascunho). Depois mude o status para **Pronto** e clique em **Publicar**.
9. Em cerca de **1 minuto**, a notícia está no ar.

**Para agendar**, escolha uma data futura em "Publicar em" (precisa da etapa opcional A do passo a passo).
**Para corrigir um erro**, edite a notícia e preencha o campo **Correção**. Ele aparece no fim da matéria, como manda o bom jornalismo.

## 3. Tamanhos de foto

| Onde | Tamanho ideal | Formato |
|---|---|---|
| Foto principal / manchete | **1600 × 800 px** | Horizontal 2:1 |
| Galeria | **1200 × 800 px** | Horizontal 3:2 |
| Colunista e foto da Sthephanye | **400 × 400 px** | Quadrada |
| Capa do podcast | **3000 × 3000 px** | Quadrada |

Pode subir foto **direto do celular**: o site reduz, comprime e converte sozinho. Se a foto cortar a cabeça de alguém, mude o **Enquadramento** para "topo".

## 4. Podcast

Em **Podcast → Novo Episódio**:
- Cole o **link do Spotify** para liberar o botão 🎧 Ouvir.
- Cole o **link do YouTube** para liberar o botão 🎬 Assistir.
- Se subir o **MP3**, o site também libera a velocidade e os capítulos clicáveis no áudio.

Escreva os capítulos assim: `12:30` e o assunto. A transcrição é opcional, mas ajuda no Google.

## 5. Configurações do site

Em **Configurações do site → Nome, redes e apoio** você muda o nome, a assinatura abaixo do logo, a foto e a apresentação da Sthephanye, as redes sociais e o **link da newsletter**.

**Chave Pix:** no mesmo lugar, o campo **Chave Pix** controla o card "Apoie".
- **Editar:** troque a chave e publique.
- **Tirar o Pix do site:** apague o campo e publique. O botão "Apoie" some sozinho, a menos que exista um "Link de apoio".

## 5.1 Quem Governa, Eleições e páginas
- **Quem Governa (cargos sem API):** edite Presidência, ministros, STF, governadores e presidentes das Casas. Se o campo **Foto** ficar vazio, o site busca a foto e um resumo da biografia na **Wikipédia**, pelo campo "Título do artigo na Wikipédia". Deputados e senadores se atualizam sozinhos.
- **Eleições 2026:** resultados, senadores eleitos e calendário.
- **Páginas institucionais:** Quem somos, Linha editorial, Privacidade e Contato. ⚠️ **Troque `[E-MAIL DE CONTATO]`** nas páginas de Privacidade e Contato.
- **Mensagens do formulário de contato:** chegam no Netlify, em **Forms → contato**. Lá dá para ativar o aviso por e-mail.

---

## 6. De onde vêm os dados automáticos

| Dado | Fonte | Atualização |
|---|---|---|
| Dólar, Euro, Yuan, Libra, Peso, Bitcoin | AwesomeAPI | A cada 60 segundos |
| Selic e IPCA 12 meses | Banco Central | A cada 60 segundos |
| Ibovespa, S&P 500, Petróleo, Ouro | Widgets do TradingView | Ao vivo (até 15 min de atraso) |
| Deputados e senadores | APIs da Câmara e do Senado, com intermediário e cópia de segurança | Ao abrir a página |
| Salário dos parlamentares | Decreto Legislativo 172/2022 | Fixo (R$ 46.366,19) |
| Votos na eleição | TSE (script `gerar_votos.py`) | Quando você rodar o script |

---

## 7. Mapa dos arquivos (para quem for programar)

| Arquivo | Função |
|---|---|
| `admin/config.yml` | Campos do painel |
| `content/` | O que a Sthephanye publica (o painel grava aqui) |
| `scripts/build.js` | Gera as páginas e os dados. Roda sozinho no Netlify. |
| `js/layout.js` | Menu e rodapé |
| `css/style.css` | Cores (variáveis no topo) e modo escuro |
| `js/render.js` | Visual da notícia |
| `js/home.js`, `podcast.js`, `busca.js`, `materia.js`, `politicos.js` | Lógica de cada página |
| `netlify/functions/` | Agendamento e intermediário das APIs |
| `img/` | Ícone, foto da Sthephanye e imagem padrão de compartilhamento |

**Não edite à mão** os arquivos gerados pelo build: `data/*.json`, `noticia/*.html` e `js/config.js`.

**Para testar no computador**, com o Node.js instalado:
```
npm install
npm run dev
```
Depois, abra http://localhost:8000. O servidor de teste entende os endereços sem ".html", igual ao site no ar.

## 8. Endereços do site (sem ".html")
`/` · `/politicos` · `/eleicoes` · `/podcast` · `/busca` · `/calculadora` · `/quem-somos` · `/linha-editorial` · `/privacidade` · `/contato` · `/noticia/nome-da-materia` · **`/admin`** (painel)
