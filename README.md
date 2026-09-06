# Painel Admin — PipocaFlix

Painel de gerenciamento separado do site principal. É 100% estático (HTML/CSS/JS
puro, sem build), então pode subir em qualquer lugar: Vercel, Netlify, GitHub
Pages, Cloudflare Pages — o que for mais fácil pra você.

## O que tem aqui

- **Dashboard** — total de filmes, séries, episódios, quantas séries têm episódio
  encontrado, gráfico de categorias mais fortes, dublado vs. legendado, e uma
  lista de "itens pra revisar" (sem link de player, sem capa, série sem episódio).
- **Buscar no TMDB** — busca filme/série no TMDB e já mostra se aquele título
  já existe no seu catálogo ou não.
- **Assinantes** — lista quem tem VIP (ativo/expirado, plano, validade), com filtro
  por e-mail.
- **Comentários** — os últimos 100 comentários feitos em qualquer título do site.
- **Catálogo** — tabela com tudo que tem na planilha (filmes + séries), filtrável
  por nome, mostrando rapidinho se falta link ou capa — sem precisar abrir a
  planilha.

Todos os dados vêm dos mesmos Workers públicos e do mesmo proxy TMDB que o site
principal já usa — não precisei criar nenhuma chave nova.

## Antes de colocar no ar

### 1. E-mails com acesso

Só o e-mail configurado consegue passar da tela de login. Pra adicionar/remover
alguém, edite a lista no topo de `assets/admin-app.js`:

```js
const ADMIN_EMAILS = ['canalpedroid@gmail.com'];
```

Isso barra a UI, mas não é 100% suficiente sozinho — veja o próximo passo.

### 2. Regras do Firestore (obrigatório pras seções Assinantes e Comentários)

O painel lê duas coisas do Firestore que o site principal nunca precisou LISTAR
antes (só buscar um documento específico por vez), então provavelmente suas
regras atuais não liberam isso. Sem esse passo, essas duas seções aparecem com
uma mensagem de erro explicando exatamente isso (não quebra o resto do painel).

Vá em **Firebase Console → Firestore Database → Regras** e adicione (ajustando
ao que você já tem, sem apagar as regras existentes):

```
match /vip/{doc} {
  allow get: if true; // já deve existir — é o que o site usa pra checar VIP
  allow list: if request.auth != null
    && request.auth.token.email in ['canalpedroid@gmail.com'];
}

match /{path=**}/meusComentarios/{id} {
  allow read: if request.auth != null
    && request.auth.token.email in ['canalpedroid@gmail.com'];
}
```

Isso libera **listar** essas coleções só pra quem loga com um dos e-mails da
lista — pra todo mundo continua como já era antes.

### 3. Deploy

Sobe a pasta `painel-admin/` inteira (ela é independente, não depende de mais
nada do resto do zip) em qualquer hospedagem de site estático. Ela já vem com
sua config do Firebase e os endereços dos Workers configurados — não precisa
editar mais nada além do passo 1 e 2 acima.

## Como funciona a segurança

- A tela de login usa o mesmo Firebase Auth (Google) do site.
- Se alguém logar com uma conta que não está em `ADMIN_EMAILS`, o painel
  desloga a pessoa na hora e mostra "essa conta não tem acesso".
- A trava de verdade pros dados sensíveis (assinantes, comentários) é a regra
  do Firestore do passo 2 — a checagem de e-mail no JavaScript é só a UI, ela
  sozinha não impede alguém de tentar ler os dados por fora do painel.
