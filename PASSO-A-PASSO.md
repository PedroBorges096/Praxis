# PRAXIS: passo a passo para colocar no ar

Tempo total: **cerca de 40 minutos, feito uma vez só**. Custo: **R$ 0**. Domínio próprio é opcional.

---

## Etapa 1: Criar a conta no GitHub (5 min)
O GitHub é o **arquivo do jornal**: guarda cada notícia e cada foto que a Sthephanye publica.

1. Acesse **github.com** e clique em **Sign up**.
2. Crie a conta com o seu e-mail e confirme o código que chegar.

## Etapa 2: Subir os arquivos do site (10 min)
1. No GitHub, clique no **+** (canto superior direito) e depois em **New repository**.
2. Em *Repository name*, escreva `praxis`. Deixe **Public** marcado e clique em **Create repository**.
3. Na página que abrir, clique no link **"uploading an existing file"**.
4. Descompacte o `praxis.zip` no seu computador, abra a pasta `praxis`, **selecione tudo que está dentro dela** e arraste para a página do GitHub.
   ⚠️ Arraste o **conteúdo** da pasta, não a pasta em si.
5. Espere carregar e clique em **Commit changes**.
6. Ainda no GitHub, abra o arquivo `admin/config.yml` e clique no **lápis ✏️**. Na linha `repo: SEU-USUARIO-GITHUB/praxis`, troque `SEU-USUARIO-GITHUB` pelo seu usuário. Depois, clique em **Commit changes**.

## Etapa 3: Colocar o site no ar com o Netlify (5 min)
1. Acesse **netlify.com**, clique em **Sign up** e escolha **"Sign up with GitHub"**.
2. Clique em **Add new site → Import an existing project → GitHub**.
3. Autorize o acesso e escolha o repositório **praxis**.
4. **Não mude nada** nas configurações e clique em **Deploy**.
5. Espere cerca de 1 minuto. O site estará no ar num endereço com nomes aleatórios.
6. Em **Site configuration → Change site name**, escreva `praxis-analise` (ou outro nome livre).
   O endereço vira **praxis-analise.netlify.app**.
7. Se escolher um nome diferente, volte ao `admin/config.yml` no GitHub e troque as duas linhas `site_url` e `display_url`.

## Etapa 4: Ligar o login do painel (10 min)
Esta etapa faz o botão "Login with GitHub" do painel funcionar.

**No GitHub:**
1. Clique na sua foto e vá em **Settings**. No fim do menu da esquerda, abra **Developer settings → OAuth Apps → New OAuth App**.
2. Preencha:
   - **Application name:** `Painel PRAXIS`
   - **Homepage URL:** `https://praxis-analise.netlify.app`
   - **Authorization callback URL:** `https://api.netlify.com/auth/done`
3. Clique em **Register application**.
4. Copie o **Client ID**. Depois, clique em **Generate a new client secret** e copie o código que aparecer.
   ⚠️ O código secreto só aparece uma vez. Guarde num bloco de notas.

**No Netlify:**
5. Abra o site **praxis** e vá em **Site configuration**. Procure **OAuth** (fica em *Access & security*).
6. Clique em **Install provider**, escolha **GitHub**, cole o **Client ID** e o **Client secret** e clique em **Install**.

## Etapa 5: Dar acesso à Sthephanye (5 min)
1. A Sthephanye cria uma conta dela no GitHub (Etapa 1).
2. No repositório **praxis**, vá em **Settings → Collaborators → Add people** e digite o usuário dela.
3. Ela recebe um e-mail e clica em **Accept invitation**.

## Etapa 6: Testar ✅
1. Acesse **praxis-analise.netlify.app/admin**.
2. Clique em **Login with GitHub** e autorize.
3. O painel abre com as **Notícias**, o **Podcast**, os **Colunistas** e as **Configurações do site**.
4. Teste: abra uma notícia, mude uma palavra do título, salve, mude o status para **Pronto** e clique em **Publicar**.
5. Espere cerca de 1 minuto e atualize o site. A mudança aparece.

---

## Etapas opcionais

### A. Publicação agendada (5 min)
Para notícias com data futura entrarem no ar sozinhas:
1. No Netlify, vá em **Site configuration → Build & deploy → Build hooks → Add build hook**.
2. Dê o nome `agendamento`, salve e **copie o link** gerado.
3. Vá em **Site configuration → Environment variables → Add a variable**.
4. Em **Key**, escreva `BUILD_HOOK_URL`. Em **Value**, cole o link. Salve.
5. Em **Deploys**, clique em **Trigger deploy → Deploy site** uma vez.

### B. Domínio próprio, como praxis.com.br (cerca de R$ 40 por ano)
1. Veja se o nome está livre e registre em **registro.br**.
2. No Netlify, vá em **Domain management → Add a domain** e digite o domínio.
3. O Netlify mostra os **servidores DNS**. Copie e cole em **registro.br → seu domínio → DNS → Alterar servidores DNS**.
4. Espere de algumas horas até 1 dia. O cadeado de segurança (https) é instalado sozinho.
5. Atualize `site_url` e `display_url` no `admin/config.yml` e a **Homepage URL** do OAuth App no GitHub.

### C. Votos dos parlamentares na página Quem Governa
No seu computador, com o Python instalado, abra a pasta do site no terminal e rode:
```
python scripts/gerar_votos.py
```
O script baixa os dados do TSE (demora alguns minutos) e cria o arquivo `data/votos.json`. Depois, suba esse arquivo no GitHub, na pasta `data`, com **Add file → Upload files**.

---

### D. Antes de divulgar o site (checklist)
- [ ] Trocar `[E-MAIL DE CONTATO]` em **Páginas institucionais → Privacidade** e **Contato**
- [ ] Escrever a apresentação em **Configurações → Apresentação**
- [ ] Apagar ou substituir os **colunistas de exemplo** e os trechos entre `[colchetes]` nas notícias
- [ ] Preencher os **links das redes sociais** e do **Spotify/YouTube** do podcast
- [ ] Conferir a **lista de ministros** (houve reforma em abril) e o **governador do Tocantins**
- [ ] No Netlify, em **Forms**, ativar o aviso por e-mail das mensagens de contato

## Se algo der errado
| Problema | Solução |
|---|---|
| O painel diz "Not Found" ao entrar | O `repo:` do `admin/config.yml` está com o usuário errado |
| O login abre e fecha sem entrar | O *callback URL* do OAuth App precisa ser exatamente `https://api.netlify.com/auth/done` |
| Publiquei e não mudou | Espere 1 minuto e veja em **Netlify → Deploys** se o último ficou verde (**Published**) |
| Deploy ficou vermelho (**Failed**) | Clique nele, copie as últimas linhas do erro e me mande |
| A Sthephanye não vê o botão "Publicar" | Ela precisa aceitar o convite de colaboradora (Etapa 5) |
