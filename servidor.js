"use strict";
/* globals M, firebase */

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
function getJugadorValor(codigo,posicion,clbk){
  firebase.database().ref('jugadores/' + codigo).once('value').then(function(snap){
    var jugador = snap.val();
    var edad = actualEdad(jugador.edad,jugador.nacimiento);
    var nivel;
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
    clbk(nivel,edad,codigo);
  });
}
function getPoderEquipo(codigo,clbk){
  var usuarioRef = firebase.database().ref('usuarios/' + codigo); 
  usuarioRef.once('value').then(function(snap){
    var misDatos = snap.val();
    var listaJubilados = [];
    var poderLocal = [0,0,0];
    var llamadas = 0;
    
    function quitarJugador(id){
      if (misDatos.arquero === id){
        misDatos.arquero = id;
      }
      
      var pos = misDatos.defensa.indexOf(id);
      if (pos >= 0){
        misDatos.defensa.splice(pos, 1);
      }

      pos = misDatos.medio.indexOf(id);
      if (pos >= 0){
        misDatos.medio.splice(pos, 1);
      }
      
      pos = misDatos.ataque.indexOf(id);
      if (pos >= 0){
        misDatos.ataque.splice(pos, 1);
      }
      
      pos = misDatos.jugadores.indexOf(id);
      if (pos >= 0){
        misDatos.jugadores.splice(pos, 1);
      }
    }
    function jubilar(){
      var lng = listaJubilados.length;
      var i;
      for (i=0;i<lng;i++){
        quitarJugador(listaJubilados[i]);
      }
      usuarioRef.update({
        arquero: misDatos.arquero,
        defensa: misDatos.defensa,
        medio: misDatos.medio,
        ataque: misDatos.ataque,
        jugadores: misDatos.jugadores,
      });
    }
    
    function setDefensa(nivel,edad,codjugador){
      if (edad>45){
        listaJubilados.push(codjugador);
        firebase.database().ref('jugadores/' + codjugador).remove();
      }
      poderLocal[0] += nivel;
      llamadas--;
      if (llamadas === 0){
        jubilar();
        clbk(poderLocal);
      }
    }
    function setMedio(nivel,edad,codjugador){
      if (edad>45){
        listaJubilados.push(codjugador);
        firebase.database().ref('jugadores/' + codjugador).remove();
      }
      poderLocal[1] += nivel;
      llamadas--;
      if (llamadas === 0){
        jubilar();
        clbk(poderLocal);
      }
    }
    function setAtaque(nivel,edad,codjugador){
      if (edad>45){
        listaJubilados.push(codjugador);
        firebase.database().ref('jugadores/' + codjugador).remove();
      }
      poderLocal[2] += nivel;
      llamadas--;
      if (llamadas === 0){
        jubilar();
        clbk(poderLocal);
      }
    }
    
    //arquero
    if (misDatos.arquero == "0"){
      poderLocal[0] += 3;
    } else {
      llamadas++;
      getJugadorValor(misDatos.arquero,"arquero",setDefensa);
    }
    
    //defensa
    var lng = misDatos.defensa.length;
    var i;
    for (i=0;i<lng;i++){
      if (misDatos.defensa[i] == "0"){
        poderLocal[0] += 3;
      } else {
        llamadas++;
        getJugadorValor(misDatos.defensa[i],"defensa",setDefensa);
      }
    }
    
    //medio
    lng = misDatos.medio.length;
    for (i=0;i<lng;i++){
      if (misDatos.medio[i] == "0"){
        poderLocal[1] += 3;
      } else {
        llamadas++;
        getJugadorValor(misDatos.defensa[i],"medio",setMedio);
      }
    }
    
    //ataque
    lng = misDatos.ataque.length;
    for (i=0;i<lng;i++){
      if (misDatos.ataque[i] == "0"){
        poderLocal[2] += 3;
      } else {
        llamadas++;
        getJugadorValor(misDatos.defensa[i],"ataque",setAtaque);
      }
    }
    if (llamadas === 0){
      clbk(poderLocal,misDatos.nombre);
    }
  });
}
function motorJuego(juego){
    var res;
    switch(juego.jugadaVisita){
      case "piedra":
        switch(juego.jugadaLocal){
          case "piedra":
            res = "empate";
            break;
          case "papel":
            res = "local";
            break;
          case "tijera":
            res = "visita";
            break;
        }
        break;
      case "papel":
        switch(juego.jugadaLocal){
          case "piedra":
            res = "visita";
            break;
          case "papel":
            res = "empate";
            break;
          case "tijera":
            res = "local";
            break;
        }
        break;
      case "tijera":
        switch(juego.jugadaLocal){
          case "piedra":
            res = "local";
            break;
          case "papel":
            res = "visita";
            break;
          case "tijera":
            res = "empate";
            break;
        }
        break;
    }
    
    if (res === "empate"){
      var valVisita;
      var valLocal;
      switch(juego.estado){
        case "local-defensa":
          valLocal = juego.poderLocal[0];
          valVisita = juego.poderVisita[2];
          break;
        case "local-medio":
        case "visita-medio":
        case "centro":
          valLocal = juego.poderLocal[1];
          valVisita = juego.poderVisita[1];
          break;
        case "visita-defensa":
          valLocal = juego.poderLocal[2];
          valVisita = juego.poderVisita[0];
          break;
      }
      var valTotal = valVisita + valLocal;
      if(valTotal*Math.random() <= valLocal){
        res = "local";
      } else {
        res = "visita";
      }
    }
    
    switch(juego.estado){
      case "local-defensa":
        juego.estado = (res === "local") ? "local-medio" : "centro";
        if (juego.estado === "centro"){
          juego.marcador[1]++;
        }
        break;
      case "local-medio":
        juego.estado = (res === "local") ? "visita-medio" : "local-defensa";
        break;
      case "centro":
        juego.estado = (res === "local") ? "visita-medio" : "local-medio";
        break;
      case "visita-medio":
        juego.estado = (res === "local") ? "visita-defensa" : "local-medio";
        break;
      case "visita-defensa":
        juego.estado = (res === "local") ? "centro" : "visita-medio";
        if(juego.estado == "centro"){
          juego.marcador[0]++;
        }
        break;
    }
    if (juego.marcador[0] + juego.marcador[1] >= 5){
      juego.estado = "fin";
    }
    return juego;
}
function finJuego(juego){
  var database = firebase.database();
  var localRef = database.ref('usuarios/' + juego.local);
  var visitaRef = database.ref('usuarios/' + juego.visita);
  var resultado;
  if (juego.marcador[0] > juego.marcador[1]){//gana local
    resultado = 1;
  } else if (juego.marcador[0] < juego.marcador[1]){//gana visita
    resultado = -1;
  } else { //empate
    resultado = 0;
  }
  localRef.once('value').then(function(snapshot){
    var datos = snapshot.val();
    if (datos){
      datos.perdidos += (resultado == -1) ? 1: 0;
      datos.ganados += (resultado == 1) ? 1 : 0;
      datos.empatados += (resultado == 0) ? 1 : 0;
      datos.favor += juego.marcador[0];
      datos.contra += juego.marcador[1];
      datos.nivel += (resultado == 0) ? 1 : (resultado == 1 ? 3 : 0);
      localRef.update({
        perdidos: datos.perdidos,
        ganados: datos.ganados,
        empatados: datos.empatados,
        nivel: datos.nivel,
        favor: datos.favor,
        contra: datos.contra,
      });
    }
  });
  visitaRef.once('value').then(function(snapshot){
    var datos = snapshot.val();
    if (datos){
      datos.perdidos += (resultado == 1) ? 1 : 0;
      datos.ganados += (resultado == -1) ? 1 : 0;
      datos.empatados += (resultado == 0) ? 1 : 0;
      datos.favor += juego.marcador[1];
      datos.contra += juego.marcador[0];
      datos.nivel += (resultado == 0) ? 1 : (resultado == -1 ? 3 : 0);
      visitaRef.update({
        perdidos: datos.perdidos,
        ganados: datos.ganados,
        empatados: datos.empatados,
        nivel: datos.nivel,
        favor: datos.favor,
        contra: datos.contra,
      });
    }
  });
}

