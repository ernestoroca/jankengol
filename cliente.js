"use strict";
/* globals M, firebase, backEnd */

var firebaseUID = "";
var misDatos = null;
var nvoEquipo = null;

window.onload = iniciar;
window.addEventListener("orientationchange", gestorOrientacion);
window.onhashchange = reload;

var cacheStorage = (function(){
    var datos;
    var strdat = localStorage.getItem('datos-cache');
    if (strdat) {
      datos = JSON.parse(strdat);
      strdat = null;
    } else {
      datos = [];
      localStorage.setItem('datos-cache',JSON.stringify(datos));
    }
    function busqueda(searchedKey) {
      var minIndex = 0;
      var maxIndex = datos.length - 1;
      var currentIndex;
      var currentKey;
      var comparison;

      while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentKey = datos[currentIndex].key;
        comparison = currentKey.localeCompare(searchedKey);
        if (comparison < 0) {
          minIndex = currentIndex + 1;
        } else if (comparison > 0) {
          maxIndex = currentIndex - 1;
        } else {
          return currentIndex;
        }
      }
      return -1;
    }
    return {
        setItem: function(key,value,time){
          var ahora = Date.now();
          var lng = datos.length;
          var i;
          for (i=0;i<lng;i++){
            if (datos[i].time < ahora){
              localStorage.removeItem(datos[i].key);
              datos.splice(i,1);
              i--;
              lng--;
            }
          }
          var pos = busqueda(key);
          if (pos >=0 ){
            datos[pos].time = ahora + time;
          } else {
            datos.push({
              key: key,
              time: ahora + time,
            });
            datos.sort(function(a,b){
              var keya = a.key;
              var keyb = b.key;
              return keya.localeCompare(keyb);
            });
          }
          localStorage.setItem(key,value);
          localStorage.setItem('datos-cache',JSON.stringify(datos));
        },
        getItem: function(key){
          var res = null;
          var ahora = Date.now();
          var pos = busqueda(key);
          if (pos >=0 ){
            if (datos[pos].time >= ahora){
              res = localStorage.getItem(key);
              if (res === null){
                datos.splice(pos,1);
                localStorage.setItem('datos-cache',JSON.stringify(datos));
              }
            } else {
              localStorage.removeItem(key);
              datos.splice(pos,1);
              localStorage.setItem('datos-cache',JSON.stringify(datos));
            }
          } else {
            localStorage.removeItem(key);
          }
          return res;
        },
        removeItem: function(key){
          var pos = busqueda(key);
          if (pos >= 0){
            datos.splice(pos,1);
            localStorage.setItem('datos-cache',JSON.stringify(datos));
          }
          localStorage.removeItem(key);
        },
        clear: function(){
          var lng = datos.length;
          var i;
          for (i=0;i<lng;i++){
            localStorage.removeItem(datos[i].key);
          }
          datos = [];
          localStorage.setItem('datos-cache',JSON.stringify(datos));
        },
    };
}());

var cloudStorage = (function(){
  return {
    getItem: function(dir,cod,tmp,cbk){
      var res = cacheStorage.getItem(dir+cod);
      if(res !== null){
        cbk(JSON.parse(res));
      } else {
        firebase.database().ref(dir+cod).once('value').then(function(snapshot){
          var value = snapshot.val();
          if (value){
            value.codigo = cod;
            var strvalue = JSON.stringify(value);
            cacheStorage.setItem(dir+cod,strvalue,tmp);
          } else {
            value.codigo = cod;
          }
          cbk(value);
        });
      }
    },
    removeItem: cacheStorage.removeItem,
    clear: cacheStorage.clear,
  };
}());

function actualRendimiento(valor0,edad){
  var r;
  if (edad<=28){
    r = 80*(edad-18)/10+20;
  } else if (edad<=40){
    r = -100*(edad-28)/12+100;
  } else {
    r = 0;
  }
  return (valor0-3)*r/100 + 3;
}
function actualEdad(edad,nacimiento){
  var ahora = Date.now();
  var delta = ahora - nacimiento;
  edad += delta/(30*24*60*60*1000);
  return edad;
}

var eventoMatch = null;
var match = null;
function estadoJuego(snap){
  match = snap.val();
  if (match === null){
    setTimeout(function(){
      window.location.href = "#menu";
    },5000);
    return;
  }
  if (match.estado == "esperandoOponente"){
    return;
  }
  if (window.location.hash !== "#juego"){
    window.location.href = "#juego";
    setTimeout(function(){
      if (eventoMatch !== null){
        eventoMatch();
      }
    },5000);
  } else {
    if (eventoMatch !== null){
      eventoMatch();
    }
  }
}
function iniciar(){
  var firebaseConfig = {
    apiKey: "AIzaSyAE0BFC11pL8LAsmzfKojGAkxiwt5-sbBo",
    authDomain: "jankengol.firebaseapp.com",
    databaseURL: "https://jankengol.firebaseio.com",
    projectId: "jankengol",
    storageBucket: "jankengol.appspot.com",
    messagingSenderId: "225043875998",
    appId: "1:225043875998:web:d204d20da25101fe5e538f"
  };
  firebase.initializeApp(firebaseConfig);
  firebase.auth().signInAnonymously();
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      var isAnonymous = user.isAnonymous;
      firebaseUID = user.uid;
      backEnd('misDatos',null,function(datos){
        misDatos = datos;
        if (!misDatos.jugadores) {
          misDatos.jugadores = [];
        }
        backEnd('noJugar',null,function(){});
      });
    } else {
      firebase.auth().signInAnonymously();
    }
  });
  window.location.herf="#menu";
  reload();
}
function reload(){
    var url = decodeURI(window.location.hash);
    var vecUrl = url.split('/');
    if (vecUrl.length===0 || (vecUrl.length===1 && vecUrl[0]==="")){
        window.location.href="#menu";
    } else {
        rutas[vecUrl[0].replace("#","")](vecUrl);
    }
}
var pintarCancha = null;
var alto,ancho;
function gestorOrientacion(){
  alto = screen.availHeight;
  ancho = screen.availWidth;
  if (alto > ancho){
    alto = ancho/2;
  }
  if (pintarCancha !== null){
    pintarCancha();
    if (alto > ancho){
      M.toast({html:"¡Ponga su teléfono en forma horizontal!"});
    }
  }
}

