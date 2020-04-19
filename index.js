'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.misDatos = functions.https.onCall((data, context) => {
    if (!context.auth) {
        return null;
    }
    const userId = context.auth.uid;
    var database = admin.database();
    var usuarioRef = database.ref('usuarios/' + userId);
    return usuarioRef.once('value').then((snapshot) => {
        var datos = snapshot.val();
        if (!datos){
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
            usuarioRef.set(datos);
        }
        return datos;
    });
});
exports.noJugar = functions.https.onCall((data, context) => {
    if (!context.auth) {
        return null;
    }
    const userId = context.auth.uid;
    var database = admin.database();
    var matchRef = database.ref("matchs");
    matchRef.orderByChild("visita").equalTo(userId).once("value", (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        var key = childSnapshot.key;
        database.ref('matchs/' + key).remove();
      });
    });
    matchRef.orderByChild("local").equalTo(userId).once("value", (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        var key = childSnapshot.key;
        database.ref('matchs/' + key).remove();
      });
    });
    return null;
});
exports.nvoNombre = functions.https.onCall((nombre, context) => {
  const userId = context.auth.uid;
  var database = admin.database();
  var usuarioRef = database.ref('usuarios/' + userId);
  return usuarioRef.once('value').then((snapshot) => {
    var datos = snapshot.val();
    if (datos.nombre !== nombre){
      var ref = database.ref("usuarios");
      return ref.orderByChild("nombre").equalTo(nombre).once("value").then((snapshot) => {
        var otros = snapshot.val();
        if (otros === null){
          usuarioRef.update({
            nombre: nombre,
          });
          datos.nombre = nombre;
        }
        return datos;
      }).catch((error) => {
        return datos;
      });
    } else {
      return datos;
    }
  }).catch((error) => {
    return null;
  });
});
exports.nvoJugador = functions.https.onCall((codigo, context) => {
  const userId = context.auth.uid;
  var database = admin.database();
  var jugadorRef = database.ref('jugadores/' + codigo);
  return jugadorRef.once('value').then((snapshot) => {
    var datos = snapshot.val();
    if (datos){
      if (datos.propietario === ""){
        jugadorRef.update({
          propietario: userId,
          nacimiento: Date.now(),
        });
        var usuarioRef = database.ref('usuarios/' + userId);
        usuarioRef.once('value').then((snapshot) => {
          var datos = snapshot.val();
          if (!datos.jugadores){
              datos.jugadores = [];
          }
          datos.jugadores.push(codigo);
          usuarioRef.update({
            jugadores: datos.jugadores,
          });
          return true;
        }).catch(()=>{});
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }).catch((error)=>{
    return false;
  });
});

exports.setPosicion = functions.https.onCall((param, context) => {
  const userId = context.auth.uid;
  var database = admin.database();
  var jugadorRef = database.ref('jugadores/' + param.codigo);
  return jugadorRef.once('value').then((snapshot) => {
    var datos = snapshot.val();
    if (datos){
      if (datos.propietario === userId){
        jugadorRef.update({
          posicion: param.posicion,
        });
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }).catch((error) => {
    return false;
  }); 
});

exports.setEquipo = functions.https.onCall((param, context) => {
  const userId = context.auth.uid;
  var database = admin.database();
  var usuarioRef = database.ref('usuarios/' + userId);
  return usuarioRef.once('value').then((snapshot) => {
    var datos = snapshot.val();
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
    if (datos){
      if (validar()){
        usuarioRef.update({
          arquero: param.arquero,
          defensa: param.defensa.slice(),
          medio: param.defensa.slice(),
          ataque: param.ataque.slice(),
        });
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }).catch((error)=>{
    return false;
  });
});