function funNvoJugador(param,back){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var jugadorRef = database.ref('jugadores/' + param.codigo);
  jugadorRef.once('value').then(function(snapshot){
    var datos = snapshot.val();
    if (datos){
      if (datos.propietario === ""){
        jugadorRef.update({
          propietario: userId,
          nacimiento: Date.now(),
        });
        
        var usuarioRef = database.ref('usuarios/' + userId);
        usuarioRef.once('value').then(function(snapshot){
          var datos = snapshot.val();
          if (datos){
            if (!datos.jugadores){
              datos.jugadores = [];
            }
            if (datos.jugadores.indexOf(param)<0){
              datos.jugadores.push(param.codigo);
              usuarioRef.update({
                jugadores: datos.jugadores,
              });
              back(true);
            } else {
              back(false);
            }
          } else {
            back(false);
          }
        });
      } else {
        back(false);
      }
    } else {
      back(false);
    }
  });
}
function funMisDatos(back){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var usuarioRef = database.ref('usuarios/' + userId);
  usuarioRef.once('value').then(function(snapshot){
    var datos = snapshot.val();
    if (datos){
      back(datos);
    } else {
      datos = {
        nombre: userId,
        arquero: "0",
        defensa: ["0","0","0","0"],
        medio: ["0","0","0"],
        ataque: ["0","0","0"],
        perdidos: 0,
        ganados: 0,
        empatados: 0,
        nivel: 0,
        jugadores: [],
        favor: 0,
        contra: 0,
      };
      usuarioRef.set(datos, function(error) {
        if (error) {
          back(null);
        } else {
          back(datos);
        }
      });
    }
  });
}
function funSetPosicion(param,back){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var jugadorRef = database.ref('jugadores/' + param.jugador);
  jugadorRef.once('value').then(function(snapshot){
    var datos = snapshot.val();
    if (datos){
      if (datos.propietario === userId){
        jugadorRef.update({
          posicion: param.posicion,
        });
        back(true);
      } else {
        back(false);
      }
    } else {
      back(false);
    }
  });
}
function funSetEquipo(param,back){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var usuarioRef = database.ref('usuarios/' + userId);
  usuarioRef.once('value').then(function(snapshot){
    function validar(){
      function jugadorInvalido(codJugador){
        //valida que sea mi jugador y no este en el equipo dos veces.
        if (codJugador !== "0"){
          if (datos.jugadores.indexOf(codJugador) >= 0){//es mi jugador
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
      if (jugadorInvalido(param.arquero)){
        return false;
      }

      //defensa
      var lng = param.defensa.length;
      var lngt = lng;
      if (lng<2 || lng>4){
        return false;
      }
      var i;
      for(i=0;i<lng;i++){
        if (jugadorInvalido(param.defensa[i])){
          return false;
        }
      }

      //medio
      lng = param.medio.length;
      lngt += lng;
      if (lng<2 || lng>4){
        return false;
      }
      for(i=0;i<lng;i++){
        if (jugadorInvalido(param.medio[i])){
          return false;
        }
      }

      //ataque
      lng = param.ataque.length;
      lngt += lng;
      if (lng<2 || lng>4){
        return false;
      }
      if (lngt>10){
        return false;
      }
      for(i=0;i<lng;i++){
        if (jugadorInvalido(param.ataque[i])){
          return false;
        }
      }
      return true;
    }
    var datos = snapshot.val();
    if (datos){
      if (validar()){
        usuarioRef.update({
          arquero: param.arquero,
          defensa: param.defensa.slice(),
          medio: param.defensa.slice(),
          ataque: param.ataque.slice(),
        });
        back(true);
      } else {
        back(false);
      }
    } else {
      back(false);
    }
  });
}
function funNvoNombre(param,back){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var usuarioRef = database.ref('usuarios/' + userId);
  usuarioRef.once('value').then(function(snapshot){
    var datos = snapshot.val();
    if (datos.nombre !== param.nombre){
      var ref = firebase.database().ref("usuarios");
      ref.orderByChild("nombre").equalTo(param.nombre).once("value", function(snapshot) {
        var otros = snapshot.val();
        if (otros === null){
          datos.nombre = param.nombre;
          usuarioRef.update({
            nombre: param.nombre,
          });
          back(datos);
        } else {
          back(datos);
        }
      },function(error){
        console.error(error);
        back(datos);
      });
    } else {
      back(datos);
    }
  });
}
function funBuscarOponente(back){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var matchRef = database.ref("matchs");
  matchRef.orderByChild("visita").equalTo("").once("value", function(snapshot) {
    var match = snapshot.val();
    if (match === null){ //no hay desafio, creo uno
      var llave = matchRef.push({
        local:userId,
        nombLocal: "",
        nombVisita: "",
        visita: "",
        estado: "esperandoOponente",
        poderLocal: null,
        poderVisita: null,
        jugadaLocal: "",
        jugadaVisita: "",
        marcador: [0,0],
        tiempo: -1,
        oldLocal:"",
        oldVisita:"",
      });
      back(llave.key);
    } else {//acepto el desafio
      snapshot.forEach(function(childSnapshot) {
        var key = childSnapshot.key;
        var match = childSnapshot.val();
        match.visita = userId;
        getPoderEquipo(match.local,function(poder,nomloc){
          match.poderLocal = poder;
          match.nombLocal = nomloc;
          getPoderEquipo(match.visita,function(poder,nomvis){
            match.poderVisita = poder;
            match.nombVisita = nomvis;
            match.estado = "centro";
            match.tiempo = 0;
            firebase.database().ref("matchs/"+key).update({
              visita: userId,
              poderLocal: match.poderLocal,
              poderVisita: match.poderVisita,
              estado: match.estado,
              tiempo: match.tiempo,
            });
            back(key);
          });
        });
        return true;
      });
    }
  });
}
function funNoJugar(param,back){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var matchRef = database.ref("matchs");
  matchRef.orderByChild("visita").equalTo(userId).once("value", function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      database.ref('matchs/' + key).remove();
    });
  });
  matchRef.orderByChild("local").equalTo(userId).once("value", function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      var key = childSnapshot.key;
      database.ref('matchs/' + key).remove();
    });
  });
}
function funEnviarJugada(param){
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  var matchRef = database.ref("matchs/"+param.juego);
  matchRef.once("value", function(snapshot) {
    var match = snapshot.val();
    if (match === null){
      return;
    }
    var vecEstados = ["esperandoOponente","fin"];
    if (vecEstados.indexOf(match.estado)>=0){
      return;
    }
    var guardar = false;
    
    if (match.local === userId){
      if (match.jugadaLocal === ""){
        match.jugadaLocal = param.jugada;
        guardar = true;
      }
    } else if (match.visita == userId){
      if (match.jugadaVisita === ""){
        match.jugadaVisita = param.jugada;
        guardar = true;
      }
    }
    if (match.jugadaLocal !== "" && match.jugadaVisita !==""){
      match = motorJuego(match);
      match.oldLocal = match.jugadaLocal;
      match.oldVisita = match.jugadaVisita;
      match.jugadaLocal = "";
      match.jugadaVisita = "";
      match.tiempo++;
      if(match.tiempo > 200){
        match.estado = "fin";
      }
      guardar = true;
      if (match.estado === "fin"){
        finJuego(match);
      }
    }
    if (guardar){
      var objUpdate = {
        jugadaLocal: match.jugadaLocal,
        jugadaVisita: match.jugadaVisita,
        oldLocal: match.oldLocal,
        oldVisita: match.oldVisita,
        tiempo: match.tiempo,
        estado: match.estado,
        marcador: match.marcador,
      };
      matchRef.update(objUpdate);
    }
  });
}
function funRanking(back){
  var refUsr = firebase.database().ref("usuarios");
  //var query = refUsr.orderByChild("nivel").startAt(3).limit(5);
  var query = refUsr.orderByChild("nivel").limitToLast(10);
  query.once("value", function(snapshot) {
    var lng = snapshot.numChildren();
    var equipos = [];
    snapshot.forEach(function(data) {
      var valor = data.val();
      equipos.push({
        nombre: valor.nombre,
        puntos: valor.nivel,
        ganados: valor.ganados,
        empatados: valor.empatados,
        perdidos: valor.perdidos,
        favor: valor.favor,
        contra: valor.contra,
      });
      if (equipos.length === lng){
        back(equipos);
      }
    });
  });
}

function backEnd(funcion,param,back){
  switch(funcion){
    case "nvoJugador":
      setTimeout(function(){
        funNvoJugador(param,back);
      },100);
      break;
    case "misDatos":
      setTimeout(function(){
        funMisDatos(back);
      },100);
      break;
    case "setPosicion":
      setTimeout(function(){
        funSetPosicion(param,back);
      },100);
      break;
    case "setEquipo":
      setTimeout(function(){
        funSetEquipo(param,back);
      },100);
      break;
    case 'nvoNombre':
      setTimeout(function(){
        funNvoNombre(param,back);
      },100);
      break;
    case 'buscarOponente':
      setTimeout(function(){
        funBuscarOponente(back);
      },100);
      break;
    case 'noJugar':
      setTimeout(function(){
        funNoJugar(param,back);
      },100);
      break;
    case 'enviarJugada':
      setTimeout(function(){
        funEnviarJugada(param);
      },100);
      break;
    case 'ranking':
      setTimeout(function(){
        funRanking(back);
      },100); 
  }
}