var rutas = [];
rutas.menu = function(){
  var strHtml;
  {strHtml = `
<nav class="red white-text">
  <div class="nav-wrapper">
    <a class="brand-logo center">
      Jan Ken Gol
    </a>
  </div>
</nav>
<br>
<div class="row">
    <div class="col s6 center" onclick="window.location.href='#jugadores'">
        <img class="responsive-img" src="jugador.jpg"><br>
        Mis Jugadores
    </div>
    <div class="col s6 center" onclick="window.location.href='#equipo'">
        <img class="responsive-img" src="equipo.jpg"><br>
        Mi Equipo
    </div>
    <div class="col s6 center" onclick="window.location.href='#esperando'">
        <img class="responsive-img" src="jugar.jpg"><br>
        ¡A Jugar!
    </div>
    <div class="col s6 center" onclick="window.location.href='#ranking'">
        <img class="responsive-img" src="ranking.jpg"><br>
        Ranking
    </div>
</div>
  `;}
  var cuerpo = document.getElementsByTagName('body')[0];
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "visible";
  
  eventoMatch = null;
  pintarCancha = null;
  if (misDatos !== null){
    actualizar();
  } else if (firebaseUID !== ""){
    backEnd('misDatos',null,function(datos){
      misDatos = datos;
      if (!misDatos.jugadores) {
        misDatos.jugadores = [];
      }
      actualizar();
    });
  }
  function actualizar(){
    backEnd('noJugar',null,function(){});
    var llavesStr = cacheStorage.getItem("llavesMatch");
    if (llavesStr !== null){
      var llaves = JSON.parse(llavesStr);
      var lng = llaves.length;
      var i;
      for(i=0;i<lng;i++){
        firebase.database().ref("matchs/"+llaves[i]).off();
      }
      cacheStorage.removeItem("llavesMatch");
    }
  }
};
rutas.jugadores = function(){
  var strHtml;
  {strHtml = `
<nav class="red white-text">
  <div class="nav-wrapper">
    <a href="#menu" class="brand-logo center">
      Jan Ken Gol
    </a>
  </div>
</nav>
<br>
<div class="row">
  <div class="col s12">
    <ul class="collapsible">
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Arqueros
        </div>
        <div class="collapsible-body">
          <div class="row" id="arquero">
          </div>
        </div>
      </li>
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Defensa
        </div>
        <div class="collapsible-body">
          <div class="row" id="defensa">
          </div>
        </div>
      </li>
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Medio Campo
        </div>
        <div class="collapsible-body">
          <div class="row" id="medio">
          </div>
        </div>
      </li>
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Ataque
        </div>
        <div class="collapsible-body">
          <div class="row" id="ataque">
          </div>
        </div>
      </li>
      <li>
        <div class="collapsible-header">
          <i class="material-icons">plus_one</i>Agregar Jugador
        </div>
        <div class="collapsible-body">
          <div class="row">
            <div class="col s12">
              <p>Ingrese el código de su tarjeta, en grupos 4 letras.</p>
            </div>
          </div>
          <div class="row">
            <div class="input-field col s4">
              <input id="cod1" type="text" class="validate">
              <label for="cod1">####</label>
            </div>
            <div class="input-field col s4">
              <input id="cod2" type="text" class="validate">
              <label for="cod2">####</label>
            </div>
            <div class="input-field col s4">
              <input id="cod3" type="text" class="validate">
              <label for="cod3">####</label>
            </div>
          </div>
          <div class="row">
            <div class="col s6 offset-s6">
              <button id="enviar" class="btn waves-effect waves-light">Enviar
                <i class="material-icons right">send</i>
                </button>
            </div>
          </div>
        </div>
      </li>
    </ul>
  </div>
</div>
  `;}
  var cuerpo = document.getElementsByTagName('body')[0];
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "visible";
  var instances = M.Collapsible.init(document.querySelectorAll('.collapsible'));

  function getJugadores(){
    if (misDatos === null){
      window.location.href = "#menu";
      return;
    }
    var lng = misDatos.jugadores.length;
    var i;
    for (i=0;i<lng;i++){
      cloudStorage.getItem("/jugadores/",misDatos.jugadores[i],24*60*60*1000,printJugadores);
    }
  }
  getJugadores();
  function printJugadores(jugador){
    var nivel;
    var edad = actualEdad(jugador.edad,jugador.nacimiento);
    switch(jugador.posicion){
      case "arquero":
        nivel = actualRendimiento(jugador.arquero,edad);
        break;
      case "defensa":
        nivel = actualRendimiento(jugador.defensa,edad);
        break;
      case "medio":
        nivel = actualRendimiento(jugador.medio,edad);
        break;
      case "ataque":
        nivel = actualRendimiento(jugador.ataque,edad);
        break;
    }
    var strHtml;
    {strHtml =`
  <div class="card">
    <div class="card-image">
      <img src="${jugador.pais}.jpg">
      <a href="#unjugador/${jugador.codigo}" class="btn-floating halfway-fab waves-effect waves-light red"><i class="material-icons">loop</i></a>
    </div>
    <div class="card-content">
      <h5 class="truncate">${jugador.nombre + " " + jugador.apellido}</h5>
      <table>
        <tbody>
          <tr>
            <td>
              <b>País:</b><br>
              <b>Edad:</b><br>
              <b>${jugador.posicion}: </b>
            </td>
            <td>
              ${jugador.pais}<br>
              ${edad.toFixed(1)}<br>
              ${nivel.toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
    `;}
    var div = document.createElement("DIV");
    div.classList.add("col","s12");
    div.innerHTML = strHtml;
    document.getElementById(jugador.posicion).appendChild(div);
  }
  document.getElementById("enviar").onclick = function(){
    var cod1 = document.getElementById("cod1").value;
    var cod2 = document.getElementById("cod2").value;
    var cod3 = document.getElementById("cod3").value;
    
    cod1 = cod1.trim();
    cod1 = cod1.toUpperCase();
    
    cod2 = cod2.trim();
    cod2 = cod2.toUpperCase();
    
    cod3 = cod3.trim();
    cod3 = cod3.toUpperCase();
    if (cod1.length != 4 || cod2.length != 4 || cod3.length != 4){
      M.toast({
        html: 'Cada grupo de valores debe contener 4 letras',
        displayLength: 5000,
      });
    }
    backEnd('nvoJugador',{codigo: cod1+cod2+cod3},function(res){
      if(res){
        backEnd('misDatos',null,function(datos){
          misDatos = datos;
          if (!misDatos.jugadores) {
            misDatos.jugadores = [];
          }
          window.location.href = "#unjugador/"+cod1+cod2+cod3;
        });
      } else {
        M.toast({
          html: 'Su código es erroneo',
          displayLength: 5000,
        });
      }
    });
  };
};
rutas.unjugador = function(vecUrl){
  var strHtml;
  {strHtml = `
<nav class="red white-text">
  <div class="nav-wrapper">
    <a href="#jugadores" class="brand-logo center">
      Jan Ken Gol
    </a>
  </div>
</nav>
<br>
<div class="row" id="jugador"></div>
  `;}
  var cuerpo = document.getElementsByTagName('body')[0];
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "visible";
  var idJugador = vecUrl[1];
  cloudStorage.getItem("/jugadores/",idJugador,24*60*60*1000,printJugador);
  function printJugador(jugador){
    var edad = actualEdad(jugador.edad,jugador.nacimiento);
    var arquero = actualRendimiento(jugador.arquero,edad);
    var defensa = actualRendimiento(jugador.defensa,edad);
    var medio = actualRendimiento(jugador.medio,edad);
    var ataque = actualRendimiento(jugador.ataque,edad);
    
    var strHtml;
    {strHtml = `
<div class="col s12">
  <div class="card">
    <div class="card-image">
      <img class="responsive-img" src="${jugador.pais}.jpg">
    </div>
    <div class="card-content">
      <div class="row">
        <div class="col s12">
          <h5>${jugador.nombre + " " + jugador.apellido}</h5>
          <table>
            <tbody>
              <tr>
                <td>
                  <b>País: </b><br>
                  <b>Edad: </b><br>
                  <b>Arquero: </b><br>
                  <b>Defensa: </b><br>
                  <b>Mediocampo:</b><br>
                  <b>Ataque:</b>
                </td>
                <td>
                  ${jugador.pais}<br>
                  ${edad.toFixed(1)}<br>
                  ${arquero.toFixed(1)}<br>
                  ${defensa.toFixed(1)}<br>
                  ${medio.toFixed(1)}<br>
                  ${ataque.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="row">
        <div class="input-field col s12">
          <select id="posicion">
            <option value="arquero">Arquero</option>
            <option value="defensa">Defensa</option>
            <option value="medio">Medio Campo</option>
            <option value="ataque">Ataque</option>
          </select>
          <label>Posición Actual</label>
        </div>
      </div>
    </div>
  </div>
</div>
  `;}
    document.getElementById("jugador").innerHTML=strHtml;
    document.getElementById("posicion").value = jugador.posicion;
    M.FormSelect.init(document.querySelectorAll('select'));
    document.getElementById("posicion").onchange = function(){
      var posicion = document.getElementById("posicion").value;
      backEnd('setPosicion',{jugador:idJugador, posicion:posicion},function(res){
        if(res){
          cloudStorage.removeItem("/jugadores/"+idJugador);
        }
        window.location.href = "#jugadores";
      });
    };
  }
};
rutas.equipo = function(){
  if (misDatos === null){
    window.location.href = "#menu";
    return;
  }
  var strHtml;
  {strHtml = `
<nav class="red white-text">
  <div class="nav-wrapper">
    <a href="#menu" class="brand-logo center">
      Jan Ken Gol
    </a>
  </div>
</nav>
<br>
<div class="row">
  <div class="input-field col s9">
    <input id="nombre" type="text" class="validate" value="${misDatos.nombre}">
    <label for="nombre">Nombre de tu Equipo</label>
  </div>
  <div class="input-field col s3">
    <button id="nvoNombre" class="btn waves-effect waves-light">
    <i class="material-icons center">loop</i>
    </button>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <table>
      <thead>
        <tr>
          <th>Gan</th>
          <th>Emp</th>
          <th>Per</th>
          <th>Pts</ht>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${misDatos.ganados}</td>
          <td>${misDatos.empatados}</td>
          <td>${misDatos.perdidos}</td>
          <td>${misDatos.nivel}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
<div class="row">
  <div class="input-field col s4">
    <input id="defensa-strat" type="number" class="validate">
    <label for="defensa-strat">Defensa</label>
  </div>
  <div class="input-field col s4">
    <input id="medio-strat" type="number" class="validate">
    <label for="medio-strat">Mediocampo</label>
  </div>
  <div class="input-field col s4">
    <input disabled id="ataque-strat" type="number" class="validate">
    <label for="ataque-strat">Ataque</label>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <ul class="collapsible">
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Arquero [<span id="poder-arquero"></span>]
        </div>
        <div class="collapsible-body">
          <div class="row">
            <div class="col s12" id="arquero0">
            </div>
          </div>
        </div>
      </li>
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Defensa [<span id="poder-defensa"></span>]
        </div>
        <div class="collapsible-body">
          <div class="row" id="defensa">
          </div>
        </div>
      </li>
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Medio Campo [<span id="poder-medio"></span>]
        </div>
        <div class="collapsible-body">
          <div class="row" id="medio">
          </div>
        </div>
      </li>
      <li>
        <div class="collapsible-header">
          <i class="material-icons">sports_soccer</i>Ataque [<span id="poder-ataque"></span>]
        </div>
        <div class="collapsible-body">
          <div class="row" id="ataque">
          </div>
        </div>
      </li>
    </ul>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <button id="cambiar" class="btn waves-effect waves-light" >Cambiar Formación
      <i class="material-icons right">send</i>
    </button>
  </div>
</div>
  `;}
  var cuerpo = document.getElementsByTagName('body')[0];
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "visible";
  M.updateTextFields();

  var instances = M.Collapsible.init(document.querySelectorAll('.collapsible'));
  
  var elemDefensa = document.getElementById("defensa-strat");
  var elemMedio = document.getElementById("medio-strat");
  var elemAtaque = document.getElementById("ataque-strat");

  var poderArquero = 0;
  var poderDefensa = 0;
  var poderMedio = 0;
  var poderAtaque = 0;
  
  function getEquipo(){
    if (nvoEquipo === null){
      misDatos.defensa.sort(function(a,b){
        return b.localeCompare(a);
      });
      misDatos.medio.sort(function(a,b){
        return b.localeCompare(b);
      });
      misDatos.ataque.sort(function(a,b){
        return b.localeCompare(a);
      });
    
      nvoEquipo = {
        arquero: misDatos.arquero,
        defensa: misDatos.defensa.slice(),
        medio: misDatos.medio.slice(),
        ataque: misDatos.ataque.slice(),
      };
    }
    
    elemDefensa.value = nvoEquipo.defensa.length;
    elemMedio.value = nvoEquipo.medio.length;
    elemAtaque.value = nvoEquipo.ataque.length;
    
    M.updateTextFields();
    
    elemDefensa.onchange = validarEstrategia;
    elemMedio.onchange = validarEstrategia;
    
    printEquipo();
  }
  function printEquipo(){
    var lng,i;
    
    //arquero
    if (nvoEquipo.arquero == "0"){
      printSuplente("arquero","0");
    } else {
      cloudStorage.getItem("/jugadores/",nvoEquipo.arquero,24*60*60*1000,function(jugador){
        printJugador(jugador,"arquero","arquero0");
      });
    }
    
    //defensa
    lng = nvoEquipo.defensa.length;
    var lista = "";
    for (i=0;i<lng;i++){
      lista+= `<div class="col s12" id="defensa${i}"></div>`;
    }
    document.getElementById("defensa").innerHTML = lista;
    for (i=0;i<lng;i++){
      if (nvoEquipo.defensa[i] == "0"){
        printSuplente("defensa",i);
      } else {
        getJugador(nvoEquipo.defensa[i],"defensa",i);
      }
    }
    
    //medio
    lng = nvoEquipo.medio.length;
    lista = "";
    for (i=0;i<lng;i++){
      lista+= `<div class="col s12" id="medio${i}"></div>`;
    }
    document.getElementById("medio").innerHTML = lista;
    for (i=0;i<lng;i++){
      if (nvoEquipo.medio[i] == "0"){
        printSuplente("medio",i);
      } else {
        getJugador(nvoEquipo.medio[i],"medio",i);
      }
    }
    
    //ataque
    lng = nvoEquipo.ataque.length;
    lista = "";
    for (i=0;i<lng;i++){
      lista+= `<div class="col s12" id="ataque${i}"></div>`;
    }
    document.getElementById("ataque").innerHTML = lista;
    for (i=0;i<lng;i++){
      if (nvoEquipo.ataque[i] == "0"){
        printSuplente("ataque",i);
      } else {
        getJugador(nvoEquipo.ataque[i],"ataque",i);
      }
    }
  }
  getEquipo();
  
  function validarEstrategia(evento){
    var id = evento.target.id;
    
    var valor = elemDefensa.value;
    if (valor === ""){
      valor = "2";
    }
    
    var defensa = parseInt(valor,10);
    if (defensa<2){
      defensa = 2;
    } else if (defensa>4){
      defensa = 4;
    }
    
    valor = elemMedio.value;
    if (valor === ""){
      valor = "2";
    }
    var medio = parseInt(valor,10);
    if (medio<2){
      medio = 2;
    } else if (medio>4){
      medio = 4;
    }
    
    var ataque = 10 - defensa - medio;
    while (ataque > 4){
      if (id == "defensa-strat"){
        medio++;
      } else {
        defensa++;
      }
      ataque = 10 - defensa - medio;
    }
    elemDefensa.value = defensa;
    elemMedio.value = medio;
    elemAtaque.value = ataque;
    
    
    if (defensa < nvoEquipo.defensa.length){
      nvoEquipo.defensa.length = defensa;
    }
    while (defensa > nvoEquipo.defensa.length){
      nvoEquipo.defensa.push("0");
    }
    
    if (medio < nvoEquipo.medio.length){
      nvoEquipo.medio.length = medio;
    }
    while (medio > nvoEquipo.medio.length){
      nvoEquipo.medio.push("0");
    }
    
    if (ataque < nvoEquipo.ataque.length){
      nvoEquipo.ataque.length = ataque;
    }
    while (ataque > nvoEquipo.ataque.length){
      nvoEquipo.ataque.push("0");
    }
    poderArquero = 0;
    poderDefensa = 0;
    poderMedio = 0;
    poderAtaque = 0;
    printEquipo();
  }
  function getJugador(codigo,posicion,i){
    cloudStorage.getItem("/jugadores/",codigo,24*60*60*1000,function(jugador){
      printJugador(jugador,posicion,i);
    });
  }
  function printJugador(jugador,posicion,i){
    var nivel;
    var edad = actualEdad(jugador.edad,jugador.nacimiento);
    switch(posicion){
      case "arquero":
        nivel = actualRendimiento(jugador.arquero,edad);
        break;
      case "defensa":
        nivel = actualRendimiento(jugador.defensa,edad);
        break;
      case "medio":
        nivel = actualRendimiento(jugador.medio,edad);
        break;
      case "ataque":
        nivel = actualRendimiento(jugador.ataque,edad);
        break;
    }
    var strHtml;
    {strHtml =`
  <div class="card">
    <div class="card-image">
      <img src="${jugador.pais}.jpg">
      <a href="#cambiar/${posicion}/${i}" class="btn-floating halfway-fab waves-effect waves-light red"><i class="material-icons">loop</i></a>
    </div>
    <div class="card-content">
      <h5 class="truncate">${jugador.nombre + " " + jugador.apellido}</h5>
      <table>
        <tbody>
          <tr>
            <td>
              <b>País:</b><br>
              <b>Edad:</b><br>
              <b>${posicion}: </b>
            </td>
            <td>
              ${jugador.pais}<br>
              ${edad.toFixed(1)}<br>
              ${nivel.toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
    `;}
    document.getElementById(posicion+i).innerHTML = strHtml;
    switch(posicion){
      case "arquero":
        poderArquero = nivel;
        break;
      case "defensa":
        poderDefensa += nivel;
        break;
      case "medio":
        poderMedio += nivel;
        break;
      case "ataque":
        poderAtaque += nivel;
        break;
    }
    printPoder();
  }
  function printSuplente(posicion,i){
    var strHtml;
    {strHtml =`
<div class="card">
  <div class="card-image">
    <img src="jugador.jpg">
    <a href="#cambiar/${posicion}/${i}" class="btn-floating halfway-fab waves-effect waves-light red"><i class="material-icons">loop</i></a>
  </div>
  <div class="card-content">
    <h5>Suplente</h5>
    <table>
      <tbody>
        <tr>
          <td>
            <b>País:</b><br>
            <b>Edad:</b><br>
            <b>${posicion}: </b>
          </td>
          <td>
            Local<br>
            30<br>
            3
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
    `;}
    document.getElementById(posicion+i).innerHTML = strHtml;

    switch(posicion){
      case "arquero":
        poderArquero = 3;
        break;
      case "defensa":
        poderDefensa += 3;
        break;
      case "medio":
        poderMedio += 3;
        break;
      case "ataque":
        poderAtaque += 3;
        break;
    }
    printPoder();
  }
  function printPoder(){
    document.getElementById("poder-arquero").innerHTML = poderArquero.toFixed(1);
    document.getElementById("poder-defensa").innerHTML = poderDefensa.toFixed(1);
    document.getElementById("poder-medio").innerHTML = poderMedio.toFixed(1);
    document.getElementById("poder-ataque").innerHTML = poderAtaque.toFixed(1);
  }
  
  document.getElementById("cambiar").onclick = function(){
    function jugadorInvalido(codJugador){
      //valida que sea mi jugador y no este en el equipo dos veces.
      if (codJugador !== "0"){
        if (misDatos.jugadores.indexOf(codJugador) >= 0){//es mi jugador
          if (equipo.indexOf(codJugador) < 0){ //no esta en el equipo, todavia
            equipo.push(codJugador);
            return false;
          }
        }
        return true;
      }
      return false;//es suplente
    }
    
    var equipo = [];
    
    //arquero;
    if (jugadorInvalido(nvoEquipo.arquero)){
      return;
    }

    //defensa
    var lng = nvoEquipo.defensa.length;
    var lngt = lng;
    if (lng<2 || lng>4){
      return;
    }
    var i;
    for(i=0;i<lng;i++){
      if (jugadorInvalido(nvoEquipo.defensa[i])){
        return;
      }
    }
    
    //medio
    lng = nvoEquipo.medio.length;
    lngt += lng;
    if (lng<2 || lng>4){
      return;
    }
    for(i=0;i<lng;i++){
      if (jugadorInvalido(nvoEquipo.medio[i])){
        return;
      }
    }
    
    //ataque
    lng = nvoEquipo.ataque.length;
    lngt += lng;
    if (lng<2 || lng>4){
      return;
    }
    if (lngt>10){
      return;
    }
    for(i=0;i<lng;i++){
      if (jugadorInvalido(nvoEquipo.ataque[i])){
        return;
      }
    }
    
    //bien
    backEnd('setEquipo',nvoEquipo,function(res){
      if(res){
        nvoEquipo = null;
        backEnd('misDatos',null,function(datos){
          misDatos = datos;
          if (!misDatos.jugadores) {
            misDatos.jugadores = [];
          }
          window.location.href = "#menu";
        });
      }
    });
    
  };
  document.getElementById("nvoNombre").onclick = function(){
    var elemNombre = document.getElementById("nombre");
    var nombre = elemNombre.value;
    if (nombre !== ""){
      backEnd('nvoNombre',{nombre:nombre},function(datos){
        misDatos = datos;
        if (!misDatos.jugadores) {
          misDatos.jugadores = [];
        }
        elemNombre.value = misDatos.nombre;
      });
    } else {
      elemNombre.value = misDatos.nombre;
    }
  };
};
rutas.cambiar = function(vecUrl){
  var noHay = true;
  var posicion = vecUrl[1];
  var n = parseInt(vecUrl[2]);
  var strHtml;
  {strHtml = `
<nav class="red white-text">
  <div class="nav-wrapper">
    <a href="#equipo" class="brand-logo center">
      Jan Ken Gol
    </a>
  </div>
</nav>
<br>
<div class="row" id="lista">
  <h5>No tiene jugadores en esta posición</h5>
</div>
  `;}
  var cuerpo = document.getElementsByTagName('body')[0];
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "visible";
  
  if (nvoEquipo === null){
    window.history.back();
  }
  function getJugadores(){
    var jugadoresActuales = [];
    if (nvoEquipo.arquero !== "0"){
      jugadoresActuales.push(nvoEquipo.arquero);
    }
    var lng = nvoEquipo.defensa.length;
    var i;
    for(i=0;i<lng;i++){
      if (nvoEquipo.defensa[i] !== "0"){
        jugadoresActuales.push(nvoEquipo.defensa[i]);
      }
    }
    
    lng = nvoEquipo.medio.length;
    for(i=0;i<lng;i++){
      if (nvoEquipo.medio[i] !== "0"){
        jugadoresActuales.push(nvoEquipo.medio[i]);
      }
    }
    
    lng = nvoEquipo.ataque.length;
    for(i=0;i<lng;i++){
      if (nvoEquipo.ataque[i] !== "0"){
        jugadoresActuales.push(nvoEquipo.ataque[i]);
      }
    }
    
    lng = misDatos.jugadores.length;
    for (i=0;i<lng;i++){
      if (jugadoresActuales.indexOf(misDatos.jugadores[i]) < 0){
        cloudStorage.getItem("/jugadores/",misDatos.jugadores[i],24*60*60*1000,printJugadores);
      }
    }
  }
  function printJugadores(jugador){
    if (jugador.posicion != posicion){
      return;
    }
    var nivel;
    var edad = actualEdad(jugador.edad,jugador.nacimiento);
    switch(posicion){
      case "arquero":
        nivel = actualRendimiento(jugador.arquero,edad);
        break;
      case "defensa":
        nivel = actualRendimiento(jugador.defensa,edad);
        break;
      case "medio":
        nivel = actualRendimiento(jugador.medio,edad);
        break;
      case "ataque":
        nivel = actualRendimiento(jugador.ataque,edad);
        break;
    }
    var strHtml;
    {strHtml = `
    <div class="card">
      <div class="card-image">
        <img src="${jugador.pais}.jpg">
        <a class="btn-floating halfway-fab waves-effect waves-light red"><i class="material-icons">loop</i></a>
      </div>
      <div class="card-content">
        <h5 class="truncate">${jugador.nombre+" "+jugador.apellido}</h5>
        <table>
          <tbody>
            <tr>
              <td>
                <b>País:</b><br>
                <b>Edad:</b><br>
                <b>${posicion}: </b>
              </td>
              <td>
                ${jugador.pais}<br>
                ${edad.toFixed(0)}<br>
                ${nivel.toFixed(1)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    `;}
    if (noHay){
      document.getElementById("lista").innerHTML = "";
      noHay = false;
    }
    var div= document.createElement("DIV");
    div.innerHTML = strHtml;
    div.classList.add("col","s12");
    div.id= jugador.codigo;
    document.getElementById("lista").appendChild(div);
  }
  getJugadores();
  
  document.getElementById("lista").onclick = function(evento){
    var target = evento.target;
    if (target.tagName !== "I"){
      return;
    }
    while(target.id === "") {
      target = target.parentElement;
    }
    var id = target.id;
    switch(posicion){
      case "arquero":
        nvoEquipo.arquero = id;
        break;
      case "defensa":
        nvoEquipo.defensa[n] = id;
        break;
      case "medio":
        nvoEquipo.medio[n] = id;
        break;
      case "ataque":
        nvoEquipo.ataque[n] = id;
        break;
    }
    window.history.back();
  };
};
rutas.esperando = function(){
  if (eventoMatch !== null){
    window.location.href = "#menu";
    return;
  }
  var strHtml;
  {strHtml = `
<nav class="red white-text">
  <div class="nav-wrapper">
    <a href="#menu" class="brand-logo center">
      Jan Ken Gol
    </a>
  </div>
</nav>
<br>
<div class="row">
  <div class="col s12">
    <h5>Esperando Oponente</h5>
  </div>
</div>
<div class="row">
  <div class="col s12">
    <div class="progress">
      <div class="indeterminate"></div>
    </div>
  </div>
</div>
  `;}
  var cuerpo = document.getElementsByTagName('body')[0];
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "visible";
  backEnd('buscarOponente',null,function(llave){
    if(llave !== null){
      var llavesStr = cacheStorage.getItem("llavesMatch");
      var llaves = [];
      if (llavesStr !== null){
        llaves = JSON.parse(llavesStr);
      }
      llaves.push(llave);
      cacheStorage.setItem("llavesMatch",JSON.stringify(llaves),4*7*24*60*60*1000);
      firebase.database().ref("matchs/"+llave).on("value",estadoJuego,function(error){
        M.toast({html:"The read failed: " + error.code});
      });
    }
  });
};
rutas.juego = function(vecUrl){
  if (misDatos === null){
    window.location.href = "#menu";
    return;
  }
  var llavesStr = cacheStorage.getItem("llavesMatch");
  if (llavesStr === null){
    window.location.href = "#menu";
    return;
  }
  var llaves = JSON.parse(llavesStr);
  var llave = llaves[llaves.length-1];
  var cuerpo = document.getElementsByTagName('body')[0];
  var strHtml;
  {strHtml = `
<canvas id="myCanvas"></canvas>
<img src="cancha.jpg" hidden id="cancha">
<img src="piedra.png" hidden id="piedra">
<img src="papel.png" hidden id="papel">
<img src="tijera.png" hidden id="tijera">
  `;}
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "hidden";
  
  gestorOrientacion();
  if (alto > ancho){
    M.toast({html:"¡Ponga su teléfono en forma horizontal!"});
  }
  
  var ctx;
  var cancha = document.getElementById("cancha");
  var piedra = document.getElementById("piedra");
  var papel = document.getElementById("papel");
  var tijera = document.getElementById("tijera");
  var elemCanvas = document.getElementById("myCanvas");
  
  elemCanvas.width = ancho;
  elemCanvas.height = alto;
  ctx = elemCanvas.getContext("2d");
  ctx.lineWidth = 5;
  elemCanvas.addEventListener('touchend',finTouch);
  elemCanvas.addEventListener('touchstart',inicioTouch);
  
  cancha.onload = function(){
    ctx.drawImage(cancha,0,0,ancho*0.8,alto);
  };
  piedra.onload = function(){
    ctx.drawImage(piedra, ancho*0.8, 0,ancho*0.20,alto*0.33);
  };
  papel.onload = function(){
    ctx.drawImage(papel, ancho*0.8, alto*0.33,ancho*0.20,alto*0.33);
  };
  tijera.onload = function(){
    ctx.drawImage(tijera, ancho*0.8, alto*0.67,ancho*0.20,alto*0.33);
  };
  function repintar(){
    elemCanvas.width = ancho;
    elemCanvas.height = alto;
    
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.fillRect (ancho*0.7,0,ancho*0.3,alto);
    
    ctx.drawImage(cancha,0,0,ancho*0.8,alto);
    ctx.drawImage(piedra, ancho*0.8, 0,ancho*0.20,alto*0.33);
    ctx.drawImage(papel, ancho*0.8, alto*0.33,ancho*0.20,alto*0.33);
    ctx.drawImage(tijera, ancho*0.8, alto*0.67,ancho*0.20,alto*0.33);
  }
  
  
  var eleccion = "";
  function inicioTouch(event){
    var altox = (alto > ancho) ? ancho/2 : alto;
    if (eleccion !== ""){
      return;
    }
    var i,h;
    var lng = event.touches.length;
    for(i=0; i<lng; i++){
      if(event.touches[i].clientX >= ancho*0.8){
        h = event.touches[i].clientY;
        if (h <= altox*0.33){
            eleccion = "piedra";
        } else if (h <= altox*0.66){
            eleccion = "papel";
        } else {
            eleccion = "tijera";
        }
        break;
      }
    }
  }
  function finTouch(event){
    if(eleccion !== ""){
      limpiarJugada();
      pintarJugada("blue",ancho*0.8,eleccion);
      backEnd('enviarJugada',{juego:llave,jugada:eleccion},null);
    }
  }
  function limpiarJugada(){
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.moveTo(ancho*0.8,0);
    ctx.lineTo(ancho*0.8,alto);
    ctx.stroke();
  }
  function pintarJugada(color,derecha,eleccion){
    var ini;
    switch(eleccion){
      case "piedra":
        ini = 0;
        break;
      case "papel":
        ini = alto/3;
        break;
      case "tijera":
        ini = 2*alto/3;
        break;
    }
    var delta = alto/3;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.moveTo(derecha,ini);
    ctx.lineTo(derecha,ini+delta);
    ctx.stroke();
  }
  var tiempo = -1;
  var soy;
  eventoMatch = function(){
    soy = (match.local === firebaseUID) ? "local" : "visita";
    if(match.tiempo !== tiempo){
      eleccion = "";
      tiempo = match.tiempo;
      avanzarJuego();
    } else {
      if (eleccion !== ""){
        var miJuego = (soy === "local") ? match.jugadaLocal : match.jugadaVisita;
        if (miJuego === ""){
          backEnd('enviarJugada',{juego:llave,jugada:eleccion},null);
        }
      }
    }
  };
  
  var pelota = [(ancho*0.8)/2,alto/2];
  var estadoAnterior = "centro";
  
  function avanzarJuego(){
    pintarCancha();
    estadoAnterior = match.estado;
    if (match.estado == "fin"){
      setTimeout(function(){
        misDatos = null;
        window.location.href = "#menu";
      },10000);
      document.getElementById("myCanvas").removeEventListener('touchend',finTouch);
    }
  }
  
  pintarCancha = function(){
    var marcador;
    
    repintar();
    
    //imprime la anterior jugada, si existe
    if(match.oldLocal !== ""){
      if (soy === "local"){
        pintarJugada("blue",ancho-10,match.oldLocal);
        pintarJugada("red",ancho-5,match.oldVisita);
      } else {
        pintarJugada("blue",ancho-10,match.oldVisita);
        pintarJugada("red",ancho-5,match.oldLocal);
      }
    }
    
    //imprime marcador
    if (soy == "local"){
      marcador = String(match.marcador[0]) + " - " + String(match.marcador[1]);
    } else {
      marcador = String(match.marcador[1]) + " - " + String(match.marcador[0]);
    }
    
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText(marcador,(ancho*0.8)/2, 20);
    
    //determina color, en base a quien gano
    var offset;
    var color;
    switch(estadoAnterior){
      case "local-defensa":
        if (match.estado == "local-medio"){
          color = (soy == "local") ? "blue" : "red";
        } else { // centro o fin
          color = (soy == "local") ? "red" : "blue";
          offset = (soy == "local") ? (ancho*0.8)/2 : 0;
        }
        break;
      case "local-medio":
        if (match.estado == "local-defensa"){
          color = (soy == "local") ? "red" : "blue";
        } else { // visita-medio
          color = (soy == "local") ? "blue" : "red";
        }
        break;
      case "centro":
        if (match.estado == "local-medio"){
          color = (soy == "local") ? "red" : "blue";
        } else { // local-defensa
          color = (soy == "local") ? "blue" : "red";
        }
        break;
      case "visita-medio":
        if (match.estado == "local-medio"){
          color = (soy == "local") ? "red" : "blue";
        } else { // visita-defensa
          color = (soy == "local") ? "blue" : "red";
        }
        break;
      case "visita-defensa":
        if (match.estado == "visita-medio"){
          color = (soy == "local") ? "red" : "blue";
        } else { // centro o fin
          color = (soy == "local") ? "blue" : "red";
          offset = (soy == "local") ? 0 : (ancho*0.8)/2;
        }
        break;
    }
    
    //ubica el avance de la pelota
    var x = 0.2*Math.random()-0.1;
    switch(match.estado){
      case "local-defensa":
        x =+ (soy == "local") ? 0.125 : 0.875;
        break;
      case "local-medio":
        x += (soy == "local") ? 0.375 : 0.625;
        break;
      case "visita-medio":
        x += (soy == "local") ? 0.625 : 0.375;
        break;
      case "visita-defensa":
        x =+ (soy == "local") ? 0.875 : 0.125;
        break;
      case "centro":
        x = 0.5;
    }
    
    //imprime el juego
    if (match.estado == "centro" || match.estado == "fin"){
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.font = "50px Arial";
      ctx.textAlign = "left";
      ctx.fillText("GOOOL", 10 + offset, 50);
      pelota[0] = (ancho*0.8)/2;
      pelota[1] = alto/2;
      
      if (match.estado == "fin"){
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.fillText("Fin del Juego",(ancho*0.8)/2, alto/2);
      }
    } else {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.moveTo(pelota[0],pelota[1]);
      pelota[0] = (ancho*0.8) * x;
      pelota[1] = alto * Math.random();
      ctx.lineTo(pelota[0],pelota[1]);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.arc(pelota[0],pelota[1],5,0,2 * Math.PI, false);
      ctx.fill();
    }
    
  };
};
rutas.ranking = function(){
  var strHtml;
  {strHtml = `
<nav class="red white-text">
  <div class="nav-wrapper">
    <a href="#menu" class="brand-logo center">
      Jan Ken Gol
    </a>
  </div>
</nav>
<br>
<div class="row" style="overflow-x:scroll">
  <div class="col s12">
    <table class="striped" style="overflow-x: scroll">
      <thead>
        <tr>
          <th>Equipo</th>
          <th>Gan</th>
          <th>Emp</th>
          <th>Per</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody id="lista">
      </tbody>
    </table>
  </div>
</div>
  `;}
  var cuerpo = document.getElementsByTagName('body')[0];
  cuerpo.innerHTML = strHtml;
  cuerpo.style.overflow = "visible";

  function getEquipos(){
    var equiposStr = cacheStorage.getItem('ranking');
    var equipos;
    if (equiposStr !== null){
      equipos = JSON.parse(equiposStr);
      printEquipos(equipos);
    } else {
      backEnd('ranking',null,function(datos){
        cacheStorage.setItem("ranking",JSON.stringify(datos),4*60*60*1000);
        printEquipos(datos);
      });
    }
  }
  function printEquipos(equipos){
    equipos.sort(function(a, b){return b.puntos - a.puntos});
    var lng = equipos.length;
    var i;
    var lista ="";
    for (i=0;i<lng;i++){
      {lista += `
<tr>
  <td>${equipos[i].nombre}</td>
  <td>${equipos[i].ganados}</td>
  <td>${equipos[i].empatados}</td>
  <td>${equipos[i].perdidos}</td>
  <td>${equipos[i].puntos}</td>
</tr>
      `;}
    }
    document.getElementById("lista").innerHTML = lista;
  }
  getEquipos();
};
