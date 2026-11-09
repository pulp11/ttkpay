// Contador de pessoas na oferta (Funil KL / evento.lol).
// Fala com /api/presenca do proprio dominio. Mesmo contador do evento.click.
//
// Faz tres coisas:
//   1. avisa a cada 15s enquanto a aba estiver visivel  -> "online"
//   2. a primeira batida da pagina conta como pageview
//   3. avisa "checkout" quando a pessoa CHEGA numa pagina de checkout
//
// Sobre o item 3: aqui o checkout e uma pagina do PROPRIO dominio (nao e link pra
// fora), e o botao que leva ate ela nao e um <a>. Por isso o checkout e medido pela
// CHEGADA na pagina, nao pelo clique. Quem abre o checkout conta uma vez por aba.
(function () {
  var JANELA = 15000;
  var ROTA = "/api/presenca";

  var id;
  try {
    id = sessionStorage.getItem("presenca_id");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("presenca_id", id);
    }
  } catch (e) {
    id = Math.random().toString(36).slice(2);
  }

  function enviar(corpo) {
    var texto = JSON.stringify(corpo);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ROTA, new Blob([texto], { type: "application/json" }));
    } else {
      fetch(ROTA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: texto,
        keepalive: true,
      }).catch(function () {});
    }
  }

  function bater(primeira) {
    // aba em segundo plano nao conta como pessoa olhando a oferta
    if (document.visibilityState !== "visible") return;
    enviar({ id: id, pagina: location.pathname, primeira: primeira === true });
  }

  bater(true);
  setInterval(bater, JANELA);
  document.addEventListener("visibilitychange", bater);

  // ---- chegou no checkout
  // "/front/checkout-paradise.html" -> "front/checkout-paradise"
  // "/up3/checkout.html"            -> "up3/checkout"
  var caminho = location.pathname;
  if (/checkout/i.test(caminho)) {
    var onde = caminho.replace(/^\/+/, "").replace(/\.html?$/i, "") || "checkout";
    var marca = "presenca_chk_" + onde;
    var jaAvisou = false;
    try {
      jaAvisou = sessionStorage.getItem(marca) === "1";
      if (!jaAvisou) sessionStorage.setItem(marca, "1");
    } catch (e) {}
    if (!jaAvisou) enviar({ id: id, evento: "checkout", destino: onde });
  }

  // ---- saida para outro dominio (se algum dia o checkout virar link externo)
  document.addEventListener(
    "click",
    function (evento) {
      var alvo = evento.target && evento.target.closest ? evento.target.closest("a[href]") : null;
      if (!alvo) return;
      var destino;
      try {
        destino = new URL(alvo.href, location.href);
      } catch (e) {
        return;
      }
      if (destino.origin === location.origin) return;
      if (!/^https?:$/.test(destino.protocol)) return;
      enviar({ id: id, evento: "checkout", destino: destino.hostname });
    },
    true
  );
})();
